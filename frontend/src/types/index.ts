/**
 * Rentivo Type Definitions
 * Shared types for marketplace listings, auth, verification, and access requests.
 */

export type PropertyCategory = 'residential' | 'commercial';

export type PropertyType = 
  | 'Self-Contain'
  | 'Flat'
  | 'Duplex'
  | 'Bungalow'
  | 'Shop'
  | 'Office'
  | 'Warehouse'
  | 'Land';

export type UserRole = 
  | 'tenant'
  | 'business_renter'
  | 'landlord'
  | 'agent'
  | 'admin';

export type VerificationStatus = 'verified' | 'pending' | 'unverified' | 'rejected';

export type RequestAccessStatus = 
  | 'submitted'
  | 'availability_pending'
  | 'confirmed'
  | 'payment_pending'
  | 'paid'
  | 'unavailable'
  | 'manual_escalation';

export interface InspectionChecklist {
  physicalVisitCompleted: boolean;
  addressMatchesTitle: boolean;
  listerMandateVerified: boolean;
  photosAuthentic: boolean;
  inspectionDate: string;
  inspectorNotes?: string;
}

export interface ListerContact {
  fullName: string;
  phone: string;
  whatsapp: string;
  agencyName?: string;
  avatarUrl?: string;
  memberSince: string;
  activeListingsCount: number;
  responseRate: string;
  exactAddress?: string;
}

export interface Listing {
  id: string;
  title: string;
  category: PropertyCategory;
  type: PropertyType;
  city: string; // "Ibadan"
  area: string; // "Bodija", "Akobo", etc.
  addressDescription: string;
  price: number; // in Naira (NGN)
  pricePeriod: 'per_year' | 'per_month' | 'per_sale';
  bedrooms?: number;
  bathrooms?: number;
  areaSqm?: number;
  rating?: number;
  amenities: string[];
  description: string;
  photos: string[];
  verificationStatus: VerificationStatus;
  inspection?: InspectionChecklist;
  lister: ListerContact;
  listerRole?: 'landlord' | 'agent';
  underlyingLandlord?: {
    fullName: string;
    phone: string;
    email?: string;
    mandateConfirmed: boolean;
  };
  commercialSpecs?: {
    floorLevel?: string;
    usableAreaSqm?: number;
    restroomsCount?: number;
    frontageRoad?: string;
  };
  accessRequestsCount?: number;
  inquiriesCount?: number;
  verificationNote?: string;
  createdAt: string;
  isAvailable: boolean;
  isApproved?: boolean;
  moderationStatus?: 'pending_approval' | 'active' | 'rejected';
}

export interface AccessRequest {
  id: string;
  listingId: string;
  listingTitle: string;
  listingArea: string;
  listingPrice: number;
  listingPhoto: string;
  renterName: string;
  renterPhone: string;
  renterEmail: string;
  status: RequestAccessStatus;
  feeAmount: number; // 5000 NGN or 0 if waived
  isPromotionWaiverApplied: boolean;
  createdAt: string;
  updatedAt: string;
  unlockedListerContact?: ListerContact;
}

export interface FilterOptions {
  city?: string;
  category?: PropertyCategory | 'all';
  type?: PropertyType | 'All Types';
  area?: string;
  minPrice?: number;
  maxPrice?: number;
  bedrooms?: number;
  verifiedOnly?: boolean;
  searchQuery?: string;
  sortBy?: 'newest' | 'price_asc' | 'price_desc';
}

export type NavigationTab = 
  | 'home'
  | 'account'
  | 'search'
  | 'detail'
  | 'checkout'
  | 'requests'
  | 'favorites'
  | 'how_it_works'
  | 'list_property'
  | 'terms'
  | 'privacy'
  | 'access_fee_terms'
  | 'profile'
  | 'reset_password'
  | 'availability_action'
  | 'lister'
  | 'listing_editor'
  | 'admin'
  | 'auth';

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  agencyName?: string;
  avatarUrl?: string;
  isVerified?: boolean;
  favorites: string[]; // listing IDs
  createdAt?: string;
}

export interface CityLocation {
  id: string;
  name: string;
  state: string;
  isActive: boolean;
  isPilot: boolean;
  areas: string[];
}

export interface ReportItem {
  id: string;
  listingId: string;
  listingTitle: string;
  listingArea: string;
  listingPhoto: string;
  listerName: string;
  listerPhone: string;
  reason: 'Already Rented' | 'Price Changed' | 'Misleading Photos' | 'Suspected Fraud' | 'Other';
  details?: string;
  reporterEmail?: string;
  reporterName?: string;
  reportedAt: string;
  status: 'pending' | 'investigating' | 'resolved' | 'dismissed';
}

export interface MarketplaceListing extends Listing {
  isNew?: boolean;
}

export const PROPERTY_TYPES = [
  'All Types',
  'Self-Contain',
  'Flat',
  'Duplex',
  'Bungalow',
  'Shop',
  'Office',
  'Warehouse',
  'Land'
] as const;

export const IBADAN_AREAS = [
  'All Ibadan areas',
  'Bodija',
  'Akobo',
  'Jericho',
  'Ring Road',
  'UI area',
  'Agodi',
  'Iwo Road',
  'Dugbe',
  'Oluyole',
  'Samonda',
  'Challenge',
  'Ikolaba',
  'Eleyele',
  'Moniya',
  'Apata',
  'Ologuneru'
] as const;

export type RentalGoal = 'relocating' | 'upgrading' | 'work_proximity' | 'student' | 'family';
export type MoveInTimeline = 'immediate' | 'within_2_weeks' | 'this_month' | 'exploring';

export interface RenterProfile {
  id?: string;
  userId?: string;
  rentalGoal: RentalGoal | string;
  preferredAreas: string[];
  propertyTypes: string[];
  budgetMin: number;
  budgetMax: number;
  bedrooms?: number | null;
  moveInTimeline: MoveInTimeline | string;
  mustHaves: string[];
  onboardingCompleted: boolean;
  onboardingSkipped?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

