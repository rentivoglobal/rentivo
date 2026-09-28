import React, { useState } from 'react';
import { 
  ArrowLeft, 
  ArrowRight, 
  Search, 
  CheckCircle2, 
  PhoneCall, 
  Building, 
  ShieldCheck, 
  Check, 
  Sparkles,
  KeyRound
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface HowItWorksPageProps {
  onBrowseProperties: () => void;
  onPostListing: () => void;
}

export const HowItWorksPage: React.FC<HowItWorksPageProps> = ({
  onBrowseProperties,
  onPostListing
}) => {
  const { user } = useAuth();
  const isLister = user?.role === 'landlord' || user?.role === 'agent';
  const isRenter = Boolean(user && !isLister && user.role !== 'admin');
  const [activeTab, setActiveTab] = useState<'renter' | 'lister'>('renter');

  return (
    <div style={{ backgroundColor: '#FAFAFA', minHeight: '100vh', color: '#000052', paddingBottom: '80px' }}>
      
      {/* -------------------------------------------------------------
          COMPACT MINIMALIST HEADER WITH BACKGROUND IMAGE
         ------------------------------------------------------------- */}
      <header
        style={{
          position: 'relative',
          backgroundImage: `linear-gradient(180deg, rgba(0, 0, 82, 0.72) 0%, rgba(0, 0, 60, 0.88) 100%), url('/how-it-works-hero.jpg')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          color: '#FFFFFF',
          padding: 'clamp(40px, 6vw, 64px) 20px',
          textAlign: 'center'
        }}
      >
        <div style={{ maxWidth: '720px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
          {/* Back Navigation Pill */}
          <button
            type="button"
            onClick={onBrowseProperties}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: 'rgba(255, 255, 255, 0.12)',
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '9999px',
              padding: '6px 14px',
              fontSize: '12.5px',
              fontWeight: 700,
              color: '#FFFFFF',
              cursor: 'pointer',
              marginBottom: '20px',
              transition: 'background-color 0.15s ease'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.12)'; }}
          >
            <ArrowLeft size={14} />
            <span>Back to Browse</span>
          </button>

          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            backgroundColor: 'rgba(190, 137, 255, 0.16)',
            border: '1px solid rgba(190, 137, 255, 0.3)',
            padding: '4px 12px',
            borderRadius: '9999px',
            fontSize: '11px',
            fontWeight: 800,
            color: '#BE89FF',
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
            width: 'fit-content',
            margin: '0 auto 14px'
          }}>
            <Sparkles size={12} style={{ display: 'inline', verticalAlign: '-1px', marginRight: '4px' }} />
            The Rentivo Model
          </div>

          <h1 style={{
            fontSize: 'clamp(28px, 4.5vw, 42px)',
            fontWeight: 800,
            lineHeight: 1.15,
            letterSpacing: '-0.02em',
            margin: '0 0 12px',
            color: '#FFFFFF'
          }}>
            How Rentivo Works
          </h1>

          <p style={{
            fontSize: 'clamp(14px, 1.8vw, 16px)',
            color: '#D4CEE8',
            lineHeight: 1.55,
            margin: '0 auto',
            maxWidth: '520px'
          }}>
            Rent directly from verified property owners in Ibadan. No roadside viewing fees, no 10% agent commission.
          </p>
        </div>
      </header>

      {/* -------------------------------------------------------------
          MINIMALIST CONTENT CONTAINER
         ------------------------------------------------------------- */}
      <main style={{ maxWidth: '820px', margin: '0 auto', padding: '0 20px', transform: 'translateY(-22px)' }}>

        {/* Audience Toggle (Clean Minimalist Pill) */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '28px' }}>
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '9999px',
            padding: '4px',
            display: 'inline-flex',
            border: '1px solid #E2E8F0',
            boxShadow: '0 4px 14px rgba(0, 0, 82, 0.05)'
          }}>
            <button
              type="button"
              onClick={() => setActiveTab('renter')}
              style={{
                padding: '8px 22px',
                borderRadius: '9999px',
                border: 'none',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                backgroundColor: activeTab === 'renter' ? '#000052' : 'transparent',
                color: activeTab === 'renter' ? '#FFFFFF' : '#64748B',
                transition: 'all 0.15s ease'
              }}
            >
              For Renters
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('lister')}
              style={{
                padding: '8px 22px',
                borderRadius: '9999px',
                border: 'none',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                backgroundColor: activeTab === 'lister' ? '#000052' : 'transparent',
                color: activeTab === 'lister' ? '#FFFFFF' : '#64748B',
                transition: 'all 0.15s ease'
              }}
            >
              For Property Owners
            </button>
          </div>
        </div>

        {/* -------------------------------------------------------------
            THE 3 STEPS (MINIMALIST CARDS)
           ------------------------------------------------------------- */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
          {activeTab === 'renter' ? (
            <>
              {/* Step 1 */}
              <div style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '16px',
                border: '1px solid #E2E8F0',
                padding: '24px',
                boxShadow: '0 2px 8px rgba(0,0,82,0.02)',
                display: 'flex',
                gap: '20px',
                alignItems: 'flex-start'
              }}>
                <div style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '12px',
                  backgroundColor: '#F0E6FF',
                  color: '#000052',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <Search size={20} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px', flexWrap: 'wrap', gap: '8px' }}>
                    <h3 style={{ fontSize: '16.5px', fontWeight: 800, color: '#000052', margin: 0 }}>
                      1. Browse Verified Homes
                    </h3>
                    <span style={{ fontSize: '11px', fontWeight: 800, color: '#16794A', backgroundColor: '#ECFDF5', padding: '3px 8px', borderRadius: '6px' }}>
                      Free to browse
                    </span>
                  </div>
                  <p style={{ fontSize: '13.5px', color: '#64748B', lineHeight: 1.5, margin: 0 }}>
                    Every listing in Bodija, Akobo, Jericho, and across Ibadan has been physically checked on-site with authentic photos and exact locations.
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '16px',
                border: '1px solid #E2E8F0',
                padding: '24px',
                boxShadow: '0 2px 8px rgba(0,0,82,0.02)',
                display: 'flex',
                gap: '20px',
                alignItems: 'flex-start'
              }}>
                <div style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '12px',
                  backgroundColor: '#F0E6FF',
                  color: '#000052',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <CheckCircle2 size={20} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px', flexWrap: 'wrap', gap: '8px' }}>
                    <h3 style={{ fontSize: '16.5px', fontWeight: 800, color: '#000052', margin: 0 }}>
                      2. Free Vacancy Check
                    </h3>
                    <span style={{ fontSize: '11px', fontWeight: 800, color: '#16794A', backgroundColor: '#ECFDF5', padding: '3px 8px', borderRadius: '6px' }}>
                      Pay ₦0 if house is taken
                    </span>
                  </div>
                  <p style={{ fontSize: '13.5px', color: '#64748B', lineHeight: 1.5, margin: 0 }}>
                    Click "Request Access". We contact the property owner directly to certify the home is vacant before you spend a single kobo.
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div style={{
                backgroundColor: '#FAF5FF',
                borderRadius: '16px',
                border: '1.5px solid #E9D5FF',
                padding: '24px',
                boxShadow: '0 4px 14px rgba(124, 58, 237, 0.04)',
                display: 'flex',
                gap: '20px',
                alignItems: 'flex-start'
              }}>
                <div style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '12px',
                  backgroundColor: '#000052',
                  color: '#BE89FF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <PhoneCall size={20} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px', flexWrap: 'wrap', gap: '8px' }}>
                    <h3 style={{ fontSize: '16.5px', fontWeight: 800, color: '#000052', margin: 0 }}>
                      3. Unlock Direct Landlord Access
                    </h3>
                    <span style={{ fontSize: '11px', fontWeight: 800, color: '#6B21A8', backgroundColor: '#F3E8FF', padding: '3px 8px', borderRadius: '6px' }}>
                      Flat ₦5,000 fee
                    </span>
                  </div>
                  <p style={{ fontSize: '13.5px', color: '#64748B', lineHeight: 1.5, margin: 0 }}>
                    Pay the flat ₦5,000 access fee via secure Paystack. Instantly unlock the landlord's direct phone number, WhatsApp chat, and physical address. Zero 10% agent commission.
                  </p>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Lister Step 1 */}
              <div style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '16px',
                border: '1px solid #E2E8F0',
                padding: '24px',
                display: 'flex',
                gap: '20px',
                alignItems: 'flex-start'
              }}>
                <div style={{ width: '42px', height: '42px', borderRadius: '12px', backgroundColor: '#F0E6FF', color: '#000052', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Building size={20} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px', flexWrap: 'wrap', gap: '8px' }}>
                    <h3 style={{ fontSize: '16.5px', fontWeight: 800, color: '#000052', margin: 0 }}>
                      1. Post Your Property Free
                    </h3>
                    <span style={{ fontSize: '11px', fontWeight: 800, color: '#16794A', backgroundColor: '#ECFDF5', padding: '3px 8px', borderRadius: '6px' }}>
                      100% Free listing
                    </span>
                  </div>
                  <p style={{ fontSize: '13.5px', color: '#64748B', lineHeight: 1.5, margin: 0 }}>
                    Upload photos, set your yearly rent, and specify tenant preferences in under 3 minutes. No listing fee ever.
                  </p>
                </div>
              </div>

              {/* Lister Step 2 */}
              <div style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '16px',
                border: '1px solid #E2E8F0',
                padding: '24px',
                display: 'flex',
                gap: '20px',
                alignItems: 'flex-start'
              }}>
                <div style={{ width: '42px', height: '42px', borderRadius: '12px', backgroundColor: '#F0E6FF', color: '#000052', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <ShieldCheck size={20} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px', flexWrap: 'wrap', gap: '8px' }}>
                    <h3 style={{ fontSize: '16.5px', fontWeight: 800, color: '#000052', margin: 0 }}>
                      2. Free Physical Audit
                    </h3>
                    <span style={{ fontSize: '11px', fontWeight: 800, color: '#16794A', backgroundColor: '#ECFDF5', padding: '3px 8px', borderRadius: '6px' }}>
                      Verified badge
                    </span>
                  </div>
                  <p style={{ fontSize: '13.5px', color: '#64748B', lineHeight: 1.5, margin: 0 }}>
                    A Rentivo field officer visits your property to confirm details and award the green Verified badge that serious tenants look for.
                  </p>
                </div>
              </div>

              {/* Lister Step 3 */}
              <div style={{
                backgroundColor: '#FAF5FF',
                borderRadius: '16px',
                border: '1.5px solid #E9D5FF',
                padding: '24px',
                display: 'flex',
                gap: '20px',
                alignItems: 'flex-start'
              }}>
                <div style={{ width: '42px', height: '42px', borderRadius: '12px', backgroundColor: '#000052', color: '#BE89FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <KeyRound size={20} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px', flexWrap: 'wrap', gap: '8px' }}>
                    <h3 style={{ fontSize: '16.5px', fontWeight: 800, color: '#000052', margin: 0 }}>
                      3. Close Genuine Tenants
                    </h3>
                    <span style={{ fontSize: '11px', fontWeight: 800, color: '#6B21A8', backgroundColor: '#F3E8FF', padding: '3px 8px', borderRadius: '6px' }}>
                      Direct inquiries
                    </span>
                  </div>
                  <p style={{ fontSize: '13.5px', color: '#64748B', lineHeight: 1.5, margin: 0 }}>
                    Receive direct WhatsApp messages and calls from serious renters who have verified their budget. Zero broker friction.
                  </p>
                </div>
              </div>
            </>
          )}
        </div>

        {/* -------------------------------------------------------------
            MINIMALIST TRUST & GUARANTEE STRIP
           ------------------------------------------------------------- */}
        <div style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          border: '1px solid #E2E8F0',
          padding: '20px 24px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
          marginBottom: '32px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ backgroundColor: '#ECFDF5', width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#059669', flexShrink: 0 }}>
              <Check size={18} strokeWidth={2.5} />
            </div>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 800, color: '#000052' }}>₦0 Viewing Fees</div>
              <div style={{ fontSize: '12px', color: '#64748B' }}>Browse freely anytime</div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ backgroundColor: '#ECFDF5', width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#059669', flexShrink: 0 }}>
              <ShieldCheck size={18} />
            </div>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 800, color: '#000052' }}>100% Vacancy Guarantee</div>
              <div style={{ fontSize: '12px', color: '#64748B' }}>Pay ₦0 if house is taken</div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ backgroundColor: '#F3E8FF', width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#7C3AED', flexShrink: 0 }}>
              <Sparkles size={18} />
            </div>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 800, color: '#000052' }}>Flat ₦5,000 Only</div>
              <div style={{ fontSize: '12px', color: '#64748B' }}>Skip 10% agent commission</div>
            </div>
          </div>
        </div>

        {/* -------------------------------------------------------------
            MINIMALIST BOTTOM CALL TO ACTION
           ------------------------------------------------------------- */}
        <div style={{
          backgroundColor: '#000052',
          borderRadius: '20px',
          padding: '36px 24px',
          textAlign: 'center',
          color: '#FFFFFF',
          boxShadow: '0 8px 24px rgba(0, 0, 82, 0.15)'
        }}>
          <h2 style={{ fontSize: 'clamp(20px, 3.5vw, 26px)', fontWeight: 800, margin: '0 0 8px', color: '#FFFFFF' }}>
            Ready to find your next home in Ibadan?
          </h2>
          <p style={{ fontSize: '14px', color: '#D4CEE8', margin: '0 auto 24px', maxWidth: '480px', lineHeight: 1.5 }}>
            Browse verified flats, duplexes, self-contains, and commercial properties with zero agent markups.
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={onBrowseProperties}
              style={{
                backgroundColor: '#BE89FF',
                color: '#000052',
                border: 'none',
                padding: '11px 26px',
                borderRadius: '9999px',
                fontSize: '13.5px',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <span>Browse Verified Homes</span>
              <ArrowRight size={15} />
            </button>

            {!isRenter && (
              <button
                type="button"
                onClick={onPostListing}
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  color: '#FFFFFF',
                  border: '1px solid rgba(255, 255, 255, 0.25)',
                  padding: '11px 22px',
                  borderRadius: '9999px',
                  fontSize: '13.5px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                List a Property (Free)
              </button>
            )}
          </div>
        </div>

      </main>
    </div>
  );
};
