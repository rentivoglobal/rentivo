import { Listing } from '../types';
import { isLiveBackend } from '../lib/config';
import { supabase } from '../lib/supabase';
import { localStore, LocalVerification } from './localStore';
import { authService } from './authService';
import { listingsService } from './listingsService';

export const verificationService = {
  async list(): Promise<LocalVerification[]> {
    if (!isLiveBackend || !supabase) return localStore.getVerifications();
    const { data, error } = await supabase
      .from('verification_requests')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map((row) => ({
      id: row.id,
      listingId: row.listing_id,
      requestedBy: row.requested_by,
      status: row.status,
      scheduledDate: row.scheduled_date || undefined,
      preferredTime: row.preferred_time || undefined,
      onSiteContactName: row.on_site_contact_name || undefined,
      onSiteContactPhone: row.on_site_contact_phone || undefined,
      inspector: row.inspector_user_id || undefined,
      createdAt: row.created_at
    }));
  },

  async book(input: {
    listing: Listing;
    scheduledDate: string;
    preferredTime: string;
    onSiteContactName: string;
    onSiteContactPhone: string;
  }): Promise<LocalVerification> {
    const user = authService.getCurrentUser();
    const record: LocalVerification = {
      id: localStore.createId('ver'),
      listingId: input.listing.id,
      requestedBy: user?.id || 'local',
      status: 'pending',
      scheduledDate: input.scheduledDate,
      preferredTime: input.preferredTime,
      onSiteContactName: input.onSiteContactName,
      onSiteContactPhone: input.onSiteContactPhone,
      createdAt: new Date().toISOString()
    };
    const items = localStore.getVerifications();
    items.unshift(record);
    localStore.saveVerifications(items);
    await listingsService.updateListing(input.listing.id, { verificationStatus: 'pending' });

    if (isLiveBackend && supabase && user) {
      await supabase.from('verification_requests').insert({
        listing_id: input.listing.id,
        requested_by: user.id,
        status: 'pending',
        scheduled_date: input.scheduledDate,
        preferred_time: input.preferredTime,
        on_site_contact_name: input.onSiteContactName,
        on_site_contact_phone: input.onSiteContactPhone
      });
    }
    return record;
  }
};
