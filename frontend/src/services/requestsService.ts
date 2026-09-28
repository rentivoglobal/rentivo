import { AccessRequest, Listing, ListerContact, RequestAccessStatus } from '../types';
import { ACCESS_FEE_NAIRA, APP_URL, isDemoSimulator, isLiveBackend } from '../lib/config';
import { supabase, extractEdgeFunctionError } from '../lib/supabase';
import { localStore } from './localStore';
import { authService } from './authService';
import { listingsService } from './listingsService';
import { emailNotificationService } from './emailNotificationService';

function mapRequest(row: Record<string, unknown>, listing?: Listing): AccessRequest {
  const listingRel = (row.listings as any) || (row.listing as any);
  const areaName = listing?.area || (listingRel?.areas as any)?.name || (Array.isArray(listingRel?.areas) ? listingRel?.areas[0]?.name : undefined) || String(row.listing_area || 'Ibadan');
  const photosArr = listing?.photos || (listingRel?.listing_photos as any[])?.sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0)).map((p: any) => p.url) || [];
  const photo = photosArr[0] || String(row.listing_photo || 'https://ik.imagekit.io/3unwhixxd/Property%20type.png');
  const price = listing?.price || (listingRel?.price_amount ? (listingRel.price_amount > 10000000 ? listingRel.price_amount / 100 : listingRel.price_amount) : Number(row.listing_price || 0));
  const title = listing?.title || listingRel?.title || String(row.listing_title || 'Verified Property');

  return {
    id: String(row.id),
    listingId: String(row.listing_id || listingRel?.id || ''),
    listingTitle: title,
    listingArea: areaName,
    listingPrice: price,
    listingPhoto: photo,
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
    try {
      const { data, error } = await supabase
        .from('availability_requests')
        .select(`
          *,
          listings (
            id, title, category, property_type, price_amount, billing_period, address_summary,
            areas ( name ),
            listing_photos ( url, sort_order, is_primary )
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []).map((row) => mapRequest(row as Record<string, unknown>));
    } catch (err) {
      console.warn('Direct relation select failed, using fallback query for getAllRequests:', err);
      const { data: flatData, error: flatError } = await supabase
        .from('availability_requests')
        .select('*')
        .order('created_at', { ascending: false });
      if (flatError) throw flatError;
      const listings = await listingsService.getListings().catch(() => []);
      return (flatData || []).map((row) => {
        const listing = listings.find((l) => l.id === row.listing_id);
        return mapRequest(row as Record<string, unknown>, listing);
      });
    }
  },

  async getMyRequests(): Promise<AccessRequest[]> {
    if (!isLiveBackend || !supabase) return localStore.getRequests();
    const { data: session } = await supabase.auth.getSession();
    const userId = session.session?.user.id;
    if (!userId) return [];

    try {
      const { data, error } = await supabase
        .from('availability_requests')
        .select(`
          *,
          listings (
            id, title, category, property_type, price_amount, billing_period, address_summary,
            areas ( name ),
            listing_photos ( url, sort_order, is_primary )
          )
        `)
        .eq('renter_user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []).map((row) => mapRequest(row as Record<string, unknown>));
    } catch (err) {
      console.warn('Direct relation select failed, using fallback query:', err);
      const { data: flatData, error: flatError } = await supabase
        .from('availability_requests')
        .select('*')
        .eq('renter_user_id', userId)
        .order('created_at', { ascending: false });
      if (flatError) throw flatError;
      const listings = await listingsService.getListings().catch(() => []);
      return (flatData || []).map((row) => {
        const listing = listings.find((l) => l.id === row.listing_id);
        return mapRequest(row as Record<string, unknown>, listing);
      });
    }
  },

  async getMyInquiries(): Promise<AccessRequest[]> {
    if (!isLiveBackend || !supabase) {
      const user = authService.getCurrentUser();
      const myListingIds = new Set(localStore.getListingsRaw().filter(l => l.lister.fullName === user?.name).map(l => l.id));
      return localStore.getRequests().filter(r => myListingIds.has(r.listingId));
    }
    const myListings = await listingsService.getMyListings();
    if (!myListings.length) return [];
    const myIds = myListings.map((l) => l.id);
    const { data, error } = await supabase
      .from('availability_requests')
      .select('*')
      .in('listing_id', myIds)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map((row) => {
      const listing = myListings.find((l) => l.id === row.listing_id);
      return mapRequest(row as Record<string, unknown>, listing);
    });
  },

  async getRequests(): Promise<AccessRequest[]> {
    return this.getMyRequests();
  },

  async getRequestById(id: string): Promise<AccessRequest | undefined> {
    if (!isLiveBackend || !supabase) {
      const all = localStore.getRequests();
      const found = all.find((r) => r.id === id);
      return found;
    }

    try {
      const { data, error } = await supabase
        .from('availability_requests')
        .select(`
          *,
          listings (
            id, title, category, property_type, price_amount, billing_period, address_summary,
            areas ( name ),
            listing_photos ( url, sort_order, is_primary )
          )
        `)
        .eq('id', id)
        .maybeSingle();

      if (error || !data) throw error || new Error('Not found');
      const req = mapRequest(data as Record<string, unknown>);
      if (req.status === 'paid') {
        req.unlockedListerContact = await this.getUnlockedContact(id);
      }
      return req;
    } catch (_e) {
      const { data, error } = await supabase
        .from('availability_requests')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (error || !data) return undefined;
      const listing = await listingsService.getListingById(data.listing_id);
      const req = mapRequest(data as Record<string, unknown>, listing);
      if (req.status === 'paid') {
        req.unlockedListerContact = await this.getUnlockedContact(id);
      }
      return req;
    }
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

    let data: any = null;
    try {
      const res = await supabase.functions.invoke('request-access', {
        body: {
          listingId: listing.id,
          renterName: renter.name,
          renterPhone: renter.phone,
          renterEmail: renter.email
        }
      });
      data = res.data;
      if (res.error) {
        const errMsg = await extractEdgeFunctionError(res.error);
        console.warn('request-access function error, falling back to direct db insert:', errMsg);
      }
    } catch (invokeErr) {
      console.warn('request-access function call failed, falling back to direct db insert:', invokeErr);
    }
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
    let result: AccessRequest | undefined;
    if (!isLiveBackend || !supabase) {
      result = await this.updateStatus(requestId, decision === 'YES' ? 'confirmed' : 'unavailable');
    } else {
      const { error } = await supabase.rpc('respond_to_availability', {
        p_request_id: requestId,
        p_decision: decision === 'YES' ? 'yes' : 'no'
      });
      if (error) throw error;
      result = await this.getRequestById(requestId);
    }

    if (decision === 'YES' && result) {
      void (async () => {
        try {
          const listing = await listingsService.getListingById(result.listingId);
          await emailNotificationService.sendAvailabilityConfirmedEmail({
            request: result,
            listing
          });
        } catch (e) {
          console.warn('Could not dispatch availability email:', e);
        }
      })();
    }

    return result;
  },

  async verifyToken(token: string, decision: 'YES' | 'NO'): Promise<AccessRequest | undefined> {
    let result: AccessRequest | undefined;
    if (!isLiveBackend || !supabase) {
      const found = localStore.lookupToken(token);
      if (!found) throw new Error('Invalid or expired confirmation link');
      if (new Date(found.expiresAt) < new Date()) throw new Error('This confirmation link has expired');
      result = await this.respond(found.requestId, decision);
      return result;
    }
    const encoder = new TextEncoder();
    const digest = await crypto.subtle.digest('SHA-256', encoder.encode(token));
    const hash = Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
    const { data: rpcRes, error } = await supabase.rpc('verify_availability_token', {
      p_token_hash: hash,
      p_decision: decision === 'YES' ? 'yes' : 'no'
    });
    if (error) throw error;
    const reqId = (rpcRes as any)?.requestId;
    result = reqId ? await this.getRequestById(reqId) : (await this.getAllRequests())[0];


    if (decision === 'YES' && result) {
      void (async () => {
        try {
          const listing = await listingsService.getListingById(result.listingId);
          await emailNotificationService.sendAvailabilityConfirmedEmail({
            request: result,
            listing
          });
        } catch (e) {
          console.warn('Could not dispatch availability email from token verify:', e);
        }
      })();
    }

    return result;
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
        const authenticPhone = listingLister?.phone || listing?.lister.phone || '';
        req.unlockedListerContact = {
          fullName: listingLister?.fullName || listing?.lister.fullName || 'Verified Lister',
          phone: authenticPhone,
          whatsapp: listingLister?.whatsapp || listing?.lister.whatsapp || authenticPhone,
          agencyName: listingLister?.agencyName || listing?.lister.agencyName,
          memberSince: listingLister?.memberSince || listing?.lister.memberSince || 'Verified Lister',
          activeListingsCount: listingLister?.activeListingsCount || listing?.lister.activeListingsCount || 1,
          responseRate: listingLister?.responseRate || listing?.lister.responseRate || '100%'
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
    }
    const paidRequest = (!isLiveBackend || !supabase) ? await this.getRequestById(requestId) : await this.getRequestById(requestId);

    if (paidRequest) {
      void (async () => {
        try {
          const listing = await listingsService.getListingById(paidRequest.listingId);
          const contact = paidRequest.unlockedListerContact || listingLister;
          await emailNotificationService.sendPaymentSuccessEmail({
            request: paidRequest,
            listing,
            unlockedContact: contact,
            paymentReference: `PSTK-${requestId.slice(-8)}`
          });
        } catch (e) {
          console.warn('Could not dispatch payment success email:', e);
        }
      })();
    }

    return paidRequest;
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
      responseRate: '—',
      exactAddress: payload.exactAddress
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

  validatePromoCode(code: string): { valid: boolean; discountPercent: number; message: string } {
    const clean = code.trim().toUpperCase();
    if (['FIRST100', 'RENTIVO100', 'WAIVER5000', 'TESTFREE'].includes(clean)) {
      return { valid: true, discountPercent: 100, message: '100% Launch Access Fee Waiver applied' };
    }
    return { valid: false, discountPercent: 0, message: 'Invalid or expired promo code.' };
  },

  async claimPromotionWaiver(requestId: string, code?: string, listingLister?: Listing['lister']): Promise<AccessRequest | undefined> {
    if (code) {
      const check = this.validatePromoCode(code);
      if (!check.valid) throw new Error(check.message);
    }
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
      if (error) {
        const errMsg = await extractEdgeFunctionError(error, 'Failed to initialize Paystack payment.');
        throw new Error(errMsg);
      }
      return data as { authorizationUrl?: string; reference: string };
    }
    return { reference: `local_${requestId}_${Date.now()}` };
  },

  async verifyPaystack(requestId: string, reference: string): Promise<{ success: boolean; request?: AccessRequest }> {
    if (isLiveBackend && supabase) {
      try {
        const { data, error } = await supabase.functions.invoke('paystack-verify', {
          body: { requestId, reference }
        });
        if (error) {
          const errMsg = await extractEdgeFunctionError(error, 'Failed to verify Paystack payment.');
          console.warn('paystack-verify error:', errMsg);
          return { success: false };
        }
        const updated = await this.getRequestById(requestId);
        return { success: Boolean(data?.success), request: updated };
      } catch (err) {
        console.warn('verifyPaystack invoke exception:', err);
        return { success: false };
      }
    }
    return { success: true };
  }
};

