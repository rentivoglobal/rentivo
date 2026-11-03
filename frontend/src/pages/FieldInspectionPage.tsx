import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  MapPin,
  Camera,
  Upload,
  X,
  ChevronRight,
  ChevronLeft,
  Lock,
  Phone,
  User,
  Zap,
  Droplet,
  Home,
  Check,
  Clock,
  Sparkles,
  ExternalLink
} from 'lucide-react';
import { inspectionService } from '../services/inspectionService';
import { Listing } from '../types';
import { 
  FieldInspectionDossier, 
  InspectionTokenStatus, 
  InspectionVerdict,
  GpsLocationProof 
} from '../types/inspection';
import { formatNaira } from '../utils/formatters';
import '../styles/field-inspection.css';

const TOTAL_STEPS = 6;

const STEP_TITLES = [
  'Inspector & GPS',
  'Vacancy & Mandate',
  'Utilities & Power',
  'Structure & Flood Risk',
  'Photo Evidence',
  'Verdict & Submit'
];

/**
 * Compresses an image file client-side using HTML5 Canvas.
 * Resizes the image to fit within maxDimension (1000px) and encodes as JPEG with quality 0.72.
 * Drops photo footprint from 5-15MB down to ~45-70KB while preserving sharp details
 * (e.g. meter digits, wall cracks, water clarity).
 */
function compressImage(file: File, maxDim = 1000, quality = 0.72): Promise<string> {
  return new Promise((resolve) => {
    if (!file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => resolve('');
      reader.readAsDataURL(file);
      return;
    }

    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;

      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => resolve('');
        reader.readAsDataURL(file);
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
      resolve(compressedBase64);
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => resolve('');
      reader.readAsDataURL(file);
    };

    img.src = url;
  });
}

export const FieldInspectionPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [tokenStatus, setTokenStatus] = useState<InspectionTokenStatus>('active');
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [compressingSlot, setCompressingSlot] = useState<string | null>(null);
  const [listing, setListing] = useState<Partial<Listing> | null>(null);
  const [submittedAt, setSubmittedAt] = useState<string | null>(null);
  const [submittedInspectorName, setSubmittedInspectorName] = useState<string | null>(null);

  // Active Wizard Step (1 to 6)
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Form State
  const [inspectorName, setInspectorName] = useState('');
  const [inspectorPhone, setInspectorPhone] = useState('');
  const [inspectorRole, setInspectorRole] = useState('Rentivo Field Inspector');

  // GPS State
  const [gpsData, setGpsData] = useState<GpsLocationProof | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);

  // Step 2: Mandate & Vacancy
  const [isPhysicallyVacant, setIsPhysicallyVacant] = useState(true);
  const [occupancyDetails, setOccupancyDetails] = useState('');
  const [representativeOnSite, setRepresentativeOnSite] = useState<'landlord' | 'caretaker' | 'family_rep' | 'mandated_agent' | 'other'>('landlord');
  const [representativeName, setRepresentativeName] = useState('');
  const [representativePhone, setRepresentativePhone] = useState('');
  const [authorityConfirmed, setAuthorityConfirmed] = useState(true);
  const [immediatePossessionKeysReady, setImmediatePossessionKeysReady] = useState(true);

  // Step 3: Utilities
  const [waterSource, setWaterSource] = useState<'dedicated_borehole' | 'shared_borehole' | 'deep_well' | 'public_water' | 'none'>('dedicated_borehole');
  const [waterPumpTested, setWaterPumpTested] = useState(true);
  const [waterQuality, setWaterQuality] = useState<'clean_clear' | 'brown_iron' | 'sediment_particles' | 'foul_odor'>('clean_clear');
  const [overheadStorageTanks, setOverheadStorageTanks] = useState(true);
  const [prepaidMeterType, setPrepaidMeterType] = useState<'dedicated_unit' | 'shared_meter' | 'estimated_postpaid'>('dedicated_unit');
  const [prepaidMeterNumber, setPrepaidMeterNumber] = useState('');
  const [powerFeederBand, setPowerFeederBand] = useState<'band_a_20hrs' | 'band_b_c_12_16hrs' | 'unstable'>('band_a_20hrs');
  const [backupPower, setBackupPower] = useState<'inverter_solar' | 'generator_house' | 'none'>('generator_house');
  const [wiringSafety, setWiringSafety] = useState<'clean_safe' | 'exposed_wiring_or_burnt_sockets'>('clean_safe');

  // Step 4: Environment & Structure
  const [roadCondition, setRoadCondition] = useState<'tarred' | 'paved_interlock' | 'graded_dirt' | 'eroded_rough'>('tarred');
  const [drainageAndFloodRisk, setDrainageAndFloodRisk] = useState<'no_flood_risk' | 'gutters_clean' | 'gutters_blocked' | 'high_water_marks' | 'severe_flood_risk'>('no_flood_risk');
  const [gatedCompound, setGatedCompound] = useState(true);
  const [perimeterWall, setPerimeterWall] = useState(true);
  const [securityGuard, setSecurityGuard] = useState(true);
  const [windowBurglaryProofing, setWindowBurglaryProofing] = useState(true);
  const [neighborhoodNoise, setNeighborhoodNoise] = useState<'peaceful' | 'moderate' | 'near_loud_worship' | 'near_market'>('peaceful');

  const [roofAndCeiling, setRoofAndCeiling] = useState<'dry_intact' | 'leak_stains' | 'active_leak_or_mold'>('dry_intact');
  const [floorTiling, setFloorTiling] = useState<'tiles_intact' | 'cracked_broken' | 'bare_concrete'>('tiles_intact');
  const [wallsCondition, setWallsCondition] = useState<'freshly_painted' | 'good_clean' | 'needs_paint' | 'minor_cracks' | 'structural_cracks'>('good_clean');
  const [doorsAndLocks, setDoorsAndLocks] = useState<'all_functional' | 'needs_lock_repairs'>('all_functional');
  const [kitchenSinkAndPlumbing, setKitchenSinkAndPlumbing] = useState<'clean_no_leaks' | 'leaks_under_sink'>('clean_no_leaks');
  const [bathroomSanitary, setBathroomSanitary] = useState<'wc_clean_flushes' | 'wc_faulty_or_leaking'>('wc_clean_flushes');
  const [mobileSignalStrength, setMobileSignalStrength] = useState<'strong_4g_5g' | 'moderate' | 'weak_deadzone'>('strong_4g_5g');

  // Step 5: Photos
  const [photos, setPhotos] = useState<{
    streetViewUrl?: string;
    compoundUrl?: string;
    livingRoomUrl?: string;
    bedroomUrl?: string;
    kitchenUrl?: string;
    bathroomUrl?: string;
    meterProofUrl?: string;
    waterSourceUrl?: string;
    defectsUrl?: string;
  }>({});

  // Step 6: Verdict
  const [recommendation, setRecommendation] = useState<InspectionVerdict>('RECOMMEND_VERIFIED');
  const [notes, setNotes] = useState('');
  const [inspectorCertifiedOnSite, setInspectorCertifiedOnSite] = useState(false);

  // File input refs for native camera capture
  const fileInputsRef = useRef<Record<string, HTMLInputElement | null>>({});

  // Load session on mount
  useEffect(() => {
    if (!token) {
      setSessionError('No inspection token provided in URL.');
      setLoading(false);
      return;
    }

    void (async () => {
      try {
        const session = await inspectionService.getInspectionSession(token);
        if (!session.success) {
          setSessionError(session.error || 'This inspection link is invalid or expired.');
          setLoading(false);
          return;
        }

        if (session.status === 'submitted') {
          setTokenStatus('submitted');
          setSubmittedAt(session.submittedAt || null);
          setSubmittedInspectorName(session.inspectorName || null);
          setLoading(false);
          return;
        }

        setListing(session.listing || null);
        if (session.listing?.lister?.fullName) {
          setRepresentativeName(session.listing.lister.fullName);
        }
        if (session.listing?.lister?.phone) {
          setRepresentativePhone(session.listing.lister.phone);
        }

        // Restore draft from sessionStorage if available
        try {
          const draftRaw = sessionStorage.getItem(`rentivo_inspect_draft_${token}`);
          if (draftRaw) {
            const draft = JSON.parse(draftRaw);
            if (draft.inspectorName) setInspectorName(draft.inspectorName);
            if (draft.inspectorPhone) setInspectorPhone(draft.inspectorPhone);
            if (draft.prepaidMeterNumber) setPrepaidMeterNumber(draft.prepaidMeterNumber);
            if (draft.notes) setNotes(draft.notes);
            if (draft.photos) setPhotos(draft.photos);
          }
        } catch {
          // ignore draft read error
        }

        setLoading(false);
      } catch (err: any) {
        setSessionError(err?.message || 'Failed to initialize inspection session.');
        setLoading(false);
      }
    })();
  }, [token]);

  // Auto-save draft on changes
  useEffect(() => {
    if (!token || tokenStatus !== 'active') return;
    try {
      const draft = {
        inspectorName,
        inspectorPhone,
        prepaidMeterNumber,
        notes,
        photos
      };
      sessionStorage.setItem(`rentivo_inspect_draft_${token}`, JSON.stringify(draft));
    } catch {
      // ignore
    }
  }, [token, tokenStatus, inspectorName, inspectorPhone, prepaidMeterNumber, notes, photos]);

  // GPS Capture Handler
  const handleCaptureGps = () => {
    setGpsLoading(true);
    setGpsError(null);

    if (!navigator.geolocation) {
      setGpsError('Geolocation is not supported by your browser.');
      setGpsLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGpsData({
          latitude: Number(pos.coords.latitude.toFixed(6)),
          longitude: Number(pos.coords.longitude.toFixed(6)),
          accuracyMeters: Math.round(pos.coords.accuracy),
          capturedAt: new Date().toISOString()
        });
        setGpsLoading(false);
      },
      (err) => {
        console.warn('Geolocation error:', err);
        setGpsError(err.message || 'Unable to retrieve location. Please allow location permissions in your browser.');
        setGpsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  // Photo Upload Handler (supports canvas image compression to protect storage quota)
  const handlePhotoSelect = async (slotKey: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setCompressingSlot(slotKey);
      const compressedBase64 = await compressImage(file, 1000, 0.72);
      if (compressedBase64) {
        setPhotos((prev) => ({
          ...prev,
          [slotKey]: compressedBase64
        }));
      }
    } catch (err) {
      console.warn('Image compression fallback:', err);
      const reader = new FileReader();
      reader.onload = () => {
        setPhotos((prev) => ({
          ...prev,
          [slotKey]: reader.result as string
        }));
      };
      reader.readAsDataURL(file);
    } finally {
      setCompressingSlot(null);
      if (e.target) e.target.value = '';
    }
  };

  const handleRemovePhoto = (slotKey: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setPhotos((prev) => {
      const copy = { ...prev };
      delete (copy as any)[slotKey];
      return copy;
    });
  };

  // Step Validation
  const canProceedStep = () => {
    if (step === 1) {
      return inspectorName.trim().length >= 2 && inspectorPhone.trim().length >= 8;
    }
    if (step === 2) {
      return representativeName.trim().length >= 2;
    }
    if (step === 3) {
      return prepaidMeterNumber.trim().length >= 4;
    }
    if (step === 4) {
      return true;
    }
    if (step === 5) {
      // Must take at least 3 photos (exterior, room, meter)
      const count = Object.values(photos).filter(Boolean).length;
      return count >= 3;
    }
    if (step === 6) {
      return inspectorCertifiedOnSite;
    }
    return true;
  };

  // Final Submit Handler
  const handleSubmitDossier = async () => {
    if (!token || !inspectorCertifiedOnSite) return;
    setIsSubmitting(true);
    setSubmitError(null);

    const dossier: FieldInspectionDossier = {
      inspector: {
        name: inspectorName.trim(),
        phone: inspectorPhone.trim(),
        role: inspectorRole
      },
      gps: gpsData || undefined,
      mandateAndVacancy: {
        isPhysicallyVacant,
        occupancyDetails: isPhysicallyVacant ? 'Property is vacant' : occupancyDetails,
        representativeOnSite,
        representativeName: representativeName.trim(),
        representativePhone: representativePhone.trim(),
        authorityConfirmed,
        immediatePossessionKeysReady
      },
      neighborhoodAndEnvironment: {
        roadCondition,
        drainageAndFloodRisk,
        securityInfrastructure: {
          gatedCompound,
          perimeterWall,
          securityGuard,
          windowBurglaryProofing
        },
        neighborhoodNoise
      },
      utilities: {
        waterSource,
        waterPumpTested,
        waterQuality,
        overheadStorageTanks,
        prepaidMeterType,
        prepaidMeterNumber: prepaidMeterNumber.trim(),
        powerFeederBand,
        backupPower,
        wiringSafety
      },
      interiorAndStructure: {
        roofAndCeiling,
        floorTiling,
        wallsCondition,
        doorsAndLocks,
        kitchenSinkAndPlumbing,
        bathroomSanitary,
        mobileSignalStrength
      },
      photoEvidence: photos,
      verdict: {
        recommendation,
        notes: notes.trim(),
        inspectorCertifiedOnSite: true
      },
      submittedAt: new Date().toISOString()
    };

    try {
      const res = await inspectionService.submitInspection(token, dossier);
      if (!res.success) {
        throw new Error(res.message || 'Submission failed');
      }

      try {
        sessionStorage.removeItem(`rentivo_inspect_draft_${token}`);
      } catch {
        // ignore
      }

      setSubmitSuccess(true);
      setTokenStatus('submitted');
      setSubmittedAt(res.submittedAt || new Date().toISOString());
      setSubmittedInspectorName(inspectorName.trim());
      setIsSubmitting(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      setSubmitError(err?.message || 'Could not submit inspection dossier. Please check connection and try again.');
      setIsSubmitting(false);
    }
  };

  // 1. Loading State
  if (loading) {
    return (
      <div className="field-inspect-app" style={{ justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '38px',
            height: '38px',
            border: '3px solid #000052',
            borderTopColor: 'transparent',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
            margin: '0 auto 16px'
          }} />
          <div style={{ fontSize: '15px', fontWeight: 700, color: '#000052' }}>
            Initializing Physical Verification Session…
          </div>
          <div style={{ fontSize: '12.5px', color: '#64748B', marginTop: '4px' }}>
            Connecting to Rentivo verification network
          </div>
        </div>
      </div>
    );
  }

  // 2. Locked & Completed State (Single-use security guarantee)
  if (tokenStatus === 'submitted' || submitSuccess) {
    return (
      <div className="field-inspect-app">
        <header className="field-inspect-header">
          <div className="field-inspect-brand">
            <img src="https://uovlgngsmvjcgkgznyme.supabase.co/storage/v1/object/public/assets/rentivo-logo.svg" alt="Rentivo" />
            <span className="field-inspect-brand-title">RENTIVO VERIFICATION</span>
          </div>
          <span className="field-inspect-badge" style={{ backgroundColor: '#ECFDF5', color: '#047857', borderColor: '#10B981' }}>
            <Lock size={12} />
            Completed & Locked
          </span>
        </header>

        <div className="inspect-locked-screen">
          <div className="inspect-locked-icon">
            <CheckCircle2 size={36} color="#047857" />
          </div>
          <h1 className="inspect-locked-title">
            Inspection Dossier Submitted
          </h1>
          <p className="inspect-locked-desc">
            This on-site physical verification has been successfully transmitted and cryptographically locked. No further modifications or re-submissions can be made via this link.
          </p>

          <div className="inspect-locked-info">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ color: '#64748B' }}>Status:</span>
              <strong style={{ color: '#047857' }}>Locked & Under Admin Review</strong>
            </div>
            {submittedInspectorName && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: '#64748B' }}>Inspector:</span>
                <strong>{submittedInspectorName}</strong>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ color: '#64748B' }}>Submission Timestamp:</span>
              <strong>{submittedAt ? new Date(submittedAt).toLocaleString() : 'Recorded'}</strong>
            </div>
            {listing?.title && (
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '8px', borderTop: '1px solid #E2E8F0' }}>
                <span style={{ color: '#64748B' }}>Property:</span>
                <strong style={{ maxWidth: '220px', textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {listing.title}
                </strong>
              </div>
            )}
          </div>

          <div style={{ marginTop: '28px' }}>
            <button
              type="button"
              className="gps-action-btn"
              onClick={() => navigate('/')}
            >
              <Home size={14} />
              <span>Return to Rentivo Home</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 3. Error State (Invalid / Expired Link)
  if (sessionError) {
    const isQuota = sessionError.toLowerCase().includes('quota') || sessionError.toLowerCase().includes('storage');

    return (
      <div className="field-inspect-app" style={{ justifyContent: 'center', alignItems: 'center', minHeight: '100vh', padding: '24px' }}>
        <div style={{ maxWidth: '420px', textAlign: 'center', backgroundColor: '#FFFFFF', padding: '32px 24px', borderRadius: '16px', border: '1px solid #E2E8F0', boxShadow: '0 4px 16px rgba(0,0,0,0.04)' }}>
          <div style={{ width: '52px', height: '52px', borderRadius: '50%', backgroundColor: '#FEF2F2', color: '#DC2626', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <AlertCircle size={28} />
          </div>
          <h2 style={{ fontSize: '19px', fontWeight: 800, color: '#000052', margin: '0 0 8px' }}>
            Link Not Accessible
          </h2>
          <p style={{ fontSize: '13.5px', color: '#64748B', lineHeight: 1.5, margin: '0 0 20px' }}>
            {sessionError}
          </p>

          {isQuota && (
            <button
              type="button"
              className="gps-action-btn"
              style={{ backgroundColor: '#047857', marginBottom: '10px' }}
              onClick={() => {
                try {
                  localStorage.removeItem('rentivo_v6_inspection_dossiers');
                  localStorage.removeItem('rentivo_v6_inspection_tokens');
                } catch {
                  /* ignore */
                }
                window.location.reload();
              }}
            >
              Clear Storage & Try Again
            </button>
          )}

          <button
            type="button"
            className="gps-action-btn"
            onClick={() => navigate('/')}
          >
            Go to Rentivo Homepage
          </button>
        </div>
      </div>
    );
  }

  // 4. Active Inspection Form
  return (
    <div className="field-inspect-app">
      {/* Top Header */}
      <header className="field-inspect-header">
        <div className="field-inspect-brand">
          <img src="https://uovlgngsmvjcgkgznyme.supabase.co/storage/v1/object/public/assets/rentivo-logo.svg" alt="Rentivo" />
          <span className="field-inspect-brand-title">RENTIVO FIELD AUDIT</span>
        </div>
        <span className="field-inspect-badge">
          <ShieldCheck size={13} />
          On-Site Verification
        </span>
      </header>

      <main className="field-inspect-container">
        {/* Step Progress Tracker */}
        <div className="field-inspect-progress-wrap">
          <div className="field-inspect-progress-info">
            <span>Step {step} of {TOTAL_STEPS}</span>
            <span className="field-inspect-progress-step-name">{STEP_TITLES[step - 1]}</span>
          </div>
          <div className="field-inspect-progress-bar-bg">
            <div 
              className="field-inspect-progress-bar-fill" 
              style={{ width: `${(step / TOTAL_STEPS) * 100}%` }} 
            />
          </div>
        </div>

        {/* Listing Reference Card */}
        {listing && (
          <div className="field-inspect-prop-card">
            {listing.photos && listing.photos[0] && (
              <div className="field-inspect-prop-media">
                <img src={listing.photos[0]} alt={listing.title} />
              </div>
            )}
            <div className="field-inspect-prop-content">
              <h2 className="field-inspect-prop-title">{listing.title || 'Property Verification'}</h2>
              <div className="field-inspect-prop-loc">
                <MapPin size={14} color="#000052" />
                <span>{listing.area}, {listing.city || 'Ibadan'}</span>
              </div>
              <div className="field-inspect-prop-contact">
                <span>Lister: <strong>{listing.lister?.fullName || 'Landlord/Agent'}</strong></span>
                {listing.lister?.phone && (
                  <a 
                    href={`tel:${listing.lister.phone}`}
                    style={{ color: '#000052', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px', textDecoration: 'none' }}
                  >
                    <Phone size={12} />
                    {listing.lister.phone}
                  </a>
                )}
              </div>
            </div>
          </div>
        )}

        {/* WIZARD STEP 1: Inspector Info & GPS Check */}
        {step === 1 && (
          <div className="field-section-card">
            <h3 className="field-section-title">
              <User size={18} color="#000052" />
              Inspector Identification & GPS Proof
            </h3>
            <p className="field-section-subtitle">
              Verify your identity and capture live geolocation coordinates to prove on-site physical presence.
            </p>

            <div className="field-group">
              <label className="field-label">Inspector Full Name *</label>
              <input
                type="text"
                className="field-input"
                placeholder="e.g. Babatunde Adeleke"
                value={inspectorName}
                onChange={(e) => setInspectorName(e.target.value)}
              />
            </div>

            <div className="field-group">
              <label className="field-label">Inspector Phone Number *</label>
              <input
                type="tel"
                className="field-input"
                placeholder="e.g. 08031234567"
                value={inspectorPhone}
                onChange={(e) => setInspectorPhone(e.target.value)}
              />
            </div>

            <div className="field-group">
              <label className="field-label">Role / Affiliation</label>
              <select
                className="field-select"
                value={inspectorRole}
                onChange={(e) => setInspectorRole(e.target.value)}
              >
                <option value="Rentivo Field Inspector">Rentivo Field Inspector (Internal Staff)</option>
                <option value="Accredited Verification Partner">Accredited Verification Partner</option>
                <option value="Field Logistics Lead">Field Logistics Lead</option>
              </select>
            </div>

            {/* GPS Geolocation Capture */}
            <div className={`gps-box ${gpsData ? 'verified' : ''}`}>
              {gpsData ? (
                <div>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#047857', fontWeight: 800, fontSize: '14px', marginBottom: '6px' }}>
                    <CheckCircle2 size={18} />
                    On-Site Geolocation Verified
                  </div>
                  <div style={{ fontSize: '13px', color: '#334155' }}>
                    Coordinates: <strong>{gpsData.latitude}, {gpsData.longitude}</strong>
                  </div>
                  <div style={{ fontSize: '11.5px', color: '#64748B', marginTop: '2px' }}>
                    Accuracy radius: ±{gpsData.accuracyMeters}m · Captured at {new Date(gpsData.capturedAt).toLocaleTimeString()}
                  </div>
                  <button
                    type="button"
                    onClick={handleCaptureGps}
                    style={{ background: 'none', border: 'none', color: '#000052', fontSize: '12px', fontWeight: 700, textDecoration: 'underline', marginTop: '10px', cursor: 'pointer' }}
                  >
                    Refresh GPS Coordinate
                  </button>
                </div>
              ) : (
                <div>
                  <MapPin size={24} color="#000052" style={{ marginBottom: '8px' }} />
                  <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#000052', marginBottom: '4px' }}>
                    Prove You Are Physically At The Property
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748B', marginBottom: '12px' }}>
                    Captures your device's exact GPS location. Ensure location services are enabled.
                  </div>
                  <button
                    type="button"
                    className="gps-action-btn"
                    disabled={gpsLoading}
                    onClick={handleCaptureGps}
                  >
                    {gpsLoading ? 'Acquiring Satellite GPS…' : '📍 Capture Live On-Site GPS'}
                  </button>
                  {gpsError && (
                    <div style={{ color: '#DC2626', fontSize: '12px', marginTop: '8px' }}>
                      {gpsError}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* WIZARD STEP 2: Vacancy & Mandate Truth */}
        {step === 2 && (
          <div className="field-section-card">
            <h3 className="field-section-title">
              <Home size={18} color="#000052" />
              Vacancy & Ownership Mandate
            </h3>
            <p className="field-section-subtitle">
              Confirm the property is genuinely vacant and authorized by the legitimate owner.
            </p>

            <div className="field-group">
              <label className="field-label">Is the property physically vacant right now? *</label>
              <div className="field-options-grid">
                <button
                  type="button"
                  className={`field-option-btn ${isPhysicallyVacant ? 'selected' : ''}`}
                  onClick={() => setIsPhysicallyVacant(true)}
                >
                  <Check size={14} />
                  <span>Yes, Vacant</span>
                </button>
                <button
                  type="button"
                  className={`field-option-btn ${!isPhysicallyVacant ? 'selected-danger' : ''}`}
                  onClick={() => setIsPhysicallyVacant(false)}
                >
                  <X size={14} />
                  <span>Occupied / Renovation</span>
                </button>
              </div>
            </div>

            {!isPhysicallyVacant && (
              <div className="field-group">
                <label className="field-label">Occupancy / Availability Notes *</label>
                <input
                  type="text"
                  className="field-input"
                  placeholder="e.g. Current tenant vacates on 15th next month"
                  value={occupancyDetails}
                  onChange={(e) => setOccupancyDetails(e.target.value)}
                />
              </div>
            )}

            <div className="field-group">
              <label className="field-label">Who opened the property on-site? *</label>
              <div className="field-options-grid">
                {[
                  { key: 'landlord', label: 'Owner / Landlord' },
                  { key: 'caretaker', label: 'Resident Caretaker' },
                  { key: 'mandated_agent', label: 'Mandated Agent' },
                  { key: 'family_rep', label: 'Family Member' },
                  { key: 'other', label: 'Key with Security' }
                ].map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    className={`field-option-btn ${representativeOnSite === item.key ? 'selected' : ''}`}
                    onClick={() => setRepresentativeOnSite(item.key as any)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="field-group">
              <label className="field-label">On-Site Representative Full Name *</label>
              <input
                type="text"
                className="field-input"
                placeholder="e.g. Chief Adeleke"
                value={representativeName}
                onChange={(e) => setRepresentativeName(e.target.value)}
              />
            </div>

            <div className="field-group">
              <label className="field-label">Representative Phone Number *</label>
              <input
                type="tel"
                className="field-input"
                placeholder="e.g. 08023456789"
                value={representativePhone}
                onChange={(e) => setRepresentativePhone(e.target.value)}
              />
            </div>

            <div className="field-group">
              <label className="field-label">Legal Authority / Mandate Confirmed? *</label>
              <span className="field-sublabel">Does this person have proven authority from the deed holder to lease this house?</span>
              <div className="field-options-grid">
                <button
                  type="button"
                  className={`field-option-btn ${authorityConfirmed ? 'selected' : ''}`}
                  onClick={() => setAuthorityConfirmed(true)}
                >
                  <Check size={14} />
                  <span>Authority Confirmed</span>
                </button>
                <button
                  type="button"
                  className={`field-option-btn ${!authorityConfirmed ? 'selected-amber' : ''}`}
                  onClick={() => setAuthorityConfirmed(false)}
                >
                  <AlertCircle size={14} />
                  <span>Unconfirmed / In Doubt</span>
                </button>
              </div>
            </div>

            <div className="field-group">
              <label className="field-label">Are keys ready for immediate tenant handover? *</label>
              <div className="field-options-grid">
                <button
                  type="button"
                  className={`field-option-btn ${immediatePossessionKeysReady ? 'selected' : ''}`}
                  onClick={() => setImmediatePossessionKeysReady(true)}
                >
                  <Check size={14} />
                  <span>Keys In Hand</span>
                </button>
                <button
                  type="button"
                  className={`field-option-btn ${!immediatePossessionKeysReady ? 'selected-amber' : ''}`}
                  onClick={() => setImmediatePossessionKeysReady(false)}
                >
                  <Clock size={14} />
                  <span>Keys Not Ready</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* WIZARD STEP 3: Utilities & Power (The Deal-Breakers) */}
        {step === 3 && (
          <div className="field-section-card">
            <h3 className="field-section-title">
              <Zap size={18} color="#000052" />
              Utilities, Water & Electricity Check
            </h3>
            <p className="field-section-subtitle">
              Verify water availability and test the electricity setup. These are top renter concerns in Nigeria.
            </p>

            {/* Water Source */}
            <div className="field-group">
              <label className="field-label">Water Source *</label>
              <div className="field-options-grid">
                {[
                  { key: 'dedicated_borehole', label: 'Dedicated Borehole' },
                  { key: 'shared_borehole', label: 'Shared Borehole' },
                  { key: 'deep_well', label: 'Deep Well (Motorized)' },
                  { key: 'public_water', label: 'Water Corporation' },
                  { key: 'none', label: 'No Running Water' }
                ].map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    className={`field-option-btn ${waterSource === item.key ? 'selected' : ''}`}
                    onClick={() => setWaterSource(item.key as any)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Water Pump Test */}
            <div className="field-group">
              <label className="field-label">Water Pump Physically Tested On-Site? *</label>
              <div className="field-options-grid">
                <button
                  type="button"
                  className={`field-option-btn ${waterPumpTested ? 'selected' : ''}`}
                  onClick={() => setWaterPumpTested(true)}
                >
                  <Droplet size={14} />
                  <span>Tested & Pumping</span>
                </button>
                <button
                  type="button"
                  className={`field-option-btn ${!waterPumpTested ? 'selected-amber' : ''}`}
                  onClick={() => setWaterPumpTested(false)}
                >
                  <X size={14} />
                  <span>Not Tested / Faulty</span>
                </button>
              </div>
            </div>

            {/* Water Quality */}
            <div className="field-group">
              <label className="field-label">Water Quality & Clarity *</label>
              <span className="field-sublabel">Run a tap into a transparent cup to inspect color and odor.</span>
              <div className="field-options-grid">
                {[
                  { key: 'clean_clear', label: 'Clean & Clear' },
                  { key: 'brown_iron', label: 'Rusty / Iron Tint' },
                  { key: 'sediment_particles', label: 'Particles / Dirt' },
                  { key: 'foul_odor', label: 'Foul Odor' }
                ].map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    className={`field-option-btn ${waterQuality === item.key ? (item.key === 'clean_clear' ? 'selected' : 'selected-amber') : ''}`}
                    onClick={() => setWaterQuality(item.key as any)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Electricity Metering */}
            <div className="field-group">
              <label className="field-label">Electricity Metering Setup *</label>
              <div className="field-options-grid">
                {[
                  { key: 'dedicated_unit', label: 'Dedicated Unit Prepaid' },
                  { key: 'shared_meter', label: 'Shared Prepaid Meter' },
                  { key: 'estimated_postpaid', label: 'Postpaid (Estimated)' }
                ].map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    className={`field-option-btn ${prepaidMeterType === item.key ? 'selected' : ''}`}
                    onClick={() => setPrepaidMeterType(item.key as any)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Prepaid Meter Number */}
            <div className="field-group">
              <label className="field-label">Prepaid Meter Number (Read From Physical Meter) *</label>
              <span className="field-sublabel">Inspect the physical meter casing on the wall and record the exact number.</span>
              <input
                type="text"
                className="field-input"
                placeholder="e.g. 04198273645 or 45123984712"
                value={prepaidMeterNumber}
                onChange={(e) => setPrepaidMeterNumber(e.target.value)}
              />
            </div>

            {/* Power Feeder Band */}
            <div className="field-group">
              <label className="field-label">Electricity Supply Band (IBEDC / Grid) *</label>
              <div className="field-options-grid">
                {[
                  { key: 'band_a_20hrs', label: 'Band A (20+ hrs/day)' },
                  { key: 'band_b_c_12_16hrs', label: 'Band B/C (12–16 hrs)' },
                  { key: 'unstable', label: 'Unstable / Below 10 hrs' }
                ].map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    className={`field-option-btn ${powerFeederBand === item.key ? 'selected' : ''}`}
                    onClick={() => setPowerFeederBand(item.key as any)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Backup Power */}
            <div className="field-group">
              <label className="field-label">Backup Power Provision</label>
              <div className="field-options-grid">
                {[
                  { key: 'inverter_solar', label: 'Inverter / Solar Setup' },
                  { key: 'generator_house', label: 'Gen House + Switch' },
                  { key: 'none', label: 'No Backup System' }
                ].map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    className={`field-option-btn ${backupPower === item.key ? 'selected' : ''}`}
                    onClick={() => setBackupPower(item.key as any)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* WIZARD STEP 4: Structure, Environment & Flood Risk */}
        {step === 4 && (
          <div className="field-section-card">
            <h3 className="field-section-title">
              <Home size={18} color="#000052" />
              Structural Condition & Flood Risk
            </h3>
            <p className="field-section-subtitle">
              Inspect exterior drainage, road access, and internal structural integrity.
            </p>

            <div className="field-group">
              <label className="field-label">Access Road Condition *</label>
              <div className="field-options-grid">
                {[
                  { key: 'tarred', label: 'Tarred Road' },
                  { key: 'paved_interlock', label: 'Paved / Interlock' },
                  { key: 'graded_dirt', label: 'Graded Dirt Road' },
                  { key: 'eroded_rough', label: 'Eroded / Rough Track' }
                ].map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    className={`field-option-btn ${roadCondition === item.key ? 'selected' : ''}`}
                    onClick={() => setRoadCondition(item.key as any)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="field-group">
              <label className="field-label">Drainage & Rainy Season Flood Risk *</label>
              <span className="field-sublabel">Inspect perimeter walls for water marks or stagnant pooling in gutters.</span>
              <div className="field-options-grid">
                {[
                  { key: 'no_flood_risk', label: 'No Flood Risk (Elevated)' },
                  { key: 'gutters_clean', label: 'Clean Free Drainage' },
                  { key: 'gutters_blocked', label: 'Gutters Blocked' },
                  { key: 'high_water_marks', label: 'High Water Marks Found' },
                  { key: 'severe_flood_risk', label: 'Severe Flood Danger' }
                ].map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    className={`field-option-btn ${drainageAndFloodRisk === item.key ? (item.key === 'no_flood_risk' || item.key === 'gutters_clean' ? 'selected' : 'selected-danger') : ''}`}
                    onClick={() => setDrainageAndFloodRisk(item.key as any)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="field-group">
              <label className="field-label">Compound Security Infrastructure</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '6px' }}>
                <button
                  type="button"
                  className={`field-option-btn ${gatedCompound ? 'selected' : ''}`}
                  onClick={() => setGatedCompound(!gatedCompound)}
                >
                  {gatedCompound ? '✓ Gated Compound' : 'No Gate'}
                </button>
                <button
                  type="button"
                  className={`field-option-btn ${perimeterWall ? 'selected' : ''}`}
                  onClick={() => setPerimeterWall(!perimeterWall)}
                >
                  {perimeterWall ? '✓ Fenced Perimeter' : 'Unfenced'}
                </button>
                <button
                  type="button"
                  className={`field-option-btn ${securityGuard ? 'selected' : ''}`}
                  onClick={() => setSecurityGuard(!securityGuard)}
                >
                  {securityGuard ? '✓ Security Guard' : 'No Guard'}
                </button>
                <button
                  type="button"
                  className={`field-option-btn ${windowBurglaryProofing ? 'selected' : ''}`}
                  onClick={() => setWindowBurglaryProofing(!windowBurglaryProofing)}
                >
                  {windowBurglaryProofing ? '✓ Burglary Proofing' : 'No Iron Bars'}
                </button>
              </div>
            </div>

            <div className="field-group">
              <label className="field-label">Ceiling & Roof Inspection *</label>
              <div className="field-options-grid">
                {[
                  { key: 'dry_intact', label: 'Dry & Intact' },
                  { key: 'leak_stains', label: 'Old Water Stains' },
                  { key: 'active_leak_or_mold', label: 'Active Leaks / Mold' }
                ].map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    className={`field-option-btn ${roofAndCeiling === item.key ? (item.key === 'dry_intact' ? 'selected' : 'selected-amber') : ''}`}
                    onClick={() => setRoofAndCeiling(item.key as any)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="field-group">
              <label className="field-label">Floor Tiling Condition *</label>
              <div className="field-options-grid">
                {[
                  { key: 'tiles_intact', label: 'Tiles Intact & Level' },
                  { key: 'cracked_broken', label: 'Cracked Tiles' },
                  { key: 'bare_concrete', label: 'Bare Concrete' }
                ].map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    className={`field-option-btn ${floorTiling === item.key ? 'selected' : ''}`}
                    onClick={() => setFloorTiling(item.key as any)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="field-group">
              <label className="field-label">Mobile Network Reception Inside Rooms *</label>
              <span className="field-sublabel">Check your mobile phone network bars inside the bedrooms.</span>
              <div className="field-options-grid">
                {[
                  { key: 'strong_4g_5g', label: 'Strong 4G / 5G' },
                  { key: 'moderate', label: 'Moderate Signal' },
                  { key: 'weak_deadzone', label: 'Weak / Dead Zone' }
                ].map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    className={`field-option-btn ${mobileSignalStrength === item.key ? 'selected' : ''}`}
                    onClick={() => setMobileSignalStrength(item.key as any)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* WIZARD STEP 5: Photo Evidence Capture */}
        {step === 5 && (
          <div className="field-section-card">
            <h3 className="field-section-title">
              <Camera size={18} color="#000052" />
              On-Site Photographic Evidence
            </h3>
            <p className="field-section-subtitle">
              Snap photos with your phone camera. At least 3 photos required (Street exterior, interior, and meter display).
            </p>

            <div className="photo-slot-grid">
              {[
                { key: 'streetViewUrl', label: '1. Street & House Exterior *' },
                { key: 'compoundUrl', label: '2. Compound & Gate' },
                { key: 'livingRoomUrl', label: '3. Living Room / Parlor *' },
                { key: 'bedroomUrl', label: '4. Bedroom & Wardrobe' },
                { key: 'kitchenUrl', label: '5. Kitchen & Under Sink' },
                { key: 'bathroomUrl', label: '6. Bathroom & WC' },
                { key: 'meterProofUrl', label: '7. Prepaid Meter Display *' },
                { key: 'waterSourceUrl', label: '8. Tap Running / Tanks' },
                { key: 'defectsUrl', label: '9. Any Defects Found' }
              ].map((slot) => {
                const photoSrc = (photos as any)[slot.key];
                return (
                  <div
                    key={slot.key}
                    className={`photo-slot-card ${photoSrc ? 'has-photo' : ''}`}
                    onClick={() => {
                      if (!photoSrc) {
                        fileInputsRef.current[slot.key]?.click();
                      }
                    }}
                  >
                    <input
                      ref={(el) => { fileInputsRef.current[slot.key] = el; }}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      style={{ display: 'none' }}
                      onChange={(e) => handlePhotoSelect(slot.key, e)}
                    />

                    {compressingSlot === slot.key ? (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '16px 8px' }}>
                        <div style={{
                          width: '24px',
                          height: '24px',
                          border: '3px solid rgba(0,0,82,0.1)',
                          borderTopColor: '#000052',
                          borderRadius: '50%',
                          animation: 'spin 0.8s linear infinite',
                          marginBottom: '8px'
                        }} />
                        <span style={{ fontSize: '11px', fontWeight: 600, color: '#000052' }}>Optimizing...</span>
                      </div>
                    ) : photoSrc ? (
                      <>
                        <img src={photoSrc} alt={slot.label} />
                        <button
                          type="button"
                          className="photo-slot-remove"
                          onClick={(e) => handleRemovePhoto(slot.key, e)}
                          title="Remove photo"
                        >
                          <X size={14} />
                        </button>
                        <div style={{ padding: '6px 8px', fontSize: '11px', fontWeight: 700, color: '#047857', textAlign: 'center' }}>
                          ✓ Uploaded
                        </div>
                      </>
                    ) : (
                      <>
                        <Camera size={22} color="#000052" style={{ marginBottom: '6px' }} />
                        <div className="photo-slot-label">{slot.label}</div>
                        <span style={{ fontSize: '11px', color: '#64748B', marginTop: '4px' }}>
                          Tap to photograph
                        </span>
                      </>
                    )}
                  </div>
                );
              })}
            </div>

            <div style={{ marginTop: '16px', fontSize: '12.5px', color: '#64748B', textAlign: 'center' }}>
              Photos uploaded: <strong style={{ color: '#000052' }}>{Object.values(photos).filter(Boolean).length}</strong> / 9
            </div>
          </div>
        )}

        {/* WIZARD STEP 6: Verdict & Submit */}
        {step === 6 && (
          <div className="field-section-card">
            <h3 className="field-section-title">
              <Sparkles size={18} color="#000052" />
              Inspector Recommendation & Sign-Off
            </h3>
            <p className="field-section-subtitle">
              Provide your definitive recommendation for the Rentivo Admin team.
            </p>

            {/* Verdict Selection */}
            <div className="field-group">
              <label className="field-label">Overall Verification Verdict *</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {[
                  {
                    key: 'RECOMMEND_VERIFIED',
                    title: '✅ Recommend Emerald Verification',
                    desc: 'Property meets all standards, is genuinely vacant, clean utilities, and ready for renters.'
                  },
                  {
                    key: 'RECOMMEND_WITH_REPAIRS',
                    title: '⚠️ Recommend with Required Repairs',
                    desc: 'Legitimate and vacant, but landlord must fix specific defects before verified badge is granted.'
                  },
                  {
                    key: 'REJECT_UNINHABITABLE',
                    title: '❌ Reject: Substandard / Inhabitable',
                    desc: 'Severe roof leaks, no running water, unsafe electrical wiring, or major flood danger.'
                  },
                  {
                    key: 'REJECT_FRAUD_OR_OCCUPIED',
                    title: '🚫 Reject: Occupied / Misleading / No Mandate',
                    desc: 'Property is not vacant, representative has no legal authority, or listing photos are fraudulent.'
                  }
                ].map((item) => (
                  <div
                    key={item.key}
                    onClick={() => setRecommendation(item.key as any)}
                    style={{
                      border: recommendation === item.key ? '2px solid #000052' : '1.5px solid #E2E8F0',
                      backgroundColor: recommendation === item.key ? '#F8FAFC' : '#FFFFFF',
                      borderRadius: '12px',
                      padding: '12px 14px',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ fontSize: '14px', fontWeight: 800, color: '#000052', marginBottom: '3px' }}>
                      {item.title}
                    </div>
                    <div style={{ fontSize: '12.5px', color: '#64748B', lineHeight: 1.4 }}>
                      {item.desc}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Field Notes */}
            <div className="field-group">
              <label className="field-label">Inspector Confidential Notes to Admin</label>
              <textarea
                className="field-textarea"
                placeholder="Include any specific observations about the road, landlord demeanor, meter arrears, or negotiation tips for renters…"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            {/* Certification Checkbox */}
            <div style={{
              backgroundColor: '#ECFDF5',
              border: '1.5px solid #A7F3D0',
              borderRadius: '12px',
              padding: '14px',
              marginTop: '20px'
            }}>
              <label style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={inspectorCertifiedOnSite}
                  onChange={(e) => setInspectorCertifiedOnSite(e.target.checked)}
                  style={{ width: '18px', height: '18px', marginTop: '2px', accentColor: '#047857' }}
                />
                <span style={{ fontSize: '13px', color: '#065F46', lineHeight: 1.5 }}>
                  <strong>On-Site Physical Attestation:</strong> I, <strong>{inspectorName || 'the inspector'}</strong>, certify that I physically visited this property at <strong>{listing?.addressDescription || listing?.area || 'Ibadan'}</strong> and that the answers, GPS coordinates, meter reading, and photos are authentic.
                </span>
              </label>
            </div>

            {submitError && (
              <div style={{
                backgroundColor: '#FEF2F2',
                border: '1.5px solid #FCA5A5',
                borderRadius: '12px',
                padding: '14px',
                color: '#DC2626',
                fontSize: '13px',
                marginTop: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}>
                <AlertCircle size={20} style={{ flexShrink: 0 }} />
                <span>{submitError}</span>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Floating Bottom Action Bar */}
      <footer className="field-inspect-footer-bar">
        <div className="field-inspect-footer-inner">
          {step > 1 && (
            <button
              type="button"
              className="field-inspect-btn field-inspect-btn-outline"
              onClick={() => {
                setStep((s) => Math.max(1, s - 1));
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            >
              <ChevronLeft size={16} />
              <span>Back</span>
            </button>
          )}

          {step < TOTAL_STEPS ? (
            <button
              type="button"
              className="field-inspect-btn field-inspect-btn-primary"
              disabled={!canProceedStep()}
              onClick={() => {
                setStep((s) => Math.min(TOTAL_STEPS, s + 1));
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            >
              <span>Continue</span>
              <ChevronRight size={16} />
            </button>
          ) : (
            <button
              type="button"
              className="field-inspect-btn field-inspect-btn-submit"
              disabled={isSubmitting || !inspectorCertifiedOnSite}
              onClick={handleSubmitDossier}
            >
              {isSubmitting ? (
                <>
                  <div style={{
                    width: '18px',
                    height: '18px',
                    border: '2px solid #FFFFFF',
                    borderTopColor: 'transparent',
                    borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite'
                  }} />
                  <span>Transmitting & Locking Dossier…</span>
                </>
              ) : (
                <>
                  <Lock size={16} />
                  <span>Submit Dossier & Lock Link</span>
                </>
              )}
            </button>
          )}
        </div>
      </footer>
    </div>
  );
};
