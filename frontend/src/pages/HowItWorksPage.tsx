import React, { useState } from 'react';
import { 
  ShieldCheck, 
  CheckCircle2, 
  ArrowRight, 
  Sparkles, 
  Search, 
  Clock, 
  CreditCard, 
  PhoneCall, 
  Calculator, 
  HelpCircle, 
  Check, 
  AlertTriangle 
} from 'lucide-react';
import { formatNaira } from '../utils/formatters';

interface HowItWorksPageProps {
  onBrowseProperties: () => void;
  onPostListing: () => void;
}

export const HowItWorksPage: React.FC<HowItWorksPageProps> = ({
  onBrowseProperties,
  onPostListing
}) => {
  const [budget, setBudget] = useState<number>(1200000);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  // Traditional Nigerian real estate calculations
  const traditionalAgentFee = Math.round(budget * 0.10); // 10% agent commission
  const traditionalAgreementFee = Math.round(budget * 0.10); // 10% legal/agreement fee
  const traditionalViewingFees = 15000; // Roadside registration / viewing fee
  const traditionalTotal = traditionalAgentFee + traditionalAgreementFee + traditionalViewingFees;

  const rentivoFee = 5000; // Flat ₦5,000 access fee
  const netSavings = traditionalTotal - rentivoFee;

  const faqs = [
    {
      q: 'Why does Rentivo charge ₦5,000 instead of standard 10% agent fees?',
      a: 'Traditional agents charge up to 10% to 20% in agent and agreement packages because they act as expensive middlemen who hoard phone numbers. Rentivo uses technology and local field verification officers to aggregate genuine landlords into one trusted marketplace, charging only a flat ₦5,000 operational fee once availability is confirmed.'
    },
    {
      q: 'When do I pay the ₦5,000 fee?',
      a: 'Never upfront. Browsing and submitting access requests is free. We email the property owner a one-click YES / NO link. Only when they confirm the unit is vacant are you invited to pay ₦5,000 via Paystack.'
    },
    {
      q: 'What happens if the property is no longer available?',
      a: 'If the landlord informs us that the unit has been rented or is under negotiation, your request is closed and you are charged exactly ₦0. We will also recommend similar verified properties in the same neighborhood.'
    },
    {
      q: 'What does the green "Verified" badge mean?',
      a: 'A listing with the Verified badge has undergone a physical, on-site inspection in Ibadan by an official Rentivo field inspector. We verify that the building exists, photos are authentic, the address matches title documentation, and the lister has a genuine mandate.'
    },
    {
      q: 'Can landlords and agents list their properties for free?',
      a: 'Yes! Listing is 100% free for landlords and mandated agents. Rentivo provides verified trust badges, handles tenant inquiries, and connects you directly with serious renters who have verified their contact details.'
    }
  ];

  return (
    <div style={{ backgroundColor: '#F7F8FC', minHeight: '100vh', paddingBottom: '72px' }}>
      {/* Hero Header */}
      <div style={{ backgroundColor: '#000052', color: '#FFFFFF', padding: '64px 20px 72px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div 
          style={{
            position: 'absolute',
            top: '-80px',
            right: '-80px',
            width: '320px',
            height: '320px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(190,137,255,0.2) 0%, transparent 70%)',
            pointerEvents: 'none'
          }} 
        />
        <div style={{ maxWidth: '820px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', backgroundColor: 'rgba(190,137,255,0.18)', padding: '6px 14px', borderRadius: '999px', marginBottom: '16px' }}>
            <ShieldCheck size={15} color="#BE89FF" />
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#BE89FF', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              Transparent Rental Marketplace
            </span>
          </div>
          <h1 style={{ fontSize: '38px', fontWeight: 800, lineHeight: 1.2, margin: '0 0 16px', letterSpacing: '-0.02em', color: '#FFFFFF' }}>
            How Rentivo Eliminates Exploitative Agent Fees in Ibadan
          </h1>
          <p style={{ fontSize: '16px', color: '#DCD6F5', lineHeight: 1.6, maxWidth: '640px', margin: '0 auto 28px' }}>
            No roadside viewing fees. No 10% agent markups. Just verified rentals, confirmed vacancies, and a flat ₦5,000 fee payable only after landlord verification.
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button 
              onClick={onBrowseProperties}
              style={{
                backgroundColor: '#BE89FF',
                color: '#000052',
                border: 'none',
                padding: '13px 26px',
                borderRadius: '9999px',
                fontSize: '14px',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <span>Browse Verified Listings</span>
              <ArrowRight size={16} />
            </button>
            <button 
              onClick={onPostListing}
              style={{
                backgroundColor: 'rgba(255,255,255,0.12)',
                color: '#FFFFFF',
                border: '1px solid rgba(255,255,255,0.25)',
                padding: '13px 24px',
                borderRadius: '9999px',
                fontSize: '14px',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              List a Property (Free)
            </button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: '1040px', margin: '-32px auto 0', padding: '0 20px', position: 'relative', zIndex: 2 }}>
        
        {/* The 4-Step Process Grid */}
        <div style={{ backgroundColor: '#FFFFFF', borderRadius: '24px', padding: '36px 32px', boxShadow: '0 12px 36px rgba(0,0,82,0.06)', border: '1px solid #E6E3EE', marginBottom: '40px' }}>
          <div style={{ textAlign: 'center', marginBottom: '36px' }}>
            <span style={{ fontSize: '11.5px', fontWeight: 800, color: '#636377', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              The 4-Step Process
            </span>
            <h2 style={{ fontSize: '26px', fontWeight: 800, color: '#000052', margin: '6px 0 0' }}>
              Simple, Safe & Transparent
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '24px' }}>
            {/* Step 1 */}
            <div style={{ border: '1px solid #F1F5F9', borderRadius: '16px', padding: '24px', backgroundColor: '#FAFAFC' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '12px', backgroundColor: '#F0E6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000052', marginBottom: '16px', fontWeight: 800, fontSize: '16px' }}>
                01
              </div>
              <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#000052', margin: '0 0 8px' }}>
                Browse & Filter Free
              </h3>
              <p style={{ fontSize: '13.5px', color: '#636377', lineHeight: 1.55, margin: 0 }}>
                Explore residential flats and commercial spaces across Bodija, Akobo, Jericho, and Ring Road with high-res photos and transparent pricing.
              </p>
            </div>

            {/* Step 2 */}
            <div style={{ border: '1px solid #F1F5F9', borderRadius: '16px', padding: '24px', backgroundColor: '#FAFAFC' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '12px', backgroundColor: '#F0E6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000052', marginBottom: '16px', fontWeight: 800, fontSize: '16px' }}>
                02
              </div>
              <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#000052', margin: '0 0 8px' }}>
                Request Access at ₦0
              </h3>
              <p style={{ fontSize: '13.5px', color: '#636377', lineHeight: 1.55, margin: 0 }}>
                Found a place you like? Click "Request Access". We never ask for payment or bank cards at this stage. It is 100% free to check.
              </p>
            </div>

            {/* Step 3 */}
            <div style={{ border: '1px solid #F1F5F9', borderRadius: '16px', padding: '24px', backgroundColor: '#FAFAFC' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '12px', backgroundColor: '#F0E6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000052', marginBottom: '16px', fontWeight: 800, fontSize: '16px' }}>
                03
              </div>
              <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#000052', margin: '0 0 8px' }}>
                Landlord Confirms Vacancy
              </h3>
              <p style={{ fontSize: '13.5px', color: '#636377', lineHeight: 1.55, margin: 0 }}>
                We email the property owner a one-click confirmation. If the property is taken, you pay nothing. If confirmed, you are notified to unlock contact.
              </p>
            </div>

            {/* Step 4 */}
            <div style={{ border: '1px solid #E6E3EE', borderRadius: '16px', padding: '24px', backgroundColor: '#F8F3FF' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '12px', backgroundColor: '#000052', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#BE89FF', marginBottom: '16px', fontWeight: 800, fontSize: '16px' }}>
                04
              </div>
              <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#000052', margin: '0 0 8px' }}>
                Flat ₦5,000 Unlock
              </h3>
              <p style={{ fontSize: '13.5px', color: '#636377', lineHeight: 1.55, margin: 0 }}>
                Pay the flat ₦5,000 access fee via secure Paystack channels. Immediately receive the landlord's verified phone, WhatsApp chat, and physical address.
              </p>
            </div>
          </div>
        </div>

        {/* Interactive Savings Calculator */}
        <div style={{ backgroundColor: '#FFFFFF', borderRadius: '24px', padding: '36px 32px', boxShadow: '0 12px 36px rgba(0,0,82,0.06)', border: '1px solid #E6E3EE', marginBottom: '40px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <Calculator size={20} color="#000052" />
            <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#000052', margin: 0 }}>
              Agent Fee Savings Calculator
            </h2>
          </div>
          <p style={{ fontSize: '14px', color: '#636377', margin: '0 0 24px' }}>
            See exactly how much money you save by choosing Rentivo instead of traditional roadside agency packages.
          </p>

          <div style={{ marginBottom: '28px' }}>
            <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#000052', marginBottom: '8px' }}>
              Annual Rental Budget: <span style={{ fontSize: '18px', fontWeight: 800, color: '#000052' }}>{formatNaira(budget)}</span>
            </label>
            <input 
              type="range" 
              min={300000} 
              max={6000000} 
              step={50000}
              value={budget}
              onChange={(e) => setBudget(Number(e.target.value))}
              style={{ width: '100%', accentColor: '#000052', cursor: 'pointer' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#94A3B8', marginTop: '6px' }}>
              <span>₦300,000 (Self-contain)</span>
              <span>₦1,500,000 (2-Bed Flat)</span>
              <span>₦3,000,000 (Duplex)</span>
              <span>₦6,000,000 (Commercial/Executive)</span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
            {/* Traditional Breakdown */}
            <div style={{ border: '1px solid #FCA5A5', backgroundColor: '#FFF5F5', borderRadius: '16px', padding: '20px' }}>
              <div style={{ fontSize: '11.5px', fontWeight: 800, color: '#B91C1C', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '12px' }}>
                Traditional Agency Costs
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px', color: '#334155' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>10% Agent Commission:</span>
                  <strong>{formatNaira(traditionalAgentFee)}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>10% Legal / Agreement:</span>
                  <strong>{formatNaira(traditionalAgreementFee)}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Viewing / Registration:</span>
                  <strong>{formatNaira(traditionalViewingFees)}</strong>
                </div>
                <div style={{ height: '1px', backgroundColor: '#FECACA', margin: '4px 0' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px', color: '#B91C1C', fontWeight: 800 }}>
                  <span>Total Agency Extra:</span>
                  <span>{formatNaira(traditionalTotal)}</span>
                </div>
              </div>
            </div>

            {/* Rentivo Breakdown */}
            <div style={{ border: '2px solid #047857', backgroundColor: '#F0FDF4', borderRadius: '16px', padding: '20px', position: 'relative' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <span style={{ fontSize: '11.5px', fontWeight: 800, color: '#047857', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Rentivo Flat Model
                </span>
                <span style={{ fontSize: '11px', fontWeight: 800, backgroundColor: '#047857', color: '#FFFFFF', padding: '2px 8px', borderRadius: '12px' }}>
                  SAVE 98%
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px', color: '#065F46' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Browsing & Vacancy Check:</span>
                  <strong style={{ color: '#047857' }}>₦0 (Free)</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Physical Verification Audit:</span>
                  <strong style={{ color: '#047857' }}>Included</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Paystack Contact Unlock Fee:</span>
                  <strong>{formatNaira(rentivoFee)}</strong>
                </div>
                <div style={{ height: '1px', backgroundColor: '#A7F3D0', margin: '4px 0' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '18px', color: '#047857', fontWeight: 800 }}>
                  <span>You Save:</span>
                  <span>{formatNaira(netSavings)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 4-Point Physical Verification Standard */}
        <div style={{ backgroundColor: '#FFFFFF', borderRadius: '24px', padding: '36px 32px', boxShadow: '0 12px 36px rgba(0,0,82,0.06)', border: '1px solid #E6E3EE', marginBottom: '40px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <ShieldCheck size={22} color="#16794A" />
            <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#000052', margin: 0 }}>
              The Rentivo Ibadan Verification Standard
            </h2>
          </div>
          <p style={{ fontSize: '14px', color: '#636377', margin: '0 0 24px', lineHeight: 1.6 }}>
            Every listing carrying the green Verified badge has passed our mandatory four-point inspection by local Ibadan agents.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
              <div style={{ backgroundColor: '#DCFCE7', borderRadius: '50%', padding: '6px', color: '#16794A', flexShrink: 0 }}>
                <Check size={16} />
              </div>
              <div>
                <strong style={{ fontSize: '14px', color: '#000052', display: 'block', marginBottom: '4px' }}>Physical On-Site Visit</strong>
                <span style={{ fontSize: '12.5px', color: '#636377', lineHeight: 1.4 }}>An inspector visits the property in Bodija, Akobo, Ring Road, etc.</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
              <div style={{ backgroundColor: '#DCFCE7', borderRadius: '50%', padding: '6px', color: '#16794A', flexShrink: 0 }}>
                <Check size={16} />
              </div>
              <div>
                <strong style={{ fontSize: '14px', color: '#000052', display: 'block', marginBottom: '4px' }}>Address & Title Audit</strong>
                <span style={{ fontSize: '12.5px', color: '#636377', lineHeight: 1.4 }}>Verification that the physical compound matches documentation.</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
              <div style={{ backgroundColor: '#DCFCE7', borderRadius: '50%', padding: '6px', color: '#16794A', flexShrink: 0 }}>
                <Check size={16} />
              </div>
              <div>
                <strong style={{ fontSize: '14px', color: '#000052', display: 'block', marginBottom: '4px' }}>Lister Mandate Check</strong>
                <span style={{ fontSize: '12.5px', color: '#636377', lineHeight: 1.4 }}>Confirmed ownership or legal mandate from the property owner.</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
              <div style={{ backgroundColor: '#DCFCE7', borderRadius: '50%', padding: '6px', color: '#16794A', flexShrink: 0 }}>
                <Check size={16} />
              </div>
              <div>
                <strong style={{ fontSize: '14px', color: '#000052', display: 'block', marginBottom: '4px' }}>Genuine Photography</strong>
                <span style={{ fontSize: '12.5px', color: '#636377', lineHeight: 1.4 }}>All photos verified authentic, un-distorted, and current.</span>
              </div>
            </div>
          </div>
        </div>

        {/* FAQs */}
        <div style={{ backgroundColor: '#FFFFFF', borderRadius: '24px', padding: '36px 32px', boxShadow: '0 12px 36px rgba(0,0,82,0.06)', border: '1px solid #E6E3EE' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
            <HelpCircle size={20} color="#000052" />
            <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#000052', margin: 0 }}>
              Frequently Asked Questions
            </h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {faqs.map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div 
                  key={idx}
                  style={{
                    border: '1px solid #E6E3EE',
                    borderRadius: '14px',
                    overflow: 'hidden',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      padding: '16px 20px',
                      backgroundColor: isOpen ? '#F8F3FF' : '#FFFFFF',
                      border: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      fontSize: '14.5px',
                      fontWeight: 700,
                      color: '#000052'
                    }}
                  >
                    <span>{faq.q}</span>
                    <span style={{ fontSize: '18px', fontWeight: 400, color: '#636377' }}>
                      {isOpen ? '−' : '+'}
                    </span>
                  </button>
                  {isOpen && (
                    <div style={{ padding: '16px 20px', fontSize: '13.5px', color: '#4B5563', lineHeight: 1.6, backgroundColor: '#FFFFFF', borderTop: '1px solid #E6E3EE' }}>
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
};
