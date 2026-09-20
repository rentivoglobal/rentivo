import React, { useState } from 'react';
import { 
  X, 
  ShieldCheck, 
  CheckCircle2, 
  Clock, 
  Phone, 
  MessageCircle, 
  CreditCard, 
  AlertTriangle, 
  MapPin, 
  Copy, 
  Check, 
  MailCheck, 
  ArrowRight, 
  Lock, 
  ExternalLink,
  Info
} from 'lucide-react';
import { Listing, AccessRequest } from '../types';
import { requestsService } from '../services/requestsService';
import { formatNaira } from '../utils/formatters';
import { EmailNotificationModal } from './EmailNotificationModal';
import { isDemoSimulator } from '../lib/config';

interface RequestAccessModalProps {
  listing: Listing | null;
  onClose: () => void;
  onSuccess: (request: AccessRequest) => void;
}

export const RequestAccessModal: React.FC<RequestAccessModalProps> = ({
  listing,
  onClose,
  onSuccess
}) => {
  if (!listing) return null;

  const [step, setStep] = useState<'form' | 'checking' | 'confirmed' | 'paying' | 'unlocked' | 'unavailable'>('form');
  const [name, setName] = useState('Adeola Johnson');
  const [phone, setPhone] = useState('0803 123 4567');
  const [email, setEmail] = useState('adeola@example.com');
  const [createdRequest, setCreatedRequest] = useState<AccessRequest | null>(null);
  const [loading, setLoading] = useState(false);
  const [emailPreviewOpen, setEmailPreviewOpen] = useState(false);

  const [copiedPhone, setCopiedPhone] = useState(false);
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [copiedRef, setCopiedRef] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const req = await requestsService.createRequest(listing, { name, phone, email });
      setCreatedRequest(req);
      setStep('checking');
      onSuccess(req);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSimulateListerReply = async (reply: 'YES' | 'NO') => {
    if (!createdRequest) return;
    setLoading(true);
    const updated = await requestsService.simulateListerResponse(createdRequest.id, reply, listing.lister);
    setLoading(false);
    if (updated) {
      setCreatedRequest(updated);
      setStep(reply === 'YES' ? 'confirmed' : 'unavailable');
    }
  };

  const handlePay = async () => {
    if (!createdRequest) return;
    setStep('paying');
    setTimeout(async () => {
      const paid = await requestsService.completePayment(createdRequest.id, listing.lister);
      if (paid) {
        setCreatedRequest(paid);
        setStep('unlocked');
      }
    }, 1600);
  };

  const handleCopyPhone = () => {
    const ph = createdRequest?.unlockedListerContact?.phone || listing.lister.phone;
    navigator.clipboard?.writeText(ph);
    setCopiedPhone(true);
    setTimeout(() => setCopiedPhone(false), 2000);
  };

  const handleCopyAddress = () => {
    const addr = listing.addressDescription || `${listing.area}, Ibadan`;
    navigator.clipboard?.writeText(addr);
    setCopiedAddress(true);
    setTimeout(() => setCopiedAddress(false), 2000);
  };

  const handleCopyRef = () => {
    if (!createdRequest) return;
    navigator.clipboard?.writeText(createdRequest.id);
    setCopiedRef(true);
    setTimeout(() => setCopiedRef(false), 2000);
  };

  const unlockedLister = createdRequest?.unlockedListerContact || listing.lister;
  const propertyAddress = listing.addressDescription || `${listing.area}, Ibadan`;

  return (
    <>
      <div className="modal-backdrop is-open" onClick={onClose} style={{ zIndex: 1050 }}>
        <div 
          className="modal-card" 
          onClick={(e) => e.stopPropagation()}
          style={{ 
            maxWidth: '560px', 
            borderRadius: '20px',
            backgroundColor: '#FFFFFF',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 82, 0.25)',
            border: '1px solid #E2E8F0',
            overflow: 'hidden'
          }}
        >
          {/* Header */}
          <div style={{
            padding: '18px 24px',
            borderBottom: '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#F8FAFC'
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  backgroundColor: '#E8F7EE',
                  color: '#16794A',
                  fontSize: '11.5px',
                  fontWeight: 700,
                  padding: '3px 8px',
                  borderRadius: '999px'
                }}>
                  <ShieldCheck size={13} />
                  <span>Direct Landlord Connection</span>
                </span>
                <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>
                  Ibadan
                </span>
              </div>
              <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#000052', marginTop: '4px', margin: 0 }}>
                {step === 'form' && 'Request Property Access & Details'}
                {step === 'checking' && 'Verifying Property Availability'}
                {step === 'confirmed' && 'Property Available · Checkout'}
                {step === 'paying' && 'Securing Paystack Connection'}
                {step === 'unlocked' && 'Landlord Contact Unlocked'}
                {step === 'unavailable' && 'Property Currently Unavailable'}
              </h3>
            </div>
            <button 
              onClick={onClose}
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                backgroundColor: '#EDF2F7',
                border: 'none',
                color: '#475569',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
              title="Close modal"
            >
              <X size={16} />
            </button>
          </div>

          <div style={{ padding: '22px 24px' }}>
            {/* STEP 1: Renter Information Form */}
            {step === 'form' && (
              <form onSubmit={handleSubmit}>
                {/* Property Summary Card */}
                <div style={{ 
                  display: 'flex', 
                  gap: '14px', 
                  alignItems: 'center', 
                  backgroundColor: '#F8FAFC', 
                  padding: '12px 14px', 
                  borderRadius: '12px', 
                  border: '1px solid #E2E8F0',
                  marginBottom: '18px' 
                }}>
                  <img 
                    src={listing.photos[0]} 
                    alt={listing.title} 
                    style={{ width: '64px', height: '64px', borderRadius: '10px', objectFit: 'cover', flexShrink: 0 }} 
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: '14.5px', color: '#000052', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {listing.title}
                    </div>
                    <div style={{ fontSize: '12.5px', color: '#64748B', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                      <MapPin size={12} className="text-navy" />
                      <span>{listing.area}, Ibadan</span>
                      <span>·</span>
                      <span style={{ fontWeight: 700, color: '#000052' }}>{formatNaira(listing.price)}/yr</span>
                    </div>
                  </div>
                </div>

                {/* Zero upfront fee reassurance callout */}
                <div style={{ 
                  backgroundColor: '#EFF6FF', 
                  border: '1px solid #BFDBFE',
                  padding: '14px 16px', 
                  borderRadius: '12px', 
                  marginBottom: '18px' 
                }}>
                  <div style={{ fontWeight: 700, fontSize: '13px', color: '#1E3A8A', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <ShieldCheck size={15} color="#1D4ED8" />
                    <span>How Rentivo Request Details Works:</span>
                  </div>
                  <ul style={{ fontSize: '12.5px', color: '#1E293B', lineHeight: 1.6, margin: 0, paddingLeft: '18px' }}>
                    <li><b>Free to submit:</b> Zero payment card or fee required to check vacancy.</li>
                    <li><b>Automated verification:</b> We email <b>{listing.lister.fullName}</b> a one-click YES / NO link to confirm the unit is unoccupied.</li>
                    <li><b>Flat ₦5,000 fee:</b> Only charged if the property is confirmed vacant and ready.</li>
                  </ul>
                </div>

                {/* Inputs */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '18px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#0F172A', marginBottom: '6px' }}>
                      Full Name
                    </label>
                    <input 
                      type="text" 
                      className="form-input" 
                      required 
                      value={name} 
                      onChange={(e) => setName(e.target.value)} 
                      placeholder="e.g. Adeola Johnson"
                      style={{ width: '100%', height: '42px', borderRadius: '8px', border: '1px solid #CBD5E1', padding: '0 12px', fontSize: '14px' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#0F172A', marginBottom: '6px' }}>
                      WhatsApp Phone Number
                    </label>
                    <input 
                      type="tel" 
                      className="form-input" 
                      required 
                      value={phone} 
                      onChange={(e) => setPhone(e.target.value)} 
                      placeholder="0803 123 4567"
                      style={{ width: '100%', height: '42px', borderRadius: '8px', border: '1px solid #CBD5E1', padding: '0 12px', fontSize: '14px' }}
                    />
                    <div style={{ fontSize: '11.5px', color: '#64748B', marginTop: '4px' }}>
                      Used to send you vacancy updates by email.
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#0F172A', marginBottom: '6px' }}>
                      Email Address (For Landlord Dossier &amp; Receipt)
                    </label>
                    <input 
                      type="email" 
                      className="form-input" 
                      required 
                      value={email} 
                      onChange={(e) => setEmail(e.target.value)} 
                      placeholder="adeola@example.com"
                      style={{ width: '100%', height: '42px', borderRadius: '8px', border: '1px solid #CBD5E1', padding: '0 12px', fontSize: '14px' }}
                    />
                    <div style={{ fontSize: '11.5px', color: '#64748B', marginTop: '4px' }}>
                      Official landlord contact and PDF payment receipt are sent here.
                    </div>
                  </div>
                </div>

                <button 
                  type="submit" 
                  className="btn btn-primary btn-block btn-pill" 
                  disabled={loading}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    height: '46px',
                    fontSize: '14.5px',
                    fontWeight: 700,
                    backgroundColor: '#000052',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '999px',
                    cursor: 'pointer'
                  }}
                >
                  <span>{loading ? 'Submitting Request...' : 'Check Availability & Request (Free)'}</span>
                  <ArrowRight size={16} />
                </button>
              </form>
            )}

            {/* STEP 2: Checking Availability State */}
            {step === 'checking' && (
              <div style={{ textAlign: 'center', padding: '16px 4px' }}>
                <div style={{ 
                  width: '64px', 
                  height: '64px', 
                  borderRadius: '50%', 
                  backgroundColor: '#EFF6FF', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  margin: '0 auto 16px', 
                  color: '#1D4ED8',
                  border: '1.5px solid #BFDBFE'
                }}>
                  <Clock size={32} className="animate-spin" />
                </div>

                <h3 style={{ fontSize: '19px', fontWeight: 800, color: '#000052', marginBottom: '8px' }}>
                  Checking Availability with Landlord
                </h3>
                <p style={{ fontSize: '13.5px', color: '#475569', maxWidth: '420px', margin: '0 auto 20px', lineHeight: 1.6 }}>
                  Our automated gateway has dispatched a verification message to <b>{listing.lister.fullName}</b> to guarantee the property at <b>{listing.area}</b> is vacant before you pay.
                </p>

                {/* Authentic Live Status & SLA Reassurance */}
                <div style={{
                  backgroundColor: '#F8FAFC',
                  borderRadius: '14px',
                  border: '1px solid #E2E8F0',
                  padding: '18px 20px',
                  textAlign: 'left'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#2563EB', animation: 'pulse 1.5s infinite' }} />
                    <span style={{ fontSize: '11px', fontWeight: 800, color: '#1E40AF', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Automated Vacancy Inquiry Dispatched
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '12.5px', color: '#475569' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                      <CheckCircle2 size={15} color="#16794A" style={{ flexShrink: 0, marginTop: '2px' }} />
                      <span>Inquiry sent to <b>{listing.lister.fullName}</b> via SMS &amp; secure email.</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                      <Clock size={15} color="#2563EB" style={{ flexShrink: 0, marginTop: '2px' }} />
                      <span>Direct 48-hour response window active. Listers usually confirm in 15–30 mins.</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                      <ShieldCheck size={15} color="#7E22CE" style={{ flexShrink: 0, marginTop: '2px' }} />
                      <span>Zero charge until confirmed. 100% money-back refund guarantee.</span>
                    </div>
                  </div>

                  <div style={{ borderTop: '1px solid #E2E8F0', marginTop: '14px', paddingTop: '10px', fontSize: '11.5px', color: '#64748B' }}>
                    Questions? Ibadan Support: <a href="tel:+2348007368486" style={{ color: '#000052', fontWeight: 700, textDecoration: 'none' }}>+234 800 736 8486</a>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 3: Confirmed Available - Prompt ₦5,000 Paystack */}
            {step === 'confirmed' && (
              <div style={{ textAlign: 'center', padding: '10px 4px' }}>
                <div style={{ 
                  width: '56px', 
                  height: '56px', 
                  borderRadius: '50%', 
                  backgroundColor: '#E8F7EE', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  margin: '0 auto 12px', 
                  color: '#16794A',
                  border: '1.5px solid #A7F3D0'
                }}>
                  <CheckCircle2 size={30} />
                </div>

                <h3 style={{ fontSize: '19px', fontWeight: 800, color: '#000052', marginBottom: '6px' }}>
                  Property Confirmed Vacant &amp; Ready!
                </h3>
                <p style={{ fontSize: '13px', color: '#475569', marginBottom: '18px', lineHeight: 1.5 }}>
                  <b>{listing.lister.fullName}</b> verified that <b>{listing.title}</b> is currently unoccupied and open for immediate inspection.
                </p>

                {/* High-Contrast Transparent Fee Breakdown Card */}
                <div style={{ 
                  backgroundColor: '#F8FAFC', 
                  border: '1.5px solid #CBD5E1', 
                  borderRadius: '14px', 
                  padding: '16px 18px', 
                  textAlign: 'left', 
                  marginBottom: '18px' 
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <span style={{ fontSize: '13.5px', fontWeight: 600, color: '#334155' }}>One-time Direct Access Fee:</span>
                    <span style={{ fontSize: '18px', fontWeight: 800, color: '#000052', fontFamily: 'monospace' }}>₦5,000</span>
                  </div>

                  <div style={{ borderTop: '1px dashed #CBD5E1', paddingTop: '10px', display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12.5px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#16794A' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Check size={13} />
                        <span>Agent Commission Saved:</span>
                      </span>
                      <span style={{ fontWeight: 700 }}>~₦85,000</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#16794A' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Check size={13} />
                        <span>Upfront Roadside Inspection Fees:</span>
                      </span>
                      <span style={{ fontWeight: 700 }}>₦0</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748B', marginTop: '4px', fontSize: '11.5px' }}>
                      <Lock size={12} />
                      <span>Unlocks direct phone, WhatsApp chat, exact physical landmark address &amp; email receipt.</span>
                    </div>
                  </div>
                </div>

                <button 
                  type="button"
                  className="btn btn-primary btn-block btn-pill"
                  onClick={handlePay}
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    gap: '8px',
                    height: '48px',
                    fontSize: '15px',
                    fontWeight: 700,
                    backgroundColor: '#000052',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '999px',
                    cursor: 'pointer',
                    marginBottom: '10px'
                  }}
                >
                  <CreditCard size={18} />
                  <span>Pay ₦5,000 with Paystack</span>
                </button>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '11.5px', color: '#64748B' }}>
                  <ShieldCheck size={13} color="#16794A" />
                  <span>Secured by Paystack 256-bit SSL · Instant Email Receipt</span>
                </div>
              </div>
            )}

            {/* STEP 4: Paying Simulation */}
            {step === 'paying' && (
              <div style={{ textAlign: 'center', padding: '32px 12px' }}>
                <div style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  backgroundColor: '#EFF6FF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px',
                  color: '#1D4ED8'
                }}>
                  <CreditCard size={28} className="animate-spin" />
                </div>
                <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#000052', marginBottom: '8px' }}>
                  Processing ₦5,000 Payment...
                </h3>
                <p style={{ fontSize: '13px', color: '#64748B', maxWidth: '340px', margin: '0 auto' }}>
                  Communicating with Paystack Nigeria gateway. Releasing landlord contact dossier and generating email receipt.
                </p>
              </div>
            )}

            {/* STEP 5: Contact Unlocked & Email Dispatched */}
            {step === 'unlocked' && (
              <div style={{ textAlign: 'center', padding: '4px 0' }}>
                <div style={{ 
                  width: '54px', 
                  height: '54px', 
                  borderRadius: '50%', 
                  backgroundColor: '#E8F7EE', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  margin: '0 auto 10px', 
                  color: '#16794A',
                  border: '1.5px solid #A7F3D0'
                }}>
                  <CheckCircle2 size={30} />
                </div>

                <h3 style={{ fontSize: '19px', fontWeight: 800, color: '#000052', marginBottom: '4px' }}>
                  Direct Contact Unlocked!
                </h3>
                <p style={{ fontSize: '12.5px', color: '#64748B', marginBottom: '14px' }}>
                  ₦5,000 payment verified. Full landlord dossier is ready below and also dispatched to your email.
                </p>

                {/* Email Dispatched Banner with Interactive Preview Button */}
                <div style={{
                  backgroundColor: '#E8F7EE',
                  border: '1px solid #16794A',
                  borderRadius: '12px',
                  padding: '12px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '10px',
                  marginBottom: '16px',
                  textAlign: 'left'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <MailCheck size={18} color="#16794A" style={{ flexShrink: 0 }} />
                    <div style={{ fontSize: '12px', color: '#166534' }}>
                      <span style={{ fontWeight: 700 }}>Email Dispatched:</span> Receipt &amp; dossier delivered to <b>{email}</b>.
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setEmailPreviewOpen(true)}
                    style={{
                      backgroundColor: '#16794A',
                      color: '#FFFFFF',
                      border: 'none',
                      padding: '5px 10px',
                      borderRadius: '6px',
                      fontSize: '11.5px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      flexShrink: 0
                    }}
                  >
                    <span>View Email</span>
                    <ExternalLink size={11} />
                  </button>
                </div>

                {/* Verified Landlord Contact Box */}
                <div style={{ 
                  backgroundColor: '#F8FAFC', 
                  border: '1.5px solid #000052', 
                  borderRadius: '14px', 
                  padding: '16px', 
                  textAlign: 'left', 
                  marginBottom: '16px' 
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 800, color: '#000052', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Verified Lister Dossier
                    </span>
                    <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>
                      Mandate Audited
                    </span>
                  </div>

                  <div style={{ fontSize: '17px', fontWeight: 800, color: '#000052', margin: '2px 0' }}>
                    {unlockedLister.fullName}
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748B', marginBottom: '14px' }}>
                    {unlockedLister.agencyName || 'Direct Landlord'} · Member since {unlockedLister.memberSince} · {unlockedLister.responseRate} Response Rate
                  </div>

                  {/* Contact Action Buttons */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {/* Phone with CopyChip */}
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <a 
                        href={`tel:${unlockedLister.phone}`} 
                        className="btn btn-primary"
                        style={{ 
                          flex: 1,
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center', 
                          gap: '6px',
                          backgroundColor: '#000052',
                          color: '#FFFFFF',
                          borderRadius: '8px',
                          padding: '9px 14px',
                          fontSize: '13px',
                          fontWeight: 700,
                          textDecoration: 'none'
                        }}
                      >
                        <Phone size={14} />
                        <span>Call {unlockedLister.phone}</span>
                      </a>
                      <button
                        type="button"
                        onClick={handleCopyPhone}
                        style={{
                          backgroundColor: '#FFFFFF',
                          border: '1px solid #CBD5E1',
                          borderRadius: '8px',
                          padding: '0 12px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '12px',
                          fontWeight: 600,
                          color: copiedPhone ? '#16794A' : '#334155',
                          cursor: 'pointer'
                        }}
                      >
                        {copiedPhone ? <Check size={14} /> : <Copy size={14} />}
                        <span>{copiedPhone ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>

                    {/* WhatsApp Action */}
                    <a 
                      href={`https://wa.me/${unlockedLister.whatsapp.replace(/[^0-9]/g, '')}?text=Hello%20${encodeURIComponent(unlockedLister.fullName)},%20I%20requested%20details%20for%20your%20property%20on%20Rentivo:%20${encodeURIComponent(listing.title)}`} 
                      target="_blank" 
                      rel="noreferrer"
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        gap: '6px', 
                        backgroundColor: '#25D366', 
                        color: '#FFFFFF',
                        borderRadius: '8px',
                        padding: '10px 14px',
                        fontSize: '13px',
                        fontWeight: 700,
                        textDecoration: 'none'
                      }}
                    >
                      <MessageCircle size={15} />
                      <span>Chat on WhatsApp Directly</span>
                    </a>

                    {/* Physical Landmark Address */}
                    <div style={{
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #CBD5E1',
                      borderRadius: '8px',
                      padding: '10px 12px'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                        <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <MapPin size={12} className="text-navy" />
                          <span>PHYSICAL LANDMARK ADDRESS</span>
                        </div>
                        <button
                          type="button"
                          onClick={handleCopyAddress}
                          style={{
                            border: 'none',
                            background: 'none',
                            cursor: 'pointer',
                            fontSize: '11.5px',
                            fontWeight: 600,
                            color: copiedAddress ? '#16794A' : '#64748B',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '3px'
                          }}
                        >
                          {copiedAddress ? <Check size={12} /> : <Copy size={12} />}
                          <span>{copiedAddress ? 'Copied' : 'Copy'}</span>
                        </button>
                      </div>
                      <div style={{ fontSize: '12.5px', color: '#0F172A', fontWeight: 600 }}>
                        {propertyAddress}
                      </div>
                    </div>
                  </div>
                </div>

                <button 
                  type="button"
                  className="btn btn-outline btn-block" 
                  onClick={onClose}
                  style={{
                    width: '100%',
                    borderRadius: '8px',
                    padding: '9px',
                    fontSize: '13px',
                    fontWeight: 700,
                    borderColor: '#CBD5E1',
                    color: '#334155',
                    backgroundColor: '#FFFFFF',
                    cursor: 'pointer'
                  }}
                >
                  Done &amp; Return to Listings
                </button>
              </div>
            )}

            {/* STEP 6: Unavailable / Lister replied NO */}
            {step === 'unavailable' && (
              <div style={{ textAlign: 'center', padding: '18px 4px' }}>
                <div style={{ 
                  width: '56px', 
                  height: '56px', 
                  borderRadius: '50%', 
                  backgroundColor: '#FEE4E2', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  margin: '0 auto 14px', 
                  color: '#B42318',
                  border: '1.5px solid #FCA5A5'
                }}>
                  <AlertTriangle size={30} />
                </div>

                <h3 style={{ fontSize: '19px', fontWeight: 800, color: '#000052', marginBottom: '6px' }}>
                  Property No Longer Vacant
                </h3>
                <p style={{ fontSize: '13px', color: '#475569', marginBottom: '16px', lineHeight: 1.5 }}>
                  The landlord notified us that <b>{listing.title}</b> in <b>{listing.area}</b> has just been rented out or taken off the market.
                </p>

                <div style={{ 
                  backgroundColor: '#E8F7EE', 
                  border: '1px solid #A7F3D0',
                  padding: '12px 14px', 
                  borderRadius: '10px', 
                  marginBottom: '18px', 
                  color: '#16794A', 
                  fontWeight: 700, 
                  fontSize: '12.5px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}>
                  <ShieldCheck size={16} />
                  <span>Zero charges made. You were not debited ₦1.</span>
                </div>

                <button 
                  type="button"
                  className="btn btn-primary btn-block btn-pill" 
                  onClick={onClose}
                  style={{
                    width: '100%',
                    height: '44px',
                    borderRadius: '999px',
                    fontSize: '14px',
                    fontWeight: 700,
                    backgroundColor: '#000052',
                    color: '#FFFFFF',
                    border: 'none',
                    cursor: 'pointer'
                  }}
                >
                  Browse Other Available Listings
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Transactional Email Preview Drawer */}
      <EmailNotificationModal
        isOpen={emailPreviewOpen}
        onClose={() => setEmailPreviewOpen(false)}
        request={createdRequest}
        listing={listing}
      />

      {/* Discreet Development / QA Test Actions Dock (Only visible when awaiting reply and simulator enabled) */}
      {isDemoSimulator && step === 'checking' && (
        <aside
          aria-label="Development testing panel"
          style={{
            position: 'fixed',
            bottom: '16px',
            right: '16px',
            zIndex: 1100,
            backgroundColor: '#0F172A',
            color: '#FFFFFF',
            borderRadius: '12px',
            padding: '10px 14px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
            border: '1px solid #334155',
            fontSize: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}
        >
          <span style={{ fontWeight: 700, color: '#94A3B8' }}>Local Test Response:</span>
          <button
            type="button"
            onClick={() => handleSimulateListerReply('YES')}
            disabled={loading}
            style={{
              backgroundColor: '#16794A',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '6px',
              padding: '5px 10px',
              fontWeight: 700,
              fontSize: '11px',
              cursor: 'pointer'
            }}
          >
            Simulate Available
          </button>
          <button
            type="button"
            onClick={() => handleSimulateListerReply('NO')}
            disabled={loading}
            style={{
              backgroundColor: '#DC2626',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '6px',
              padding: '5px 10px',
              fontWeight: 700,
              fontSize: '11px',
              cursor: 'pointer'
            }}
          >
            Simulate Taken
          </button>
        </aside>
      )}
    </>
  );
};
