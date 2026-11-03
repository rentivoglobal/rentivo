import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  MapPin,
  Tag,
  Home,
  User,
  Phone,
  MessageSquare,
  Sparkles,
  Zap,
  Droplet,
  Shield,
  Car,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Send,
  Eye
} from 'lucide-react';
import { Listing } from '../types';
import { formatNaira } from '../utils/formatters';

interface ListingModerationModalProps {
  isOpen: boolean;
  listing: Listing | null;
  onClose: () => void;
  onApprove: (listingId: string) => Promise<void>;
  onReject: (listingId: string, reason: string, notes: string) => Promise<void>;
}

const PRESET_REJECTION_REASONS = [
  'Blurry or unverified photos',
  'Non-market or unrealistic pricing',
  'Incomplete Ibadan address or landmarks',
  'Unverified landlord mandate',
  'Duplicate property listing',
  'Violates Rentivo content guidelines'
];

export const ListingModerationModal: React.FC<ListingModerationModalProps> = ({
  isOpen,
  listing,
  onClose,
  onApprove,
  onReject
}) => {
  const [activePhotoIdx, setActivePhotoIdx] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rejectMode, setRejectMode] = useState(false);
  const [selectedReason, setSelectedReason] = useState(PRESET_REJECTION_REASONS[0]);
  const [rejectionNotes, setRejectionNotes] = useState('');
  const [activeSection, setActiveSection] = useState<'gallery' | 'details' | 'lister' | 'decision'>('gallery');
  const modalBodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setActivePhotoIdx(0);
      setRejectMode(false);
      setRejectionNotes('');
      setSelectedReason(PRESET_REJECTION_REASONS[0]);
    }
  }, [isOpen, listing]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape' && !isSubmitting) {
        onClose();
      } else if (e.key === 'ArrowRight' && listing && listing.photos.length > 1) {
        setActivePhotoIdx((prev) => (prev + 1) % listing.photos.length);
      } else if (e.key === 'ArrowLeft' && listing && listing.photos.length > 1) {
        setActivePhotoIdx((prev) => (prev - 1 + listing.photos.length) % listing.photos.length);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSubmitting, listing, onClose]);

  if (!isOpen || !listing) return null;

  const photos = listing.photos && listing.photos.length > 0
    ? listing.photos
    : ['https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1000&q=80'];

  const handleApproveClick = async () => {
    try {
      setIsSubmitting(true);
      await onApprove(listing.id);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRejectClick = async () => {
    if (!rejectionNotes.trim()) {
      setRejectionNotes(selectedReason);
    }
    try {
      setIsSubmitting(true);
      await onReject(listing.id, selectedReason, rejectionNotes.trim() || selectedReason);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const scrollToAnchor = (id: string, section: 'gallery' | 'details' | 'lister' | 'decision') => {
    setActiveSection(section);
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px'
      }}
    >
      {/* Blurred Backdrop */}
      <div
        onClick={() => !isSubmitting && onClose()}
        style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 82, 0.65)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          transition: 'opacity 0.2s ease'
        }}
      />

      {/* Centered Modal Card */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: '860px',
          maxHeight: '92vh',
          backgroundColor: '#FFFFFF',
          borderRadius: '24px',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 82, 0.35), 0 0 0 1px rgba(0, 0, 82, 0.08)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          zIndex: 10000
        }}
      >
        {/* Sticky Header */}
        <div
          style={{
            padding: '16px 24px',
            backgroundColor: '#000052',
            color: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            flexShrink: 0
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 800,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                backgroundColor: 'rgba(190, 137, 255, 0.25)',
                color: '#BE89FF',
                padding: '4px 10px',
                borderRadius: '999px',
                flexShrink: 0
              }}
            >
              Moderation Review
            </span>
            <div style={{ minWidth: 0 }}>
              <h2
                style={{
                  margin: 0,
                  fontSize: '16px',
                  fontWeight: 800,
                  color: '#FFFFFF',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}
              >
                {listing.title}
              </h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'rgba(255, 255, 255, 0.75)', marginTop: '2px' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                  <MapPin size={12} color="#BE89FF" /> {listing.area}, Ibadan
                </span>
                <span>&bull;</span>
                <span style={{ fontWeight: 700, color: '#BE89FF' }}>
                  ₦{formatNaira(listing.price)}
                </span>
                <span style={{ opacity: 0.6 }}>/ {listing.pricePeriod === 'per_month' ? 'month' : 'year'}</span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                padding: '4px 10px',
                borderRadius: '999px',
                backgroundColor: listing.isAvailable ? 'rgba(5, 150, 105, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                color: listing.isAvailable ? '#6EE7B7' : '#FCA5A5',
                border: `1px solid ${listing.isAvailable ? 'rgba(5, 150, 105, 0.4)' : 'rgba(239, 68, 68, 0.4)'}`
              }}
            >
              {listing.isAvailable ? 'Available' : 'Occupied'}
            </span>

            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              aria-label="Close modal"
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.12)',
                border: 'none',
                color: '#FFFFFF',
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'background-color 0.15s ease'
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.25)')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.12)')}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Anchor Navigation Bar */}
        <div
          style={{
            backgroundColor: '#F8FAFC',
            borderBottom: '1px solid #E2E8F0',
            padding: '8px 24px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            overflowX: 'auto',
            flexShrink: 0
          }}
        >
          {[
            { id: 'gallery', label: '1. Photo Evidence', anchor: 'moderation-gallery' },
            { id: 'details', label: '2. Specifications & Reality', anchor: 'moderation-details' },
            { id: 'lister', label: '3. Lister & Mandate', anchor: 'moderation-lister' },
            { id: 'decision', label: '4. Decision Console', anchor: 'moderation-decision' }
          ].map((tab) => {
            const isActive = activeSection === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => scrollToAnchor(tab.anchor, tab.id as never)}
                style={{
                  padding: '6px 14px',
                  borderRadius: '999px',
                  fontSize: '12px',
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'pointer',
                  backgroundColor: isActive ? '#000052' : '#FFFFFF',
                  color: isActive ? '#FFFFFF' : '#475569',
                  boxShadow: isActive ? '0 2px 6px rgba(0, 0, 82, 0.2)' : '0 1px 2px rgba(0, 0, 0, 0.05)',
                  transition: 'all 0.15s ease',
                  whiteSpace: 'nowrap'
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Modal Scrollable Body */}
        <div
          ref={modalBodyRef}
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '24px',
            backgroundColor: '#FFFFFF'
          }}
        >
          {/* SECTION 1: PHOTO EVIDENCE */}
          <div id="moderation-gallery" style={{ scrollMarginTop: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Eye size={16} color="#000052" />
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#000052' }}>
                  Property Photos & Field Documentation
                </h3>
              </div>
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748B' }}>
                Photo {activePhotoIdx + 1} of {photos.length}
              </span>
            </div>

            {/* Main Stage Image */}
            <div
              style={{
                position: 'relative',
                width: '100%',
                height: '340px',
                backgroundColor: '#0F172A',
                borderRadius: '16px',
                overflow: 'hidden',
                boxShadow: '0 4px 14px rgba(0, 0, 0, 0.08)'
              }}
            >
              <img
                src={photos[activePhotoIdx]}
                alt={`Property photo ${activePhotoIdx + 1}`}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain'
                }}
              />

              {photos.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() => setActivePhotoIdx((prev) => (prev - 1 + photos.length) % photos.length)}
                    aria-label="Previous photo"
                    style={{
                      position: 'absolute',
                      left: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      backgroundColor: 'rgba(0, 0, 82, 0.75)',
                      color: '#FFFFFF',
                      border: 'none',
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer'
                    }}
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setActivePhotoIdx((prev) => (prev + 1) % photos.length)}
                    aria-label="Next photo"
                    style={{
                      position: 'absolute',
                      right: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      backgroundColor: 'rgba(0, 0, 82, 0.75)',
                      color: '#FFFFFF',
                      border: 'none',
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer'
                    }}
                  >
                    <ChevronRight size={20} />
                  </button>
                </>
              )}
            </div>

            {/* Thumbnails Rail */}
            {photos.length > 1 && (
              <div
                style={{
                  display: 'flex',
                  gap: '8px',
                  marginTop: '10px',
                  overflowX: 'auto',
                  paddingBottom: '4px'
                }}
              >
                {photos.map((src, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setActivePhotoIdx(i)}
                    style={{
                      flexShrink: 0,
                      width: '64px',
                      height: '48px',
                      borderRadius: '8px',
                      overflow: 'hidden',
                      border: activePhotoIdx === i ? '2px solid #000052' : '2px solid transparent',
                      opacity: activePhotoIdx === i ? 1 : 0.65,
                      cursor: 'pointer',
                      padding: 0,
                      backgroundColor: '#E2E8F0'
                    }}
                  >
                    <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* SECTION 2: SPECIFICATIONS & NIGERIAN REALITY */}
          <div id="moderation-details" style={{ scrollMarginTop: '16px' }}>
            <h3 style={{ margin: '0 0 12px', fontSize: '15px', fontWeight: 800, color: '#000052', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Home size={16} color="#000052" /> Specifications &amp; Amenities
            </h3>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '12px',
                marginBottom: '16px'
              }}
            >
              <div style={{ backgroundColor: '#F8FAFC', padding: '12px 14px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                <span style={{ fontSize: '11px', color: '#64748B', display: 'block', fontWeight: 600 }}>Property Type</span>
                <span style={{ fontSize: '14px', fontWeight: 700, color: '#000052', marginTop: '2px', display: 'block' }}>
                  {listing.type} ({listing.category})
                </span>
              </div>
              <div style={{ backgroundColor: '#F8FAFC', padding: '12px 14px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                <span style={{ fontSize: '11px', color: '#64748B', display: 'block', fontWeight: 600 }}>Rent Price</span>
                <span style={{ fontSize: '14px', fontWeight: 700, color: '#059669', marginTop: '2px', display: 'block' }}>
                  ₦{formatNaira(listing.price)} / {listing.pricePeriod === 'per_month' ? 'month' : 'year'}
                </span>
              </div>
              <div style={{ backgroundColor: '#F8FAFC', padding: '12px 14px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                <span style={{ fontSize: '11px', color: '#64748B', display: 'block', fontWeight: 600 }}>Rooms / Baths</span>
                <span style={{ fontSize: '14px', fontWeight: 700, color: '#000052', marginTop: '2px', display: 'block' }}>
                  {listing.bedrooms ?? '—'} Beds &bull; {listing.bathrooms ?? '—'} Baths
                </span>
              </div>
              <div style={{ backgroundColor: '#F8FAFC', padding: '12px 14px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                <span style={{ fontSize: '11px', color: '#64748B', display: 'block', fontWeight: 600 }}>Location</span>
                <span style={{ fontSize: '14px', fontWeight: 700, color: '#000052', marginTop: '2px', display: 'block' }}>
                  {listing.area}, Ibadan
                </span>
              </div>
            </div>

            {/* Address Summary */}
            <div style={{ backgroundColor: '#F8FAFC', padding: '12px 16px', borderRadius: '12px', border: '1px solid #E2E8F0', marginBottom: '16px' }}>
              <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Public Address / Landmark</span>
              <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#1E293B', lineHeight: 1.5 }}>
                {listing.addressDescription || 'Address details registered in Ibadan.'}
              </p>
            </div>

            {/* Amenities Tags */}
            <div style={{ marginBottom: '16px' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#000052', display: 'block', marginBottom: '8px' }}>
                Claimed Amenities &amp; Features ({listing.amenities?.length || 0})
              </span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {listing.amenities && listing.amenities.length > 0 ? (
                  listing.amenities.map((amenity, idx) => (
                    <span
                      key={idx}
                      style={{
                        fontSize: '12px',
                        fontWeight: 600,
                        backgroundColor: '#EEF2FF',
                        color: '#4338CA',
                        border: '1px solid #E0E7FF',
                        padding: '4px 10px',
                        borderRadius: '999px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px'
                      }}
                    >
                      <Sparkles size={11} color="#6366F1" /> {amenity}
                    </span>
                  ))
                ) : (
                  <span style={{ fontSize: '12.5px', color: '#94A3B8' }}>No specific amenities listed.</span>
                )}
              </div>
            </div>

            {/* Description Card */}
            <div>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#000052', display: 'block', marginBottom: '6px' }}>
                Lister Property Description
              </span>
              <div
                style={{
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  borderRadius: '12px',
                  padding: '14px',
                  fontSize: '13px',
                  color: '#334155',
                  lineHeight: 1.6,
                  maxHeight: '120px',
                  overflowY: 'auto'
                }}
              >
                {listing.description || 'No description provided by lister.'}
              </div>
            </div>
          </div>

          {/* SECTION 3: LISTER & MANDATE */}
          <div id="moderation-lister" style={{ scrollMarginTop: '16px' }}>
            <h3 style={{ margin: '0 0 12px', fontSize: '15px', fontWeight: 800, color: '#000052', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <User size={16} color="#000052" /> Lister Profile &amp; Contact
            </h3>

            <div
              style={{
                backgroundColor: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: '16px',
                padding: '16px 20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '16px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    backgroundColor: '#000052',
                    color: '#BE89FF',
                    fontWeight: 800,
                    fontSize: '18px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  {(listing.lister?.fullName || 'L')[0]}
                </div>
                <div>
                  <div style={{ fontSize: '15px', fontWeight: 800, color: '#000052' }}>
                    {listing.lister?.fullName || 'Verified Lister'}
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
                    {listing.listerRole ? (listing.listerRole === 'landlord' ? 'Direct Landlord' : 'Property Agent') : 'Lister'} &bull; Member since {listing.lister?.memberSince || '2024'}
                  </div>
                </div>
              </div>

              {listing.lister?.phone && (
                <div style={{ display: 'flex', gap: '8px' }}>
                  <a
                    href={`tel:${listing.lister.phone.replace(/\s/g, '')}`}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #CBD5E1',
                      padding: '8px 14px',
                      borderRadius: '8px',
                      fontSize: '12px',
                      fontWeight: 700,
                      color: '#000052',
                      textDecoration: 'none'
                    }}
                  >
                    <Phone size={13} /> {listing.lister.phone}
                  </a>
                  <a
                    href={`https://wa.me/${listing.lister.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Hello ${listing.lister.fullName}, this is Rentivo Admin regarding your listing "${listing.title}".`)}`}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      backgroundColor: '#ECFDF5',
                      border: '1px solid #A7F3D0',
                      padding: '8px 14px',
                      borderRadius: '8px',
                      fontSize: '12px',
                      fontWeight: 700,
                      color: '#065F46',
                      textDecoration: 'none'
                    }}
                  >
                    <MessageSquare size={13} /> WhatsApp
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* SECTION 4: DECISION CONSOLE */}
          <div
            id="moderation-decision"
            style={{
              scrollMarginTop: '16px',
              backgroundColor: '#F8FAFC',
              border: '1px solid #E2E8F0',
              borderRadius: '16px',
              padding: '20px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldCheck size={18} color="#000052" />
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#000052' }}>
                  Moderation Decision
                </h3>
              </div>
              <span style={{ fontSize: '12px', color: '#64748B' }}>
                Publishing to Rentivo Ibadan Marketplace
              </span>
            </div>

            {!rejectMode ? (
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={handleApproveClick}
                  disabled={isSubmitting}
                  style={{
                    flex: '1 1 200px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    backgroundColor: '#059669',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '12px',
                    padding: '14px 20px',
                    fontSize: '14px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(5, 150, 105, 0.25)',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#047857')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#059669')}
                >
                  <CheckCircle2 size={18} />
                  <span>{isSubmitting ? 'Approving…' : 'Approve & Publish Listing'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setRejectMode(true)}
                  disabled={isSubmitting}
                  style={{
                    flex: '1 1 180px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    backgroundColor: '#FEF2F2',
                    color: '#DC2626',
                    border: '1px solid #FECACA',
                    borderRadius: '12px',
                    padding: '14px 20px',
                    fontSize: '14px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#FEE2E2')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#FEF2F2')}
                >
                  <AlertTriangle size={18} />
                  <span>Reject / Request Changes</span>
                </button>
              </div>
            ) : (
              <div
                style={{
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #FECDD3',
                  borderRadius: '14px',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <AlertTriangle size={16} color="#DC2626" />
                    <span style={{ fontSize: '13px', fontWeight: 800, color: '#991B1B' }}>
                      Rejection &amp; Correction Reason
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setRejectMode(false)}
                    style={{ background: 'none', border: 'none', fontSize: '12px', fontWeight: 600, color: '#64748B', cursor: 'pointer' }}
                  >
                    Cancel
                  </button>
                </div>

                <div>
                  <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px' }}>
                    Select Common Rejection Reason
                  </span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {PRESET_REJECTION_REASONS.map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => {
                          setSelectedReason(r);
                          if (!rejectionNotes) setRejectionNotes(r);
                        }}
                        style={{
                          fontSize: '11px',
                          fontWeight: 600,
                          padding: '4px 10px',
                          borderRadius: '999px',
                          border: selectedReason === r ? '1px solid #DC2626' : '1px solid #E2E8F0',
                          backgroundColor: selectedReason === r ? '#FEF2F2' : '#F8FAFC',
                          color: selectedReason === r ? '#DC2626' : '#475569',
                          cursor: 'pointer'
                        }}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '11.5px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px' }}>
                    Specific Feedback for Lister
                  </label>
                  <textarea
                    rows={3}
                    value={rejectionNotes}
                    onChange={(e) => setRejectionNotes(e.target.value)}
                    placeholder="Provide constructive feedback (e.g., please provide clear daylight photos of bathroom and kitchen, or confirm exact street in Bodija)..."
                    style={{
                      width: '100%',
                      borderRadius: '8px',
                      border: '1px solid #CBD5E1',
                      padding: '8px 12px',
                      fontSize: '12.5px',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setRejectMode(false)}
                    disabled={isSubmitting}
                    style={{
                      backgroundColor: '#F1F5F9',
                      border: '1px solid #CBD5E1',
                      borderRadius: '8px',
                      padding: '8px 16px',
                      fontSize: '12px',
                      fontWeight: 700,
                      color: '#475569',
                      cursor: 'pointer'
                    }}
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={handleRejectClick}
                    disabled={isSubmitting}
                    style={{
                      backgroundColor: '#DC2626',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '8px 18px',
                      fontSize: '12px',
                      fontWeight: 700,
                      color: '#FFFFFF',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <Send size={13} />
                    <span>{isSubmitting ? 'Submitting…' : 'Confirm Rejection'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
