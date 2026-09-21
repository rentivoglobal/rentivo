import React, { useState } from 'react';
import { 
  ArrowLeft, 
  ShieldCheck, 
  Calendar, 
  MapPin, 
  Bed, 
  Bath, 
  Maximize2, 
  Check, 
  Heart, 
  Share2, 
  AlertCircle, 
  CheckCircle2, 
  Lock, 
  UserCheck,
  ChevronRight,
  CreditCard,
  MessageCircle,
  Phone
} from 'lucide-react';
import { Listing } from '../types';
import { formatNaira, formatPeriod } from '../utils/formatters';
import { reportsService } from '../services/reportsService';

interface PropertyDetailPageProps {
  listing: Listing;
  isFavorite: boolean;
  onToggleFavorite: (id: string) => void;
  onBack: () => void;
  onRequestAccess: (listing: Listing) => void;
}

export const PropertyDetailPage: React.FC<PropertyDetailPageProps> = ({
  listing,
  isFavorite,
  onToggleFavorite,
  onBack,
  onRequestAccess
}) => {
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const [reportSubmitted, setReportSubmitted] = useState(false);
  const [showReportForm, setShowReportForm] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const handleShare = () => {
    navigator.clipboard?.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  return (
    <div style={{ backgroundColor: '#F8FAFC', minHeight: '100vh', paddingBottom: '90px' }}>
      {/* Top Breadcrumb & Actions Bar */}
      <div style={{ backgroundColor: '#FFFFFF', borderBottom: '1px solid #E2E8F0', padding: '14px 0' }}>
        <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button 
            onClick={onBack}
            style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '8px', 
              fontSize: '14px', 
              fontWeight: 700, 
              color: '#000052',
              background: 'none',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            <ArrowLeft size={18} />
            <span>Back to listings</span>
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button 
              onClick={handleShare}
              className="btn btn-outline btn-sm"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', borderColor: '#CBD5E1', color: '#334155' }}
            >
              <Share2 size={14} />
              <span>{copiedLink ? 'Link Copied!' : 'Share'}</span>
            </button>

            <button 
              onClick={() => onToggleFavorite(listing.id)}
              className="btn btn-outline btn-sm"
              style={{ 
                display: 'inline-flex', 
                alignItems: 'center', 
                gap: '6px',
                fontSize: '13px',
                borderColor: isFavorite ? '#FCA5A5' : '#CBD5E1',
                color: isFavorite ? '#B42318' : '#334155'
              }}
            >
              <Heart 
                size={14} 
                fill={isFavorite ? "#B42318" : "none"} 
                color={isFavorite ? "#B42318" : "currentColor"} 
              />
              <span>{isFavorite ? 'Saved' : 'Save'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Page Content */}
      <div className="container" style={{ marginTop: '24px' }}>
        {/* Header Title & Location */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
            <span style={{
              backgroundColor: '#000052',
              color: '#FFFFFF',
              fontSize: '11px',
              fontWeight: 700,
              padding: '3px 9px',
              borderRadius: '6px',
              textTransform: 'uppercase'
            }}>
              {listing.type}
            </span>

            {listing.verificationStatus === 'verified' && (
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                backgroundColor: '#E8F7EE',
                color: '#16794A',
                border: '1px solid #A7F3D0',
                fontSize: '11.5px',
                fontWeight: 700,
                padding: '3px 10px',
                borderRadius: '999px'
              }}>
                <ShieldCheck size={14} />
                <span>Physically Verified by Rentivo</span>
              </span>
            )}

            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              backgroundColor: listing.isAvailable ? '#EFF6FF' : '#FEF3C7',
              color: listing.isAvailable ? '#1D4ED8' : '#B45309',
              fontSize: '11.5px',
              fontWeight: 700,
              padding: '3px 9px',
              borderRadius: '6px'
            }}>
              {listing.isAvailable ? 'Available Now' : 'Under Review'}
            </span>
          </div>

          <h1 style={{ fontSize: '30px', fontWeight: 800, color: '#000052', margin: '4px 0 8px', lineHeight: 1.25 }}>
            {listing.title}
          </h1>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#475569', fontSize: '14.5px' }}>
            <MapPin size={16} color="#000052" />
            <span>{listing.addressDescription}</span>
          </div>
        </div>

        {/* Big Photo Gallery */}
        <div style={{ marginBottom: '24px' }}>
          <div 
            style={{ 
              width: '100%', 
              height: 'clamp(240px, 52vw, 460px)', 
              borderRadius: '20px', 
              overflow: 'hidden', 
              backgroundColor: '#0F172A',
              boxShadow: '0 4px 20px -4px rgba(0,0,0,0.1)',
              position: 'relative'
            }}
          >
            <img 
              src={listing.photos[activePhotoIndex] || listing.photos[0]} 
              alt={listing.title} 
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />

            {listing.verificationStatus === 'verified' && (
              <div style={{ position: 'absolute', top: '18px', left: '18px', zIndex: 3 }}>
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  backgroundColor: '#FFFFFF',
                  color: '#16794A',
                  padding: '6px 14px',
                  borderRadius: '999px',
                  fontSize: '12.5px',
                  fontWeight: 700,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                }}>
                  <ShieldCheck size={16} color="#16794A" />
                  <span>Verified Property</span>
                </span>
              </div>
            )}
          </div>

          {/* Thumbnails */}
          {listing.photos.length > 1 && (
            <div className="no-scrollbar" style={{ display: 'flex', gap: '10px', marginTop: '12px', overflowX: 'auto', paddingBottom: '4px', scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
              {listing.photos.map((p, idx) => (
                <button
                  key={idx}
                  onClick={() => setActivePhotoIndex(idx)}
                  style={{
                    width: '90px',
                    height: '62px',
                    borderRadius: '10px',
                    overflow: 'hidden',
                    border: activePhotoIndex === idx ? '3px solid #000052' : '2px solid transparent',
                    opacity: activePhotoIndex === idx ? 1 : 0.65,
                    flexShrink: 0,
                    cursor: 'pointer',
                    padding: 0,
                    backgroundColor: '#FFFFFF',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <img src={p} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Two-Column Grid: Left (Details & Evidence) | Right (Sticky Action Card) */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '28px', alignItems: 'start' }}>
          {/* LEFT COLUMN (Details, Verification Evidence, Amenities) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            {/* Quick Specs Strip */}
            <div 
              style={{ 
                backgroundColor: '#FFFFFF', 
                borderRadius: '16px', 
                padding: '18px 22px', 
                border: '1px solid #E2E8F0',
                display: 'flex', 
                flexWrap: 'wrap', 
                gap: '20px', 
                alignItems: 'center' 
              }}
            >
              {listing.bedrooms !== undefined && listing.bedrooms > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '38px', height: '38px', borderRadius: '8px', backgroundColor: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000052' }}>
                    <Bed size={19} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '15px', color: '#000052' }}>{listing.bedrooms} Bedrooms</div>
                    <div style={{ fontSize: '12px', color: '#64748B' }}>Private Rooms</div>
                  </div>
                </div>
              )}

              {listing.bathrooms !== undefined && listing.bathrooms > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '38px', height: '38px', borderRadius: '8px', backgroundColor: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000052' }}>
                    <Bath size={19} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '15px', color: '#000052' }}>{listing.bathrooms} Bathrooms</div>
                    <div style={{ fontSize: '12px', color: '#64748B' }}>Fitted &amp; Tiled</div>
                  </div>
                </div>
              )}

              {listing.areaSqm !== undefined && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '38px', height: '38px', borderRadius: '8px', backgroundColor: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000052' }}>
                    <Maximize2 size={18} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '15px', color: '#000052' }}>{listing.areaSqm} sqm</div>
                    <div style={{ fontSize: '12px', color: '#64748B' }}>Floor Area</div>
                  </div>
                </div>
              )}
            </div>

            {/* DATED PHYSICAL VERIFICATION PROOF BOX */}
            {listing.verificationStatus === 'verified' && listing.inspection && (
              <div 
                style={{ 
                  backgroundColor: '#FFFFFF', 
                  borderRadius: '16px', 
                  border: '1.5px solid #16794A', 
                  padding: '22px',
                  boxShadow: '0 4px 16px -2px rgba(22, 121, 74, 0.12)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: '#16794A', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFFFFF' }}>
                      <ShieldCheck size={20} />
                    </div>
                    <div>
                      <h3 style={{ fontSize: '17px', fontWeight: 800, color: '#000052', margin: 0 }}>
                        Rentivo Physical Inspection Audit
                      </h3>
                      <span style={{ fontSize: '12px', color: '#64748B' }}>On-site physical inspection completed</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#F1F5F9', padding: '5px 12px', borderRadius: '999px', fontSize: '12px', fontWeight: 700, color: '#000052' }}>
                    <Calendar size={13} />
                    <span>{listing.inspection.inspectionDate}</span>
                  </div>
                </div>

                <p style={{ fontSize: '13.5px', color: '#1E293B', lineHeight: 1.6, marginBottom: '16px', backgroundColor: '#F8FAFC', padding: '12px 16px', borderRadius: '10px', borderLeft: '3px solid #16794A' }}>
                  "{listing.inspection.inspectorNotes}"
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#16794A', fontWeight: 600 }}>
                    <CheckCircle2 size={16} /> <span>Physical On-site Visit Done</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#16794A', fontWeight: 600 }}>
                    <CheckCircle2 size={16} /> <span>Address Matches Title</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#16794A', fontWeight: 600 }}>
                    <CheckCircle2 size={16} /> <span>Lister Mandate Audited</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#16794A', fontWeight: 600 }}>
                    <CheckCircle2 size={16} /> <span>Authentic Photos Verified</span>
                  </div>
                </div>
              </div>
            )}

            {/* Description */}
            <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', padding: '22px', border: '1px solid #E2E8F0' }}>
              <h3 style={{ fontSize: '17px', fontWeight: 800, color: '#000052', marginBottom: '10px' }}>
                Property Overview
              </h3>
              <p style={{ fontSize: '14.5px', lineHeight: 1.7, color: '#334155' }}>
                {listing.description}
              </p>
            </div>

            {/* Amenities & Features */}
            {listing.amenities && listing.amenities.length > 0 && (
              <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', padding: '22px', border: '1px solid #E2E8F0' }}>
                <h3 style={{ fontSize: '17px', fontWeight: 800, color: '#000052', marginBottom: '14px' }}>
                  Amenities &amp; Facility Features
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
                  {listing.amenities.map((item, idx) => (
                    <div 
                      key={idx}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '9px 12px',
                        borderRadius: '8px',
                        backgroundColor: '#F8FAFC',
                        border: '1px solid #E2E8F0',
                        fontSize: '13px',
                        fontWeight: 600,
                        color: '#000052'
                      }}
                    >
                      <Check size={15} color="#16794A" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Safe Renter Notice */}
            <div style={{ backgroundColor: '#F8FAFC', borderRadius: '16px', padding: '18px 20px', border: '1.5px dashed #CBD5E1', display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
              <Lock size={20} color="#000052" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <div style={{ fontWeight: 700, fontSize: '13.5px', color: '#000052', marginBottom: '4px' }}>
                  Rentivo Tenant Protection Guarantee
                </div>
                <div style={{ fontSize: '12.5px', color: '#475569', lineHeight: 1.5 }}>
                  Never pay upfront registration or inspection fees to unmandated roadside agents. Rentivo verifies vacancy directly with the property owner before you pay any fee, and the flat ₦5,000 fee is only charged upon confirmation.
                </div>
              </div>
            </div>

          </div>

          {/* RIGHT COLUMN (Sticky Action Card & Lister Box) */}
          <div style={{ position: 'sticky', top: '24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
            
            {/* Booking & Price Box */}
            <div 
              style={{ 
                backgroundColor: '#FFFFFF', 
                borderRadius: '20px', 
                border: '1.5px solid #CBD5E1', 
                padding: '24px',
                boxShadow: '0 10px 30px -5px rgba(0, 0, 82, 0.08)'
              }}
            >
              <div style={{ marginBottom: '16px', borderBottom: '1px solid #E2E8F0', paddingBottom: '14px' }}>
                <span style={{ fontSize: '11.5px', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Direct Rent Price
                </span>
                <div style={{ fontSize: '30px', fontWeight: 800, color: '#000052', marginTop: '2px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
                  {formatNaira(listing.price)}
                  <span style={{ fontSize: '14px', fontWeight: 500, color: '#64748B', marginLeft: '6px' }}>
                    {formatPeriod(listing.pricePeriod)}
                  </span>
                </div>
                <div style={{ fontSize: '12px', color: '#16794A', fontWeight: 700, marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Check size={13} />
                  <span>Zero inflated roadside agent commission</span>
                </div>
              </div>

              {/* Guarantees list */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px', fontSize: '13px', color: '#334155' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CheckCircle2 size={15} color="#16794A" />
                  <span>Free to request availability check</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CheckCircle2 size={15} color="#16794A" />
                  <span>Landlord availability confirmed by email</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CheckCircle2 size={15} color="#16794A" />
                  <span>Flat ₦5,000 fee only after confirmation</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CheckCircle2 size={15} color="#16794A" />
                  <span>Instant email notification with receipt &amp; contact</span>
                </div>
              </div>

              {/* Primary Request Access Button */}
              <button 
                type="button"
                className="btn btn-primary btn-block btn-lg btn-pill"
                onClick={() => onRequestAccess(listing)}
                style={{ 
                  fontSize: '15px', 
                  fontWeight: 800, 
                  height: '48px',
                  backgroundColor: '#000052',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '999px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  marginBottom: '10px'
                }}
              >
                <span>Continue to Request Details &amp; Checkout</span>
                <ChevronRight size={16} />
              </button>

              <div style={{ textAlign: 'center', fontSize: '11.5px', color: '#64748B' }}>
                100% Free check. Zero card or payment required now.
              </div>
            </div>

            {/* Lister Credibility Box */}
            <div 
              style={{ 
                backgroundColor: '#FFFFFF', 
                borderRadius: '16px', 
                border: '1px solid #E2E8F0', 
                padding: '20px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
                <div 
                  style={{ 
                    width: '44px', 
                    height: '44px', 
                    borderRadius: '50%', 
                    backgroundColor: '#EFF6FF', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    fontWeight: 800, 
                    color: '#000052',
                    fontSize: '15px',
                    border: '1px solid #BFDBFE'
                  }}
                >
                  {listing.lister.fullName.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 800, color: '#64748B', textTransform: 'uppercase' }}>
                    Listing Mandate
                  </div>
                  <div style={{ fontSize: '15.5px', fontWeight: 800, color: '#000052' }}>
                    {listing.lister.fullName}
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748B' }}>
                    {listing.lister.agencyName || 'Direct Landlord'} · Member since {listing.lister.memberSince}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-around', backgroundColor: '#F8FAFC', borderRadius: '10px', padding: '10px', textAlign: 'center', border: '1px solid #E2E8F0' }}>
                <div>
                  <div style={{ fontSize: '15px', fontWeight: 800, color: '#000052' }}>
                    {listing.lister.responseRate}
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748B' }}>Response Rate</div>
                </div>
                <div style={{ borderLeft: '1px solid #CBD5E1' }}></div>
                <div>
                  <div style={{ fontSize: '15px', fontWeight: 800, color: '#000052' }}>
                    {listing.lister.activeListingsCount}
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748B' }}>Active Listings</div>
                </div>
              </div>

              {/* Report Listing Trigger (FR-6.4 Community Reports & Disputes) */}
              <div style={{ marginTop: '14px', textAlign: 'center' }}>
                {!showReportForm && !reportSubmitted ? (
                  <button 
                    onClick={() => setShowReportForm(true)}
                    style={{ fontSize: '12px', color: '#64748B', background: 'none', border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                  >
                    <AlertCircle size={13} />
                    <span>Report inaccuracy in this listing</span>
                  </button>
                ) : reportSubmitted ? (
                  <div style={{ fontSize: '12px', color: '#16794A', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', backgroundColor: '#ECFDF5', padding: '8px 12px', borderRadius: '8px', border: '1px solid #A7F3D0' }}>
                    <Check size={14} color="#047857" strokeWidth={2.5} />
                    <span>Report logged in Admin Moderation queue.</span>
                  </div>
                ) : (
                  <div style={{ backgroundColor: '#F8FAFC', padding: '12px', borderRadius: '8px', textAlign: 'left', marginTop: '6px', border: '1px solid #E2E8F0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <div style={{ fontSize: '11.5px', fontWeight: 800, color: '#000052' }}>
                        Flag Listing Issue to Admin:
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowReportForm(false)}
                        style={{ background: 'none', border: 'none', fontSize: '11px', color: '#64748B', cursor: 'pointer' }}
                      >
                        Cancel
                      </button>
                    </div>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {(['Already Rented', 'Price Changed', 'Misleading Photos', 'Suspected Fraud'] as const).map(r => (
                        <button 
                          key={r}
                          type="button"
                          className="btn btn-outline btn-sm"
                          style={{ fontSize: '11px', padding: '4px 10px', borderColor: '#CBD5E1', color: '#000052', fontWeight: 600, backgroundColor: '#FFFFFF' }}
                          onClick={() => {
                            reportsService.submitReport({
                              listingId: listing.id,
                              listingTitle: listing.title,
                              listingArea: listing.area,
                              listingPhoto: listing.photos && listing.photos[0] ? listing.photos[0] : '',
                              listerName: listing.lister.fullName,
                              listerPhone: listing.lister.phone || '',
                              reason: r,
                              details: `Reported by prospective renter from listing detail view: ${r}`
                            });
                            setReportSubmitted(true);
                            setShowReportForm(false);
                          }}
                        >
                          {r}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Sticky Bottom Mobile Booking Bar (Visible only on screens < 768px) */}
      <div className="show-on-mobile sticky-mobile-bottom-bar">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
          <div>
            <div style={{ fontSize: '10.5px', fontWeight: 800, textTransform: 'uppercase', color: '#64748B', letterSpacing: '0.04em' }}>
              Rental Price
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
              <span style={{ fontSize: '18px', fontWeight: 800, color: '#000052' }}>
                ₦{formatNaira(listing.price)}
              </span>
              <span style={{ fontSize: '11.5px', color: '#64748B', fontWeight: 600 }}>
                / {formatPeriod(listing.pricePeriod)}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onRequestAccess(listing)}
            style={{
              backgroundColor: '#000052',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '999px',
              padding: '12px 20px',
              fontSize: '13.5px',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 4px 12px rgba(0,0,82,0.25)',
              minHeight: '44px'
            }}
          >
            <span>Request Access</span>
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};
