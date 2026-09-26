import React, { useState, useEffect, useRef } from 'react';
import {
  Home,
  Building2,
  Check,
  X,
  Plus,
  Trash2,
  Camera,
  MapPin,
  Clock,
  Info,
  ArrowLeft,
  AlertTriangle
} from 'lucide-react';
import { Listing, PropertyCategory, PropertyType, IBADAN_AREAS } from '../types';
import { formatNaira } from '../utils/formatters';
import { listingsService } from '../services/listingsService';
import { authService } from '../services/authService';
import '../styles/listing-editor-v2.css';

interface ListingEditorPageProps {
  initialListing?: Listing | null;
  onSaveSuccess: (savedListing: Listing) => void;
  onCancel: () => void;
  onDelete?: (id: string) => void;
}

const MIN_PHOTOS = 3;
const MAX_PHOTOS = 8;

const RESIDENTIAL_TYPES = ['Self-contain', 'Flat / Apartment', 'House', 'Duplex', 'Bungalow'];
const COMMERCIAL_TYPES = ['Shop', 'Office space', 'Warehouse'];

const RESIDENTIAL_AMENITIES = [
  'Water',
  '24hr security',
  'Parking',
  'Generator house',
  'Fenced compound',
  'BQ',
  'Gated estate',
  'Prepaid Meter',
  'Borehole Water',
  'Tiled Bathroom'
];

const COMMERCIAL_AMENITIES = [
  'Water',
  '24hr security',
  'Parking',
  'Elevator',
  'Backup power',
  'Signage space',
  'High Foot Traffic',
  'Prepaid Commercial Meter'
];

const SAMPLE_FALLBACK_PHOTOS = [
  'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=800&q=80'
];

export const ListingEditorPage: React.FC<ListingEditorPageProps> = ({
  initialListing,
  onSaveSuccess,
  onCancel,
  onDelete
}) => {
  const isEditing = Boolean(initialListing?.id);

  // Form State
  const [step, setStep] = useState<number>(isEditing ? 2 : 1);
  const [category, setCategory] = useState<'residential' | 'commercial'>(
    (initialListing?.category as 'residential' | 'commercial') || 'residential'
  );
  const [type, setType] = useState<string>(initialListing?.type || 'Self-contain');
  const [title, setTitle] = useState<string>(initialListing?.title || '');
  const [price, setPrice] = useState<string>(
    initialListing?.price ? String(initialListing.price) : ''
  );
  const [area, setArea] = useState<string>(initialListing?.area || 'Bodija');
  const [rooms, setRooms] = useState<string>(() => {
    if (initialListing?.commercialSpecs?.floorLevel) return initialListing.commercialSpecs.floorLevel;
    if (initialListing?.bedrooms !== undefined && initialListing.bedrooms > 0) {
      return `${initialListing.bedrooms} bedrooms`;
    }
    if (initialListing?.areaSqm) return `${initialListing.areaSqm} sq ft`;
    return '';
  });
  const [description, setDescription] = useState<string>(initialListing?.description || '');
  const [amenities, setAmenities] = useState<string[]>(initialListing?.amenities || []);
  const [photos, setPhotos] = useState<string[]>(
    initialListing?.photos && initialListing.photos.length > 0
      ? initialListing.photos
      : []
  );

  // Dialog state
  const [discardDialogOpen, setDiscardDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Step names
  const stepNames = ['Category', 'Details', 'Photos', 'Review'];
  const stepTitles = [
    'What are you listing?',
    'Property details',
    'Add photos',
    isEditing ? 'Review and save' : 'Review and publish'
  ];

  // Validation logic matching v2
  const getStepMissing = (currentStep: number): string => {
    if (currentStep === 1) {
      if (!category) return 'Choose a category to continue.';
      if (!type) return 'Choose a property type to continue.';
    }
    if (currentStep === 2) {
      const missing: string[] = [];
      if (!title.trim()) missing.push('a title');
      if (!(Number(price) > 0)) missing.push('the yearly rent');
      if (!area) missing.push('the area');
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
    if (currentStep === 3 && !isEditing && photos.length < MIN_PHOTOS) {
      const needed = MIN_PHOTOS - photos.length;
      return `Add ${needed} more ${needed === 1 ? 'photo' : 'photos'} to continue.`;
    }
    return '';
  };

  const currentMissing = getStepMissing(step);

  // Handle Photo Upload via Local File Reader
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const availableSlots = MAX_PHOTOS - photos.length;
    const filesToProcess = Array.from(files).slice(0, availableSlots);

    filesToProcess.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setPhotos((prev) => [...prev, reader.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });

    if (e.target) e.target.value = '';
  };

  const handleAddSamplePhotos = () => {
    const remaining = MAX_PHOTOS - photos.length;
    if (remaining <= 0) return;
    const toAdd = SAMPLE_FALLBACK_PHOTOS.slice(0, remaining);
    setPhotos((prev) => [...prev, ...toAdd]);
  };

  const handleRemovePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const toggleAmenity = (item: string) => {
    setAmenities((prev) =>
      prev.includes(item) ? prev.filter((a) => a !== item) : [...prev, item]
    );
  };

  // Submit / Save
  const handleFinalSave = async () => {
    if (getStepMissing(1) || getStepMissing(2)) return;
    setIsSubmitting(true);

    try {
      const numericPrice = Number(price) || 0;
      let numericBeds: number | undefined;
      const bedMatch = rooms.match(/(\d+)\s*bed/i);
      if (bedMatch) numericBeds = parseInt(bedMatch[1], 10);

      const listingData: Partial<Listing> = {
        title: title.trim(),
        description: description.trim(),
        category,
        type: type as PropertyType,
        price: numericPrice,
        pricePeriod: 'per_year',
        city: 'Ibadan',
        area: area,
        addressDescription: `${area}, Ibadan`,
        amenities,
        photos: photos.length > 0 ? photos : SAMPLE_FALLBACK_PHOTOS.slice(0, 3),
        bedrooms: numericBeds !== undefined ? numericBeds : category === 'commercial' ? 0 : 1,
        bathrooms: 1,
        commercialSpecs:
          category === 'commercial'
            ? {
                floorLevel: rooms.trim() || undefined
              }
            : undefined
      };

      if (isEditing && initialListing?.id) {
        const updated = await listingsService.updateListing(initialListing.id, listingData);
        if (updated) {
          onSaveSuccess(updated);
        } else {
          onSaveSuccess({ ...(initialListing as Listing), ...listingData });
        }
      } else {
        const created = await listingsService.createListing({
          ...listingData,
          verificationStatus: 'unverified',
          isAvailable: true,
          isApproved: true,
          title: title.trim(),
          category,
          type: type as PropertyType,
          price: numericPrice,
          pricePeriod: 'per_year',
          city: 'Ibadan',
          area,
          addressDescription: `${area}, Ibadan`,
          amenities,
          photos: photos.length > 0 ? photos : SAMPLE_FALLBACK_PHOTOS.slice(0, 3),
          description: description.trim(),
          lister: {
            fullName: authService.getCurrentUser()?.name || 'Verified Lister',
            phone: authService.getCurrentUser()?.phone || '',
            whatsapp: authService.getCurrentUser()?.phone || '',
            agencyName: 'Rentivo Host',
            memberSince: '2026',
            activeListingsCount: 1,
            responseRate: '100%'
          },
          accessRequestsCount: 0
        });
        onSaveSuccess(created);
      }
    } catch (err) {
      console.error('Error saving listing:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const activeAmenitiesList =
    category === 'commercial' ? COMMERCIAL_AMENITIES : RESIDENTIAL_AMENITIES;

  return (
    <div className="listing-editor-v2">
      <div className="listing-editor-container">
        
        {/* Page Header */}
        <div className="v2-page-head">
          <div>
            <h1>{isEditing ? 'Edit listing' : 'Post a listing'}</h1>
            <p className="v2-lede">
              {isEditing
                ? 'Update what renters see.'
                : 'Listing is free and takes about three minutes.'}
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
                    // Allow navigating freely between completed steps or when editing
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

          {/* STEP 1: CATEGORY & TYPE */}
          {step === 1 && (
            <div>
              <div className="v2-field" style={{ marginBottom: 24 }}>
                <span className="v2-label">Property category</span>
                <div className="v2-choices" role="group">
                  <button
                    type="button"
                    className={`v2-choice ${category === 'residential' ? 'active' : ''}`}
                    onClick={() => {
                      setCategory('residential');
                      setType('Self-contain');
                    }}
                  >
                    <span className="ic">
                      <Home size={22} />
                    </span>
                    <span>
                      <strong>Residential</strong>
                      <span className="d">Self-contains, flats and houses to live in.</span>
                    </span>
                  </button>

                  <button
                    type="button"
                    className={`v2-choice ${category === 'commercial' ? 'active' : ''}`}
                    onClick={() => {
                      setCategory('commercial');
                      setType('Shop');
                    }}
                  >
                    <span className="ic">
                      <Building2 size={22} />
                    </span>
                    <span>
                      <strong>Commercial</strong>
                      <span className="d">Shops and offices for businesses.</span>
                    </span>
                  </button>
                </div>
              </div>

              <div className="v2-field">
                <span className="v2-label">Property type</span>
                <div className="v2-chips" role="group">
                  {(category === 'commercial' ? COMMERCIAL_TYPES : RESIDENTIAL_TYPES).map((t) => (
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
                <p className="v2-wiz-hint">{currentMissing}</p>
                <div className="v2-wiz-btns">
                  <button
                    type="button"
                    className="v2-btn v2-btn-primary"
                    disabled={Boolean(currentMissing)}
                    onClick={() => setStep(2)}
                  >
                    Continue
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: DETAILS */}
          {step === 2 && (
            <div>
              <div className="v2-form-grid two">
                {/* Title */}
                <div className="v2-field v2-span-2">
                  <label className="v2-label" htmlFor="v2-title">Listing title</label>
                  <input
                    id="v2-title"
                    className="v2-input"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. 2-Bedroom Self-Contain, Bodija"
                    autoComplete="off"
                  />
                </div>

                {/* Price */}
                <div className="v2-field">
                  <label className="v2-label" htmlFor="v2-price">Yearly rent (₦)</label>
                  <input
                    id="v2-price"
                    className="v2-input"
                    type="number"
                    min="0"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="e.g. 850000"
                  />
                  <span className="v2-hint">
                    {Number(price) > 0
                      ? `${formatNaira(Number(price))} per year`
                      : 'Rent for one year, in naira.'}
                  </span>
                </div>

                {/* Area */}
                <div className="v2-field">
                  <label className="v2-label" htmlFor="v2-area">Area in Ibadan</label>
                  <select
                    id="v2-area"
                    className="v2-select"
                    value={area}
                    onChange={(e) => setArea(e.target.value)}
                  >
                    <option value="">Select an area</option>
                    {IBADAN_AREAS.filter((a) => a !== 'All Ibadan areas').map((a) => (
                      <option key={a} value={a}>
                        {a}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Rooms / Floor Size */}
                <div className="v2-field v2-span-2">
                  <label className="v2-label" htmlFor="v2-rooms">
                    {category === 'commercial' ? 'Floor size' : 'Rooms'}{' '}
                    <span className="v2-opt">(optional)</span>
                  </label>
                  <input
                    id="v2-rooms"
                    className="v2-input"
                    value={rooms}
                    onChange={(e) => setRooms(e.target.value)}
                    placeholder={
                      category === 'commercial'
                        ? 'e.g. 240 sq ft or 3 rooms + reception'
                        : 'e.g. 2 bedrooms'
                    }
                    autoComplete="off"
                  />
                </div>

                {/* Description */}
                <div className="v2-field v2-span-2">
                  <label className="v2-label" htmlFor="v2-desc">
                    Description <span className="v2-opt">(optional)</span>
                  </label>
                  <textarea
                    id="v2-desc"
                    className="v2-textarea"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Layout, condition, nearby landmarks"
                  />
                </div>

                {/* Amenities */}
                <div className="v2-field v2-span-2">
                  <span className="v2-label">
                    Amenities <span className="v2-opt">(optional)</span>
                  </span>
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
                </div>
              </div>

              {/* Step 2 Foot */}
              <div className="v2-wiz-foot">
                <p className="v2-wiz-hint">
                  {currentMissing || 'Changes are saved on this device as you go.'}
                </p>
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
                    Continue
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: PHOTOS */}
          {step === 3 && (
            <div>
              <p className="v2-lede" style={{ marginBottom: 14 }}>
                {isEditing
                  ? 'Add or remove photos. Bright, uncluttered shots of the main rooms help renters decide. The first photo is the cover.'
                  : `Add at least ${MIN_PHOTOS} photos. Bright, uncluttered shots of the main rooms help renters decide. The first photo is the cover.`}
              </p>

              {/* Progress Bar */}
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
                  <div key={i} className="v2-ph">
                    <img src={url} alt={`Listing photo ${i + 1}`} />
                    {i === 0 && <span className="v2-ph-tag">Cover</span>}
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
                  <label className="v2-ph v2-ph-add">
                    <Camera size={22} />
                    <span>Add photos</span>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      style={{ display: 'none' }}
                      onChange={handlePhotoUpload}
                    />
                  </label>
                )}
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginTop: 12,
                  flexWrap: 'wrap',
                  gap: 8
                }}
              >
                <p className="v2-hint" style={{ margin: 0 }}>
                  {photos.length} added
                  {!isEditing ? `, ${MIN_PHOTOS} needed` : ''}. Up to {MAX_PHOTOS}.
                </p>

                {photos.length < MIN_PHOTOS && (
                  <button
                    type="button"
                    className="v2-btn v2-btn-ghost v2-btn-sm"
                    onClick={handleAddSamplePhotos}
                    style={{ fontSize: '0.8rem' }}
                  >
                    <Plus size={14} />
                    <span>Insert sample photos</span>
                  </button>
                )}
              </div>

              {/* Step 3 Foot */}
              <div className="v2-wiz-foot">
                <p className="v2-wiz-hint">{currentMissing}</p>
                <div className="v2-wiz-btns">
                  <button
                    type="button"
                    className="v2-btn v2-btn-secondary"
                    onClick={() => setStep(2)}
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    className="v2-btn v2-btn-primary"
                    disabled={Boolean(currentMissing)}
                    onClick={() => setStep(4)}
                  >
                    Continue
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: REVIEW & SAVE */}
          {step === 4 && (
            <div>
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

              {/* Details Preview */}
              <div style={{ marginTop: 20 }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--ink)', margin: 0 }}>
                  {title || 'Untitled listing'}
                </h3>

                <div className="v2-price-big" style={{ marginTop: 6 }}>
                  {formatNaira(Number(price) || 0)} <small>per year</small>
                </div>

                <dl className="v2-facts">
                  <div>
                    <dt>Type</dt>
                    <dd>{type}</dd>
                  </div>
                  <div>
                    <dt>{category === 'commercial' ? 'Floor size' : 'Rooms'}</dt>
                    <dd>{rooms || 'Not specified'}</dd>
                  </div>
                  <div>
                    <dt>Area</dt>
                    <dd>{area}</dd>
                  </div>
                </dl>

                {description && (
                  <p style={{ color: 'var(--ink)', fontSize: '0.9rem', marginBottom: 14, lineHeight: 1.5 }}>
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
                >
                  Edit category
                </button>
                <button
                  type="button"
                  className="v2-btn v2-btn-secondary v2-btn-sm"
                  onClick={() => setStep(2)}
                >
                  Edit details
                </button>
                <button
                  type="button"
                  className="v2-btn v2-btn-secondary v2-btn-sm"
                  onClick={() => setStep(3)}
                >
                  Edit photos
                </button>
              </div>

              {/* Info Note */}
              <div className="v2-note">
                <Info size={18} />
                <p style={{ margin: 0 }}>
                  {isEditing
                    ? 'Your changes go live as soon as you save.'
                    : 'Your listing goes live as soon as you publish. You can request a verification inspection any time from the Verification page.'}
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
                      ? 'Saving…'
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
