import React, { useState, useEffect } from 'react';
import { 
  Heart, 
  ShieldCheck, 
  MapPin, 
  Bed, 
  Bath, 
  Maximize2, 
  ArrowRight, 
  Trash2,
  Clock,
  CheckCircle2,
  FileText,
  KeyRound,
  Sparkles,
  Phone
} from 'lucide-react';
import { Listing, AccessRequest } from '../types';
import { formatNaira } from '../utils/formatters';
import { requestsService } from '../services/requestsService';

interface FavoritesPageProps {
  favorites: string[];
  listings: Listing[];
  onToggleFavorite: (id: string) => void;
  onSelectListing: (listing: Listing) => void;
  onRequestAccess: (listing: Listing) => void;
  onBrowseListings: () => void;
  onNavigateToRequests?: () => void;
  onProceedToCheckout?: (listing: Listing) => void;
}

export const FavoritesPage: React.FC<FavoritesPageProps> = ({
  favorites,
  listings,
  onToggleFavorite,
  onSelectListing,
  onRequestAccess,
  onBrowseListings,
  onNavigateToRequests,
  onProceedToCheckout
}) => {
  const [requests, setRequests] = useState<AccessRequest[]>([]);

  useEffect(() => {
    const fetchRequests = async () => {
      const data = await requestsService.getAllRequests();
      setRequests(data);
    };
    fetchRequests();
  }, []);

  const savedListings = listings.filter(l => favorites.includes(l.id));

  const getRequestForListing = (listingId: string) => {
    return requests.find(r => r.listingId === listingId && r.status !== 'unavailable');
  };

  return (
    <div style={{ backgroundColor: '#F8FAFC', minHeight: 'calc(100vh - 72px)', padding: '36px 20px 72px' }}>
      <div style={{ maxWidth: '1040px', margin: '0 auto' }}>
        
        {/* Clean Modern Page Header */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', backgroundColor: '#F0E6FF', padding: '4px 12px', borderRadius: '999px', marginBottom: '8px' }}>
            <Heart size={13} color="#000052" fill="#000052" />
            <span style={{ fontSize: '11px', fontWeight: 800, color: '#000052', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              Saved Properties
            </span>
          </div>
          <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#000052', margin: '0 0 6px', letterSpacing: '-0.01em' }}>
            Saved Properties ({savedListings.length})
          </h1>
          <p style={{ fontSize: '14px', color: '#636377', margin: 0, lineHeight: 1.5 }}>
            Review your shortlisted properties in Ibadan. Requesting access is always free, and you only pay flat ₦5,000 once vacancy is certified.
          </p>
        </div>

        {savedListings.length === 0 ? (
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
              <Heart size={28} />
            </div>
            <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#000052', margin: '0 0 8px' }}>
              Your Wishlist is Empty
            </h3>
            <p style={{ fontSize: '14px', color: '#636377', maxWidth: '420px', margin: '0 auto 24px', lineHeight: 1.5 }}>
              Click the heart icon on any Ibadan property to shortlist it here. You can track verification waiting periods and unlock landlord contacts directly.
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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px' }}>
            {savedListings.map(listing => {
              const activeReq = getRequestForListing(listing.id);

              return (
                <div 
                  key={listing.id}
                  style={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: '20px',
                    border: '1px solid #E2E8F0',
                    overflow: 'hidden',
                    boxShadow: '0 4px 16px rgba(0,0,82,0.04)',
                    display: 'flex',
                    flexDirection: 'column',
                    transition: 'transform 0.15s ease, box-shadow 0.15s ease'
                  }}
                >
                  {/* Photo Header with Status & Remove Button */}
                  <div style={{ position: 'relative', height: '190px', backgroundColor: '#EDEAF4' }}>
                    <img 
                      src={listing.photos[0] || 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=600&q=80'} 
                      alt={listing.title}
                      style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: 'pointer' }}
                      onClick={() => onSelectListing(listing)}
                    />

                    {/* Verified Badge */}
                    {listing.verificationStatus === 'verified' && (
                      <div 
                        style={{
                          position: 'absolute',
                          top: '12px',
                          left: '12px',
                          backgroundColor: '#16794A',
                          color: '#FFFFFF',
                          fontSize: '11px',
                          fontWeight: 800,
                          padding: '4px 10px',
                          borderRadius: '999px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
                        }}
                      >
                        <ShieldCheck size={12} />
                        <span>Verified</span>
                      </div>
                    )}

                    {/* Remove from Saved Button */}
                    <button
                      type="button"
                      onClick={() => onToggleFavorite(listing.id)}
                      style={{
                        position: 'absolute',
                        top: '12px',
                        right: '12px',
                        width: '34px',
                        height: '34px',
                        borderRadius: '50%',
                        backgroundColor: 'rgba(255,255,255,0.92)',
                        border: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        color: '#DC2626',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.18)'
                      }}
                      title="Remove from wishlist"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>

                  {/* Body Content */}
                  <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#636377', marginBottom: '6px' }}>
                        <MapPin size={13} color="#000052" />
                        <span>{listing.area}, {listing.city || 'Ibadan'}</span>
                      </div>

                      <h3 
                        onClick={() => onSelectListing(listing)}
                        style={{
                          fontSize: '16px',
                          fontWeight: 800,
                          color: '#000052',
                          margin: '0 0 10px',
                          cursor: 'pointer',
                          lineHeight: 1.3
                        }}
                      >
                        {listing.title}
                      </h3>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '12.5px', color: '#636377', marginBottom: '16px' }}>
                        {listing.bedrooms !== undefined && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <Bed size={14} /> {listing.bedrooms} Beds
                          </span>
                        )}
                        {listing.bathrooms !== undefined && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <Bath size={14} /> {listing.bathrooms} Baths
                          </span>
                        )}
                        {listing.areaSqm && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <Maximize2 size={13} /> {listing.areaSqm} sqm
                          </span>
                        )}
                      </div>

                      {/* Real-Time Request Lifecycle Status Banner */}
                      {activeReq ? (
                        <div style={{ marginBottom: '14px' }}>
                          {activeReq.status === 'confirmed' && (
                            <div style={{ backgroundColor: '#F0E6FF', border: '1px solid #D8B4FE', borderRadius: '10px', padding: '8px 12px', fontSize: '12px', color: '#000052', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}>
                              <CheckCircle2 size={14} color="#16794A" />
                              <span>Confirmed Vacant! Ready to pay ₦5,000.</span>
                            </div>
                          )}

                          {(activeReq.status === 'submitted' || activeReq.status === 'availability_pending') && (
                            <div style={{ backgroundColor: '#FAF5FF', border: '1px solid #E9D5FF', borderRadius: '10px', padding: '8px 12px', fontSize: '12px', color: '#6B21A8', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
                              <Clock size={14} color="#6B21A8" />
                              <span>Waiting Period: Checking with Lister...</span>
                            </div>
                          )}

                          {activeReq.status === 'paid' && (
                            <div style={{ backgroundColor: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: '10px', padding: '8px 12px', fontSize: '12px', color: '#16794A', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}>
                              <ShieldCheck size={14} color="#16794A" />
                              <span>Landlord Contact Unlocked!</span>
                            </div>
                          )}
                        </div>
                      ) : null}
                    </div>

                    {/* Price & Action Row */}
                    <div style={{ paddingTop: '14px', borderTop: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                      <div>
                        <span style={{ fontSize: '11px', color: '#636377', display: 'block' }}>Rent Price</span>
                        <strong style={{ fontSize: '16px', fontWeight: 800, color: '#000052' }}>
                          {formatNaira(listing.price)}
                        </strong>
                      </div>

                      {/* Action Button tailored to Request Lifecycle */}
                      {activeReq?.status === 'confirmed' ? (
                        <button
                          type="button"
                          onClick={() => {
                            if (onProceedToCheckout) {
                              onProceedToCheckout(listing);
                            } else if (onNavigateToRequests) {
                              onNavigateToRequests();
                            }
                          }}
                          style={{
                            backgroundColor: '#000052',
                            color: '#FFFFFF',
                            border: 'none',
                            padding: '8px 14px',
                            borderRadius: '10px',
                            fontSize: '12.5px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            boxShadow: '0 2px 8px rgba(0,0,82,0.2)'
                          }}
                        >
                          <span>Pay ₦5,000</span>
                          <ArrowRight size={13} />
                        </button>
                      ) : activeReq?.status === 'paid' ? (
                        <button
                          type="button"
                          onClick={onNavigateToRequests}
                          style={{
                            backgroundColor: '#ECFDF5',
                            color: '#16794A',
                            border: '1.5px solid #16794A',
                            padding: '7px 12px',
                            borderRadius: '10px',
                            fontSize: '12px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px'
                          }}
                        >
                          <Phone size={13} />
                          <span>View Contact</span>
                        </button>
                      ) : activeReq?.status === 'availability_pending' || activeReq?.status === 'submitted' ? (
                        <button
                          type="button"
                          onClick={onNavigateToRequests}
                          style={{
                            backgroundColor: '#FAF5FF',
                            color: '#6B21A8',
                            border: '1.5px solid #E9D5FF',
                            padding: '7px 12px',
                            borderRadius: '10px',
                            fontSize: '12px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px'
                          }}
                        >
                          <Clock size={13} />
                          <span>Track Status</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onRequestAccess(listing)}
                          style={{
                            backgroundColor: '#000052',
                            color: '#FFFFFF',
                            border: 'none',
                            padding: '8px 14px',
                            borderRadius: '10px',
                            fontSize: '12.5px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px'
                          }}
                        >
                          <span>Request (Free)</span>
                          <ArrowRight size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>
    </div>
  );
};

export default FavoritesPage;
