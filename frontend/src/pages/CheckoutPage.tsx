import React, { useEffect, useState } from 'react';
import { 
  ArrowLeft, 
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
  Calendar,
  Building,
  UserCheck,
  FileText,
  Printer,
  Sparkles,
  Gift,
  ChevronRight
} from 'lucide-react';
import { Listing, AccessRequest, ListerContact } from '../types';
import { requestsService } from '../services/requestsService';
import { formatNaira, formatPeriod } from '../utils/formatters';
import { EmailNotificationModal } from '../components/EmailNotificationModal';
import { isDemoSimulator, ACCESS_FEE_KOBO, paystackPublicKey } from '../lib/config';
import { openPaystackCheckout } from '../lib/paystack';
import { useAuth } from '../contexts/AuthContext';

interface CheckoutPageProps {
  listing: Listing | null;
  existingRequest?: AccessRequest | null;
  onCreated?: (request: AccessRequest) => void;
  onBack: () => void;
  onBrowseListings: () => void;
}

export const CheckoutPage: React.FC<CheckoutPageProps> = ({
  listing,
  existingRequest = null,
  onCreated,
  onBack,
  onBrowseListings
}) => {
  const { user } = useAuth();
  const [step, setStep] = useState<'form' | 'checking' | 'confirmed' | 'paying' | 'unlocked' | 'unavailable'>('form');
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [email, setEmail] = useState(user?.email || '');
  const [moveInTimeframe, setMoveInTimeframe] = useState('Immediately (Within 2 weeks)');
  const [inspectionWindow, setInspectionWindow] = useState('Weekday Morning (9am–12pm)');
  const [leasePurpose, setLeasePurpose] = useState('Personal / Residential');
  
  const [createdRequest, setCreatedRequest] = useState<AccessRequest | null>(null);
  const [loading, setLoading] = useState(false);
  const [emailPreviewOpen, setEmailPreviewOpen] = useState(false);
  const [promoStats, setPromoStats] = useState(() => requestsService.getPromotionStats());

  const [copiedPhone, setCopiedPhone] = useState(false);
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [copiedRef, setCopiedRef] = useState(false);

  useEffect(() => {
    void requestsService.loadPromotionStats().then(setPromoStats);
  }, []);

  useEffect(() => {
    if (existingRequest) return;
    if (!user) return;
    setName((current) => current || user.name);
    setPhone((current) => current || user.phone);
    setEmail((current) => current || user.email);
  }, [user, existingRequest]);

  useEffect(() => {
    if (!existingRequest) return;
    setCreatedRequest(existingRequest);
    setName(existingRequest.renterName);
    setPhone(existingRequest.renterPhone);
    setEmail(existingRequest.renterEmail);
    if (existingRequest.status === 'paid') setStep('unlocked');
    else if (existingRequest.status === 'confirmed' || existingRequest.status === 'payment_pending') setStep('confirmed');
    else if (existingRequest.status === 'unavailable') setStep('unavailable');
    else setStep('checking');
  }, [existingRequest]);

  useEffect(() => {
    if (!createdRequest || (createdRequest.status !== 'availability_pending' && createdRequest.status !== 'submitted')) return;
    const timer = window.setInterval(async () => {
      const latest = await requestsService.getRequestById(createdRequest.id);
      if (!latest) return;
      setCreatedRequest(latest);
      if (latest.status === 'confirmed') setStep('confirmed');
      if (latest.status === 'unavailable') setStep('unavailable');
      if (latest.status === 'paid') setStep('unlocked');
    }, 4000);
    return () => window.clearInterval(timer);
  }, [createdRequest?.id, createdRequest?.status]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
    if (!listing) return;
    const req = await requestsService.createRequest(listing, { name, phone, email });
      setCreatedRequest(req);
      setStep('checking');
      onCreated?.(req);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSimulateListerReply = async (reply: 'YES' | 'NO') => {
    if (!createdRequest) return;
    setLoading(true);
    const updated = await requestsService.simulateListerResponse(createdRequest.id, reply, listing?.lister);
    setLoading(false);
    if (updated) {
      setCreatedRequest(updated);
      setStep(reply === 'YES' ? 'confirmed' : 'unavailable');
    }
  };

  const handleClaimWaiver = async () => {
    if (!createdRequest) return;
    setLoading(true);
    try {
      const waived = await requestsService.claimPromotionWaiver(createdRequest.id, listing?.lister);
      if (waived) {
        setCreatedRequest(waived);
        setPromoStats(requestsService.getPromotionStats());
        setStep('unlocked');
      }
    } catch (e) {
      console.error(e);
      handlePay();
    } finally {
      setLoading(false);
    }
  };

  const handlePay = async () => {
    if (!createdRequest) return;
    if (createdRequest.status !== 'confirmed' && !createdRequest.isPromotionWaiverApplied) {
      return;
    }
    setStep('paying');
    try {
      if (paystackPublicKey) {
        const init = await requestsService.initializePaystack(createdRequest.id, email);
        await openPaystackCheckout({
          email,
          amountKobo: ACCESS_FEE_KOBO,
          reference: init.reference,
          metadata: { requestId: createdRequest.id }
        });
        for (let i = 0; i < 8; i += 1) {
          await new Promise((r) => setTimeout(r, 1200));
          const latest = await requestsService.getRequestById(createdRequest.id);
          if (latest?.status === 'paid') {
            setCreatedRequest(latest);
            setStep('unlocked');
            return;
          }
        }
      }
      const paid = await requestsService.completePayment(createdRequest.id, listing?.lister);
      if (paid) {
        setCreatedRequest(paid);
        setStep('unlocked');
      }
    } catch (err) {
      console.error(err);
      setStep('confirmed');
    }
  };

  const handleCopyPhone = () => {
    const ph = createdRequest?.unlockedListerContact?.phone || '';
    navigator.clipboard?.writeText(ph);
    setCopiedPhone(true);
    setTimeout(() => setCopiedPhone(false), 2000);
  };

  const handleCopyAddress = () => {
    const addr = createdRequest?.unlockedListerContact
      ? (createdRequest.unlockedListerContact as ListerContact & { exactAddress?: string }).exactAddress || `${listing?.area}, Ibadan`
      : `${listing?.area}, Ibadan`;
    navigator.clipboard?.writeText(addr);
    setCopiedAddress(true);
    setTimeout(() => setCopiedAddress(false), 2000);
  };

  const unlockedLister: ListerContact = createdRequest?.unlockedListerContact || listing?.lister || {
    fullName: 'Lister',
    phone: '',
    whatsapp: '',
    memberSince: '',
    activeListingsCount: 0,
    responseRate: '—'
  };
  const propertyAddress = listing?.addressDescription || `${listing?.area || ''}, Ibadan`;

  if (!listing) {
    return (
      <div style={{ backgroundColor: '#F8FAFC', minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>
        <div style={{ textAlign: 'center', maxWidth: '440px', backgroundColor: '#FFFFFF', padding: '32px', borderRadius: '16px', border: '1px solid #E2E8F0' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#000052', marginBottom: '8px' }}>No Property Selected</h2>
          <p style={{ fontSize: '13.5px', color: '#64748B', marginBottom: '20px' }}>Please select a property from the marketplace before proceeding to checkout.</p>
          <button type="button" onClick={onBrowseListings} style={{ backgroundColor: '#000052', color: '#FFFFFF', padding: '10px 20px', borderRadius: '8px', fontWeight: 700, border: 'none', cursor: 'pointer' }}>
            Browse Available Properties
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: '#F8FAFC', minHeight: '100vh', paddingBottom: '80px' }}>
      {/* Distraction-Free Focused Checkout Header */}
      <div style={{ backgroundColor: '#FFFFFF', borderBottom: '1px solid #E2E8F0', padding: '14px 0' }}>
        <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <button 
              onClick={onBack}
              style={{ 
                display: 'inline-flex', 
                alignItems: 'center', 
                gap: '6px', 
                fontSize: '13.5px', 
                fontWeight: 700, 
                color: '#000052',
                background: 'none',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              <ArrowLeft size={16} />
              <span>Back to property</span>
            </button>

            <div style={{ width: '1px', height: '18px', backgroundColor: '#CBD5E1' }}></div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#16794A', fontWeight: 700, backgroundColor: '#E8F7EE', padding: '4px 10px', borderRadius: '999px' }}>
              <Lock size={12} />
              <span>256-Bit Encrypted Secure Checkout</span>
            </div>
          </div>

          <div style={{ fontSize: '13px', color: '#64748B' }}>
            Direct Landlord Access Pass · <span style={{ fontWeight: 700, color: '#000052' }}>Ibadan</span>
          </div>
        </div>
      </div>

      {/* Progress Stepper Bar */}
      <div style={{ backgroundColor: '#FFFFFF', borderBottom: '1px solid #E2E8F0', padding: '12px 0' }}>
        <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '12.5px', flexWrap: 'wrap' }}>
          <span style={{ color: '#16794A', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
            <CheckCircle2 size={14} /> 1. Review Property
          </span>
          <ChevronRight size={13} color="#94A3B8" />
          <span style={{ color: step === 'form' ? '#000052' : '#16794A', fontWeight: step === 'form' ? 800 : 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
            {step !== 'form' && <CheckCircle2 size={14} />} 2. Renter Information
          </span>
          <ChevronRight size={13} color="#94A3B8" />
          <span style={{ color: step === 'checking' ? '#000052' : step === 'confirmed' || step === 'paying' || step === 'unlocked' ? '#16794A' : '#94A3B8', fontWeight: step === 'checking' ? 800 : 600 }}>
            3. Vacancy Check
          </span>
          <ChevronRight size={13} color="#94A3B8" />
          <span style={{ color: step === 'confirmed' || step === 'paying' ? '#000052' : step === 'unlocked' ? '#16794A' : '#94A3B8', fontWeight: step === 'confirmed' || step === 'paying' ? 800 : 600 }}>
            4. Paystack ₦5,000
          </span>
          <ChevronRight size={13} color="#94A3B8" />
          <span style={{ color: step === 'unlocked' ? '#16794A' : '#94A3B8', fontWeight: step === 'unlocked' ? 800 : 600 }}>
            5. Direct Access Unlocked
          </span>
        </div>
      </div>

      {/* Main Checkout Container: 2-Column Split Layout */}
      <div className="container" style={{ marginTop: '30px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '32px', alignItems: 'start' }}>
          
          {/* LEFT COLUMN (62%): The Progressive Checkout Journey */}
          <div style={{ minWidth: 0, flex: '1 1 580px' }}>
            
            {/* STEP 1: Renter Verification & Contact Details Form */}
            {step === 'form' && (
              <div style={{ backgroundColor: '#FFFFFF', borderRadius: '18px', border: '1px solid #E2E8F0', padding: '28px', boxShadow: '0 4px 20px rgba(0,0,0,0.04)' }}>
                <div style={{ marginBottom: '22px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 800, color: '#16794A', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                    Stage 1 of 3 · Zero Risk
                  </span>
                  <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#000052', margin: '4px 0 6px' }}>
                    Renter Verification &amp; Contact Details
                  </h1>
                  <p style={{ fontSize: '13.5px', color: '#64748B', lineHeight: 1.5 }}>
                    Provide your contact details so we can verify vacancy directly with <b>{listing.lister.fullName}</b>. No payment card is required now.
                  </p>
                </div>

                {/* Free Guarantee Alert Callout */}
                <div style={{ 
                  backgroundColor: '#EFF6FF', 
                  border: '1.5px solid #BFDBFE', 
                  borderRadius: '12px', 
                  padding: '14px 18px', 
                  marginBottom: '24px',
                  display: 'flex',
                  gap: '12px',
                  alignItems: 'flex-start'
                }}>
                  <ShieldCheck size={20} color="#1D4ED8" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '13.5px', color: '#1E3A8A', marginBottom: '4px' }}>
                      Rentivo Vacancy Guarantee
                    </div>
                    <div style={{ fontSize: '12.5px', color: '#1E293B', lineHeight: 1.5 }}>
                      • <b>100% Free to submit:</b> No payment card needed today.<br />
                      • <b>Automated verification:</b> We email the landlord a one-click YES / NO link to confirm vacancy.<br />
                      • <b>Flat ₦5,000 fee:</b> Payable only if the landlord confirms the property is unoccupied.
                    </div>
                  </div>
                </div>

                <form onSubmit={handleSubmit}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', marginBottom: '24px' }}>
                    
                    {/* Full Name */}
                    <div>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#0F172A', marginBottom: '6px' }}>
                        Full Name
                      </label>
                      <input 
                        type="text" 
                        required 
                        value={name} 
                        onChange={(e) => setName(e.target.value)} 
                        placeholder="e.g. Adeola Johnson"
                        style={{ width: '100%', height: '44px', borderRadius: '10px', border: '1px solid #CBD5E1', padding: '0 14px', fontSize: '14px', backgroundColor: '#FFFFFF' }}
                      />
                    </div>

                    {/* WhatsApp Phone Number */}
                    <div>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#0F172A', marginBottom: '6px' }}>
                        Phone number
                      </label>
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <span style={{ 
                          height: '44px', 
                          padding: '0 12px', 
                          backgroundColor: '#F1F5F9', 
                          border: '1px solid #CBD5E1', 
                          borderRight: 'none', 
                          borderRadius: '10px 0 0 10px', 
                          display: 'flex', 
                          alignItems: 'center', 
                          fontSize: '13px', 
                          fontWeight: 700, 
                          color: '#334155' 
                        }}>
                          +234 (NG)
                        </span>
                        <input 
                          type="tel" 
                          required 
                          value={phone} 
                          onChange={(e) => setPhone(e.target.value)} 
                          placeholder="803 123 4567"
                          style={{ flex: 1, height: '44px', borderRadius: '0 10px 10px 0', border: '1px solid #CBD5E1', padding: '0 14px', fontSize: '14px', backgroundColor: '#FFFFFF' }}
                        />
                      </div>
                      <div style={{ fontSize: '12px', color: '#64748B', marginTop: '4px' }}>
                        Used on your request record. Vacancy updates and the landlord dossier are sent by email.
                      </div>
                    </div>

                    {/* Email Address */}
                    <div>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#0F172A', marginBottom: '6px' }}>
                        Email Address (For Official Receipt &amp; Dossier)
                      </label>
                      <input 
                        type="email" 
                        required 
                        value={email} 
                        onChange={(e) => setEmail(e.target.value)} 
                        placeholder="adeola@example.com"
                        style={{ width: '100%', height: '44px', borderRadius: '10px', border: '1px solid #CBD5E1', padding: '0 14px', fontSize: '14px', backgroundColor: '#FFFFFF' }}
                      />
                      <div style={{ fontSize: '12px', color: '#64748B', marginTop: '4px' }}>
                        Your official Paystack receipt, landlord direct contact details, and physical landmark address are dispatched here.
                      </div>
                    </div>

                    {/* Move-in Timeline & Inspection Preference (Researched Flow Enhancements) */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#0F172A', marginBottom: '6px' }}>
                          Move-in Timeframe
                        </label>
                        <select
                          value={moveInTimeframe}
                          onChange={(e) => setMoveInTimeframe(e.target.value)}
                          style={{ width: '100%', height: '44px', borderRadius: '10px', border: '1px solid #CBD5E1', padding: '0 12px', fontSize: '13px', backgroundColor: '#FFFFFF', color: '#0F172A' }}
                        >
                          <option value="Immediately (Within 2 weeks)">Immediately (Within 2 weeks)</option>
                          <option value="Within 1 month">Within 1 month</option>
                          <option value="Within 2-3 months">Within 2-3 months</option>
                        </select>
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#0F172A', marginBottom: '6px' }}>
                          Preferred Inspection Time
                        </label>
                        <select
                          value={inspectionWindow}
                          onChange={(e) => setInspectionWindow(e.target.value)}
                          style={{ width: '100%', height: '44px', borderRadius: '10px', border: '1px solid #CBD5E1', padding: '0 12px', fontSize: '13px', backgroundColor: '#FFFFFF', color: '#0F172A' }}
                        >
                          <option value="Weekday Morning (9am–12pm)">Weekday Morning (9am–12pm)</option>
                          <option value="Weekday Afternoon (1pm–5pm)">Weekday Afternoon (1pm–5pm)</option>
                          <option value="Weekend (Saturday/Sunday)">Weekend (Saturday/Sunday)</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#0F172A', marginBottom: '6px' }}>
                        Purpose of Tenancy
                      </label>
                      <select
                        value={leasePurpose}
                        onChange={(e) => setLeasePurpose(e.target.value)}
                        style={{ width: '100%', height: '44px', borderRadius: '10px', border: '1px solid #CBD5E1', padding: '0 12px', fontSize: '13px', backgroundColor: '#FFFFFF', color: '#0F172A' }}
                      >
                        <option value="Personal / Residential">Personal / Residential</option>
                        <option value="Family Relocation">Family Relocation</option>
                        <option value="Work / Job Transfer">Work / Job Transfer</option>
                        <option value="Student Housing / Scholar">Student Housing / Scholar</option>
                      </select>
                    </div>

                  </div>

                  {/* Submit CTA */}
                  <button 
                    type="submit" 
                    className="btn btn-primary btn-block btn-lg" 
                    disabled={loading}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '10px',
                      height: '50px',
                      fontSize: '15px',
                      fontWeight: 800,
                      backgroundColor: '#000052',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '999px',
                      cursor: 'pointer',
                      boxShadow: '0 4px 14px rgba(0, 0, 82, 0.2)'
                    }}
                  >
                    <span>{loading ? 'Submitting Request...' : 'Check Vacancy & Proceed (Free)'}</span>
                    <ArrowRight size={18} />
                  </button>
                  
                  <div style={{ textAlign: 'center', fontSize: '12px', color: '#64748B', marginTop: '12px' }}>
                    By clicking submit, you confirm you are requesting verified landlord details for this Ibadan property.
                  </div>
                </form>
              </div>
            )}

            {/* STEP 2: Live Automated Vacancy Verification Radar */}
            {step === 'checking' && (
              <div style={{ backgroundColor: '#FFFFFF', borderRadius: '18px', border: '1px solid #E2E8F0', padding: '36px 28px', textAlign: 'center', boxShadow: '0 4px 20px rgba(0,0,0,0.04)' }}>
                <div style={{ 
                  width: '72px', 
                  height: '72px', 
                  borderRadius: '50%', 
                  backgroundColor: '#EFF6FF', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  margin: '0 auto 20px', 
                  color: '#1D4ED8',
                  border: '2px solid #BFDBFE'
                }}>
                  <Clock size={36} className="animate-spin" />
                </div>

                <span style={{ fontSize: '11px', fontWeight: 800, color: '#1D4ED8', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                  Stage 2 of 3 · Live Automated Check
                </span>
                <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#000052', margin: '6px 0 8px' }}>
                  Checking Vacancy with Landlord
                </h2>
                <p style={{ fontSize: '14px', color: '#475569', maxWidth: '460px', margin: '0 auto 24px', lineHeight: 1.6 }}>
                  We emailed <b>{listing.lister.fullName}</b> a one-click YES / NO link to confirm the {listing.area} listing is vacant. You will not be asked to pay until they confirm.
                </p>

                {isDemoSimulator && (
                <div style={{ 
                  backgroundColor: '#F8FAFC', 
                  padding: '20px', 
                  borderRadius: '14px', 
                  border: '1.5px dashed #CBD5E1',
                  textAlign: 'left',
                  maxWidth: '500px',
                  margin: '0 auto'
                }}>
                  <div style={{ fontSize: '11px', fontWeight: 800, color: '#000052', letterSpacing: '0.05em', marginBottom: '6px', textTransform: 'uppercase' }}>
                    Live Gateway Testing Simulator (Reviewer Controls)
                  </div>
                  <p style={{ fontSize: '12.5px', color: '#64748B', marginBottom: '14px', lineHeight: 1.4 }}>
                    In production, the landlord replies from the email YES / NO link. Use these controls only for local QA:
                  </p>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button 
                      type="button"
                      className="btn btn-sm"
                      onClick={() => handleSimulateListerReply('YES')}
                      disabled={loading}
                      style={{
                        flex: 1,
                        backgroundColor: '#16794A',
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '10px 14px',
                        fontSize: '13px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px'
                      }}
                    >
                      <CheckCircle2 size={15} />
                      <span>Landlord: Available (YES)</span>
                    </button>
                    <button 
                      type="button"
                      className="btn btn-sm"
                      onClick={() => handleSimulateListerReply('NO')}
                      disabled={loading}
                      style={{
                        flex: 1,
                        backgroundColor: '#FFFFFF',
                        color: '#B42318',
                        border: '1px solid #FCA5A5',
                        borderRadius: '8px',
                        padding: '10px 14px',
                        fontSize: '13px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px'
                      }}
                    >
                      <AlertTriangle size={15} />
                      <span>Landlord: Taken (NO)</span>
                    </button>
                  </div>
                </div>
                )}
              </div>
            )}

            {/* STEP 3: Confirmed Available - Prompt ₦5,000 Paystack */}
            {step === 'confirmed' && (
              <div style={{ backgroundColor: '#FFFFFF', borderRadius: '18px', border: '1px solid #E2E8F0', padding: '28px', boxShadow: '0 4px 20px rgba(0,0,0,0.04)' }}>
                <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                  <div style={{ 
                    width: '64px', 
                    height: '64px', 
                    borderRadius: '50%', 
                    backgroundColor: '#E8F7EE', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    margin: '0 auto 12px', 
                    color: '#16794A',
                    border: '1.5px solid #A7F3D0'
                  }}>
                    <CheckCircle2 size={34} />
                  </div>

                  <span style={{ fontSize: '11px', fontWeight: 800, color: '#16794A', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                    Stage 3 of 3 · Vacancy Confirmed
                  </span>
                  <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#000052', margin: '4px 0 6px' }}>
                    Property Confirmed Vacant &amp; Ready!
                  </h2>
                  <p style={{ fontSize: '13.5px', color: '#475569', maxWidth: '440px', margin: '0 auto' }}>
                    <b>{listing.lister.fullName}</b> has verified that <b>{listing.title}</b> is currently unoccupied and ready for immediate physical inspection.
                  </p>
                </div>

                {/* Promotional Launch Banner (FR-5.3 & FR-5.4) */}
                {promoStats.isActive ? (
                  <div style={{
                    backgroundColor: '#F3E8FF',
                    border: '1.5px solid #BE89FF',
                    borderRadius: '14px',
                    padding: '16px 18px',
                    marginBottom: '18px',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px'
                  }}>
                    <Sparkles size={22} color="#7E22CE" style={{ flexShrink: 0, marginTop: '2px' }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '13.5px', fontWeight: 800, color: '#000052' }}>
                          First-100-Users Launch Promotion Active!
                        </span>
                        <span style={{
                          fontSize: '11px',
                          fontWeight: 800,
                          backgroundColor: '#7E22CE',
                          color: '#FFFFFF',
                          padding: '2px 8px',
                          borderRadius: '999px'
                        }}>
                          {promoStats.remaining} waivers left
                        </span>
                      </div>
                      <p style={{ fontSize: '12.5px', color: '#581C87', margin: '4px 0 0', lineHeight: 1.45 }}>
                        As part of Rentivo's Ibadan pilot launch, the flat ₦5,000 access fee is <b>100% waived</b> for the first 100 qualifying renters. Unlock verified direct contact at <b>₦0</b>.
                      </p>
                    </div>
                  </div>
                ) : null}

                {/* High-Contrast Transparent Fee Breakdown Card */}
                <div style={{ 
                  backgroundColor: '#F8FAFC', 
                  border: '1.5px solid #CBD5E1', 
                  borderRadius: '14px', 
                  padding: '20px', 
                  marginBottom: '20px' 
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <span style={{ fontSize: '14px', fontWeight: 600, color: '#334155' }}>Standard Access Fee:</span>
                    <span style={{
                      fontSize: '16px',
                      fontWeight: 700,
                      color: promoStats.isActive ? '#94A3B8' : '#000052',
                      textDecoration: promoStats.isActive ? 'line-through' : 'none',
                      fontFamily: 'monospace'
                    }}>
                      ₦5,000.00
                    </span>
                  </div>

                  {promoStats.isActive && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', color: '#7E22CE' }}>
                      <span style={{ fontSize: '13px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Gift size={14} />
                        <span>First-100-Users Promotion Waiver:</span>
                      </span>
                      <span style={{ fontSize: '15px', fontWeight: 800, fontFamily: 'monospace' }}>-₦5,000.00</span>
                    </div>
                  )}

                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    paddingTop: '10px',
                    borderTop: '1.5px solid #E2E8F0',
                    marginBottom: '12px'
                  }}>
                    <span style={{ fontSize: '14.5px', fontWeight: 800, color: '#000052' }}>Total Due Today:</span>
                    <span style={{ fontSize: '22px', fontWeight: 800, color: promoStats.isActive ? '#16794A' : '#000052', fontFamily: 'monospace' }}>
                      {promoStats.isActive ? '₦0.00 (FREE)' : '₦5,000.00'}
                    </span>
                  </div>

                  <div style={{ borderTop: '1px dashed #CBD5E1', paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#16794A' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Check size={14} />
                        <span>Traditional Agent Commission Saved:</span>
                      </span>
                      <span style={{ fontWeight: 800 }}>~₦85,000.00</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#16794A' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Check size={14} />
                        <span>Upfront Roadside Inspection / Gate Fees:</span>
                      </span>
                      <span style={{ fontWeight: 800 }}>₦0.00</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748B', marginTop: '6px', fontSize: '12px' }}>
                      <Lock size={13} />
                      <span>Unlocks direct phone number, WhatsApp link, physical landmark address, and PDF receipt.</span>
                    </div>
                  </div>
                </div>

                {promoStats.isActive ? (
                  <button 
                    type="button"
                    className="btn btn-primary btn-block btn-lg"
                    onClick={handleClaimWaiver}
                    disabled={loading}
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      gap: '10px',
                      height: '52px',
                      fontSize: '16px',
                      fontWeight: 800,
                      backgroundColor: '#16794A',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '999px',
                      cursor: 'pointer',
                      boxShadow: '0 4px 14px rgba(22, 121, 74, 0.3)',
                      marginBottom: '12px'
                    }}
                  >
                    <CheckCircle2 size={20} />
                    <span>{loading ? 'Unlocking Dossier...' : 'Claim Launch Waiver & Unlock Contact (₦0)'}</span>
                    <ArrowRight size={18} />
                  </button>
                ) : (
                  <button 
                    type="button"
                    className="btn btn-primary btn-block btn-lg"
                    onClick={handlePay}
                    disabled={loading}
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      gap: '10px',
                      height: '52px',
                      fontSize: '16px',
                      fontWeight: 800,
                      backgroundColor: '#000052',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '999px',
                      cursor: 'pointer',
                      boxShadow: '0 4px 14px rgba(0, 0, 82, 0.25)',
                      marginBottom: '12px'
                    }}
                  >
                    <CreditCard size={20} />
                    <span>Pay ₦5,000 with Paystack</span>
                    <ArrowRight size={18} />
                  </button>
                )}

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '12px', color: '#64748B' }}>
                  <ShieldCheck size={14} color="#16794A" />
                  <span>{promoStats.isActive ? 'Zero debit card entry required · Instant Email Receipt & Dossier' : 'Secured by Paystack 256-bit SSL · Instant Email Receipt & Dossier'}</span>
                </div>
              </div>
            )}

            {/* STEP 4: Paying Simulation */}
            {step === 'paying' && (
              <div style={{ backgroundColor: '#FFFFFF', borderRadius: '18px', border: '1px solid #E2E8F0', padding: '48px 28px', textAlign: 'center', boxShadow: '0 4px 20px rgba(0,0,0,0.04)' }}>
                <div style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  backgroundColor: '#EFF6FF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 18px',
                  color: '#1D4ED8'
                }}>
                  <CreditCard size={32} className="animate-spin" />
                </div>
                <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#000052', marginBottom: '8px' }}>
                  Processing ₦5,000 Payment via Paystack...
                </h3>
                <p style={{ fontSize: '13.5px', color: '#64748B', maxWidth: '380px', margin: '0 auto' }}>
                  Connecting with Paystack secure gateway. Unlocking landlord contact dossier and generating transactional email receipt.
                </p>
              </div>
            )}

            {/* STEP 5: Contact Unlocked & Email Dispatched */}
            {step === 'unlocked' && (
              <div style={{ backgroundColor: '#FFFFFF', borderRadius: '18px', border: '1px solid #E2E8F0', padding: '28px', boxShadow: '0 4px 20px rgba(0,0,0,0.04)' }}>
                <div style={{ textAlign: 'center', marginBottom: '18px' }}>
                  <div style={{ 
                    width: '60px', 
                    height: '60px', 
                    borderRadius: '50%', 
                    backgroundColor: '#E8F7EE', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    margin: '0 auto 10px', 
                    color: '#16794A',
                    border: '1.5px solid #A7F3D0'
                  }}>
                    <CheckCircle2 size={32} />
                  </div>

                  <span style={{ fontSize: '11px', fontWeight: 800, color: '#16794A', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                    {createdRequest?.isPromotionWaiverApplied ? 'Launch Promotion Access Unlocked' : 'Access Unlocked & Paid'}
                  </span>
                  <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#000052', margin: '4px 0' }}>
                    Direct Landlord Contact Unlocked!
                  </h2>
                  <p style={{ fontSize: '13px', color: '#64748B' }}>
                    {createdRequest?.isPromotionWaiverApplied 
                      ? 'First-100-Users Launch Waiver applied (₦0 Access Fee). You can now contact the verified lister directly.'
                      : 'Payment of ₦5,000 verified. You can now contact the verified lister directly.'}
                  </p>
                </div>

                {/* Email Dispatched Banner with Interactive Preview Button */}
                <div style={{
                  backgroundColor: '#E8F7EE',
                  border: '1.5px solid #16794A',
                  borderRadius: '12px',
                  padding: '14px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                  marginBottom: '20px',
                  flexWrap: 'wrap'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <MailCheck size={20} color="#16794A" style={{ flexShrink: 0 }} />
                    <div style={{ fontSize: '12.5px', color: '#166534' }}>
                      <span style={{ fontWeight: 800 }}>Email Dispatched:</span> Official receipt and landlord dossier sent to <b>{email}</b>.
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setEmailPreviewOpen(true)}
                    style={{
                      backgroundColor: '#16794A',
                      color: '#FFFFFF',
                      border: 'none',
                      padding: '7px 14px',
                      borderRadius: '8px',
                      fontSize: '12px',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px'
                    }}
                  >
                    <span>View Email</span>
                    <ExternalLink size={12} />
                  </button>
                </div>

                {/* Verified Landlord Contact Box */}
                <div style={{ 
                  backgroundColor: '#F8FAFC', 
                  border: '1.5px solid #000052', 
                  borderRadius: '14px', 
                  padding: '20px', 
                  marginBottom: '20px' 
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 800, color: '#000052', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Verified Lister Contact Dossier
                    </span>
                    <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 600, backgroundColor: '#E2E8F0', padding: '2px 8px', borderRadius: '4px' }}>
                      Ref: {createdRequest?.id || 'REQ-8492'}
                    </span>
                  </div>

                  <div style={{ fontSize: '18px', fontWeight: 800, color: '#000052', margin: '2px 0' }}>
                    {unlockedLister.fullName}
                  </div>
                  <div style={{ fontSize: '12.5px', color: '#64748B', marginBottom: '16px' }}>
                    {unlockedLister.agencyName || 'Direct Landlord'} · Member since {unlockedLister.memberSince} · {unlockedLister.responseRate} Response Rate
                  </div>

                  {/* Contact Action Buttons */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
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
                          gap: '8px',
                          backgroundColor: '#000052',
                          color: '#FFFFFF',
                          borderRadius: '8px',
                          padding: '11px 16px',
                          fontSize: '14px',
                          fontWeight: 700,
                          textDecoration: 'none'
                        }}
                      >
                        <Phone size={16} />
                        <span>Call {unlockedLister.phone}</span>
                      </a>
                      <button
                        type="button"
                        onClick={handleCopyPhone}
                        style={{
                          backgroundColor: '#FFFFFF',
                          border: '1px solid #CBD5E1',
                          borderRadius: '8px',
                          padding: '0 14px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          fontSize: '12.5px',
                          fontWeight: 700,
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
                        gap: '8px', 
                        backgroundColor: '#25D366', 
                        color: '#FFFFFF',
                        borderRadius: '8px',
                        padding: '11px 16px',
                        fontSize: '14px',
                        fontWeight: 700,
                        textDecoration: 'none'
                      }}
                    >
                      <MessageCircle size={16} />
                      <span>Chat on WhatsApp Directly</span>
                    </a>

                    {/* Physical Landmark Address */}
                    <div style={{
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #CBD5E1',
                      borderRadius: '8px',
                      padding: '12px 14px'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <MapPin size={13} className="text-navy" />
                          <span>EXACT PHYSICAL LANDMARK ADDRESS</span>
                        </div>
                        <button
                          type="button"
                          onClick={handleCopyAddress}
                          style={{
                            border: 'none',
                            background: 'none',
                            cursor: 'pointer',
                            fontSize: '12px',
                            fontWeight: 700,
                            color: copiedAddress ? '#16794A' : '#64748B',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          {copiedAddress ? <Check size={13} /> : <Copy size={13} />}
                          <span>{copiedAddress ? 'Copied' : 'Copy'}</span>
                        </button>
                      </div>
                      <div style={{ fontSize: '13.5px', color: '#0F172A', fontWeight: 600 }}>
                        {propertyAddress}
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
                  <button 
                    type="button"
                    className="btn btn-outline" 
                    onClick={() => window.print()}
                    style={{
                      flex: 1,
                      borderRadius: '8px',
                      padding: '11px',
                      fontSize: '13.5px',
                      fontWeight: 700,
                      borderColor: '#CBD5E1',
                      color: '#334155',
                      backgroundColor: '#FFFFFF',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px'
                    }}
                  >
                    <Printer size={15} />
                    <span>Print / PDF Receipt</span>
                  </button>

                  <button 
                    type="button"
                    className="btn btn-primary" 
                    onClick={onBrowseListings}
                    style={{
                      flex: 1,
                      borderRadius: '8px',
                      padding: '11px',
                      fontSize: '13.5px',
                      fontWeight: 700,
                      backgroundColor: '#000052',
                      color: '#FFFFFF',
                      border: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    Return to Marketplace
                  </button>
                </div>
              </div>
            )}

            {/* STEP 6: Unavailable / Lister replied NO */}
            {step === 'unavailable' && (
              <div style={{ backgroundColor: '#FFFFFF', borderRadius: '18px', border: '1px solid #E2E8F0', padding: '36px 28px', textAlign: 'center', boxShadow: '0 4px 20px rgba(0,0,0,0.04)' }}>
                <div style={{ 
                  width: '64px', 
                  height: '64px', 
                  borderRadius: '50%', 
                  backgroundColor: '#FEE4E2', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  margin: '0 auto 16px', 
                  color: '#B42318',
                  border: '1.5px solid #FCA5A5'
                }}>
                  <AlertTriangle size={34} />
                </div>

                <h3 style={{ fontSize: '22px', fontWeight: 800, color: '#000052', marginBottom: '8px' }}>
                  Property No Longer Vacant
                </h3>
                <p style={{ fontSize: '13.5px', color: '#475569', marginBottom: '20px', maxWidth: '420px', margin: '0 auto 20px', lineHeight: 1.5 }}>
                  The landlord verified that <b>{listing.title}</b> in <b>{listing.area}</b> has just been rented out or taken off the market.
                </p>

                <div style={{ 
                  backgroundColor: '#E8F7EE', 
                  border: '1.5px solid #A7F3D0', 
                  padding: '14px 18px', 
                  borderRadius: '12px', 
                  marginBottom: '22px', 
                  color: '#16794A', 
                  fontWeight: 700, 
                  fontSize: '13.5px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}>
                  <ShieldCheck size={18} />
                  <span>Zero charges made. Your payment card was never debited.</span>
                </div>

                <button 
                  type="button"
                  className="btn btn-primary btn-block btn-lg" 
                  onClick={onBrowseListings}
                  style={{
                    width: '100%',
                    height: '48px',
                    borderRadius: '999px',
                    fontSize: '15px',
                    fontWeight: 700,
                    backgroundColor: '#000052',
                    color: '#FFFFFF',
                    border: 'none',
                    cursor: 'pointer'
                  }}
                >
                  Browse Other Available Listings in Ibadan
                </button>
              </div>
            )}

          </div>

          {/* RIGHT COLUMN (38%): Sticky Property & Order Summary Sidebar */}
          <div style={{ minWidth: 0, flex: '1 1 360px', position: 'sticky', top: '24px' }}>
            <div style={{ backgroundColor: '#FFFFFF', borderRadius: '18px', border: '1.5px solid #E2E8F0', padding: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.04)' }}>
              
              <div style={{ fontSize: '11px', fontWeight: 800, color: '#64748B', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '14px' }}>
                Property Order Summary
              </div>

              {/* Property Snapshot Card */}
              <div style={{ display: 'flex', gap: '14px', marginBottom: '18px', paddingBottom: '16px', borderBottom: '1px solid #E2E8F0' }}>
                <img 
                  src={listing.photos[0]} 
                  alt={listing.title} 
                  style={{ width: '80px', height: '80px', borderRadius: '12px', objectFit: 'cover', flexShrink: 0 }} 
                />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#000052', backgroundColor: '#EFF6FF', display: 'inline-block', padding: '2px 7px', borderRadius: '4px', marginBottom: '4px' }}>
                    {listing.type}
                  </div>
                  <div style={{ fontWeight: 800, fontSize: '15px', color: '#000052', lineHeight: 1.3, marginBottom: '4px' }}>
                    {listing.title}
                  </div>
                  <div style={{ fontSize: '12.5px', color: '#64748B', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <MapPin size={12} color="#000052" />
                    <span>{listing.area}, Ibadan</span>
                  </div>
                </div>
              </div>

              {/* Inspection Audit Proof */}
              {listing.verificationStatus === 'verified' && (
                <div style={{ 
                  backgroundColor: '#E8F7EE', 
                  border: '1px solid #A7F3D0', 
                  borderRadius: '10px', 
                  padding: '10px 12px', 
                  marginBottom: '18px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <ShieldCheck size={16} color="#16794A" style={{ flexShrink: 0 }} />
                  <div style={{ fontSize: '12px', color: '#166534', fontWeight: 700 }}>
                    Physically Verified On-Site by Rentivo
                  </div>
                </div>
              )}

              {/* Annual Rent Price Indicator */}
              <div style={{ marginBottom: '18px', paddingBottom: '16px', borderBottom: '1px solid #E2E8F0' }}>
                <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 600 }}>Annual Property Rent:</div>
                <div style={{ fontSize: '24px', fontWeight: 800, color: '#000052', marginTop: '2px' }}>
                  {formatNaira(listing.price)}
                  <span style={{ fontSize: '13px', fontWeight: 500, color: '#64748B', marginLeft: '4px' }}>
                    {formatPeriod(listing.pricePeriod)}
                  </span>
                </div>
              </div>

              {/* Fee Breakdown Table */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px', fontSize: '13px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
                  <span>Direct Access Pass:</span>
                  <span style={{ fontWeight: 700, color: '#0F172A' }}>₦5,000.00</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#16794A' }}>
                  <span>Traditional Agent Fee Saved:</span>
                  <span style={{ fontWeight: 700 }}>~₦85,000.00</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#16794A' }}>
                  <span>Roadside Viewing / Gate Fee:</span>
                  <span style={{ fontWeight: 700 }}>₦0.00</span>
                </div>
                <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: '10px', marginTop: '2px', display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '16px', color: '#000052' }}>
                  <span>Due Today:</span>
                  <span>
                    {step === 'form' || step === 'checking' || step === 'unavailable'
                      ? '₦0.00 (Pending Check)'
                      : createdRequest?.isPromotionWaiverApplied || (promoStats.isActive && step === 'confirmed')
                        ? '₦0.00'
                        : '₦5,000.00'}
                  </span>
                </div>
              </div>

              {/* Guarantees List */}
              <div style={{ backgroundColor: '#F8FAFC', borderRadius: '12px', padding: '14px', border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px', color: '#334155' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <ShieldCheck size={14} color="#16794A" />
                  <span>100% Direct Landlord Mandate Audit</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Lock size={14} color="#16794A" />
                  <span>256-Bit SSL Secured Payment via Paystack</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <MailCheck size={14} color="#16794A" />
                  <span>Instant Transactional Email Receipt</span>
                </div>
              </div>

              {/* Need Help Box */}
              <div style={{ marginTop: '18px', textAlign: 'center', fontSize: '12px', color: '#64748B' }}>
                Questions about this checkout?{' '}
                <a 
                  href="https://wa.me/2348000000000?text=Hello%20Rentivo%20Support,%20I%20have%20a%20question%20about%20my%20checkout" 
                  target="_blank" 
                  rel="noreferrer"
                  style={{ color: '#000052', fontWeight: 700, textDecoration: 'none' }}
                >
                  Chat with Rentivo Support
                </a>
              </div>

            </div>
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
    </div>
  );
};
