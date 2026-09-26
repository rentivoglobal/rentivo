import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Heart,
  FileText,
  User as UserIcon,
  ArrowRight,
  ShieldCheck,
  Search,
  Sparkles,
  MapPin,
  Building2,
  Calendar,
  CheckCircle2,
  Sliders,
  DollarSign,
  AlertCircle
} from 'lucide-react';
import { AccessRequest, Listing, NavigationTab, RenterProfile } from '../types';
import { requestsService } from '../services/requestsService';
import { renterProfileService } from '../services/renterProfileService';
import { useAuth } from '../contexts/AuthContext';
import { OptimizedImage } from '../components/OptimizedImage';
import { formatNaira } from '../utils/formatters';

interface AccountPageProps {
  listings: Listing[];
  favorites: string[];
  onNavigateToTab: (tab: NavigationTab) => void;
  onSelectListing: (listing: Listing) => void;
  onOpenRequest: (request: AccessRequest) => void;
}

export const AccountPage: React.FC<AccountPageProps> = ({
  listings,
  favorites,
  onNavigateToTab,
  onSelectListing,
  onOpenRequest
}) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [renterProfile, setRenterProfile] = useState<RenterProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState<boolean>(true);

  useEffect(() => {
    void requestsService.getAllRequests().then(setRequests);
  }, []);

  useEffect(() => {
    const loadProfile = async () => {
      setLoadingProfile(true);
      if (user?.id) {
        const p = await renterProfileService.getProfile(user.id);
        setRenterProfile(p);
      } else {
        const local = renterProfileService.getLocalPreferences();
        setRenterProfile(local);
      }
      setLoadingProfile(false);
    };
    void loadProfile();
  }, [user]);

  // Compute matched listings based on renter preferences
  const matchedListings = useMemo(() => {
    if (!renterProfile) return [];
    return listings
      .map(item => ({
        listing: item,
        score: renterProfileService.calculateMatchScore(item, renterProfile)
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 4);
  }, [listings, renterProfile]);

  const latest = requests[0];
  const saved = listings.filter((l) => favorites.includes(l.id)).slice(0, 4);

  const formatTimeline = (t?: string) => {
    switch (t) {
      case 'immediate': return 'Immediate (Under 2 weeks)';
      case 'within_2_weeks': return 'Within this month';
      case 'this_month': return 'Next 1 to 2 months';
      case 'exploring': return 'Exploring options';
      default: return t || 'Not specified';
    }
  };

  const formatGoal = (g?: string) => {
    switch (g) {
      case 'relocating': return 'Relocating to Ibadan';
      case 'upgrading': return 'Upgrading space';
      case 'work_proximity': return 'Closer to work/school';
      case 'student': return 'Student accommodation';
      case 'family': return 'Family home';
      default: return g || 'Home search';
    }
  };

  return (
    <div style={{ background: '#F8FAFC', minHeight: '80vh', padding: '36px 20px 80px', color: '#000052' }}>
      <div style={{ maxWidth: 960, margin: '0 auto' }}>
        
        {/* User Welcome Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, marginBottom: 28 }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', background: '#F1E5FF', color: '#6B21A8', borderRadius: 999, fontSize: 12, fontWeight: 700, marginBottom: 8 }}>
              <ShieldCheck size={14} /> Verified Renter Portal
            </div>
            <h1 style={{ fontSize: 30, fontWeight: 800, color: '#000052', margin: 0 }}>
              Welcome back{user?.name ? `, ${user.name.split(' ')[0]}` : ''}
            </h1>
            <p style={{ color: '#636377', fontSize: 15, margin: '4px 0 0 0' }}>
              Manage your move, view personalized matches, and track verified inspection unlocks.
            </p>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button
              type="button"
              onClick={() => onNavigateToTab('search')}
              style={{
                background: '#000052',
                color: '#fff',
                padding: '10px 18px',
                borderRadius: 12,
                fontWeight: 700,
                fontSize: 14,
                border: 'none',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                boxShadow: '0 4px 12px rgba(0,0,82,0.15)'
              }}
            >
              <Search size={16} /> Browse Verified Homes
            </button>
          </div>
        </div>

        {/* First 100 Renter Waiver Status Banner */}
        <div style={{
          background: 'linear-gradient(90deg, #FBF7FF 0%, #F3EBFF 100%)',
          border: '1.5px solid #DFCFFF',
          borderRadius: 16,
          padding: '16px 20px',
          marginBottom: 28,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ background: '#7C3AED', color: '#fff', width: 42, height: 42, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Sparkles size={20} />
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 800, color: '#2B1154' }}>
                First 100 Renter Promotion Active
              </div>
              <div style={{ fontSize: 13, color: '#5D4680' }}>
                ₦5,000 viewing fee is completely waived for your next physical property inspections.
              </div>
            </div>
          </div>
          <span style={{ fontSize: 12, fontWeight: 700, padding: '4px 12px', background: '#7C3AED', color: '#fff', borderRadius: 999 }}>
            Waiver Applied
          </span>
        </div>

        {/* Personalized Renter Plan Section */}
        {renterProfile && renterProfile.onboardingCompleted ? (
          <div style={{
            background: '#FFFFFF',
            border: '1.5px solid #E2E8F0',
            borderRadius: 20,
            padding: '24px 28px',
            marginBottom: 28,
            boxShadow: '0 4px 20px rgba(0,0,82,0.03)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 18, borderBottom: '1px solid #F1F5F9', paddingBottom: 14 }}>
              <div>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#7C3AED', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Active Search Blueprint
                </span>
                <h2 style={{ fontSize: 20, fontWeight: 800, color: '#000052', margin: '2px 0 0 0' }}>
                  {formatGoal(renterProfile.rentalGoal)}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => navigate('/onboarding/renter?edit=true')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '8px 14px',
                  borderRadius: 10,
                  border: '1px solid #E2E8F0',
                  background: '#F8FAFC',
                  color: '#000052',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                <Sliders size={14} /> Update Preferences
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
              {/* Preferred Areas */}
              <div style={{ background: '#F8FAFC', padding: 14, borderRadius: 12, border: '1px solid #EEF2F6' }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#64748B', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                  <MapPin size={14} color="#7C3AED" /> Preferred Areas
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#000052' }}>
                  {renterProfile.preferredAreas.length > 0 ? renterProfile.preferredAreas.join(', ') : 'All Ibadan areas'}
                </div>
              </div>

              {/* Property Style & Beds */}
              <div style={{ background: '#F8FAFC', padding: 14, borderRadius: 12, border: '1px solid #EEF2F6' }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#64748B', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                  <Building2 size={14} color="#7C3AED" /> Home Type
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#000052' }}>
                  {renterProfile.propertyTypes.length > 0 ? renterProfile.propertyTypes.join(', ') : 'Any Property'}
                  {renterProfile.bedrooms ? ` (${renterProfile.bedrooms} Bed)` : ''}
                </div>
              </div>

              {/* Budget */}
              <div style={{ background: '#F8FAFC', padding: 14, borderRadius: 12, border: '1px solid #EEF2F6' }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#64748B', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                  <DollarSign size={14} color="#7C3AED" /> Target Budget
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#000052' }}>
                  ₦{(renterProfile.budgetMin || 0).toLocaleString()} – ₦{(renterProfile.budgetMax || 0).toLocaleString()} / yr
                </div>
              </div>

              {/* Move-in Urgency */}
              <div style={{ background: '#F8FAFC', padding: 14, borderRadius: 12, border: '1px solid #EEF2F6' }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#64748B', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                  <Calendar size={14} color="#7C3AED" /> Move Timeline
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#000052' }}>
                  {formatTimeline(renterProfile.moveInTimeline)}
                </div>
              </div>
            </div>

            {/* Must-Haves Tags */}
            {renterProfile.mustHaves && renterProfile.mustHaves.length > 0 && (
              <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#64748B' }}>Deal-Breakers:</span>
                {renterProfile.mustHaves.map(m => (
                  <span
                    key={m}
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      background: '#F1F5F9',
                      color: '#000052',
                      padding: '3px 10px',
                      borderRadius: 999,
                      border: '1px solid #E2E8F0'
                    }}
                  >
                    ✓ {m}
                  </span>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* Callout to Complete Onboarding */
          <div style={{
            background: '#FFFFFF',
            border: '1.5px dashed #BE89FF',
            borderRadius: 20,
            padding: '24px 28px',
            marginBottom: 28,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 16
          }}>
            <div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#7C3AED', fontWeight: 800, fontSize: 13, marginBottom: 4 }}>
                <Sparkles size={16} /> 2-Minute Personalization
              </div>
              <h2 style={{ fontSize: 19, fontWeight: 800, color: '#000052', margin: '0 0 4px 0' }}>
                Create your custom rental blueprint
              </h2>
              <p style={{ color: '#636377', fontSize: 14, margin: 0 }}>
                Specify your budget, preferred Ibadan neighborhoods, and deal-breakers for tailored alerts.
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/onboarding/renter')}
              style={{
                background: '#000052',
                color: '#fff',
                padding: '12px 22px',
                borderRadius: 12,
                fontWeight: 700,
                fontSize: 14,
                border: 'none',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8
              }}
            >
              Start 2-Min Quiz <ArrowRight size={16} />
            </button>
          </div>
        )}

        {/* Quick Nav Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 32 }}>
          <button type="button" onClick={() => onNavigateToTab('search')} style={cardBtn}>
            <Search size={20} color="#7C3AED" />
            <strong style={{ fontSize: 15, marginTop: 4 }}>Search Marketplace</strong>
            <span style={{ fontSize: 13, color: '#64748B' }}>Explore verified Ibadan homes</span>
          </button>
          <button type="button" onClick={() => onNavigateToTab('requests')} style={cardBtn}>
            <FileText size={20} color="#7C3AED" />
            <strong style={{ fontSize: 15, marginTop: 4 }}>{requests.length} Requests</strong>
            <span style={{ fontSize: 13, color: '#64748B' }}>Track viewing unlocks & status</span>
          </button>
          <button type="button" onClick={() => onNavigateToTab('favorites')} style={cardBtn}>
            <Heart size={20} color="#7C3AED" />
            <strong style={{ fontSize: 15, marginTop: 4 }}>{favorites.length} Saved Homes</strong>
            <span style={{ fontSize: 13, color: '#64748B' }}>Your shortlisted properties</span>
          </button>
          <button type="button" onClick={() => onNavigateToTab('profile')} style={cardBtn}>
            <UserIcon size={20} color="#7C3AED" />
            <strong style={{ fontSize: 15, marginTop: 4 }}>Account & Security</strong>
            <span style={{ fontSize: 13, color: '#64748B' }}>Name, phone & login info</span>
          </button>
        </div>

        {/* Curated Recommendations for this Renter */}
        {matchedListings.length > 0 && (
          <div style={{ marginBottom: 36 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div>
                <h3 style={{ fontSize: 20, fontWeight: 800, color: '#000052', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Sparkles size={18} color="#7C3AED" /> Tailored Matches For You
                </h3>
                <p style={{ color: '#64748B', fontSize: 13.5, margin: '2px 0 0 0' }}>
                  Ranked by match with your budget, location, and must-have amenities
                </p>
              </div>
              <button
                type="button"
                onClick={() => navigate('/search?personalized=true')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#7C3AED',
                  fontWeight: 700,
                  fontSize: 14,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4
                }}
              >
                View all matches <ArrowRight size={14} />
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
              {matchedListings.map(({ listing, score }) => (
                <div
                  key={listing.id}
                  onClick={() => onSelectListing(listing)}
                  style={{
                    background: '#FFFFFF',
                    border: '1.5px solid #E2E8F0',
                    borderRadius: 16,
                    overflow: 'hidden',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    boxShadow: '0 2px 8px rgba(0,0,82,0.04)'
                  }}
                >
                  <div style={{ position: 'relative', height: 160 }}>
                    <OptimizedImage
                      src={listing.photos[0]}
                      alt={listing.title}
                      width={400}
                      height={200}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                    <div style={{
                      position: 'absolute',
                      top: 10,
                      left: 10,
                      background: 'rgba(124, 58, 237, 0.92)',
                      backdropFilter: 'blur(4px)',
                      color: '#FFFFFF',
                      fontSize: 11,
                      fontWeight: 800,
                      padding: '4px 10px',
                      borderRadius: 999,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4
                    }}>
                      <Sparkles size={11} /> {score}% Match
                    </div>
                  </div>
                  <div style={{ padding: 16 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#64748B', marginBottom: 2 }}>
                      {listing.area} · {listing.type}
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: '#000052', marginBottom: 8, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {listing.title}
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: '#000052' }}>
                      ₦{listing.price.toLocaleString()} <span style={{ fontSize: 12, fontWeight: 500, color: '#64748B' }}>/ yr</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Latest Request Status Card */}
        {latest && (
          <div style={{ background: '#fff', border: '1.5px solid #E2E8F0', borderRadius: 18, padding: 22, marginBottom: 28 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#7C3AED', fontWeight: 800, fontSize: 13, textTransform: 'uppercase' }}>
                <ShieldCheck size={16} /> Latest Viewing Request
              </div>
              <span style={{ fontSize: 12, fontWeight: 700, padding: '4px 10px', borderRadius: 999, background: '#F1F5F9', color: '#000052', textTransform: 'capitalize' }}>
                {latest.status.replace(/_/g, ' ')}
              </span>
            </div>
            <h3 style={{ fontSize: 18, fontWeight: 800, color: '#000052', margin: '0 0 6px 0' }}>{latest.listingTitle}</h3>
            <p style={{ color: '#636377', fontSize: 14, margin: '0 0 16px 0' }}>
              Reference ID: {latest.id} · Requested by {latest.renterName}
            </p>
            <button type="button" onClick={() => onOpenRequest(latest)} style={primaryBtn}>
              View Request Details <ArrowRight size={14} />
            </button>
          </div>
        )}

        {/* Saved Listings Snippet */}
        {saved.length > 0 && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <h3 style={{ fontSize: 18, fontWeight: 800, color: '#000052', margin: 0 }}>
                Shortlisted Homes ({favorites.length})
              </h3>
              <button
                type="button"
                onClick={() => onNavigateToTab('favorites')}
                style={{ background: 'none', border: 'none', color: '#7C3AED', fontWeight: 700, fontSize: 13.5, cursor: 'pointer' }}
              >
                View all saved
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
              {saved.map((listing) => (
                <div
                  key={listing.id}
                  onClick={() => onSelectListing(listing)}
                  style={{
                    background: '#fff',
                    border: '1px solid #E2E8F0',
                    borderRadius: 14,
                    padding: 12,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 14,
                    cursor: 'pointer'
                  }}
                >
                  <img src={listing.photos[0]} alt="" style={{ width: 68, height: 56, objectFit: 'cover', borderRadius: 8, flexShrink: 0 }} />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: '#000052', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {listing.title}
                    </div>
                    <div style={{ fontSize: 12, color: '#64748B' }}>{listing.area} · ₦{listing.price.toLocaleString()}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

const cardBtn: React.CSSProperties = {
  background: '#fff',
  border: '1.5px solid #E2E8F0',
  borderRadius: 16,
  padding: 18,
  textAlign: 'left',
  cursor: 'pointer',
  color: '#000052',
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
  alignItems: 'flex-start',
  boxShadow: '0 2px 6px rgba(0,0,82,0.02)',
  transition: 'all 0.2s ease'
};

const primaryBtn: React.CSSProperties = {
  background: '#000052',
  color: '#fff',
  border: 'none',
  borderRadius: 10,
  padding: '10px 18px',
  fontWeight: 700,
  fontSize: 13.5,
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6
};
