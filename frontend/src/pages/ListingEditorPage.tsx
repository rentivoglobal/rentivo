import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Building2,
  Home,
  ShieldCheck,
  CheckCircle2,
  Plus,
  Minus,
  ArrowRight,
  ArrowLeft,
  Check,
  X,
  Trash2,
  MapPin,
  Bed,
  Bath,
  Maximize2,
  Camera,
  AlertCircle,
  Clock,
  Sparkles,
  Zap,
  Car,
  Search,
  Lock,
  ChevronDown,
  Eye,
  FileText,
  DollarSign,
  CheckCheck
} from 'lucide-react';
import { Listing, PropertyCategory, PropertyType } from '../types';
import { PROPERTY_TYPES } from '../data/mockData';
import { formatNaira } from '../utils/formatters';
import { listingsService } from '../services/listingsService';
import { locationsService } from '../services/locationsService';
import { ImageKitUploader } from '../components/ImageKitUploader';
import { useAuth } from '../contexts/AuthContext';

interface ListingEditorPageProps {
  initialListing?: Listing | null;
  onSaveSuccess: (savedListing: Listing) => void;
  onCancel: () => void;
  onDelete?: (id: string) => void;
}

const SAMPLE_PHOTOS = [
  'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80'
];

const PRESET_SAMPLE_LIBRARY = [
  { label: 'Living Room', url: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=800&q=80' },
  { label: 'Modern Kitchen', url: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=800&q=80' },
  { label: 'Master Bedroom', url: 'https://images.unsplash.com/photo-1540518614846-7ede433c4b49?auto=format&fit=crop&w=800&q=80' },
  { label: 'En-suite Bath', url: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=800&q=80' },
  { label: 'Exterior Compound', url: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=800&q=80' }
];

const POPULAR_NEIGHBORHOODS = ['Bodija', 'Akobo', 'Jericho', 'Ring Road', 'Agodi GRA'];

interface AmenityCategory {
  id: string;
  label: string;
  icon: React.ElementType;
  items: string[];
}

const AMENITY_CATEGORIES: AmenityCategory[] = [
  {
    id: 'utilities',
    label: 'Utilities & Power',
    icon: Zap,
    items: [
      'Pre-paid Meter (CONLOG)',
      'Borehole & Constant Running Water',
      'Inverter / Solar Setup',
      'Generator House / Dedicated Gen Space',
      'Water Heater Installed',
      'Stable DisCo Feeder (Band A)'
    ]
  },
  {
    id: 'security',
    label: 'Security & Compound',
    icon: ShieldCheck,
    items: [
      'Fenced & Gated Compound',
      '24/7 Security Guard / Watchman',
      'Tarred Access Road',
      'CCTV Surveillance Installed',
      'Electric Perimeter Fence Wire'
    ]
  },
  {
    id: 'interior',
    label: 'Interior & Comfort',
    icon: Home,
    items: [
      'POP Ceiling & Modern Lighting',
      'Fitted Kitchen Cabinets',
      'En-suite Bathrooms',
      'Tiled Floors Throughout',
      'Built-in Wardrobes Installed'
    ]
  },
  {
    id: 'space',
    label: 'Space & Grounds',
    icon: Car,
    items: [
      'Dedicated Car Parking Space',
      'Private Balcony / Veranda',
      'Self Compound (Standalone)',
      'Pet Friendly'
    ]
  }
];

const ALL_PRESET_ITEMS = AMENITY_CATEGORIES.flatMap(c => c.items);

const ESSENTIAL_AMENITIES = [
  'Pre-paid Meter (CONLOG)',
  'Borehole & Constant Running Water',
  'Fenced & Gated Compound',
  'POP Ceiling & Modern Lighting',
  'Dedicated Car Parking Space'
];

const SUGGESTED_EXTRA_AMENITIES = [
  'Swimming Pool',
  'Air Conditioner Installed',
  'Kids Playground Area',
  'Study / Home Office',
  'Solar Streetlights',
  'Elevator / Lift Service',
  'Fire Extinguisher & Smoke Alarm',
  'Personal Water Overhead Tank'
];

export const ListingEditorPage: React.FC<ListingEditorPageProps> = ({
  initialListing,
  onSaveSuccess,
  onCancel,
  onDelete
}) => {
  const isEditMode = !!initialListing;
  const { user } = useAuth();

  // Form State initialized from initialListing or clean defaults
  const [title, setTitle] = useState(initialListing?.title || '');
  const [category, setCategory] = useState<PropertyCategory>(initialListing?.category || 'residential');
  const [type, setType] = useState<PropertyType>(initialListing?.type || 'Flat');
  const [city, setCity] = useState(initialListing?.city || 'Ibadan');
  const [area, setArea] = useState(initialListing?.area || 'Bodija');
  const [address, setAddress] = useState(initialListing?.addressDescription || '');
  const [price, setPrice] = useState(initialListing?.price ? initialListing.price.toString() : '850000');
  const [pricePeriod, setPricePeriod] = useState<'per_year' | 'per_month' | 'per_sale'>(
    initialListing?.pricePeriod || 'per_year'
  );
  const [bedrooms, setBedrooms] = useState<number>(initialListing?.bedrooms ?? 2);
  const [bathrooms, setBathrooms] = useState<number>(initialListing?.bathrooms ?? 2);
  const [areaSqm, setAreaSqm] = useState<number>(initialListing?.areaSqm ?? 85);
  const [description, setDescription] = useState(
    initialListing?.description ||
    'Serviced modern property with steady borehole water, personal prepaid meter, and secure gated compound.'
  );

  // Lister Mandate & Ownership Disclosure (PRD Section 3 & Persona 4)
  const [listerRole, setListerRole] = useState<'landlord' | 'agent'>(initialListing?.listerRole || 'landlord');
  const [underlyingLandlordName, setUnderlyingLandlordName] = useState(initialListing?.underlyingLandlord?.fullName || '');
  const [underlyingLandlordPhone, setUnderlyingLandlordPhone] = useState(initialListing?.underlyingLandlord?.phone || '');
  const [underlyingLandlordEmail, setUnderlyingLandlordEmail] = useState(initialListing?.underlyingLandlord?.email || '');
  const [mandateConfirmed, setMandateConfirmed] = useState(initialListing?.underlyingLandlord?.mandateConfirmed ?? true);

  // Commercial Space Layout Specs (FR-1.2)
  const [commercialFloorLevel, setCommercialFloorLevel] = useState(initialListing?.commercialSpecs?.floorLevel || 'Ground Floor');
  const [commercialUsableSqm, setCommercialUsableSqm] = useState<number>(initialListing?.commercialSpecs?.usableAreaSqm || 65);
  const [commercialRestrooms, setCommercialRestrooms] = useState<number>(initialListing?.commercialSpecs?.restroomsCount || 1);
  const [commercialFrontage, setCommercialFrontage] = useState(initialListing?.commercialSpecs?.frontageRoad || 'Expressway / Main Road');

  // Request Physical Inspection on Publish
  const [requestInspectionOnSave, setRequestInspectionOnSave] = useState(initialListing?.verificationStatus === 'pending');

  // Selected amenities
  const [amenities, setAmenities] = useState<string[]>(
    initialListing?.amenities && initialListing.amenities.length > 0
      ? initialListing.amenities
      : ['Pre-paid Meter (CONLOG)', 'Borehole & Constant Running Water', 'Fenced & Gated Compound']
  );

  // Custom amenities state
  const [customAmenities, setCustomAmenities] = useState<string[]>(() => {
    if (initialListing?.amenities) {
      return initialListing.amenities.filter(a => !ALL_PRESET_ITEMS.includes(a));
    }
    return [];
  });

  const [newCustomAmenityInput, setNewCustomAmenityInput] = useState('');
  const [amenitySearchFilter, setAmenitySearchFilter] = useState('');

  // Photos state (Enforcing Minimum 3 Photos - FR-1.3)
  const [photos, setPhotos] = useState<string[]>(initialListing?.photos || []);
  const [newPhotoInput, setNewPhotoInput] = useState('');

  // Availability & moderation
  const [isAvailable, setIsAvailable] = useState<boolean>(initialListing?.isAvailable ?? true);
  const [moderationStatus, setModerationStatus] = useState<'active' | 'pending_approval' | 'rejected'>(
    initialListing?.moderationStatus || 'pending_approval'
  );

  const [isSaving, setIsSaving] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // =========================================================================
  // CUSTOM FLOATING DROPDOWNS STATE & REFS
  // =========================================================================
  const [isTypeDropdownOpen, setIsTypeDropdownOpen] = useState(false);
  const [isAreaDropdownOpen, setIsAreaDropdownOpen] = useState(false);
  const [areaSearchInput, setAreaSearchInput] = useState('');

  const typeDropdownRef = useRef<HTMLDivElement>(null);
  const areaDropdownRef = useRef<HTMLDivElement>(null);

  // Location service integration (FR-1.2 & FR-7.6)
  const availableCities = useMemo(() => locationsService.getCities(), []);
  const cityAreas = useMemo(() => locationsService.getAreasForCity(city), [city]);

  // Click outside to dismiss dropdowns
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (typeDropdownRef.current && !typeDropdownRef.current.contains(e.target as Node)) {
        setIsTypeDropdownOpen(false);
      }
      if (areaDropdownRef.current && !areaDropdownRef.current.contains(e.target as Node)) {
        setIsAreaDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filtered Neighborhoods for Custom Dropdown
  const filteredNeighborhoods = useMemo(() => {
    if (!areaSearchInput.trim()) return cityAreas;
    return cityAreas.filter(n =>
      n.toLowerCase().includes(areaSearchInput.toLowerCase())
    );
  }, [areaSearchInput, cityAreas]);

  // Toggle amenity selection
  const handleToggleAmenity = (item: string) => {
    setAmenities(prev =>
      prev.includes(item) ? prev.filter(a => a !== item) : [...prev, item]
    );
  };

  // Quick Select Essentials
  const handleSelectEssentials = () => {
    setAmenities(prev => {
      const merged = new Set([...prev, ...ESSENTIAL_AMENITIES]);
      return Array.from(merged);
    });
  };

  // Deselect All Amenities
  const handleDeselectAllAmenities = () => {
    setAmenities([]);
  };

  // Add custom amenity
  const handleAddCustomAmenity = (textToAdd?: string) => {
    const raw = (textToAdd !== undefined ? textToAdd : newCustomAmenityInput).trim();
    if (!raw) return;

    if (!customAmenities.some(a => a.toLowerCase() === raw.toLowerCase()) &&
        !ALL_PRESET_ITEMS.some(a => a.toLowerCase() === raw.toLowerCase())) {
      setCustomAmenities(prev => [...prev, raw]);
    }

    if (!amenities.includes(raw)) {
      setAmenities(prev => [...prev, raw]);
    }

    setNewCustomAmenityInput('');
  };

  // Delete custom amenity
  const handleDeleteCustomAmenity = (item: string) => {
    setCustomAmenities(prev => prev.filter(a => a !== item));
    setAmenities(prev => prev.filter(a => a !== item));
  };

  // Add photo
  const handleAddPhoto = (urlToAdd?: string) => {
    const url = (urlToAdd || newPhotoInput).trim();
    if (url) {
      setPhotos(prev => [...prev, url]);
      if (!urlToAdd) setNewPhotoInput('');
    }
  };

  // Remove photo (Enforcing min 3 photos - FR-1.3)
  const handleRemovePhoto = (idx: number) => {
    if (photos.length <= 3) {
      setValidationError('Rentivo requires at least 3 photos per listing to maintain verified marketplace trust.');
      return;
    }
    setPhotos(prev => prev.filter((_, i) => i !== idx));
  };

  // Set primary cover photo
  const handleSetCoverPhoto = (idx: number) => {
    const chosen = photos[idx];
    const rest = photos.filter((_, i) => i !== idx);
    setPhotos([chosen, ...rest]);
  };

  // Smooth scroll helper for checklist items
  const scrollToSection = (sectionId: string) => {
    const el = document.getElementById(sectionId);
    if (el) {
      const yOffset = -90;
      const y = el.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  };

  // Listing completeness score calculation
  const completenessScore = useMemo(() => {
    let score = 20;
    if (title.trim().length >= 10) score += 15;
    if (address.trim().length >= 8) score += 15;
    if (Number(price) > 50000) score += 15;
    if (amenities.length >= 3) score += 15;
    if (photos.length >= 3) score += 20;
    return Math.min(score, 100);
  }, [title, address, price, amenities, photos]);

  // Form Submission
  const handleSubmit = async (publishImmediately: boolean = true) => {
    if (publishImmediately) {
      if (!title.trim()) {
        setValidationError('Enter a title for your property to continue (e.g. Clean 2-Bedroom Flat in Bodija).');
        scrollToSection('section-basic');
        return;
      }
      if (!price || Number(price) <= 0) {
        setValidationError('Enter the price in naira using numbers only. Example: 250000.');
        scrollToSection('section-pricing');
        return;
      }
      if (photos.length < 3) {
        setValidationError('Add at least 3 clear pictures before you send this property for review (outside, rooms, and kitchen).');
        scrollToSection('section-photos');
        return;
      }
      if (listerRole === 'agent' && (!underlyingLandlordName.trim() || !underlyingLandlordPhone.trim())) {
        setValidationError('Enter the property owner\'s name and Nigerian phone number to confirm your permission to list.');
        scrollToSection('section-mandate');
        return;
      }
    }

    setValidationError(null);
    setIsSaving(true);

    try {
      const underlyingLandlordData = listerRole === 'agent' ? {
        fullName: underlyingLandlordName.trim(),
        phone: underlyingLandlordPhone.trim(),
        email: underlyingLandlordEmail.trim() || undefined,
        mandateConfirmed
      } : undefined;

      const commercialSpecsData = category === 'commercial' ? {
        floorLevel: commercialFloorLevel,
        usableAreaSqm: commercialUsableSqm,
        restroomsCount: commercialRestrooms,
        frontageRoad: commercialFrontage
      } : undefined;

      if (isEditMode && initialListing) {
        const updated = await listingsService.updateListing(initialListing.id, {
          title: title.trim(),
          category,
          type,
          city,
          area,
          addressDescription: address.trim() || `${area}, ${city}`,
          price: Number(price),
          pricePeriod,
          bedrooms: category === 'residential' ? bedrooms : undefined,
          bathrooms: category === 'residential' ? bathrooms : undefined,
          areaSqm: category === 'commercial' ? commercialUsableSqm : areaSqm,
          amenities,
          description: description.trim(),
          photos,
          listerRole,
          underlyingLandlord: underlyingLandlordData,
          commercialSpecs: commercialSpecsData,
          verificationStatus: requestInspectionOnSave ? 'pending' : initialListing.verificationStatus,
          isAvailable,
          moderationStatus: publishImmediately ? 'active' : 'pending_approval'
        });

        if (updated) {
          onSaveSuccess(updated);
        }
      } else {
        const created = await listingsService.createListing({
          title: title.trim(),
          category,
          type,
          city,
          area,
          addressDescription: address.trim() || `${area}, ${city}`,
          price: Number(price),
          pricePeriod,
          bedrooms: category === 'residential' ? bedrooms : undefined,
          bathrooms: category === 'residential' ? bathrooms : undefined,
          areaSqm: category === 'commercial' ? commercialUsableSqm : areaSqm,
          amenities,
          description: description.trim(),
          photos,
          listerRole,
          underlyingLandlord: underlyingLandlordData,
          commercialSpecs: commercialSpecsData,
          verificationStatus: requestInspectionOnSave ? 'pending' : 'unverified',
          isAvailable,
          moderationStatus: 'pending_approval',
          lister: {
            fullName: user?.name || 'Rentivo Lister',
            phone: '',
            whatsapp: '',
            memberSince: new Date().toLocaleString('en-NG', { month: 'short', year: 'numeric' }),
            activeListingsCount: 1,
            responseRate: '—'
          }
        });

        onSaveSuccess(created);
      }
    } catch (err) {
      console.error(err);
      setValidationError('An error occurred while saving the listing. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = () => {
    if (isEditMode && initialListing && onDelete) {
      if (window.confirm(`Are you sure you want to permanently delete "${initialListing.title}"?`)) {
        onDelete(initialListing.id);
      }
    }
  };

  // Filter amenities by keyword search
  const filteredCategories = useMemo(() => {
    if (!amenitySearchFilter.trim()) return AMENITY_CATEGORIES;
    const query = amenitySearchFilter.toLowerCase();
    return AMENITY_CATEGORIES.map(cat => ({
      ...cat,
      items: cat.items.filter(item => item.toLowerCase().includes(query))
    })).filter(cat => cat.items.length > 0);
  }, [amenitySearchFilter]);

  const filteredCustomAmenities = useMemo(() => {
    if (!amenitySearchFilter.trim()) return customAmenities;
    const query = amenitySearchFilter.toLowerCase();
    return customAmenities.filter(item => item.toLowerCase().includes(query));
  }, [customAmenities, amenitySearchFilter]);

  return (
    <div style={{ backgroundColor: '#F8FAFC', minHeight: '100vh', color: '#1E293B', paddingBottom: '120px' }}>

      {/* -------------------------------------------------------------
          TOP EXECUTIVE STICKY ACTION HEADER
         ------------------------------------------------------------- */}
      <header style={{
        backgroundColor: '#FFFFFF',
        borderBottom: '1px solid #E2E8F0',
        position: 'sticky',
        top: 0,
        zIndex: 50,
        boxShadow: '0 1px 4px rgba(0, 0, 0, 0.04)'
      }}>
        <div style={{
          maxWidth: '1320px',
          margin: '0 auto',
          padding: '0 24px',
          height: '70px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px'
        }}>
          {/* Left: Navigation & Mode Indicators */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', minWidth: 0 }}>
            <button
              type="button"
              onClick={onCancel}
              style={{
                backgroundColor: '#F1F5F9',
                border: '1px solid #CBD5E1',
                color: '#000052',
                borderRadius: '8px',
                padding: '8px 14px',
                fontSize: '13px',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                flexShrink: 0
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#E2E8F0')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#F1F5F9')}
            >
              <ArrowLeft size={16} />
              <span>Back to My Properties</span>
            </button>

            <div style={{ borderLeft: '1px solid #E2E8F0', paddingLeft: '16px', minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                <span style={{
                  backgroundColor: isEditMode ? '#EFF6FF' : '#ECFDF5',
                  color: isEditMode ? '#1D4ED8' : '#065F46',
                  fontSize: '11px',
                  fontWeight: 800,
                  padding: '2px 8px',
                  borderRadius: '4px',
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase'
                }}>
                  {isEditMode ? 'Edit Mode' : 'New Listing'}
                </span>
                {isEditMode && initialListing && (
                  <span style={{
                    fontFamily: 'monospace',
                    fontSize: '11px',
                    fontWeight: 700,
                    color: '#64748B',
                    backgroundColor: '#F1F5F9',
                    padding: '2px 6px',
                    borderRadius: '4px'
                  }}>
                    REF-{initialListing.id.slice(-4).toUpperCase()}
                  </span>
                )}
                <span style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  color: completenessScore >= 80 ? '#16794A' : '#B45309',
                  backgroundColor: completenessScore >= 80 ? '#ECFDF5' : '#FEF3C7',
                  padding: '2px 8px',
                  borderRadius: '4px'
                }}>
                  {completenessScore}% Complete
                </span>
              </div>
              <h1 style={{
                fontSize: '17px',
                fontWeight: 800,
                color: '#000052',
                margin: 0,
                maxWidth: '520px',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}>
                {isEditMode ? `Editing: ${title || initialListing?.title || 'Property'}` : 'Put Your Property on Rentivo'}
              </h1>
            </div>
          </div>

          {/* Right: Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
            <button
              type="button"
              onClick={onCancel}
              style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #CBD5E1',
                borderRadius: '8px',
                padding: '9px 16px',
                fontSize: '13px',
                fontWeight: 700,
                color: '#475569',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F8FAFC')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#FFFFFF')}
            >
              Cancel
            </button>

            <button
              type="button"
              disabled={isSaving}
              onClick={() => handleSubmit(false)}
              style={{
                backgroundColor: '#FFFFFF',
                border: '1.5px solid #000052',
                borderRadius: '8px',
                padding: '9px 18px',
                fontSize: '13px',
                fontWeight: 700,
                color: '#000052',
                cursor: isSaving ? 'not-allowed' : 'pointer',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => {
                if (!isSaving) e.currentTarget.style.backgroundColor = '#EFF6FF';
              }}
              onMouseLeave={(e) => {
                if (!isSaving) e.currentTarget.style.backgroundColor = '#FFFFFF';
              }}
            >
              Save and exit
            </button>

            <button
              type="button"
              disabled={isSaving}
              onClick={() => handleSubmit(true)}
              style={{
                backgroundColor: '#000052',
                border: 'none',
                borderRadius: '8px',
                padding: '9px 24px',
                fontSize: '13px',
                fontWeight: 700,
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: isSaving ? 'not-allowed' : 'pointer',
                boxShadow: '0 2px 8px rgba(0, 0, 82, 0.25)',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => {
                if (!isSaving) e.currentTarget.style.backgroundColor = '#000075';
              }}
              onMouseLeave={(e) => {
                if (!isSaving) e.currentTarget.style.backgroundColor = '#000052';
              }}
            >
              {isSaving ? (
                <span>Sending...</span>
              ) : (
                <>
                  <span>{isEditMode ? 'Save Changes' : 'Send for Review'}</span>
                  <ArrowRight size={15} />
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* -------------------------------------------------------------
          MAIN 2-COLUMN VIEWPORT
         ------------------------------------------------------------- */}
      <main style={{
        maxWidth: '1320px',
        margin: '28px auto 0',
        padding: '0 24px',
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1fr) 380px',
        gap: '32px',
        alignItems: 'start'
      }}>

        {/* LEFT COLUMN: MULTI-STEP PROPERTY FORM */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

          {/* 5-Step Wizard Progress Guide (Audit P1 Recommendation) */}
          <div style={{
            backgroundColor: '#FFFFFF',
            border: '1.5px solid #E2E8F0',
            borderRadius: '14px',
            padding: '16px 20px',
            boxShadow: '0 2px 8px rgba(0,0,82,0.03)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '13.5px', fontWeight: 800, color: '#000052' }}>
                  5-Step Property Listing
                </span>
                <span style={{ fontSize: '11px', color: '#5B14B8', fontWeight: 800, backgroundColor: '#EDE5FC', padding: '2px 8px', borderRadius: '999px' }}>
                  Mobile-First Flow
                </span>
              </div>
              <span style={{ fontSize: '12px', color: '#64748B' }}>
                You can save your work and come back anytime.
              </span>
            </div>

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, padding: '5px 12px', borderRadius: '8px', backgroundColor: '#F1F5F9', color: '#000052' }}>
                1. Location
              </span>
              <span style={{ fontSize: '12px', fontWeight: 700, padding: '5px 12px', borderRadius: '8px', backgroundColor: '#F1F5F9', color: '#000052' }}>
                2. Property details
              </span>
              <span style={{ fontSize: '12px', fontWeight: 700, padding: '5px 12px', borderRadius: '8px', backgroundColor: '#F1F5F9', color: '#000052' }}>
                3. Pictures
              </span>
              <span style={{ fontSize: '12px', fontWeight: 700, padding: '5px 12px', borderRadius: '8px', backgroundColor: '#F1F5F9', color: '#000052' }}>
                4. Price &amp; contact
              </span>
              <span style={{ fontSize: '12px', fontWeight: 700, padding: '5px 12px', borderRadius: '8px', backgroundColor: '#F1F5F9', color: '#000052' }}>
                5. Check &amp; send
              </span>
            </div>
          </div>

          {/* Validation Error Alert */}
          {validationError && (
            <div style={{
              backgroundColor: '#FEF2F2',
              border: '1.5px solid #FCA5A5',
              borderRadius: '10px',
              padding: '14px 18px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              color: '#991B1B',
              fontSize: '13px',
              fontWeight: 600
            }}>
              <AlertCircle size={18} color="#DC2626" style={{ flexShrink: 0 }} />
              <div style={{ flex: 1 }}>{validationError}</div>
              <button
                type="button"
                onClick={() => setValidationError(null)}
                style={{ background: 'none', border: 'none', color: '#991B1B', cursor: 'pointer', padding: '2px' }}
              >
                <X size={16} />
              </button>
            </div>
          )}

          {/* =========================================================
              SECTION 1: BASIC INFORMATION & CLASSIFICATION
             ========================================================= */}
          <section id="section-basic" style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '12px',
            border: '1px solid #E2E8F0',
            padding: '26px 28px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                backgroundColor: '#000052',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '14px',
                fontWeight: 800
              }}>
                1
              </div>
              <div>
                <h2 style={{ fontSize: '17px', fontWeight: 800, color: '#000052', margin: 0 }}>
                  Basic Information & Classification
                </h2>
                <p style={{ fontSize: '12px', color: '#64748B', margin: '2px 0 0' }}>
                  Define the unit title, real estate category, and structural layout.
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Lister Mandate & Ownership Capacity (PRD Section 3 & Persona 4) */}
              <div id="section-mandate" style={{
                backgroundColor: '#F8FAFC',
                borderRadius: '10px',
                border: '1.5px solid #E2E8F0',
                padding: '16px 18px',
                marginBottom: '4px'
              }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 800, color: '#000052', marginBottom: '8px' }}>
                  Lister Mandate &amp; Ownership Capacity <span style={{ color: '#DC2626' }}>*</span>
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: listerRole === 'agent' ? '14px' : '0' }}>
                  <button
                    type="button"
                    onClick={() => setListerRole('landlord')}
                    style={{
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: listerRole === 'landlord' ? '2px solid #000052' : '1.5px solid #CBD5E1',
                      backgroundColor: listerRole === 'landlord' ? '#EFF6FF' : '#FFFFFF',
                      color: listerRole === 'landlord' ? '#000052' : '#64748B',
                      fontSize: '13px',
                      fontWeight: 700,
                      textAlign: 'left',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}
                  >
                    <span>Direct Landlord / Title Owner</span>
                    {listerRole === 'landlord' && <Check size={14} color="#000052" strokeWidth={2.5} />}
                  </button>
                  <button
                    type="button"
                    onClick={() => setListerRole('agent')}
                    style={{
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: listerRole === 'agent' ? '2px solid #000052' : '1.5px solid #CBD5E1',
                      backgroundColor: listerRole === 'agent' ? '#EFF6FF' : '#FFFFFF',
                      color: listerRole === 'agent' ? '#000052' : '#64748B',
                      fontSize: '13px',
                      fontWeight: 700,
                      textAlign: 'left',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}
                  >
                    <span>Managing Agent / Caretaker</span>
                    {listerRole === 'agent' && <Check size={14} color="#000052" strokeWidth={2.5} />}
                  </button>
                </div>

                {listerRole === 'agent' && (
                  <div style={{
                    backgroundColor: '#FFFFFF',
                    border: '1.5px solid #BFDBFE',
                    borderRadius: '8px',
                    padding: '14px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px'
                  }}>
                    <div style={{ fontSize: '12px', color: '#1E40AF', fontWeight: 800 }}>
                      Title Owner Disclosure (Required to build verified landlord registry &amp; verify mandate)
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                          Landlord / Property Owner Full Name <span style={{ color: '#DC2626' }}>*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={underlyingLandlordName}
                          onChange={(e) => setUnderlyingLandlordName(e.target.value)}
                          placeholder="e.g. Chief Samuel Adeyemi"
                          style={{ width: '100%', height: '38px', borderRadius: '6px', border: '1px solid #CBD5E1', padding: '0 10px', fontSize: '13px', boxSizing: 'border-box' }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                          Landlord Contact Phone Number <span style={{ color: '#DC2626' }}>*</span>
                        </label>
                        <input
                          type="tel"
                          required
                          value={underlyingLandlordPhone}
                          onChange={(e) => setUnderlyingLandlordPhone(e.target.value)}
                          placeholder="0803 123 4567"
                          style={{ width: '100%', height: '38px', borderRadius: '6px', border: '1px solid #CBD5E1', padding: '0 10px', fontSize: '13px', boxSizing: 'border-box' }}
                        />
                      </div>
                    </div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#475569', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={mandateConfirmed}
                        onChange={(e) => setMandateConfirmed(e.target.checked)}
                        style={{ accentColor: '#000052' }}
                      />
                      <span>I have direct verbal or written authority from the landlord to market this listing on Rentivo.</span>
                    </label>
                  </div>
                )}
              </div>

              {/* Property Title */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 700, color: '#1E293B' }}>
                    Property Title <span style={{ color: '#DC2626' }}>*</span>
                  </label>
                  <span style={{ fontSize: '11px', color: title.length < 15 ? '#94A3B8' : '#16794A', fontWeight: 600 }}>
                    {title.length} characters (15–70 recommended)
                  </span>
                </div>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Newly Built 2-Bedroom Flat with Prepaid Meter, Off General Gas"
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: '8px',
                    border: '1.5px solid #CBD5E1',
                    fontSize: '14px',
                    fontWeight: 600,
                    boxSizing: 'border-box',
                    color: '#000052',
                    outline: 'none',
                    transition: 'border-color 0.15s ease, box-shadow 0.15s ease'
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#000052';
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(0, 0, 82, 0.08)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = '#CBD5E1';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                />
                <span style={{ fontSize: '11px', color: '#64748B', marginTop: '4px', display: 'block' }}>
                  Specific titles with bedroom count and landmark generate 3.4x more verified renter views.
                </span>
              </div>

              {/* Category & Unit Type (WITH CUSTOM DROPDOWN BUTTON) */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                {/* Category Segmented Toggle */}
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#1E293B', marginBottom: '6px' }}>
                    Property Category
                  </label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => setCategory('residential')}
                      style={{
                        flex: 1,
                        height: '44px',
                        padding: '0 14px',
                        borderRadius: '8px',
                        border: category === 'residential' ? '2px solid #000052' : '1.5px solid #E2E8F0',
                        backgroundColor: category === 'residential' ? '#EFF6FF' : '#FFFFFF',
                        color: category === 'residential' ? '#000052' : '#64748B',
                        fontWeight: 700,
                        fontSize: '13px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        boxShadow: category === 'residential' ? '0 2px 6px rgba(0, 0, 82, 0.08)' : 'none'
                      }}
                    >
                      <Home size={16} color={category === 'residential' ? '#000052' : '#64748B'} />
                      <span>Residential</span>
                      {category === 'residential' && (
                        <div style={{
                          width: '16px',
                          height: '16px',
                          borderRadius: '50%',
                          backgroundColor: '#000052',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginLeft: 'auto'
                        }}>
                          <Check size={10} color="#FFFFFF" strokeWidth={3} />
                        </div>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => setCategory('commercial')}
                      style={{
                        flex: 1,
                        height: '44px',
                        padding: '0 14px',
                        borderRadius: '8px',
                        border: category === 'commercial' ? '2px solid #000052' : '1.5px solid #E2E8F0',
                        backgroundColor: category === 'commercial' ? '#EFF6FF' : '#FFFFFF',
                        color: category === 'commercial' ? '#000052' : '#64748B',
                        fontWeight: 700,
                        fontSize: '13px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        boxShadow: category === 'commercial' ? '0 2px 6px rgba(0, 0, 82, 0.08)' : 'none'
                      }}
                    >
                      <Building2 size={16} color={category === 'commercial' ? '#000052' : '#64748B'} />
                      <span>Commercial</span>
                      {category === 'commercial' && (
                        <div style={{
                          width: '16px',
                          height: '16px',
                          borderRadius: '50%',
                          backgroundColor: '#000052',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginLeft: 'auto'
                        }}>
                          <Check size={10} color="#FFFFFF" strokeWidth={3} />
                        </div>
                      )}
                    </button>
                  </div>
                </div>

                {/* Property Unit Type Custom Dropdown Button */}
                <div ref={typeDropdownRef} style={{ position: 'relative' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#1E293B', marginBottom: '6px' }}>
                    Property Unit Type
                  </label>

                  {/* Bespoke Dropdown Trigger Button */}
                  <button
                    type="button"
                    onClick={() => setIsTypeDropdownOpen(!isTypeDropdownOpen)}
                    style={{
                      width: '100%',
                      height: '44px',
                      padding: '0 14px',
                      borderRadius: '8px',
                      border: isTypeDropdownOpen ? '1.5px solid #000052' : '1.5px solid #CBD5E1',
                      backgroundColor: '#FFFFFF',
                      fontSize: '14px',
                      fontWeight: 600,
                      color: '#000052',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      boxSizing: 'border-box',
                      boxShadow: isTypeDropdownOpen ? '0 0 0 3px rgba(0, 0, 82, 0.08)' : 'none',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Building2 size={16} color="#000052" />
                      <span>{type}</span>
                    </div>
                    <ChevronDown
                      size={15}
                      color="#64748B"
                      style={{
                        transform: isTypeDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                        transition: 'transform 0.15s ease'
                      }}
                    />
                  </button>

                  {/* Floating Popover Menu */}
                  {isTypeDropdownOpen && (
                    <div style={{
                      position: 'absolute',
                      top: 'calc(100% + 6px)',
                      left: 0,
                      right: 0,
                      backgroundColor: '#FFFFFF',
                      borderRadius: '10px',
                      border: '1px solid #E2E8F0',
                      boxShadow: '0 12px 30px rgba(0, 0, 82, 0.12), 0 4px 8px rgba(0, 0, 82, 0.04)',
                      padding: '6px',
                      zIndex: 100,
                      maxHeight: '260px',
                      overflowY: 'auto'
                    }}>
                      <div style={{ padding: '6px 10px 4px', fontSize: '10px', fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        Select Unit Structure
                      </div>
                      {PROPERTY_TYPES.filter(t => t !== 'All Types').map(item => {
                        const isSelected = type === item;
                        return (
                          <button
                            key={item}
                            type="button"
                            onClick={() => {
                              setType(item);
                              setIsTypeDropdownOpen(false);
                            }}
                            style={{
                              width: '100%',
                              padding: '9px 12px',
                              borderRadius: '6px',
                              border: 'none',
                              backgroundColor: isSelected ? '#EFF6FF' : 'transparent',
                              color: isSelected ? '#000052' : '#334155',
                              fontSize: '13px',
                              fontWeight: isSelected ? 700 : 500,
                              textAlign: 'left',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              transition: 'background-color 0.1s ease'
                            }}
                            onMouseEnter={(e) => {
                              if (!isSelected) e.currentTarget.style.backgroundColor = '#F8FAFC';
                            }}
                            onMouseLeave={(e) => {
                              if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
                            }}
                          >
                            <span>{item}</span>
                            {isSelected && <Check size={14} color="#000052" strokeWidth={2.5} />}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Property Overview Description */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 700, color: '#1E293B' }}>
                    Detailed Property Overview
                  </label>
                  <span style={{ fontSize: '11px', color: '#64748B' }}>
                    {description.length} chars
                  </span>
                </div>
                <textarea
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Detail the layout, compound security, water schedule, road access, and tenant preferences (e.g. working professionals, small families)."
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: '8px',
                    border: '1.5px solid #CBD5E1',
                    fontSize: '13px',
                    lineHeight: 1.6,
                    boxSizing: 'border-box',
                    color: '#1E293B',
                    outline: 'none',
                    transition: 'border-color 0.15s ease, box-shadow 0.15s ease'
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#000052';
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(0, 0, 82, 0.08)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = '#CBD5E1';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                />
              </div>
            </div>
          </section>

          {/* =========================================================
              SECTION 2: LOCATION & IBADAN NEIGHBORHOOD (CUSTOM DROPDOWN)
             ========================================================= */}
          <section id="section-location" style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '12px',
            border: '1px solid #E2E8F0',
            padding: '26px 28px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                backgroundColor: '#000052',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '14px',
                fontWeight: 800
              }}>
                2
              </div>
              <div>
                <h2 style={{ fontSize: '17px', fontWeight: 800, color: '#000052', margin: 0 }}>
                  Location & Ibadan Neighborhood
                </h2>
                <p style={{ fontSize: '12px', color: '#64748B', margin: '2px 0 0' }}>
                  Pinpoint your property across Ibadan's premier residential and business hubs.
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#1E293B', marginBottom: '6px' }}>
                    City / Target Market <span style={{ color: '#DC2626' }}>*</span>
                  </label>
                  <select
                    value={city}
                    onChange={(e) => {
                      const newCity = e.target.value;
                      setCity(newCity);
                      const cityAreasList = locationsService.getAreasForCity(newCity);
                      setArea(cityAreasList[0] || '');
                    }}
                    style={{
                      width: '100%',
                      height: '44px',
                      padding: '0 12px',
                      borderRadius: '8px',
                      border: '1.5px solid #CBD5E1',
                      backgroundColor: '#FFFFFF',
                      color: '#000052',
                      fontSize: '14px',
                      fontWeight: 700,
                      outline: 'none',
                      cursor: 'pointer',
                      boxSizing: 'border-box'
                    }}
                  >
                    {availableCities.map(c => (
                      <option key={c.id} value={c.name}>
                        {c.name} ({c.state}) {c.isPilot ? '· Pilot' : !c.isActive ? '· Coming Phase 2' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Neighborhood Custom Dropdown Button */}
                <div ref={areaDropdownRef} style={{ position: 'relative' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#1E293B', marginBottom: '6px' }}>
                    {city} Neighborhood / Area <span style={{ color: '#DC2626' }}>*</span>
                  </label>

                  {/* Trigger Button */}
                  <button
                    type="button"
                    onClick={() => setIsAreaDropdownOpen(!isAreaDropdownOpen)}
                    style={{
                      width: '100%',
                      height: '44px',
                      padding: '0 14px',
                      borderRadius: '8px',
                      border: isAreaDropdownOpen ? '1.5px solid #000052' : '1.5px solid #CBD5E1',
                      backgroundColor: '#FFFFFF',
                      fontSize: '14px',
                      fontWeight: 600,
                      color: '#000052',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      boxSizing: 'border-box',
                      boxShadow: isAreaDropdownOpen ? '0 0 0 3px rgba(0, 0, 82, 0.08)' : 'none',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <MapPin size={16} color="#16794A" />
                      <span>{area}, {city}</span>
                    </div>
                    <ChevronDown
                      size={15}
                      color="#64748B"
                      style={{
                        transform: isAreaDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                        transition: 'transform 0.15s ease'
                      }}
                    />
                  </button>

                  {/* Floating Popover with Search & Quick Chips */}
                  {isAreaDropdownOpen && (
                    <div style={{
                      position: 'absolute',
                      top: 'calc(100% + 6px)',
                      left: 0,
                      right: 0,
                      backgroundColor: '#FFFFFF',
                      borderRadius: '10px',
                      border: '1px solid #E2E8F0',
                      boxShadow: '0 12px 30px rgba(0, 0, 82, 0.12), 0 4px 8px rgba(0, 0, 82, 0.04)',
                      padding: '10px',
                      zIndex: 100
                    }}>
                      {/* Search Input inside Popover */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px 10px',
                        backgroundColor: '#F8FAFC',
                        borderRadius: '6px',
                        border: '1px solid #CBD5E1',
                        marginBottom: '8px'
                      }}>
                        <Search size={14} color="#64748B" />
                        <input
                          type="text"
                          value={areaSearchInput}
                          onChange={(e) => setAreaSearchInput(e.target.value)}
                          placeholder="Search neighborhood..."
                          style={{
                            border: 'none',
                            backgroundColor: 'transparent',
                            fontSize: '13px',
                            color: '#1E293B',
                            outline: 'none',
                            width: '100%'
                          }}
                          autoFocus
                        />
                        {areaSearchInput && (
                          <button
                            type="button"
                            onClick={() => setAreaSearchInput('')}
                            style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: 0 }}
                          >
                            <X size={13} />
                          </button>
                        )}
                      </div>

                      {/* Popular Quick Chips */}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '8px', paddingBottom: '6px', borderBottom: '1px solid #F1F5F9' }}>
                        {POPULAR_NEIGHBORHOODS.map(pop => (
                          <button
                            key={pop}
                            type="button"
                            onClick={() => {
                              setArea(pop);
                              setIsAreaDropdownOpen(false);
                            }}
                            style={{
                              backgroundColor: area === pop ? '#000052' : '#F1F5F9',
                              color: area === pop ? '#FFFFFF' : '#475569',
                              border: 'none',
                              borderRadius: '4px',
                              padding: '3px 8px',
                              fontSize: '11px',
                              fontWeight: 600,
                              cursor: 'pointer'
                            }}
                          >
                            {pop}
                          </button>
                        ))}
                      </div>

                      {/* Scrollable List */}
                      <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                        {filteredNeighborhoods.map(item => {
                          const isSelected = area === item;
                          return (
                            <button
                              key={item}
                              type="button"
                              onClick={() => {
                                setArea(item);
                                setIsAreaDropdownOpen(false);
                              }}
                              style={{
                                width: '100%',
                                padding: '8px 10px',
                                borderRadius: '6px',
                                border: 'none',
                                backgroundColor: isSelected ? '#EFF6FF' : 'transparent',
                                color: isSelected ? '#000052' : '#334155',
                                fontSize: '13px',
                                fontWeight: isSelected ? 700 : 500,
                                textAlign: 'left',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                transition: 'background-color 0.1s ease'
                              }}
                              onMouseEnter={(e) => {
                                if (!isSelected) e.currentTarget.style.backgroundColor = '#F8FAFC';
                              }}
                              onMouseLeave={(e) => {
                                if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <MapPin size={13} color={isSelected ? '#16794A' : '#94A3B8'} />
                                <span>{item}</span>
                              </div>
                              {isSelected && <Check size={14} color="#000052" strokeWidth={2.5} />}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#1E293B', marginBottom: '6px' }}>
                  Street Address & Prominent Landmarks
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="e.g. Near Housing Estate Gate, Off Old Bodija Road, Ibadan"
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: '8px',
                    border: '1.5px solid #CBD5E1',
                    fontSize: '14px',
                    boxSizing: 'border-box',
                    color: '#1E293B',
                    outline: 'none',
                    transition: 'border-color 0.15s ease, box-shadow 0.15s ease'
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#000052';
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(0, 0, 82, 0.08)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = '#CBD5E1';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                />
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  marginTop: '6px',
                  fontSize: '12px',
                  color: '#64748B'
                }}>
                  <ShieldCheck size={14} color="#16794A" />
                  <span>Exact street details remain shielded and are only shared with paid, verified applicants.</span>
                </div>
              </div>
            </div>
          </section>

          {/* =========================================================
              SECTION 3: PRICING & LEASE FINANCIALS (SEGMENTED BUTTONS)
             ========================================================= */}
          <section id="section-pricing" style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '12px',
            border: '1px solid #E2E8F0',
            padding: '26px 28px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                backgroundColor: '#000052',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '14px',
                fontWeight: 800
              }}>
                3
              </div>
              <div>
                <h2 style={{ fontSize: '17px', fontWeight: 800, color: '#000052', margin: 0 }}>
                  Pricing & Lease Financials
                </h2>
                <p style={{ fontSize: '12px', color: '#64748B', margin: '2px 0 0' }}>
                  Set transparent pricing with 0% landlord commission and guaranteed direct payouts.
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: '20px', alignItems: 'start' }}>
                {/* Price Input */}
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#1E293B', marginBottom: '6px' }}>
                    Rent Amount in Naira (NGN) <span style={{ color: '#DC2626' }}>*</span>
                  </label>
                  <div style={{ position: 'relative' }}>
                    <span style={{
                      position: 'absolute',
                      left: '14px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      fontWeight: 800,
                      color: '#000052',
                      fontSize: '18px'
                    }}>
                      ₦
                    </span>
                    <input
                      type="number"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      placeholder="850000"
                      style={{
                        width: '100%',
                        height: '44px',
                        padding: '0 14px 0 36px',
                        borderRadius: '8px',
                        border: '1.5px solid #CBD5E1',
                        fontSize: '17px',
                        fontWeight: 800,
                        color: '#000052',
                        boxSizing: 'border-box',
                        outline: 'none',
                        transition: 'border-color 0.15s ease, box-shadow 0.15s ease'
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = '#000052';
                        e.currentTarget.style.boxShadow = '0 0 0 3px rgba(0, 0, 82, 0.08)';
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = '#CBD5E1';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                    />
                  </div>
                  <span style={{ fontSize: '12px', color: '#16794A', fontWeight: 700, marginTop: '6px', display: 'block' }}>
                    Renters see: {formatNaira(Number(price) || 0)} {pricePeriod === 'per_year' ? '/year' : pricePeriod === 'per_month' ? '/month' : 'outright purchase'}
                  </span>
                </div>

                {/* Billing Cycle Segmented Button Pills */}
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#1E293B', marginBottom: '6px' }}>
                    Billing Cycle
                  </label>
                  <div style={{
                    display: 'flex',
                    backgroundColor: '#F1F5F9',
                    borderRadius: '8px',
                    padding: '3px',
                    height: '44px',
                    boxSizing: 'border-box'
                  }}>
                    {(['per_year', 'per_month', 'per_sale'] as const).map(period => {
                      const isSelected = pricePeriod === period;
                      const label = period === 'per_year' ? 'Per Year' : period === 'per_month' ? 'Per Month' : 'Sale';
                      return (
                        <button
                          key={period}
                          type="button"
                          onClick={() => setPricePeriod(period)}
                          style={{
                            flex: 1,
                            borderRadius: '6px',
                            border: 'none',
                            backgroundColor: isSelected ? '#000052' : 'transparent',
                            color: isSelected ? '#FFFFFF' : '#475569',
                            fontWeight: 700,
                            fontSize: '12px',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '4px'
                          }}
                        >
                          {isSelected && <Check size={12} color="#FFFFFF" strokeWidth={3} />}
                          <span>{label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Commission-Free Guarantee Banner */}
              <div style={{
                backgroundColor: '#EFF6FF',
                border: '1px solid #BFDBFE',
                borderRadius: '10px',
                padding: '16px 20px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '14px'
              }}>
                <ShieldCheck size={22} color="#1D4ED8" style={{ marginTop: '2px', flexShrink: 0 }} />
                <div style={{ fontSize: '13px', color: '#1E40AF', lineHeight: 1.5 }}>
                  <strong style={{ color: '#000052', display: 'block', marginBottom: '2px' }}>
                    Zero Landlord Agency Commission:
                  </strong>
                  Rentivo never deducts commission from your rental earnings. You retain 100% of the rent collected. Seekers pay an independent ₦5,000 access fee directly to Rentivo to unlock contact and schedule on-site viewings.
                </div>
              </div>
            </div>
          </section>

          {/* =========================================================
              SECTION 4: SPECIFICATIONS & VERIFIED AMENITIES (CHECKED BUTTON STATES)
             ========================================================= */}
          <section id="section-amenities" style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '12px',
            border: '1.5px solid #E2E8F0',
            padding: '26px 28px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  backgroundColor: '#000052',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '14px',
                  fontWeight: 800
                }}>
                  4
                </div>
                <div>
                  <h2 style={{ fontSize: '17px', fontWeight: 800, color: '#000052', margin: 0 }}>
                    Specifications & Verified Amenities
                  </h2>
                  <p style={{ fontSize: '12px', color: '#64748B', margin: '2px 0 0' }}>
                    Check applicable features and add custom amenities with tactile state feedback.
                  </p>
                </div>
              </div>

              {/* Quick Action Helpers */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  type="button"
                  onClick={handleSelectEssentials}
                  style={{
                    backgroundColor: '#F1F5F9',
                    border: '1px solid #CBD5E1',
                    borderRadius: '6px',
                    padding: '5px 10px',
                    fontSize: '11px',
                    fontWeight: 700,
                    color: '#000052',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#E2E8F0')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#F1F5F9')}
                >
                  <CheckCheck size={13} />
                  <span>Select Essentials</span>
                </button>

                {amenities.length > 0 && (
                  <button
                    type="button"
                    onClick={handleDeselectAllAmenities}
                    style={{
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #CBD5E1',
                      borderRadius: '6px',
                      padding: '5px 10px',
                      fontSize: '11px',
                      fontWeight: 600,
                      color: '#64748B',
                      cursor: 'pointer'
                    }}
                  >
                    Clear All
                  </button>
                )}

                <div style={{
                  backgroundColor: '#ECFDF5',
                  border: '1px solid #A7F3D0',
                  borderRadius: '20px',
                  padding: '4px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '12px',
                  fontWeight: 700,
                  color: '#065F46'
                }}>
                  <Check size={14} color="#16794A" />
                  <span>{amenities.length} Selected</span>
                </div>
              </div>
            </div>

            {/* Layout Metric Steppers / Commercial Specifications (FR-1.2) */}
            {category === 'residential' ? (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '16px',
                padding: '16px',
                backgroundColor: '#F8FAFC',
                borderRadius: '10px',
                border: '1px solid #E2E8F0',
                marginBottom: '24px'
              }}>
                {/* Bedrooms */}
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
                    Bedrooms
                  </label>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    backgroundColor: '#FFFFFF',
                    border: '1.5px solid #CBD5E1',
                    borderRadius: '8px',
                    overflow: 'hidden'
                  }}>
                    <button
                      type="button"
                      onClick={() => setBedrooms(prev => Math.max(0, prev - 1))}
                      style={{
                        width: '40px',
                        height: '42px',
                        border: 'none',
                        backgroundColor: '#F1F5F9',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#475569',
                        transition: 'background-color 0.15s ease'
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#E2E8F0')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#F1F5F9')}
                    >
                      <Minus size={14} />
                    </button>
                    <input
                      type="number"
                      min="0"
                      max="15"
                      value={bedrooms}
                      onChange={(e) => setBedrooms(Math.max(0, parseInt(e.target.value) || 0))}
                      style={{
                        width: '100%',
                        textAlign: 'center',
                        border: 'none',
                        fontSize: '15px',
                        fontWeight: 800,
                        color: '#000052',
                        outline: 'none'
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setBedrooms(prev => prev + 1)}
                      style={{
                        width: '40px',
                        height: '42px',
                        border: 'none',
                        backgroundColor: '#F1F5F9',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#475569',
                        transition: 'background-color 0.15s ease'
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#E2E8F0')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#F1F5F9')}
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>

                {/* Bathrooms */}
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
                    Bathrooms
                  </label>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    backgroundColor: '#FFFFFF',
                    border: '1.5px solid #CBD5E1',
                    borderRadius: '8px',
                    overflow: 'hidden'
                  }}>
                    <button
                      type="button"
                      onClick={() => setBathrooms(prev => Math.max(1, prev - 1))}
                      style={{
                        width: '40px',
                        height: '42px',
                        border: 'none',
                        backgroundColor: '#F1F5F9',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#475569',
                        transition: 'background-color 0.15s ease'
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#E2E8F0')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#F1F5F9')}
                    >
                      <Minus size={14} />
                    </button>
                    <input
                      type="number"
                      min="1"
                      max="15"
                      value={bathrooms}
                      onChange={(e) => setBathrooms(Math.max(1, parseInt(e.target.value) || 1))}
                      style={{
                        width: '100%',
                        textAlign: 'center',
                        border: 'none',
                        fontSize: '15px',
                        fontWeight: 800,
                        color: '#000052',
                        outline: 'none'
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setBathrooms(prev => prev + 1)}
                      style={{
                        width: '40px',
                        height: '42px',
                        border: 'none',
                        backgroundColor: '#F1F5F9',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#475569',
                        transition: 'background-color 0.15s ease'
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#E2E8F0')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#F1F5F9')}
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>

                {/* Area Sqm */}
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
                    Floor Area (sqm)
                  </label>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    backgroundColor: '#FFFFFF',
                    border: '1.5px solid #CBD5E1',
                    borderRadius: '8px',
                    overflow: 'hidden'
                  }}>
                    <button
                      type="button"
                      onClick={() => setAreaSqm(prev => Math.max(10, prev - 5))}
                      style={{
                        width: '40px',
                        height: '42px',
                        border: 'none',
                        backgroundColor: '#F1F5F9',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#475569',
                        transition: 'background-color 0.15s ease'
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#E2E8F0')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#F1F5F9')}
                    >
                      <Minus size={14} />
                    </button>
                    <input
                      type="number"
                      min="10"
                      step="5"
                      value={areaSqm}
                      onChange={(e) => setAreaSqm(Math.max(10, parseInt(e.target.value) || 10))}
                      style={{
                        width: '100%',
                        textAlign: 'center',
                        border: 'none',
                        fontSize: '15px',
                        fontWeight: 800,
                        color: '#000052',
                        outline: 'none'
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setAreaSqm(prev => prev + 5)}
                      style={{
                        width: '40px',
                        height: '42px',
                        border: 'none',
                        backgroundColor: '#F1F5F9',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#475569',
                        transition: 'background-color 0.15s ease'
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#E2E8F0')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#F1F5F9')}
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* Commercial Layout Specifications (FR-1.2: Floor level, usable area sqm, restrooms, road frontage) */
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: '16px',
                padding: '18px',
                backgroundColor: '#F0FDF4',
                borderRadius: '10px',
                border: '1.5px solid #BBF7D0',
                marginBottom: '24px'
              }}>
                {/* Floor Level */}
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#166534', marginBottom: '6px' }}>
                    Floor Level
                  </label>
                  <select
                    value={commercialFloorLevel}
                    onChange={(e) => setCommercialFloorLevel(e.target.value)}
                    style={{
                      width: '100%',
                      height: '42px',
                      padding: '0 12px',
                      borderRadius: '8px',
                      border: '1.5px solid #86EFAC',
                      backgroundColor: '#FFFFFF',
                      fontSize: '13px',
                      fontWeight: 700,
                      color: '#000052',
                      outline: 'none'
                    }}
                  >
                    <option value="Ground Floor">Ground Floor (Street Level)</option>
                    <option value="Mezzanine">Mezzanine Level</option>
                    <option value="1st Floor">1st Floor</option>
                    <option value="2nd Floor">2nd Floor</option>
                    <option value="3rd Floor+">3rd Floor or Higher</option>
                    <option value="Penthouse / Rooftop">Penthouse / Rooftop</option>
                    <option value="Entire Standalone Building">Entire Standalone Building</option>
                    <option value="Basement">Basement</option>
                  </select>
                </div>

                {/* Usable Area sqm */}
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#166534', marginBottom: '6px' }}>
                    Usable Commercial Area (sqm)
                  </label>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    backgroundColor: '#FFFFFF',
                    border: '1.5px solid #86EFAC',
                    borderRadius: '8px',
                    overflow: 'hidden'
                  }}>
                    <button
                      type="button"
                      onClick={() => setCommercialUsableSqm(prev => Math.max(10, prev - 10))}
                      style={{
                        width: '40px',
                        height: '42px',
                        border: 'none',
                        backgroundColor: '#DCFCE7',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#166534'
                      }}
                    >
                      <Minus size={14} />
                    </button>
                    <input
                      type="number"
                      min="10"
                      step="5"
                      value={commercialUsableSqm}
                      onChange={(e) => setCommercialUsableSqm(Math.max(10, parseInt(e.target.value) || 10))}
                      style={{
                        width: '100%',
                        textAlign: 'center',
                        border: 'none',
                        fontSize: '15px',
                        fontWeight: 800,
                        color: '#000052',
                        outline: 'none'
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setCommercialUsableSqm(prev => prev + 10)}
                      style={{
                        width: '40px',
                        height: '42px',
                        border: 'none',
                        backgroundColor: '#DCFCE7',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#166534'
                      }}
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>

                {/* Dedicated Restrooms */}
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#166534', marginBottom: '6px' }}>
                    Restrooms / Washrooms
                  </label>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    backgroundColor: '#FFFFFF',
                    border: '1.5px solid #86EFAC',
                    borderRadius: '8px',
                    overflow: 'hidden'
                  }}>
                    <button
                      type="button"
                      onClick={() => setCommercialRestrooms(prev => Math.max(0, prev - 1))}
                      style={{
                        width: '40px',
                        height: '42px',
                        border: 'none',
                        backgroundColor: '#DCFCE7',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#166534'
                      }}
                    >
                      <Minus size={14} />
                    </button>
                    <input
                      type="number"
                      min="0"
                      max="20"
                      value={commercialRestrooms}
                      onChange={(e) => setCommercialRestrooms(Math.max(0, parseInt(e.target.value) || 0))}
                      style={{
                        width: '100%',
                        textAlign: 'center',
                        border: 'none',
                        fontSize: '15px',
                        fontWeight: 800,
                        color: '#000052',
                        outline: 'none'
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setCommercialRestrooms(prev => prev + 1)}
                      style={{
                        width: '40px',
                        height: '42px',
                        border: 'none',
                        backgroundColor: '#DCFCE7',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#166534'
                      }}
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>

                {/* Road Frontage / Commercial Visibility */}
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#166534', marginBottom: '6px' }}>
                    Road Frontage &amp; Access
                  </label>
                  <select
                    value={commercialFrontage}
                    onChange={(e) => setCommercialFrontage(e.target.value)}
                    style={{
                      width: '100%',
                      height: '42px',
                      padding: '0 12px',
                      borderRadius: '8px',
                      border: '1.5px solid #86EFAC',
                      backgroundColor: '#FFFFFF',
                      fontSize: '13px',
                      fontWeight: 700,
                      color: '#000052',
                      outline: 'none'
                    }}
                  >
                    <option value="Dual Carriageway Expressway Frontage">Dual Carriageway Expressway Frontage</option>
                    <option value="Prime Commercial Cornerpiece">Prime Commercial Cornerpiece</option>
                    <option value="High-Traffic Commercial Street">High-Traffic Commercial Street</option>
                    <option value="Shopping Mall / Commercial Plaza Internal Corridor">Shopping Mall / Commercial Plaza Internal</option>
                    <option value="Secondary Arterial Road">Secondary Arterial Road</option>
                    <option value="Gated Office Park Compound">Gated Office Park Compound</option>
                  </select>
                </div>
              </div>
            )}

            {/* Amenity Search Filter Bar */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '20px',
              padding: '10px 14px',
              backgroundColor: '#F8FAFC',
              borderRadius: '8px',
              border: '1px solid #E2E8F0'
            }}>
              <Search size={15} color="#64748B" />
              <input
                type="text"
                value={amenitySearchFilter}
                onChange={(e) => setAmenitySearchFilter(e.target.value)}
                placeholder="Search amenities (e.g. Borehole, Inverter, Security, Balcony)..."
                style={{
                  flex: 1,
                  border: 'none',
                  backgroundColor: 'transparent',
                  fontSize: '13px',
                  color: '#1E293B',
                  outline: 'none'
                }}
              />
              {amenitySearchFilter && (
                <button
                  type="button"
                  onClick={() => setAmenitySearchFilter('')}
                  style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: '2px' }}
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Categorized Standard Amenities Grid (HIGH-END CHECKED BUTTON STATES) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '22px', marginBottom: '24px' }}>
              {filteredCategories.map(cat => {
                const CatIcon = cat.icon;
                return (
                  <div key={cat.id}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      marginBottom: '10px',
                      paddingBottom: '6px',
                      borderBottom: '1px dashed #E2E8F0'
                    }}>
                      <CatIcon size={15} color="#000052" />
                      <span style={{ fontSize: '13px', fontWeight: 800, color: '#000052' }}>
                        {cat.label}
                      </span>
                    </div>

                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                      gap: '10px'
                    }}>
                      {cat.items.map(amenity => {
                        const isChecked = amenities.includes(amenity);
                        return (
                          <button
                            key={amenity}
                            type="button"
                            onClick={() => handleToggleAmenity(amenity)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '12px',
                              padding: '11px 14px',
                              borderRadius: '8px',
                              border: isChecked ? '2px solid #000052' : '1.5px solid #E2E8F0',
                              backgroundColor: isChecked ? '#EFF6FF' : '#FFFFFF',
                              color: isChecked ? '#000052' : '#334155',
                              fontSize: '13px',
                              fontWeight: isChecked ? 700 : 500,
                              textAlign: 'left',
                              cursor: 'pointer',
                              transition: 'all 0.15s ease',
                              boxShadow: isChecked ? '0 2px 8px rgba(0, 0, 82, 0.1)' : 'none'
                            }}
                            onMouseEnter={(e) => {
                              if (!isChecked) e.currentTarget.style.backgroundColor = '#F8FAFC';
                            }}
                            onMouseLeave={(e) => {
                              if (!isChecked) e.currentTarget.style.backgroundColor = '#FFFFFF';
                            }}
                          >
                            {/* Visual Checkbox Indicator */}
                            <div style={{
                              width: '20px',
                              height: '20px',
                              borderRadius: '5px',
                              backgroundColor: isChecked ? '#000052' : '#FFFFFF',
                              border: isChecked ? 'none' : '1.5px solid #CBD5E1',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                              transition: 'all 0.15s ease'
                            }}>
                              {isChecked && <Check size={13} color="#FFFFFF" strokeWidth={3} />}
                            </div>

                            <span style={{ flex: 1, lineHeight: 1.3 }}>{amenity}</span>

                            {isChecked && (
                              <span style={{
                                width: '6px',
                                height: '6px',
                                borderRadius: '50%',
                                backgroundColor: '#16794A'
                              }} />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Custom Amenities Sub-section (With Distinct Checked State & Delete) */}
            {filteredCustomAmenities.length > 0 && (
              <div style={{
                marginBottom: '24px',
                padding: '18px',
                backgroundColor: '#FAF5FF',
                borderRadius: '10px',
                border: '1.5px solid #E9D5FF'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '12px'
                }}>
                  <Sparkles size={16} color="#7E22CE" />
                  <span style={{ fontSize: '13px', fontWeight: 800, color: '#581C87' }}>
                    Custom Added Amenities ({filteredCustomAmenities.length})
                  </span>
                </div>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                  gap: '10px'
                }}>
                  {filteredCustomAmenities.map(amenity => {
                    const isChecked = amenities.includes(amenity);
                    return (
                      <div
                        key={amenity}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          padding: '9px 12px',
                          borderRadius: '8px',
                          border: isChecked ? '2px solid #7E22CE' : '1.5px solid #E9D5FF',
                          backgroundColor: isChecked ? '#F3E8FF' : '#FFFFFF',
                          color: isChecked ? '#581C87' : '#475569',
                          fontSize: '13px',
                          fontWeight: isChecked ? 700 : 500,
                          boxShadow: isChecked ? '0 2px 6px rgba(126, 34, 206, 0.12)' : 'none'
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => handleToggleAmenity(amenity)}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            flex: 1,
                            padding: 0,
                            color: 'inherit',
                            fontWeight: 'inherit',
                            textAlign: 'left'
                          }}
                        >
                          <div style={{
                            width: '20px',
                            height: '20px',
                            borderRadius: '5px',
                            backgroundColor: isChecked ? '#7E22CE' : '#FFFFFF',
                            border: isChecked ? 'none' : '1.5px solid #CBD5E1',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                          }}>
                            {isChecked && <Check size={13} color="#FFFFFF" strokeWidth={3} />}
                          </div>
                          <span style={{ flex: 1, lineHeight: 1.3 }}>{amenity}</span>
                          <span style={{
                            backgroundColor: '#E9D5FF',
                            color: '#6B21A8',
                            fontSize: '9px',
                            fontWeight: 800,
                            padding: '2px 5px',
                            borderRadius: '4px',
                            textTransform: 'uppercase'
                          }}>
                            Custom
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteCustomAmenity(amenity)}
                          title="Remove custom amenity"
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#94A3B8',
                            cursor: 'pointer',
                            padding: '3px',
                            display: 'flex',
                            alignItems: 'center'
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.color = '#DC2626')}
                          onMouseLeave={(e) => (e.currentTarget.style.color = '#94A3B8')}
                        >
                          <X size={14} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Dynamic Add Custom Amenity Bar */}
            <div style={{
              backgroundColor: '#F8FAFC',
              borderRadius: '10px',
              border: '1.5px dashed #CBD5E1',
              padding: '18px 20px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                <Plus size={16} color="#000052" />
                <span style={{ fontSize: '13px', fontWeight: 800, color: '#000052' }}>
                  Add a Custom Amenity
                </span>
                <span style={{ fontSize: '11px', color: '#64748B' }}>
                  (For unique property perks not included in the standard catalog)
                </span>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginBottom: '14px' }}>
                <input
                  type="text"
                  value={newCustomAmenityInput}
                  onChange={(e) => setNewCustomAmenityInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddCustomAmenity();
                    }
                  }}
                  placeholder="Type amenity name (e.g. Swimming Pool, Solar Inverter Setup, Private Gym)..."
                  style={{
                    flex: 1,
                    height: '42px',
                    padding: '0 14px',
                    borderRadius: '8px',
                    border: '1.5px solid #CBD5E1',
                    fontSize: '13px',
                    color: '#000052',
                    backgroundColor: '#FFFFFF',
                    outline: 'none'
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#000052';
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(0, 0, 82, 0.08)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = '#CBD5E1';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                />
                <button
                  type="button"
                  onClick={() => handleAddCustomAmenity()}
                  disabled={!newCustomAmenityInput.trim()}
                  style={{
                    backgroundColor: newCustomAmenityInput.trim() ? '#000052' : '#94A3B8',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '0 20px',
                    height: '42px',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: newCustomAmenityInput.trim() ? 'pointer' : 'not-allowed',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <Plus size={15} />
                  <span>Add Feature</span>
                </button>
              </div>

              {/* 1-Tap Quick Suggestions */}
              <div>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', display: 'block', marginBottom: '8px' }}>
                  Popular suggestions to add with one click:
                </span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {SUGGESTED_EXTRA_AMENITIES.map(extra => {
                    const isAlreadyAdded = amenities.includes(extra);
                    return (
                      <button
                        key={extra}
                        type="button"
                        onClick={() => {
                          if (isAlreadyAdded) {
                            handleToggleAmenity(extra);
                          } else {
                            handleAddCustomAmenity(extra);
                          }
                        }}
                        style={{
                          backgroundColor: isAlreadyAdded ? '#ECFDF5' : '#FFFFFF',
                          border: isAlreadyAdded ? '1.5px solid #10B981' : '1px solid #CBD5E1',
                          color: isAlreadyAdded ? '#065F46' : '#475569',
                          borderRadius: '20px',
                          padding: '5px 12px',
                          fontSize: '11px',
                          fontWeight: isAlreadyAdded ? 700 : 500,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        {isAlreadyAdded ? <Check size={12} color="#10B981" strokeWidth={2.5} /> : <Plus size={12} />}
                        <span>{extra}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>

          {/* =========================================================
              SECTION 5: IMAGEKIT PHOTO GALLERY
             ========================================================= */}
          <section id="section-photos" style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '12px',
            border: '1px solid #E2E8F0',
            padding: '26px 28px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  backgroundColor: '#000052',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '14px',
                  fontWeight: 800
                }}>
                  5
                </div>
                <div>
                  <h2 style={{ fontSize: '17px', fontWeight: 800, color: '#000052', margin: 0 }}>
                    ImageKit Photo Gallery
                  </h2>
                  <p style={{ fontSize: '12px', color: '#64748B', margin: '2px 0 0' }}>
                    Upload high-res photos. The first image serves as the primary card cover.
                  </p>
                </div>
              </div>

              <span style={{
                fontSize: '12px',
                fontWeight: 700,
                color: photos.length >= 2 ? '#16794A' : '#B45309',
                backgroundColor: photos.length >= 2 ? '#ECFDF5' : '#FEF3C7',
                padding: '4px 10px',
                borderRadius: '6px'
              }}>
                {photos.length} {photos.length === 1 ? 'Photo' : 'Photos'} (min 2 recommended)
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Photo Thumbnail Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '12px' }}>
                {photos.map((url, idx) => (
                  <div
                    key={idx}
                    style={{
                      position: 'relative',
                      borderRadius: '8px',
                      overflow: 'hidden',
                      border: idx === 0 ? '2.5px solid #000052' : '1px solid #CBD5E1',
                      aspectRatio: '4/3',
                      backgroundColor: '#F1F5F9'
                    }}
                  >
                    <img
                      src={url}
                      alt={`Property ${idx + 1}`}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      onError={(e) => {
                        e.currentTarget.src = SAMPLE_PHOTOS[0];
                      }}
                    />

                    {/* Cover Photo Badge */}
                    {idx === 0 && (
                      <div style={{
                        position: 'absolute',
                        bottom: '6px',
                        left: '6px',
                        backgroundColor: '#000052',
                        color: '#FFFFFF',
                        fontSize: '9px',
                        fontWeight: 800,
                        padding: '2px 6px',
                        borderRadius: '4px',
                        letterSpacing: '0.04em',
                        textTransform: 'uppercase'
                      }}>
                        Cover Photo
                      </div>
                    )}

                    {/* Thumbnail Actions */}
                    <div style={{
                      position: 'absolute',
                      top: '6px',
                      right: '6px',
                      display: 'flex',
                      gap: '4px'
                    }}>
                      {idx !== 0 && (
                        <button
                          type="button"
                          onClick={() => handleSetCoverPhoto(idx)}
                          title="Set as Primary Cover"
                          style={{
                            backgroundColor: 'rgba(0, 0, 82, 0.9)',
                            color: '#FFFFFF',
                            border: 'none',
                            borderRadius: '4px',
                            padding: '3px 6px',
                            fontSize: '10px',
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}
                        >
                          Cover
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleRemovePhoto(idx)}
                        title="Remove photo"
                        style={{
                          backgroundColor: 'rgba(220, 38, 38, 0.9)',
                          color: '#FFFFFF',
                          border: 'none',
                          borderRadius: '4px',
                          width: '22px',
                          height: '22px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer'
                        }}
                      >
                        <X size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <ImageKitUploader photos={photos} onChange={setPhotos} minPhotos={3} maxPhotos={10} />
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#1E293B', marginBottom: '6px' }}>
                  Add Photo by URL (Unsplash or ImageKit)
                </label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <input
                    type="url"
                    value={newPhotoInput}
                    onChange={(e) => setNewPhotoInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddPhoto();
                      }
                    }}
                    placeholder="https://images.unsplash.com/... or direct ImageKit image URL"
                    style={{
                      flex: 1,
                      height: '42px',
                      padding: '0 14px',
                      borderRadius: '8px',
                      border: '1.5px solid #CBD5E1',
                      fontSize: '13px',
                      outline: 'none'
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = '#000052';
                      e.currentTarget.style.boxShadow = '0 0 0 3px rgba(0, 0, 82, 0.08)';
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = '#CBD5E1';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => handleAddPhoto()}
                    disabled={!newPhotoInput.trim()}
                    style={{
                      backgroundColor: newPhotoInput.trim() ? '#000052' : '#94A3B8',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '0 20px',
                      height: '42px',
                      fontSize: '13px',
                      fontWeight: 700,
                      cursor: newPhotoInput.trim() ? 'pointer' : 'not-allowed',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <Plus size={15} />
                    <span>Add Photo</span>
                  </button>
                </div>
              </div>

              {/* 1-Click Sample Library Presets */}
              <div style={{
                backgroundColor: '#F8FAFC',
                borderRadius: '8px',
                border: '1px solid #E2E8F0',
                padding: '14px 16px'
              }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '8px' }}>
                  Quick add sample Ibadan property photos (for quick staging):
                </span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {PRESET_SAMPLE_LIBRARY.map(sample => (
                    <button
                      key={sample.label}
                      type="button"
                      onClick={() => handleAddPhoto(sample.url)}
                      style={{
                        backgroundColor: '#FFFFFF',
                        border: '1px solid #CBD5E1',
                        borderRadius: '6px',
                        padding: '6px 12px',
                        fontSize: '11px',
                        fontWeight: 600,
                        color: '#000052',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        transition: 'all 0.15s ease'
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#EFF6FF')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#FFFFFF')}
                    >
                      <Camera size={13} color="#000052" />
                      <span>+ {sample.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* =========================================================
              SECTION 6: AVAILABILITY & PUBLISHING (INTERACTIVE SWITCHES)
             ========================================================= */}
          <section id="section-publishing" style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '12px',
            border: '1px solid #E2E8F0',
            padding: '26px 28px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                backgroundColor: '#000052',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '14px',
                fontWeight: 800
              }}>
                6
              </div>
              <div>
                <h2 style={{ fontSize: '17px', fontWeight: 800, color: '#000052', margin: 0 }}>
                  Availability & Marketplace Visibility
                </h2>
                <p style={{ fontSize: '12px', color: '#64748B', margin: '2px 0 0' }}>
                  Control rental vacancy status and whether this listing is live to renters.
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Vacancy Status Toggle Switch */}
              <div style={{
                backgroundColor: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: '10px',
                padding: '16px 20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '16px'
              }}>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#000052' }}>
                    Rental Vacancy Status
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
                    Is this property currently vacant and ready for immediate physical move-in?
                  </div>
                </div>

                <div style={{
                  display: 'flex',
                  backgroundColor: '#E2E8F0',
                  borderRadius: '24px',
                  padding: '3px'
                }}>
                  <button
                    type="button"
                    onClick={() => setIsAvailable(true)}
                    style={{
                      padding: '7px 16px',
                      borderRadius: '20px',
                      border: 'none',
                      backgroundColor: isAvailable ? '#16794A' : 'transparent',
                      color: isAvailable ? '#FFFFFF' : '#64748B',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <Check size={13} strokeWidth={3} />
                    <span>Available Now</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsAvailable(false)}
                    style={{
                      padding: '7px 16px',
                      borderRadius: '20px',
                      border: 'none',
                      backgroundColor: !isAvailable ? '#DC2626' : 'transparent',
                      color: !isAvailable ? '#FFFFFF' : '#64748B',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <X size={13} strokeWidth={3} />
                    <span>Occupied</span>
                  </button>
                </div>
              </div>

              {/* Moderation Publishing Selector */}
              <div style={{
                backgroundColor: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: '10px',
                padding: '16px 20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '16px'
              }}>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#000052' }}>
                    Marketplace Publishing
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
                    Live properties appear publicly on Rentivo. Drafts remain privately stored in your panel.
                  </div>
                </div>

                <div style={{
                  display: 'flex',
                  backgroundColor: '#E2E8F0',
                  borderRadius: '24px',
                  padding: '3px'
                }}>
                  <button
                    type="button"
                    onClick={() => setModerationStatus('active')}
                    style={{
                      padding: '7px 16px',
                      borderRadius: '20px',
                      border: 'none',
                      backgroundColor: moderationStatus === 'active' ? '#000052' : 'transparent',
                      color: moderationStatus === 'active' ? '#FFFFFF' : '#64748B',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <Eye size={13} />
                    <span>Live on Market</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setModerationStatus('pending_approval')}
                    style={{
                      padding: '7px 16px',
                      borderRadius: '20px',
                      border: 'none',
                      backgroundColor: moderationStatus === 'pending_approval' ? '#475569' : 'transparent',
                      color: moderationStatus === 'pending_approval' ? '#FFFFFF' : '#64748B',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <Lock size={13} />
                    <span>Private Draft</span>
                  </button>
                </div>
              </div>

              {/* Physical Inspection Request (FR-1.6 & FR-1.7) */}
              <div style={{
                backgroundColor: '#ECFDF5',
                border: '1.5px solid #A7F3D0',
                borderRadius: '10px',
                padding: '18px 20px',
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                gap: '16px'
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                  <ShieldCheck size={24} color="#047857" style={{ marginTop: '2px', flexShrink: 0 }} />
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '14px', fontWeight: 800, color: '#065F46' }}>
                        Request Rentivo Physical Inspection
                      </span>
                      <span style={{
                        backgroundColor: '#047857',
                        color: '#FFFFFF',
                        fontSize: '11px',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: '12px'
                      }}>
                        Emerald Badge
                      </span>
                    </div>
                    <div style={{ fontSize: '12px', color: '#047857', marginTop: '4px', lineHeight: 1.4, maxWidth: '520px' }}>
                      Dispatch an authorized Rentivo field inspector to verify property condition, meter state, and water access. Verified properties receive the Emerald badge, verified photo watermark, and 3.4x higher conversion.
                    </div>
                  </div>
                </div>

                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  backgroundColor: '#FFFFFF',
                  border: requestInspectionOnSave ? '2px solid #047857' : '1.5px solid #CBD5E1',
                  borderRadius: '8px',
                  padding: '9px 14px',
                  transition: 'all 0.15s ease'
                }}>
                  <input
                    type="checkbox"
                    checked={requestInspectionOnSave}
                    onChange={(e) => setRequestInspectionOnSave(e.target.checked)}
                    style={{ accentColor: '#047857', width: '16px', height: '16px', cursor: 'pointer' }}
                  />
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#000052', whiteSpace: 'nowrap' }}>
                    {requestInspectionOnSave ? 'Inspection Requested' : 'Request Inspection'}
                  </span>
                </label>
              </div>
            </div>
          </section>

          {/* =========================================================
              BOTTOM ACTION BAR
             ========================================================= */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 0 32px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button
                type="button"
                onClick={onCancel}
                style={{
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #CBD5E1',
                  borderRadius: '8px',
                  padding: '11px 22px',
                  fontSize: '13px',
                  fontWeight: 700,
                  color: '#475569',
                  cursor: 'pointer'
                }}
              >
                Cancel & Return
              </button>

              {isEditMode && onDelete && (
                <button
                  type="button"
                  onClick={handleDelete}
                  style={{
                    backgroundColor: '#FEF2F2',
                    border: '1px solid #FECACA',
                    borderRadius: '8px',
                    padding: '11px 18px',
                    fontSize: '13px',
                    fontWeight: 700,
                    color: '#DC2626',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    cursor: 'pointer'
                  }}
                >
                  <Trash2 size={15} />
                  <span>Delete Listing</span>
                </button>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button
                type="button"
                disabled={isSaving}
                onClick={() => handleSubmit(false)}
                style={{
                  backgroundColor: '#FFFFFF',
                  border: '1.5px solid #000052',
                  borderRadius: '8px',
                  padding: '11px 22px',
                  fontSize: '13px',
                  fontWeight: 700,
                  color: '#000052',
                  cursor: isSaving ? 'not-allowed' : 'pointer'
                }}
              >
                Save as Draft
              </button>

              <button
                type="button"
                disabled={isSaving}
                onClick={() => handleSubmit(true)}
                style={{
                  backgroundColor: '#000052',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '11px 28px',
                  fontSize: '13px',
                  fontWeight: 700,
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  cursor: isSaving ? 'not-allowed' : 'pointer',
                  boxShadow: '0 2px 8px rgba(0, 0, 82, 0.25)'
                }}
              >
                {isSaving ? (
                  <span>Saving...</span>
                ) : (
                  <>
                    <span>{isEditMode ? 'Update Listing' : 'Save & Publish Listing'}</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: STICKY PREVIEW & AUDIT SCORE */}
        <aside style={{ position: 'sticky', top: '96px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* 1. REAL-TIME LIVE MARKETPLACE CARD PREVIEW */}
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '12px',
            border: '1px solid #E2E8F0',
            overflow: 'hidden',
            boxShadow: '0 4px 16px rgba(0, 0, 82, 0.07)'
          }}>
            <div style={{
              backgroundColor: '#F8FAFC',
              borderBottom: '1px solid #E2E8F0',
              padding: '10px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <span style={{ fontSize: '11px', fontWeight: 800, color: '#000052', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                Live Marketplace Preview
              </span>
              <span style={{
                fontSize: '10px',
                fontWeight: 700,
                color: isAvailable ? '#065F46' : '#991B1B',
                backgroundColor: isAvailable ? '#ECFDF5' : '#FEF2F2',
                padding: '2px 8px',
                borderRadius: '4px'
              }}>
                {isAvailable ? 'Available' : 'Occupied'}
              </span>
            </div>

            {/* Thumbnail */}
            <div style={{ position: 'relative', aspectRatio: '16/10', backgroundColor: '#F1F5F9' }}>
              <img
                src={photos[0] || SAMPLE_PHOTOS[0]}
                alt="Marketplace Preview"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                onError={(e) => {
                  e.currentTarget.src = SAMPLE_PHOTOS[0];
                }}
              />
              <div style={{
                position: 'absolute',
                top: '10px',
                left: '10px',
                display: 'flex',
                gap: '6px'
              }}>
                <span style={{
                  backgroundColor: 'rgba(0, 0, 82, 0.92)',
                  color: '#FFFFFF',
                  fontSize: '10px',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: '4px'
                }}>
                  {type}
                </span>
                <span style={{
                  backgroundColor: '#16794A',
                  color: '#FFFFFF',
                  fontSize: '10px',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: '4px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '3px'
                }}>
                  <ShieldCheck size={11} />
                  <span>Verified</span>
                </span>
              </div>
            </div>

            {/* Card Content Details */}
            <div style={{ padding: '16px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <MapPin size={12} color="#16794A" />
                <span>{area}, Ibadan</span>
              </div>

              <h3 style={{
                fontSize: '15px',
                fontWeight: 800,
                color: '#000052',
                margin: '6px 0 10px',
                lineHeight: 1.35
              }}>
                {title || 'Untitled Property Listing'}
              </h3>

              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '12px', color: '#475569', marginBottom: '14px' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Bed size={14} color="#64748B" />
                  <span>{bedrooms} Beds</span>
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Bath size={14} color="#64748B" />
                  <span>{bathrooms} Baths</span>
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Maximize2 size={14} color="#64748B" />
                  <span>{areaSqm} sqm</span>
                </span>
              </div>

              {/* Amenity tags preview */}
              {amenities.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '14px' }}>
                  {amenities.slice(0, 3).map((a, i) => (
                    <span
                      key={i}
                      style={{
                        backgroundColor: '#F1F5F9',
                        color: '#475569',
                        fontSize: '10px',
                        fontWeight: 600,
                        padding: '2px 6px',
                        borderRadius: '4px',
                        maxWidth: '120px',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}
                    >
                      {a}
                    </span>
                  ))}
                  {amenities.length > 3 && (
                    <span style={{
                      backgroundColor: '#EFF6FF',
                      color: '#1D4ED8',
                      fontSize: '10px',
                      fontWeight: 700,
                      padding: '2px 6px',
                      borderRadius: '4px'
                    }}>
                      +{amenities.length - 3} more
                    </span>
                  )}
                </div>
              )}

              <div style={{ borderTop: '1px solid #F1F5F9', paddingTop: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: '16px', fontWeight: 800, color: '#000052' }}>
                    {formatNaira(Number(price) || 0)}
                  </div>
                  <div style={{ fontSize: '10px', color: '#64748B' }}>
                    {pricePeriod === 'per_year' ? 'per year' : pricePeriod === 'per_month' ? 'per month' : 'outright purchase'}
                  </div>
                </div>
                <span style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  color: '#16794A',
                  backgroundColor: '#ECFDF5',
                  padding: '3px 8px',
                  borderRadius: '4px'
                }}>
                  Direct Landlord
                </span>
              </div>
            </div>
          </div>

          {/* 2. COMPLETENESS & AUDIT READINESS SCORE (CLICKABLE TO SCROLL) */}
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '12px',
            border: '1px solid #E2E8F0',
            padding: '20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '13px', fontWeight: 800, color: '#000052' }}>
                Completeness Score
              </span>
              <strong style={{ fontSize: '15px', color: completenessScore >= 80 ? '#16794A' : '#B45309' }}>
                {completenessScore}%
              </strong>
            </div>

            <div style={{ width: '100%', height: '8px', backgroundColor: '#E2E8F0', borderRadius: '9999px', overflow: 'hidden', marginBottom: '14px' }}>
              <div style={{
                width: `${completenessScore}%`,
                height: '100%',
                backgroundColor: completenessScore >= 80 ? '#16794A' : '#B45309',
                transition: 'width 0.3s ease'
              }} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
              <button
                type="button"
                onClick={() => scrollToSection('section-basic')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  color: title.length >= 10 ? '#16794A' : '#64748B',
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontSize: 'inherit'
                }}
              >
                {title.length >= 10 ? <Check size={14} color="#16794A" /> : <Clock size={14} />}
                <span>Descriptive title provided</span>
              </button>

              <button
                type="button"
                onClick={() => scrollToSection('section-pricing')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  color: Number(price) > 50000 ? '#16794A' : '#64748B',
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontSize: 'inherit'
                }}
              >
                {Number(price) > 50000 ? <Check size={14} color="#16794A" /> : <Clock size={14} />}
                <span>Rental price specified</span>
              </button>

              <button
                type="button"
                onClick={() => scrollToSection('section-photos')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  color: photos.length >= 2 ? '#16794A' : '#64748B',
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontSize: 'inherit'
                }}
              >
                {photos.length >= 2 ? <Check size={14} color="#16794A" /> : <Clock size={14} />}
                <span>At least 2 gallery photos</span>
              </button>

              <button
                type="button"
                onClick={() => scrollToSection('section-amenities')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  color: amenities.length >= 3 ? '#16794A' : '#64748B',
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontSize: 'inherit'
                }}
              >
                {amenities.length >= 3 ? <Check size={14} color="#16794A" /> : <Clock size={14} />}
                <span>3+ verified amenities selected</span>
              </button>
            </div>
          </div>

          {/* 3. VERIFICATION GUARANTEE CARD */}
          <div style={{
            backgroundColor: '#F8FAFC',
            borderRadius: '12px',
            border: '1px solid #E2E8F0',
            padding: '18px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <ShieldCheck size={18} color="#16794A" />
              <span style={{ fontSize: '13px', fontWeight: 800, color: '#000052' }}>
                Accredited Ibadan Inspection
              </span>
            </div>
            <p style={{ fontSize: '12px', color: '#64748B', lineHeight: 1.5, margin: 0 }}>
              Once published, your property is scheduled for a free 20-minute physical verification visit by our Ibadan field inspector to unlock the Emerald Verified Partner badge.
            </p>
          </div>

        </aside>

      </main>

    </div>
  );
};
