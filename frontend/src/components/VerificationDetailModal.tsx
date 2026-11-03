import React, { useState, useEffect } from 'react';
import {
  X,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Ban,
  MapPin,
  ExternalLink,
  Navigation,
  MessageSquare,
  Sparkles,
  Check,
  Zap,
  Droplet,
  Layers,
  User,
  Phone,
  Camera
} from 'lucide-react';
import { Listing } from '../types';
import { FieldInspectionDossier } from '../types/inspection';
import { formatNaira } from '../utils/formatters';

export interface VerificationItemData {
  id: string;
  listingId: string;
  title: string;
  area: string;
  category: 'Residential' | 'Commercial';
  listerName: string;
  listerPhone: string;
  listerInitials: string;
  submittedDate: string;
  status: 'pending' | 'scheduled' | 'progress' | 'completed';
  inspector: string;
  daysInQueue: number;
  isOverdue: boolean;
  photo: string;
  price: number;
  hasDossier?: boolean;
  dossier?: FieldInspectionDossier;
  inspectionToken?: string;
  inspectionUrl?: string;
}

interface VerificationDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: VerificationItemData | null;
  listings: Listing[];
  onApprove: (item: VerificationItemData) => Promise<void> | void;
  onRequestChanges: (item: VerificationItemData, notes?: string) => void;
  onRevoke: (item: VerificationItemData) => void;
  showToast: (msg: string) => void;
}

export const VerificationDetailModal: React.FC<VerificationDetailModalProps> = ({
  isOpen,
  onClose,
  item,
  listings,
  onApprove,
  onRequestChanges,
  onRevoke,
  showToast
}) => {
  if (!isOpen || !item) return null;

  // 4 Reality Pillars Confirmation State: [Vacancy, Electricity, Water, Road/Security]
  const [confirmedAreas, setConfirmedAreas] = useState<[boolean, boolean, boolean, boolean]>([false, false, false, false]);
  const [notes, setNotes] = useState<string>('');
  const [previewImage, setPreviewImage] = useState<{ url: string; title: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const matchedListing = listings.find((l) => l.id === item.listingId);
  const dossier = item.dossier;

  // Sync initial state if dossier already recommended or already verified
  useEffect(() => {
    if (item.status === 'completed' || dossier?.verdict?.recommendation === 'RECOMMEND_VERIFIED') {
      setConfirmedAreas([true, true, true, true]);
    } else {
      setConfirmedAreas([false, false, false, false]);
    }
    setNotes(dossier?.verdict?.notes || '');
  }, [item, dossier]);

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (previewImage) {
          setPreviewImage(null);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, previewImage]);

  const confirmedCount = confirmedAreas.filter(Boolean).length;
  const allConfirmed = confirmedCount === 4;

  const toggleArea = (index: number) => {
    setConfirmedAreas((prev) => {
      const updated: [boolean, boolean, boolean, boolean] = [...prev];
      updated[index] = !updated[index];
      return updated;
    });
  };

  const handleAddNoteChip = (text: string) => {
    setNotes((prev) => {
      const trimmed = prev.trim();
      return trimmed ? `${trimmed} ${text}.` : `${text}.`;
    });
  };

  const handleConfirmApproval = async () => {
    try {
      setIsSubmitting(true);
      await onApprove(item);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmChanges = () => {
    if (!notes.trim()) {
      showToast('Please provide auditor notes before requesting changes.');
      return;
    }
    onRequestChanges(item, notes.trim());
  };

  const handleConfirmRevoke = () => {
    onRevoke(item);
  };

  // Status configuration
  const statusConfig = {
    completed: { text: 'Verified Badge Active', bg: '#ECFDF5', color: '#047857', border: '#A7F3D0' },
    progress: { text: 'Evidence Submitted', bg: '#EFF6FF', color: '#1D4ED8', border: '#BFDBFE' },
    scheduled: { text: 'Field Visit Scheduled', bg: '#EFF6FF', color: '#1E40AF', border: '#BFDBFE' },
    pending: { text: 'Awaiting Audit Review', bg: '#FEF3C7', color: '#B45309', border: '#FDE68A' }
  }[item.status] || { text: 'Under Review', bg: '#F1F5F9', color: '#475569', border: '#E2E8F0' };

  // 4 Pillars Config
  const pillars = [
    {
      id: 'vacancy',
      no: '01',
      title: 'Vacancy & Authority',
      icon: CheckCircle2,
      summary: dossier?.mandateAndVacancy?.isPhysicallyVacant
        ? 'Physically vacant & keys ready for possession'
        : 'Vacant state & lister authority confirmed on-site',
      detail: dossier?.mandateAndVacancy?.authorityConfirmed
        ? 'Direct lister mandate verified'
        : 'Lister authorization active',
      photoUrl: (dossier?.photoEvidence as Record<string, string> | undefined)?.livingRoomUrl || item.photo,
      confirmed: confirmedAreas[0]
    },
    {
      id: 'electricity',
      no: '02',
      title: 'Electricity & Prepaid Meter',
      icon: Zap,
      summary: dossier?.utilities?.prepaidMeterNumber
        ? `Dedicated unit prepaid meter (#${dossier.utilities.prepaidMeterNumber})`
        : 'Dedicated meter verified on site',
      detail: dossier?.utilities?.powerFeederBand
        ? `Feeder Band ${dossier.utilities.powerFeederBand.replace(/_/g, ' ').toUpperCase()}`
        : 'Dedicated grid connection & backup switch',
      photoUrl: (dossier?.photoEvidence as Record<string, string> | undefined)?.meterUrl || item.photo,
      confirmed: confirmedAreas[1]
    },
    {
      id: 'water',
      no: '03',
      title: 'Water & Borehole System',
      icon: Droplet,
      summary: dossier?.utilities?.waterPumpTested
        ? 'Borehole pumping system tested & running clean'
        : 'Active water source verified on site',
      detail: dossier?.utilities?.waterQuality
        ? `Quality: ${dossier.utilities.waterQuality.replace(/_/g, ' ')}`
        : 'Dedicated overhead storage tank active',
      photoUrl: (dossier?.photoEvidence as Record<string, string> | undefined)?.waterSourceUrl || item.photo,
      confirmed: confirmedAreas[2]
    },
    {
      id: 'road',
      no: '04',
      title: 'Road, Flood & Security',
      icon: Layers,
      summary: dossier?.neighborhoodAndEnvironment?.roadCondition
        ? `${dossier.neighborhoodAndEnvironment.roadCondition.replace(/_/g, ' ')} access, low flood risk`
        : 'Tarred neighborhood road & secure perimeter',
      detail: 'Gated compound with perimeter security',
      photoUrl: (dossier?.photoEvidence as Record<string, string> | undefined)?.streetViewUrl || item.photo,
      confirmed: confirmedAreas[3]
    }
  ];

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
      {/* Dimmed Minimalist Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 82, 0.65)',
          backdropFilter: 'blur(6px)',
          WebkitBackdropFilter: 'blur(6px)',
          transition: 'opacity 0.2s ease'
        }}
      />

      {/* Main Centered Modal Window */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: '840px',
          maxHeight: '90vh',
          backgroundColor: '#FFFFFF',
          borderRadius: '20px',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 82, 0.35), 0 0 0 1px rgba(0, 0, 82, 0.08)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          zIndex: 10000
        }}
      >
        {/* Minimalist Clean Header */}
        <div
          style={{
            padding: '16px 22px',
            backgroundColor: '#FFFFFF',
            borderBottom: '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '14px',
            flexShrink: 0
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flexWrap: 'wrap' }}>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 800,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                backgroundColor: '#EEF2FF',
                color: '#4338CA',
                padding: '3px 8px',
                borderRadius: '6px'
              }}
            >
              REF-{item.listingId.slice(-4).toUpperCase()}
            </span>

            <span
              style={{
                fontSize: '11.5px',
                fontWeight: 700,
                backgroundColor: statusConfig.bg,
                color: statusConfig.color,
                border: `1px solid ${statusConfig.border}`,
                padding: '3px 10px',
                borderRadius: '999px'
              }}
            >
              {statusConfig.text}
            </span>

            <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748B' }}>
              <strong style={{ color: allConfirmed ? '#059669' : '#000052' }}>{confirmedCount} of 4</strong> reality areas verified
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            style={{
              backgroundColor: '#F1F5F9',
              border: 'none',
              color: '#475569',
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'background-color 0.15s ease'
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Scrollable Body */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '20px 22px',
            display: 'flex',
            flexDirection: 'column',
            gap: '18px',
            backgroundColor: '#FAFAFD'
          }}
        >
          {/* Minimalist Property & Field Audit Strip */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '14px',
              padding: '14px 18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '16px',
              flexWrap: 'wrap'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
              <img
                src={item.photo}
                alt=""
                style={{
                  width: '52px',
                  height: '52px',
                  borderRadius: '10px',
                  objectFit: 'cover',
                  flexShrink: 0,
                  border: '1px solid #E2E8F0'
                }}
              />
              <div style={{ minWidth: 0 }}>
                <h3
                  style={{
                    margin: 0,
                    fontSize: '15.5px',
                    fontWeight: 800,
                    color: '#000052',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {item.title}
                </h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#64748B', marginTop: '2px', flexWrap: 'wrap' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                    <MapPin size={12} color="#6366F1" /> {item.area}, Ibadan
                  </span>
                  <span>&bull;</span>
                  <span style={{ fontWeight: 700, color: '#059669' }}>₦{formatNaira(item.price)}/yr</span>
                  <span>&bull;</span>
                  <span>Lister: {item.listerName}</span>
                </div>
              </div>
            </div>

            {/* Field Officer & Geolocation Chips */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <div
                style={{
                  backgroundColor: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  borderRadius: '8px',
                  padding: '6px 12px',
                  fontSize: '11.5px',
                  color: '#475569'
                }}
              >
                <span style={{ color: '#64748B' }}>Auditor: </span>
                <strong style={{ color: '#000052' }}>{item.inspector}</strong> &bull; {item.submittedDate}
              </div>

              {dossier?.gps ? (
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${dossier.gps.latitude},${dossier.gps.longitude}`}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    backgroundColor: '#ECFDF5',
                    color: '#047857',
                    border: '1px solid #A7F3D0',
                    borderRadius: '8px',
                    padding: '6px 10px',
                    fontSize: '11.5px',
                    fontWeight: 700,
                    textDecoration: 'none'
                  }}
                  title="View coordinates on Google Maps"
                >
                  <Navigation size={12} />
                  <span>GPS Stamp Verified</span>
                  <ExternalLink size={10} />
                </a>
              ) : (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    backgroundColor: '#F1F5F9',
                    color: '#64748B',
                    borderRadius: '8px',
                    padding: '6px 10px',
                    fontSize: '11.5px',
                    fontWeight: 600
                  }}
                >
                  <MapPin size={12} /> {item.area} Region
                </span>
              )}
            </div>
          </div>

          {/* Minimalist 4 Reality Pillars Grid (2x2) */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <span style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#000052' }}>
                4 Nigerian Reality Pillars
              </span>
              <span style={{ fontSize: '11.5px', color: '#64748B' }}>
                Toggle each area to confirm on-site physical proof
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '12px' }}>
              {pillars.map((pillar, idx) => {
                const Icon = pillar.icon;
                return (
                  <div
                    key={pillar.id}
                    style={{
                      backgroundColor: '#FFFFFF',
                      border: `1.5px solid ${pillar.confirmed ? '#A7F3D0' : '#E2E8F0'}`,
                      borderRadius: '14px',
                      padding: '14px 16px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      gap: '10px',
                      boxShadow: pillar.confirmed ? '0 2px 6px rgba(5, 150, 105, 0.08)' : '0 1px 3px rgba(0, 0, 0, 0.02)',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '8px',
                            backgroundColor: pillar.confirmed ? '#ECFDF5' : '#F1F5F9',
                            color: pillar.confirmed ? '#059669' : '#000052',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                          }}
                        >
                          <Icon size={16} />
                        </div>
                        <div>
                          <div style={{ fontSize: '13.5px', fontWeight: 800, color: '#000052' }}>
                            {pillar.no}. {pillar.title}
                          </div>
                          <div style={{ fontSize: '11px', color: '#64748B', marginTop: '1px' }}>
                            {pillar.detail}
                          </div>
                        </div>
                      </div>

                      {/* 1-Click Toggle Button */}
                      <button
                        type="button"
                        onClick={() => toggleArea(idx)}
                        style={{
                          padding: '5px 11px',
                          borderRadius: '8px',
                          fontSize: '11.5px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          border: pillar.confirmed ? '1px solid #10B981' : '1px solid #CBD5E1',
                          backgroundColor: pillar.confirmed ? '#ECFDF5' : '#FFFFFF',
                          color: pillar.confirmed ? '#047857' : '#475569',
                          transition: 'all 0.15s ease',
                          flexShrink: 0
                        }}
                      >
                        {pillar.confirmed ? (
                          <>
                            <Check size={12} color="#059669" />
                            <span>Confirmed ✓</span>
                          </>
                        ) : (
                          <span>Confirm Area</span>
                        )}
                      </button>
                    </div>

                    {/* Summary & Photo Thumbnail Row */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '10px',
                        backgroundColor: '#F8FAFC',
                        borderRadius: '8px',
                        padding: '8px 10px'
                      }}
                    >
                      <p style={{ margin: 0, fontSize: '12px', color: '#334155', lineHeight: 1.4, flex: 1 }}>
                        {pillar.summary}
                      </p>

                      {pillar.photoUrl && (
                        <button
                          type="button"
                          onClick={() => setPreviewImage({ url: pillar.photoUrl, title: `${pillar.title} Evidence` })}
                          style={{
                            border: 'none',
                            padding: 0,
                            background: 'none',
                            cursor: 'pointer',
                            flexShrink: 0
                          }}
                          title="Click to view full photo evidence"
                        >
                          <img
                            src={pillar.photoUrl}
                            alt=""
                            style={{
                              width: '40px',
                              height: '40px',
                              borderRadius: '6px',
                              objectFit: 'cover',
                              border: '1px solid #CBD5E1'
                            }}
                          />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Cross-Check Photos (Clean Horizontal Row) */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '14px',
              padding: '14px 18px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <span style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#000052' }}>
                Field &amp; Lister Photo Gallery
              </span>
              <span style={{ fontSize: '11px', color: '#64748B' }}>Click any photo to enlarge</span>
            </div>

            <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '4px' }}>
              {(matchedListing?.photos && matchedListing.photos.length > 0 ? matchedListing.photos : [item.photo]).slice(0, 5).map((imgUrl, pIdx) => (
                <div
                  key={pIdx}
                  onClick={() => setPreviewImage({ url: imgUrl, title: `Property Photo #${pIdx + 1}` })}
                  style={{
                    position: 'relative',
                    width: '84px',
                    height: '64px',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    border: '1px solid #E2E8F0',
                    cursor: 'pointer',
                    flexShrink: 0
                  }}
                  title="Click to expand"
                >
                  <img src={imgUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              ))}
            </div>
          </div>

          {/* Minimalist Auditor Review Notes */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '14px',
              padding: '14px 18px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#000052' }}>
                Auditor Review Notes
              </span>
              <span style={{ fontSize: '11px', color: '#64748B' }}>Included in feedback if requesting changes</span>
            </div>

            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Physical visit completed. Borehole and prepaid meter confirmed active. Approved for Emerald badge."
              style={{
                width: '100%',
                boxSizing: 'border-box',
                border: '1px solid #CBD5E1',
                borderRadius: '8px',
                padding: '8px 12px',
                fontSize: '12.5px',
                outline: 'none',
                fontFamily: 'inherit',
                color: '#000052',
                resize: 'vertical'
              }}
            />

            {/* Quick Suggestion Chips */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
              {[
                'All 4 reality points confirmed on-site',
                'Gate access and caretaker verified',
                'Prepaid meter confirmed operational',
                'Borehole running clean'
              ].map((chip, cIdx) => (
                <button
                  key={cIdx}
                  type="button"
                  onClick={() => handleAddNoteChip(chip)}
                  style={{
                    backgroundColor: '#F8FAFC',
                    border: '1px solid #E2E8F0',
                    color: '#475569',
                    borderRadius: '999px',
                    padding: '3px 10px',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  + {chip}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Minimalist Clean Footer */}
        <div
          style={{
            padding: '14px 22px',
            backgroundColor: '#FFFFFF',
            borderTop: '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            flexWrap: 'wrap',
            flexShrink: 0
          }}
        >
          <button
            type="button"
            onClick={handleConfirmRevoke}
            disabled={isSubmitting}
            style={{
              backgroundColor: '#FFFFFF',
              color: '#DC2626',
              border: '1px solid #FECACA',
              padding: '8px 14px',
              borderRadius: '8px',
              fontSize: '12.5px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px'
            }}
          >
            <Ban size={13} />
            <span>Reject / Revoke</span>
          </button>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={handleConfirmChanges}
              disabled={isSubmitting}
              style={{
                backgroundColor: '#FFFBEB',
                color: '#B45309',
                border: '1px solid #FDE68A',
                padding: '8px 14px',
                borderRadius: '8px',
                fontSize: '12.5px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px'
              }}
            >
              <MessageSquare size={13} />
              <span>Request Changes</span>
            </button>

            <button
              type="button"
              onClick={handleConfirmApproval}
              disabled={isSubmitting}
              style={{
                backgroundColor: allConfirmed ? '#059669' : '#000052',
                color: '#FFFFFF',
                border: 'none',
                padding: '9px 18px',
                borderRadius: '8px',
                fontSize: '12.5px',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: allConfirmed ? '0 2px 8px rgba(5, 150, 105, 0.3)' : 'none'
              }}
            >
              <ShieldCheck size={14} />
              <span>{allConfirmed ? 'Approve Emerald Badge ✓' : 'Direct Approve'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Lightbox Photo Preview Modal */}
      {previewImage && (
        <div
          onClick={() => setPreviewImage(null)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100000,
            backgroundColor: 'rgba(0, 0, 82, 0.92)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px'
          }}
        >
          <div style={{ maxWidth: '90vw', maxHeight: '85vh', textAlign: 'center' }}>
            <img
              src={previewImage.url}
              alt={previewImage.title}
              style={{
                maxWidth: '100%',
                maxHeight: '75vh',
                borderRadius: '12px',
                objectFit: 'contain',
                boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
              }}
            />
            <div style={{ color: '#FFFFFF', fontSize: '13.5px', fontWeight: 700, marginTop: '12px' }}>
              {previewImage.title}
            </div>
            <div style={{ color: '#BE89FF', fontSize: '11.5px', marginTop: '4px' }}>
              Click anywhere or press ESC to close
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VerificationDetailModal;
