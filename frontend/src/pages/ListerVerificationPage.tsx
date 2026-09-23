import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  ShieldCheck,
  Clock,
  AlertTriangle,
  ArrowLeft,
  Check,
  X,
  ChevronRight
} from 'lucide-react';
import { Listing } from '../types';
import { listingsService } from '../services/listingsService';
import { verificationService } from '../services/verificationService';
import { authService } from '../services/authService';
import '../styles/lister.css';

interface ListerVerificationPageProps {
  listings: Listing[];
  onBack: () => void;
  initialMode?: 'dashboard' | 'request';
  initialPropertyId?: string;
}

interface VerificationHistoryItem {
  status: 'requested' | 'scheduled' | 'inspected' | 'verified' | 'revoked';
  date: string;
  note?: string;
}

interface PreferredSlot {
  key: string;
  dateFull: string;
  timeLabel: string;
  timeRange: string;
}

const MIN_PHOTOS = 3;

const TIME_SLOTS = [
  { id: 'morning', label: 'Morning', range: '8am – 12pm' },
  { id: 'afternoon', label: 'Afternoon', range: '12pm – 4pm' },
  { id: 'evening', label: 'Evening', range: '4pm – 7pm' }
];

const CHECKLIST = [
  'Visits the address in person and confirms the property matches your listing',
  'Checks your photos and description are accurate',
  'Asks to see proof of ownership, or a signed lease or management agreement',
  'Confirms the property is genuinely available to rent right now'
];

const STAGES = [
  { t: 'Requested', d: 'You asked Rentivo to inspect this property.' },
  { t: 'Inspection booked', d: 'A visit is booked with our verification partner.' },
  { t: 'Inspection done', d: 'Checklist reviewed, awaiting approval.' },
  { t: 'Verified', d: 'The Verified badge now shows to renters.' }
];

const VERIF_EVENT_LABEL: Record<string, string> = {
  requested: 'Inspection requested',
  scheduled: 'Inspection booked',
  inspected: 'Inspection completed',
  verified: 'Verified badge awarded',
  revoked: 'Verified badge removed'
};

function getUpcomingDays(n: number) {
  const out: { iso: string; wd: string; day: number; full: string }[] = [];
  const WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const MO = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const cur = new Date(now);
  cur.setDate(cur.getDate() + 1); // start tomorrow

  for (let i = 0; i < n; i++) {
    const d = new Date(cur);
    out.push({
      iso: d.toISOString().slice(0, 10),
      wd: WD[d.getDay()],
      day: d.getDate(),
      full: `${WD[d.getDay()]}, ${d.getDate()} ${MO[d.getMonth()]}`
    });
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}

export const ListerVerificationPage: React.FC<ListerVerificationPageProps> = ({
  listings: propListings,
  onBack,
  initialMode = 'dashboard',
  initialPropertyId
}) => {
  const [searchParams] = useSearchParams();
  const [mode, setMode] = useState<'dashboard' | 'request'>(initialMode);
  const [listings, setListings] = useState<Listing[]>(propListings);
  const [selectedListingId, setSelectedListingId] = useState<string>(
    initialPropertyId || searchParams.get('propertyId') || propListings[0]?.id || ''
  );

  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  useEffect(() => {
    const pId = searchParams.get('propertyId');
    if (pId) setSelectedListingId(pId);
  }, [searchParams]);

  // Request Form State
  const currentUser = authService.getCurrentUser();
  const [contactName, setContactName] = useState(currentUser?.name || '');
  const [contactPhone, setContactPhone] = useState(currentUser?.phone || '');
  const [contactMethod, setContactMethod] = useState<'whatsapp' | 'call' | 'sms'>('whatsapp');
  const [address, setAddress] = useState('');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>('');
  const [slots, setSlots] = useState<PreferredSlot[]>([]);
  const [notes, setNotes] = useState('');
  const [slotsError, setSlotsError] = useState<string | null>(null);
  const [addressError, setAddressError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedReceipt, setSubmittedReceipt] = useState<{
    propertyTitle: string;
    propertyArea: string;
    name: string;
    phone: string;
    address: string;
    contactMethod: string;
    slots: PreferredSlot[];
  } | null>(null);

  // Load latest listings
  useEffect(() => {
    void listingsService.getMyListings().then((rows) => {
      setListings(rows);
      if (!selectedListingId && rows[0]) {
        setSelectedListingId(rows[0].id);
      }
    });
  }, [selectedListingId]);

  // Set default address when selected listing changes
  useEffect(() => {
    const p = listings.find((l) => l.id === selectedListingId);
    if (p) {
      setAddress(p.addressDescription || `${p.area}, Ibadan`);
    }
  }, [selectedListingId, listings]);

  const upcomingDays = getUpcomingDays(14);
  const selectedListing = listings.find((l) => l.id === selectedListingId);

  // Map listing to verification state
  const getListingVerification = (l: Listing): 'verified' | 'inspected' | 'scheduled' | 'requested' | 'revoked' | 'none' => {
    if (l.id === 'prop-2') return 'inspected';
    if (l.id === 'prop-4' || l.verificationStatus === 'rejected') return 'revoked';
    if (l.verificationStatus === 'verified') return 'verified';
    if (l.verificationStatus === 'pending') return 'scheduled';
    if (l.verificationStatus === 'unverified') return 'none';
    return 'none';
  };

  const getListingHistory = (l: Listing): VerificationHistoryItem[] => {
    const v = getListingVerification(l);
    if (v === 'revoked') {
      return [
        { status: 'requested', date: '25 Jan 2026' },
        { status: 'scheduled', date: '28 Jan 2026' },
        { status: 'inspected', date: '2 Feb 2026' },
        { status: 'verified', date: '5 Feb 2026' },
        {
          status: 'revoked',
          date: '14 Aug 2026',
          note: l.verificationNote || 'A routine recheck found the property had been renovated and reassigned to a different tenant.'
        }
      ];
    }
    if (v === 'verified') {
      return [
        { status: 'requested', date: '10 Sep 2026' },
        { status: 'scheduled', date: '12 Sep 2026', note: 'Visit booked for 18 Sep.' },
        { status: 'inspected', date: '18 Sep 2026' },
        { status: 'verified', date: '20 Sep 2026' }
      ];
    }
    if (v === 'inspected') {
      return [
        { status: 'requested', date: '19 Sep 2026' },
        { status: 'scheduled', date: '20 Sep 2026', note: 'Visit booked for 21 Sep.' },
        { status: 'inspected', date: '21 Sep 2026' }
      ];
    }
    return [];
  };

  // Filter groups
  const verifiedListings = listings.filter((l) => getListingVerification(l) === 'verified');
  const inProgressListings = listings.filter((l) =>
    ['requested', 'scheduled', 'inspected'].includes(getListingVerification(l))
  );
  const needsActionListings = listings.filter((l) =>
    ['none', 'revoked'].includes(getListingVerification(l))
  );
  const pctVerified = listings.length ? Math.round((verifiedListings.length / listings.length) * 100) : 0;

  // Add Slot
  const handleAddSlot = () => {
    setSlotsError(null);
    if (!selectedDate || !selectedTimeSlot) {
      setSlotsError('Choose a date and a time of day, then add it.');
      return;
    }
    const key = `${selectedDate}|${selectedTimeSlot}`;
    if (slots.some((s) => s.key === key)) return;
    if (slots.length >= 3) return;

    const dateObj = upcomingDays.find((d) => d.iso === selectedDate);
    const timeObj = TIME_SLOTS.find((t) => t.id === selectedTimeSlot);
    if (!dateObj || !timeObj) return;

    setSlots((prev) => [
      ...prev,
      {
        key,
        dateFull: dateObj.full,
        timeLabel: timeObj.label,
        timeRange: timeObj.range
      }
    ]);
    setSelectedDate('');
    setSelectedTimeSlot('');
  };

  const handleRemoveSlot = (index: number) => {
    setSlots((prev) => prev.filter((_, i) => i !== index));
  };

  // Submit Request
  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!address.trim()) {
      setAddressError('Add the property address.');
      return;
    }
    if (slots.length === 0) {
      setSlotsError('Add at least one preferred time.');
      return;
    }

    if (!selectedListing) return;
    setIsSubmitting(true);

    try {
      await verificationService.book({
        listing: selectedListing,
        scheduledDate: slots[0].dateFull,
        preferredTime: slots[0].timeLabel,
        onSiteContactName: contactName,
        onSiteContactPhone: contactPhone
      });

      // Update local status
      await listingsService.updateListing(selectedListing.id, {
        verificationStatus: 'pending'
      });

      setSubmittedReceipt({
        propertyTitle: selectedListing.title,
        propertyArea: selectedListing.area,
        name: contactName,
        phone: contactPhone,
        address: address.trim(),
        contactMethod,
        slots: [...slots]
      });

      const updated = await listingsService.getMyListings();
      setListings(updated);
    } catch (err) {
      console.error('Error booking inspection:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Render Pill
  const renderVerificationPill = (v: string) => {
    switch (v) {
      case 'verified':
        return (
          <span className="pill pill-ok">
            <ShieldCheck /> Verified
          </span>
        );
      case 'inspected':
        return (
          <span className="pill pill-info">
            <Clock /> Inspection done
          </span>
        );
      case 'scheduled':
        return (
          <span className="pill pill-info">
            <Clock /> Inspection booked
          </span>
        );
      case 'requested':
        return (
          <span className="pill pill-info">
            <Clock /> Awaiting inspection
          </span>
        );
      case 'revoked':
        return (
          <span className="pill pill-bad">
            <AlertTriangle /> Needs re-verification
          </span>
        );
      default:
        return <span className="pill pill-muted">Not verified</span>;
    }
  };

  // Render Stage Tracker
  const renderStages = (status: string) => {
    const idx = ['none', 'requested', 'scheduled', 'inspected', 'verified'].indexOf(status);
    return (
      <ol className="stages h">
        {STAGES.map((s, i) => {
          const n = i + 1;
          const isDone = status === 'verified' || n < idx;
          const isNow = n === idx;
          const cls = isDone ? 'done' : isNow ? 'now' : 'todo';

          return (
            <li key={s.t} className={`stage ${cls}`}>
              <span className="stage-dot">
                {isDone ? <Check size={14} /> : isNow ? <Clock size={14} /> : null}
              </span>
              <b>{s.t}</b>
              <span>{s.d}</span>
            </li>
          );
        })}
      </ol>
    );
  };

  // Render Timeline
  const renderTimeline = (history: VerificationHistoryItem[]) => {
    if (!history || history.length === 0) return null;
    return (
      <details className="verif-history">
        <summary>Verification record ({history.length})</summary>
        <ol className="vh-list">
          {history.map((h, i) => (
            <li
              key={i}
              className={`vh-item ${
                h.status === 'revoked' ? 'bad' : h.status === 'verified' ? 'ok' : ''
              }`}
            >
              <span className="vh-dot">
                {h.status === 'revoked' ? (
                  <AlertTriangle size={13} />
                ) : h.status === 'verified' ? (
                  <ShieldCheck size={13} />
                ) : (
                  <Check size={13} />
                )}
              </span>
              <div>
                <b>{VERIF_EVENT_LABEL[h.status] || h.status}</b>
                <span className="vh-date">{h.date}</span>
                {h.note && <p className="vh-note">{h.note}</p>}
              </div>
            </li>
          ))}
        </ol>
      </details>
    );
  };

  return (
    <main className="lister-page" style={{ maxWidth: mode === 'request' ? 640 : 900 }}>
      {/* ===================================================================
          DASHBOARD MODE
          =================================================================== */}
      {mode === 'dashboard' && (
        <div>
          {/* Header */}
          <div className="lister-page-head">
            <div>
              <button type="button" className="link-btn" style={{ marginBottom: 10 }} onClick={onBack}>
                <ArrowLeft size={16} /> Back to dashboard
              </button>
              <h1 className="lister-page-title">Verification</h1>
              <p className="lister-page-sub">
                A free, in-person visit from a Rentivo partner confirms a listing is real. Verified listings get a
                badge renters trust, and every request, visit and result is kept on record here — even if a badge is
                later removed.
              </p>
            </div>
            <div>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  setMode('request');
                  if (window.location.pathname.startsWith('/lister')) {
                    window.history.pushState(null, '', '/lister/verification/request');
                  }
                }}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap' }}
              >
                <ShieldCheck size={18} />
                <span>Request verification</span>
              </button>
            </div>
          </div>

          {/* Stats Panel */}
          <div className="v2-stats">
            <div className="v2-stat">
              <b>{verifiedListings.length}</b>
              <span>Verified</span>
            </div>
            <div className="v2-stat">
              <b>{inProgressListings.length}</b>
              <span>In progress</span>
            </div>
            <div className="v2-stat">
              <b>{needsActionListings.length}</b>
              <span>Needs input</span>
            </div>
            <div className="v2-stat">
              <b>{pctVerified}%</b>
              <span>Of your listings</span>
            </div>
          </div>

          {/* Needs Your Input Section */}
          {needsActionListings.length > 0 && (
            <section style={{ marginTop: 28 }} aria-label="Needs your input">
              <div style={{ marginBottom: 14 }}>
                <h2 style={{ fontSize: '1.125rem' }}>Needs your input ({needsActionListings.length})</h2>
              </div>

              {needsActionListings.map((l) => {
                const photoCount = l.photos?.length || 0;
                const photoShort = MIN_PHOTOS - photoCount;
                const verif = getListingVerification(l);

                return (
                  <div key={l.id} className={`panel panel-pad verif-card ${verif === 'revoked' ? 'is-revoked' : ''}`}>
                    <div className="verif-head">
                      <div>
                        <h3 className="c-title">{l.title}</h3>
                        <span className="c-sub">{l.area}</span>
                      </div>
                      {renderVerificationPill(verif)}
                    </div>

                    {verif === 'revoked' && (
                      <div>
                        <div className="verif-revoked">
                          <AlertTriangle />
                          <p>
                            <b>Verified badge removed.</b> {l.verificationNote || 'A routine recheck found this listing no longer matches the property.'}
                          </p>
                        </div>
                        <button
                          type="button"
                          className="btn btn-primary"
                          onClick={() => {
                            setSelectedListingId(l.id);
                            setMode('request');
                          }}
                        >
                          Request re-verification
                        </button>
                      </div>
                    )}

                    {verif === 'none' && (
                      <>
                        {photoShort > 0 ? (
                          <p className="hint" style={{ margin: 0 }}>
                            Add at least {photoShort} more photo{photoShort === 1 ? '' : 's'} before requesting an
                            inspection, so our partner knows what to expect.
                          </p>
                        ) : (
                          <>
                            <p className="hint" style={{ margin: '0 0 14px' }}>
                              A Rentivo partner visits the property to confirm it's real and matches your listing.
                              It's free, and earns the Verified badge.
                            </p>
                            <details className="verif-checklist">
                              <summary>What our partner checks</summary>
                              <ul>
                                {CHECKLIST.map((c, idx) => (
                                  <li key={idx}>{c}</li>
                                ))}
                              </ul>
                            </details>
                            <button
                              type="button"
                              className="btn btn-primary btn-block"
                              onClick={() => {
                                setSelectedListingId(l.id);
                                setMode('request');
                              }}
                            >
                              Request inspection
                            </button>
                          </>
                        )}
                      </>
                    )}

                    {renderTimeline(getListingHistory(l))}
                  </div>
                );
              })}
            </section>
          )}

          {/* In Progress Section */}
          {inProgressListings.length > 0 && (
            <section style={{ marginTop: 28 }} aria-label="In progress">
              <div style={{ marginBottom: 14 }}>
                <h2 style={{ fontSize: '1.125rem' }}>In progress ({inProgressListings.length})</h2>
              </div>

              {inProgressListings.map((l) => {
                const verif = getListingVerification(l);

                return (
                  <div key={l.id} className="panel panel-pad verif-card">
                    <div className="verif-head">
                      <div>
                        <h3 className="c-title">{l.title}</h3>
                        <span className="c-sub">{l.area}</span>
                      </div>
                      {renderVerificationPill(verif)}
                    </div>

                    {renderStages(verif)}
                    {renderTimeline(getListingHistory(l))}
                  </div>
                );
              })}
            </section>
          )}

          {/* Empty state if caught up */}
          {needsActionListings.length === 0 && inProgressListings.length === 0 && (
            <div className="panel" style={{ marginTop: 28 }}>
              <div className="empty" style={{ border: 'none' }}>
                <ShieldCheck />
                <h2>All caught up</h2>
                <p>Every listing is verified, or already in progress.</p>
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ marginTop: 16, display: 'inline-flex', alignItems: 'center', gap: 8 }}
                  onClick={() => {
                    setMode('request');
                    if (window.location.pathname.startsWith('/lister')) {
                      window.history.pushState(null, '', '/lister/verification/request');
                    }
                  }}
                >
                  <ShieldCheck size={16} />
                  <span>Request verification for a property</span>
                </button>
              </div>
            </div>
          )}

          {/* Verified Section (Accordion) */}
          {verifiedListings.length > 0 && (
            <section style={{ marginTop: 28 }}>
              <div style={{ marginBottom: 14 }}>
                <h2 style={{ fontSize: '1.125rem' }}>Verified ({verifiedListings.length})</h2>
              </div>

              <div className="panel" style={{ padding: 0 }}>
                <ul className="rows">
                  {verifiedListings.map((l) => (
                    <li key={l.id} className="vrow-item">
                      <details className="vrow-details">
                        <summary className="vrow">
                          <span className="vrow-text">
                            <span className="c-title">{l.title}</span>
                            <span className="c-sub">Verified 20 Sep 2026</span>
                          </span>
                          <span className="vrow-end">
                            {renderVerificationPill('verified')}
                            <span className="vrow-chevron">
                              <ChevronRight size={16} />
                            </span>
                          </span>
                        </summary>
                        <div className="vrow-open">{renderTimeline(getListingHistory(l))}</div>
                      </details>
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          )}
        </div>
      )}

      {/* ===================================================================
          REQUEST FLOW MODE (HTML 2 SPECIFICATION)
          =================================================================== */}
      {mode === 'request' && (
        <div>
          {/* Back link */}
          <button
            type="button"
            className="link-btn"
            style={{ marginBottom: 14 }}
            onClick={() => {
              setSubmittedReceipt(null);
              setMode('dashboard');
              if (window.location.pathname.startsWith('/lister')) {
                window.history.pushState(null, '', '/lister/verification');
              }
            }}
          >
            <ArrowLeft size={16} /> Back to verification
          </button>

          {/* Submitted Confirmation State */}
          {submittedReceipt ? (
            <div className="panel panel-pad confirm">
              <div className="confirm-badge">
                <Check size={28} />
              </div>
              <h1>Request sent</h1>
              <p>
                We'll confirm one of your preferred times over{' '}
                {submittedReceipt.contactMethod === 'whatsapp'
                  ? 'WhatsApp'
                  : submittedReceipt.contactMethod === 'call'
                  ? 'a phone call'
                  : 'SMS'}{' '}
                within 24 hours — or suggest another time if none of these work.
              </p>

              <div className="summary">
                <div className="summary-row">
                  <b>Property</b>
                  <div>
                    {submittedReceipt.propertyTitle}
                    <br />
                    <span style={{ color: 'var(--ink-2)', fontSize: '0.875rem' }}>
                      {submittedReceipt.propertyArea}
                    </span>
                  </div>
                </div>

                <div className="summary-row">
                  <b>Contact</b>
                  <div>
                    {submittedReceipt.name}
                    <br />
                    <span style={{ color: 'var(--ink-2)', fontSize: '0.875rem' }}>
                      {submittedReceipt.phone}
                    </span>
                  </div>
                </div>

                <div className="summary-row">
                  <b>Address</b>
                  <div>{submittedReceipt.address}</div>
                </div>

                <div className="summary-row">
                  <b>Preferred times</b>
                  <div>
                    <ul>
                      {submittedReceipt.slots.map((s, idx) => (
                        <li key={idx}>
                          {s.dateFull}, {s.timeLabel}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
                <button
                  type="button"
                  className="btn btn-outline btn-block"
                  onClick={() => {
                    setSubmittedReceipt(null);
                    setSlots([]);
                  }}
                >
                  Make another request
                </button>
                <button
                  type="button"
                  className="btn btn-primary btn-block"
                  onClick={() => {
                    setSubmittedReceipt(null);
                    setMode('dashboard');
                  }}
                >
                  Back to verification
                </button>
              </div>
            </div>
          ) : (
            /* Request Form */
            <div>
              {(() => {
                const isReverify = selectedListing && getListingVerification(selectedListing) === 'revoked';
                const photoCount = selectedListing?.photos?.length || 0;
                const shortPhotos = MIN_PHOTOS - photoCount;

                return (
                  <div>
                    <div className="lister-page-head">
                      <div>
                        <h1 className="lister-page-title">
                          {isReverify ? 'Request re-verification' : 'Request verification'}
                        </h1>
                        <p className="lister-page-sub">
                          Tell us a bit more so our partner can plan the visit. This is free, and a Verified badge helps
                          renters trust your listing.
                        </p>
                      </div>
                    </div>

                    <div className="panel panel-pad">
                      {/* Property Selector */}
                      <div className="field">
                        <label htmlFor="propSelect">Which listing is this for?</label>
                        <select
                          id="propSelect"
                          className="select"
                          value={selectedListingId}
                          onChange={(e) => {
                            setSelectedListingId(e.target.value);
                            setSlots([]);
                          }}
                        >
                          {listings.map((l) => (
                            <option key={l.id} value={l.id}>
                              {l.title} — {l.area}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Selected Property Card */}
                      {selectedListing && (
                        <div className="prop-card">
                          <div>
                            <b>{selectedListing.title}</b>
                            <span>
                              {selectedListing.category === 'commercial' ? 'Commercial' : 'Residential'} ·{' '}
                              {selectedListing.area}
                            </span>
                          </div>
                          {renderVerificationPill(getListingVerification(selectedListing))}
                        </div>
                      )}

                      {/* Re-verify Notice if Revoked */}
                      {isReverify && (
                        <div
                          className="gate"
                          style={{
                            backgroundColor: 'var(--bad-bg)',
                            color: 'var(--bad)',
                            marginBottom: 22
                          }}
                        >
                          <AlertTriangle style={{ flexShrink: 0, marginTop: 2 }} />
                          <p>
                            <b style={{ color: 'var(--bad)' }}>Why this needs another look:</b>{' '}
                            {selectedListing?.verificationNote ||
                              'A routine recheck found the office had been renovated and reassigned to a different tenant since our last visit.'}
                          </p>
                        </div>
                      )}

                      {/* Photo Gate Check */}
                      {shortPhotos > 0 ? (
                        <div className="gate">
                          <AlertTriangle style={{ flexShrink: 0, marginTop: 2 }} />
                          <p>
                            <b>Add at least {shortPhotos} more photo{shortPhotos === 1 ? '' : 's'}</b> to this listing
                            before requesting an inspection, so our partner knows what to expect on arrival. You can come
                            back here once they're added.
                          </p>
                        </div>
                      ) : (
                        /* Form Body */
                        <form onSubmit={handleSubmitRequest}>
                          {/* Checklist Accordion */}
                          <details className="verif-checklist" style={{ marginBottom: 22 }}>
                            <summary>What our partner checks</summary>
                            <ul>
                              {CHECKLIST.map((c, idx) => (
                                <li key={idx}>{c}</li>
                              ))}
                            </ul>
                          </details>

                          {/* Section 1: Contact */}
                          <div style={{ marginBottom: 24 }}>
                            <h2 style={{ fontSize: '1rem', marginBottom: 4 }}>Who should our partner contact?</h2>
                            <span className="c-sub" style={{ display: 'block', marginBottom: 14 }}>
                              We'll reach out to confirm the visit.
                            </span>

                            <div className="field">
                              <label>Your name</label>
                              <input
                                className="input"
                                value={contactName}
                                onChange={(e) => setContactName(e.target.value)}
                                required
                              />
                            </div>

                            <div className="field">
                              <label>Phone number</label>
                              <input
                                className="input"
                                type="tel"
                                value={contactPhone}
                                onChange={(e) => setContactPhone(e.target.value)}
                                required
                              />
                            </div>

                            <div className="field">
                              <label>Preferred contact method</label>
                              <div className="chip-row">
                                {[
                                  ['whatsapp', 'WhatsApp'],
                                  ['call', 'Phone call'],
                                  ['sms', 'SMS']
                                ].map(([val, label]) => (
                                  <label key={val} className="chip">
                                    <input
                                      type="radio"
                                      name="contactMethod"
                                      value={val}
                                      checked={contactMethod === val}
                                      onChange={() => setContactMethod(val as 'whatsapp' | 'call' | 'sms')}
                                    />
                                    <span style={{ minHeight: 44, minWidth: 0, padding: '0 16px' }}>{label}</span>
                                  </label>
                                ))}
                              </div>
                            </div>
                          </div>

                          {/* Section 2: Property Address */}
                          <div style={{ marginBottom: 24 }}>
                            <h2 style={{ fontSize: '1rem', marginBottom: 4 }}>Property address</h2>
                            <span className="c-sub" style={{ display: 'block', marginBottom: 14 }}>
                              The exact address our partner should visit — include a landmark if it's hard to find.
                            </span>

                            <div className="field">
                              <textarea
                                className="textarea"
                                value={address}
                                onChange={(e) => {
                                  setAddress(e.target.value);
                                  setAddressError(null);
                                }}
                                placeholder={`e.g. 12 Awolowo Avenue, off Ring Road, ${selectedListing?.area || 'Bodija'}`}
                                required
                              />
                              {addressError && (
                                <div className="field-error">
                                  <AlertTriangle />
                                  <span>{addressError}</span>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Section 3: Preferred Inspection Times */}
                          <div style={{ marginBottom: 24 }}>
                            <h2 style={{ fontSize: '1rem', marginBottom: 4 }}>Preferred inspection times</h2>
                            <span className="c-sub" style={{ display: 'block', marginBottom: 14 }}>
                              Pick a date and time of day, then add it. Give us 1–3 options — our partner will confirm
                              one, or suggest another if none work.
                            </span>

                            {/* Date Grid */}
                            <div className="field">
                              <label>Date</label>
                              <div className="date-grid">
                                {upcomingDays.map((d) => (
                                  <label key={d.iso} className="chip">
                                    <input
                                      type="radio"
                                      name="date"
                                      value={d.iso}
                                      checked={selectedDate === d.iso}
                                      onChange={() => setSelectedDate(d.iso)}
                                    />
                                    <span>
                                      <b>{d.day}</b>
                                      {d.wd}
                                    </span>
                                  </label>
                                ))}
                              </div>
                            </div>

                            {/* Time Slots */}
                            <div className="field">
                              <label>Time of day</label>
                              <div className="chip-row">
                                {TIME_SLOTS.map((t) => (
                                  <label key={t.id} className="chip time-chip">
                                    <input
                                      type="radio"
                                      name="time"
                                      value={t.id}
                                      checked={selectedTimeSlot === t.id}
                                      onChange={() => setSelectedTimeSlot(t.id)}
                                    />
                                    <span>
                                      <b>{t.label}</b>
                                      <small>{t.range}</small>
                                    </span>
                                  </label>
                                ))}
                              </div>
                            </div>

                            {/* Add Slot Button */}
                            <div className="add-slot-row">
                              <button
                                type="button"
                                className="btn btn-outline btn-sm"
                                onClick={handleAddSlot}
                                disabled={slots.length >= 3}
                              >
                                <Check size={14} /> Add this time
                              </button>
                            </div>

                            {/* Selected Slots List */}
                            {slots.length > 0 && (
                              <ul className="slots">
                                {slots.map((s, i) => (
                                  <li key={s.key} className="slot">
                                    <span>
                                      <span className="slot-label">Option {i + 1}</span>
                                      <b>{s.dateFull}</b>
                                      <span>
                                        {s.timeLabel} · {s.timeRange}
                                      </span>
                                    </span>
                                    <button
                                      type="button"
                                      className="slot-remove"
                                      onClick={() => handleRemoveSlot(i)}
                                      aria-label={`Remove option ${i + 1}`}
                                    >
                                      <X size={15} />
                                    </button>
                                  </li>
                                ))}
                              </ul>
                            )}

                            {slotsError && (
                              <div className="field-error">
                                <AlertTriangle />
                                <span>{slotsError}</span>
                              </div>
                            )}
                          </div>

                          {/* Section 4: Notes */}
                          <div style={{ marginBottom: 28 }}>
                            <h2 style={{ fontSize: '1rem', marginBottom: 4 }}>
                              Anything our partner should know?{' '}
                              <span style={{ fontWeight: 500, color: 'var(--ink-2)' }}>(optional)</span>
                            </h2>
                            <div className="field">
                              <textarea
                                className="textarea"
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="e.g. Gate code, who to ask for on site, best entrance to use"
                                style={{ minHeight: 70 }}
                              />
                            </div>
                          </div>

                          {/* Submit Button */}
                          <button
                            type="submit"
                            className="btn btn-primary btn-block"
                            disabled={isSubmitting}
                          >
                            {isSubmitting
                              ? 'Sending request…'
                              : isReverify
                              ? 'Send re-verification request'
                              : 'Send verification request'}
                          </button>
                        </form>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      )}
    </main>
  );
};
