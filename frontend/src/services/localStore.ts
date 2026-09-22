import { Listing, AccessRequest, User, CityLocation, ReportItem, FilterOptions, UserRole, RequestAccessStatus, VerificationStatus } from '../types';
import { INITIAL_LISTINGS } from '../data/mockData';
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
  promo: `${PREFIX}promo_count`
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

function write(key: string, value: unknown) {
  localStorage.setItem(key, JSON.stringify(value));
}

function publicListing(listing: Listing): Listing {
  return {
    ...listing,
    lister: maskListerContact(listing.lister)
  };
}

function seedCities(): CityLocation[] {
  return [
    {
      id: 'city-ibadan',
      name: 'Ibadan',
      state: 'Oyo State',
      isActive: true,
      isPilot: true,
      areas: [
        'Bodija', 'Akobo', 'Jericho', 'Ring Road', 'UI / Samonda', 'UI area', 'Agodi',
        'Agodi GRA', 'Oluyole', 'Oluyole Estate', 'Samonda', 'Challenge', 'Dugbe',
        'Iwo Road', 'Ikolaba', 'Eleyele', 'Moniya', 'Apata', 'Ologuneru'
      ]
    },
    {
      id: 'city-lagos',
      name: 'Lagos',
      state: 'Lagos State',
      isActive: false,
      isPilot: false,
      areas: ['Lekki Phase 1', 'Victoria Island', 'Ikoyi', 'Ikeja GRA', 'Yaba', 'Surulere']
    },
    {
      id: 'city-abeokuta',
      name: 'Abeokuta',
      state: 'Ogun State',
      isActive: false,
      isPilot: false,
      areas: ['Ibara GRA', 'Oke-Mosan', 'Kuto']
    }
  ];
}

function seedListings(): Listing[] {
  return INITIAL_LISTINGS.map((listing) => ({
    ...listing,
    isApproved: true,
    moderationStatus: 'active' as const,
    lister: maskListerContact(listing.lister)
  }));
}

function seedPrivateAddresses(): Record<string, string> {
  const map: Record<string, string> = {};
  INITIAL_LISTINGS.forEach((listing) => {
    map[listing.id] = listing.addressDescription;
  });
  return map;
}

function seedLocalAccounts(): Record<string, User & { password?: string }> {
  const users = read<Record<string, User & { password?: string }>>(KEYS.users, {});
  let changed = false;
  if (!users['usr-ops']) {
    users['usr-ops'] = {
      id: 'usr-ops',
      name: 'Rentivo Operations',
      email: 'ops@rentivo.ng',
      phone: '08000000001',
      role: 'admin',
      favorites: [],
      createdAt: new Date().toISOString(),
      password: 'RentivoOps1'
    };
    changed = true;
  }
  if (!users['usr-lister']) {
    users['usr-lister'] = {
      id: 'usr-lister',
      name: 'Kemi Balogun',
      email: 'lister@rentivo.ng',
      phone: '08031112222',
      role: 'landlord',
      favorites: [],
      createdAt: new Date().toISOString(),
      password: 'RentivoLister1'
    };
    changed = true;
  }
  if (changed) write(KEYS.users, users);
  return users;
}

export const localStore = {
  getUsers(): Record<string, User & { password?: string }> {
    return seedLocalAccounts();
  },
  saveUsers(users: Record<string, User & { password?: string }>) {
    write(KEYS.users, users);
  },
  getSession(): User | null {
    return read<User | null>(KEYS.session, null);
  },
  setSession(user: User | null) {
    if (user) write(KEYS.session, user);
    else localStorage.removeItem(KEYS.session);
  },
  getListingsRaw(): Listing[] {
    const existing = read<Listing[] | null>(KEYS.listings, null);
    if (existing && existing.length) return existing;
    const seeded = seedListings();
    write(KEYS.listings, seeded);
    write(KEYS.private, seedPrivateAddresses());
    return seeded;
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
    return read(KEYS.requests, [] as AccessRequest[]);
  },
  saveRequests(requests: AccessRequest[]) {
    write(KEYS.requests, requests);
  },
  getPayments(): LocalPayment[] {
    return read(KEYS.payments, [] as LocalPayment[]);
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
  slugify
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
  status: VerificationStatus | 'scheduled' | 'progress';
  scheduledDate?: string;
  preferredTime?: string;
  onSiteContactName?: string;
  onSiteContactPhone?: string;
  inspector?: string;
  checklist?: Listing['inspection'];
  createdAt: string;
}

export function roleFromSignup(role: UserRole): UserRole {
  if (role === 'admin') return 'tenant';
  return role;
}
