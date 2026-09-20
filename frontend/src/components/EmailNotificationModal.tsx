import React, { useState } from 'react';
import { 
  X, 
  MailCheck, 
  ShieldCheck, 
  Phone, 
  MessageCircle, 
  MapPin, 
  Copy, 
  Check, 
  Printer, 
  ExternalLink,
  Lock
} from 'lucide-react';
import { AccessRequest, Listing } from '../types';

interface EmailNotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  request: AccessRequest | null;
  listing: Listing | null;
}

export const EmailNotificationModal: React.FC<EmailNotificationModalProps> = ({
  isOpen,
  onClose,
  request,
  listing
}) => {
  if (!isOpen || !request || !listing) return null;

  const [copiedPhone, setCopiedPhone] = useState(false);
  const [copiedAddress, setCopiedAddress] = useState(false);

  const lister = request.unlockedListerContact || listing.lister;
  const address = listing.addressDescription || `${listing.area}, Ibadan, Oyo State`;
  const formattedDate = new Date(request.updatedAt || Date.now()).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const handleCopyPhone = () => {
    navigator.clipboard?.writeText(lister.phone);
    setCopiedPhone(true);
    setTimeout(() => setCopiedPhone(false), 2000);
  };

  const handleCopyAddress = () => {
    navigator.clipboard?.writeText(address);
    setCopiedAddress(true);
    setTimeout(() => setCopiedAddress(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div 
      className="modal-backdrop is-open" 
      onClick={onClose}
      style={{ zIndex: 1100, backgroundColor: 'rgba(0, 0, 50, 0.7)' }}
    >
      <div 
        className="modal-card" 
        onClick={(e) => e.stopPropagation()}
        style={{ 
          maxWidth: '680px', 
          width: '95%',
          maxHeight: '92vh', 
          display: 'flex', 
          flexDirection: 'column',
          borderRadius: '20px',
          overflow: 'hidden',
          backgroundColor: '#F8FAFC'
        }}
      >
        {/* Email Client Simulated Header */}
        <div style={{
          backgroundColor: '#0F172A',
          color: '#F8FAFC',
          padding: '16px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid rgba(255,255,255,0.1)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              backgroundColor: 'rgba(22, 121, 74, 0.25)',
              border: '1px solid #16794A',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#34D399'
            }}>
              <MailCheck size={18} />
            </div>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 700, letterSpacing: '0.02em', color: '#F1F5F9' }}>
                Transactional Email Dispatched
              </div>
              <div style={{ fontSize: '11px', color: '#94A3B8' }}>
                Delivered to <span style={{ color: '#F8FAFC', fontWeight: 600 }}>{request.renterEmail}</span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={handlePrint}
              className="btn btn-outline btn-sm"
              style={{
                color: '#F8FAFC',
                borderColor: '#334155',
                fontSize: '12px',
                padding: '5px 10px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
              title="Print Receipt"
            >
              <Printer size={13} />
              <span>Print / PDF</span>
            </button>
            <button 
              onClick={onClose}
              style={{
                width: '30px',
                height: '30px',
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.1)',
                border: 'none',
                color: '#CBD5E1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Email Meta Info Bar */}
        <div style={{
          backgroundColor: '#FFFFFF',
          padding: '12px 24px',
          borderBottom: '1px solid #E2E8F0',
          fontSize: '12.5px',
          color: '#475569',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px'
        }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <span style={{ fontWeight: 600, color: '#0F172A', minWidth: '60px' }}>From:</span>
            <span>Rentivo Ibadan Notifications &lt;notifications@rentivo.ng&gt;</span>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <span style={{ fontWeight: 600, color: '#0F172A', minWidth: '60px' }}>Subject:</span>
            <span style={{ fontWeight: 700, color: '#000052' }}>
              Access Unlocked: {listing.title} (Landlord Contact &amp; Payment Receipt)
            </span>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <span style={{ fontWeight: 600, color: '#0F172A', minWidth: '60px' }}>Date:</span>
            <span>{formattedDate}</span>
          </div>
        </div>

        {/* Rendered Email Template Body */}
        <div style={{
          padding: '24px',
          overflowY: 'auto',
          backgroundColor: '#FFFFFF',
          margin: '16px 20px',
          borderRadius: '12px',
          border: '1px solid #E2E8F0',
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
        }}>
          {/* Email Branding Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #000052', paddingBottom: '16px', marginBottom: '20px' }}>
            <div>
              <div style={{ fontSize: '22px', fontWeight: 800, color: '#000052', letterSpacing: '-0.02em' }}>
                RENTIVO
              </div>
              <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600, letterSpacing: '0.04em' }}>
                VERIFIED IBADAN RENTALS
              </div>
            </div>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: '#E8F7EE',
              color: '#16794A',
              padding: '6px 12px',
              borderRadius: '999px',
              fontSize: '12px',
              fontWeight: 700
            }}>
              <ShieldCheck size={14} />
              <span>Official Verification Receipt</span>
            </div>
          </div>

          {/* Salutation */}
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A', marginBottom: '8px' }}>
            Hello {request.renterName},
          </h2>
          <p style={{ fontSize: '14px', lineHeight: 1.6, color: '#334155', marginBottom: '20px' }}>
            Your <b>₦5,000 access fee</b> payment via Paystack was successful. You now have direct, unhindered access to contact the verified owner/mandated agent for <b>{listing.title}</b>.
          </p>

          {/* Landlord Contact Unlocked Dossier */}
          <div style={{
            backgroundColor: '#F8FAFC',
            border: '1.5px solid #000052',
            borderRadius: '14px',
            padding: '20px',
            marginBottom: '24px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ fontSize: '12px', fontWeight: 800, color: '#000052', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Verified Landlord Contact Dossier
              </div>
              <span style={{ fontSize: '11px', backgroundColor: '#E2E8F0', padding: '3px 8px', borderRadius: '4px', color: '#334155', fontWeight: 600 }}>
                ID: {request.id}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '18px' }}>
              <div style={{
                width: '50px',
                height: '50px',
                borderRadius: '50%',
                backgroundColor: '#000052',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '18px',
                fontWeight: 800
              }}>
                {lister.fullName.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <div style={{ fontSize: '17px', fontWeight: 800, color: '#0F172A' }}>
                  {lister.fullName}
                </div>
                <div style={{ fontSize: '13px', color: '#64748B' }}>
                  {lister.agencyName || 'Direct Landlord / Mandated Owner'} · Verified Lister on Rentivo
                </div>
              </div>
            </div>

            {/* Contact Actions Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px', marginBottom: '16px' }}>
              {/* Phone Action */}
              <div style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #CBD5E1',
                borderRadius: '10px',
                padding: '12px 14px'
              }}>
                <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600, marginBottom: '4px' }}>
                  DIRECT PHONE NUMBER
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '15px', fontWeight: 700, color: '#000052', fontFamily: 'monospace' }}>
                    {lister.phone}
                  </span>
                  <button
                    onClick={handleCopyPhone}
                    style={{
                      border: 'none',
                      background: 'none',
                      cursor: 'pointer',
                      color: copiedPhone ? '#16794A' : '#64748B',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '12px',
                      fontWeight: 600
                    }}
                  >
                    {copiedPhone ? <Check size={14} /> : <Copy size={14} />}
                    <span>{copiedPhone ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              </div>

              {/* WhatsApp Action */}
              <div style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #CBD5E1',
                borderRadius: '10px',
                padding: '12px 14px'
              }}>
                <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600, marginBottom: '4px' }}>
                  WHATSAPP CHAT
                </div>
                <a
                  href={`https://wa.me/${lister.whatsapp.replace(/[^0-9]/g, '')}?text=Hello%20${encodeURIComponent(lister.fullName)},%20I%20requested%20details%20for%20your%20property%20on%20Rentivo:%20${encodeURIComponent(listing.title)}`}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '13.5px',
                    fontWeight: 700,
                    color: '#128C7E',
                    textDecoration: 'none'
                  }}
                >
                  <MessageCircle size={15} />
                  <span>Start WhatsApp Conversation</span>
                  <ExternalLink size={12} />
                </a>
              </div>
            </div>

            {/* Physical Landmark Address */}
            <div style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #CBD5E1',
              borderRadius: '10px',
              padding: '12px 14px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <MapPin size={13} className="text-navy" />
                  <span>EXACT PHYSICAL LANDMARK ADDRESS</span>
                </div>
                <button
                  onClick={handleCopyAddress}
                  style={{
                    border: 'none',
                    background: 'none',
                    cursor: 'pointer',
                    color: copiedAddress ? '#16794A' : '#64748B',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '12px',
                    fontWeight: 600
                  }}
                >
                  {copiedAddress ? <Check size={14} /> : <Copy size={14} />}
                  <span>{copiedAddress ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <div style={{ fontSize: '13.5px', color: '#0F172A', fontWeight: 600, lineHeight: 1.5 }}>
                {address}
              </div>
            </div>
          </div>

          {/* Payment Invoice & Breakdown */}
          <div style={{
            border: '1px solid #E2E8F0',
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '20px'
          }}>
            <div style={{ fontSize: '12px', fontWeight: 800, color: '#334155', textTransform: 'uppercase', marginBottom: '12px' }}>
              Payment Summary &amp; Savings
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
                <span>One-Time Direct Access Fee:</span>
                <span style={{ fontWeight: 700, color: '#0F172A' }}>₦5,000.00</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
                <span>Payment Gateway:</span>
                <span style={{ fontWeight: 600 }}>Paystack (Ref: PSTK-{request.id.slice(-6)})</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#16794A' }}>
                <span>Typical Agent Commission Saved:</span>
                <span style={{ fontWeight: 700 }}>~₦85,000.00</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#16794A' }}>
                <span>Upfront Roadside Inspection Fees:</span>
                <span style={{ fontWeight: 700 }}>₦0.00</span>
              </div>
              <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: '8px', marginTop: '4px', display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '15px', color: '#000052' }}>
                <span>Total Paid:</span>
                <span>₦5,000.00</span>
              </div>
            </div>
          </div>

          {/* Ibadan Inspection Security Tips */}
          <div style={{
            backgroundColor: '#FEF3C7',
            border: '1px solid #FDE68A',
            borderRadius: '10px',
            padding: '14px 16px',
            fontSize: '12.5px',
            color: '#92400E',
            lineHeight: 1.5,
            marginBottom: '20px'
          }}>
            <div style={{ fontWeight: 700, marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Lock size={14} />
              <span>Inspection &amp; Rental Advice from Rentivo</span>
            </div>
            Always inspect properties during daylight hours. Verify the physical keys and complete a lease agreement before paying annual rent. Rentivo verifies listing mandates, but never pay annual rent to unconfirmed third parties.
          </div>

          {/* Email Footer */}
          <div style={{ textAlign: 'center', borderTop: '1px solid #E2E8F0', paddingTop: '16px', fontSize: '11.5px', color: '#94A3B8' }}>
            Rentivo Nigeria · The Verified Property Marketplace · Dugbe, Ibadan, Oyo State<br />
            Questions? Contact <a href="mailto:support@rentivo.ng" style={{ color: '#000052', fontWeight: 600 }}>support@rentivo.ng</a>
          </div>
        </div>

        {/* Modal Footer CTA */}
        <div style={{
          backgroundColor: '#FFFFFF',
          padding: '14px 20px',
          borderTop: '1px solid #E2E8F0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span style={{ fontSize: '12px', color: '#64748B' }}>
            A copy of this notification was sent to {request.renterEmail}
          </span>
          <button
            onClick={onClose}
            className="btn btn-primary btn-sm"
            style={{ padding: '8px 20px', fontWeight: 700 }}
          >
            Close Email Preview
          </button>
        </div>
      </div>
    </div>
  );
};
