import { AccessRequest, Listing, ListerContact, RequestAccessStatus } from '../types';
import { ACCESS_FEE_NAIRA, APP_URL, isDemoSimulator, isLiveBackend } from '../lib/config';
import { supabase } from '../lib/supabase';
import { localStore } from './localStore';
import { authService } from './authService';
import { listingsService } from './listingsService';

function mapRequest(row: Record<string, unknown>, listing?: Listing): AccessRequest {
  return {
    id: String(row.id),
    listingId: String(row.listing_id),
    listingTitle: listing?.title || String(row.listing_title || ''),
    listingArea: listing?.area || String(row.listing_area || ''),
    listingPrice: listing?.price || Number(row.listing_price || 0),
    listingPhoto: listing?.photos?.[0] || String(row.listing_photo || ''),
    renterName: String(row.renter_name || ''),
    renterPhone: String(row.renter_phone || ''),
    renterEmail: String(row.renter_email || ''),
    status: row.status as RequestAccessStatus,
    feeAmount: ACCESS_FEE_NAIRA,
    isPromotionWaiverApplied: Boolean(row.is_waived),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at || row.created_at)
  };
}

export const requestsService = {
  async getAllRequests(): Promise<AccessRequest[]> {
    if (!isLiveBackend || !supabase) return localStore.getRequests();
    const { data, error } = await supabase
      .from('availability_requests')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    const listings = await listingsService.getListings();
    const mine = await listingsService.getMyListings().catch(() => []);
    const all = [...listings, ...mine];
    return (data || []).map((row) => {
      const listing = all.find((l) => l.id === row.listing_id);
      return mapRequest(row as Record<string, unknown>, listing);
    });
  },

  async getRequestById(id: string): Promise<AccessRequest | undefined> {
    const all = await this.getAllRequests();
    const found = all.find((r) => r.id === id);
    if (!found) return undefined;
    if (found.status === 'paid') {
      found.unlockedListerContact = await this.getUnlockedContact(id);
    }
    return found;
  },

  async createRequest(listing: Listing, renter: { name: string; phone: string; email: string }): Promise<AccessRequest> {
    if (!isLiveBackend || !supabase) {
      const requests = localStore.getRequests();
      const existing = requests.find(
        (r) => r.listingId === listing.id && r.renterEmail === renter.email && r.status !== 'unavailable'
      );
      if (existing) return existing;
      const token = localStore.createId('tok');
      const request: AccessRequest = {
        id: localStore.createId('req'),
        listingId: listing.id,
        listingTitle: listing.title,
        listingArea: listing.area,
        listingPrice: listing.price,
        listingPhoto: listing.photos[0] || '',
        renterName: renter.name,
        renterPhone: renter.phone,
        renterEmail: renter.email,
        status: 'availability_pending',
        feeAmount: ACCESS_FEE_NAIRA,
        isPromotionWaiverApplied: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      requests.unshift(request);
      localStore.saveRequests(requests);
      localStore.saveToken(token, request.id, new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString());
      console.info('Availability email (local):', {
        yes: `${APP_URL}/availability/action?token=${token}&decision=yes`,
        no: `${APP_URL}/availability/action?token=${token}&decision=no`
      });
      return request;
    }

    const user = await authService.getSessionUser();
    if (!user) throw new Error('Sign in to request access.');

    const { data, error } = await supabase.functions.invoke('request-access', {
      body: {
        listingId: listing.id,
        renterName: renter.name,
        renterPhone: renter.phone,
        renterEmail: renter.email
      }
    });
    if (error) throw error;
    if (data?.request) return data.request as AccessRequest;

    const { data: inserted, error: insertError } = await supabase
      .from('availability_requests')
      .insert({
        listing_id: listing.id,
        renter_user_id: user.id,
        renter_name: renter.name,
        renter_phone: renter.phone,
        renter_email: renter.email,
        status: 'availability_pending',
        token_expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      })
      .select('*')
      .single();
    if (insertError) throw insertError;
    return mapRequest(inserted as Record<string, unknown>, listing);
  },

  async respond(requestId: string, decision: 'YES' | 'NO'): Promise<AccessRequest | undefined> {
    if (!isLiveBackend || !supabase) {
      return this.updateStatus(requestId, decision === 'YES' ? 'confirmed' : 'unavailable');
    }
    const { error } = await supabase.rpc('respond_to_availability', {
      p_request_id: requestId,
      p_decision: decision === 'YES' ? 'yes' : 'no'
    });
    if (error) throw error;
    return this.getRequestById(requestId);
  },

  async verifyToken(token: string, decision: 'YES' | 'NO'): Promise<AccessRequest | undefined> {
    if (!isLiveBackend || !supabase) {
      const found = localStore.lookupToken(token);
      if (!found) throw new Error('Invalid or expired confirmation link');
      if (new Date(found.expiresAt) < new Date()) throw new Error('This confirmation link has expired');
      return this.respond(found.requestId, decision);
    }
    const encoder = new TextEncoder();
    const digest = await crypto.subtle.digest('SHA-256', encoder.encode(token));
    const hash = Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
    const { error } = await supabase.rpc('verify_availability_token', {
      p_token_hash: hash,
      p_decision: decision === 'YES' ? 'yes' : 'no'
    });
    if (error) throw error;
    const all = await this.getAllRequests();
    return all[0];
  },

  async updateStatus(requestId: string, status: RequestAccessStatus): Promise<AccessRequest | undefined> {
    const requests = localStore.getRequests();
    const req = requests.find((r) => r.id === requestId);
    if (!req) return undefined;
    req.status = status;
    req.updatedAt = new Date().toISOString();
    localStore.saveRequests(requests);
    return req;
  },

  async simulateListerResponse(requestId: string, reply: 'YES' | 'NO', _listingLister?: Listing['lister']): Promise<AccessRequest | undefined> {
    if (!isDemoSimulator && isLiveBackend) {
      throw new Error('In-app vacancy simulation is disabled outside local QA.');
    }
    return this.respond(requestId, reply);
  },

  async completePayment(requestId: string, listingLister?: Listing['lister']): Promise<AccessRequest | undefined> {
    if (!isLiveBackend || !supabase) {
      const req = await this.updateStatus(requestId, 'paid');
      if (req && listingLister) {
        req.unlockedListerContact = {
          ...listingLister,
          phone: listingLister.phone || localStore.getPrivateAddress(req.listingId) && listingLister.phone,
        };
        const listing = await listingsService.getListingById(req.listingId);
        req.unlockedListerContact = {
          fullName: listingLister.fullName || listing?.lister.fullName || 'Lister',
          phone: listingLister.phone || '+234 800 000 0000',
          whatsapp: listingLister.whatsapp || listingLister.phone || '+234 800 000 0000',
          agencyName: listingLister.agencyName,
          memberSince: listingLister.memberSince,
          activeListingsCount: listingLister.activeListingsCount,
          responseRate: listingLister.responseRate
        };
        const requests = localStore.getRequests().map((r) => (r.id === requestId ? req : r));
        localStore.saveRequests(requests);
        localStore.savePayments([
          {
            id: localStore.createId('pay'),
            requestId,
            renterName: req.renterName,
            renterEmail: req.renterEmail,
            listingTitle: req.listingTitle,
            amount: ACCESS_FEE_NAIRA,
            reference: `PSTK-${requestId.slice(-8)}`,
            status: 'success',
            channel: 'card',
            createdAt: new Date().toISOString(),
            paidAt: new Date().toISOString()
          },
          ...localStore.getPayments()
        ]);
      }
      return req;
    }
    return this.getRequestById(requestId);
  },

  async getUnlockedContact(requestId: string): Promise<ListerContact | undefined> {
    if (!isLiveBackend || !supabase) {
      const req = localStore.getRequests().find((r) => r.id === requestId);
      return req?.unlockedListerContact;
    }
    const { data, error } = await supabase.rpc('get_unlocked_lister_contact', { p_request_id: requestId });
    if (error || !data) return undefined;
    const payload = data as {
      fullName: string;
      phone: string;
      whatsapp: string;
      agencyName?: string;
      exactAddress?: string;
      memberSince?: string;
    };
    return {
      fullName: payload.fullName,
      phone: payload.phone,
      whatsapp: payload.whatsapp,
      agencyName: payload.agencyName,
      memberSince: payload.memberSince || '',
      activeListingsCount: 0,
      responseRate: '—'
    };
  },

  getPromotionStats(): { total: number; redeemed: number; remaining: number; isActive: boolean } {
    const redeemed = isLiveBackend ? 0 : localStore.getPromoCount();
    return {
      total: 100,
      redeemed,
      remaining: Math.max(0, 100 - redeemed),
      isActive: redeemed < 100
    };
  },

  async loadPromotionStats() {
    if (isLiveBackend && supabase) {
      const { data } = await supabase.rpc('get_promo_stats');
      if (data) return data as { total: number; redeemed: number; remaining: number; isActive: boolean };
    }
    return this.getPromotionStats();
  },

  async claimPromotionWaiver(requestId: string, listingLister?: Listing['lister']): Promise<AccessRequest | undefined> {
    if (!isLiveBackend || !supabase) {
      localStore.incrementPromo();
      const paid = await this.completePayment(requestId, listingLister);
      if (paid) paid.isPromotionWaiverApplied = true;
      return paid;
    }
    const { error } = await supabase.rpc('claim_first100_waiver', { p_request_id: requestId });
    if (error) throw error;
    return this.getRequestById(requestId);
  },

  async initializePaystack(requestId: string, email: string): Promise<{ authorizationUrl?: string; reference: string }> {
    if (isLiveBackend && supabase) {
      const { data, error } = await supabase.functions.invoke('paystack-initialize', {
        body: { requestId, email }
      });
      if (error) throw error;
      return data as { authorizationUrl?: string; reference: string };
    }
    return { reference: `local_${requestId}_${Date.now()}` };
  }
};
