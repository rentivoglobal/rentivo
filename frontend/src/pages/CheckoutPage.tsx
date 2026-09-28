import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
  Lock, 
  ExternalLink,
  Printer,
  Sparkles,
  Gift,
  Check as CheckIcon,
  Mail
} from 'lucide-react';
import { Listing, AccessRequest, ListerContact } from '../types';
import { requestsService } from '../services/requestsService';
import { formatNaira } from '../utils/formatters';
import { EmailNotificationModal } from '../components/EmailNotificationModal';
import { ACCESS_FEE_KOBO, paystackPublicKey } from '../lib/config';
import { openPaystackCheckout } from '../lib/paystack';
import { useAuth } from '../contexts/AuthContext';
import '../styles/checkout.css';

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
  onBack,
  onBrowseListings
}) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [step, setStep] = useState<'confirmed' | 'paying' | 'unlocked' | 'unavailable' | 'checking'>('confirmed');
  const [createdRequest, setCreatedRequest] = useState<AccessRequest | null>(existingRequest || null);
  
  const [email, setEmail] = useState(user?.email || existingRequest?.renterEmail || '');
  const [verifyingPayment, setVerifyingPayment] = useState(false);
  const [loading, setLoading] = useState(false);

  // Promo code / waiver
  const [promoCodeInput, setPromoCodeInput] = useState('');
  const [appliedPromoCode, setAppliedPromoCode] = useState<string | null>(null);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [showPromoBox, setShowPromoBox] = useState(false);

  // Overlay / modal states matching rentivo-checkout (2).html
  const [overlayStatus, setOverlayStatus] = useState<'idle' | 'opening' | 'confirming' | 'success'>('idle');

  // Copy states
  const [copiedPhone, setCopiedPhone] = useState(false);
  const [copiedAddress, setCopiedAddress] = useState(false);

  // Email preview drawer
  const [emailPreviewOpen, setEmailPreviewOpen] = useState(false);

  useEffect(() => {
    if (!existingRequest) return;
    setCreatedRequest(existingRequest);
    if (existingRequest.renterEmail) {
      setEmail(existingRequest.renterEmail);
    }
    if (existingRequest.status === 'paid') {
      setStep('unlocked');
    } else if (existingRequest.status === 'unavailable') {
      setStep('unavailable');
    } else if (existingRequest.status === 'confirmed' || existingRequest.status === 'payment_pending') {
      setStep('confirmed');
    } else {
      setStep('checking');
    }
  }, [existingRequest]);

  // Handle Paystack redirect with reference/trxref in query string
  useEffect(() => {
    const ref = searchParams.get('reference') || searchParams.get('trxref');
    if (!ref || !createdRequest || createdRequest.status === 'paid' || verifyingPayment) return;

    let isMounted = true;
    const verifyRedirect = async () => {
      setVerifyingPayment(true);
      setOverlayStatus('confirming');
      try {
        const verifyRes = await requestsService.verifyPaystack(createdRequest.id, ref);
        if (!isMounted) return;
        if (verifyRes.success && verifyRes.request) {
          setCreatedRequest(verifyRes.request);
          setStep('unlocked');
          setOverlayStatus('success');
        } else {
          for (let i = 0; i < 8; i += 1) {
            const latest = await requestsService.getRequestById(createdRequest.id);
            if (!isMounted) return;
            if (latest?.status === 'paid') {
              setCreatedRequest(latest);
              setStep('unlocked');
              setOverlayStatus('success');
              break;
            }
            await new Promise((r) => setTimeout(r, 1000));
          }
        }
      } catch (err) {
        console.error('Failed to verify redirect payment:', err);
        if (isMounted) {
          setOverlayStatus('idle');
          setStep('confirmed');
        }
      } finally {
        if (isMounted) setVerifyingPayment(false);
        try {
          const newParams = new URLSearchParams(window.location.search);
          newParams.delete('reference');
          newParams.delete('trxref');
          const cleanUrl = window.location.pathname + (newParams.toString() ? `?${newParams.toString()}` : '');
          window.history.replaceState({}, '', cleanUrl);
        } catch (_e) {
          // Ignore
        }
      }
    };

    void verifyRedirect();

    return () => {
      isMounted = false;
    };
  }, [searchParams, createdRequest?.id, createdRequest?.status, verifyingPayment]);

  const handleApplyPromoCode = () => {
    if (!promoCodeInput.trim()) {
      setPromoError('Please enter a code');
      return;
    }
    const res = requestsService.validatePromoCode(promoCodeInput);
    if (res.valid) {
      setAppliedPromoCode(promoCodeInput.trim().toUpperCase());
      setPromoError(null);
    } else {
      setPromoError(res.message);
    }
  };

  const handleRemovePromoCode = () => {
    setAppliedPromoCode(null);
    setPromoCodeInput('');
    setPromoError(null);
  };

  const handleClaimWaiver = async () => {
    if (!createdRequest) return;
    setLoading(true);
    setOverlayStatus('confirming');
    setPromoError(null);
    try {
      const waived = await requestsService.claimPromotionWaiver(createdRequest.id, appliedPromoCode || undefined, listing?.lister);
      if (waived) {
        setCreatedRequest(waived);
        setStep('unlocked');
        setOverlayStatus('success');
      }
    } catch (e: any) {
      console.error(e);
      setPromoError(e?.message || 'Failed to claim waiver.');
      setOverlayStatus('idle');
    } finally {
      setLoading(false);
    }
  };

  const handlePay = async () => {
    if (!createdRequest) return;

    if (appliedPromoCode) {
      await handleClaimWaiver();
      return;
    }

    setOverlayStatus('opening');
    setLoading(true);

    try {
      if (paystackPublicKey) {
        const init = await requestsService.initializePaystack(createdRequest.id, email || user?.email || 'renter@rentivos.com.ng');
        
        // Brief animation transition matching rentivo-checkout (2).html
        setTimeout(async () => {
          try {
            const checkoutRes = await openPaystackCheckout({
              email: email || user?.email || 'renter@rentivos.com.ng',
              amountKobo: ACCESS_FEE_KOBO,
              reference: init.reference,
              metadata: { requestId: createdRequest.id }
            });

            setOverlayStatus('confirming');
            const refToVerify = checkoutRes?.reference || init.reference;
            const verifyRes = await requestsService.verifyPaystack(createdRequest.id, refToVerify);
            if (verifyRes.success && verifyRes.request) {
              setCreatedRequest(verifyRes.request);
              setStep('unlocked');
              setOverlayStatus('success');
              return;
            }

            for (let i = 0; i < 8; i += 1) {
              const latest = await requestsService.getRequestById(createdRequest.id);
              if (latest?.status === 'paid') {
                setCreatedRequest(latest);
                setStep('unlocked');
                setOverlayStatus('success');
                return;
              }
              await new Promise((r) => setTimeout(r, 1000));
            }
          } catch (checkoutErr) {
            console.warn('Paystack popup dismissed or error:', checkoutErr);
            setOverlayStatus('idle');
          } finally {
            setLoading(false);
          }
        }, 600);
      } else {
        // Fallback / simulator
        setTimeout(async () => {
          setOverlayStatus('confirming');
          setTimeout(async () => {
            const paid = await requestsService.completePayment(createdRequest.id, listing?.lister);
            if (paid) {
              setCreatedRequest(paid);
              setStep('unlocked');
              setOverlayStatus('success');
            } else {
              setOverlayStatus('idle');
            }
            setLoading(false);
          }, 800);
        }, 600);
      }
    } catch (err) {
      console.error('Payment initiation error:', err);
      setOverlayStatus('idle');
      setLoading(false);
    }
  };

  const handleCopyPhone = () => {
    const ph = createdRequest?.unlockedListerContact?.phone || listing?.lister?.phone || '';
    if (ph) {
      navigator.clipboard?.writeText(ph);
      setCopiedPhone(true);
      setTimeout(() => setCopiedPhone(false), 2000);
    }
  };

  const handleCopyAddress = () => {
    const addr = createdRequest?.unlockedListerContact
      ? (createdRequest.unlockedListerContact as ListerContact & { exactAddress?: string }).exactAddress || `${listing?.area}, Ibadan`
      : `${listing?.area}, Ibadan`;
    if (addr) {
      navigator.clipboard?.writeText(addr);
      setCopiedAddress(true);
      setTimeout(() => setCopiedAddress(false), 2000);
    }
  };

  const unlockedLister: ListerContact = createdRequest?.unlockedListerContact || listing?.lister || {
    fullName: 'Property Owner',
    phone: '',
    whatsapp: '',
    memberSince: '2024',
    activeListingsCount: 1,
    responseRate: '100%'
  };

  const cleanPhone = unlockedLister.phone ? unlockedLister.phone.replace(/\s+/g, '') : '';
  const cleanWa = (unlockedLister.whatsapp || unlockedLister.phone || '').replace(/\D/g, '');
  const propertyAddress = createdRequest?.unlockedListerContact
    ? (createdRequest.unlockedListerContact as ListerContact & { exactAddress?: string }).exactAddress || listing?.addressDescription || `${listing?.area || ''}, Ibadan`
    : listing?.addressDescription || `${listing?.area || ''}, Ibadan`;
  const referenceId = createdRequest?.id ? `RQ-${createdRequest.id.slice(0, 5).toUpperCase()}` : 'RQ-20604';

  if (!listing) {
    return (
      <div className="checkout-flow" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '40px 20px' }}>
        <div style={{ textAlign: 'center', maxWidth: '420px', background: 'var(--surface)', padding: '32px', borderRadius: 'var(--r-m)', border: '1px solid var(--border)' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--navy)', marginBottom: '8px' }}>No Property Selected</h2>
          <p style={{ fontSize: '0.88rem', color: 'var(--ink-soft)', marginBottom: '20px' }}>Please select a property from the marketplace before proceeding to checkout.</p>
          <button type="button" onClick={onBrowseListings} className="btn btn-accent">
            Browse Properties
          </button>
        </div>
      </div>
    );
  }

  const propertyPhoto = listing.photos?.[0] || 'https://ik.imagekit.io/3unwhixxd/Property%20type.png';

  return (
    <div className="checkout-flow">
      {/* Header matching rentivo-checkout (2).html */}
      <header className="checkout-topbar">
        <div className="topbar-row">
          <button className="back-btn" onClick={onBack} aria-label="Back">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <div className="topbar-title">Checkout</div>
          <span className="secure-pill">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="5" y="10" width="14" height="10" rx="2" />
              <path d="M8 10V7a4 4 0 0 1 8 0v3" />
            </svg>
            Secure
          </span>
        </div>
      </header>

      {/* Mini Progress Stepper matching rentivo-checkout (2).html */}
      <div className="mini-steps">
        <div className={`mini-step ${step !== 'unavailable' ? 'done' : ''}`}>
          <span className="dot">{step === 'unavailable' ? '✕' : '✓'}</span>
          {step === 'unavailable' ? 'Unavailable' : 'Confirmed'}
        </div>
        <div className={`mini-line ${step === 'unlocked' ? 'done' : ''}`} />
        <div className={`mini-step ${step === 'unlocked' ? 'done' : step === 'confirmed' || step === 'paying' ? 'now' : ''}`}>
          <span className="dot">{step === 'unlocked' ? '✓' : '2'}</span>
          Pay
        </div>
        <div className={`mini-line ${step === 'unlocked' ? 'done' : ''}`} />
        <div className={`mini-step ${step === 'unlocked' ? 'now' : ''}`}>
          <span className="dot">{step === 'unlocked' ? '✓' : '3'}</span>
          Connect
        </div>
      </div>

      {/* Main Container Shell */}
      <div className="shell view-enter">
        <div className="main-card">

          {/* Property Hero Photo & Status Badge */}
          <div className="hero-photo">
            {step === 'unlocked' ? (
              <span className="hero-badge">
                <CheckIcon size={13} strokeWidth={2.4} />
                Contact unlocked
              </span>
            ) : step === 'unavailable' ? (
              <span className="hero-badge badge-danger">
                <AlertTriangle size={13} strokeWidth={2.4} />
                Already taken
              </span>
            ) : (
              <span className="hero-badge">
                <CheckIcon size={13} strokeWidth={2.4} />
                Confirmed available
              </span>
            )}
            <img src={propertyPhoto} alt={listing.title} />
          </div>

          {/* Section 1: Property Title & Meta */}
          <div className="sect">
            <h1 className="prop-title">{listing.title}</h1>
            <div className="prop-meta">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s7-6.5 7-12a7 7 0 1 0-14 0c0 5.5 7 12 7 12z" />
                <circle cx="12" cy="10" r="2.5" />
              </svg>
              {listing.addressDescription || `${listing.area}, Ibadan`}
            </div>
          </div>

          {/* STEP: CONFIRMED / PAYMENT PENDING */}
          {step === 'confirmed' && (
            <>
              {/* Section 2: Fee Breakdown */}
              <div className="sect">
                <div className="fee-row">
                  <span className="lbl">Rentivo access fee</span>
                  <span>₦5,000</span>
                </div>
                <div className="fee-row">
                  <span className="lbl">Processing fee</span>
                  <span>₦0</span>
                </div>

                {appliedPromoCode && (
                  <div className="fee-row" style={{ color: 'var(--lavender-deep)', fontWeight: 700 }}>
                    <span className="lbl" style={{ color: 'var(--lavender-deep)' }}>
                      Promo waiver ({appliedPromoCode})
                    </span>
                    <span>-₦5,000</span>
                  </div>
                )}

                <div className="fee-row total">
                  <span className="lbl">Total due</span>
                  <span className="amt">{appliedPromoCode ? '₦0' : '₦5,000'}</span>
                </div>

                <div className="fee-note">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                  A flat one-time fee — never a percentage of your rent — and fully refunded if this property turns out to be unavailable.
                </div>

                {/* Promo Code Box */}
                <div className="promo-toggle-wrap">
                  {appliedPromoCode ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                      <span style={{ color: 'var(--success)', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                        <CheckCircle2 size={15} /> Code {appliedPromoCode} applied (100% waiver)
                      </span>
                      <button 
                        type="button" 
                        onClick={handleRemovePromoCode}
                        style={{ color: 'var(--coral)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 }}
                      >
                        Remove
                      </button>
                    </div>
                  ) : showPromoBox ? (
                    <div>
                      <div className="promo-input-row">
                        <input
                          type="text"
                          value={promoCodeInput}
                          onChange={(e) => setPromoCodeInput(e.target.value.toUpperCase())}
                          placeholder="Enter code (e.g. FIRST100)"
                          className="promo-input"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleApplyPromoCode();
                            }
                          }}
                        />
                        <button type="button" onClick={handleApplyPromoCode} className="promo-apply-btn">
                          Apply
                        </button>
                        <button 
                          type="button" 
                          onClick={() => { setShowPromoBox(false); setPromoError(null); }}
                          style={{ background: 'none', border: 'none', color: 'var(--ink-faint)', fontSize: '0.8rem', cursor: 'pointer' }}
                        >
                          Cancel
                        </button>
                      </div>
                      {promoError && (
                        <div style={{ color: 'var(--coral)', fontSize: '0.78rem', marginTop: '6px', fontWeight: 600 }}>
                          {promoError}
                        </div>
                      )}
                    </div>
                  ) : (
                    <button type="button" onClick={() => setShowPromoBox(true)} className="promo-toggle-btn">
                      <Sparkles size={13} />
                      <span>Have a promo or waiver code? Click to enter</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Section 3: Payment Lead & Methods */}
              <div className="sect">
                <p className="pay-lead">
                  You&apos;ll complete payment in a secure Paystack window — card, bank transfer, USSD and mobile money are all supported there.
                </p>
                <div className="method-row">
                  <span className="method-chip">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <rect x="2" y="5" width="20" height="14" rx="2" />
                      <path d="M2 10h20" />
                    </svg>
                    Card
                  </span>
                  <span className="method-chip">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <path d="M4 10h16M4 10l3-4M4 10l3 4M20 14H4M20 14l-3-4M20 14l-3 4" />
                    </svg>
                    Bank transfer
                  </span>
                  <span className="method-chip">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <rect x="6" y="2" width="12" height="20" rx="2" />
                      <path d="M10 18h4" />
                    </svg>
                    USSD
                  </span>
                  <span className="method-chip">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <path d="M21 12V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-1M16 12h.01" />
                      <path d="M3 9h18" />
                    </svg>
                    Mobile money
                  </span>
                </div>

                <button 
                  type="button"
                  className="btn btn-accent desktop-pay" 
                  onClick={handlePay}
                  disabled={loading || verifyingPayment}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="5" y="10" width="14" height="10" rx="2" />
                    <path d="M8 10V7a4 4 0 0 1 8 0v3" />
                  </svg>
                  {appliedPromoCode ? 'Claim Waiver & Unlock Contact (₦0)' : 'Pay ₦5,000 with Paystack'}
                </button>
                <p className="pay-hint desktop-pay">
                  A secure Paystack window will open — you won&apos;t leave Rentivo.
                </p>

                <div className="trust-row">
                  <span className="trust-item">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                    256-bit encrypted
                  </span>
                  <span className="trust-item">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                    Powered by Paystack
                  </span>
                  <span className="trust-item">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                    100% refundable
                  </span>
                </div>
              </div>
            </>
          )}

          {/* STEP: UNLOCKED / DOSSIER */}
          {step === 'unlocked' && (
            <>
              {/* Unlocked Contact Dossier */}
              <div className="sect">
                <div className="unlocked-box">
                  <div className="unlocked-meta-row">
                    <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--navy)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                      Verified Lister Contact Dossier
                    </span>
                    <span style={{ fontSize: '0.72rem', color: 'var(--ink-soft)', fontWeight: 700, background: 'var(--surface)', padding: '3px 8px', borderRadius: '6px' }}>
                      Ref: {referenceId}
                    </span>
                  </div>

                  <div className="unlocked-name">{unlockedLister.fullName}</div>
                  <div className="unlocked-sub">
                    {unlockedLister.agencyName || 'Direct Landlord'} · Member since {unlockedLister.memberSince} · {unlockedLister.responseRate} Response Rate
                  </div>

                  <div className="contact-btn-stack">
                    {/* WhatsApp */}
                    {cleanWa && (
                      <a 
                        href={`https://wa.me/${cleanWa}?text=Hello%20${encodeURIComponent(unlockedLister.fullName)},%20I%20requested%20details%20for%20your%20property%20on%20Rentivo:%20${encodeURIComponent(listing.title)}`} 
                        target="_blank" 
                        rel="noreferrer"
                        className="btn btn-wa"
                      >
                        <MessageCircle size={18} />
                        <span>Chat on WhatsApp Directly</span>
                      </a>
                    )}

                    {/* Phone Call & Copy */}
                    {unlockedLister.phone && (
                      <div className="phone-row">
                        <a href={`tel:${cleanPhone}`} className="btn btn-navy" style={{ flex: 1 }}>
                          <Phone size={16} />
                          <span>Call {unlockedLister.phone}</span>
                        </a>
                        <button type="button" onClick={handleCopyPhone} className={`copy-chip ${copiedPhone ? 'copied' : ''}`}>
                          {copiedPhone ? <Check size={14} /> : <Copy size={14} />}
                          <span>{copiedPhone ? 'Copied' : 'Copy'}</span>
                        </button>
                      </div>
                    )}

                    {/* Landmark Address */}
                    <div className="address-card">
                      <div className="address-hdr">
                        <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <MapPin size={12} color="var(--navy)" /> EXACT PHYSICAL LANDMARK ADDRESS
                        </span>
                        <button
                          type="button"
                          onClick={handleCopyAddress}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: copiedAddress ? 'var(--success)' : 'var(--ink-soft)',
                            cursor: 'pointer',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          {copiedAddress ? <Check size={12} /> : <Copy size={12} />}
                          {copiedAddress ? 'Copied' : 'Copy'}
                        </button>
                      </div>
                      <div className="address-body">{propertyAddress}</div>
                    </div>
                  </div>
                </div>

                {/* Email Notice & Preview */}
                <div style={{
                  background: 'var(--success-bg)',
                  border: '1px solid var(--success)',
                  borderRadius: '12px',
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '10px',
                  flexWrap: 'wrap'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem', color: 'var(--ink)' }}>
                    <MailCheck size={18} color="var(--success)" style={{ flexShrink: 0 }} />
                    <span>Receipt &amp; contact dossier dispatched to <b>{email || 'your email'}</b></span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEmailPreviewOpen(true)}
                    style={{
                      background: 'var(--success)',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '6px 12px',
                      fontSize: '0.76rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <span>View Email</span>
                    <ExternalLink size={11} />
                  </button>
                </div>
              </div>

              {/* Section: Before You Go Checklist */}
              <div className="sect">
                <h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '14px' }}>Before You Go</h3>
                
                <div className="checklist-item">
                  <div className="checklist-num">1</div>
                  <div className="checklist-text">
                    <h4>Agree on a time</h4>
                    <p>Message or call the landlord directly to confirm a walkthrough slot that works for both of you.</p>
                  </div>
                </div>

                <div className="checklist-item">
                  <div className="checklist-num">2</div>
                  <div className="checklist-text">
                    <h4>Bring valid ID</h4>
                    <p>Landlords in Ibadan generally expect this for a first viewing — a national ID or driver&apos;s licence is fine.</p>
                  </div>
                </div>

                <div className="checklist-item" style={{ marginBottom: 0 }}>
                  <div className="checklist-num">3</div>
                  <div className="checklist-text">
                    <h4>Inspect before you commit</h4>
                    <p>Check the taps, sockets, and doors/locks in person. Don&apos;t send any rent or deposit before you&apos;ve seen the property.</p>
                  </div>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="sect" style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="btn btn-ghost"
                  style={{ flex: '1 1 140px', padding: '12px' }}
                >
                  <Printer size={15} />
                  <span>Print Receipt</span>
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/account/requests')}
                  className="btn btn-accent"
                  style={{ flex: '2 1 180px', padding: '12px' }}
                >
                  <span>Go to My Requests</span>
                </button>
              </div>
            </>
          )}

          {/* STEP: UNAVAILABLE */}
          {step === 'unavailable' && (
            <div className="sect" style={{ textAlign: 'center', padding: '36px 24px' }}>
              <div style={{
                width: '60px',
                height: '60px',
                borderRadius: '99px',
                background: 'var(--coral-bg)',
                color: 'var(--coral)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px'
              }}>
                <AlertTriangle size={30} />
              </div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '6px' }}>
                Property No Longer Vacant
              </h2>
              <p style={{ fontSize: '0.88rem', color: 'var(--ink-soft)', maxWidth: '420px', margin: '0 auto 20px', lineHeight: 1.55 }}>
                The landlord verified that <b>{listing.title}</b> in <b>{listing.area}</b> has just been taken off the market.
              </p>
              <div style={{
                background: 'var(--success-bg)',
                border: '1px solid var(--success)',
                borderRadius: '12px',
                padding: '12px 16px',
                fontSize: '0.82rem',
                color: 'var(--success)',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                marginBottom: '24px'
              }}>
                <ShieldCheck size={16} />
                <span>Zero charges made. Your payment card was never debited.</span>
              </div>
              <button type="button" onClick={onBrowseListings} className="btn btn-accent">
                Browse Other Available Listings
              </button>
            </div>
          )}

          {/* STEP: CHECKING (FALLBACK) */}
          {step === 'checking' && (
            <div className="sect" style={{ textAlign: 'center', padding: '36px 24px' }}>
              <div className="spin" />
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '6px' }}>
                Checking Vacancy with Landlord
              </h2>
              <p style={{ fontSize: '0.88rem', color: 'var(--ink-soft)', maxWidth: '420px', margin: '0 auto 20px', lineHeight: 1.55 }}>
                We sent a 1-click vacancy inquiry to the property owner. You will only be asked to pay once they confirm availability.
              </p>
              <button type="button" onClick={() => navigate('/account/requests')} className="btn btn-accent">
                Track in My Requests
              </button>
            </div>
          )}

        </div>
      </div>

      {/* Sticky Mobile Bar matching rentivo-checkout (2).html */}
      {step === 'confirmed' && (
        <div className="stickybar">
          <div className="stickybar-row">
            <div className="amt">{appliedPromoCode ? '₦0' : '₦5,000'}</div>
            <button 
              type="button"
              className="btn btn-accent" 
              onClick={handlePay} 
              disabled={loading || verifyingPayment}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="5" y="10" width="14" height="10" rx="2" />
                <path d="M8 10V7a4 4 0 0 1 8 0v3" />
              </svg>
              {appliedPromoCode ? 'Claim Waiver' : 'Pay with Paystack'}
            </button>
          </div>
        </div>
      )}

      {/* Overlay / Modal matching rentivo-checkout (2).html */}
      <div 
        className={`overlay ${overlayStatus !== 'idle' ? 'show' : ''}`}
        onClick={(e) => {
          if (e.target === e.currentTarget && overlayStatus === 'success') {
            setOverlayStatus('idle');
          }
        }}
      >
        {overlayStatus === 'opening' && (
          <div className="result-card">
            <div className="spin" />
            <h3>Opening Paystack…</h3>
            <p>A secure payment window is loading.</p>
          </div>
        )}

        {overlayStatus === 'confirming' && (
          <div className="result-card">
            <div className="spin" />
            <h3>Confirming your payment…</h3>
            <p>This only takes a moment.</p>
          </div>
        )}

        {overlayStatus === 'success' && (
          <div className="result-card">
            <div className="check-circle">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6L9 17l-5-5" />
              </svg>
            </div>
            <h3>Payment successful!</h3>
            <p>
              {appliedPromoCode ? '₦0 launch waiver applied.' : '₦5,000 received.'} The landlord&apos;s phone number, WhatsApp link and exact address are unlocked.
            </p>
            <div className="email-note">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="5" width="18" height="14" rx="2" />
                <path d="M3 7l9 6 9-6" />
              </svg>
              Also sent to your email
            </div>
            <div className="result-actions">
              <button 
                type="button" 
                className="btn btn-accent" 
                onClick={() => navigate('/account/requests')}
              >
                View My Requests
              </button>
              <button 
                type="button" 
                className="btn btn-ghost" 
                onClick={() => {
                  setOverlayStatus('idle');
                  setStep('unlocked');
                }}
              >
                View Landlord Contact Here
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Transactional Email Drawer */}
      <EmailNotificationModal
        isOpen={emailPreviewOpen}
        onClose={() => setEmailPreviewOpen(false)}
        request={createdRequest}
        listing={listing}
      />
    </div>
  );
};
