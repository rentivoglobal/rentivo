import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Phone, 
  MessageCircle, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowRight, 
  Heart, 
  FileText, 
  KeyRound, 
  Calendar, 
  MapPin, 
  ExternalLink,
  Sparkles,
  Zap,
  Check
} from 'lucide-react';
import { AccessRequest, Listing } from '../types';
import { requestsService } from '../services/requestsService';
import { formatNaira, formatDate } from '../utils/formatters';

interface RequestsPageProps {
  onBrowseListings: () => void;
  onOpenRequestModal?: (listingId: string) => void;
  listings: Listing[];
  favorites?: string[];
  onNavigateToFavorites?: () => void;
  onSelectListing?: (listing: Listing) => void;
  onProceedToCheckout?: (listing: Listing) => void;
}

export const RequestsPage: React.FC<RequestsPageProps> = ({
  onBrowseListings,
  listings,
  favorites = [],
  onNavigateToFavorites,
  onSelectListing,
  onProceedToCheckout
}) => {
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'confirmed' | 'unlocked'>('all');
  const [scheduledDates, setScheduledDates] = useState<Record<string, string>>({});
  const [inspectionModalReqId, setInspectionModalReqId] = useState<string | null>(null);
  const [selectedInspectionDate, setSelectedInspectionDate] = useState('');
  const [selectedInspectionTime, setSelectedInspectionTime] = useState('10:00 AM');

  const loadRequests = async () => {
    setLoading(true);
    const data = await requestsService.getAllRequests();
    setRequests(data);
    setLoading(false);
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const promoStats = requestsService.getPromotionStats();

  const defaultListerContact = {
    fullName: 'Alhaji Ganiyu Bello',
    phone: '+234 802 345 6789',
    whatsapp: '+234 802 345 6789',
    agencyName: 'Property Owner',
    memberSince: 'June 2026',
    activeListingsCount: 3,
    responseRate: '95%'
  };

  const handlePayNow = async (req: AccessRequest, matchedListing?: Listing) => {
    if (matchedListing && onProceedToCheckout) {
      onProceedToCheckout(matchedListing);
    } else {
      const lister = matchedListing?.lister || defaultListerContact;
      await requestsService.completePayment(req.id, lister);
      await loadRequests();
    }
  };

  const handleClaimWaiver = async (req: AccessRequest, matchedListing?: Listing) => {
    const lister = matchedListing?.lister || defaultListerContact;
    await requestsService.claimPromotionWaiver(req.id, lister);
    await loadRequests();
  };

  const handleConfirmSchedule = (reqId: string) => {
    if (selectedInspectionDate) {
      setScheduledDates(prev => ({
        ...prev,
        [reqId]: `${selectedInspectionDate} at ${selectedInspectionTime}`
      }));
      setInspectionModalReqId(null);
      setSelectedInspectionDate('');
    }
  };

  // Counts for filters
  const pendingCount = requests.filter(r => r.status === 'submitted' || r.status === 'availability_pending').length;
  const confirmedCount = requests.filter(r => r.status === 'confirmed').length;
  const unlockedCount = requests.filter(r => r.status === 'paid').length;

  const filteredRequests = requests.filter(r => {
    if (filterStatus === 'pending') return r.status === 'submitted' || r.status === 'availability_pending';
    if (filterStatus === 'confirmed') return r.status === 'confirmed';
    if (filterStatus === 'unlocked') return r.status === 'paid';
    return true;
  });

  return (
    <div style={{ backgroundColor: '#F8FAFC', minHeight: 'calc(100vh - 72px)', padding: '36px 20px 72px' }}>
      <div style={{ maxWidth: '980px', margin: '0 auto' }}>
        
        {/* Clean Modern Page Header */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', backgroundColor: '#F0E6FF', padding: '4px 12px', borderRadius: '999px', marginBottom: '8px' }}>
            <FileText size={13} color="#000052" />
            <span style={{ fontSize: '11px', fontWeight: 800, color: '#000052', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              My Requests
            </span>
          </div>
          <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#000052', margin: '0 0 6px', letterSpacing: '-0.01em' }}>
            My Property Requests
          </h1>
          <p style={{ fontSize: '14px', color: '#636377', margin: 0, lineHeight: 1.5 }}>
            Track free physical vacancy checks with Ibadan landlords, pay flat ₦5,000 only when confirmed vacant, and view direct unlocked contact dossiers.
          </p>
        </div>

        {/* -----------------------------------------------------------------
            FILTER CHIPS FOR REQUEST STATUS
           ----------------------------------------------------------------- */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
          <button
            type="button"
            onClick={() => setFilterStatus('all')}
            style={{
              padding: '6px 14px',
              borderRadius: '9999px',
              fontSize: '12.5px',
              fontWeight: 700,
              border: filterStatus === 'all' ? '1.5px solid #000052' : '1px solid #E2E8F0',
              backgroundColor: filterStatus === 'all' ? '#000052' : '#FFFFFF',
              color: filterStatus === 'all' ? '#FFFFFF' : '#64748B',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            All Requests ({requests.length})
          </button>

          <button
            type="button"
            onClick={() => setFilterStatus('pending')}
            style={{
              padding: '6px 14px',
              borderRadius: '9999px',
              fontSize: '12.5px',
              fontWeight: 700,
              border: filterStatus === 'pending' ? '1.5px solid #6B21A8' : '1px solid #E2E8F0',
              backgroundColor: filterStatus === 'pending' ? '#FAF5FF' : '#FFFFFF',
              color: filterStatus === 'pending' ? '#6B21A8' : '#64748B',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s ease'
            }}
          >
            <Clock size={13} color={filterStatus === 'pending' ? '#6B21A8' : '#94A3B8'} />
            <span>Waiting Period ({pendingCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setFilterStatus('confirmed')}
            style={{
              padding: '6px 14px',
              borderRadius: '9999px',
              fontSize: '12.5px',
              fontWeight: 700,
              border: filterStatus === 'confirmed' ? '1.5px solid #000052' : '1px solid #E2E8F0',
              backgroundColor: filterStatus === 'confirmed' ? '#F0E6FF' : '#FFFFFF',
              color: filterStatus === 'confirmed' ? '#000052' : '#64748B',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s ease'
            }}
          >
            <CheckCircle2 size={13} color="#000052" />
            <span>Confirmed Available ({confirmedCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setFilterStatus('unlocked')}
            style={{
              padding: '6px 14px',
              borderRadius: '9999px',
              fontSize: '12.5px',
              fontWeight: 700,
              border: filterStatus === 'unlocked' ? '1.5px solid #16794A' : '1px solid #E2E8F0',
              backgroundColor: filterStatus === 'unlocked' ? '#ECFDF5' : '#FFFFFF',
              color: filterStatus === 'unlocked' ? '#16794A' : '#64748B',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s ease'
            }}
          >
            <ShieldCheck size={13} color="#16794A" />
            <span>Unlocked Contacts ({unlockedCount})</span>
          </button>
        </div>

        {/* -----------------------------------------------------------------
            LIST OF REQUEST CARDS
           ----------------------------------------------------------------- */}
        {loading ? (
          <div style={{ padding: '60px', textAlign: 'center', color: '#64748B', backgroundColor: '#FFFFFF', borderRadius: '20px', border: '1px solid #E2E8F0' }}>
            <Clock size={28} className="spinner" style={{ margin: '0 auto 12px' }} />
            <div>Loading your property access requests...</div>
          </div>
        ) : filteredRequests.length === 0 ? (
          <div 
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '24px',
              padding: '64px 24px',
              textAlign: 'center',
              border: '1px solid #E2E8F0',
              boxShadow: '0 4px 18px rgba(0,0,82,0.03)'
            }}
          >
            <div 
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                backgroundColor: '#F0E6FF',
                color: '#000052',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px'
              }}
            >
              <KeyRound size={28} />
            </div>
            <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#000052', margin: '0 0 8px' }}>
              No Requests In This Category
            </h3>
            <p style={{ fontSize: '14px', color: '#64748B', maxWidth: '420px', margin: '0 auto 24px', lineHeight: 1.5 }}>
              Browse verified residential or commercial properties across Bodija, Akobo, Oluyole, and Jericho to request access for free.
            </p>
            <button
              type="button"
              onClick={onBrowseListings}
              style={{
                backgroundColor: '#000052',
                color: '#FFFFFF',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '9999px',
                fontSize: '14px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <span>Browse Ibadan Listings</span>
              <ArrowRight size={15} />
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {filteredRequests.map(req => {
              const matchedListing = listings.find(l => l.id === req.listingId);
              const scheduledTime = scheduledDates[req.id];

              return (
                <div
                  key={req.id}
                  style={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: '20px',
                    border: '1px solid #E2E8F0',
                    padding: '24px',
                    boxShadow: '0 4px 18px rgba(0,0,82,0.04)',
                    transition: 'transform 0.15s ease, box-shadow 0.15s ease'
                  }}
                >
                  {/* Card Header: Property photo + details + status badge */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', borderBottom: '1px solid #F1F5F9', paddingBottom: '16px', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                      <img 
                        src={req.listingPhoto || 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=600&q=80'} 
                        alt={req.listingTitle} 
                        style={{ width: '72px', height: '72px', borderRadius: '12px', objectFit: 'cover', cursor: matchedListing && onSelectListing ? 'pointer' : 'default' }} 
                        onClick={() => matchedListing && onSelectListing && onSelectListing(matchedListing)}
                      />
                      <div>
                        <div 
                          style={{ fontWeight: 800, fontSize: '17px', color: '#000052', cursor: matchedListing && onSelectListing ? 'pointer' : 'default' }}
                          onClick={() => matchedListing && onSelectListing && onSelectListing(matchedListing)}
                        >
                          {req.listingTitle}
                        </div>
                        <div style={{ fontSize: '13.5px', color: '#64748B', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                          <MapPin size={13} color="#94A3B8" />
                          <span>{req.listingArea}, Ibadan</span>
                          <span>•</span>
                          <span style={{ fontWeight: 700, color: '#000052' }}>{formatNaira(req.listingPrice)}/year</span>
                        </div>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      {/* Status Badges */}
                      {req.status === 'confirmed' && (
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', backgroundColor: '#F0E6FF', color: '#000052', padding: '5px 12px', borderRadius: '999px', fontSize: '12px', fontWeight: 800 }}>
                          <CheckCircle2 size={13} color="#000052" />
                          <span>Confirmed Available (Pay ₦5K)</span>
                        </div>
                      )}

                      {(req.status === 'submitted' || req.status === 'availability_pending') && (
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', backgroundColor: '#FAF5FF', color: '#6B21A8', padding: '5px 12px', borderRadius: '999px', fontSize: '12px', fontWeight: 800 }}>
                          <Clock size={13} color="#6B21A8" />
                          <span>Waiting Period (Checking Vacancy)</span>
                        </div>
                      )}

                      {req.status === 'paid' && (
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', backgroundColor: '#ECFDF5', color: '#16794A', padding: '5px 12px', borderRadius: '999px', fontSize: '12px', fontWeight: 800 }}>
                          <ShieldCheck size={13} color="#16794A" />
                          <span>Landlord Contact Unlocked</span>
                        </div>
                      )}

                      {req.status === 'unavailable' && (
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', backgroundColor: '#FEF2F2', color: '#DC2626', padding: '5px 12px', borderRadius: '999px', fontSize: '12px', fontWeight: 800 }}>
                          <AlertTriangle size={13} color="#DC2626" />
                          <span>Unavailable (No Charge)</span>
                        </div>
                      )}

                      <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '4px' }}>
                        Requested {formatDate(req.createdAt)}
                      </div>
                    </div>
                  </div>

                  {/* ---------------------------------------------------------
                      BODY STATE 1: WAITING PERIOD (PENDING VERIFICATION)
                     --------------------------------------------------------- */}
                  {(req.status === 'submitted' || req.status === 'availability_pending') && (
                    <div style={{ backgroundColor: '#FAF5FF', border: '1px solid #E9D5FF', borderRadius: '14px', padding: '16px 18px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                        <div>
                          <div style={{ fontSize: '12px', fontWeight: 800, color: '#6B21A8', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '2px' }}>
                            ⏳ Verification Waiting Period Active
                          </div>
                          <div style={{ fontSize: '13.5px', color: '#4A044E', lineHeight: 1.4 }}>
                            Rentivo has dispatched an automated vacancy check to the lister. Average response time in Ibadan is <strong>24 minutes</strong>.
                          </div>
                          <div style={{ fontSize: '11.5px', color: '#7E22CE', marginTop: '4px' }}>
                            ✓ Your account is not charged during this verification period.
                          </div>
                        </div>

                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', backgroundColor: '#FFFFFF', border: '1px solid #E9D5FF', borderRadius: '8px', padding: '6px 12px', fontSize: '12px', fontWeight: 700, color: '#6B21A8' }}>
                          <Clock size={13} />
                          <span>Awaiting Lister Reply</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ---------------------------------------------------------
                      BODY STATE 2: CONFIRMED AVAILABLE (READY FOR PAYMENT)
                     --------------------------------------------------------- */}
                  {req.status === 'confirmed' && (
                    <div style={{ backgroundColor: '#F0E6FF', border: '1px solid #D8B4FE', borderRadius: '14px', padding: '18px 20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 800, color: '#000052', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            <CheckCircle2 size={15} color="#16794A" />
                            <span>Great news! Landlord confirmed this property is vacant.</span>
                          </div>
                          <div style={{ fontSize: '13.5px', color: '#17172B', marginTop: '4px', lineHeight: 1.4 }}>
                            Pay the flat <strong>₦5,000 access fee</strong> via Paystack to unlock the landlord's direct phone number, WhatsApp, and schedule a physical inspection.
                          </div>
                          {promoStats.remaining > 0 && (
                            <div style={{ fontSize: '12px', color: '#7E22CE', fontWeight: 700, marginTop: '4px' }}>
                              🎉 Ibadan Launch Promo: {promoStats.remaining} free waivers remaining!
                            </div>
                          )}
                        </div>

                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          {promoStats.remaining > 0 && (
                            <button
                              type="button"
                              onClick={() => handleClaimWaiver(req, matchedListing)}
                              style={{
                                backgroundColor: '#7E22CE',
                                color: '#FFFFFF',
                                border: 'none',
                                padding: '10px 16px',
                                borderRadius: '10px',
                                fontSize: '13px',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px'
                              }}
                            >
                              <Sparkles size={14} />
                              <span>Claim ₦0 Launch Waiver</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handlePayNow(req, matchedListing)}
                            style={{
                              backgroundColor: '#000052',
                              color: '#FFFFFF',
                              border: 'none',
                              padding: '10px 18px',
                              borderRadius: '10px',
                              fontSize: '13px',
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              boxShadow: '0 4px 12px rgba(0,0,82,0.18)'
                            }}
                          >
                            <span>Pay ₦5,000 via Paystack</span>
                            <ArrowRight size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ---------------------------------------------------------
                      BODY STATE 3: UNLOCKED LANDLORD CONTACT DOSSIER
                     --------------------------------------------------------- */}
                  {req.status === 'paid' && (
                    <div style={{ backgroundColor: '#F8FAFC', border: '1.5px solid #E2E8F0', borderRadius: '16px', padding: '18px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', borderBottom: '1px solid #E2E8F0', paddingBottom: '12px', marginBottom: '14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <ShieldCheck size={16} color="#16794A" />
                          <span style={{ fontSize: '12px', fontWeight: 800, color: '#000052', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            Unlocked Landlord / Agent Dossier
                          </span>
                        </div>
                        <span style={{ fontSize: '11px', color: '#16794A', backgroundColor: '#ECFDF5', border: '1px solid #A7F3D0', padding: '3px 9px', borderRadius: '999px', fontWeight: 700 }}>
                          ✓ Payment Verified
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
                        {/* Landlord identity */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#000052', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', fontWeight: 800, overflow: 'hidden' }}>
                            {req.unlockedListerContact?.avatarUrl ? (
                              <img src={req.unlockedListerContact.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                              req.unlockedListerContact?.fullName?.charAt(0) || 'L'
                            )}
                          </div>
                          <div>
                            <div style={{ fontSize: '16px', fontWeight: 800, color: '#000052' }}>
                              {req.unlockedListerContact?.fullName || 'Chief Olumide Fashola'}
                            </div>
                            <div style={{ fontSize: '12.5px', color: '#64748B' }}>
                              {req.unlockedListerContact?.agencyName || 'Verified Property Owner / Landlord'}
                            </div>
                          </div>
                        </div>

                        {/* Direct Contact Buttons */}
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          <a
                            href={`tel:${req.unlockedListerContact?.phone || '+234 803 890 0122'}`}
                            style={{
                              backgroundColor: '#000052',
                              color: '#FFFFFF',
                              padding: '9px 16px',
                              borderRadius: '10px',
                              fontSize: '13px',
                              fontWeight: 700,
                              textDecoration: 'none',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px'
                            }}
                          >
                            <Phone size={14} />
                            <span>Call {req.unlockedListerContact?.phone || '+234 803 890 0122'}</span>
                          </a>

                          <a
                            href={`https://wa.me/${(req.unlockedListerContact?.whatsapp || '+2348038900122').replace(/[^0-9]/g, '')}`}
                            target="_blank"
                            rel="noreferrer"
                            style={{
                              backgroundColor: '#25D366',
                              color: '#FFFFFF',
                              padding: '9px 16px',
                              borderRadius: '10px',
                              fontSize: '13px',
                              fontWeight: 700,
                              textDecoration: 'none',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px'
                            }}
                          >
                            <MessageCircle size={14} />
                            <span>WhatsApp Chat</span>
                          </a>

                          <button
                            type="button"
                            onClick={() => setInspectionModalReqId(req.id)}
                            style={{
                              backgroundColor: '#FFFFFF',
                              border: '1.5px solid #000052',
                              color: '#000052',
                              padding: '9px 14px',
                              borderRadius: '10px',
                              fontSize: '13px',
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px'
                            }}
                          >
                            <Calendar size={14} />
                            <span>{scheduledTime ? 'Reschedule Inspection' : 'Schedule Inspection'}</span>
                          </button>
                        </div>
                      </div>

                      {/* Scheduled inspection notice if set */}
                      {scheduledTime && (
                        <div style={{ marginTop: '12px', backgroundColor: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: '10px', padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px', color: '#16794A', fontWeight: 600 }}>
                          <Check size={14} />
                          <span>Inspection scheduled for: <strong>{scheduledTime}</strong>. Lister notified.</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* ---------------------------------------------------------
                      BODY STATE 4: UNAVAILABLE NOTICE
                     --------------------------------------------------------- */}
                  {req.status === 'unavailable' && (
                    <div style={{ backgroundColor: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '14px', padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                      <div style={{ fontSize: '13px', color: '#991B1B' }}>
                        The landlord confirmed this listing is no longer vacant. <strong>Zero charges were made to your account.</strong>
                      </div>
                      <button
                        type="button"
                        onClick={onBrowseListings}
                        style={{
                          backgroundColor: '#DC2626',
                          color: '#FFFFFF',
                          border: 'none',
                          padding: '6px 12px',
                          borderRadius: '8px',
                          fontSize: '12px',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        Browse Similar in {req.listingArea}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* -----------------------------------------------------------------
            INSPECTION SCHEDULING MODAL
           ----------------------------------------------------------------- */}
        {inspectionModalReqId && (
          <div className="modal-backdrop" onClick={() => setInspectionModalReqId(null)} style={{ zIndex: 1100 }}>
            <div 
              className="modal-card" 
              onClick={(e) => e.stopPropagation()}
              style={{ maxWidth: '440px', width: '92%', borderRadius: '24px', padding: '28px' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <Calendar size={18} color="#000052" />
                <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#000052', margin: 0 }}>
                  Schedule Physical Inspection
                </h3>
              </div>
              <p style={{ fontSize: '13.5px', color: '#64748B', margin: '0 0 20px', lineHeight: 1.4 }}>
                Choose a preferred date and time to visit the property in person. The landlord will confirm your inspection slot.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#000052', marginBottom: '6px' }}>
                    Inspection Date
                  </label>
                  <input
                    type="date"
                    value={selectedInspectionDate}
                    onChange={(e) => setSelectedInspectionDate(e.target.value)}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1.5px solid #E2E8F0', fontSize: '14px', outline: 'none' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#000052', marginBottom: '6px' }}>
                    Preferred Time Slot
                  </label>
                  <select
                    value={selectedInspectionTime}
                    onChange={(e) => setSelectedInspectionTime(e.target.value)}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1.5px solid #E2E8F0', fontSize: '14px', outline: 'none' }}
                  >
                    <option value="09:00 AM">09:00 AM (Morning)</option>
                    <option value="10:00 AM">10:00 AM (Morning)</option>
                    <option value="12:00 PM">12:00 PM (Noon)</option>
                    <option value="02:00 PM">02:00 PM (Afternoon)</option>
                    <option value="04:00 PM">04:00 PM (Evening)</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setInspectionModalReqId(null)}
                  style={{ flex: 1, padding: '12px', borderRadius: '10px', border: '1.5px solid #E2E8F0', background: 'none', fontWeight: 700, fontSize: '13px', color: '#64748B', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!selectedInspectionDate}
                  onClick={() => handleConfirmSchedule(inspectionModalReqId)}
                  style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: '10px',
                    border: 'none',
                    backgroundColor: selectedInspectionDate ? '#000052' : '#CBD5E1',
                    color: '#FFFFFF',
                    fontWeight: 700,
                    fontSize: '13px',
                    cursor: selectedInspectionDate ? 'pointer' : 'not-allowed'
                  }}
                >
                  Confirm Inspection
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default RequestsPage;
