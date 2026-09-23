import React, { useState } from 'react';
import { X, ShieldCheck, MapPin, Bed, Bath, Maximize2, Check, CheckCircle2, Phone, MessageSquare, AlertCircle, Calendar } from 'lucide-react';
import { Listing } from '../types';
import { formatNaira, formatPeriod } from '../utils/formatters';

interface PropertyDetailModalProps {
  listing: Listing | null;
  onClose: () => void;
  onRequestAccess: (listing: Listing) => void;
}

export const PropertyDetailModal: React.FC<PropertyDetailModalProps> = ({
  listing,
  onClose,
  onRequestAccess
}) => {
  if (!listing) return null;

  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const [reportSubmitted, setReportSubmitted] = useState(false);
  const [showReportForm, setShowReportForm] = useState(false);

  return (
    <div className="modal-backdrop is-open" onClick={onClose}>
      <div 
        className="modal-card" 
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '720px' }}
      >
        {/* Modal Header */}
        <div className="modal-header">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="badge-type">{listing.type}</span>
              {listing.verificationStatus === 'verified' && (
                <span className="badge badge-verified">
                  <ShieldCheck size={13} />
                  <span>Physically Verified</span>
                </span>
              )}
            </div>
            <h2 style={{ fontSize: '20px', marginTop: '4px', color: 'var(--color-navy)' }}>
              {listing.title}
            </h2>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="modal-body" style={{ maxHeight: '75vh', overflowY: 'auto' }}>
          {/* Main Photo Gallery */}
          <div style={{ marginBottom: '16px' }}>
            <div style={{ width: '100%', height: '320px', borderRadius: 'var(--radius-lg)', overflow: 'hidden', backgroundColor: 'var(--color-lilac-50)' }}>
              <img 
                src={listing.photos[activePhotoIndex] || listing.photos[0]} 
                alt={listing.title} 
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>
            {listing.photos.length > 1 && (
              <div className="no-scrollbar" style={{ display: 'flex', gap: '8px', marginTop: '8px', overflowX: 'auto', paddingBottom: '4px', scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                {listing.photos.map((photo, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActivePhotoIndex(idx)}
                    style={{
                      width: '72px',
                      height: '52px',
                      borderRadius: 'var(--radius-sm)',
                      overflow: 'hidden',
                      border: activePhotoIndex === idx ? '2px solid var(--color-lilac)' : '2px solid transparent',
                      opacity: activePhotoIndex === idx ? 1 : 0.6,
                      flexShrink: 0
                    }}
                  >
                    <img src={photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Pricing & Location Banner */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '14px 0', borderBottom: '1px solid var(--color-border)' }}>
            <div>
              <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--color-navy)' }}>
                {formatNaira(listing.price)}
                <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--color-text-muted)', marginLeft: '4px' }}>
                  {formatPeriod(listing.pricePeriod)}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '14px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                <MapPin size={15} />
                <span>{listing.addressDescription}</span>
              </div>
            </div>

            {/* Quick Specs */}
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
              {listing.bedrooms !== undefined && listing.bedrooms > 0 && (
                <div style={{ textAlign: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 700, color: 'var(--color-navy)' }}>
                    <Bed size={16} />
                    <span>{listing.bedrooms}</span>
                  </div>
                  <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>Bedrooms</span>
                </div>
              )}
              {listing.bathrooms !== undefined && listing.bathrooms > 0 && (
                <div style={{ textAlign: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 700, color: 'var(--color-navy)' }}>
                    <Bath size={16} />
                    <span>{listing.bathrooms}</span>
                  </div>
                  <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>Baths</span>
                </div>
              )}
              {listing.areaSqm !== undefined && (
                <div style={{ textAlign: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 700, color: 'var(--color-navy)' }}>
                    <Maximize2 size={15} />
                    <span>{listing.areaSqm}</span>
                  </div>
                  <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>sqm</span>
                </div>
              )}
            </div>
          </div>

          {/* Physical Verification Proof Box */}
          {listing.verificationStatus === 'verified' && listing.inspection && (
            <div 
              style={{ 
                margin: '18px 0', 
                padding: '16px 20px', 
                backgroundColor: 'var(--color-lilac-50)', 
                border: '1px solid var(--color-lilac-200)',
                borderRadius: 'var(--radius-lg)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ShieldCheck size={20} className="text-navy" />
                  <h4 style={{ margin: 0, fontSize: '15px', color: 'var(--color-navy)' }}>Rentivo Physical Verification Evidence</h4>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', fontWeight: 600, color: 'var(--color-navy)' }}>
                  <Calendar size={13} />
                  <span>{listing.inspection.inspectionDate}</span>
                </div>
              </div>

              <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '12px' }}>
                {listing.inspection.inspectorNotes}
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', color: 'var(--color-success)', fontWeight: 600 }}>
                  <Check size={14} /> Physical On-site Visit Completed
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', color: 'var(--color-success)', fontWeight: 600 }}>
                  <Check size={14} /> Address Matches Official Title
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', color: 'var(--color-success)', fontWeight: 600 }}>
                  <Check size={14} /> Lister Mandate Audited
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', color: 'var(--color-success)', fontWeight: 600 }}>
                  <Check size={14} /> Genuine Property Photos Verified
                </div>
              </div>
            </div>
          )}

          {/* Description */}
          <div style={{ margin: '18px 0' }}>
            <h4 style={{ fontSize: '15px', marginBottom: '8px', color: 'var(--color-navy)' }}>About this Property</h4>
            <p style={{ fontSize: '14px', lineHeight: 1.6, color: 'var(--color-text)' }}>
              {listing.description}
            </p>
          </div>

          {/* Amenities Tags */}
          {listing.amenities && listing.amenities.length > 0 && (
            <div style={{ margin: '18px 0' }}>
              <h4 style={{ fontSize: '15px', marginBottom: '8px', color: 'var(--color-navy)' }}>Features & Amenities</h4>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {listing.amenities.map((amenity, i) => (
                  <span 
                    key={i} 
                    style={{ 
                      backgroundColor: 'var(--color-surface-muted)', 
                      padding: '6px 12px', 
                      borderRadius: 'var(--radius-sm)', 
                      fontSize: '12.5px', 
                      fontWeight: 500,
                      color: 'var(--color-text)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px'
                    }}
                  >
                    <Check size={13} color="var(--color-primary)" />
                    <span>{amenity}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Lister Trust Signal Card */}
          <div 
            style={{ 
              margin: '20px 0', 
              padding: '16px', 
              backgroundColor: '#fff', 
              border: '1px solid var(--color-border)', 
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px'
            }}
          >
            <div>
              <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
                Property Lister
              </div>
              <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--color-navy)' }}>
                {listing.lister.fullName}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                {listing.lister.agencyName || 'Independent Landlord'} · Member since {listing.lister.memberSince}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '16px', fontSize: '12px' }}>
              <div style={{ textAlign: 'center' }}>
                <span style={{ display: 'block', fontWeight: 700, color: 'var(--color-navy)' }}>
                  {listing.lister.responseRate}
                </span>
                <span style={{ color: 'var(--color-text-muted)' }}>Response Rate</span>
              </div>
              <div style={{ textAlign: 'center' }}>
                <span style={{ display: 'block', fontWeight: 700, color: 'var(--color-navy)' }}>
                  {listing.lister.activeListingsCount}
                </span>
                <span style={{ color: 'var(--color-text-muted)' }}>Active Listings</span>
              </div>
            </div>
          </div>

          {/* Reporting Section */}
          <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '14px', marginTop: '14px' }}>
            {!showReportForm && !reportSubmitted ? (
              <button 
                onClick={() => setShowReportForm(true)}
                style={{ fontSize: '12px', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <AlertCircle size={13} />
                <span>Notice something incorrect? Report this listing</span>
              </button>
            ) : reportSubmitted ? (
              <div style={{ fontSize: '12px', color: 'var(--color-success)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <CheckCircle2 size={14} color="var(--color-success)" />
                <span>Thank you. Your report has been submitted to Rentivo admin queue for investigation.</span>
              </div>
            ) : (
              <div style={{ backgroundColor: 'var(--color-surface-muted)', padding: '12px', borderRadius: 'var(--radius-md)' }}>
                <div style={{ fontSize: '13px', fontWeight: 700, marginBottom: '6px' }}>Report Listing</div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
                  {['Already Rented', 'Misleading Photos', 'Price Discrepancy', 'Fake Listing'].map(reason => (
                    <button 
                      key={reason} 
                      className="btn btn-outline btn-sm"
                      onClick={() => {
                        setReportSubmitted(true);
                        setShowReportForm(false);
                      }}
                    >
                      {reason}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer with Request Access CTA */}
        <div className="modal-footer">
          <div style={{ marginRight: 'auto', textAlign: 'left' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-success)' }}>
              NO UPFRONT PAYMENT REQUIRED
            </div>
            <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
              Flat access fee only after lister confirms availability.
            </div>
          </div>

          <button className="btn btn-outline" onClick={onClose}>
            Close
          </button>
          <button 
            className="btn btn-primary btn-pill"
            onClick={() => {
              onClose();
              onRequestAccess(listing);
            }}
          >
            Request Access
          </button>
        </div>
      </div>
    </div>
  );
};
