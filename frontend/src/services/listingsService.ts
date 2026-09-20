import { Listing, FilterOptions, VerificationStatus } from '../types';
import { isLiveBackend } from '../lib/config';
import { supabase } from '../lib/supabase';
import { DB_TO_UI_TYPE, UI_TO_DB_TYPE, koboToNaira, nairaToKobo } from '../lib/mappers';
import { localStore } from './localStore';
import { authService } from './authService';

const LISTING_SELECT = `
  id, owner_user_id, title, description, category, property_type, status, is_approved,
  price_amount, billing_period, address_summary, bedrooms, bathrooms, size_sqm, amenities,
  is_verified, verified_at, view_count, created_at, rejection_reason,
  cities ( name ),
  areas ( name ),
  listing_photos ( url, thumbnail_url, sort_order, is_primary )
`;

function mapRow(row: Record<string, unknown>, includePrivate = false): Listing {
  const photos = ((row.listing_photos as Array<{ url: string; sort_order: number; is_primary: boolean }>) || [])
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((p) => p.url);
  const city = Array.isArray(row.cities) ? (row.cities[0] as { name: string })?.name : (row.cities as { name: string } | null)?.name || 'Ibadan';
  const area = Array.isArray(row.areas) ? (row.areas[0] as { name: string })?.name : (row.areas as { name: string } | null)?.name || '';
  const status = String(row.status);
  const verified = Boolean(row.is_verified);
  let verificationStatus: VerificationStatus = 'unverified';
  if (verified) verificationStatus = 'verified';
  else if (status === 'pending_approval') verificationStatus = 'pending';

  return {
    id: String(row.id),
    title: String(row.title),
    category: row.category as Listing['category'],
    type: DB_TO_UI_TYPE[String(row.property_type)] || 'Flat',
    city,
    area,
    addressDescription: includePrivate ? String(row.address_summary) : String(row.address_summary),
    price: koboToNaira(Number(row.price_amount || 0)),
    pricePeriod: (row.billing_period as Listing['pricePeriod']) || 'per_year',
    bedrooms: row.bedrooms as number | undefined,
    bathrooms: row.bathrooms as number | undefined,
    areaSqm: row.size_sqm ? Number(row.size_sqm) : undefined,
    amenities: Array.isArray(row.amenities) ? (row.amenities as string[]) : [],
    description: String(row.description || ''),
    photos,
    verificationStatus,
    lister: {
      fullName: 'Rentivo Lister',
      phone: '',
      whatsapp: '',
      memberSince: '',
      activeListingsCount: 0,
      responseRate: '—'
    },
    listerRole: 'landlord',
    createdAt: String(row.created_at),
    isAvailable: status === 'active',
    isApproved: Boolean(row.is_approved),
    moderationStatus: status as Listing['moderationStatus']
  };
}

export const listingsService = {
  async getListings(filters?: FilterOptions): Promise<Listing[]> {
    if (!isLiveBackend || !supabase) {
      return localStore.publicListings(filters);
    }

    let query = supabase
      .from('listings')
      .select(LISTING_SELECT)
      .eq('status', 'active')
      .eq('is_approved', true);

    if (filters?.category && filters.category !== 'all') query = query.eq('category', filters.category);
    if (filters?.verifiedOnly) query = query.eq('is_verified', true);
    if (filters?.minPrice !== undefined) query = query.gte('price_amount', nairaToKobo(filters.minPrice));
    if (filters?.maxPrice !== undefined) query = query.lte('price_amount', nairaToKobo(filters.maxPrice));
    if (filters?.bedrooms) query = query.gte('bedrooms', filters.bedrooms);
    if (filters?.searchQuery?.trim()) query = query.ilike('title', `%${filters.searchQuery.trim()}%`);
    if (filters?.sortBy === 'price_asc') query = query.order('price_amount', { ascending: true });
    else if (filters?.sortBy === 'price_desc') query = query.order('price_amount', { ascending: false });
    else query = query.order('created_at', { ascending: false });

    const { data, error } = await query;
    if (error) throw error;

    let listings = (data || []).map((row) => mapRow(row as Record<string, unknown>));
    if (filters?.area && filters.area !== 'All Ibadan areas') {
      listings = listings.filter((l) => l.area.toLowerCase() === filters.area?.toLowerCase());
    }
    if (filters?.type && filters.type !== 'All Types') {
      listings = listings.filter((l) => l.type === filters.type);
    }
    if (filters?.city && filters.city !== 'All Cities') {
      listings = listings.filter((l) => l.city.toLowerCase() === filters.city?.toLowerCase());
    }
    return listings;
  },

  async getListingById(id: string): Promise<Listing | undefined> {
    if (!isLiveBackend || !supabase) {
      const found = localStore.getListingsRaw().find((l) => l.id === id);
      if (!found) return undefined;
      if (found.isApproved === false) {
        const user = authService.getCurrentUser();
        if (user && (user.role === 'admin' || user.role === 'landlord' || user.role === 'agent')) return found;
        return undefined;
      }
      return { ...found, lister: { ...found.lister, phone: '', whatsapp: '' } };
    }
    const { data, error } = await supabase.from('listings').select(LISTING_SELECT).eq('id', id).maybeSingle();
    if (error || !data) return undefined;
    return mapRow(data as Record<string, unknown>);
  },

  async getMyListings(): Promise<Listing[]> {
    if (!isLiveBackend || !supabase) {
      return localStore.getListingsRaw();
    }
    const { data: session } = await supabase.auth.getSession();
    const userId = session.session?.user.id;
    if (!userId) return [];
    const { data, error } = await supabase
      .from('listings')
      .select(LISTING_SELECT)
      .eq('owner_user_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map((row) => mapRow(row as Record<string, unknown>, true));
  },

  async createListing(newListing: Omit<Listing, 'id' | 'createdAt'> & { verificationStatus?: VerificationStatus }): Promise<Listing> {
    if (!isLiveBackend || !supabase) {
      const created: Listing = {
        ...newListing,
        id: localStore.createId('prop'),
        verificationStatus: 'pending',
        isApproved: false,
        isAvailable: false,
        moderationStatus: 'pending_approval',
        createdAt: new Date().toISOString(),
        lister: { ...newListing.lister, phone: '', whatsapp: '' }
      };
      const listings = localStore.getListingsRaw();
      listings.unshift(created);
      localStore.saveListings(listings);
      localStore.setPrivateAddress(created.id, newListing.addressDescription);
      return created;
    }

    const { data: session } = await supabase.auth.getSession();
    const userId = session.session?.user.id;
    if (!userId) throw new Error('Sign in as a landlord or agent to list a property.');

    const { data: city } = await supabase.from('cities').select('id').ilike('name', newListing.city || 'Ibadan').maybeSingle();
    const { data: area } = await supabase
      .from('areas')
      .select('id')
      .ilike('name', newListing.area)
      .maybeSingle();

    const { data, error } = await supabase
      .from('listings')
      .insert({
        owner_user_id: userId,
        title: newListing.title,
        description: newListing.description,
        category: newListing.category,
        property_type: UI_TO_DB_TYPE[newListing.type],
        status: 'pending_approval',
        is_approved: false,
        price_amount: nairaToKobo(newListing.price),
        billing_period: newListing.pricePeriod,
        city_id: city?.id,
        area_id: area?.id,
        address_summary: `${newListing.area}, ${newListing.city || 'Ibadan'}`,
        bedrooms: newListing.bedrooms,
        bathrooms: newListing.bathrooms,
        size_sqm: newListing.areaSqm,
        amenities: newListing.amenities
      })
      .select('id')
      .single();
    if (error || !data) throw error || new Error('Could not create listing');

    await supabase.from('listing_private_details').insert({
      listing_id: data.id,
      address_full: newListing.addressDescription
    });

    if (newListing.photos?.length) {
      await supabase.from('listing_photos').insert(
        newListing.photos.map((url, index) => ({
          listing_id: data.id,
          imagekit_file_id: `local-${data.id}-${index}`,
          url,
          thumbnail_url: url,
          file_path: url,
          sort_order: index,
          is_primary: index === 0
        }))
      );
    }

    const created = await this.getListingById(data.id);
    return created!;
  },

  async updateListing(id: string, updatedData: Partial<Listing>): Promise<Listing | undefined> {
    if (!isLiveBackend || !supabase) {
      const listings = localStore.getListingsRaw();
      const index = listings.findIndex((l) => l.id === id);
      if (index === -1) return undefined;
      listings[index] = { ...listings[index], ...updatedData };
      localStore.saveListings(listings);
      if (updatedData.addressDescription) localStore.setPrivateAddress(id, updatedData.addressDescription);
      return listings[index];
    }

    const patch: Record<string, unknown> = {};
    if (updatedData.title) patch.title = updatedData.title;
    if (updatedData.description) patch.description = updatedData.description;
    if (updatedData.price !== undefined) patch.price_amount = nairaToKobo(updatedData.price);
    if (updatedData.pricePeriod) patch.billing_period = updatedData.pricePeriod;
    if (updatedData.bedrooms !== undefined) patch.bedrooms = updatedData.bedrooms;
    if (updatedData.bathrooms !== undefined) patch.bathrooms = updatedData.bathrooms;
    if (updatedData.areaSqm !== undefined) patch.size_sqm = updatedData.areaSqm;
    if (updatedData.amenities) patch.amenities = updatedData.amenities;
    if (updatedData.isAvailable === false) patch.status = 'unavailable';
    if (updatedData.isAvailable === true) patch.status = 'active';

    if (Object.keys(patch).length) {
      const { error } = await supabase.from('listings').update(patch).eq('id', id);
      if (error) throw error;
    }
    if (updatedData.addressDescription) {
      await supabase.from('listing_private_details').upsert({ listing_id: id, address_full: updatedData.addressDescription });
    }
    return this.getListingById(id);
  },

  async deleteListing(id: string): Promise<boolean> {
    if (!isLiveBackend || !supabase) {
      const listings = localStore.getListingsRaw();
      const filtered = listings.filter((l) => l.id !== id);
      localStore.saveListings(filtered);
      return filtered.length !== listings.length;
    }
    const { error } = await supabase.from('listings').update({ status: 'removed' }).eq('id', id);
    return !error;
  },

  async moderateListing(id: string, action: 'approve' | 'reject', reason?: string): Promise<void> {
    if (!isLiveBackend || !supabase) {
      const listings = localStore.getListingsRaw();
      const listing = listings.find((l) => l.id === id);
      if (!listing) return;
      if (action === 'approve') {
        listing.isApproved = true;
        listing.isAvailable = true;
        listing.moderationStatus = 'active';
      } else {
        listing.isApproved = false;
        listing.isAvailable = false;
        listing.moderationStatus = 'rejected';
      }
      localStore.saveListings(listings);
      return;
    }
    const { error } = await supabase.rpc('admin_moderate_listing', {
      p_listing_id: id,
      p_action: action,
      p_reason: reason || null
    });
    if (error) throw error;
  },

  async issueVerifiedBadge(id: string, checklist?: Listing['inspection']): Promise<void> {
    if (!isLiveBackend || !supabase) {
      const listings = localStore.getListingsRaw();
      const listing = listings.find((l) => l.id === id);
      if (!listing) return;
      listing.verificationStatus = 'verified';
      listing.inspection = checklist || {
        physicalVisitCompleted: true,
        addressMatchesTitle: true,
        listerMandateVerified: true,
        photosAuthentic: true,
        inspectionDate: new Date().toLocaleDateString()
      };
      localStore.saveListings(listings);
      return;
    }
    const { error } = await supabase.rpc('admin_issue_verified_badge', {
      p_listing_id: id,
      p_checklist: checklist || {
        physicalVisitCompleted: true,
        addressMatchesTitle: true,
        listerMandateVerified: true,
        photosAuthentic: true
      },
      p_notes: checklist?.inspectorNotes || null
    });
    if (error) throw error;
  },

  getFavorites(): string[] {
    const user = authService.getCurrentUser();
    return localStore.getFavorites(user?.id);
  },

  async loadFavorites(): Promise<string[]> {
    if (!isLiveBackend || !supabase) return this.getFavorites();
    const { data: session } = await supabase.auth.getSession();
    const userId = session.session?.user.id;
    if (!userId) return localStore.getFavorites();
    const { data } = await supabase.from('favorites').select('listing_id').eq('user_id', userId);
    const ids = (data || []).map((row) => row.listing_id as string);
    localStore.saveFavorites(ids, userId);
    return ids;
  },

  async toggleFavorite(listingId: string): Promise<string[]> {
    const user = authService.getCurrentUser();
    if (!isLiveBackend || !supabase || !user) {
      const current = localStore.getFavorites(user?.id);
      const next = current.includes(listingId) ? current.filter((id) => id !== listingId) : [...current, listingId];
      localStore.saveFavorites(next, user?.id);
      return next;
    }
    const { data: session } = await supabase.auth.getSession();
    const userId = session.session?.user.id;
    if (!userId) return this.getFavorites();
    const existing = await this.loadFavorites();
    if (existing.includes(listingId)) {
      await supabase.from('favorites').delete().eq('user_id', userId).eq('listing_id', listingId);
    } else {
      await supabase.from('favorites').insert({ user_id: userId, listing_id: listingId });
    }
    return this.loadFavorites();
  }
};
