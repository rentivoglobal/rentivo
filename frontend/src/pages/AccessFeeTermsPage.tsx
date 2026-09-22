import React from 'react';
import { ShieldCheck, CheckCircle2, ArrowLeft, AlertCircle, Scale, Building, ArrowRight } from 'lucide-react';
import { NairaIcon } from '../components/ui';

interface AccessFeeTermsPageProps {
  onBack: () => void;
  onBrowseListings?: () => void;
  onNavigateToTab?: (tab: any) => void;
}

export const AccessFeeTermsPage: React.FC<AccessFeeTermsPageProps> = ({
  onBack,
  onBrowseListings,
  onNavigateToTab
}) => {
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
            <NairaIcon size={15} color="#000052" />
            <span style={{ fontWeight: 600 }}>Fee Transparency Policy</span>
          </div>
        </div>
      </div>

      {/* Hero Header */}
      <div style={{ backgroundColor: '#000052', color: '#FFFFFF', padding: '48px 20px 40px', textAlign: 'center' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', backgroundColor: 'rgba(190, 137, 255, 0.15)', border: '1px solid rgba(190, 137, 255, 0.3)', padding: '4px 14px', borderRadius: '999px', fontSize: '12px', fontWeight: 700, color: '#BE89FF', marginBottom: '16px' }}>
            <ShieldCheck size={14} />
            <span>Transparent Pricing Guarantee</span>
          </div>
          <h1 style={{ fontSize: '32px', fontWeight: 800, margin: '0 0 12px', letterSpacing: '-0.02em', lineHeight: 1.2, color: '#FFFFFF' }}>
            Access Fee Policy &amp; Guarantees
          </h1>
          <p style={{ fontSize: '15px', color: 'rgba(255, 255, 255, 0.8)', margin: '0 auto', maxWidth: '640px', lineHeight: 1.6 }}>
            Understanding Rentivo's flat ₦5,000 direct landlord connection model, our zero-upfront guarantee, and the 100% refund policy.
          </p>
        </div>
      </div>

      {/* Content Container */}
      <div style={{ maxWidth: '840px', margin: '-24px auto 0', padding: '0 20px' }}>
        <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', border: '1px solid #E2E8F0', padding: '36px 32px', boxShadow: '0 4px 20px rgba(0, 0, 82, 0.04)' }}>

          {/* Section 1: What is the ₦5,000 Fee? */}
          <div style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#000052', marginBottom: '10px' }}>
              1. What Is the ₦5,000 Direct Access Fee?
            </h2>
            <p style={{ fontSize: '14px', color: '#475569', lineHeight: 1.7, margin: '0 0 12px' }}>
              Rentivo eliminates exploitative agency and legal commissions (traditionally 10% to 50% in Nigerian real estate) by providing a technology-verified direct connection. The <strong>flat ₦5,000 access fee</strong> covers:
            </p>
            <ul style={{ fontSize: '14px', color: '#475569', lineHeight: 1.7, margin: '0 0 12px', paddingLeft: '20px' }}>
              <li><strong>Physical On-Site Inspection Audits:</strong> Our field officers in Ibadan personally verify that the property exists, photos are authentic, and the lister has letting authority.</li>
              <li><strong>Real-Time Vacancy Verification:</strong> We contact the landlord directly before you spend a single Naira to verify the home is vacant and ready for inspection.</li>
              <li><strong>Direct Contact Dossier:</strong> Unlocks direct phone calling, pre-filled WhatsApp chat link, exact street address with landmark directions, and an official PDF invoice.</li>
            </ul>
          </div>

          {/* Section 2: Side-by-Side Savings Comparison */}
          <div style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#000052', marginBottom: '14px' }}>
              2. Cost Comparison: Traditional Agents vs. Rentivo
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
              {/* Traditional Agent Card */}
              <div style={{ backgroundColor: '#FEF2F2', border: '1.5px solid #FECACA', borderRadius: '12px', padding: '20px' }}>
                <div style={{ fontSize: '14px', fontWeight: 800, color: '#991B1B', marginBottom: '8px' }}>
                  Traditional Street Agents
                </div>
                <div style={{ fontSize: '13px', color: '#7F1D1D', lineHeight: 1.6 }}>
                  <div>• Upfront inspection fee: ₦5,000 – ₦10,000 per viewing</div>
                  <div>• Agency commission: 10% of annual rent</div>
                  <div>• Agreement/Legal fee: 10% of annual rent</div>
                  <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #FCA5A5', fontWeight: 800 }}>
                    Total on ₦800,000 Flat: <strong>₦170,000+</strong> wasted
                  </div>
                </div>
              </div>

              {/* Rentivo Card */}
              <div style={{ backgroundColor: '#F0FDF4', border: '1.5px solid #BBF7D0', borderRadius: '12px', padding: '20px' }}>
                <div style={{ fontSize: '14px', fontWeight: 800, color: '#166534', marginBottom: '8px' }}>
                  Rentivo Verified Model
                </div>
                <div style={{ fontSize: '13px', color: '#14532D', lineHeight: 1.6 }}>
                  <div>• Browsing &amp; requests: ₦0 (100% Free)</div>
                  <div>• Upfront viewing fees: ₦0</div>
                  <div>• Post-confirmation fee: ₦5,000 flat (one-time)</div>
                  <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #86EFAC', fontWeight: 800, color: '#15803D' }}>
                    Total on ₦800,000 Flat: <strong>₦5,000 flat</strong> (Save ~₦165,000)
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: When Is the Fee Charged? */}
          <div style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#000052', marginBottom: '10px' }}>
              3. The Zero-Upfront Guarantee
            </h2>
            <p style={{ fontSize: '14px', color: '#475569', lineHeight: 1.7, margin: '0 0 12px' }}>
              You are <strong>never asked for payment upfront</strong>. When you click "Request Access", the listing enters the automated verification loop. If the landlord responds that the property is taken or fails to respond within the SLA window, <strong>₦0 is charged</strong> and your request is closed without cost.
            </p>
          </div>

          {/* Section 4: 100% Refund Policy */}
          <div style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#000052', marginBottom: '10px' }}>
              4. 100% Money-Back Refund Commitment
            </h2>
            <div style={{ backgroundColor: '#EFF6FF', border: '1.5px solid #BFDBFE', borderRadius: '12px', padding: '18px 20px', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#1E40AF', fontWeight: 800, fontSize: '14px', marginBottom: '6px' }}>
                <CheckCircle2 size={16} />
                <span>Automated Refund Conditions</span>
              </div>
              <p style={{ fontSize: '13.5px', color: '#1E3A8A', lineHeight: 1.6, margin: '0 0 8px' }}>
                Rentivo will refund your full ₦5,000 payment immediately via Paystack if any of the following occur within 24 hours of contact unlock:
              </p>
              <ul style={{ fontSize: '13px', color: '#1E3A8A', lineHeight: 1.6, margin: 0, paddingLeft: '18px' }}>
                <li>The landlord or mandated agent is unreachable across phone and WhatsApp for more than 24 hours.</li>
                <li>The property is discovered to have already been rented before your unlock was confirmed.</li>
                <li>The rental price or property specs differ substantially from what was advertised and verified.</li>
              </ul>
            </div>
          </div>

          {/* Section 5: What the Fee Does NOT Cover */}
          <div style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#000052', marginBottom: '10px' }}>
              5. Important Non-Guarantee Disclaimers
            </h2>
            <p style={{ fontSize: '14px', color: '#475569', lineHeight: 1.7, margin: '0 0 12px' }}>
              To maintain complete legal clarity under Nigerian consumer protection standards:
            </p>
            <ul style={{ fontSize: '14px', color: '#475569', lineHeight: 1.7, margin: '0 0 12px', paddingLeft: '20px' }}>
              <li><strong>Not Tenancy Rent:</strong> The ₦5,000 fee is an access and verification fee. It does not apply toward annual rent or security deposits paid to the landlord.</li>
              <li><strong>Landlord Lease Discretion:</strong> Property owners retain final discretion to approve lease applications, verify tenant employment/ID, and execute tenancy contracts.</li>
            </ul>
          </div>

          {/* Actions & Next Steps */}
          <div style={{ marginTop: '36px', paddingTop: '24px', borderTop: '1px solid #E2E8F0', display: 'flex', flexWrap: 'wrap', gap: '16px', justifyContent: 'space-between', alignItems: 'center' }}>
            {onBrowseListings && (
              <button 
                onClick={onBrowseListings}
                style={{ backgroundColor: '#000052', color: '#FFFFFF', padding: '10px 22px', borderRadius: '9999px', fontWeight: 700, fontSize: '13.5px', border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
              >
                <span>Browse Verified Properties</span>
                <ArrowRight size={14} />
              </button>
            )}
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
                    onClick={() => onNavigateToTab('privacy')} 
                    style={{ background: 'none', border: 'none', color: '#000052', fontWeight: 700, fontSize: '13px', cursor: 'pointer', textDecoration: 'underline' }}
                  >
                    Privacy Policy
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
