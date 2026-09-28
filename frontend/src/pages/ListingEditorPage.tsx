import React, { useState, useEffect, useRef } from 'react';
import {
  Home,
  Building2,
  Hotel,
  Sparkles,
  MapPin,
  Check,
  X,
  Plus,
  Trash2,
  Camera,
  Info,
  AlertTriangle,
  ArrowLeft,
  Lock,
  RefreshCw,
  Sparkle,
  Star
} from 'lucide-react';
import { Listing, PropertyCategory, PropertyType, IBADAN_AREAS } from '../types';
import { formatNaira } from '../utils/formatters';
import { listingsService } from '../services/listingsService';
import { locationsService } from '../services/locationsService';
import { authService } from '../services/authService';
import { uploadToImageKit } from '../lib/imagekit';
import '../styles/listing-editor-v2.css';

interface ListingEditorPageProps {
  initialListing?: Listing | null;
  onSaveSuccess: (savedListing: Listing) => void;
  onCancel: () => void;
  onDelete?: (id: string) => void;
}

const MIN_PHOTOS = 3;
const MAX_PHOTOS = 10;
const DRAFT_STORAGE_KEY = 'rentivo_listing_editor_draft_v2';

interface CategoryConfig {
  id: string;
  name: string;
  description: string;
  icon: 'residential' | 'commercial' | 'shortlet' | 'land' | 'custom';
  defaultTypes: string[];
  defaultAmenities: string[];
}

const DEFAULT_CATEGORIES: CategoryConfig[] = [
  {
    id: 'residential',
    name: 'Residential',
    description: 'Self-contains, flats and houses to live in.',
    icon: 'residential',
    defaultTypes: ['Self-contain', 'Flat / Apartment', 'Duplex', 'Bungalow', 'House', 'Room & Parlour'],
    defaultAmenities: [
      'Water / Borehole',
      '24hr Security',
      'Dedicated Parking',
      'Generator House',
      'Fenced Compound',
      'Prepaid Meter',
      'Tiled Floors',
      'Fitted Kitchen',
      'BQ',
      'Gated Estate'
    ]
  },
  {
    id: 'commercial',
    name: 'Commercial',
    description: 'Shops, offices and commercial spaces for business.',
    icon: 'commercial',
    defaultTypes: ['Shop', 'Office Space', 'Warehouse', 'Commercial Floor', 'Showroom'],
    defaultAmenities: [
      'Water Supply',
      '24hr Security',
      'Dedicated Parking',
      'Elevator',
      'Backup Power',
      'High Foot Traffic',
      'Signage Space',
      'Prepaid Commercial Meter',
      'Loading Bay'
    ]
  },
  {
    id: 'shortlet',
    name: 'Short-let / Serviced',
    description: 'Furnished apartments for daily or monthly stays.',
    icon: 'shortlet',
    defaultTypes: ['Studio Apartment', '1-Bedroom Serviced', '2-Bedroom Serviced', '3-Bedroom Serviced', 'Luxury Villa'],
    defaultAmenities: [
      'High-speed WiFi',
      'Smart TV / Netflix',
      '24/7 Power / Inverter',
      'Air Conditioning',
      'Fully Fitted Kitchen',
      'Swimming Pool',
      'Daily Housekeeping',
      'Washing Machine',
      'Dedicated Parking'
    ]
  },
  {
    id: 'land',
    name: 'Land / Plot',
    description: 'Plots for residential, commercial or agricultural use.',
    icon: 'land',
    defaultTypes: ['Residential Plot', 'Commercial Plot', 'Corner Piece', 'Farmland', 'Industrial Acreage'],
    defaultAmenities: [
      'Perimeter Fencing',
      'Registered Survey Plan',
      'C of O / Gazette',
      'Motorable Tarred Road',
      'Electricity Access',
      'Dry Ground / Ready to Build',
      'Gated Layout',
      'Instant Allocation'
    ]
  }
];

const SUGGESTED_TITLES = [
  'Spacious 2-Bedroom Flat in Bodija with 24hr Water',
  'Newly Built Modern Self-Contain close to UI',
  'Executive 3-Bedroom Duplex in Gated Oluyole Estate',
  'High Foot-Traffic Retail Shop on Ring Road, Ibadan'
];

export const ListingEditorPage: React.FC<ListingEditorPageProps> = ({
  initialListing,
  onSaveSuccess,
  onCancel,
  onDelete
}) => {
  const isEditing = Boolean(initialListing?.id);

  // Categories & Dynamic Types
  const [categories, setCategories] = useState<CategoryConfig[]>(DEFAULT_CATEGORIES);
  const [category, setCategory] = useState<string>(
    initialListing?.category || 'residential'
  );
  const [type, setType] = useState<string>(initialListing?.type || 'Self-contain');

  // Custom Category & Type UI State
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isAddingType, setIsAddingType] = useState(false);
  const [newTypeName, setNewTypeName] = useState('');

  // Form State
  const [step, setStep] = useState<number>(isEditing ? 2 : 1);
  const [title, setTitle] = useState<string>(initialListing?.title || '');
  const [price, setPrice] = useState<string>(
    initialListing?.price ? String(initialListing.price) : ''
  );
  const [area, setArea] = useState<string>(initialListing?.area || 'Bodija');
  const availableAreas = React.useMemo(() => {
    const list = locationsService.getAreasForCity('Ibadan', true);
    return list.length > 0 ? list : (IBADAN_AREAS.filter((a) => a !== 'All Ibadan areas') as unknown as string[]);
  }, []);
  const [bedrooms, setBedrooms] = useState<number>(initialListing?.bedrooms !== undefined ? initialListing.bedrooms : 1);
  const [bathrooms, setBathrooms] = useState<number>(initialListing?.bathrooms !== undefined ? initialListing.bathrooms : 1);
  const [floorOrRooms, setFloorOrRooms] = useState<string>(
    initialListing?.commercialSpecs?.floorLevel || ''
  );
  const [exactAddress, setExactAddress] = useState<string>(initialListing?.addressDescription || '');
  const [description, setDescription] = useState<string>(initialListing?.description || '');
  const [amenities, setAmenities] = useState<string[]>(initialListing?.amenities || []);
  const [customAmenities, setCustomAmenities] = useState<string[]>([]);
  const [newAmenityInput, setNewAmenityInput] = useState('');

  // Photos & ImageKit Upload State
  const [photos, setPhotos] = useState<string[]>(
    initialListing?.photos && initialListing.photos.length > 0 ? initialListing.photos : []
  );
  const [isUploadingPhotos, setIsUploadingPhotos] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Dialog & Submission State
  const [discardDialogOpen, setDiscardDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [draftRestored, setDraftRestored] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Restore draft on initial mount if not editing
  useEffect(() => {
    if (isEditing) return;
    try {
      const rawDraft = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (rawDraft) {
        const draft = JSON.parse(rawDraft);
        if (draft.title) setTitle(draft.title);
        if (draft.category) setCategory(draft.category);
        if (draft.type) setType(draft.type);
        if (draft.price) setPrice(String(draft.price));
        if (draft.area) setArea(draft.area);
        if (draft.exactAddress) setExactAddress(draft.exactAddress);
        if (draft.bedrooms !== undefined) setBedrooms(draft.bedrooms);
        if (draft.bathrooms !== undefined) setBathrooms(draft.bathrooms);
        if (draft.description) setDescription(draft.description);
        if (draft.amenities?.length) setAmenities(draft.amenities);
        if (draft.photos?.length) setPhotos(draft.photos);
        setDraftRestored(true);
      }
    } catch {
      // Ignore corrupted draft
    }
  }, [isEditing]);

  // Autosave draft to localStorage
  useEffect(() => {
    if (isEditing) return;
    const timeout = setTimeout(() => {
      if (title || price || exactAddress || photos.length > 0) {
        localStorage.setItem(
          DRAFT_STORAGE_KEY,
          JSON.stringify({
            title,
            category,
            type,
            price,
            area,
            exactAddress,
            bedrooms,
            bathrooms,
            description,
            amenities,
            photos
          })
        );
      }
    }, 800);
    return () => clearTimeout(timeout);
  }, [isEditing, title, category, type, price, area, exactAddress, bedrooms, bathrooms, description, amenities, photos]);

  const clearDraft = () => {
    localStorage.removeItem(DRAFT_STORAGE_KEY);
    setDraftRestored(false);
    setTitle('');
    setPrice('');
    setExactAddress('');
    setDescription('');
    setPhotos([]);
    setAmenities([]);
    setStep(1);
  };

  // Active Category & Types Computation
  const currentCategoryConfig = categories.find((c) => c.id === category) || {
    id: category,
    name: category.charAt(0).toUpperCase() + category.slice(1),
    description: 'Custom property category.',
    icon: 'custom' as const,
    defaultTypes: ['Standard Unit', 'Premium Unit'],
    defaultAmenities: [
      'Water Supply',
      'Security',
      'Dedicated Parking',
      'Prepaid Meter',
      'Fenced Compound'
    ]
  };

  const activeTypes = currentCategoryConfig.defaultTypes;
  const activeAmenitiesList = Array.from(
    new Set([...currentCategoryConfig.defaultAmenities, ...customAmenities])
  );

  // Step names & titles
  const stepNames = ['Category', 'Details', 'Photos', 'Review'];
  const stepTitles = [
    'What are you listing?',
    'Property details & rent',
    'Add authentic photos',
    isEditing ? 'Review and save changes' : 'Review and publish listing'
  ];

  // Validation logic
  const getStepMissing = (currentStep: number): string => {
    if (currentStep === 1) {
      if (!category) return 'Select a property category to continue.';
      if (!type) return 'Select a property type to continue.';
    }
    if (currentStep === 2) {
      const missing: string[] = [];
      if (!title.trim() || title.trim().length < 8) missing.push('a descriptive title (at least 8 letters)');
      if (!(Number(price) >= 10000)) missing.push('a valid rent (at least ₦10,000)');
      if (!area) missing.push('the area');
      if (!exactAddress.trim() || exactAddress.trim().length < 8) {
        missing.push('the physical street address (kept private in escrow)');
      }
      if (missing.length > 0) {
        return (
          'Add ' +
          (missing.length < 2
            ? missing.join('')
            : missing.slice(0, -1).join(', ') + ' and ' + missing[missing.length - 1]) +
          ' to continue.'
        );
      }
    }
    if (currentStep === 3 && photos.length < MIN_PHOTOS) {
      const needed = MIN_PHOTOS - photos.length;
      return `Upload ${needed} more ${needed === 1 ? 'photo' : 'photos'} to continue.`;
    }
    return '';
  };

  const currentMissing = getStepMissing(step);

  // Handle Photo Upload directly to ImageKit CDN
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploadError(null);

    const availableSlots = MAX_PHOTOS - photos.length;
    if (availableSlots <= 0) {
      setUploadError(`You have reached the maximum of ${MAX_PHOTOS} photos.`);
      return;
    }

    const filesToProcess = Array.from(files).slice(0, availableSlots);

    // Client-side file validation
    for (const file of filesToProcess) {
      if (file.size > 8 * 1024 * 1024) {
        setUploadError(`"${file.name}" exceeds the 8MB limit. Please choose a smaller photo.`);
        if (e.target) e.target.value = '';
        return;
      }
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        setUploadError(`"${file.name}" is not supported. Please upload JPEG, PNG, or WebP images.`);
        if (e.target) e.target.value = '';
        return;
      }
    }

    setIsUploadingPhotos(true);
    setUploadProgress(10);
    const uploadedUrls: string[] = [];

    try {
      for (let i = 0; i < filesToProcess.length; i++) {
        const file = filesToProcess[i];
        const stepProgress = Math.round(15 + ((i + 0.8) / filesToProcess.length) * 80);
        setUploadProgress(stepProgress);
        const result = await uploadToImageKit(file);
        uploadedUrls.push(result.url);
      }
      setPhotos((prev) => [...prev, ...uploadedUrls]);
      setUploadProgress(100);
    } catch (err: any) {
      console.error('ImageKit upload error:', err);
      setUploadError(
        err?.message || 'Failed to upload photo to ImageKit CDN. Please check your connection and retry.'
      );
    } finally {
      setIsUploadingPhotos(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleRemovePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleMakeCoverPhoto = (index: number) => {
    if (index === 0) return;
    setPhotos((prev) => {
      const copy = [...prev];
      const [item] = copy.splice(index, 1);
      return [item, ...copy];
    });
  };

  const toggleAmenity = (item: string) => {
    setAmenities((prev) =>
      prev.includes(item) ? prev.filter((a) => a !== item) : [...prev, item]
    );
  };

  // Add Custom Amenity
  const handleAddCustomAmenity = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newAmenityInput.trim();
    if (!clean) return;
    if (!customAmenities.includes(clean)) {
      setCustomAmenities((prev) => [...prev, clean]);
    }
    if (!amenities.includes(clean)) {
      setAmenities((prev) => [...prev, clean]);
    }
    setNewAmenityInput('');
  };

  // Add Custom Category
  const handleSaveCustomCategory = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newCategoryName.trim();
    if (!clean) return;
    const catId = clean.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const newCat: CategoryConfig = {
      id: catId,
      name: clean,
      description: 'Custom property category created by you.',
      icon: 'custom',
      defaultTypes: ['Standard Unit', 'Premium Unit'],
      defaultAmenities: [
        'Water Supply',
        'Security',
        'Dedicated Parking',
        'Prepaid Meter',
        'Fenced Compound'
      ]
    };
    setCategories((prev) => [...prev, newCat]);
    setCategory(catId);
    setType('Standard Unit');
    setNewCategoryName('');
    setIsAddingCategory(false);
  };

  // Add Custom Property Type
  const handleSaveCustomType = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newTypeName.trim();
    if (!clean) return;
    setCategories((prev) =>
      prev.map((c) =>
        c.id === category
          ? { ...c, defaultTypes: Array.from(new Set([...c.defaultTypes, clean])) }
          : c
      )
    );
    setType(clean);
    setNewTypeName('');
    setIsAddingType(false);
  };

  // Insert Description Template
  const handleInsertTemplate = () => {
    const template = `PROPERTY HIGHLIGHTS:
- Clean, well-maintained space in a secure and serene compound.
- Constant borehole water supply and independent prepaid meter.
- Easy access to major transit roads and public transportation.

RENT & LEASE TERMS:
- Yearly rent payable in advance.
- Verification inspection confirmed before key handover.`;
    setDescription((prev) => (prev ? `${prev}\n\n${template}` : template));
  };

  // Price formatting helper
  const numericPrice = Number(price.replace(/,/g, '')) || 0;
  const handlePriceChange = (val: string) => {
    const raw = val.replace(/[^0-9]/g, '');
    setPrice(raw);
  };

  const handlePricePreset = (addAmount: number) => {
    const cur = Number(price.replace(/,/g, '')) || 0;
    setPrice(String(cur + addAmount));
  };

  // Final Save / Publish Handler
  const handleFinalSave = async () => {
    if (getStepMissing(1) || getStepMissing(2) || getStepMissing(3)) return;
    setIsSubmitting(true);
    setSaveError(null);

    try {
      const listingData: Partial<Listing> = {
        title: title.trim(),
        description: description.trim(),
        category,
        type: type as PropertyType,
        price: numericPrice,
        pricePeriod: category === 'shortlet' ? 'per_month' : 'per_year',
        city: 'Ibadan',
        area: area,
        addressDescription: exactAddress.trim() || `${area}, Ibadan`,
        amenities,
        photos: photos,
        bedrooms: category === 'commercial' || category === 'land' ? 0 : bedrooms,
        bathrooms: category === 'land' ? 0 : bathrooms,
        commercialSpecs:
          category === 'commercial' || floorOrRooms.trim()
            ? {
                floorLevel: floorOrRooms.trim() || undefined
              }
            : undefined
      };

      if (isEditing && initialListing?.id) {
        const updated = await listingsService.updateListing(initialListing.id, listingData);
        if (updated) {
          localStorage.removeItem(DRAFT_STORAGE_KEY);
          onSaveSuccess(updated);
        } else {
          onSaveSuccess({ ...(initialListing as Listing), ...listingData });
        }
      } else {
        const created = await listingsService.createListing({
          ...listingData,
          verificationStatus: 'unverified',
          isAvailable: true,
          isApproved: false, // Goes into pending review in accordance with database RLS
          title: title.trim(),
          category,
          type: type as PropertyType,
          price: numericPrice,
          pricePeriod: category === 'shortlet' ? 'per_month' : 'per_year',
          city: 'Ibadan',
          area,
          addressDescription: exactAddress.trim() || `${area}, Ibadan`,
          amenities,
          photos: photos,
          description: description.trim(),
          lister: {
            fullName: authService.getCurrentUser()?.name || 'Verified Lister',
            phone: '', // Locked in private escrow
            whatsapp: '', // Locked in private escrow
            agencyName: 'Rentivo Host',
            memberSince: '2026',
            activeListingsCount: 1,
            responseRate: '100%'
          },
          accessRequestsCount: 0
        });
        localStorage.removeItem(DRAFT_STORAGE_KEY);
        onSaveSuccess(created);
      }
    } catch (err: any) {
      console.error('Error saving listing:', err);
      setSaveError(
        err?.message || 'Could not save listing to Rentivo. Please check your network and try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const getCategoryIcon = (iconName: string) => {
    switch (iconName) {
      case 'residential':
        return <Home size={22} />;
      case 'commercial':
        return <Building2 size={22} />;
      case 'shortlet':
        return <Hotel size={22} />;
      case 'land':
        return <MapPin size={22} />;
      default:
        return <Home size={22} />;
    }
  };

  return (
    <div className="listing-editor-v2">
      <div className="listing-editor-container">

        {/* Draft Restored Banner */}
        {draftRestored && !isEditing && (
          <div className="v2-draft-pill">
            <span>Restored your unsaved draft.</span>
            <button
              type="button"
              onClick={clearDraft}
              style={{
                background: 'none',
                border: 'none',
                color: '#92400e',
                textDecoration: 'underline',
                fontWeight: 700,
                cursor: 'pointer',
                padding: 0
              }}
            >
              Discard draft
            </button>
          </div>
        )}

        {/* Page Header */}
        <div className="v2-page-head">
          <div>
            <button
              type="button"
              onClick={() => {
                if (title.trim() || photos.length > 0 || description.trim()) {
                  setDiscardDialogOpen(true);
                } else {
                  onCancel();
                }
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: 'none',
                border: 'none',
                color: '#000052',
                fontSize: '13.5px',
                fontWeight: 700,
                cursor: 'pointer',
                padding: '0 0 10px 0'
              }}
              aria-label="Back to Lister Dashboard"
            >
              <ArrowLeft size={16} />
              <span>Back to Dashboard</span>
            </button>
            <h1>{isEditing ? 'Edit listing' : 'Post a listing'}</h1>
            <p className="v2-lede">
              {isEditing
                ? 'Update what seekers see on Rentivo.'
                : 'Free to post. Verified seekers only unlock your contact after paying.'}
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {isEditing && onDelete && (
              <button
                type="button"
                className="v2-btn v2-btn-danger v2-btn-sm"
                onClick={() => setDeleteDialogOpen(true)}
              >
                <Trash2 size={15} />
                <span>Delete</span>
              </button>
            )}
            <button
              type="button"
              className="v2-btn v2-btn-ghost v2-btn-sm"
              onClick={() => setDiscardDialogOpen(true)}
            >
              {isEditing ? 'Cancel editing' : 'Discard draft'}
            </button>
          </div>
        </div>

        {/* Stepper */}
        <ol className="v2-stepper" aria-label="Progress">
          {stepNames.map((name, i) => {
            const stepNum = i + 1;
            const isDone = stepNum < step;
            const isNow = stepNum === step;
            const itemCls = isDone ? 'done' : isNow ? 'now' : '';

            return (
              <li key={name} className={itemCls} aria-current={isNow ? 'step' : undefined}>
                <button
                  type="button"
                  className="v2-step-in"
                  onClick={() => {
                    if (isDone || isEditing) {
                      setStep(stepNum);
                    }
                  }}
                  disabled={!isDone && !isEditing}
                >
                  <span className="v2-dot">
                    {isDone ? <Check size={14} /> : stepNum}
                  </span>
                  <span>{name}</span>
                </button>
              </li>
            );
          })}
        </ol>

        {/* Wizard Main Card */}
        <div className="v2-card v2-wiz">
          <h2 className="v2-wiz-title">{stepTitles[step - 1]}</h2>

          {/* =========================================================
              STEP 1: CATEGORY & TYPE
             ========================================================= */}
          {step === 1 && (
            <div>
              <div className="v2-field" style={{ marginBottom: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span className="v2-label" style={{ margin: 0 }}>Property Category</span>
                  <button
                    type="button"
                    className="v2-btn v2-btn-ghost v2-btn-sm"
                    style={{ fontSize: '0.8rem', padding: '4px 8px' }}
                    onClick={() => setIsAddingCategory((v) => !v)}
                  >
                    <Plus size={14} />
                    <span>{isAddingCategory ? 'Close' : 'Add new category'}</span>
                  </button>
                </div>

                {/* Inline Add Category Form */}
                {isAddingCategory && (
                  <form onSubmit={handleSaveCustomCategory} className="v2-add-row" style={{ marginBottom: 14 }}>
                    <input
                      type="text"
                      className="v2-add-input"
                      placeholder="e.g. Student Hostel, Event Hall, Farmland"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      autoFocus
                    />
                    <button type="submit" className="v2-add-btn" disabled={!newCategoryName.trim()}>
                      Add Category
                    </button>
                  </form>
                )}

                {/* Category Choices Grid */}
                <div className="v2-choices" role="group">
                  {categories.map((cat) => {
                    const isActive = category === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        className={`v2-choice ${isActive ? 'active' : ''}`}
                        onClick={() => {
                          setCategory(cat.id);
                          if (cat.defaultTypes[0]) {
                            setType(cat.defaultTypes[0]);
                          }
                        }}
                      >
                        <span className="ic">
                          {getCategoryIcon(cat.icon)}
                        </span>
                        <span>
                          <strong>{cat.name}</strong>
                          <span className="d">{cat.description}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Property Type Selection */}
              <div className="v2-field">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span className="v2-label" style={{ margin: 0 }}>Property Type</span>
                  <button
                    type="button"
                    className="v2-btn v2-btn-ghost v2-btn-sm"
                    style={{ fontSize: '0.8rem', padding: '4px 8px' }}
                    onClick={() => setIsAddingType((v) => !v)}
                  >
                    <Plus size={14} />
                    <span>{isAddingType ? 'Close' : 'Add custom type'}</span>
                  </button>
                </div>

                {/* Inline Add Type Form */}
                {isAddingType && (
                  <form onSubmit={handleSaveCustomType} className="v2-add-row" style={{ marginBottom: 14 }}>
                    <input
                      type="text"
                      className="v2-add-input"
                      placeholder="e.g. Penthouse, Mini Flat, Cold Room"
                      value={newTypeName}
                      onChange={(e) => setNewTypeName(e.target.value)}
                      autoFocus
                    />
                    <button type="submit" className="v2-add-btn" disabled={!newTypeName.trim()}>
                      Add Type
                    </button>
                  </form>
                )}

                <div className="v2-chips" role="group">
                  {activeTypes.map((t) => (
                    <button
                      key={t}
                      type="button"
                      className={`v2-chip ${type === t ? 'active' : ''}`}
                      onClick={() => setType(t)}
                    >
                      {type === t && <Check size={14} />}
                      <span>{t}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Step 1 Foot */}
              <div className="v2-wiz-foot">
                <p className="v2-wiz-hint">{currentMissing || 'Pick the right category so seekers find your listing fast.'}</p>
                <div className="v2-wiz-btns">
                  <button
                    type="button"
                    className="v2-btn v2-btn-primary"
                    disabled={Boolean(currentMissing)}
                    onClick={() => setStep(2)}
                  >
                    Continue to Details
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* =========================================================
              STEP 2: DETAILS, RENT & AMENITIES
             ========================================================= */}
          {step === 2 && (
            <div>
              <div className="v2-form-grid two">

                {/* Title */}
                <div className="v2-field v2-span-2">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label className="v2-label" htmlFor="v2-title">
                      Listing Title <span style={{ color: '#dc2626' }}>*</span>
                    </label>
                    <span style={{ fontSize: '0.78rem', color: title.length >= 8 ? '#166534' : 'var(--ink-faint)' }}>
                      {title.length}/90 chars
                    </span>
                  </div>
                  <input
                    id="v2-title"
                    className="v2-input"
                    value={title}
                    maxLength={90}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Spacious 2-Bedroom Flat in Bodija with 24hr Water"
                    autoComplete="off"
                  />
                  
                  {/* Suggested Title Chips */}
                  <div style={{ marginTop: 6 }}>
                    <span style={{ fontSize: '0.74rem', color: 'var(--ink-soft)', fontWeight: 600 }}>
                      Quick Suggestions:
                    </span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                      {SUGGESTED_TITLES.map((st) => (
                        <button
                          key={st}
                          type="button"
                          className="v2-suggestion-chip"
                          onClick={() => setTitle(st)}
                        >
                          {st}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Price */}
                <div className="v2-field">
                  <label className="v2-label" htmlFor="v2-price">
                    {category === 'shortlet' ? 'Monthly Rent (₦)' : 'Yearly Rent (₦)'}{' '}
                    <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <input
                    id="v2-price"
                    className="v2-input"
                    type="text"
                    inputMode="numeric"
                    value={price ? Number(price).toLocaleString() : ''}
                    onChange={(e) => handlePriceChange(e.target.value)}
                    placeholder="e.g. 1,200,000"
                  />
                  <div className="v2-hint" style={{ marginTop: 4 }}>
                    {numericPrice >= 10000 ? (
                      <span style={{ color: '#166534', fontWeight: 600 }}>
                        {formatNaira(numericPrice)} {category === 'shortlet' ? 'per month' : 'per year'}
                        {category !== 'shortlet' && ` (~${formatNaira(Math.round(numericPrice / 12))}/mo)`}
                      </span>
                    ) : (
                      'Enter the rental amount in Nigerian Naira (₦).'
                    )}
                  </div>

                  {/* Preset quick buttons */}
                  <div className="v2-presets">
                    <button type="button" className="v2-preset-pill" onClick={() => handlePricePreset(250000)}>
                      +₦250k
                    </button>
                    <button type="button" className="v2-preset-pill" onClick={() => handlePricePreset(500000)}>
                      +₦500k
                    </button>
                    <button type="button" className="v2-preset-pill" onClick={() => handlePricePreset(1000000)}>
                      +₦1M
                    </button>
                  </div>
                </div>

                {/* Area in Ibadan */}
                <div className="v2-field">
                  <label className="v2-label" htmlFor="v2-area">
                    Area in Ibadan <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <select
                    id="v2-area"
                    className="v2-select"
                    value={area}
                    onChange={(e) => setArea(e.target.value)}
                  >
                    <option value="">Select an area</option>
                    {availableAreas.map((a) => (
                      <option key={a} value={a}>
                        {a}
                      </option>
                    ))}
                  </select>
                  <span className="v2-hint">Public visitors see this area tag on search results.</span>
                </div>

                {/* Numeric Steppers: Bedrooms & Bathrooms */}
                {category !== 'commercial' && category !== 'land' && (
                  <>
                    <div className="v2-field">
                      <label className="v2-label">Bedrooms</label>
                      <div className="v2-num-stepper">
                        <button
                          type="button"
                          className="v2-num-btn"
                          onClick={() => setBedrooms((b) => Math.max(0, b - 1))}
                          disabled={bedrooms <= 0}
                        >
                          -
                        </button>
                        <span className="v2-num-val">
                          {bedrooms === 0 ? 'Self/Studio' : `${bedrooms} bed${bedrooms > 1 ? 's' : ''}`}
                        </span>
                        <button
                          type="button"
                          className="v2-num-btn"
                          onClick={() => setBedrooms((b) => Math.min(10, b + 1))}
                          disabled={bedrooms >= 10}
                        >
                          +
                        </button>
                      </div>
                    </div>

                    <div className="v2-field">
                      <label className="v2-label">Bathrooms</label>
                      <div className="v2-num-stepper">
                        <button
                          type="button"
                          className="v2-num-btn"
                          onClick={() => setBathrooms((b) => Math.max(1, b - 1))}
                          disabled={bathrooms <= 1}
                        >
                          -
                        </button>
                        <span className="v2-num-val">
                          {`${bathrooms} bath${bathrooms > 1 ? 's' : ''}`}
                        </span>
                        <button
                          type="button"
                          className="v2-num-btn"
                          onClick={() => setBathrooms((b) => Math.min(10, b + 1))}
                          disabled={bathrooms >= 10}
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </>
                )}

                {/* Commercial / Land Specs */}
                {(category === 'commercial' || category === 'land') && (
                  <div className="v2-field v2-span-2">
                    <label className="v2-label" htmlFor="v2-floor">
                      Floor level or Land Dimensions <span className="v2-opt">(optional)</span>
                    </label>
                    <input
                      id="v2-floor"
                      className="v2-input"
                      value={floorOrRooms}
                      onChange={(e) => setFloorOrRooms(e.target.value)}
                      placeholder={category === 'land' ? 'e.g. 600 sq metres / 1 Standard Plot' : 'e.g. Ground Floor, Suite 4'}
                    />
                  </div>
                )}

                {/* Exact Physical Landmark & Street Address (Escrow Protected) */}
                <div className="v2-field v2-span-2">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <label className="v2-label" htmlFor="v2-exact-address" style={{ margin: 0 }}>
                      Exact Physical Landmark & Street Address <span style={{ color: '#dc2626' }}>*</span>
                    </label>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#166534', background: '#dcfce7', padding: '2px 8px', borderRadius: 9999, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <Lock size={12} /> Encrypted Escrow — Protected
                    </span>
                  </div>
                  <input
                    id="v2-exact-address"
                    className="v2-input"
                    value={exactAddress}
                    onChange={(e) => setExactAddress(e.target.value)}
                    placeholder="e.g. Flat 3, Block B, 14 Adekunle Fajuyi Road, Bodija, Ibadan"
                    autoComplete="off"
                  />
                  <span className="v2-hint">
                    🔒 Kept safe in escrow storage. Only verified seekers whose access inquiry is approved and paid will receive this exact address. Public marketplace visitors only see "{area || 'Selected area'}, Ibadan".
                  </span>
                </div>

                {/* Description */}
                <div className="v2-field v2-span-2">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <label className="v2-label" htmlFor="v2-desc" style={{ margin: 0 }}>
                      Description <span className="v2-opt">(optional)</span>
                    </label>
                    <button
                      type="button"
                      className="v2-btn v2-btn-ghost v2-btn-sm"
                      style={{ fontSize: '0.78rem', padding: '2px 8px' }}
                      onClick={handleInsertTemplate}
                    >
                      <Sparkles size={13} />
                      <span>Insert Description Outline</span>
                    </button>
                  </div>
                  <textarea
                    id="v2-desc"
                    className="v2-textarea"
                    rows={4}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Highlight compound security, condition, road access, and key rental terms..."
                  />
                </div>

                {/* Amenities */}
                <div className="v2-field v2-span-2">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span className="v2-label" style={{ margin: 0 }}>
                      Amenities & Features
                    </span>
                    <span style={{ fontSize: '0.78rem', color: 'var(--ink-soft)' }}>
                      {amenities.length} selected
                    </span>
                  </div>

                  <div className="v2-chips" role="group">
                    {activeAmenitiesList.map((a) => {
                      const isSelected = amenities.includes(a);
                      return (
                        <button
                          key={a}
                          type="button"
                          className={`v2-chip ${isSelected ? 'active' : ''}`}
                          onClick={() => toggleAmenity(a)}
                        >
                          {isSelected && <Check size={14} />}
                          <span>{a}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Add Custom Amenity Form */}
                  <form onSubmit={handleAddCustomAmenity} className="v2-add-row" style={{ marginTop: 12 }}>
                    <input
                      type="text"
                      className="v2-add-input"
                      placeholder="Add custom amenity (e.g. Inverter Solar Backup, POP Ceiling)..."
                      value={newAmenityInput}
                      onChange={(e) => setNewAmenityInput(e.target.value)}
                    />
                    <button
                      type="submit"
                      className="v2-add-btn"
                      disabled={!newAmenityInput.trim()}
                    >
                      <Plus size={14} />
                      <span>Add Amenity</span>
                    </button>
                  </form>
                </div>

              </div>

              {/* Step 2 Foot */}
              <div className="v2-wiz-foot">
                <p className="v2-wiz-hint">{currentMissing || 'All key details look good. Proceed to add photos.'}</p>
                <div className="v2-wiz-btns">
                  <button
                    type="button"
                    className="v2-btn v2-btn-secondary"
                    onClick={() => setStep(1)}
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    className="v2-btn v2-btn-primary"
                    disabled={Boolean(currentMissing)}
                    onClick={() => setStep(3)}
                  >
                    Continue to Photos
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* =========================================================
              STEP 3: PHOTOS VIA IMAGEKIT CDN
             ========================================================= */}
          {step === 3 && (
            <div>
              <p className="v2-lede" style={{ marginBottom: 14 }}>
                Add at least {MIN_PHOTOS} authentic photos (up to {MAX_PHOTOS}). Images are automatically optimized on ImageKit CDN for lightning-fast loading.
              </p>

              {/* Upload Error Banner */}
              {uploadError && (
                <div className="v2-error-banner" style={{ marginBottom: 14 }}>
                  <AlertTriangle size={18} style={{ color: 'var(--coral)', flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: 600 }}>Upload error</p>
                    <p style={{ fontSize: '0.85rem' }}>{uploadError}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setUploadError(null)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                  >
                    <X size={16} />
                  </button>
                </div>
              )}

              {/* Live ImageKit Upload Progress */}
              {isUploadingPhotos && (
                <div className="v2-upload-banner">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#312e81' }}>
                      Uploading to ImageKit CDN...
                    </span>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#4f46e5' }}>
                      {uploadProgress}%
                    </span>
                  </div>
                  <div className="v2-upload-bar-track">
                    <div className="v2-upload-bar-fill" style={{ width: `${uploadProgress}%` }} />
                  </div>
                </div>
              )}

              {/* Progress Count Bar */}
              <div className="v2-progress" aria-hidden="true">
                <i
                  style={{
                    width: `${Math.min(100, Math.round((photos.length / MIN_PHOTOS) * 100))}%`
                  }}
                />
              </div>

              {/* Photo Grid */}
              <div className="v2-photos">
                {photos.map((url, i) => (
                  <div key={url} className="v2-ph">
                    <img src={url} alt={`Listing photo ${i + 1}`} loading="lazy" />
                    {i === 0 ? (
                      <span className="v2-ph-tag">Cover Photo</span>
                    ) : (
                      <button
                        type="button"
                        className="v2-ph-cover-btn"
                        onClick={() => handleMakeCoverPhoto(i)}
                      >
                        <Star size={11} fill="#fff" />
                        <span>Set Cover</span>
                      </button>
                    )}
                    <button
                      type="button"
                      className="v2-ph-rm"
                      onClick={() => handleRemovePhoto(i)}
                      aria-label={`Remove photo ${i + 1}`}
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}

                {photos.length < MAX_PHOTOS && (
                  <label className={`v2-ph v2-ph-add ${isUploadingPhotos ? 'uploading' : ''}`}>
                    <Camera size={24} />
                    <span>{isUploadingPhotos ? 'Uploading...' : 'Upload Photos'}</span>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      multiple
                      disabled={isUploadingPhotos}
                      style={{ display: 'none' }}
                      onChange={handlePhotoUpload}
                    />
                  </label>
                )}
              </div>

              <p className="v2-hint" style={{ marginTop: 12 }}>
                {photos.length} uploaded ({photos.length >= MIN_PHOTOS ? 'Requirement met' : `${MIN_PHOTOS - photos.length} more needed`}). Maximum {MAX_PHOTOS} photos.
              </p>

              {/* Step 3 Foot */}
              <div className="v2-wiz-foot">
                <p className="v2-wiz-hint">{currentMissing || 'Photos ready. Review your listing before going live.'}</p>
                <div className="v2-wiz-btns">
                  <button
                    type="button"
                    className="v2-btn v2-btn-secondary"
                    onClick={() => setStep(2)}
                    disabled={isUploadingPhotos}
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    className="v2-btn v2-btn-primary"
                    disabled={Boolean(currentMissing) || isUploadingPhotos}
                    onClick={() => setStep(4)}
                  >
                    Review & Publish
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* =========================================================
              STEP 4: REVIEW & PUBLISH
             ========================================================= */}
          {step === 4 && (
            <div>
              {/* Save Error Banner */}
              {saveError && (
                <div className="v2-error-banner">
                  <AlertTriangle size={20} style={{ color: 'var(--coral)', flexShrink: 0, marginTop: 2 }} />
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: 700 }}>Unable to publish listing</p>
                    <p style={{ fontSize: '0.88rem', marginTop: 2 }}>{saveError}</p>
                  </div>
                  <button
                    type="button"
                    className="v2-btn v2-btn-secondary v2-btn-sm"
                    onClick={handleFinalSave}
                    disabled={isSubmitting}
                  >
                    <RefreshCw size={13} />
                    <span>Retry</span>
                  </button>
                </div>
              )}

              {/* Preview Gallery */}
              <div className="v2-gallery">
                <div>
                  {photos[0] ? (
                    <img src={photos[0]} alt="Property cover preview" />
                  ) : (
                    <div className="ph-empty">
                      <Camera size={28} />
                      <p>No cover photo</p>
                    </div>
                  )}
                </div>
                <div>
                  {photos[1] ? (
                    <img src={photos[1]} alt="Property preview 2" />
                  ) : (
                    <Camera size={24} color="#6C6C8E" />
                  )}
                </div>
                <div>
                  {photos[2] ? (
                    <img src={photos[2]} alt="Property preview 3" />
                  ) : (
                    <Camera size={24} color="#6C6C8E" />
                  )}
                </div>
              </div>

              {/* Details Preview Card */}
              <div style={{ marginTop: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--primary)', background: '#efedf8', padding: '2px 8px', borderRadius: 4 }}>
                    {category}
                  </span>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--ink-soft)' }}>
                    {type}
                  </span>
                </div>

                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--ink)', margin: '6px 0 0 0' }}>
                  {title || 'Untitled listing'}
                </h3>

                <div className="v2-price-big" style={{ marginTop: 6 }}>
                  {formatNaira(numericPrice)} <small>{category === 'shortlet' ? 'per month' : 'per year'}</small>
                </div>

                <dl className="v2-facts" style={{ marginTop: 14 }}>
                  <div>
                    <dt>Area (Public)</dt>
                    <dd>{area}, Ibadan</dd>
                  </div>
                  <div>
                    <dt>Protected Escrow Address</dt>
                    <dd style={{ color: '#166534', fontWeight: 600 }}>
                      🔒 {exactAddress.trim()} (Only released upon paid access)
                    </dd>
                  </div>
                  {category !== 'commercial' && category !== 'land' && (
                    <>
                      <div>
                        <dt>Bedrooms</dt>
                        <dd>{bedrooms === 0 ? 'Self-contain / Studio' : `${bedrooms} bedrooms`}</dd>
                      </div>
                      <div>
                        <dt>Bathrooms</dt>
                        <dd>{`${bathrooms} bathroom${bathrooms > 1 ? 's' : ''}`}</dd>
                      </div>
                    </>
                  )}
                  {floorOrRooms && (
                    <div>
                      <dt>Specs / Floor</dt>
                      <dd>{floorOrRooms}</dd>
                    </div>
                  )}
                </dl>

                {description && (
                  <p style={{ color: 'var(--ink)', fontSize: '0.9rem', margin: '14px 0', lineHeight: 1.5, whiteSpace: 'pre-line' }}>
                    {description}
                  </p>
                )}

                {amenities.length > 0 && (
                  <div className="v2-chips" style={{ marginTop: 10 }}>
                    {amenities.map((a) => (
                      <span key={a} className="v2-tag">
                        {a}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Quick Jump Buttons */}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 22 }}>
                <button
                  type="button"
                  className="v2-btn v2-btn-secondary v2-btn-sm"
                  onClick={() => setStep(1)}
                  disabled={isSubmitting}
                >
                  Edit Category
                </button>
                <button
                  type="button"
                  className="v2-btn v2-btn-secondary v2-btn-sm"
                  onClick={() => setStep(2)}
                  disabled={isSubmitting}
                >
                  Edit Details & Rent
                </button>
                <button
                  type="button"
                  className="v2-btn v2-btn-secondary v2-btn-sm"
                  onClick={() => setStep(3)}
                  disabled={isSubmitting}
                >
                  Edit Photos ({photos.length})
                </button>
              </div>

              {/* Info Note */}
              <div className="v2-note" style={{ marginTop: 20 }}>
                <Info size={18} />
                <p style={{ margin: 0 }}>
                  {isEditing
                    ? 'Your changes will update across Rentivo as soon as you save.'
                    : 'Your listing is saved and visible in your Lister Dashboard immediately. You can book an inspection anytime to receive the Verified badge.'}
                </p>
              </div>

              {/* Step 4 Foot */}
              <div className="v2-wiz-foot">
                <div />
                <div className="v2-wiz-btns">
                  <button
                    type="button"
                    className="v2-btn v2-btn-secondary"
                    onClick={() => setStep(3)}
                    disabled={isSubmitting}
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    className="v2-btn v2-btn-primary"
                    onClick={handleFinalSave}
                    disabled={isSubmitting}
                  >
                    {isSubmitting
                      ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                          <RefreshCw size={14} className="spin" />
                          <span>Publishing listing...</span>
                        </span>
                      )
                      : isEditing
                      ? 'Save changes'
                      : 'Publish listing'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Discard / Cancel Confirmation Modal */}
        {discardDialogOpen && (
          <div className="v2-overlay" onClick={() => setDiscardDialogOpen(false)}>
            <div className="v2-dialog" onClick={(e) => e.stopPropagation()}>
              <h2>{isEditing ? 'Cancel editing?' : 'Discard this draft?'}</h2>
              <p>
                {isEditing
                  ? 'Your changes to this listing will be lost.'
                  : 'Everything you have entered so far will be removed.'}
              </p>
              <div className="v2-dialog-actions">
                <button
                  type="button"
                  className="v2-btn v2-btn-secondary"
                  onClick={() => setDiscardDialogOpen(false)}
                >
                  Keep editing
                </button>
                <button
                  type="button"
                  className="v2-btn v2-btn-danger-solid"
                  onClick={() => {
                    localStorage.removeItem(DRAFT_STORAGE_KEY);
                    setDiscardDialogOpen(false);
                    onCancel();
                  }}
                >
                  {isEditing ? 'Cancel editing' : 'Discard draft'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deleteDialogOpen && initialListing?.id && onDelete && (
          <div className="v2-overlay" onClick={() => setDeleteDialogOpen(false)}>
            <div className="v2-dialog" onClick={(e) => e.stopPropagation()}>
              <h2>Delete this listing?</h2>
              <p>
                This cannot be undone. Renters will no longer find it or ask for access.
              </p>
              <div className="v2-dialog-actions">
                <button
                  type="button"
                  className="v2-btn v2-btn-secondary"
                  onClick={() => setDeleteDialogOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="v2-btn v2-btn-danger-solid"
                  onClick={() => {
                    setDeleteDialogOpen(false);
                    onDelete(initialListing.id);
                  }}
                >
                  Delete listing
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
