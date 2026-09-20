import React from 'react';
import { 
  Building, 
  Camera, 
  CheckCircle2, 
  ShieldCheck, 
  ArrowRight, 
  Phone, 
  Coins, 
  MapPin
} from 'lucide-react';
import { User } from '../types';

interface ListPropertyLandingPageProps {
  currentUser: User | null;
  onStartListing: () => void;
  onSignIn: () => void;
  onBrowseMarketplace: () => void;
}

export const ListPropertyLandingPage: React.FC<ListPropertyLandingPageProps> = ({
  currentUser,
  onStartListing,
  onSignIn,
  onBrowseMarketplace
}) => {
  const isLister = currentUser?.role === 'landlord' || currentUser?.role === 'agent';

  return (
    <div style={{ backgroundColor: '#FAFAFD', minHeight: '100vh', color: '#000052' }}>
      
      {/* -------------------------------------------------------------
          HERO SECTION (Clear, Calm, Single Primary Action)
         ------------------------------------------------------------- */}
      <section style={{
        background: 'linear-gradient(180deg, #FFFFFF 0%, #F5F0FF 100%)',
        borderBottom: '1px solid #EAE6F4',
        padding: '60px 20px 70px',
        textAlign: 'center'
      }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          
          {/* Eyebrow */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: '#EDE5FC',
            color: '#5B14B8',
            borderRadius: '9999px',
            padding: '6px 16px',
            fontSize: '12.5px',
            fontWeight: 800,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            marginBottom: '20px'
          }}>
            <Building size={14} color="#5B14B8" />
            <span>For property owners</span>
          </div>

          {/* Heading */}
          <h1 style={{
            fontSize: 'clamp(28px, 5vw, 46px)',
            fontWeight: 800,
            lineHeight: 1.15,
            color: '#000052',
            margin: '0 0 16px',
            letterSpacing: '-0.02em'
          }}>
            Put your property on Rentivo
          </h1>

          {/* Subheading */}
          <p style={{
            fontSize: 'clamp(15px, 2.5vw, 18px)',
            lineHeight: 1.6,
            color: '#475569',
            margin: '0 auto 32px',
            maxWidth: '620px'
          }}>
            Show your property to people looking for a place in Ibadan. Start with the details you know. You can save and come back anytime.
          </p>

          {/* Primary Action Button & Secondary Link */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexWrap: 'wrap',
            gap: '16px',
            marginBottom: '28px'
          }}>
            <button
              type="button"
              onClick={onStartListing}
              style={{
                backgroundColor: '#000052',
                color: '#FFFFFF',
                border: 'none',
                padding: '14px 32px',
                borderRadius: '9999px',
                fontSize: '15px',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '10px',
                boxShadow: '0 8px 24px rgba(0, 0, 82, 0.2)',
                transition: 'transform 0.15s ease'
              }}
            >
              <span>{isLister ? 'Open My Properties' : 'Start listing'}</span>
              <ArrowRight size={16} />
            </button>

            {!currentUser && (
              <button
                type="button"
                onClick={onSignIn}
                style={{
                  backgroundColor: '#FFFFFF',
                  color: '#000052',
                  border: '1.5px solid #CBD5E1',
                  padding: '13px 26px',
                  borderRadius: '9999px',
                  fontSize: '14.5px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                I already have an account
              </button>
            )}
          </div>

          {/* 3 Core Trust Badges */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexWrap: 'wrap',
            gap: '24px',
            fontSize: '13px',
            fontWeight: 700,
            color: '#334155'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <CheckCircle2 size={16} color="#16794A" />
              <span>100% Free listing</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <CheckCircle2 size={16} color="#16794A" />
              <span>Zero agency cuts from your rent</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <CheckCircle2 size={16} color="#16794A" />
              <span>Direct verified tenants</span>
            </div>
          </div>

        </div>
      </section>

      {/* -------------------------------------------------------------
          THREE SIMPLE STEPS (How it Works)
         ------------------------------------------------------------- */}
      <section style={{ maxWidth: '960px', margin: '0 auto', padding: '60px 20px' }}>
        <div style={{ textAlign: 'center', marginBottom: '44px' }}>
          <span style={{ fontSize: '12px', fontWeight: 800, color: '#7E22CE', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Simple 3-Step Process
          </span>
          <h2 style={{ fontSize: '28px', fontWeight: 800, color: '#000052', margin: '8px 0 0' }}>
            How putting your property on Rentivo works
          </h2>
          <p style={{ fontSize: '14.5px', color: '#64748B', marginTop: '8px' }}>
            No complicated real estate jargon. You can do the whole thing on your phone in 5 minutes.
          </p>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '24px'
        }}>
          {/* Step 1 */}
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '16px',
            padding: '28px 24px',
            border: '1.5px solid #E2E8F0',
            boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              backgroundColor: '#EDE5FC',
              color: '#5B14B8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '18px',
              fontWeight: 800,
              marginBottom: '18px'
            }}>
              1
            </div>
            <h3 style={{ fontSize: '17px', fontWeight: 800, color: '#000052', margin: '0 0 10px' }}>
              Tell us about the property
            </h3>
            <p style={{ fontSize: '13.5px', color: '#475569', lineHeight: 1.6, margin: 0 }}>
              What type of home or shop is it? Which area in Ibadan (Bodija, Akobo, Ring Road, Samonda)? How much is the rent per year?
            </p>
          </div>

          {/* Step 2 */}
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '16px',
            padding: '28px 24px',
            border: '1.5px solid #E2E8F0',
            boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              backgroundColor: '#EDE5FC',
              color: '#5B14B8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '18px',
              fontWeight: 800,
              marginBottom: '18px'
            }}>
              2
            </div>
            <h3 style={{ fontSize: '17px', fontWeight: 800, color: '#000052', margin: '0 0 10px' }}>
              Add clear pictures
            </h3>
            <p style={{ fontSize: '13.5px', color: '#475569', lineHeight: 1.6, margin: 0 }}>
              Use pictures you took yourself with your phone. Show the outside compound, rooms, kitchen, and bathroom. Take them in daylight if you can.
            </p>
          </div>

          {/* Step 3 */}
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '16px',
            padding: '28px 24px',
            border: '1.5px solid #E2E8F0',
            boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              backgroundColor: '#ECFDF5',
              color: '#065F46',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '18px',
              fontWeight: 800,
              marginBottom: '18px'
            }}>
              3
            </div>
            <h3 style={{ fontSize: '17px', fontWeight: 800, color: '#000052', margin: '0 0 10px' }}>
              Send it for review
            </h3>
            <p style={{ fontSize: '13.5px', color: '#475569', lineHeight: 1.6, margin: 0 }}>
              Our Ibadan team checks the details for free so tenants trust your property. Once live, interested seekers contact you directly.
            </p>
          </div>
        </div>

        {/* Reassurance Banner */}
        <div style={{
          marginTop: '28px',
          backgroundColor: '#EFF6FF',
          border: '1px solid #BFDBFE',
          borderRadius: '14px',
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          fontSize: '13.5px',
          color: '#1E3A8A'
        }}>
          <ShieldCheck size={20} color="#2563EB" style={{ flexShrink: 0 }} />
          <span>
            <strong>Our guarantee to property owners:</strong> We will tell you clearly if anything needs to be changed before publishing. You are never left in the dark.
          </span>
        </div>
      </section>

      {/* -------------------------------------------------------------
          WHAT WILL I NEED? (Checklist to Remove Cognitive Load)
         ------------------------------------------------------------- */}
      <section style={{
        backgroundColor: '#FFFFFF',
        borderTop: '1px solid #E2E8F0',
        borderBottom: '1px solid #E2E8F0',
        padding: '60px 20px'
      }}>
        <div style={{ maxWidth: '860px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '36px' }}>
            <span style={{ fontSize: '12px', fontWeight: 800, color: '#5B14B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Quick Preparation
            </span>
            <h2 style={{ fontSize: '26px', fontWeight: 800, color: '#000052', margin: '8px 0 0' }}>
              What will you need to list your property?
            </h2>
            <p style={{ fontSize: '14.5px', color: '#64748B', marginTop: '6px' }}>
              You don&rsquo;t need any lawyer or complex documents to get started. Just simple facts you already know.
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '20px'
          }}>
            <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: '#EDE5FC', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <MapPin size={18} color="#5B14B8" />
              </div>
              <div>
                <h4 style={{ margin: '0 0 4px', fontSize: '15px', fontWeight: 800, color: '#000052' }}>Location &amp; Landmark</h4>
                <p style={{ margin: 0, fontSize: '13px', color: '#64748B', lineHeight: 1.5 }}>
                  The area (e.g. Bodija, Jericho, Akobo) and a recognizable landmark nearby.
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: '#EDE5FC', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Coins size={18} color="#5B14B8" />
              </div>
              <div>
                <h4 style={{ margin: '0 0 4px', fontSize: '15px', fontWeight: 800, color: '#000052' }}>Rent Price in Naira</h4>
                <p style={{ margin: 0, fontSize: '13px', color: '#64748B', lineHeight: 1.5 }}>
                  The full asking rent amount per year (e.g. ₦350,000 or ₦800,000).
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: '#EDE5FC', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Camera size={18} color="#5B14B8" />
              </div>
              <div>
                <h4 style={{ margin: '0 0 4px', fontSize: '15px', fontWeight: 800, color: '#000052' }}>At Least 3 Clear Photos</h4>
                <p style={{ margin: 0, fontSize: '13px', color: '#64748B', lineHeight: 1.5 }}>
                  Snap the compound gate, sitting room, bedroom, and kitchen using your phone.
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: '#EDE5FC', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Phone size={18} color="#5B14B8" />
              </div>
              <div>
                <h4 style={{ margin: '0 0 4px', fontSize: '15px', fontWeight: 800, color: '#000052' }}>Nigerian Phone Number</h4>
                <p style={{ margin: 0, fontSize: '13px', color: '#64748B', lineHeight: 1.5 }}>
                  A phone number you can receive calls or WhatsApp messages on.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* -------------------------------------------------------------
          WHY RENTIVO VS TRADITIONAL AGENTS
         ------------------------------------------------------------- */}
      <section style={{ maxWidth: '860px', margin: '0 auto', padding: '60px 20px' }}>
        <div style={{ textAlign: 'center', marginBottom: '36px' }}>
          <span style={{ fontSize: '12px', fontWeight: 800, color: '#16794A', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Fairer For Everyone
          </span>
          <h2 style={{ fontSize: '26px', fontWeight: 800, color: '#000052', margin: '8px 0 0' }}>
            Why Ibadan property owners choose Rentivo
          </h2>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '20px'
        }}>
          <div style={{ backgroundColor: '#FFFFFF', padding: '24px', borderRadius: '14px', border: '1px solid #E2E8F0' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#000052', margin: '0 0 8px' }}>
              Zero agency cuts from your rent
            </h3>
            <p style={{ fontSize: '13px', color: '#64748B', lineHeight: 1.6, margin: 0 }}>
              Traditional roadside agents often add huge markup percentages, making your property stay vacant for months. On Rentivo, you keep 100% of your agreed rent.
            </p>
          </div>

          <div style={{ backgroundColor: '#FFFFFF', padding: '24px', borderRadius: '14px', border: '1px solid #E2E8F0' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#000052', margin: '0 0 8px' }}>
              Pre-screened seekers only
            </h3>
            <p style={{ fontSize: '13px', color: '#64748B', lineHeight: 1.6, margin: 0 }}>
              No time-wasters. Renters on Rentivo commit to structured viewing appointments, so only serious prospects reach your phone.
            </p>
          </div>

          <div style={{ backgroundColor: '#FFFFFF', padding: '24px', borderRadius: '14px', border: '1px solid #E2E8F0' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#000052', margin: '0 0 8px' }}>
              Free in-person inspection badge
            </h3>
            <p style={{ fontSize: '13px', color: '#64748B', lineHeight: 1.6, margin: 0 }}>
              Rentivo verification officers in Ibadan can visit your building for free, verify the compound, and award a Verified Badge that rents out homes 3x faster.
            </p>
          </div>
        </div>
      </section>

      {/* -------------------------------------------------------------
          FREQUENT QUESTIONS (Plain, direct Nigerian language)
         ------------------------------------------------------------- */}
      <section style={{
        backgroundColor: '#FFFFFF',
        borderTop: '1px solid #E2E8F0',
        padding: '60px 20px'
      }}>
        <div style={{ maxWidth: '780px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '36px' }}>
            <span style={{ fontSize: '12px', fontWeight: 800, color: '#5B14B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Questions &amp; Answers
            </span>
            <h2 style={{ fontSize: '26px', fontWeight: 800, color: '#000052', margin: '8px 0 0' }}>
              Frequently asked questions
            </h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ border: '1px solid #E2E8F0', borderRadius: '12px', padding: '18px 20px', backgroundColor: '#FAFAFD' }}>
              <h4 style={{ margin: '0 0 6px', fontSize: '15px', fontWeight: 800, color: '#000052' }}>
                Can I list if I am an agent or caretaker helping an owner?
              </h4>
              <p style={{ margin: 0, fontSize: '13.5px', color: '#475569', lineHeight: 1.5 }}>
                Yes. During the listing step, choose &ldquo;I am helping the owner&rdquo;. You just need to have the property owner&rsquo;s permission to list it.
              </p>
            </div>

            <div style={{ border: '1px solid #E2E8F0', borderRadius: '12px', padding: '18px 20px', backgroundColor: '#FAFAFD' }}>
              <h4 style={{ margin: '0 0 6px', fontSize: '15px', fontWeight: 800, color: '#000052' }}>
                Can I save my work and come back later?
              </h4>
              <p style={{ margin: 0, fontSize: '13.5px', color: '#475569', lineHeight: 1.5 }}>
                Yes. If you don&rsquo;t have all your photos or details right now, tap &ldquo;Save and exit&rdquo;. Your property will be saved in your drafts.
              </p>
            </div>

            <div style={{ border: '1px solid #E2E8F0', borderRadius: '12px', padding: '18px 20px', backgroundColor: '#FAFAFD' }}>
              <h4 style={{ margin: '0 0 6px', fontSize: '15px', fontWeight: 800, color: '#000052' }}>
                Who can see my phone number and address?
              </h4>
              <p style={{ margin: 0, fontSize: '13.5px', color: '#475569', lineHeight: 1.5 }}>
                We never show your full address or phone number openly to random website visitors. They are only provided to verified renters after availability is confirmed.
              </p>
            </div>

            <div style={{ border: '1px solid #E2E8F0', borderRadius: '12px', padding: '18px 20px', backgroundColor: '#FAFAFD' }}>
              <h4 style={{ margin: '0 0 6px', fontSize: '15px', fontWeight: 800, color: '#000052' }}>
                What happens after I send the property for review?
              </h4>
              <p style={{ margin: 0, fontSize: '13.5px', color: '#475569', lineHeight: 1.5 }}>
                Our team reviews your pictures and details. If everything is clear, your property goes live. If anything needs adjustment, we will show you plain instructions in your account.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* -------------------------------------------------------------
          BOTTOM CALL TO ACTION
         ------------------------------------------------------------- */}
      <section style={{
        backgroundColor: '#000052',
        color: '#FFFFFF',
        padding: '60px 20px',
        textAlign: 'center'
      }}>
        <div style={{ maxWidth: '640px', margin: '0 auto' }}>
          <h2 style={{ fontSize: 'clamp(24px, 4vw, 36px)', fontWeight: 800, margin: '0 0 14px', letterSpacing: '-0.02em' }}>
            Put your property on Rentivo today
          </h2>
          <p style={{ fontSize: '15px', color: 'rgba(255, 255, 255, 0.8)', margin: '0 auto 28px', lineHeight: 1.6 }}>
            Free listing, zero agency commissions, and direct verified tenant leads in Ibadan.
          </p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', gap: '14px' }}>
            <button
              type="button"
              onClick={onStartListing}
              style={{
                backgroundColor: '#BE89FF',
                color: '#000052',
                border: 'none',
                padding: '14px 34px',
                borderRadius: '9999px',
                fontSize: '15px',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <span>{isLister ? 'Open My Properties' : 'Start listing now'}</span>
              <ArrowRight size={16} />
            </button>
            <button
              type="button"
              onClick={onBrowseMarketplace}
              style={{
                backgroundColor: 'transparent',
                color: '#FFFFFF',
                border: '1.5px solid rgba(255, 255, 255, 0.3)',
                padding: '13px 24px',
                borderRadius: '9999px',
                fontSize: '14.5px',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              Browse current listings
            </button>
          </div>
        </div>
      </section>

    </div>
  );
};
