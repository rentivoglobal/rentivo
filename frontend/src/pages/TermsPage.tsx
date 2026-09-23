import React from 'react';
import { ShieldCheck, Scale, ArrowLeft, CheckCircle2 } from 'lucide-react';

interface TermsPageProps {
  onBack: () => void;
  onNavigateToTab?: (tab: any) => void;
}

export const TermsPage: React.FC<TermsPageProps> = ({ onBack, onNavigateToTab }) => {
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
            <Scale size={15} color="#000052" />
            <span style={{ fontWeight: 600 }}>Legal & Regulatory Framework</span>
          </div>
        </div>
      </div>

      {/* Hero Header */}
      <div style={{ backgroundColor: '#000052', color: '#FFFFFF', padding: '48px 20px 40px', textAlign: 'center' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', backgroundColor: 'rgba(190, 137, 255, 0.15)', border: '1px solid rgba(190, 137, 255, 0.3)', padding: '4px 14px', borderRadius: '999px', fontSize: '12px', fontWeight: 700, color: '#BE89FF', marginBottom: '16px' }}>
            <ShieldCheck size={14} />
            <span>Rentivo Platform Agreement</span>
          </div>
          <h1 style={{ fontSize: '32px', fontWeight: 800, margin: '0 0 12px', letterSpacing: '-0.02em', lineHeight: 1.2, color: '#FFFFFF' }}>
            Terms of Service
          </h1>
          <p style={{ fontSize: '15px', color: 'rgba(255, 255, 255, 0.8)', margin: '0 auto', maxWidth: '620px', lineHeight: 1.6 }}>
            Effective Date: September 2026. These Terms govern your access to the Rentivo verified property marketplace in Ibadan, Oyo State, Nigeria.
          </p>
        </div>
      </div>

      {/* Content Container */}
      <div style={{ maxWidth: '840px', margin: '-24px auto 0', padding: '0 20px' }}>
        <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', border: '1px solid #E2E8F0', padding: '36px 32px', boxShadow: '0 4px 20px rgba(0, 0, 82, 0.04)' }}>
          
          {/* Section 1 */}
          <div style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#000052', marginBottom: '10px' }}>
              1. Platform Nature & Scope
            </h2>
            <p style={{ fontSize: '14px', color: '#475569', lineHeight: 1.7, margin: '0 0 12px' }}>
              Rentivo Technologies Ltd. operates a technology platform connecting prospective residential and commercial tenants with verified landlords and mandated agents across Ibadan, Nigeria. Rentivo is not a real estate brokerage or legal property manager. Our service strictly facilitates property discovery, on-site verification audits, vacancy confirmation, and direct landlord connections.
            </p>
          </div>

          {/* Section 2 */}
          <div style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#000052', marginBottom: '10px' }}>
              2. The Direct Access Fee
            </h2>
            <p style={{ fontSize: '14px', color: '#475569', lineHeight: 1.7, margin: '0 0 12px' }}>
              Rentivo charges a flat, one-time direct access fee per confirmed property. This fee is:
            </p>
            <ul style={{ fontSize: '14px', color: '#475569', lineHeight: 1.7, margin: '0 0 12px', paddingLeft: '20px' }}>
              <li><strong>Zero Upfront Cost:</strong> It is 100% free to browse listings and submit access requests. You will never be asked to pay before availability is verified.</li>
              <li><strong>Post-Confirmation Only:</strong> The fee is payable strictly after the property owner has confirmed the property is currently vacant and ready for physical inspection.</li>
              <li><strong>Direct Contact Access:</strong> Payment unlocks the landlord's direct phone number, WhatsApp link, physical landmark address, and delivers a duplicate dossier to your email.</li>
              <li><strong>Not a Tenancy Deposit:</strong> The access fee covers information verification and platform connection. It does not constitute annual rent, caution deposit, or a guarantee of tenancy approval.</li>
            </ul>
          </div>

          {/* Section 3 */}
          <div style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#000052', marginBottom: '10px' }}>
              3. Landlord & Lister Obligations
            </h2>
            <p style={{ fontSize: '14px', color: '#475569', lineHeight: 1.7, margin: '0 0 12px' }}>
              Every property owner or mandated agent listing properties on Rentivo warrants that:
            </p>
            <ul style={{ fontSize: '14px', color: '#475569', lineHeight: 1.7, margin: '0 0 12px', paddingLeft: '20px' }}>
              <li>They hold authentic ownership title or a legally executed letting mandate for the property.</li>
              <li>All photos submitted are genuine, recent, and taken directly on-site at the stated location.</li>
              <li>All advertised rental prices, caution deposits, and service charges represent the true, final figures without undisclosed middleman markups.</li>
              <li>They will respond accurately to tenant availability inquiries via email within the platform's operational SLA.</li>
            </ul>
          </div>

          {/* Section 4 */}
          <div style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#000052', marginBottom: '10px' }}>
              4. 100% Refund & Tenant Protection Guarantee
            </h2>
            <div style={{ backgroundColor: '#ECFDF5', border: '1.5px solid #A7F3D0', borderRadius: '12px', padding: '16px 20px', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#047857', fontWeight: 800, fontSize: '14px', marginBottom: '4px' }}>
                <CheckCircle2 size={16} />
                <span>Verified Refund Commitment</span>
              </div>
              <p style={{ fontSize: '13.5px', color: '#065F46', lineHeight: 1.6, margin: 0 }}>
                If you pay the access fee and discover within 24 hours that the landlord is completely unreachable or the property was already leased prior to confirmation, Rentivo will issue a full 100% refund or provide an immediate free replacement credit.
              </p>
            </div>
          </div>

          {/* Section 5 */}
          <div style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#000052', marginBottom: '10px' }}>
              5. Physical Inspection Disclaimer
            </h2>
            <p style={{ fontSize: '14px', color: '#475569', lineHeight: 1.7, margin: '0 0 12px' }}>
              Properties bearing the green <strong>Verified</strong> badge have been physically visited by Rentivo field inspectors in Ibadan to verify location, title mandate, and photo authenticity on the stated inspection date. Renters are advised to conduct their own personal physical walkthrough in daylight before paying annual rent to the landlord.
            </p>
          </div>

          {/* Section 6 */}
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#000052', marginBottom: '10px' }}>
              6. Governing Law & Dispute Resolution
            </h2>
            <p style={{ fontSize: '14px', color: '#475569', lineHeight: 1.7, margin: '0 0 12px' }}>
              These Terms are governed by and construed in accordance with the laws of the Federal Republic of Nigeria and Oyo State. Any disputes arising from platform access shall be resolved through binding mediation in Ibadan, Nigeria.
            </p>
          </div>

          {/* Cross Links */}
          <div style={{ marginTop: '36px', paddingTop: '24px', borderTop: '1px solid #E2E8F0', display: 'flex', flexWrap: 'wrap', gap: '16px', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: '13px', color: '#64748B' }}>
              Questions regarding these Terms? Contact legal@rentivo.ng
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              {onNavigateToTab && (
                <>
                  <button 
                    onClick={() => onNavigateToTab('privacy')} 
                    style={{ background: 'none', border: 'none', color: '#000052', fontWeight: 700, fontSize: '13px', cursor: 'pointer', textDecoration: 'underline' }}
                  >
                    Privacy Policy
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
