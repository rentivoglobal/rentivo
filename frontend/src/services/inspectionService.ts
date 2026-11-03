import { isLiveBackend, APP_URL } from '../lib/config';
import { supabase } from '../lib/supabase';
import { localStore } from './localStore';
import { listingsService } from './listingsService';
import { Listing } from '../types';
import { 
  FieldInspectionDossier, 
  FieldInspectionRecord, 
  InspectionTokenStatus 
} from '../types/inspection';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function generateSecureToken(): string {
  const bytes = new Uint8Array(16);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < 16; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
  return `pit_${hex}`;
}

export const inspectionService = {
  /**
   * Generates a secure, tokenized inspection link for field team members.
   * Does NOT require the inspector to have an account.
   */
  async generateInspectionLink(
    listingId: string, 
    verificationRequestId?: string
  ): Promise<{ token: string; url: string; record: FieldInspectionRecord }> {
    const token = generateSecureToken();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const url = `${APP_URL}/inspect/${token}`;

    const record: FieldInspectionRecord = {
      id: localStore.createId('pit'),
      listingId,
      verificationRequestId,
      token,
      status: 'active',
      expiresAt,
      createdAt: new Date().toISOString()
    };

    // 1. Save to localStore for fast offline/demo capability
    const localTokens = localStore.getInspectionTokens();
    localTokens[token] = record;
    localStore.saveInspectionTokens(localTokens);

    // 2. Persist to Supabase if live backend
    if (isLiveBackend && supabase && UUID_REGEX.test(listingId)) {
      try {
        const payload: Record<string, unknown> = {
          listing_id: listingId,
          token,
          status: 'active',
          expires_at: expiresAt
        };
        if (verificationRequestId && UUID_REGEX.test(verificationRequestId)) {
          payload.verification_request_id = verificationRequestId;
        }
        const { error } = await supabase.from('property_inspection_tokens').insert(payload);
        if (error) {
          console.warn('Could not insert inspection token into Supabase, using localStore fallback:', error);
        }
      } catch (err) {
        console.warn('Supabase insert exception for inspection token:', err);
      }
    }

    return { token, url, record };
  },

  /**
   * Loads the property summary and validates token for the mobile inspector form.
   * Callable without any user authentication.
   */
  async getInspectionSession(token: string): Promise<{
    success: boolean;
    status?: InspectionTokenStatus;
    error?: string;
    listing?: Partial<Listing>;
    expiresAt?: string;
    dossier?: FieldInspectionDossier;
    submittedAt?: string;
    inspectorName?: string;
  }> {
    if (!token || !token.trim()) {
      return { success: false, error: 'Inspection link token is missing.' };
    }

    // Try Supabase RPC first
    if (isLiveBackend && supabase) {
      try {
        const { data, error } = await supabase.rpc('get_inspection_by_token', { p_token: token.trim() });
        if (!error && data) {
          const res = data as any;
          if (!res.success) {
            return { success: false, error: res.error || 'Inspection link is invalid or expired.' };
          }
          if (res.status === 'submitted') {
            return {
              success: true,
              status: 'submitted',
              submittedAt: res.submitted_at,
              inspectorName: res.inspector_name
            };
          }
          return {
            success: true,
            status: 'active',
            expiresAt: res.expires_at,
            listing: {
              id: res.listing?.id,
              title: res.listing?.title,
              category: res.listing?.category,
              type: res.listing?.property_type,
              area: res.listing?.area,
              city: res.listing?.city,
              price: res.listing?.price_amount ? res.listing.price_amount / 100 : 0,
              pricePeriod: res.listing?.billing_period || 'per_year',
              addressDescription: res.listing?.address_summary,
              bedrooms: res.listing?.bedrooms,
              bathrooms: res.listing?.bathrooms,
              photos: (res.listing?.photos || []).map((p: any) => p.url),
              lister: {
                fullName: res.listing?.lister_name || 'Verified Lister',
                phone: res.listing?.lister_phone || '',
                whatsapp: res.listing?.lister_phone || '',
                memberSince: 'Verified Lister',
                activeListingsCount: 1,
                responseRate: '100%'
              }
            } as any
          };
        }
      } catch (err) {
        console.warn('RPC get_inspection_by_token failed, checking localStore fallback:', err);
      }
    }

    // Fallback: check localStore
    const localTokens = localStore.getInspectionTokens();
    const found = localTokens[token.trim()];
    if (!found) {
      return { success: false, error: 'Invalid or unknown inspection link token.' };
    }

    if (found.status === 'submitted') {
      const dossiers = localStore.getInspectionDossiers();
      const existingDossier = dossiers[found.listingId] || found.dossier;
      return {
        success: true,
        status: 'submitted',
        submittedAt: found.submittedAt,
        inspectorName: found.inspectorName || existingDossier?.inspector?.name,
        dossier: existingDossier
      };
    }

    if (new Date(found.expiresAt) < new Date() || found.status === 'expired') {
      return { success: false, error: 'This inspection link has expired.' };
    }

    // Fetch listing details for inspector orientation
    const listing = await listingsService.getListingById(found.listingId);
    return {
      success: true,
      status: 'active',
      expiresAt: found.expiresAt,
      listing: listing || {
        id: found.listingId,
        title: 'Property Under Physical Verification',
        area: 'Ibadan',
        city: 'Ibadan',
        price: 0,
        pricePeriod: 'per_year',
        photos: [],
        lister: {
          fullName: 'Property Manager',
          phone: '',
          whatsapp: '',
          memberSince: 'Verified Lister',
          activeListingsCount: 1,
          responseRate: '100%'
        }
      } as any
    };
  },

  /**
   * Submits the full physical inspection dossier and permanently locks the token.
   * Single-use only.
   */
  async submitInspection(
    token: string, 
    dossier: FieldInspectionDossier
  ): Promise<{ success: boolean; message: string; submittedAt?: string }> {
    const cleanToken = token.trim();
    const now = new Date().toISOString();

    // 1. Try Supabase RPC first
    if (isLiveBackend && supabase) {
      try {
        const { data, error } = await supabase.rpc('submit_property_inspection', {
          p_token: cleanToken,
          p_inspector_name: dossier.inspector.name,
          p_inspector_phone: dossier.inspector.phone,
          p_gps_lat: dossier.gps?.latitude || null,
          p_gps_lng: dossier.gps?.longitude || null,
          p_gps_accuracy: dossier.gps?.accuracyMeters || null,
          p_dossier: dossier
        });

        if (!error && data) {
          const res = data as any;
          if (!res.success) {
            throw new Error(res.error || 'Failed to submit inspection.');
          }
          // Also sync to localStore
          this.syncLocalSubmission(cleanToken, dossier, res.submitted_at || now);
          return {
            success: true,
            message: res.message || 'Inspection dossier submitted successfully and locked.',
            submittedAt: res.submitted_at || now
          };
        }
      } catch (rpcErr: any) {
        console.warn('RPC submit_property_inspection error:', rpcErr);
        if (rpcErr?.message?.includes('already been submitted')) {
          throw rpcErr;
        }
      }
    }

    // 2. LocalStore Submission Fallback
    const localTokens = localStore.getInspectionTokens();
    const found = localTokens[cleanToken];
    if (!found) {
      throw new Error('Inspection token not found.');
    }
    if (found.status === 'submitted') {
      throw new Error('This inspection has already been submitted and locked.');
    }

    this.syncLocalSubmission(cleanToken, dossier, now);

    return {
      success: true,
      message: 'Inspection dossier submitted successfully and locked.',
      submittedAt: now
    };
  },

  syncLocalSubmission(token: string, dossier: FieldInspectionDossier, submittedAt: string) {
    try {
      const localTokens = localStore.getInspectionTokens();
      const found = localTokens[token];
      if (found) {
        found.status = 'submitted';
        found.submittedAt = submittedAt;
        found.inspectorName = dossier.inspector.name;
        found.inspectorPhone = dossier.inspector.phone;
        found.gps = dossier.gps;
        found.dossier = dossier;
        localStore.saveInspectionTokens(localTokens);

        // Save dossier keyed by listingId
        const dossiers = localStore.getInspectionDossiers();
        dossiers[found.listingId] = dossier;
        localStore.saveInspectionDossiers(dossiers);

        // Update verification request status in localStore
        const verifs = localStore.getVerifications();
        const updatedVerifs = verifs.map(v => {
          if (v.listingId === found.listingId || (found.verificationRequestId && v.id === found.verificationRequestId)) {
            return {
              ...v,
              status: 'progress' as const,
              inspector: dossier.inspector.name
            };
          }
          return v;
        });
        localStore.saveVerifications(updatedVerifs);
      }
    } catch (err) {
      console.warn('[inspectionService] Non-critical localStore sync failed:', err);
    }
  },

  /**
   * Fetches the latest submitted dossier for a listing to view in Admin Queue.
   */
  async getLatestDossierForListing(listingId: string): Promise<FieldInspectionDossier | undefined> {
    // 1. Try Supabase
    if (isLiveBackend && supabase && UUID_REGEX.test(listingId)) {
      try {
        const { data, error } = await supabase
          .from('property_inspection_tokens')
          .select('dossier_json, submitted_at, inspector_name, inspector_phone, gps_latitude, gps_longitude, gps_accuracy_meters')
          .eq('listing_id', listingId)
          .eq('status', 'submitted')
          .order('submitted_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!error && data && data.dossier_json) {
          return data.dossier_json as FieldInspectionDossier;
        }
      } catch (err) {
        console.warn('Could not load dossier from Supabase:', err);
      }
    }

    // 2. Check localStore
    const dossiers = localStore.getInspectionDossiers();
    if (dossiers[listingId]) {
      return dossiers[listingId];
    }

    // Also check tokens
    const tokens = localStore.getInspectionTokens();
    const foundToken = Object.values(tokens).find(t => t.listingId === listingId && t.status === 'submitted' && t.dossier);
    return foundToken?.dossier;
  },

  /**
   * Checks if an inspection link exists or has been submitted for a listing.
   */
  async getInspectionTokenForListing(listingId: string): Promise<FieldInspectionRecord | undefined> {
    // Try Supabase first
    if (isLiveBackend && supabase && UUID_REGEX.test(listingId)) {
      try {
        const { data, error } = await supabase
          .from('property_inspection_tokens')
          .select('*')
          .eq('listing_id', listingId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!error && data) {
          return {
            id: data.id,
            listingId: data.listing_id,
            verificationRequestId: data.verification_request_id,
            token: data.token,
            status: data.status,
            inspectorName: data.inspector_name,
            inspectorPhone: data.inspector_phone,
            gps: data.gps_latitude ? {
              latitude: data.gps_latitude,
              longitude: data.gps_longitude,
              accuracyMeters: data.gps_accuracy_meters || 10,
              capturedAt: data.gps_captured_at || data.submitted_at || ''
            } : undefined,
            dossier: data.dossier_json as FieldInspectionDossier,
            expiresAt: data.expires_at,
            submittedAt: data.submitted_at,
            createdAt: data.created_at
          };
        }
      } catch (err) {
        console.warn('Could not check token in Supabase:', err);
      }
    }

    // LocalStore fallback
    const tokens = localStore.getInspectionTokens();
    return Object.values(tokens).find(t => t.listingId === listingId);
  }
};
