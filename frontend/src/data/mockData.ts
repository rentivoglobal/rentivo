import { Listing } from '../types';

export const IBADAN_AREAS = [
  'All Ibadan areas',
  'Bodija',
  'Akobo',
  'Jericho',
  'Ring Road',
  'UI area',
  'Agodi',
  'Iwo Road'
] as const;

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

export interface MarketplaceListing extends Listing {
  rating?: number;
  isNew?: boolean;
}

export const INITIAL_LISTINGS: MarketplaceListing[] = [
  {
    id: "prop-1",
    title: "2-Bedroom Self-Contain",
    category: "residential",
    type: "Self-Contain",
    city: "Ibadan",
    area: "Bodija",
    addressDescription: "Bodija, Ibadan",
    price: 850000,
    pricePeriod: "per_year",
    bedrooms: 2,
    bathrooms: 1,
    areaSqm: 55,
    rating: 4.9,
    amenities: ["Prepaid Meter", "Borehole Water", "Fenced & Gated", "Tiled Bathroom"],
    description: "Tidy, well-ventilated 2-bedroom self-contain located in serene Bodija, Ibadan. Modern bathroom, separate pre-paid meter, and reliable water supply.",
    photos: [
      "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=800&q=80"
    ],
    verificationStatus: "verified",
    inspection: {
      physicalVisitCompleted: true,
      addressMatchesTitle: true,
      listerMandateVerified: true,
      photosAuthentic: true,
      inspectionDate: "Checked 8 Sep 2026",
      inspectorNotes: "Visited · address checked · verified by Rentivo inspector"
    },
    lister: {
      fullName: "Adeola Balogun",
      phone: "+234 803 452 8819",
      whatsapp: "+234 803 452 8819",
      agencyName: "Bodija Homes",
      avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=160&q=80",
      memberSince: "May 2025",
      activeListingsCount: 4,
      responseRate: "98%"
    },
    accessRequestsCount: 3,
    createdAt: "2026-09-08T08:00:00Z",
    isAvailable: true
  },
  {
    id: "prop-2",
    title: "Shop Space, Ring Road Complex",
    category: "commercial",
    type: "Shop",
    city: "Ibadan",
    area: "Ring Road",
    addressDescription: "Ring Road Commercial Complex, Ring Road, Ibadan",
    price: 450000,
    pricePeriod: "per_year",
    bedrooms: 0,
    bathrooms: 1,
    areaSqm: 22, // 240 sq ft
    rating: 4.8,
    amenities: ["High Foot Traffic", "Glass Showroom Frontage", "Prepaid Commercial Meter", "Paved Parking"],
    description: "240 sq ft prime retail commercial shop space facing the main Ring Road commercial corridor with high foot traffic.",
    photos: [
      "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=800&q=80"
    ],
    verificationStatus: "verified",
    inspection: {
      physicalVisitCompleted: true,
      addressMatchesTitle: true,
      listerMandateVerified: true,
      photosAuthentic: true,
      inspectionDate: "Inspection done",
      inspectorNotes: "Inspection done · location checked"
    },
    lister: {
      fullName: "Adeola Balogun",
      phone: "+234 809 112 4490",
      whatsapp: "+234 809 112 4490",
      agencyName: "Ring Road Commercial",
      avatarUrl: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=160&q=80",
      memberSince: "Feb 2026",
      activeListingsCount: 4,
      responseRate: "96%"
    },
    accessRequestsCount: 1,
    createdAt: "2026-09-07T16:45:00Z",
    isAvailable: true
  },
  {
    id: "prop-3",
    title: "3-Bedroom Duplex",
    category: "residential",
    type: "Duplex",
    city: "Ibadan",
    area: "UI Area (Agbowo)",
    addressDescription: "UI Area (Agbowo), Ibadan",
    price: 1800000,
    pricePeriod: "per_year",
    bedrooms: 3,
    bathrooms: 3,
    areaSqm: 180,
    rating: 4.7,
    amenities: ["Gated Compound", "All Ensuite", "Borehole Water"],
    description: "", // Intentionally empty to trigger "Add a description" warning
    photos: [
      "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=800&q=80"
    ],
    verificationStatus: "unverified",
    inspection: {
      physicalVisitCompleted: false,
      addressMatchesTitle: false,
      listerMandateVerified: false,
      photosAuthentic: false,
      inspectionDate: "Not verified",
      inspectorNotes: "Awaiting physical inspection"
    },
    lister: {
      fullName: "Adeola Balogun",
      phone: "+234 802 771 9042",
      whatsapp: "+234 802 771 9042",
      agencyName: "Agbowo Properties",
      avatarUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=160&q=80",
      memberSince: "Nov 2025",
      activeListingsCount: 4,
      responseRate: "94%"
    },
    accessRequestsCount: 2,
    createdAt: "2026-09-06T14:15:00Z",
    isAvailable: true
  },
  {
    id: "prop-4",
    title: "Office Suite, Dugbe",
    category: "commercial",
    type: "Office",
    city: "Ibadan",
    area: "Dugbe",
    addressDescription: "Dugbe CBD, Ibadan",
    price: 600000,
    pricePeriod: "per_year",
    bedrooms: 0,
    bathrooms: 1,
    areaSqm: 75,
    commercialSpecs: {
      floorLevel: "3 rooms + reception"
    },
    rating: 4.9,
    amenities: ["3 rooms + reception", "Generator Connection", "Central Business District"],
    description: "Commercial office suite situated in the commercial core of Dugbe. Features 3 separate executive rooms plus a welcoming front reception area.",
    photos: [
      "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=800&q=80"
    ],
    verificationStatus: "verified",
    inspection: {
      physicalVisitCompleted: true,
      addressMatchesTitle: true,
      listerMandateVerified: true,
      photosAuthentic: true,
      inspectionDate: "Checked 4 Sep 2026",
      inspectorNotes: "Verified commercial property"
    },
    lister: {
      fullName: "Adeola Balogun",
      phone: "+234 805 600 2311",
      whatsapp: "+234 805 600 2311",
      agencyName: "Dugbe Corporate",
      avatarUrl: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=160&q=80",
      memberSince: "Oct 2025",
      activeListingsCount: 4,
      responseRate: "100%"
    },
    accessRequestsCount: 5,
    createdAt: "2026-09-04T10:00:00Z",
    isAvailable: false // Rented!
  }
];
