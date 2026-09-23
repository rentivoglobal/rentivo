import React from 'react';
import { ShieldCheck, Lock, ArrowLeft, EyeOff, FileText, CheckCircle2 } from 'lucide-react';

interface PrivacyPageProps {
  onBack: () => void;
  onNavigateToTab?: (tab: any) => void;
}

export const PrivacyPage: React.FC<PrivacyPageProps> = ({ onBack, onNavigateToTab }) => {
  return (
    <div style={{ backgroundColor: '#F8FAFC', minHeight: '100vh', paddingBottom: '80px' }}>
      {/* Top Header Navigation */}
      <div style={{ backgroundColor: '#FFFFFF', borderBottom: '1px solid #E2E8F0', padding: '16px 0', position: 'sticky', top: 0, zIndex: 20 }}>
        <div style={{ maxWidth: '960px', margin: '0 auto', padding: '0 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button 
            onClick={onBack}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '13.5px', fontWeight: 700, color: '#000052', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            <ArrowLeft size={16} />
            <span>Back</span>
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#64748B' }}>
            <Lock size={15} color="#000052" />
            <span style={{ fontWeight: 600 }}>NDPR Data Protection</span>
          </div>
        </div>
      </div>

      {/* Hero Header */}
      <div style={{ backgroundColor: '#000052', color: '#FFFFFF', padding: '48px 20px 40px', textAlign: 'center' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', backgroundColor: 'rgba(190, 137, 255, 0.15)', border: '1px solid rgba(190, 137, 255, 0.3)', padding: '4px 14px', borderRadius: '999px', fontSize: '12px', fontWeight: 700, color: '#BE89FF', marginBottom: '16px' }}>
            <ShieldCheck size={14} />
            <span>NDPR &amp; Consumer Privacy Compliant</span>
          </div>
          <h1 style={{ fontSize: '32px', fontWeight: 800, margin: '0 0 12px', letterSpacing: '-0.02em', lineHeight: 1.2, color: '#FFFFFF' }}>
            Privacy Policy &amp; Data Protection
          </h1>
          <p style={{ fontSize: '15px', color: 'rgba(255, 255, 255, 0.8)', margin: '0 auto', maxWidth: '620px', lineHeight: 1.6 }}>
            How Rentivo protects tenant and landlord personal information in compliance with the Nigeria Data Protection Act (NDPA) and NDPR.
          </p>
        </div>
      </div>

      {/* Content Container */}
      <div style={{ maxWidth: '840px', margin: '-24px auto 0', padding: '0 20px' }}>
        <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', border: '1px solid #E2E8F0', padding: '36px 32px', boxShadow: '0 4px 20px rgba(0, 0, 82, 0.04)' }}>

          {/* Section 1 */}
          <div style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#000052', marginBottom: '10px' }}>
              1. Information We Collect
            </h2>
            <p style={{ fontSize: '14px', color: '#475569', lineHeight: 1.7, margin: '0 0 12px' }}>
              We collect information necessary to facilitate verified property connections:
            </p>
            <ul style={{ fontSize: '14px', color: '#475569', lineHeight: 1.7, margin: '0 0 12px', paddingLeft: '20px' }}>
              <li><strong>Renters / Seekers:</strong> Full name, WhatsApp phone number, email address, move-in preferences, and payment verification records via Paystack.</li>
              <li><strong>Landlords / Mandated Agents:</strong> Full name, phone number, letting mandate proof, exact property address, and property photos.</li>
              <li><strong>Technical Data:</strong> IP address, device type, and session tokens to ensure platform security and prevent fraudulent access requests.</li>
            </ul>
          </div>

          {/* Section 2: Contact Masking */}
          <div style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#000052', marginBottom: '10px' }}>
              2. Strict Contact &amp; Address Masking Policy
            </h2>
            <div style={{ backgroundColor: '#F8F3FF', border: '1.5px solid #E6E3EE', borderRadius: '12px', padding: '18px 20px', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#000052', fontWeight: 800, fontSize: '14px', marginBottom: '6px' }}>
                <EyeOff size={16} color="#7E22CE" />
                <span>Zero Public Contact Exposure</span>
              </div>
              <p style={{ fontSize: '13.5px', color: '#475569', lineHeight: 1.6, margin: 0 }}>
                To shield landlords from harassment by unstructured roadside agents and unsolicited sales calls, direct phone numbers, WhatsApp links, and exact street numbers are <strong>never displayed publicly</strong> on search or property pages. Contacts are unlocked strictly to confirmed renters after verification and payment of the direct access fee.
              </p>
            </div>
          </div>

          {/* Section 3: Payment Security */}
          <div style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#000052', marginBottom: '10px' }}>
              3. Payment Security &amp; Card Data Protection
            </h2>
            <p style={{ fontSize: '14px', color: '#475569', lineHeight: 1.7, margin: '0 0 12px' }}>
              Rentivo <strong>never stores credit or debit card numbers</strong>, CVVs, or bank PINs on our servers. All financial transactions are processed directly through <strong>Paystack</strong>, a PCI-DSS Level 1 certified payments gateway. Paystack processes payments using 256-bit SSL encryption. Rentivo only receives an encrypted transaction reference code (e.g. <code>pstk_ref_...</code>) confirming payment completion.
            </p>
          </div>

          {/* Section 4: Data Retention & Rights */}
          <div style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#000052', marginBottom: '10px' }}>
              4. Your NDPR Data Subject Rights
            </h2>
            <p style={{ fontSize: '14px', color: '#475569', lineHeight: 1.7, margin: '0 0 12px' }}>
              Under the Nigeria Data Protection Regulation (NDPR), you have the right to:
            </p>
            <ul style={{ fontSize: '14px', color: '#475569', lineHeight: 1.7, margin: '0 0 12px', paddingLeft: '20px' }}>
              <li>Access and receive a copy of your personal data held by Rentivo.</li>
              <li>Request correction or deletion of outdated contact or listing records.</li>
              <li>Withdraw consent for marketing communications or property alert digests.</li>
              <li>Request account closure and permanent removal of your contact information.</li>
            </ul>
          </div>

          {/* Section 5: Third-Party Processors */}
          <div style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#000052', marginBottom: '10px' }}>
              5. Trusted Technical Sub-Processors
            </h2>
            <p style={{ fontSize: '14px', color: '#475569', lineHeight: 1.7, margin: '0 0 12px' }}>
              Rentivo utilizes secure enterprise cloud primitives to provide our service:
            </p>
            <ul style={{ fontSize: '14px', color: '#475569', lineHeight: 1.7, margin: '0 0 12px', paddingLeft: '20px' }}>
              <li><strong>Supabase:</strong> Encrypted cloud database and identity authentication with Row Level Security (RLS).</li>
              <li><strong>ImageKit.io:</strong> High-performance media CDN for optimized listing photos.</li>
              <li><strong>Paystack Nigeria:</strong> Regulated payments processing and settlement gateway.</li>
              <li><strong>Resend / SMTP:</strong> Transactional email delivery for vacancy confirmations and receipts.</li>
            </ul>
          </div>

          {/* Contact Section */}
          <div style={{ marginTop: '36px', paddingTop: '24px', borderTop: '1px solid #E2E8F0', display: 'flex', flexWrap: 'wrap', gap: '16px', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: '13px', color: '#64748B' }}>
              Data Protection Officer Contact: privacy@rentivo.ng
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              {onNavigateToTab && (
                <>
                  <button 
                    onClick={() => onNavigateToTab('terms')} 
                    style={{ background: 'none', border: 'none', color: '#000052', fontWeight: 700, fontSize: '13px', cursor: 'pointer', textDecoration: 'underline' }}
                  >
                    Terms of Service
                  </button>
                  <span style={{ color: '#CBD5E1' }}>•</span>
                  <button 
                    onClick={() => onNavigateToTab('access_fee_terms')} 
                    style={{ background: 'none', border: 'none', color: '#000052', fontWeight: 700, fontSize: '13px', cursor: 'pointer', textDecoration: 'underline' }}
                  >
                    Access Fee Terms
                  </button>
                </>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
