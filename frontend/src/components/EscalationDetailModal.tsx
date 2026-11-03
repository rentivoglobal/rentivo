import React, { useState, useEffect } from 'react';
import {
  X,
  AlertTriangle,
  Clock,
  Check,
  Ban,
  Phone,
  MessageSquare,
  User,
  MapPin,
  Calendar,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import { formatNaira } from '../utils/formatters';

export interface EscalationItem {
  id: string;
  listingId: string;
  listingTitle: string;
  area: string;
  listingPrice: number;
  listerName: string;
  listerPhone: string;
  listerEmail?: string;
  listerRole?: string;
  renterName: string;
  renterEmail: string;
  renterPhone: string;
  renterNotes?: string;
  createdAt: string;
  timeSinceRequest: string;
  automatedStatus: 'No response' | 'Delivered, unread' | 'Delivered';
  isOverdue: boolean;
  photo: string;
  status?: string;
}

interface EscalationDetailModalProps {
  isOpen: boolean;
  escalation: EscalationItem | null;
  onClose: () => void;
  onConfirmAvailable: (esc: EscalationItem) => Promise<void>;
  onMarkUnavailable: (esc: EscalationItem) => Promise<void>;
  onDelistProperty: (esc: EscalationItem, notes: string) => Promise<void>;
}

export const EscalationDetailModal: React.FC<EscalationDetailModalProps> = ({
  isOpen,
  escalation,
  onClose,
  onConfirmAvailable,
  onMarkUnavailable,
  onDelistProperty
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [showDelistConfirm, setShowDelistConfirm] = useState(false);
  const [delistNotes, setDelistNotes] = useState(
    'Lister unreachable after repeated follow-up calls. Delisted to maintain marketplace integrity.'
  );

  useEffect(() => {
    if (isOpen) {
      setShowDelistConfirm(false);
      setDelistNotes(
        'Lister unreachable after repeated follow-up calls. Delisted to maintain marketplace integrity.'
      );
    }
  }, [isOpen, escalation]);

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape' && !isProcessing) {
        if (showDelistConfirm) {
          setShowDelistConfirm(false);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isProcessing, showDelistConfirm, onClose]);

  if (!isOpen || !escalation) return null;

  const handleConfirmAvailableClick = async () => {
    try {
      setIsProcessing(true);
      await onConfirmAvailable(escalation);
      onClose();
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMarkUnavailableClick = async () => {
    try {
      setIsProcessing(true);
      await onMarkUnavailable(escalation);
      onClose();
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDelistConfirmClick = async () => {
    try {
      setIsProcessing(true);
      await onDelistProperty(escalation, delistNotes);
      setShowDelistConfirm(false);
      onClose();
    } finally {
      setIsProcessing(false);
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
        onClick={() => !isProcessing && onClose()}
        style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 82, 0.65)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          transition: 'opacity 0.2s ease'
        }}
      />

      {/* Main Escalation Modal Card */}
      {!showDelistConfirm ? (
        <div
          style={{
            position: 'relative',
            width: '100%',
            maxWidth: '680px',
            maxHeight: '90vh',
            backgroundColor: '#FFFFFF',
            borderRadius: '24px',
            boxShadow: '0 25px 60px -15px rgba(0, 0, 82, 0.35), 0 0 0 1px rgba(0, 0, 82, 0.08)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            zIndex: 10000
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '18px 24px',
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: 0 }}>
              <img
                src={escalation.photo}
                alt=""
                style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '10px',
                  objectFit: 'cover',
                  flexShrink: 0,
                  border: '1px solid rgba(255, 255, 255, 0.2)'
                }}
              />
              <div style={{ minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
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
                    {escalation.listingTitle}
                  </h2>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 800,
                      padding: '2px 8px',
                      borderRadius: '999px',
                      backgroundColor: escalation.isOverdue ? 'rgba(239, 68, 68, 0.25)' : 'rgba(5, 150, 105, 0.25)',
                      color: escalation.isOverdue ? '#FCA5A5' : '#6EE7B7',
                      border: `1px solid ${escalation.isOverdue ? 'rgba(239, 68, 68, 0.4)' : 'rgba(5, 150, 105, 0.4)'}`
                    }}
                  >
                    {escalation.isOverdue ? 'Response Overdue' : 'Within Window'}
                  </span>
                </div>
                <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.75)', marginTop: '2px' }}>
                  {escalation.area}, Ibadan &bull; <strong style={{ color: '#BE89FF' }}>₦{formatNaira(escalation.listingPrice)}</strong> / year
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              disabled={isProcessing}
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
                cursor: 'pointer'
              }}
            >
              <X size={16} />
            </button>
          </div>

          {/* Body */}
          <div
            style={{
              padding: '24px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '18px',
              backgroundColor: '#FFFFFF'
            }}
          >
            {/* Overdue Warning Callout */}
            {escalation.isOverdue && (
              <div
                style={{
                  padding: '12px 16px',
                  backgroundColor: '#FFF1F2',
                  border: '1px solid #FECDD3',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '10px'
                }}
              >
                <AlertTriangle size={18} color="#BE123C" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div style={{ fontSize: '12.5px', color: '#881337', lineHeight: 1.5 }}>
                  <strong>Availability SLA Exceeded:</strong> The landlord has not confirmed vacancy within the automated response window. Direct phone outreach is recommended before resolving or delisting.
                </div>
              </div>
            )}

            {/* 2-Column: Seeker Inquiry vs Lister Outreach */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
              {/* Seeker Card */}
              <div
                style={{
                  backgroundColor: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  borderRadius: '14px',
                  padding: '16px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                  <User size={15} color="#000052" />
                  <span style={{ fontSize: '13px', fontWeight: 800, color: '#000052' }}>
                    Seeker Access Request
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12.5px' }}>
                  <div>
                    <span style={{ color: '#64748B', display: 'block', fontSize: '11px' }}>Seeker Name</span>
                    <strong style={{ color: '#000052' }}>{escalation.renterName}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748B', display: 'block', fontSize: '11px' }}>Phone</span>
                    <span style={{ color: '#334155' }}>{escalation.renterPhone}</span>
                  </div>
                  <div>
                    <span style={{ color: '#64748B', display: 'block', fontSize: '11px' }}>Elapsed Waiting Time</span>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontWeight: 700,
                        color: escalation.isOverdue ? '#BE123C' : '#475569',
                        marginTop: '2px'
                      }}
                    >
                      <Clock size={12} /> {escalation.timeSinceRequest}
                    </span>
                  </div>
                  {escalation.renterNotes && (
                    <div style={{ marginTop: '4px', padding: '8px 10px', backgroundColor: '#FFFFFF', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                      <span style={{ color: '#64748B', display: 'block', fontSize: '11px', fontWeight: 700 }}>Move-In / Inspection Note:</span>
                      <span style={{ color: '#000052', fontSize: '12px', fontStyle: 'italic' }}>"{escalation.renterNotes}"</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Lister Card */}
              <div
                style={{
                  backgroundColor: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  borderRadius: '14px',
                  padding: '16px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                  <Phone size={15} color="#000052" />
                  <span style={{ fontSize: '13px', fontWeight: 800, color: '#000052' }}>
                    Lister Outreach &amp; Actions
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12.5px', marginBottom: '14px' }}>
                  <div>
                    <span style={{ color: '#64748B', display: 'block', fontSize: '11px' }}>Lister Name</span>
                    <strong style={{ color: '#000052' }}>{escalation.listerName}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748B', display: 'block', fontSize: '11px' }}>Phone Number</span>
                    <span style={{ color: '#334155' }}>{escalation.listerPhone || 'Not provided'}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <a
                    href={escalation.listerPhone ? `tel:${escalation.listerPhone.replace(/\s/g, '')}` : '#'}
                    style={{
                      flex: 1,
                      backgroundColor: '#BE123C',
                      color: '#FFFFFF',
                      borderRadius: '8px',
                      padding: '8px 12px',
                      fontSize: '12px',
                      fontWeight: 700,
                      textDecoration: 'none',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px'
                    }}
                  >
                    <Phone size={13} />
                    <span>Call Lister</span>
                  </a>

                  <a
                    href={`https://wa.me/${escalation.listerPhone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Hello ${escalation.listerName}, this is Rentivo Admin regarding seeker access request on "${escalation.listingTitle}". Please confirm availability.`)}`}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      flex: 1,
                      backgroundColor: '#16794A',
                      color: '#FFFFFF',
                      borderRadius: '8px',
                      padding: '8px 12px',
                      fontSize: '12px',
                      fontWeight: 700,
                      textDecoration: 'none',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px'
                    }}
                  >
                    <MessageSquare size={13} />
                    <span>WhatsApp</span>
                  </a>
                </div>
              </div>
            </div>

            {/* Audit Trail Context */}
            <div
              style={{
                backgroundColor: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: '12px',
                padding: '12px 16px',
                fontSize: '12px',
                color: '#64748B',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#000052', fontWeight: 700 }}>
                <ShieldCheck size={14} color="#000052" />
                <span>Rentivo Availability Guarantee Protocol</span>
              </div>
              <p style={{ margin: 0, lineHeight: 1.4 }}>
                If the lister confirms the home is still vacant, click &quot;Confirm Available&quot; to allow the seeker to proceed to address checkout. If already taken, click &quot;Mark Taken&quot;. If unreachable, delist the property to protect seekers.
              </p>
            </div>
          </div>

          {/* Footer Actions */}
          <div
            style={{
              padding: '16px 24px',
              backgroundColor: '#F8FAFC',
              borderTop: '1px solid #E2E8F0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              flexWrap: 'wrap'
            }}
          >
            <button
              type="button"
              onClick={() => setShowDelistConfirm(true)}
              disabled={isProcessing}
              style={{
                backgroundColor: '#FFF1F2',
                color: '#BE123C',
                border: '1px solid #FECDD3',
                borderRadius: '8px',
                padding: '10px 16px',
                fontSize: '12.5px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Ban size={14} />
              <span>Delist Unresponsive Property</span>
            </button>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                onClick={handleMarkUnavailableClick}
                disabled={isProcessing}
                style={{
                  backgroundColor: '#FFFFFF',
                  color: '#475569',
                  border: '1px solid #CBD5E1',
                  borderRadius: '8px',
                  padding: '10px 16px',
                  fontSize: '12.5px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Mark Already Taken
              </button>

              <button
                type="button"
                onClick={handleConfirmAvailableClick}
                disabled={isProcessing}
                style={{
                  backgroundColor: '#059669',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '10px 18px',
                  fontSize: '12.5px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 2px 8px rgba(5, 150, 105, 0.25)'
                }}
              >
                <Check size={15} />
                <span>Confirm Available &bull; Proceed Seeker</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Confirmation Dialog for Delisting */
        <div
          style={{
            position: 'relative',
            width: '100%',
            maxWidth: '520px',
            backgroundColor: '#FFFFFF',
            borderRadius: '20px',
            boxShadow: '0 25px 60px -15px rgba(0, 0, 82, 0.35)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            zIndex: 10000
          }}
        >
          <div
            style={{
              padding: '16px 20px',
              backgroundColor: '#FEF2F2',
              borderBottom: '1px solid #FEE2E2',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  backgroundColor: '#FEE2E2',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#DC2626'
                }}
              >
                <Ban size={18} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#991B1B' }}>
                  Delist Property &amp; Cancel Request?
                </h3>
                <div style={{ fontSize: '12px', color: '#B91C1C', marginTop: '2px' }}>
                  Action for unresponsive lister on &quot;{escalation.listingTitle}&quot;
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowDelistConfirm(false)}
              disabled={isProcessing}
              style={{ background: 'none', border: 'none', color: '#991B1B', cursor: 'pointer' }}
            >
              <X size={16} />
            </button>
          </div>

          <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <p style={{ margin: 0, fontSize: '13px', color: '#475569', lineHeight: 1.5 }}>
              This will mark the property as unavailable/delisted, notify the seeker that the landlord failed to respond, and refund or close the access request.
            </p>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#000052', display: 'block', marginBottom: '6px' }}>
                Internal Audit Note
              </label>
              <textarea
                rows={3}
                value={delistNotes}
                onChange={(e) => setDelistNotes(e.target.value)}
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
          </div>

          <div
            style={{
              padding: '14px 20px',
              backgroundColor: '#F8FAFC',
              borderTop: '1px solid #E2E8F0',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '10px'
            }}
          >
            <button
              type="button"
              onClick={() => setShowDelistConfirm(false)}
              disabled={isProcessing}
              style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #CBD5E1',
                padding: '8px 16px',
                borderRadius: '8px',
                fontSize: '12.5px',
                fontWeight: 700,
                color: '#475569',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDelistConfirmClick}
              disabled={isProcessing}
              style={{
                backgroundColor: '#DC2626',
                border: 'none',
                padding: '8px 18px',
                borderRadius: '8px',
                fontSize: '12.5px',
                fontWeight: 700,
                color: '#FFFFFF',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Ban size={14} />
              <span>{isProcessing ? 'Delisting…' : 'Confirm Delist'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
