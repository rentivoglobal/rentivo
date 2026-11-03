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
    if (error) {
      console.warn('Failed to load verification requests from Supabase:', error);
      return localStore.getVerifications();
    }
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
    const user = authService.getCurrentUser() || (await authService.getSessionUser());

    let isoDate = input.scheduledDate;
    if (isoDate && !/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) {
      const parsed = new Date(isoDate);
      if (!isNaN(parsed.getTime())) {
        isoDate = parsed.toISOString().slice(0, 10);
      } else {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        isoDate = tomorrow.toISOString().slice(0, 10);
      }
    }

    const record: LocalVerification = {
      id: localStore.createId('ver'),
      listingId: input.listing.id,
      requestedBy: user?.id || 'local',
      status: 'pending',
      scheduledDate: isoDate,
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
        scheduled_date: isoDate,
        preferred_time: input.preferredTime,
        on_site_contact_name: input.onSiteContactName,
        on_site_contact_phone: input.onSiteContactPhone
      });
    }
    return record;
  },

  async getById(id: string): Promise<LocalVerification | null> {
    const list = await this.list();
    return list.find(v => v.id === id || v.listingId === id) || null;
  },

  async update(id: string, updates: Partial<LocalVerification> & { decisionNotes?: string }): Promise<void> {
    const items = localStore.getVerifications();
    const targetListingId = id.replace(/^listing_ver_/, '');
    const existingIndex = items.findIndex(v => v.id === id || v.listingId === id || v.listingId === targetListingId);

    let updated: LocalVerification[];
    if (existingIndex >= 0) {
      updated = items.map((v, idx) =>
        idx === existingIndex ? { ...v, ...updates, updatedAt: new Date().toISOString() } : v
      );
    } else {
      const newRecord: LocalVerification = {
        id: id.startsWith('listing_ver_') ? id : localStore.createId('ver'),
        listingId: targetListingId,
        requestedBy: 'admin',
        status: updates.status || 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        ...updates
      };
      updated = [newRecord, ...items];
    }
    localStore.saveVerifications(updated);

    // Sync listing state
    if (updates.status === 'completed' || updates.status === 'verified') {
      await listingsService.issueVerifiedBadge(targetListingId).catch(() => {});
    } else if (updates.status === 'changes_requested' || updates.status === 'changes') {
      await listingsService.updateListing(targetListingId, { verificationStatus: 'changes_requested' as any }).catch(() => {});
    } else if (updates.status === 'rejected') {
      await listingsService.updateListing(targetListingId, { verificationStatus: 'rejected' as any }).catch(() => {});
    }

    if (isLiveBackend && supabase) {
      try {
        const payload: Record<string, any> = {
          updated_at: new Date().toISOString()
        };
        if (updates.status) {
          // Normalize status to Supabase enum ('pending', 'scheduled', 'in_progress', 'completed', 'rejected', 'changes_requested')
          const normStatus = 
            updates.status === 'verified' ? 'completed' :
            updates.status === 'changes' ? 'changes_requested' :
            updates.status;
          payload.status = normStatus;
        }
        if (updates.inspector) payload.inspector_user_id = updates.inspector;
        if (updates.scheduledDate) payload.scheduled_date = updates.scheduledDate;
        if (updates.preferredTime) payload.preferred_time = updates.preferredTime;
        
        const noteContent = updates.auditorNotes || updates.decisionNotes || updates.requestedChangesNotes || updates.rejectionReason;
        if (noteContent) {
          payload.decision_notes = noteContent;
          payload.decided_at = new Date().toISOString();
        }

        if (Object.keys(payload).length > 0) {
          if (id.startsWith('listing_ver_')) {
            await supabase.from('verification_requests').update(payload).eq('listing_id', targetListingId);
          } else {
            await supabase.from('verification_requests').update(payload).eq('id', id);
          }
        }

        // Record into audit_logs
        const currentUser = authService.getCurrentUser() || (await authService.getSessionUser());
        await supabase.from('audit_logs').insert({
          actor_user_id: currentUser?.id || null,
          action: `verification.${updates.status || 'update'}`,
          entity_type: 'verification_request',
          entity_id: id.startsWith('listing_ver_') ? null : id,
          metadata: {
            listingId: targetListingId,
            status: updates.status,
            notes: noteContent || null
          }
        });
      } catch (err) {
        console.warn('Failed to update verification request in Supabase:', err);
      }
    }
  }
};
