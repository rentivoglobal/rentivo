import { Listing, AccessRequest, User, CityLocation, ReportItem, FilterOptions, UserRole, RequestAccessStatus, VerificationStatus, AdminInvitation } from '../types';
import { FieldInspectionRecord, FieldInspectionDossier } from '../types/inspection';
import { ACCESS_FEE_NAIRA, PROMO_CAP } from '../lib/config';
import { maskListerContact, slugify } from '../lib/mappers';

const PREFIX = 'rentivo_v6_';
const KEYS = {
  users: `${PREFIX}users`,
  session: `${PREFIX}session`,
  listings: `${PREFIX}listings`,
  private: `${PREFIX}private_addresses`,
  requests: `${PREFIX}requests`,
  payments: `${PREFIX}payments`,
  favorites: `${PREFIX}favorites`,
  reports: `${PREFIX}reports`,
  cities: `${PREFIX}cities`,
  verifications: `${PREFIX}verifications`,
  tokens: `${PREFIX}tokens`,
  promo: `${PREFIX}promo_count`,
  inspectionTokens: `${PREFIX}inspection_tokens`,
  inspectionDossiers: `${PREFIX}inspection_dossiers`,
  adminInvitations: `${PREFIX}admin_invitations`
};

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw) as T;
  } catch {
    /* ignore */
  }
  return fallback;
}

function pruneDossiersForStorage(dossiers: Record<string, FieldInspectionDossier>): Record<string, FieldInspectionDossier> {
  const entries = Object.entries(dossiers || {});
  if (entries.length === 0) return {};

  // Sort descending by submittedAt so newest are kept
  entries.sort((a, b) => {
    const timeA = new Date(a[1].submittedAt || 0).getTime();
    const timeB = new Date(b[1].submittedAt || 0).getTime();
    return timeB - timeA;
  });

  // Keep at most 3 recent inspection dossiers in localStorage fallback
  const kept = entries.slice(0, 3);
  const result: Record<string, FieldInspectionDossier> = {};

  for (const [id, dossier] of kept) {
    const sanitizedPhotos: Record<string, string> = {};
    if (dossier.photoEvidence) {
      for (const [photoKey, photoVal] of Object.entries(dossier.photoEvidence)) {
        if (typeof photoVal === 'string') {
          // If any single photo string exceeds 120KB, omit it from localStore to protect browser quota
          if (photoVal.length > 120000) {
            continue;
          }
          sanitizedPhotos[photoKey] = photoVal;
        }
      }
    }

    result[id] = {
      ...dossier,
      photoEvidence: sanitizedPhotos
    };
  }

  return result;
}

// Self-healing: if localStorage already has an oversized dossiers cache or is near quota, clean it up immediately
try {
  const rawDossiers = localStorage.getItem(KEYS.inspectionDossiers);
  if (rawDossiers && (rawDossiers.length > 200000 || rawDossiers.includes('data:image/'))) {
    try {
      const parsed = JSON.parse(rawDossiers);
      const pruned = pruneDossiersForStorage(parsed);
      localStorage.setItem(KEYS.inspectionDossiers, JSON.stringify(pruned));
    } catch {
      localStorage.removeItem(KEYS.inspectionDossiers);
    }
  }
} catch {
  try {
    localStorage.removeItem(KEYS.inspectionDossiers);
  } catch {
    /* ignore */
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err: any) {
    console.warn(`[localStore] Failed to write key "${key}":`, err);
    const isQuota =
      err?.name === 'QuotaExceededError' ||
      err?.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
      err?.code === 22 ||
      err?.code === 1014 ||
      err?.number === -2147024882 ||
      String(err).toLowerCase().includes('quota');

    if (isQuota) {
      try {
        // Step 1: Evict heavy inspection dossiers cache
        localStorage.removeItem(KEYS.inspectionDossiers);

        // Step 2: If the key we were trying to write IS inspectionDossiers,
        // sanitize it by keeping only the 1-2 most recent dossiers with sanitized photos
        if (key === KEYS.inspectionDossiers && typeof value === 'object' && value !== null) {
          const sanitized = pruneDossiersForStorage(value as Record<string, FieldInspectionDossier>);
          localStorage.setItem(key, JSON.stringify(sanitized));
          return;
        }

        // Step 3: Retry writing the key now that heavy cache was freed
        localStorage.setItem(key, JSON.stringify(value));
      } catch (retryErr) {
        console.error(`[localStore] Storage quota critically exceeded after eviction for "${key}":`, retryErr);
      }
    }
  }
}

function publicListing(listing: Listing): Listing {
  return {
    ...listing,
    lister: maskListerContact(listing.lister)
  };
}

function seedCities(): CityLocation[] {
  const areas = [
    'Bodija', 'Akobo', 'Jericho', 'Ring Road', 'UI / Samonda', 'UI area', 'Agodi',
    'Agodi GRA', 'Oluyole', 'Oluyole Estate', 'Samonda', 'Challenge', 'Dugbe',
    'Iwo Road', 'Ikolaba', 'Eleyele', 'Moniya', 'Apata', 'Ologuneru'
  ];
  return [
    {
      id: 'city-ibadan',
      name: 'Ibadan',
      slug: 'ibadan',
      state: 'Oyo State',
      isActive: true,
      isPilot: true,
      areas,
      areaItems: areas.map((name) => ({
        id: `area-${slugify(name)}`,
        cityId: 'city-ibadan',
        name,
        slug: slugify(name),
        isActive: true,
        listingCount: 0
      })),
      listingCount: 0
    }
  ];
}

function seedRequests(): AccessRequest[] {
  const now = Date.now();
  return [
    {
      id: 'seed-req-1',
      listingId: 'ibadan-listing-1',
      listingTitle: 'Luxury 2-Bedroom Apartment in Old Bodija',
      listingArea: 'Bodija',
      listingPrice: 850000,
      listingPhoto: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1200&q=80',
      renterName: 'Tunde Bakare',
      renterPhone: '08023456789',
      renterEmail: 'tunde@example.com',
      status: 'confirmed',
      feeAmount: ACCESS_FEE_NAIRA,
      isPromotionWaiverApplied: false,
      createdAt: new Date(now - 86400000 * 2 - 18 * 60000).toISOString(),
      updatedAt: new Date(now - 86400000 * 2).toISOString(),
      unlockedListerContact: {
        fullName: 'Adeleke Property Mgmt',
        phone: '08012345678',
        whatsapp: '2348012345678',
        activeListingsCount: 4,
        responseRate: '100%',
        memberSince: '2023'
      }
    },
    {
      id: 'seed-req-2',
      listingId: 'ibadan-listing-2',
      listingTitle: 'Modern Self-Contain near UI gate',
      listingArea: 'UI / Samonda',
      listingPrice: 350000,
      listingPhoto: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1200&q=80',
      renterName: 'Chioma Okonkwo',
      renterPhone: '08098765432',
      renterEmail: 'chioma@example.com',
      status: 'confirmed',
      feeAmount: ACCESS_FEE_NAIRA,
      isPromotionWaiverApplied: true,
      createdAt: new Date(now - 86400000 - 22 * 60000).toISOString(),
      updatedAt: new Date(now - 86400000).toISOString(),
      unlockedListerContact: {
        fullName: 'Chief Adeleke',
        phone: '08033334444',
        whatsapp: '2348033334444',
        activeListingsCount: 2,
        responseRate: '98%',
        memberSince: '2022'
      }
    },
    {
      id: 'seed-req-3',
      listingId: 'ibadan-listing-3',
      listingTitle: 'Serviced 3-Bedroom Flat, Agodi GRA',
      listingArea: 'Agodi GRA',
      listingPrice: 1600000,
      listingPhoto: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1200&q=80',
      renterName: 'Dayo Alabi',
      renterPhone: '08123456780',
      renterEmail: 'dayo@example.com',
      status: 'paid',
      feeAmount: ACCESS_FEE_NAIRA,
      isPromotionWaiverApplied: false,
      createdAt: new Date(now - 86400000 * 3 - 15 * 60000).toISOString(),
      updatedAt: new Date(now - 86400000 * 3).toISOString(),
      unlockedListerContact: {
        fullName: 'Prime Realty Ibadan',
        phone: '08055556666',
        whatsapp: '2348055556666',
        activeListingsCount: 5,
        responseRate: '100%',
        memberSince: '2023'
      }
    }
  ];
}

function seedPayments(): LocalPayment[] {
  const now = Date.now();
  return [
    {
      id: 'pay-seed-1',
      requestId: 'seed-req-3',
      renterName: 'Dayo Alabi',
      renterEmail: 'dayo@example.com',
      listingTitle: 'Serviced 3-Bedroom Flat, Agodi GRA',
      amount: ACCESS_FEE_NAIRA,
      reference: 'pstk_live_89a32c4b71',
      status: 'success',
      channel: 'Paystack Card',
      createdAt: new Date(now - 86400000 * 3).toISOString(),
      paidAt: new Date(now - 86400000 * 3 + 45000).toISOString()
    },
    {
      id: 'pay-seed-2',
      requestId: 'seed-req-1',
      renterName: 'Adeola Johnson',
      renterEmail: 'adeola@example.com',
      listingTitle: 'Spacious 2-Bedroom Apartment, Bodija',
      amount: ACCESS_FEE_NAIRA,
      reference: 'pstk_live_72d91e5a20',
      status: 'success',
      channel: 'Bank Transfer',
      createdAt: new Date(now - 86400000 * 2).toISOString(),
      paidAt: new Date(now - 86400000 * 2 + 120000).toISOString()
    },
    {
      id: 'pay-seed-3',
      requestId: 'seed-req-2',
      renterName: 'Chioma Okonkwo',
      renterEmail: 'chioma@example.com',
      listingTitle: 'Modern Self-Contain near UI gate',
      amount: 0,
      reference: 'waiver_promo_100_user',
      status: 'success',
      channel: 'First-100 Waiver',
      createdAt: new Date(now - 86400000).toISOString(),
      paidAt: new Date(now - 86400000).toISOString()
    },
    {
      id: 'pay-seed-4',
      requestId: 'seed-req-4',
      renterName: 'Tunde Bakare',
      renterEmail: 'tunde@example.com',
      listingTitle: 'Executive Duplex, Oluyole Estate',
      amount: ACCESS_FEE_NAIRA,
      reference: 'pstk_live_33b82f9c11',
      status: 'refunded',
      channel: 'Paystack Card',
      createdAt: new Date(now - 86400000 * 5).toISOString(),
      paidAt: new Date(now - 86400000 * 5 + 60000).toISOString()
    }
  ];
}

export const localStore = {
  getUsers(): Record<string, User> {
    return read<Record<string, User>>(KEYS.users, {});
  },
  saveUsers(users: Record<string, User & { password?: string }>) {
    // Strip passwords before persisting to prevent plaintext leaks
    const sanitized: Record<string, User> = {};
    for (const [id, u] of Object.entries(users)) {
      const { password: _pw, ...cleanUser } = u as any;
      sanitized[id] = cleanUser;
    }
    write(KEYS.users, sanitized);
  },
  getSession(): User | null {
    return read<User | null>(KEYS.session, null);
  },
  setSession(user: User | null) {
    if (user) {
      const { password: _pw, ...cleanUser } = user as any;
      write(KEYS.session, cleanUser);
    } else {
      localStorage.removeItem(KEYS.session);
    }
  },
  getListingsRaw(): Listing[] {
    return read<Listing[]>(KEYS.listings, []);
  },
  saveListings(listings: Listing[]) {
    write(KEYS.listings, listings);
  },
  getPrivateAddress(listingId: string): string {
    const map = read<Record<string, string>>(KEYS.private, {});
    return map[listingId] || '';
  },
  setPrivateAddress(listingId: string, address: string) {
    const map = read<Record<string, string>>(KEYS.private, {});
    map[listingId] = address;
    write(KEYS.private, map);
  },
  publicListings(filters?: FilterOptions): Listing[] {
    let listings = this.getListingsRaw()
      .filter((l) => l.isApproved !== false && (l.moderationStatus ? l.moderationStatus === 'active' : l.isAvailable))
      .map(publicListing);

    if (!filters) return listings;
    if (filters.category && filters.category !== 'all') listings = listings.filter((l) => l.category === filters.category);
    if (filters.city && filters.city !== 'All Cities') {
      listings = listings.filter((l) => (l.city || 'Ibadan').toLowerCase() === filters.city?.toLowerCase());
    }
    if (filters.type && filters.type !== 'All Types') listings = listings.filter((l) => l.type === filters.type);
    if (filters.area && filters.area !== 'All Ibadan areas') {
      listings = listings.filter((l) => l.area.toLowerCase() === filters.area?.toLowerCase());
    }
    if (filters.minPrice !== undefined) listings = listings.filter((l) => l.price >= filters.minPrice!);
    if (filters.maxPrice !== undefined) listings = listings.filter((l) => l.price <= filters.maxPrice!);
    if (filters.verifiedOnly) listings = listings.filter((l) => l.verificationStatus === 'verified');
    if (filters.bedrooms !== undefined && filters.bedrooms > 0) {
      listings = listings.filter((l) => (l.bedrooms || 0) >= filters.bedrooms!);
    }
    if (filters.searchQuery?.trim()) {
      const q = filters.searchQuery.toLowerCase().trim();
      listings = listings.filter(
        (l) =>
          l.title.toLowerCase().includes(q) ||
          l.area.toLowerCase().includes(q) ||
          l.description.toLowerCase().includes(q)
      );
    }
    if (filters.sortBy === 'price_asc') listings.sort((a, b) => a.price - b.price);
    else if (filters.sortBy === 'price_desc') listings.sort((a, b) => b.price - a.price);
    else listings.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return listings;
  },
  getRequests(): AccessRequest[] {
    const existing = read<AccessRequest[] | null>(KEYS.requests, null);
    if (existing && existing.length > 0) return existing;
    const seeded = seedRequests();
    write(KEYS.requests, seeded);
    return seeded;
  },
  saveRequests(requests: AccessRequest[]) {
    write(KEYS.requests, requests);
  },
  getPayments(): LocalPayment[] {
    const existing = read<LocalPayment[] | null>(KEYS.payments, null);
    if (existing && existing.length > 0) return existing;
    const seeded = seedPayments();
    write(KEYS.payments, seeded);
    return seeded;
  },
  savePayments(payments: LocalPayment[]) {
    write(KEYS.payments, payments);
  },
  getFavorites(userId?: string): string[] {
    const all = read<Record<string, string[]>>(KEYS.favorites, {});
    if (userId) return all[userId] || [];
    return read<string[]>(`${PREFIX}guest_favorites`, []);
  },
  saveFavorites(ids: string[], userId?: string) {
    if (userId) {
      const all = read<Record<string, string[]>>(KEYS.favorites, {});
      all[userId] = ids;
      write(KEYS.favorites, all);
    } else {
      write(`${PREFIX}guest_favorites`, ids);
    }
  },
  getReports(): ReportItem[] {
    return read(KEYS.reports, [] as ReportItem[]);
  },
  saveReports(reports: ReportItem[]) {
    write(KEYS.reports, reports);
  },
  getCities(): CityLocation[] {
    const existing = read<CityLocation[] | null>(KEYS.cities, null);
    if (existing?.length) return existing;
    const seeded = seedCities();
    write(KEYS.cities, seeded);
    return seeded;
  },
  saveCities(cities: CityLocation[]) {
    write(KEYS.cities, cities);
  },
  getVerifications(): LocalVerification[] {
    return read(KEYS.verifications, [] as LocalVerification[]);
  },
  saveVerifications(items: LocalVerification[]) {
    write(KEYS.verifications, items);
  },
  saveToken(token: string, requestId: string, expiresAt: string) {
    const tokens = read<Record<string, { requestId: string; expiresAt: string }>>(KEYS.tokens, {});
    tokens[token] = { requestId, expiresAt };
    write(KEYS.tokens, tokens);
  },
  lookupToken(token: string): { requestId: string; expiresAt: string } | null {
    const tokens = read<Record<string, { requestId: string; expiresAt: string }>>(KEYS.tokens, {});
    return tokens[token] || null;
  },
  getInspectionTokens(): Record<string, FieldInspectionRecord> {
    return read<Record<string, FieldInspectionRecord>>(KEYS.inspectionTokens, {});
  },
  saveInspectionTokens(tokens: Record<string, FieldInspectionRecord>) {
    const lightTokens: Record<string, FieldInspectionRecord> = {};
    for (const [k, tok] of Object.entries(tokens || {})) {
      if (tok.dossier) {
        // Strip heavy photos from token clone to avoid duplicating photos across storage keys
        lightTokens[k] = {
          ...tok,
          dossier: {
            ...tok.dossier,
            photoEvidence: {}
          }
        };
      } else {
        lightTokens[k] = tok;
      }
    }
    write(KEYS.inspectionTokens, lightTokens);
  },
  getInspectionDossiers(): Record<string, FieldInspectionDossier> {
    return read<Record<string, FieldInspectionDossier>>(KEYS.inspectionDossiers, {});
  },
  saveInspectionDossiers(dossiers: Record<string, FieldInspectionDossier>) {
    const pruned = pruneDossiersForStorage(dossiers);
    write(KEYS.inspectionDossiers, pruned);
  },
  getPromoCount(): number {
    return Number(localStorage.getItem(KEYS.promo) || '0');
  },
  incrementPromo(): number {
    const next = this.getPromoCount() + 1;
    if (next > PROMO_CAP) throw new Error('Promotion waiver pool has reached the 100-user limit.');
    localStorage.setItem(KEYS.promo, String(next));
    return next;
  },
  createId(prefix: string) {
    return `${prefix}-${crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`}`;
  },
  slugify,
  getAdminInvitations(): AdminInvitation[] {
    return read<AdminInvitation[]>(KEYS.adminInvitations, []);
  },
  saveAdminInvitation(inv: AdminInvitation) {
    const list = this.getAdminInvitations();
    const existingIdx = list.findIndex(i => i.id === inv.id);
    if (existingIdx >= 0) {
      list[existingIdx] = inv;
    } else {
      list.unshift(inv);
    }
    write(KEYS.adminInvitations, list);
  },
  updateAdminInvitation(id: string, updates: Partial<AdminInvitation>): AdminInvitation | null {
    const list = this.getAdminInvitations();
    const idx = list.findIndex(i => i.id === id);
    if (idx < 0) return null;
    list[idx] = { ...list[idx], ...updates, updatedAt: new Date().toISOString() };
    write(KEYS.adminInvitations, list);
    return list[idx];
  },
  getAdminInvitationByToken(token: string): AdminInvitation | null {
    const list = this.getAdminInvitations();
    return list.find(i => i.token === token) || null;
  }
};

export interface LocalPayment {
  id: string;
  requestId: string;
  renterName: string;
  renterEmail: string;
  listingTitle: string;
  amount: number;
  reference: string;
  status: 'pending' | 'success' | 'failed' | 'refunded';
  channel?: string;
  createdAt: string;
  paidAt?: string;
}

export interface LocalVerification {
  id: string;
  listingId: string;
  requestedBy: string;
  status: VerificationStatus | 'scheduled' | 'progress' | 'changes' | 'changes_requested' | 'rejected' | 'completed';
  scheduledDate?: string;
  preferredTime?: string;
  onSiteContactName?: string;
  onSiteContactPhone?: string;
  inspector?: string;
  checklist?: Listing['inspection'];
  auditorNotes?: string;
  requestedChangesNotes?: string;
  rejectionReason?: string;
  updatedAt?: string;
  createdAt: string;
}

export function roleFromSignup(role: UserRole): UserRole {
  if (role === 'admin') return 'tenant';
  return role;
}
