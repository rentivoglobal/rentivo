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
    title: "Tidy self-contain near Bodija market",
    category: "residential",
    type: "Self-Contain",
    city: "Ibadan",
    area: "Bodija",
    addressDescription: "Near Bodija market & housing estate, Bodija, Ibadan",
    price: 450000,
    pricePeriod: "per_year",
    bedrooms: 1,
    bathrooms: 1,
    areaSqm: 36,
    rating: 4.8,
    amenities: ["Prepaid Meter", "Borehole Water", "Fenced & Gated", "Tiled Bathroom"],
    description: "Tidy, well-ventilated single-room self-contain close to Bodija market and transport links. Secure fenced compound, constant water supply, and personal meter.",
    photos: [
      "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=800&q=80"
    ],
    verificationStatus: "verified",
    inspection: {
      physicalVisitCompleted: true,
      addressMatchesTitle: true,
      listerMandateVerified: true,
      photosAuthentic: true,
      inspectionDate: "Checked 8 Sep 2026",
      inspectorNotes: "Visited · address checked · lister identity reviewed"
    },
    lister: {
      fullName: "Tolu Adekunle",
      phone: "+234 803 452 8819",
      whatsapp: "+234 803 452 8819",
      agencyName: "Independent lister",
      avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=160&q=80",
      memberSince: "May 2025",
      activeListingsCount: 3,
      responseRate: "98%"
    },
    createdAt: "2026-09-08T08:00:00Z",
    isAvailable: true
  },
  {
    id: "prop-2",
    title: "2-bedroom flat, off General Gas",
    category: "residential",
    type: "Flat",
    city: "Ibadan",
    area: "Akobo",
    addressDescription: "Off General Gas Road, Akobo, Ibadan",
    price: 850000,
    pricePeriod: "per_year",
    bedrooms: 2,
    bathrooms: 2,
    areaSqm: 95,
    rating: 4.7,
    amenities: ["All Rooms Ensuite", "Ample Car Park", "Interlocked Compound", "Security Guard"],
    description: "Spacious two-bedroom flat with both rooms ensuite, modern kitchen cabinets, prepaid meter, and 24/7 security guard.",
    photos: [
      "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=800&q=80"
    ],
    verificationStatus: "verified",
    inspection: {
      physicalVisitCompleted: true,
      addressMatchesTitle: true,
      listerMandateVerified: true,
      photosAuthentic: true,
      inspectionDate: "Checked 8 Sep 2026",
      inspectorNotes: "Visited · address checked · photos reviewed"
    },
    lister: {
      fullName: "Adeola Balogun",
      phone: "+234 812 390 1145",
      whatsapp: "+234 812 390 1145",
      agencyName: "Akobo Premier Homes",
      avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=160&q=80",
      memberSince: "January 2026",
      activeListingsCount: 5,
      responseRate: "94%"
    },
    createdAt: "2026-09-08T11:30:00Z",
    isAvailable: true
  },
  {
    id: "prop-3",
    title: "Prime shop space, expressway facing",
    category: "commercial",
    type: "Shop",
    city: "Ibadan",
    area: "Ring Road",
    addressDescription: "Directly facing Ring Road Expressway, Ibadan",
    price: 1200000,
    pricePeriod: "per_year",
    bedrooms: 0,
    bathrooms: 1,
    areaSqm: 48,
    rating: 4.9,
    amenities: ["High Foot Traffic", "Glass Showroom Frontage", "Prepaid Commercial Meter", "Paved Parking Plaza"],
    description: "High-visibility retail shop on prime commercial stretch of Ring Road. Front glass display, tiled floors, dedicated meter.",
    photos: [
      "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80"
    ],
    verificationStatus: "verified",
    inspection: {
      physicalVisitCompleted: true,
      addressMatchesTitle: true,
      listerMandateVerified: true,
      photosAuthentic: true,
      inspectionDate: "Checked 4 Sep 2026",
      inspectorNotes: "Visited · location checked · mandate reviewed"
    },
    lister: {
      fullName: "Ifeoma Okeke",
      phone: "+234 809 112 4490",
      whatsapp: "+234 809 112 4490",
      agencyName: "Ring Road Agency",
      avatarUrl: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=160&q=80",
      memberSince: "Feb 2026",
      activeListingsCount: 4,
      responseRate: "96%"
    },
    createdAt: "2026-09-04T16:45:00Z",
    isAvailable: true
  },
  {
    id: "prop-4",
    title: "Modern 4-bedroom duplex + BQ",
    category: "residential",
    type: "Duplex",
    city: "Ibadan",
    area: "Bodija",
    addressDescription: "Old Bodija, Ibadan",
    price: 4200000,
    pricePeriod: "per_year",
    bedrooms: 4,
    bathrooms: 4,
    areaSqm: 320,
    rating: 5.0,
    amenities: ["Private Compound", "Self-contained BQ", "Inverter Wiring Ready", "Fitted Kitchen with Heat Extractor"],
    description: "Stand-alone modern duplex in serene Old Bodija. All rooms ensuite, stamped concrete compound, borehole, electric fence, and servant quarters.",
    photos: [
      "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80"
    ],
    verificationStatus: "verified",
    inspection: {
      physicalVisitCompleted: true,
      addressMatchesTitle: true,
      listerMandateVerified: true,
      photosAuthentic: true,
      inspectionDate: "Checked 6 Sep 2026",
      inspectorNotes: "Visited · photos reviewed · availability confirmed"
    },
    lister: {
      fullName: "Samuel Adeyemi",
      phone: "+234 802 771 9042",
      whatsapp: "+234 802 771 9042",
      agencyName: "Bodija Luxury Homes",
      avatarUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=160&q=80",
      memberSince: "Nov 2025",
      activeListingsCount: 8,
      responseRate: "100%"
    },
    createdAt: "2026-09-06T14:15:00Z",
    isAvailable: true
  },
  {
    id: "prop-5",
    title: "Serviced 3-room corporate office",
    category: "commercial",
    type: "Office",
    city: "Ibadan",
    area: "Agodi",
    addressDescription: "Agodi GRA, near State Secretariat, Ibadan",
    price: 2800000,
    pricePeriod: "per_year",
    bedrooms: 0,
    bathrooms: 2,
    areaSqm: 110,
    rating: 4.6,
    amenities: ["Central Generator Backup", "Reception Lobby", "Conference Room Ready", "Dedicated Parking"],
    description: "Quiet corporate office floor in Agodi GRA. Three partitioned rooms, reception area, dedicated transformer, and ample parking.",
    photos: [
      "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=800&q=80"
    ],
    verificationStatus: "verified",
    inspection: {
      physicalVisitCompleted: true,
      addressMatchesTitle: true,
      listerMandateVerified: true,
      photosAuthentic: true,
      inspectionDate: "Checked 11 Sep 2026",
      inspectorNotes: "Visited · lister identity reviewed · last confirmed available"
    },
    lister: {
      fullName: "Hassan Bello",
      phone: "+234 805 600 2311",
      whatsapp: "+234 805 600 2311",
      agencyName: "Agodi Commercial Space",
      avatarUrl: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=160&q=80",
      memberSince: "Oct 2025",
      activeListingsCount: 2,
      responseRate: "92%"
    },
    createdAt: "2026-09-11T10:00:00Z",
    isAvailable: true
  },
  {
    id: "prop-6",
    title: "Neat self-contain studio, walk to UI",
    category: "residential",
    type: "Self-Contain",
    city: "Ibadan",
    area: "UI area",
    addressDescription: "UI area / Samonda, Ibadan",
    price: 380000,
    pricePeriod: "per_year",
    bedrooms: 1,
    bathrooms: 1,
    areaSqm: 32,
    rating: 4.5,
    amenities: ["Student Friendly", "Secured Gate", "Tiled Bathroom", "Pumping Machine Available"],
    description: "Ideal for postgraduate students and university staff. Fully tiled, running water, prepaid meter, gated compound with night security.",
    photos: [
      "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=800&q=80"
    ],
    verificationStatus: "verified",
    inspection: {
      physicalVisitCompleted: true,
      addressMatchesTitle: true,
      listerMandateVerified: true,
      photosAuthentic: true,
      inspectionDate: "Checked 10 Sep 2026",
      inspectorNotes: "Visited · address checked · photos reviewed"
    },
    lister: {
      fullName: "Adebayo Muritala",
      phone: "+234 813 900 8712",
      whatsapp: "+234 813 900 8712",
      agencyName: "Samonda Housing",
      avatarUrl: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=160&q=80",
      memberSince: "August 2026",
      activeListingsCount: 6,
      responseRate: "97%"
    },
    createdAt: "2026-09-10T12:00:00Z",
    isAvailable: true
  },
  {
    id: "prop-7",
    title: "Commercial storage warehouse",
    category: "commercial",
    type: "Warehouse",
    city: "Ibadan",
    area: "Iwo Road",
    addressDescription: "Near Interchange / Toll Gate, Iwo Road, Ibadan",
    price: 3400000,
    pricePeriod: "per_year",
    bedrooms: 0,
    bathrooms: 2,
    areaSqm: 320,
    rating: 4.3,
    amenities: ["Trailer Access", "High Clearance Ceiling", "Security Post", "Concrete Hardstand"],
    description: "Heavy-duty commercial storage facility just off Iwo Road interchange. High ceiling for container trucks, perimeter security, office space.",
    photos: [
      "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1587293852726-70cdb56c2866?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=800&q=80"
    ],
    verificationStatus: "verified",
    inspection: {
      physicalVisitCompleted: true,
      addressMatchesTitle: true,
      listerMandateVerified: true,
      photosAuthentic: true,
      inspectionDate: "Checked 8 Sep 2026",
      inspectorNotes: "Visited · logistics clearance audited"
    },
    lister: {
      fullName: "Chief Olumide Fashola",
      phone: "+234 803 890 0122",
      whatsapp: "+234 803 890 0122",
      agencyName: "Expressway Realty",
      avatarUrl: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=160&q=80",
      memberSince: "March 2026",
      activeListingsCount: 2,
      responseRate: "90%"
    },
    createdAt: "2026-09-08T15:00:00Z",
    isAvailable: true
  },
  {
    id: "prop-8",
    title: "Fenced residential plot, corner piece",
    category: "residential",
    type: "Land",
    city: "Ibadan",
    area: "UI area",
    addressDescription: "UI area / Samonda, Ibadan",
    price: 8500000,
    pricePeriod: "per_sale",
    bedrooms: 0,
    bathrooms: 0,
    areaSqm: 648,
    rating: 4.2,
    isNew: true,
    amenities: ["Corner Piece", "Fenced & Gated", "Dry Land", "Registered Survey"],
    description: "Standard 648 sqm residential corner-piece plot in a fully built-up street in UI area. Dry land, perimeter fence with gate, survey and deed available.",
    photos: [
      "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80"
    ],
    verificationStatus: "verified",
    inspection: {
      physicalVisitCompleted: true,
      addressMatchesTitle: true,
      listerMandateVerified: true,
      photosAuthentic: true,
      inspectionDate: "Checked 12 Sep 2026",
      inspectorNotes: "Survey coordinates checked on site · owner mandate confirmed"
    },
    lister: {
      fullName: "Kemi Balogun",
      phone: "+234 802 331 4455",
      whatsapp: "+234 802 331 4455",
      agencyName: "Premier Lands & Lets",
      avatarUrl: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=160&q=80",
      memberSince: "Nov 2025",
      activeListingsCount: 3,
      responseRate: "100%"
    },
    createdAt: "2026-09-12T09:30:00Z",
    isAvailable: true
  }
];
