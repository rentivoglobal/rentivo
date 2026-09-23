import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Share2,
  Heart,
  ChevronLeft,
  ChevronRight,
  X,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { Listing, AccessRequest } from '../types';
import { formatNaira } from '../utils/formatters';
import { reportsService } from '../services/reportsService';
import { requestsService } from '../services/requestsService';
import { listingsService } from '../services/listingsService';
import { authService } from '../services/authService';
import { useAuth } from '../contexts/AuthContext';
import { RequestConfirmationModal } from '../components/RequestConfirmationModal';
import '../styles/property-detail.css';

interface PropertyDetailPageProps {
  listing: Listing;
  isFavorite: boolean;
  onToggleFavorite: (id: string) => void;
  onBack: () => void;
  onRequestAccess?: (listing: Listing) => void;
  similarListings?: Listing[];
  onSelectListing?: (listing: Listing) => void;
}

const DEFAULT_ROOM_LABELS = [
  'Living room',
  'Master bedroom',
  'Kitchen',
  'Exterior',
  'Bathroom',
  'Compound'
];

const DEFAULT_GRADIENTS = [
  'linear-gradient(135deg,#000052,#7c3fd6)',
  'linear-gradient(135deg,#20206e,#be89ff)',
  'linear-gradient(135deg,#3d2e7c,#c9852e)',
  'linear-gradient(135deg,#000052,#1e8e5a)',
  'linear-gradient(135deg,#4a2f7a,#be89ff)',
  'linear-gradient(135deg,#000052,#d6455b)'
];

// Distinct SVG icons per amenity matching rentivo-property-detail-v3 (1).html
const AMENITY_ICON_DEFS = [
  { k: ['meter', 'prepaid', 'light'], path: 'M13 2 3 14h7l-1 8 11-14h-7z' },
  { k: ['water', 'borehole'], path: 'M12 2s6 7 6 11a6 6 0 1 1-12 0c0-4 6-11 6-11Z' },
  { k: ['security', 'cctv', 'guard'], path: 'M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6z M9 12l2 2 4-4' },
  { k: ['fenced', 'gated', 'compound', 'fence', 'gate'], path: 'M4 21V9M9 21V6M14 21V9M19 21V6M2 9l7-4 7 4M12 9l7-4' },
  { k: ['road', 'tarred', 'access'], path: 'M6 3 3 21M18 3l3 18M11 8h2M10 13h4M9 18h6' },
  { k: ['parking', 'garage'], custom: 'parking' },
  { k: ['inverter', 'backup', 'solar', 'generator'], custom: 'inverter' },
  { k: ['tiled', 'floor', 'tile'], custom: 'tiles' },
  { k: ['kitchen', 'cabinet'], path: 'M3 3v18M21 3v18M3 8h18M7 3v5M11 3v5M15 3v5M19 3v5' }
];

function renderAmenitySvg(name: string) {
  const lower = name.toLowerCase();
  const found = AMENITY_ICON_DEFS.find((item) => item.k.some((keyword) => lower.includes(keyword)));

  if (found?.custom === 'parking') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <rect x="4" y="4" width="16" height="16" rx="2" />
        <path d="M9 16V8h3.5a2.5 2.5 0 0 1 0 5H9" />
      </svg>
    );
  }
  if (found?.custom === 'inverter') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 5H7a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2Z" />
        <path d="M2 10h2M2 14h2M20 10h2M20 14h2M12 8v8" />
      </svg>
    );
  }
  if (found?.custom === 'tiles') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    );
  }
  if (found?.path) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <path d={found.path} />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}

export const PropertyDetailPage: React.FC<PropertyDetailPageProps> = ({
  listing,
  isFavorite,
  onToggleFavorite,
  onBack,
  onRequestAccess: _onRequestAccess,
  similarListings: propSimilarListings,
  onSelectListing
}) => {
  const navigate = useNavigate();
  const { user, refresh } = useAuth();

  const [isSolidHeader, setIsSolidHeader] = useState(false);
  const [activeSlide, setActiveSlide] = useState(0);
  const [isClampedDesc, setIsClampedDesc] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isHeartPopping, setIsHeartPopping] = useState(false);
  const [similarListings, setSimilarListings] = useState<Listing[]>(propSimilarListings || []);

  // Price Count-up Animation
  const [displayPrice, setDisplayPrice] = useState(0);

  useEffect(() => {
    const target = listing.price || 0;
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) {
      setDisplayPrice(target);
      return;
    }
    const start = performance.now();
    const duration = 900;
    let animId: number;
    const step = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplayPrice(Math.round(target * eased));
      if (p < 1) animId = requestAnimationFrame(step);
    };
    animId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animId);
  }, [listing.price]);

  // Existing request detection for current user
  const [existingRequest, setExistingRequest] = useState<AccessRequest | null>(null);

  const checkExistingRequest = useCallback(async () => {
    try {
      const reqs: AccessRequest[] = await requestsService.getRequests();
      const found = reqs.find(
        (r: AccessRequest) =>
          r.listingId === listing.id &&
          ((user?.email && r.renterEmail === user.email) || (user?.phone && r.renterPhone === user.phone))
      );
      setExistingRequest(found || null);
    } catch {
      // Ignored
    }
  }, [listing.id, user?.email, user?.phone]);

  useEffect(() => {
    void checkExistingRequest();
  }, [checkExistingRequest]);

  // Fullscreen Lightbox
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  // Request Confirmation Modal State
  const [isConfirmationModalOpen, setIsConfirmationModalOpen] = useState(false);

  // Request Access Multi-step Sheet State
  const [isRequestSheetOpen, setIsRequestSheetOpen] = useState(false);
  const [guestName, setGuestName] = useState(user?.name || '');
  const [guestEmail, setGuestEmail] = useState(user?.email || '');
  const [guestPhone, setGuestPhone] = useState(user?.phone || '');
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);
  const [createdRequestId, setCreatedRequestId] = useState<string | null>(null);

  // Report Modal State
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState<string>('Fake or duplicated listing');
  const [reportDetails, setReportDetails] = useState('');

  const galleryTrackRef = useRef<HTMLDivElement>(null);
  const galleryWrapRef = useRef<HTMLDivElement>(null);
  const pageContainerRef = useRef<HTMLDivElement>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2600);
  };

  // Sync guest inputs with user changes
  useEffect(() => {
    if (user) {
      if (!guestName) setGuestName(user.name);
      if (!guestEmail) setGuestEmail(user.email);
      if (!guestPhone && user.phone) setGuestPhone(user.phone);
    }
  }, [user, guestName, guestEmail, guestPhone]);

  // Load similar listings
  useEffect(() => {
    if (propSimilarListings && propSimilarListings.length > 0) {
      setSimilarListings(propSimilarListings);
    } else {
      void listingsService.getListings().then((all) => {
        const matches = all.filter((l) => l.id !== listing.id && (l.area === listing.area || l.type === listing.type));
        setSimilarListings(matches.slice(0, 3));
      });
    }
  }, [listing.id, listing.area, listing.type, propSimilarListings]);

  // Scroll detection for sticky solid topbar
  useEffect(() => {
    const handleScroll = () => {
      const threshold = (galleryWrapRef.current?.offsetHeight || 300) - 64;
      setIsSolidHeader(window.scrollY > threshold);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Intersection Observer for scroll reveals
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('in');
            entry.target.querySelectorAll('.amen-item').forEach((el) => el.classList.add('in'));
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 }
    );

    const rootEl = pageContainerRef.current;
    if (rootEl) {
      const targets = rootEl.querySelectorAll('.reveal');
      targets.forEach((t) => observer.observe(t));
    }

    return () => observer.disconnect();
  }, [listing.id]);

  // Lightbox keyboard controls
  useEffect(() => {
    if (lightboxIndex === null) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightboxIndex(null);
      if (e.key === 'ArrowRight') setLightboxIndex((prev) => (prev !== null ? (prev + 1) % slideItems.length : null));
      if (e.key === 'ArrowLeft') setLightboxIndex((prev) => (prev !== null ? (prev - 1 + slideItems.length) % slideItems.length : null));
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxIndex]);

  // Photos & gradients
  const slideItems = useMemo(() => {
    if (listing.photos && listing.photos.length > 0) {
      return listing.photos.map((url, i) => ({
        url,
        label: DEFAULT_ROOM_LABELS[i % DEFAULT_ROOM_LABELS.length],
        gradient: DEFAULT_GRADIENTS[i % DEFAULT_GRADIENTS.length]
      }));
    }
    return DEFAULT_GRADIENTS.map((gradient, i) => ({
      url: undefined,
      label: DEFAULT_ROOM_LABELS[i % DEFAULT_ROOM_LABELS.length],
      gradient
    }));
  }, [listing.photos]);

  const handleScrollGallery = () => {
    if (!galleryTrackRef.current) return;
    const scrollLeft = galleryTrackRef.current.scrollLeft;
    const width = galleryTrackRef.current.clientWidth;
    const index = Math.round(scrollLeft / width);
    setActiveSlide(index);
  };

  const goToSlide = (index: number) => {
    if (!galleryTrackRef.current) return;
    const width = galleryTrackRef.current.clientWidth;
    galleryTrackRef.current.scrollTo({
      left: index * width,
      behavior: 'smooth'
    });
    setActiveSlide(index);
  };

  // Share action
  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${listing.title} — Rentivo`,
          text: `Check out this verified listing in ${listing.area}, Ibadan: ${listing.title}`,
          url: window.location.href
        });
        return;
      } catch {
        // User cancelled share
      }
    }
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(window.location.href);
      }
      showToast('Link copied to clipboard');
    } catch {
      showToast('Link copied to clipboard');
    }
  };

  // Favorite toggle with pulse animation
  const handleFavoriteClick = () => {
    onToggleFavorite(listing.id);
    setIsHeartPopping(true);
    setTimeout(() => setIsHeartPopping(false), 400);
    showToast(!isFavorite ? 'Saved to favorites' : 'Removed from favorites');
  };

  // Request Access Submission
  const handleStartRequest = () => {
    if (existingRequest) {
      setIsConfirmationModalOpen(true);
      return;
    }
    setIsRequestSheetOpen(true);
  };

  const handleGuestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = guestName.trim();
    const email = guestEmail.trim();
    const phone = guestPhone.trim();
    if (!name || !email || !phone) return;
    setIsSubmittingRequest(true);
    await executeCreateRequest(name, email, phone);
    setIsSubmittingRequest(false);
  };

  const handleLoggedInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const phone = guestPhone.trim() || user.phone || '08000000000';
    setIsSubmittingRequest(true);
    await executeCreateRequest(user.name, user.email, phone);
    setIsSubmittingRequest(false);
  };

  const executeCreateRequest = async (name: string, email: string, phone: string) => {
    try {
      if (!user) {
        try {
          await authService.signup({
            fullName: name,
            email,
            phone,
            role: 'tenant'
          });
          await refresh();
        } catch (signupErr) {
          console.warn('Signup note:', signupErr);
        }
      }
      const created = await requestsService.createRequest(listing, { name, email, phone });
      setCreatedRequestId(created.id);
      setExistingRequest(created);
      setIsRequestSheetOpen(false);
      setIsConfirmationModalOpen(true);
    } catch (err) {
      console.error('Request creation error:', err);
    }
  };

  // Report Submission
  const handleSubmitReport = (e: React.FormEvent) => {
    e.preventDefault();
    reportsService.submitReport({
      listingId: listing.id,
      listingTitle: listing.title,
      listingArea: listing.area,
      listingPhoto: listing.photos?.[0] || '',
      listerName: listing.lister?.fullName || 'Lister',
      listerPhone: listing.lister?.phone || '',
      reason: reportReason as any,
      details: reportDetails.trim() || undefined
    });
    setIsReportOpen(false);
    setReportDetails('');
    showToast("Thanks — we'll review this listing");
  };

  const isListerOwner = Boolean(
    user && (
      user.name === listing.lister?.fullName ||
      (user.phone && user.phone === listing.lister?.phone) ||
      ((user.role === 'landlord' || user.role === 'agent') && user.name === listing.lister?.fullName)
    )
  );

  const amenitiesList = listing.amenities && listing.amenities.length > 0
    ? listing.amenities
    : [
        'Prepaid meter',
        'Borehole water',
        'Fenced & gated compound',
        '24hr security',
        'Parking space',
        'Tarred access road',
        'Inverter backup',
        'Tiled floors',
        'Fitted kitchen'
      ];

  return (
    <div className="prop-detail-page" ref={pageContainerRef}>
      {/* -------------------------------------------------------------
          HEADER (FIXED, TRANSITIONS TO SOLID ON SCROLL)
         ------------------------------------------------------------- */}
      <header className={`topbar ${isSolidHeader ? 'solid' : ''}`} id="topbar">
        <button
          type="button"
          className="round-btn"
          onClick={onBack}
          aria-label="Back"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>

        <div className="topbar-title">
          {listing.title} · {formatNaira(listing.price)}/yr
        </div>

        <div className="topbar-right">
          <button
            type="button"
            className="round-btn"
            id="acctBtn"
            onClick={() => {
              if (user) {
                navigate(user.role === 'landlord' || user.role === 'agent' ? '/lister' : '/account/profile');
              } else {
                navigate(`/login?next=${encodeURIComponent(window.location.pathname)}`);
              }
            }}
            aria-label="Account"
            title={user ? `Signed in as ${user.name}` : 'Sign in to Rentivo'}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="8" r="4" />
              <path d="M4 20c0-4 3.6-6 8-6s8 2 8 6" />
            </svg>
            <span className={`acct-dot ${user ? 'live' : ''}`} id="acctDot" />
          </button>

          <button
            type="button"
            className="round-btn"
            id="shareBtn"
            onClick={handleShare}
            aria-label="Share"
          >
            <Share2 />
          </button>

          <button
            type="button"
            className={`round-btn ${isFavorite ? 'on' : ''} ${isHeartPopping ? 'pulse' : ''}`}
            id="saveBtn"
            onClick={handleFavoriteClick}
            aria-label="Save"
          >
            <Heart />
          </button>
        </div>
      </header>

      {/* -------------------------------------------------------------
          GALLERY
         ------------------------------------------------------------- */}
      <div className="gallery entered" id="galleryWrap" ref={galleryWrapRef}>
        <div className="gallery-track" id="track" ref={galleryTrackRef} onScroll={handleScrollGallery}>
          {slideItems.map((item, i) => (
            <div
              key={i}
              className="slide"
              style={{
                background: item.url ? `url(${item.url}) center/cover no-repeat` : item.gradient
              }}
              onClick={() => setLightboxIndex(i)}
              title="Click to view full photo"
            >
              <span className="slide-cap">{item.label}</span>
              <span className="slide-count">
                {i + 1}/{slideItems.length}
              </span>
            </div>
          ))}
        </div>

        {slideItems.length > 1 && (
          <>
            <button
              type="button"
              className="g-arrow"
              style={{ left: 14 }}
              id="arrowL"
              onClick={() => goToSlide(Math.max(0, activeSlide - 1))}
              aria-label="Previous photo"
            >
              <ChevronLeft />
            </button>
            <button
              type="button"
              className="g-arrow"
              style={{ right: 14 }}
              id="arrowR"
              onClick={() => goToSlide(Math.min(slideItems.length - 1, activeSlide + 1))}
              aria-label="Next photo"
            >
              <ChevronRight />
            </button>
          </>
        )}

        {slideItems.length > 1 && (
          <div className="dots" id="dots">
            {slideItems.map((_, i) => (
              <span
                key={i}
                className={`dot ${activeSlide === i ? 'on' : ''}`}
                onClick={() => goToSlide(i)}
              />
            ))}
          </div>
        )}

        {slideItems.length > 1 && (
          <div className="thumb-rail" id="thumbRail">
            {slideItems.map((item, i) => (
              <button
                key={i}
                type="button"
                className={activeSlide === i ? 'on' : ''}
                style={{
                  background: item.url ? `url(${item.url}) center/cover no-repeat` : item.gradient
                }}
                onClick={() => goToSlide(i)}
                aria-label={item.label}
              />
            ))}
          </div>
        )}
      </div>

      {/* -------------------------------------------------------------
          SHELL (CONTENT + DESKTOP STICKY ASIDE)
         ------------------------------------------------------------- */}
      <div className="shell">
        <div>
          {/* Owner Notification Banner */}
          {isListerOwner && (
            <div
              style={{
                background: 'var(--surface-2)',
                border: '1.5px solid var(--lavender-deep)',
                borderRadius: 'var(--r-m)',
                padding: '12px 16px',
                marginBottom: 16,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 12
              }}
            >
              <div>
                <strong style={{ display: 'block', fontSize: '0.88rem' }}>You are viewing your own listing</strong>
                <span style={{ fontSize: '0.78rem', color: 'var(--ink-soft)' }}>
                  Prospective renters view this exact presentation when browsing Rentivo.
                </span>
              </div>
              <button
                type="button"
                className="btn btn-outline"
                style={{ width: 'auto', padding: '6px 14px', fontSize: '0.8rem' }}
                onClick={() => navigate(`/lister/listings/${listing.id}/edit`)}
              >
                Edit listing
              </button>
            </div>
          )}

          {/* Badges Row */}
          <div className="badges-row reveal">
            {listing.verificationStatus === 'verified' && (
              <span className="pill pill-verified">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
                Verified
              </span>
            )}
            <span className="pill pill-cat">
              {listing.category === 'commercial' ? 'Commercial' : 'Residential'} · {listing.type}
            </span>
            <span className="posted-note">Posted 3 days ago</span>
          </div>

          <h1 className="title reveal">{listing.title}</h1>

          <div className="loc-row reveal">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s7-6.5 7-12a7 7 0 1 0-14 0c0 5.5 7 12 7 12z" />
              <circle cx="12" cy="10" r="2.5" />
            </svg>
            {listing.area}, Ibadan
          </div>

          <div className="specs-row reveal">
            <span className="spec">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 18v-6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v6" />
                <path d="M3 18h18M5 10V6a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v4" />
              </svg>
              {listing.bedrooms || 1} {(listing.bedrooms || 1) === 1 ? 'bedroom' : 'bedrooms'}
            </span>
            <span className="spec">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 12h16M6 12V6a2 2 0 0 1 4 0M4 16a4 4 0 0 0 4 4h8a4 4 0 0 0 4-4" />
              </svg>
              {listing.bathrooms || 1} {(listing.bathrooms || 1) === 1 ? 'bathroom' : 'bathrooms'}
            </span>
            <span className="spec">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z" />
              </svg>
              {listing.areaSqm || 120} sqm
            </span>
          </div>

          <div className="divider" />

          {/* Section: About this property */}
          <div className="section reveal">
            <h2>About this property</h2>
            <div className="desc-wrap">
              <p className={`desc-text ${isClampedDesc ? 'clamped' : ''}`} id="descText">
                {listing.description ||
                  'Bright, well-ventilated self-contain with reliable prepaid metering and a working inverter setup. Located on a quiet, tarred street off Awolowo Avenue, a short walk from Bodija market and the main road for easy transport access. The compound is fenced and gated with round-the-clock security, and parking is available within the compound. Recently repainted with tiled floors throughout and fitted kitchen cabinets. Ideal for a young professional or small family looking for a secure, low-stress move-in.'}
              </p>
            </div>
            <button
              type="button"
              className="more-link"
              id="moreBtn"
              onClick={() => setIsClampedDesc(!isClampedDesc)}
            >
              {isClampedDesc ? 'Read more' : 'Show less'}
            </button>
          </div>

          <div className="divider" />

          {/* Section: What this place offers */}
          <div className="section reveal">
            <h2>
              What this place offers <span className="count" id="amenCount">({amenitiesList.length})</span>
            </h2>
            <div className="amen-grid" id="amenGrid">
              {amenitiesList.map((amenity, i) => (
                <div key={i} className="amen-item in" style={{ transitionDelay: `${i * 45}ms` }}>
                  <span className="ic">{renderAmenitySvg(amenity)}</span>
                  <span>{amenity}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="divider" />

          {/* Section: Location */}
          <div className="section reveal">
            <h2>Location</h2>
            <div className="map-card">
              <div className="map-visual">
                <svg className="roads" viewBox="0 0 400 170" preserveAspectRatio="none">
                  <path d="M0 60 L400 40" stroke="var(--ink-faint)" strokeWidth="3" fill="none" />
                  <path d="M40 0 L60 170" stroke="var(--ink-faint)" strokeWidth="2" fill="none" />
                  <path d="M0 130 L400 150" stroke="var(--ink-faint)" strokeWidth="2" fill="none" />
                  <path d="M300 0 L320 170" stroke="var(--ink-faint)" strokeWidth="2" fill="none" />
                </svg>
                <div className="map-pin">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 22s7-6.5 7-12a7 7 0 1 0-14 0c0 5.5 7 12 7 12z" />
                    <circle cx="12" cy="10" r="3" fill="var(--surface)" />
                  </svg>
                </div>
              </div>
              <div className="map-note">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <rect x="5" y="10" width="14" height="10" rx="2" />
                  <path d="M8 10V7a4 4 0 0 1 8 0v3" />
                </svg>
                <span style={{ flex: 1 }}>
                  {listing.area}, Ibadan — the exact address is shared once your access request is confirmed.
                </span>
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                    listing.area + ', Ibadan, Nigeria'
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    color: 'var(--lavender-deep)',
                    fontWeight: 700,
                    fontSize: '0.78rem',
                    flexShrink: 0
                  }}
                >
                  <span>Explore area</span>
                  <ExternalLink size={12} />
                </a>
              </div>
            </div>
          </div>

          <div className="divider" />

          {/* Section: Landlord */}
          <div className="section reveal">
            <h2>Landlord</h2>
            <div className="lister-card">
              <div className="lister-avatar" aria-hidden="true">
                {listing.lister?.avatarUrl ? (
                  <img
                    src={listing.lister.avatarUrl}
                    alt={listing.lister.fullName}
                    style={{ width: '100%', height: '100%', borderRadius: 99, objectFit: 'cover' }}
                  />
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: 20, height: 20 }}>
                    <rect x="5" y="11" width="14" height="10" rx="2" />
                    <path d="M8 11V7a4 4 0 0 1 8 0v4" />
                  </svg>
                )}
              </div>
              <div style={{ flex: 1 }}>
                <div className="lister-name">
                  {existingRequest?.status === 'paid'
                    ? listing.lister?.fullName || 'Verified Landlord'
                    : `On Rentivo since ${listing.lister?.memberSince || 'Feb 2026'}`}
                </div>
                <div className="lister-meta">
                  {listing.lister?.activeListingsCount || 4} active listings · usually responds within a few hours
                </div>
              </div>
            </div>
            <p className="lister-privacy-note">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="5" y="11" width="14" height="10" rx="2" />
                <path d="M8 11V7a4 4 0 0 1 8 0v4" />
              </svg>
              Name and contact details are kept private until your access request is confirmed — this protects both of you before anything is agreed.
            </p>
          </div>

          {/* Report Button */}
          <div className="report-row reveal">
            <button
              type="button"
              className="report-btn"
              id="reportBtn"
              onClick={() => setIsReportOpen(true)}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 15V4M4 4h11l-1.5 3L15 10H4" />
              </svg>
              Report this listing
            </button>
          </div>

          {/* Similar Listings */}
          {similarListings.length > 0 && (
            <>
              <h2 className="sim-heading reveal">Similar listings in {listing.area}</h2>
              <div className="sim-grid reveal" id="simGrid">
                {similarListings.map((s) => (
                  <div
                    key={s.id}
                    className="sim-card"
                    onClick={() => {
                      if (onSelectListing) onSelectListing(s);
                      else {
                        navigate(`/listings/${s.id}`);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }
                    }}
                  >
                    <div
                      className="sim-thumb"
                      style={{
                        background: s.photos?.[0]
                          ? `url(${s.photos[0]}) center/cover no-repeat`
                          : 'linear-gradient(135deg,#000052,#7c3fd6)'
                      }}
                    >
                      {!s.photos?.[0] && (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M3 11l9-8 9 8" />
                          <path d="M5 10v10h14V10" />
                        </svg>
                      )}
                    </div>
                    <div className="sim-body">
                      <div className="sim-title">{s.title}</div>
                      <div className="sim-meta">
                        {s.area}
                        {s.verificationStatus === 'verified' ? ' · Verified' : ''}
                      </div>
                      <div className="sim-price">
                        {formatNaira(s.price)}{' '}
                        <span style={{ color: 'var(--ink-faint)', fontWeight: 600 }}>/yr</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* -------------------------------------------------------------
            ASIDE (DESKTOP STICKY CTA)
           ------------------------------------------------------------- */}
        <aside className="aside">
          <div className="price-big">
            <span id="priceNum">{formatNaira(displayPrice || listing.price)}</span>{' '}
            <span>/ year</span>
          </div>
          <p className="fee-note">
            Plus a one-time access fee — charged only after the landlord confirms this property is still available.
          </p>

          {existingRequest ? (
            <div style={{ marginBottom: 16 }}>
              <div className="req-status-banner pending">
                <Clock size={18} style={{ flexShrink: 0, marginTop: 2 }} />
                <div style={{ fontSize: '0.82rem' }}>
                  <strong>
                    {existingRequest.status === 'confirmed'
                      ? 'Availability Confirmed!'
                      : existingRequest.status === 'paid'
                      ? 'Contact Unlocked'
                      : 'Request Awaiting Confirmation'}
                  </strong>
                  <div style={{ color: 'var(--ink-soft)', marginTop: 2 }}>
                    Saved to your portal. View all your requested properties in My Requests.
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => setIsConfirmationModalOpen(true)}
                >
                  View Request Confirmation
                </button>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => navigate('/account/requests')}
                >
                  View in My Requests
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              className="btn btn-accent"
              id="ctaBtn"
              onClick={handleStartRequest}
            >
              Request access
            </button>
          )}

          <ul className="trust-list">
            <li>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                <path d="M20 6L9 17l-5-5" />
              </svg>
              <span>Verified by physical inspection</span>
            </li>
            <li>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                <path d="M20 6L9 17l-5-5" />
              </svg>
              <span>No agent commission — free for the landlord to list</span>
            </li>
            <li>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                <path d="M20 6L9 17l-5-5" />
              </svg>
              <span>You only pay once availability is confirmed</span>
            </li>
          </ul>
        </aside>
      </div>

      {/* -------------------------------------------------------------
          MOBILE STICKY BAR
         ------------------------------------------------------------- */}
      <div className="stickybar">
        <div className="sp">
          <div className="price-big">
            <span id="priceNumMobile">{formatNaira(displayPrice || listing.price)}</span>
            <span> /yr</span>
          </div>
        </div>

        {existingRequest ? (
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setIsConfirmationModalOpen(true)}
              style={{ padding: '0 14px', fontSize: '13.5px' }}
            >
              Confirmation
            </button>
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => navigate('/account/requests')}
              style={{ padding: '0 14px', fontSize: '13.5px' }}
            >
              My Requests
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="btn btn-accent"
            id="ctaBtnMobile"
            onClick={handleStartRequest}
            style={{ flexShrink: 0 }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M13 5l7 7-7 7" />
            </svg>
            Request access
          </button>
        )}
      </div>

      {/* -------------------------------------------------------------
          REQUEST ACCESS MULTI-STEP SHEET
         ------------------------------------------------------------- */}
      {isRequestSheetOpen && (
        <div className="overlay show" id="ovl" onClick={() => setIsRequestSheetOpen(false)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-handle" />



            {!user ? (
              <div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, backgroundColor: 'var(--surface-2)', padding: '3px 10px', borderRadius: 99, fontSize: '0.75rem', fontWeight: 700, color: 'var(--violet)', marginBottom: 8 }}>
                  <ShieldCheck size={14} />
                  <span>Free Renter Account</span>
                </div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: 4 }}>Request access &amp; sign up</h3>
                <p style={{ fontSize: '0.875rem', color: 'var(--ink-2)', marginBottom: 16 }}>
                  Enter your details to create your free account. Your request will be saved to your <strong>My Requests</strong> portal and we will notify you once confirmed.
                </p>

                {/* Property summary mini-pill */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', background: 'var(--surface-2)', borderRadius: 10, marginBottom: 16 }}>
                  <img
                    src={listing.photos?.[0] || 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=600&q=80'}
                    alt=""
                    style={{ width: 44, height: 44, borderRadius: 8, objectFit: 'cover' }}
                  />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.875rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {listing.title}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--ink-2)' }}>
                      {listing.area}, Ibadan · {formatNaira(listing.price)}/yr
                    </div>
                  </div>
                </div>

                <form onSubmit={handleGuestSubmit}>
                  <div className="field">
                    <label>Full name</label>
                    <input
                      className="input"
                      value={guestName}
                      onChange={(e) => setGuestName(e.target.value)}
                      placeholder="e.g. Adeola Johnson"
                      required
                      autoFocus
                    />
                  </div>

                  <div className="field">
                    <label>Email address</label>
                    <input
                      className="input"
                      type="email"
                      value={guestEmail}
                      onChange={(e) => setGuestEmail(e.target.value)}
                      placeholder="you@example.com"
                      required
                    />
                  </div>

                  <div className="field">
                    <label>Phone number</label>
                    <input
                      className="input"
                      type="tel"
                      value={guestPhone}
                      onChange={(e) => setGuestPhone(e.target.value)}
                      placeholder="0803 123 4567"
                      required
                    />
                  </div>

                  <div className="sheet-actions" style={{ marginTop: 18 }}>
                    <button
                      type="submit"
                      className="btn btn-accent"
                      disabled={isSubmittingRequest || !guestName.trim() || !guestEmail.trim() || !guestPhone.trim()}
                      style={{ width: '100%' }}
                    >
                      {isSubmittingRequest ? 'Creating account & sending…' : 'Sign up & request access (Free)'}
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={() => setIsRequestSheetOpen(false)}
                      style={{ width: '100%' }}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: 4 }}>Request property access</h3>
                <p style={{ fontSize: '0.875rem', color: 'var(--ink-2)', marginBottom: 16 }}>
                  Submitting as <strong>{user.name}</strong> ({user.email}). This request will be saved to your <strong>My Requests</strong> portal.
                </p>

                {/* Property summary mini-pill */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', background: 'var(--surface-2)', borderRadius: 10, marginBottom: 16 }}>
                  <img
                    src={listing.photos?.[0] || 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=600&q=80'}
                    alt=""
                    style={{ width: 44, height: 44, borderRadius: 8, objectFit: 'cover' }}
                  />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.875rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {listing.title}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--ink-2)' }}>
                      {listing.area}, Ibadan · {formatNaira(listing.price)}/yr
                    </div>
                  </div>
                </div>

                <form onSubmit={handleLoggedInSubmit}>
                  <div className="field">
                    <label>Phone number for updates</label>
                    <input
                      className="input"
                      type="tel"
                      value={guestPhone || user.phone || ''}
                      onChange={(e) => setGuestPhone(e.target.value)}
                      placeholder="0803 123 4567"
                      required
                    />
                  </div>

                  <div className="sheet-actions" style={{ marginTop: 18 }}>
                    <button
                      type="submit"
                      className="btn btn-accent"
                      disabled={isSubmittingRequest}
                      style={{ width: '100%' }}
                    >
                      {isSubmittingRequest ? 'Sending request…' : 'Send request (Free)'}
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={() => setIsRequestSheetOpen(false)}
                      style={{ width: '100%' }}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}


          </div>
        </div>
      )}

      {/* -------------------------------------------------------------
          REPORT MODAL
         ------------------------------------------------------------- */}
      {isReportOpen && (
        <div className="overlay show" onClick={() => setIsReportOpen(false)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-handle" />
            <h3>Report this listing</h3>
            <p>Let us know what's wrong — our team reviews every report.</p>

            <form onSubmit={handleSubmitReport}>
              {[
                'Fake or duplicated listing',
                'Misleading photos or details',
                'Already rented',
                'Other'
              ].map((reason) => (
                <label key={reason} className="reason-opt">
                  <input
                    type="radio"
                    name="reportReason"
                    checked={reportReason === reason}
                    onChange={() => setReportReason(reason)}
                  />
                  <span>{reason}</span>
                </label>
              ))}

              <textarea
                className="textarea-s"
                value={reportDetails}
                onChange={(e) => setReportDetails(e.target.value)}
                placeholder="Add any details (optional)"
              />

              <div className="sheet-actions" style={{ marginTop: 16 }}>
                <button type="submit" className="btn btn-primary">
                  Submit report
                </button>
                <button type="button" className="btn btn-ghost" onClick={() => setIsReportOpen(false)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------
          FULLSCREEN LIGHTBOX
         ------------------------------------------------------------- */}
      {lightboxIndex !== null && (
        <div className="lightbox" onClick={() => setLightboxIndex(null)}>
          <button
            type="button"
            className="lightbox-close"
            onClick={() => setLightboxIndex(null)}
            aria-label="Close"
          >
            <X size={22} />
          </button>

          {slideItems.length > 1 && (
            <>
              <button
                type="button"
                className="lightbox-arrow"
                style={{ left: 20 }}
                onClick={(e) => {
                  e.stopPropagation();
                  setLightboxIndex((prev) => (prev !== null ? (prev - 1 + slideItems.length) % slideItems.length : 0));
                }}
                aria-label="Previous"
              >
                <ChevronLeft size={26} />
              </button>
              <button
                type="button"
                className="lightbox-arrow"
                style={{ right: 20 }}
                onClick={(e) => {
                  e.stopPropagation();
                  setLightboxIndex((prev) => (prev !== null ? (prev + 1) % slideItems.length : 0));
                }}
                aria-label="Next"
              >
                <ChevronRight size={26} />
              </button>
            </>
          )}

          {slideItems[lightboxIndex]?.url ? (
            <img
              src={slideItems[lightboxIndex].url}
              alt={`${listing.title} - photo ${lightboxIndex + 1}`}
              className="lightbox-img"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <div
              style={{
                width: '80vw',
                height: '60vh',
                borderRadius: 16,
                background: slideItems[lightboxIndex]?.gradient,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontSize: '1.2rem',
                fontWeight: 700
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {slideItems[lightboxIndex]?.label}
            </div>
          )}

          <div className="lightbox-count">
            {lightboxIndex + 1} / {slideItems.length}
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------
          REQUEST CONFIRMATION MODAL (Matching rentivo-request-confirmation-modal.html)
         ------------------------------------------------------------- */}
      <RequestConfirmationModal
        isOpen={isConfirmationModalOpen}
        onClose={() => setIsConfirmationModalOpen(false)}
        listing={listing}
        request={existingRequest}
        onViewRequests={() => {
          setIsConfirmationModalOpen(false);
          if (existingRequest?.id) {
            navigate(`/requests/${existingRequest.id}`);
          } else {
            navigate('/account/requests');
          }
        }}
        onContinueBrowsing={() => setIsConfirmationModalOpen(false)}
      />

      {/* -------------------------------------------------------------
          TOAST
         ------------------------------------------------------------- */}
      <div className="toast-wrap" id="toastWrap">
        <div className={`toast ${toastMessage ? 'show' : ''}`}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6L9 17l-5-5" />
          </svg>
          <span>{toastMessage}</span>
        </div>
      </div>
    </div>
  );
};
