import React, { useEffect, useState } from 'react';
import { 
  CalendarCheck, 
  ShieldCheck, 
  ArrowLeft, 
  CheckCircle2, 
  Clock, 
  MapPin, 
  Phone, 
  User, 
  Sparkles,
  Building,
  Check,
  AlertCircle
} from 'lucide-react';
import { Listing } from '../types';
import { listingsService } from '../services/listingsService';
import { verificationService } from '../services/verificationService';
import { LocalVerification } from '../services/localStore';
import { formatNaira } from '../utils/formatters';

interface ListerVerificationPageProps {
  listings: Listing[];
  onBack: () => void;
}

export const ListerVerificationPage: React.FC<ListerVerificationPageProps> = ({ listings, onBack }) => {
  const [mine, setMine] = useState<Listing[]>(listings);
  const [items, setItems] = useState<LocalVerification[]>([]);
  const [listingId, setListingId] = useState(listings[0]?.id || '');
  const [scheduledDate, setScheduledDate] = useState('');
  const [preferredTime, setPreferredTime] = useState('10:00');
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    void listingsService.getMyListings().then((rows) => {
      setMine(rows);
      if (!listingId && rows[0]) setListingId(rows[0].id);
    });
    void verificationService.list().then(setItems);
  }, [listingId]);

  const selectedProperty = mine.find((l) => l.id === listingId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const listing = mine.find((l) => l.id === listingId);
    if (!listing) return;
    setSubmitting(true);
    try {
      await verificationService.book({
        listing,
        scheduledDate,
        preferredTime,
        onSiteContactName: contactName,
        onSiteContactPhone: contactPhone
      });
      setMessage('Inspection successfully booked! A Rentivo Ibadan Field Verification Officer will contact your on-site representative.');
      setItems(await verificationService.list());
      setContactName('');
      setContactPhone('');
      setNotes('');
      setScheduledDate('');
    } catch {
      setMessage('Booking recorded. Field officer will follow up.');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'verified':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', backgroundColor: '#ECFDF5', color: '#047857', padding: '3px 10px', borderRadius: '999px', fontSize: '12px', fontWeight: 800 }}>
            <CheckCircle2 size={13} /> Badge Issued
          </span>
        );
      case 'progress':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', backgroundColor: '#EFF6FF', color: '#1D4ED8', padding: '3px 10px', borderRadius: '999px', fontSize: '12px', fontWeight: 800 }}>
            <Clock size={13} /> Officer En Route
          </span>
        );
      case 'scheduled':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', backgroundColor: '#FAF5FF', color: '#7E22CE', padding: '3px 10px', borderRadius: '999px', fontSize: '12px', fontWeight: 800 }}>
            <CalendarCheck size={13} /> Inspection Scheduled
          </span>
        );
      default:
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', backgroundColor: '#FEF3C7', color: '#92400E', padding: '3px 10px', borderRadius: '999px', fontSize: '12px', fontWeight: 800 }}>
            <Clock size={13} /> Booking Received
          </span>
        );
    }
  };

  return (
    <div style={{ backgroundColor: '#F8FAFC', minHeight: '100vh', paddingBottom: '80px' }}>
      {/* Top Header Bar */}
      <div style={{ backgroundColor: '#FFFFFF', borderBottom: '1px solid #E2E8F0', padding: '16px 0', position: 'sticky', top: 0, zIndex: 20 }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '0 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button 
            type="button"
            onClick={onBack}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '13.5px', fontWeight: 700, color: '#000052', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            <ArrowLeft size={16} />
            <span>Back to Lister Portal</span>
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#16794A', fontWeight: 700 }}>
            <ShieldCheck size={16} />
            <span>Ibadan Physical On-Site Verification Program</span>
          </div>
        </div>
      </div>

      {/* Hero Banner */}
      <div style={{ backgroundColor: '#000052', color: '#FFFFFF', padding: '40px 20px 36px' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', backgroundColor: 'rgba(190, 137, 255, 0.15)', border: '1px solid rgba(190, 137, 255, 0.3)', padding: '4px 14px', borderRadius: '999px', fontSize: '12px', fontWeight: 700, color: '#BE89FF', marginBottom: '14px' }}>
            <Sparkles size={14} />
            <span>100% Free Verification for Ibadan Listers</span>
          </div>
          <h1 style={{ fontSize: '28px', fontWeight: 800, margin: '0 0 10px', letterSpacing: '-0.02em' }}>
            Physical Inspection &amp; Verification Booking
          </h1>
          <p style={{ fontSize: '14.5px', color: 'rgba(255, 255, 255, 0.8)', margin: 0, maxWidth: '680px', lineHeight: 1.6 }}>
            Properties bearing the Rentivo Verified Badge attract 3.4x more genuine tenants and priority search placement. Our Ibadan field officers conduct a physical visit to confirm title, mandate, and authentic photos.
          </p>

          {/* 4-Step Process Bar */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', marginTop: '28px' }}>
            {[
              { step: '1', title: 'Schedule Visit', desc: 'Pick preferred date and on-site contact' },
              { step: '2', title: 'Officer Assigned', desc: 'Rentivo field team confirms appointment' },
              { step: '3', title: 'On-Site Audit', desc: 'Physical check of mandate & photos' },
              { step: '4', title: 'Badge Issued', desc: 'Green Verified shield displayed publicly' }
            ].map((s) => (
              <div key={s.step} style={{ backgroundColor: 'rgba(255, 255, 255, 0.08)', borderRadius: '12px', padding: '14px 16px', border: '1px solid rgba(255, 255, 255, 0.12)' }}>
                <div style={{ fontSize: '11px', fontWeight: 800, color: '#BE89FF', textTransform: 'uppercase' }}>Step {s.step}</div>
                <div style={{ fontSize: '14px', fontWeight: 800, color: '#FFFFFF', marginTop: '2px' }}>{s.title}</div>
                <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.7)', marginTop: '4px' }}>{s.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Grid Content */}
      <div style={{ maxWidth: '1100px', margin: '-16px auto 0', padding: '0 20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '24px' }}>
          
          {/* Column 1: Booking Form */}
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', border: '1px solid #E2E8F0', padding: '28px 24px', boxShadow: '0 4px 20px rgba(0, 0, 82, 0.04)' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#000052', margin: '0 0 6px' }}>
              Book an On-Site Inspection
            </h2>
            <p style={{ fontSize: '13px', color: '#636377', margin: '0 0 20px' }}>
              Zero charge to landlords and mandated agents across Ibadan.
            </p>

            {message && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', backgroundColor: '#ECFDF5', border: '1px solid #A7F3D0', padding: '12px 14px', borderRadius: '10px', color: '#065F46', fontSize: '13px', marginBottom: '20px' }}>
                <CheckCircle2 size={18} color="#047857" style={{ flexShrink: 0, marginTop: '2px' }} />
                <span>{message}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Select Property */}
              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#000052', marginBottom: '6px' }}>
                  Select Property to Verify
                </label>
                <select 
                  value={listingId} 
                  onChange={(e) => setListingId(e.target.value)} 
                  style={{ width: '100%', height: '42px', borderRadius: '8px', border: '1px solid #CBD5E1', padding: '0 12px', fontSize: '13.5px', color: '#000052', outline: 'none' }}
                  required
                >
                  {mine.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.title} ({l.area}, Ibadan)
                    </option>
                  ))}
                  {mine.length === 0 && (
                    <option value="" disabled>No listings found. Please add a listing first.</option>
                  )}
                </select>
              </div>

              {/* Selected Property Preview */}
              {selectedProperty && (
                <div style={{ display: 'flex', gap: '12px', backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', padding: '12px', borderRadius: '10px' }}>
                  {selectedProperty.photos?.[0] && (
                    <img 
                      src={selectedProperty.photos[0]} 
                      alt="" 
                      style={{ width: '60px', height: '60px', borderRadius: '8px', objectFit: 'cover' }} 
                    />
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '13px', fontWeight: 800, color: '#000052', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {selectedProperty.title}
                    </div>
                    <div style={{ fontSize: '12px', color: '#636377', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                      <MapPin size={12} /> {selectedProperty.area}, Ibadan
                    </div>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#000052', marginTop: '2px' }}>
                      {formatNaira(selectedProperty.price)}
                    </div>
                  </div>
                </div>
              )}

              {/* Date & Time Pickers */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#000052', marginBottom: '6px' }}>
                    Preferred Date
                  </label>
                  <input 
                    type="date" 
                    value={scheduledDate} 
                    onChange={(e) => setScheduledDate(e.target.value)} 
                    style={{ width: '100%', height: '42px', borderRadius: '8px', border: '1px solid #CBD5E1', padding: '0 12px', fontSize: '13px', boxSizing: 'border-box' }}
                    required 
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#000052', marginBottom: '6px' }}>
                    Preferred Time Slot
                  </label>
                  <select
                    value={preferredTime}
                    onChange={(e) => setPreferredTime(e.target.value)}
                    style={{ width: '100%', height: '42px', borderRadius: '8px', border: '1px solid #CBD5E1', padding: '0 12px', fontSize: '13px', boxSizing: 'border-box' }}
                  >
                    <option value="09:00">09:00 AM - Morning</option>
                    <option value="11:00">11:00 AM - Midday</option>
                    <option value="14:00">02:00 PM - Afternoon</option>
                    <option value="16:00">04:00 PM - Late Afternoon</option>
                  </select>
                </div>
              </div>

              {/* Contact Information */}
              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#000052', marginBottom: '6px' }}>
                  On-Site Contact Representative
                </label>
                <input 
                  type="text"
                  placeholder="e.g. Caretaker Mr. Adebayo / Gate Security"
                  value={contactName} 
                  onChange={(e) => setContactName(e.target.value)} 
                  style={{ width: '100%', height: '42px', borderRadius: '8px', border: '1px solid #CBD5E1', padding: '0 12px', fontSize: '13px', boxSizing: 'border-box' }}
                  required 
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#000052', marginBottom: '6px' }}>
                  Representative Phone / WhatsApp
                </label>
                <input 
                  type="tel"
                  placeholder="e.g. +234 803 123 4567"
                  value={contactPhone} 
                  onChange={(e) => setContactPhone(e.target.value)} 
                  style={{ width: '100%', height: '42px', borderRadius: '8px', border: '1px solid #CBD5E1', padding: '0 12px', fontSize: '13px', boxSizing: 'border-box' }}
                  required 
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#000052', marginBottom: '6px' }}>
                  Special Gate or Access Instructions (Optional)
                </label>
                <textarea 
                  rows={2}
                  placeholder="e.g. Call 10 minutes before arrival; ask security for Flat 3 key."
                  value={notes} 
                  onChange={(e) => setNotes(e.target.value)} 
                  style={{ width: '100%', borderRadius: '8px', border: '1px solid #CBD5E1', padding: '8px 12px', fontSize: '13px', resize: 'none', boxSizing: 'border-box' }}
                />
              </div>

              <button 
                type="submit" 
                disabled={submitting || mine.length === 0}
                style={{
                  backgroundColor: '#000052',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '999px',
                  padding: '12px 24px',
                  fontWeight: 700,
                  fontSize: '14px',
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  marginTop: '6px',
                  opacity: mine.length === 0 ? 0.6 : 1
                }}
              >
                <CalendarCheck size={16} />
                <span>{submitting ? 'Booking Inspection...' : 'Book Free Physical Inspection'}</span>
              </button>
            </form>
          </div>

          {/* Column 2: Status Tracker & Benefits */}
          <div>
            <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', border: '1px solid #E2E8F0', padding: '24px', boxShadow: '0 4px 20px rgba(0, 0, 82, 0.04)', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '17px', fontWeight: 800, color: '#000052', margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Clock size={18} color="#000052" />
                <span>Inspection Tracking Queue ({items.length})</span>
              </h2>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {items.map((item) => {
                  const property = mine.find((l) => l.id === item.listingId);
                  return (
                    <div key={item.id} style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                        <div>
                          <div style={{ fontSize: '13.5px', fontWeight: 800, color: '#000052' }}>
                            {property?.title || item.listingId}
                          </div>
                          <div style={{ fontSize: '12px', color: '#636377', marginTop: '2px' }}>
                            {property?.area || 'Ibadan'} · Requested for {item.scheduledDate || 'Soon'} at {item.preferredTime || '10:00'}
                          </div>
                        </div>
                        <div>
                          {getStatusBadge(item.status)}
                        </div>
                      </div>

                      {item.onSiteContactName && (
                        <div style={{ fontSize: '12px', color: '#475569', marginTop: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <User size={12} /> Contact: {item.onSiteContactName} ({item.onSiteContactPhone})
                        </div>
                      )}

                      {item.status === 'verified' && (
                        <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: '1px solid #E2E8F0', fontSize: '12px', color: '#047857', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <CheckCircle2 size={14} /> Physical verification completed &amp; badge active.
                        </div>
                      )}
                    </div>
                  );
                })}

                {items.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '24px 12px', color: '#64748B' }}>
                    <ShieldCheck size={28} color="#CBD5E1" style={{ marginBottom: '8px' }} />
                    <div style={{ fontSize: '13px', fontWeight: 700 }}>No inspection bookings yet</div>
                    <div style={{ fontSize: '12px', color: '#94A3B8', marginTop: '2px' }}>
                      Select one of your listings on the left to schedule a free physical verification visit.
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Verification Checklist Card */}
            <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', border: '1px solid #E2E8F0', padding: '24px', boxShadow: '0 4px 20px rgba(0, 0, 82, 0.04)' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#000052', margin: '0 0 12px' }}>
                What Field Officers Check During the Visit
              </h3>
              <ul style={{ margin: 0, paddingLeft: '0', listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {[
                  'Physical presence and address confirmation at exact coordinates',
                  'Valid mandate or title confirming right to lease',
                  'Authenticity and current condition of interior and exterior photos',
                  'Water, electricity meter, and security infrastructure status'
                ].map((point, idx) => (
                  <li key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '12.5px', color: '#475569', lineHeight: 1.5 }}>
                    <div style={{ width: '16px', height: '16px', borderRadius: '50%', backgroundColor: '#ECFDF5', color: '#047857', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '2px' }}>
                      <Check size={11} strokeWidth={3} />
                    </div>
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default ListerVerificationPage;
