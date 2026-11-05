import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  Check,
  Building,
  UserCheck,
  Briefcase,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Upload,
  Phone,
  FileText,
  Lock,
  CheckCircle2,
  ExternalLink,
  RefreshCw,
  Home,
  Clock,
  X
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import {
  listerOnboardingService,
  NIGERIAN_BANKS,
  IBADAN_AREAS_FOR_RESIDENCE
} from '../services/listerOnboardingService';
import { ListerOnboardingData, ListerOnboardingRole, UtilityBillType } from '../types';
import { uploadToImageKit } from '../lib/imagekit';
import '../styles/lister-onboarding.css';

export const ListerOnboardingPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, refresh } = useAuth();

  const [currentStep, setCurrentStep] = useState<number>(1);
  const [data, setData] = useState<ListerOnboardingData>(() => {
    return listerOnboardingService.getDefault(
      user?.id,
      user?.name || (user?.email ? user.email.split('@')[0] : ''),
      user?.phone || ''
    );
  });

  // Step 2: Phone confirmation & Brevo SMS states
  const [phoneCode, setPhoneCode] = useState<string[]>(['', '', '', '', '', '']);
  const [isCodeSent, setIsCodeSent] = useState<boolean>(false);
  const [codeTimer, setCodeTimer] = useState<number>(60);
  const [isSendingSMS, setIsSendingSMS] = useState<boolean>(false);
  const [isVerifyingCode, setIsVerifyingCode] = useState<boolean>(false);
  const [smsStatusMessage, setSmsStatusMessage] = useState<string | null>(null);
  const [smsSuccess, setSmsSuccess] = useState<boolean>(false);
  const [phoneError, setPhoneError] = useState<string | null>(null);

  // Step 3: Bank check states
  const [isCheckingBank, setIsCheckingBank] = useState<boolean>(false);
  const [bankCheckError, setBankCheckError] = useState<string | null>(null);
  const [matchResult, setMatchResult] = useState<{
    accountName: string;
    matched: boolean;
    similarity: number;
    maskedAccount: string;
  } | null>(null);

  // Step 5: Utility Bill state
  const [uploadFileName, setUploadFileName] = useState<string | null>(null);
  const [uploadPreviewUrl, setUploadPreviewUrl] = useState<string | null>(null);
  const [isUploadingDoc, setIsUploadingDoc] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Step 6: Completion state
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isComplete, setIsComplete] = useState<boolean>(data.completed);

  // Keep state synced with current user profile if available
  useEffect(() => {
    if (user) {
      const existing = listerOnboardingService.getOnboarding(user.id);
      if (existing) {
        setData(existing);
        if (existing.completed) {
          setIsComplete(true);
        }
        if (existing.utilityBill?.documentName) {
          setUploadFileName(existing.utilityBill.documentName);
          setUploadPreviewUrl(existing.utilityBill.documentUrl || null);
        }
      } else {
        setData((prev) => ({
          ...prev,
          userId: user.id,
          phone: prev.phone || user.phone || '',
          whatsapp: prev.whatsapp || user.phone || ''
        }));
      }
    }
  }, [user]);

  // Phone countdown timer
  useEffect(() => {
    let interval: any;
    if (isCodeSent && codeTimer > 0) {
      interval = setInterval(() => {
        setCodeTimer((t) => t - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isCodeSent, codeTimer]);

  const handleSavePartial = async (updates: Partial<ListerOnboardingData>) => {
    const updated = await listerOnboardingService.saveOnboarding(updates, user?.id);
    setData(updated);
    return updated;
  };

  // Step 2 Phone Send & Verify through the authenticated server-side challenge.
  const handleSendPhoneCode = async () => {
    if (!data.phone || data.phone.trim().length < 10) {
      setPhoneError('Please enter a valid Nigerian phone number (e.g. 08012345678)');
      return;
    }
    setPhoneError(null);
    setIsSendingSMS(true);
    setSmsStatusMessage(null);

    const effectiveEmail = data.userEmail || user?.email || '';
    const res = await listerOnboardingService.sendPhoneVerificationCode(data.phone, effectiveEmail);
    setIsSendingSMS(false);

    if (res.success) {
      setSmsSuccess(true);
      setSmsStatusMessage(res.statusMessage);
      setIsCodeSent(true);
      setCodeTimer(60);
    } else {
      setSmsSuccess(false);
      setSmsStatusMessage(res.error || 'Failed to dispatch verification code. Please try again.');
      setIsCodeSent(false);
    }
    // Keep digits empty for user input
    setPhoneCode(['', '', '', '', '', '']);
  };

  const handlePhoneCodeChange = (index: number, val: string) => {
    const digit = val.slice(-1);
    const updated = [...phoneCode];
    updated[index] = digit;
    setPhoneCode(updated);

    // Auto-advance
    if (digit && index < 5) {
      const nextInput = document.getElementById(`phone-digit-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleVerifyPhoneCode = async () => {
    const code = phoneCode.join('');
    if (code.length < 6) {
      setPhoneError('Please enter the full 6-digit confirmation code.');
      return;
    }
    setIsVerifyingCode(true);
    setPhoneError(null);
    const verification = await listerOnboardingService.verifyPhoneVerificationCode(data.phone, code);
    setIsVerifyingCode(false);
    if (!verification.success) {
      setPhoneError(verification.error || 'The code could not be verified. Request a new code and try again.');
      return;
    }

    await handleSavePartial({
      phone: data.phone,
      whatsapp: data.whatsapp || data.phone,
      userEmail: data.userEmail || user?.email || ''
    });
    setCurrentStep(3);
  };

  // Step 3 Bank Check
  const handlePerformBankCheck = async () => {
    if (!data.bankName) {
      setBankCheckError('Please select your Nigerian bank.');
      return;
    }
    const cleanAcc = data.accountNumber.trim();
    if (cleanAcc.length !== 10 || !/^\d{10}$/.test(cleanAcc)) {
      setBankCheckError('Please enter a valid 10-digit NUBAN account number.');
      return;
    }

    setIsCheckingBank(true);
    setBankCheckError(null);

    try {
      const userName = user?.name || (user?.email ? user.email.split('@')[0] : 'Valued Lister');
      const res = await listerOnboardingService.resolveAccountName(
        data.bankName,
        cleanAcc,
        userName,
        data.bankCode
      );

      setMatchResult(res);
      await handleSavePartial({
        bankName: data.bankName,
        bankCode: res.bankCode || data.bankCode,
        accountNumber: cleanAcc,
        accountName: res.accountName,
        bankMatched: res.matched,
        trustLevel: res.matched ? 1 : 1
      });

      setCurrentStep(4);
    } catch (err: any) {
      setBankCheckError(err?.message || 'Could not verify account name with bank.');
    } finally {
      setIsCheckingBank(false);
    }
  };

  // Step 5 File Upload - Cloud Upload via ImageKit
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingDoc(true);
    setUploadError(null);

    try {
      const uploaded = await uploadToImageKit(file, '/rentivo/onboarding-docs');
      setUploadFileName(file.name);
      setUploadPreviewUrl(uploaded.url);

      setData((prev) => ({
        ...prev,
        utilityBill: {
          ...prev.utilityBill,
          documentName: file.name,
          documentUrl: uploaded.url,
          uploadedAt: new Date().toISOString()
        }
      }));
    } catch (err: any) {
      console.warn('ImageKit document upload failed:', err);
      setUploadError(err?.message || 'Document upload to cloud storage failed. Please try again.');
    } finally {
      setIsUploadingDoc(false);
    }
  };

  const handleRemoveFile = () => {
    setUploadFileName(null);
    setUploadPreviewUrl(null);
    setUploadError(null);
    setData((prev) => ({
      ...prev,
      utilityBill: {
        ...prev.utilityBill,
        documentName: '',
        documentUrl: '',
        uploadedAt: undefined
      }
    }));
  };

  // Step 6 Final Completion
  const handleFinishOnboarding = async () => {
    if (!data.declarationAccepted) {
      alert('Please check the declaration box confirming your legal authority to list properties.');
      return;
    }

    setIsSubmitting(true);
    try {
      const completedData = await listerOnboardingService.completeOnboarding(user?.id);
      setData(completedData);
      setIsComplete(true);
      await refresh();
    } catch (err) {
      console.error('Failed to complete onboarding:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStepStatus = (stepNumber: number): 'done' | 'current' | 'pending' => {
    if (isComplete) return 'done';
    if (stepNumber < currentStep) return 'done';
    if (stepNumber === currentStep) return 'current';
    return 'pending';
  };

  return (
    <div className="lister-onb-root">
      {/* Top Sticky Header */}
      <header className="lister-onb-topbar">
        <div className="lister-onb-topbar-inner">
          <div className="lister-onb-brand">
            <span>Rentivo</span>
            <span className="lister-onb-brand-badge">Lister Onboarding</span>
          </div>

          <button
            type="button"
            className="lister-onb-exit-btn"
            onClick={() => navigate('/lister')}
            title="Return to Lister Portal"
          >
            <span>Save & Exit</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="lister-onb-container">
        {/* Left Sidebar: Progress & Trust Tier Tracker */}
        <aside className="lister-onb-sidebar">
          {/* Trust Tier Level Card */}
          <div className="lister-onb-trust-card">
            <span className="lister-onb-trust-label">Trust Verification Level</span>
            <h2 className="lister-onb-trust-level-title">
              {isComplete || data.trustLevel === 2
                ? 'Level 2 · Documents Provided'
                : data.bankMatched
                ? 'Level 1 · Contactable'
                : 'Level 0 · Getting Started'}
            </h2>

            <div className="lister-onb-trust-bars">
              <div className={`lister-onb-trust-bar ${data.bankMatched || isComplete ? 'done' : 'active'}`} />
              <div
                className={`lister-onb-trust-bar ${
                  isComplete || data.trustLevel >= 2 ? 'done' : currentStep >= 5 ? 'active' : ''
                }`}
              />
              <div className="lister-onb-trust-bar" title="Level 3: In-person physical verification visit" />
            </div>

            <p className="lister-onb-trust-desc">
              {isComplete
                ? 'Your verification is complete! You can post listings freely and schedule an in-person physical verification badge anytime.'
                : 'Verified listers get 4x more renter access requests and higher search ranking in Ibadan.'}
            </p>
          </div>

          {/* Stepper Milestones Card */}
          <div className="lister-onb-stepper-box">
            <h3 className="lister-onb-stepper-title">Verification Steps</h3>

            <div className="lister-onb-step-item">
              <div className={`lister-onb-step-dot ${getStepStatus(1)}`}>
                {getStepStatus(1) === 'done' ? <Check size={14} /> : '1'}
              </div>
              <div className="lister-onb-step-text">
                <strong>Welcome & Role</strong>
                <span>Declare owner or agent status</span>
              </div>
            </div>

            <div className="lister-onb-step-item">
              <div className={`lister-onb-step-dot ${getStepStatus(2)}`}>
                {getStepStatus(2) === 'done' ? <Check size={14} /> : '2'}
              </div>
              <div className="lister-onb-step-text">
                <strong>Confirm Phone</strong>
                <span>WhatsApp or SMS verification</span>
              </div>
            </div>

            <div className="lister-onb-step-item">
              <div className={`lister-onb-step-dot ${getStepStatus(3)}`}>
                {getStepStatus(3) === 'done' ? <Check size={14} /> : '3'}
              </div>
              <div className="lister-onb-step-text">
                <strong>Bank Name Match</strong>
                <span>Official NUBAN identity check</span>
              </div>
            </div>

            <div className="lister-onb-step-item">
              <div className={`lister-onb-step-dot ${getStepStatus(4)}`}>
                {getStepStatus(4) === 'done' ? <Check size={14} /> : '4'}
              </div>
              <div className="lister-onb-step-text">
                <strong>Account Validation</strong>
                <span>Review matching status</span>
              </div>
            </div>

            <div className="lister-onb-step-item">
              <div className={`lister-onb-step-dot ${getStepStatus(5)}`}>
                {getStepStatus(5) === 'done' ? <Check size={14} /> : '5'}
              </div>
              <div className="lister-onb-step-text">
                <strong>Address & Residence</strong>
                <span>Ibadan residential details</span>
              </div>
            </div>

            <div className="lister-onb-step-item">
              <div className={`lister-onb-step-dot ${getStepStatus(6)}`}>
                {getStepStatus(6) === 'done' ? <Check size={14} /> : '6'}
              </div>
              <div className="lister-onb-step-text">
                <strong>Right to Let</strong>
                <span>Authority & certification</span>
              </div>
            </div>
          </div>

          {/* Security & Anti-Fraud Guarantee Card */}
          <div className="lister-onb-guarantee-card">
            <span className="lister-onb-guarantee-title">
              <ShieldCheck size={16} color="#000052" />
              Rentivo Trust & Security
            </span>
            <ul className="lister-onb-guarantee-list">
              <li>We never move funds or inspect your account balance.</li>
              <li>Bank records verify identity only to protect tenants from scams.</li>
              <li>Encrypted under strict NDPR security standards.</li>
            </ul>
          </div>
        </aside>

        {/* Right Stage: Interactive Step View */}
        <main className="lister-onb-stage">
          {/* CELEBRATION / COMPLETED SCREEN */}
          {isComplete ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', alignItems: 'center', textAlign: 'center', padding: '24px 0' }}>
              <div className="lister-onb-success-icon-wrap" style={{
                background: data.status === 'approved' ? '#000052' : data.status === 'rejected' ? '#FEF2F2' : '#F4ECFF',
                color: data.status === 'approved' ? '#BE89FF' : data.status === 'rejected' ? '#DC2626' : '#6B2FD6'
              }}>
                {data.status === 'approved' ? <CheckCircle2 size={42} /> : data.status === 'rejected' ? <AlertTriangle size={42} /> : <Lock size={42} />}
              </div>

              <div>
                <span className="lister-onb-stage-pill" style={{
                  margin: '0 auto 12px',
                  background: data.status === 'approved' ? '#E2F5EC' : data.status === 'rejected' ? '#FEE2E2' : '#F4ECFF',
                  color: data.status === 'approved' ? '#0B6B4B' : data.status === 'rejected' ? '#B91C1C' : '#6B2FD6'
                }}>
                  {data.status === 'approved'
                    ? 'Account Approved'
                    : data.status === 'rejected'
                    ? 'Verification Rejected'
                    : 'Submitted · Awaiting Admin Approval'}
                </span>
                <h1 className="lister-onb-stage-h1">
                  {data.status === 'approved'
                    ? "You're Approved to List Properties!"
                    : data.status === 'rejected'
                    ? 'Application Needs Attention'
                    : 'Application Submitted for Review'}
                </h1>
                <p className="lister-onb-stage-sub" style={{ maxWidth: '520px', margin: '8px auto 0' }}>
                  {data.status === 'approved'
                    ? 'Your lister verification has been approved by the Rentivo Admin team! You now have full clearance to publish listings and receive renter requests.'
                    : data.status === 'rejected'
                    ? `Rejection Reason: ${data.rejectionReason || 'Please review your bank and authority documents.'}`
                    : 'Your identity and right-to-let details have been submitted to Rentivo Operations. To ensure maximum renter security in Ibadan, listings cannot be published until an administrator reviews and approves your submission.'}
                </p>
              </div>

              <div className="lister-onb-checklist-panel" style={{ width: '100%', maxWidth: '520px', textAlign: 'left', margin: '12px 0' }}>
                <div className="lister-onb-checklist-row">
                  <div className="lister-onb-check-circle done">
                    <Check size={15} />
                  </div>
                  <div>
                    <strong style={{ fontSize: '0.92rem', color: '#000052' }}>Phone Confirmed via Brevo SMS</strong>
                    <div style={{ fontSize: '0.8rem', color: '#5C5C85' }}>{data.phone || 'Verified'}</div>
                  </div>
                </div>

                <div className="lister-onb-checklist-row">
                  <div className="lister-onb-check-circle done">
                    <Check size={15} />
                  </div>
                  <div>
                    <strong style={{ fontSize: '0.92rem', color: '#000052' }}>Bank Account Matched</strong>
                    <div style={{ fontSize: '0.8rem', color: '#5C5C85' }}>
                      {data.bankName} ({data.accountName || 'Matched'})
                    </div>
                  </div>
                </div>

                <div className="lister-onb-checklist-row">
                  <div className="lister-onb-check-circle done">
                    <Check size={15} />
                  </div>
                  <div>
                    <strong style={{ fontSize: '0.92rem', color: '#000052' }}>Ibadan Residence & Right to Let</strong>
                    <div style={{ fontSize: '0.8rem', color: '#5C5C85' }}>
                      {data.residentialAddress.area || 'Bodija'}, Ibadan · {data.role === 'owner' ? 'Property Owner' : data.role === 'agent' ? 'Authorized Agent' : 'Representative'}
                    </div>
                  </div>
                </div>

                <div className="lister-onb-checklist-row">
                  <div className="lister-onb-check-circle" style={{
                    background: data.status === 'approved' ? '#000052' : data.status === 'rejected' ? '#DC2626' : '#FEF3C7',
                    color: data.status === 'approved' ? '#BE89FF' : data.status === 'rejected' ? '#fff' : '#D97706'
                  }}>
                    {data.status === 'approved' ? <Check size={15} /> : data.status === 'rejected' ? <X size={15} /> : <Clock size={15} />}
                  </div>
                  <div>
                    <strong style={{ fontSize: '0.92rem', color: '#000052' }}>Admin Verification Status</strong>
                    <div style={{ fontSize: '0.8rem', color: '#5C5C85' }}>
                      {data.status === 'approved'
                        ? 'Approved by Rentivo Operations'
                        : data.status === 'rejected'
                        ? 'Rejected - Update required'
                        : 'In Review (avg response under 1 hour)'}
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '16px', width: '100%', maxWidth: '520px', justifyContent: 'center', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="lister-onb-btn lister-onb-btn-secondary"
                  onClick={() => navigate('/lister')}
                >
                  Go to Lister Dashboard
                </button>
                {data.status === 'approved' ? (
                  <button
                    type="button"
                    className="lister-onb-btn lister-onb-btn-primary"
                    onClick={() => navigate('/lister/listings/new')}
                  >
                    <Sparkles size={16} />
                    Post First Property
                  </button>
                ) : data.status === 'rejected' ? (
                  <button
                    type="button"
                    className="lister-onb-btn lister-onb-btn-primary"
                    onClick={() => {
                      setIsComplete(false);
                      setCurrentStep(1);
                    }}
                  >
                    Update & Resubmit
                  </button>
                ) : (
                  <button
                    type="button"
                    className="lister-onb-btn lister-onb-btn-subtle"
                    onClick={() => navigate('/admin/listers')}
                    title="Review in Admin Operations"
                  >
                    View in Admin Queue →
                  </button>
                )}
              </div>
            </div>
          ) : currentStep === 1 ? (
            /* STEP 1: WELCOME & ROLE */
            <>
              <div className="lister-onb-stage-header">
                <span className="lister-onb-stage-pill">Step 1 of 6 · Welcome</span>
                <h1 className="lister-onb-stage-h1">
                  Welcome, {user?.name?.split(' ')[0] || 'Lister'}. Let's get you ready to list.
                </h1>
                <p className="lister-onb-stage-sub">
                  Rentivo requires all property listers to verify their identity before publishing listings. This protects honest landlords and ensures serious renters can trust every home on the platform.
                </p>
              </div>

              <fieldset className="lister-onb-roles-group">
                <legend style={{ fontWeight: 700, fontSize: '0.92rem', color: '#000052', marginBottom: '8px' }}>
                  Select your primary role:
                </legend>

                <div
                  className={`lister-onb-role-card ${data.role === 'owner' ? 'selected' : ''}`}
                  onClick={() => setData({ ...data, role: 'owner' })}
                >
                  <div className="lister-onb-role-radio">
                    {data.role === 'owner' && <div className="lister-onb-role-radio-dot" />}
                  </div>
                  <div className="lister-onb-role-text">
                    <strong>Property Owner / Landlord</strong>
                    <span>I personally own the house, apartment, or commercial property I want to list.</span>
                  </div>
                </div>

                <div
                  className={`lister-onb-role-card ${data.role === 'agent' ? 'selected' : ''}`}
                  onClick={() => setData({ ...data, role: 'agent' })}
                >
                  <div className="lister-onb-role-radio">
                    {data.role === 'agent' && <div className="lister-onb-role-radio-dot" />}
                  </div>
                  <div className="lister-onb-role-text">
                    <strong>Licensed / Professional Real Estate Agent</strong>
                    <span>I manage and advertise listings on behalf of property owners in Ibadan.</span>
                  </div>
                </div>

                <div
                  className={`lister-onb-role-card ${data.role === 'caretaker' ? 'selected' : ''}`}
                  onClick={() => setData({ ...data, role: 'caretaker' })}
                >
                  <div className="lister-onb-role-radio">
                    {data.role === 'caretaker' && <div className="lister-onb-role-radio-dot" />}
                  </div>
                  <div className="lister-onb-role-text">
                    <strong>Caretaker or Family Representative</strong>
                    <span>I look after the building or represent a family-held estate with full authority to let.</span>
                  </div>
                </div>
              </fieldset>

              <div className="lister-onb-actions">
                <button
                  type="button"
                  className="lister-onb-btn lister-onb-btn-subtle"
                  onClick={() => navigate('/lister')}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="lister-onb-btn lister-onb-btn-primary"
                  onClick={async () => {
                    await handleSavePartial({ role: data.role });
                    setCurrentStep(2);
                  }}
                >
                  Continue to Phone Confirmation
                  <ArrowRight size={16} />
                </button>
              </div>
            </>
          ) : currentStep === 2 ? (
            /* STEP 2: CONFIRM PHONE */
            <>
              <div className="lister-onb-stage-header">
                <span className="lister-onb-stage-pill">Step 2 of 6 · Phone Verification</span>
                <h1 className="lister-onb-stage-h1">Confirm your phone number</h1>
                <p className="lister-onb-stage-sub">
                  Renters and Rentivo field inspectors reach you on this number to confirm viewing appointments and property availability.
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="lister-onb-field">
                  <label className="lister-onb-label">
                    <span>Phone Number</span>
                    <span className="lister-onb-label-hint">Nigerian mobile line</span>
                  </label>
                  <input
                    type="tel"
                    className="lister-onb-input"
                    placeholder="0803 000 0000"
                    value={data.phone}
                    onChange={(e) => {
                      setData({ ...data, phone: e.target.value, whatsapp: data.whatsapp || e.target.value });
                      setPhoneError(null);
                      setIsCodeSent(false);
                      setPhoneCode(['', '', '', '', '', '']);
                      setSmsStatusMessage(null);
                    }}
                  />
                </div>

                <div className="lister-onb-field">
                  <label className="lister-onb-label">
                    <span>WhatsApp Number</span>
                    <span className="lister-onb-label-hint">For instant booking alerts</span>
                  </label>
                  <input
                    type="tel"
                    className="lister-onb-input"
                    placeholder="Same as mobile phone"
                    value={data.whatsapp}
                    onChange={(e) => setData({ ...data, whatsapp: e.target.value })}
                  />
                </div>

                <div className="lister-onb-field">
                  <label className="lister-onb-label">
                    <span>Account Email</span>
                    <span className="lister-onb-label-hint">Signed-in account email</span>
                  </label>
                  <input
                    type="email"
                    className="lister-onb-input"
                    placeholder="name@example.com"
                    value={user?.email || data.userEmail || ''}
                    readOnly
                  />
                </div>

                {smsStatusMessage && (
                  <div
                    style={{
                      background: smsSuccess ? 'var(--color-success-bg, #E2F5EC)' : 'var(--color-warning-bg, #FFFBEB)',
                      border: `1px solid ${smsSuccess ? 'var(--color-success-border, #A3E3C6)' : 'var(--color-warning-border, #FDE68A)'}`,
                      color: smsSuccess ? 'var(--color-success, #0B6B4B)' : 'var(--color-warning, #92400E)',
                      padding: '10px 14px',
                      borderRadius: '10px',
                      fontSize: '0.86rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    {smsSuccess ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
                    <span>{smsStatusMessage}</span>
                  </div>
                )}

                {!isCodeSent ? (
                  <button
                    type="button"
                    className="lister-onb-btn lister-onb-btn-secondary"
                    style={{ alignSelf: 'flex-start', marginTop: '4px' }}
                    onClick={handleSendPhoneCode}
                    disabled={isSendingSMS}
                  >
                    <Phone size={15} />
                    {isSendingSMS ? 'Dispatching Verification Code…' : 'Send Verification Code'}
                  </button>
                ) : (
                  <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ fontSize: '0.88rem', color: 'var(--color-text, #000052)', fontWeight: 600 }}>
                      Enter the 6-digit confirmation code sent by SMS to {data.phone}:
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                      {phoneCode.map((digit, idx) => (
                        <input
                          key={idx}
                          id={`phone-digit-${idx}`}
                          type="text"
                          maxLength={1}
                          className="lister-onb-input"
                          style={{
                            width: '46px',
                            height: '52px',
                            textAlign: 'center',
                            fontSize: '1.25rem',
                            fontWeight: 700
                          }}
                          value={digit}
                          onChange={(e) => handlePhoneCodeChange(idx, e.target.value)}
                        />
                      ))}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.82rem', color: 'var(--color-text-muted, #5C5C85)' }}>
                      <span>
                        {codeTimer > 0 ? `Resend in ${codeTimer}s` : (
                          <button
                            type="button"
                            onClick={handleSendPhoneCode}
                            style={{ background: 'none', border: 'none', color: 'var(--color-primary, #6B2FD6)', fontWeight: 700, cursor: 'pointer', padding: 0 }}
                          >
                            Resend code now
                          </button>
                        )}
                      </span>
                    </div>

                    <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted, #5C5C85)', marginTop: '2px', lineHeight: 1.4 }}>
                      Check your phone’s SMS inbox for the code. Rentivo will never ask you to share it.
                    </div>
                  </div>
                )}

                {phoneError && (
                  <div style={{ color: '#D32F2F', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <AlertTriangle size={15} />
                    {phoneError}
                  </div>
                )}
              </div>

              <div className="lister-onb-actions">
                <button
                  type="button"
                  className="lister-onb-btn lister-onb-btn-subtle"
                  onClick={() => setCurrentStep(1)}
                >
                  <ArrowLeft size={16} />
                  Back
                </button>
                <button
                  type="button"
                  className="lister-onb-btn lister-onb-btn-primary"
                  disabled={isVerifyingCode}
                  onClick={isCodeSent ? handleVerifyPhoneCode : handleSendPhoneCode}
                >
                  {isVerifyingCode ? 'Verifying…' : 'Continue to Bank Verification'}
                  <ArrowRight size={16} />
                </button>
              </div>
            </>
          ) : currentStep === 3 ? (
            /* STEP 3: BANK CHECK */
            <>
              <div className="lister-onb-stage-header">
                <span className="lister-onb-stage-pill">Step 3 of 6 · Bank Identity Check</span>
                <h1 className="lister-onb-stage-h1">Check your name with your bank</h1>
                <p className="lister-onb-stage-sub">
                  Renters trust listers whose registered name matches a valid Nigerian bank account. We query your bank once to resolve the account name.
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="lister-onb-field">
                  <label className="lister-onb-label">
                    <span>Select Bank</span>
                    <span className="lister-onb-label-hint">CBN licensed</span>
                  </label>
                  <select
                    className="lister-onb-select"
                    value={data.bankName}
                    onChange={(e) => {
                      const sel = NIGERIAN_BANKS.find((b) => b.name === e.target.value);
                      setData({
                        ...data,
                        bankName: e.target.value,
                        bankCode: sel?.code || ''
                      });
                      setBankCheckError(null);
                    }}
                  >
                    <option value="">Select your bank</option>
                    {NIGERIAN_BANKS.map((b) => (
                      <option key={b.code} value={b.name}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="lister-onb-field">
                  <label className="lister-onb-label">
                    <span>NUBAN Account Number</span>
                    <span className="lister-onb-label-hint">10 digits</span>
                  </label>
                  <input
                    type="text"
                    maxLength={10}
                    className="lister-onb-input"
                    placeholder="e.g. 0123456789"
                    value={data.accountNumber}
                    onChange={(e) => {
                      const clean = e.target.value.replace(/\D/g, '');
                      setData({ ...data, accountNumber: clean });
                      setBankCheckError(null);
                    }}
                  />
                  <span className="lister-onb-field-hint">
                    Your name will be checked automatically against this account.
                  </span>
                </div>

                {bankCheckError && (
                  <div style={{ color: '#D32F2F', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <AlertTriangle size={15} />
                    {bankCheckError}
                  </div>
                )}
              </div>

              <div className="lister-onb-actions">
                <button
                  type="button"
                  className="lister-onb-btn lister-onb-btn-subtle"
                  onClick={() => setCurrentStep(2)}
                >
                  <ArrowLeft size={16} />
                  Back
                </button>
                <button
                  type="button"
                  className="lister-onb-btn lister-onb-btn-primary"
                  disabled={isCheckingBank || data.accountNumber.length !== 10}
                  onClick={handlePerformBankCheck}
                >
                  {isCheckingBank ? (
                    <>
                      <RefreshCw size={16} className="animate-spin" />
                      Checking with Bank…
                    </>
                  ) : (
                    <>
                      Verify Account Name
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </div>
            </>
          ) : currentStep === 4 ? (
            /* STEP 4: NAME MATCH RESULT */
            <>
              <div className="lister-onb-stage-header">
                <span className="lister-onb-stage-pill">Step 4 of 6 · Identity Resolution</span>
                <h1 className="lister-onb-stage-h1">
                  {matchResult?.matched ? 'Name matched! You are contactable.' : 'Review Account Name'}
                </h1>
                <p className="lister-onb-stage-sub">
                  Here is the name returned by your financial institution compared to your Rentivo profile.
                </p>
              </div>

              <div className="lister-onb-match-box">
                <div className="lister-onb-match-row">
                  <span className="label">Bank</span>
                  <span className="value">{data.bankName}</span>
                </div>
                <div className="lister-onb-match-row">
                  <span className="label">Account Number</span>
                  <span className="value">{matchResult?.maskedAccount || data.accountNumber}</span>
                </div>
                <div className="lister-onb-match-row">
                  <span className="label">Name from Bank</span>
                  <span className="value" style={{ color: '#6B2FD6' }}>
                    {matchResult?.accountName || data.accountName}
                  </span>
                </div>
                <div className="lister-onb-match-row">
                  <span className="label">Rentivo Profile Name</span>
                  <span className="value">{user?.name || 'Valued Lister'}</span>
                </div>
                <div className="lister-onb-match-row">
                  <span className="label">Verification Result</span>
                  <span className="value">
                    {matchResult?.matched ? (
                      <span className="lister-onb-badge-matched">
                        <Check size={14} />
                        Name Matched · Level 1
                      </span>
                    ) : (
                      <span style={{ color: '#D97706', fontWeight: 700, fontSize: '0.85rem' }}>
                        Near Miss (Minor Difference)
                      </span>
                    )}
                  </span>
                </div>
              </div>

              {!matchResult?.matched && (
                <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', padding: '14px 16px', borderRadius: '12px', fontSize: '0.88rem', color: '#92400E' }}>
                  <strong>Is this your account?</strong> The name reported by the bank is slightly formatted differently from your profile. This is common due to middle names or initials.
                </div>
              )}

              <div className="lister-onb-actions">
                <button
                  type="button"
                  className="lister-onb-btn lister-onb-btn-secondary"
                  onClick={() => setCurrentStep(3)}
                >
                  Use Different Account
                </button>
                <button
                  type="button"
                  className="lister-onb-btn lister-onb-btn-primary"
                  onClick={async () => {
                    await handleSavePartial({ bankMatched: true, trustLevel: 1 });
                    setCurrentStep(5);
                  }}
                >
                  {matchResult?.matched ? 'Continue to Residential Address' : 'Yes, This Is My Account'}
                  <ArrowRight size={16} />
                </button>
              </div>
            </>
          ) : currentStep === 5 ? (
            /* STEP 5: RESIDENTIAL ADDRESS & UTILITY BILL */
            <>
              <div className="lister-onb-stage-header">
                <span className="lister-onb-stage-pill">Step 5 of 6 · Level 2 Trust Progression</span>
                <h1 className="lister-onb-stage-h1">Where are you based in Ibadan?</h1>
                <p className="lister-onb-stage-sub">
                  Providing your residence or office address unlocks Level 2 Trust. Renters feel safe knowing their host is locally rooted.
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="lister-onb-grid-2">
                  <div className="lister-onb-field">
                    <label className="lister-onb-label">
                      <span>Area / Neighborhood</span>
                    </label>
                    <select
                      className="lister-onb-select"
                      value={data.residentialAddress.area}
                      onChange={(e) =>
                        setData({
                          ...data,
                          residentialAddress: { ...data.residentialAddress, area: e.target.value }
                        })
                      }
                    >
                      {IBADAN_AREAS_FOR_RESIDENCE.map((area) => (
                        <option key={area} value={area}>
                          {area}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="lister-onb-field">
                    <label className="lister-onb-label">
                      <span>Nearest Landmark</span>
                    </label>
                    <input
                      type="text"
                      className="lister-onb-input"
                      placeholder="e.g. Near UI Second Gate, Bodija Market"
                      value={data.residentialAddress.landmark || ''}
                      onChange={(e) =>
                        setData({
                          ...data,
                          residentialAddress: { ...data.residentialAddress, landmark: e.target.value }
                        })
                      }
                    />
                  </div>
                </div>

                <div className="lister-onb-field">
                  <label className="lister-onb-label">
                    <span>Street Address</span>
                  </label>
                  <input
                    type="text"
                    className="lister-onb-input"
                    placeholder="e.g. 14 Awolowo Avenue, Old Bodija"
                    value={data.residentialAddress.street}
                    onChange={(e) =>
                      setData({
                        ...data,
                        residentialAddress: { ...data.residentialAddress, street: e.target.value }
                      })
                    }
                  />
                </div>

                <div className="lister-onb-field" style={{ marginTop: '6px' }}>
                  <label className="lister-onb-label">
                    <span>Local Utility Bill or Tenancy Receipt</span>
                    <span className="lister-onb-label-hint">IBEDC electricity, water, or waste</span>
                  </label>

                  <div className="lister-onb-grid-2" style={{ marginBottom: '10px' }}>
                    <select
                      className="lister-onb-select"
                      value={data.utilityBill.billType}
                      onChange={(e) =>
                        setData({
                          ...data,
                          utilityBill: { ...data.utilityBill, billType: e.target.value as UtilityBillType }
                        })
                      }
                    >
                      <option value="ibedc_electricity">IBEDC Electricity Bill / Token</option>
                      <option value="water_board">Oyo State Water Corporation</option>
                      <option value="waste_oyowma">OYOWMA Waste Management</option>
                      <option value="tenancy_receipt">Tenancy Receipt / Agreement</option>
                    </select>

                    <input
                      type="text"
                      className="lister-onb-input"
                      placeholder="Meter / Account / Bill Ref #"
                      value={data.utilityBill.referenceNumber || ''}
                      onChange={(e) =>
                        setData({
                          ...data,
                          utilityBill: { ...data.utilityBill, referenceNumber: e.target.value }
                        })
                      }
                    />
                  </div>

                  <div className={`lister-onb-dropzone ${uploadFileName ? 'has-file' : ''}`}>
                    <input 
                      type="file" 
                      accept="image/*,application/pdf" 
                      onChange={handleFileUpload} 
                      disabled={isUploadingDoc} 
                    />
                    <div className="lister-onb-upload-icon">
                      {isUploadingDoc ? <RefreshCw size={22} className="spin" /> : <Upload size={22} />}
                    </div>
                    {isUploadingDoc ? (
                      <div>
                        <strong style={{ display: 'block', color: '#6B2FD6' }}>Uploading to ImageKit Cloud…</strong>
                        <span style={{ fontSize: '0.8rem', color: '#5C5C85' }}>Encrypting and storing document securely</span>
                      </div>
                    ) : uploadFileName ? (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                        <strong style={{ display: 'block', color: '#0B6B4B' }}>{uploadFileName}</strong>
                        <span style={{ fontSize: '0.8rem', color: '#5C5C85' }}>
                          Uploaded to ImageKit Cloud CDN ·{' '}
                          <a 
                            href={data.utilityBill.documentUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            style={{ color: '#6B2FD6', fontWeight: 600, textDecoration: 'underline' }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            Preview
                          </a>
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveFile();
                          }}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#DC2626',
                            fontSize: '0.78rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            marginTop: '4px'
                          }}
                        >
                          Remove file
                        </button>
                      </div>
                    ) : (
                      <div>
                        <strong>Upload photo or scan of bill / document</strong>
                        <div style={{ fontSize: '0.8rem', color: '#5C5C85', marginTop: '4px' }}>
                          JPG, PNG, WebP or PDF up to 10MB. Stored securely on ImageKit for verification only.
                        </div>
                      </div>
                    )}
                  </div>

                  {uploadError && (
                    <div style={{ color: '#D32F2F', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px' }}>
                      <AlertTriangle size={15} />
                      {uploadError}
                    </div>
                  )}
                </div>
              </div>

              <div className="lister-onb-actions">
                <button
                  type="button"
                  className="lister-onb-btn lister-onb-btn-subtle"
                  onClick={() => setCurrentStep(4)}
                >
                  <ArrowLeft size={16} />
                  Back
                </button>
                <button
                  type="button"
                  className="lister-onb-btn lister-onb-btn-primary"
                  onClick={async () => {
                    await handleSavePartial({
                      residentialAddress: data.residentialAddress,
                      utilityBill: data.utilityBill,
                      trustLevel: 2
                    });
                    setCurrentStep(6);
                  }}
                >
                  Continue to Right to Let
                  <ArrowRight size={16} />
                </button>
              </div>
            </>
          ) : (
            /* STEP 6: RIGHT TO LET & FINAL DECLARATION */
            <>
              <div className="lister-onb-stage-header">
                <span className="lister-onb-stage-pill">Step 6 of 6 · Right to Let</span>
                <h1 className="lister-onb-stage-h1">Authority Declaration & Commitment</h1>
                <p className="lister-onb-stage-sub">
                  Rentivo requires legal certification that you are authorized to list, market, or execute tenancy agreements for your properties.
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                {/* Family property toggle */}
                <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', padding: '16px 18px', borderRadius: '12px' }}>
                  <label className="lister-onb-checkbox-label">
                    <input
                      type="checkbox"
                      checked={!!data.isFamilyProperty}
                      onChange={(e) => setData({ ...data, isFamilyProperty: e.target.checked })}
                    />
                    <div>
                      <strong>Is any of your property family-owned or inherited?</strong>
                      <div style={{ fontSize: '0.8rem', color: '#5C5C85', marginTop: '2px' }}>
                        If yes, we ensure the head of the family has authorized the letting.
                      </div>
                    </div>
                  </label>

                  {data.isFamilyProperty && (
                    <div className="lister-onb-grid-2" style={{ marginTop: '14px' }}>
                      <input
                        type="text"
                        className="lister-onb-input"
                        placeholder="Family Head / Mogaji Name"
                        value={data.familyHeadName || ''}
                        onChange={(e) => setData({ ...data, familyHeadName: e.target.value })}
                      />
                      <input
                        type="tel"
                        className="lister-onb-input"
                        placeholder="Family Head Phone Number"
                        value={data.familyHeadPhone || ''}
                        onChange={(e) => setData({ ...data, familyHeadPhone: e.target.value })}
                      />
                    </div>
                  )}
                </div>

                {/* Solemn Declaration */}
                <div style={{ background: '#FAF9FE', border: '1.5px solid #BE89FF', padding: '20px', borderRadius: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#000052', fontWeight: 800, marginBottom: '8px' }}>
                    <ShieldCheck size={20} color="#6B2FD6" />
                    <span>Lister Code of Conduct & Legal Attestation</span>
                  </div>
                  <p style={{ fontSize: '0.86rem', lineHeight: '1.5', color: '#23234F', margin: '0 0 14px' }}>
                    By completing this onboarding, I solemnly declare under penalty of law that I have lawful authority, tenancy mandate, or legal ownership to list, represent, and lease properties on Rentivo. I understand that misrepresenting property status, taking unreceipted offline cash, or listing properties without owner consent results in immediate blacklisting and legal action.
                  </p>

                  <label className="lister-onb-checkbox-label" style={{ fontWeight: 600 }}>
                    <input
                      type="checkbox"
                      checked={!!data.declarationAccepted}
                      onChange={(e) => setData({ ...data, declarationAccepted: e.target.checked })}
                    />
                    <span>
                      I solemnly agree to the Rentivo Lister Terms and certify all submitted information is accurate and authentic.
                    </span>
                  </label>
                </div>
              </div>

              <div className="lister-onb-actions">
                <button
                  type="button"
                  className="lister-onb-btn lister-onb-btn-subtle"
                  onClick={() => setCurrentStep(5)}
                >
                  <ArrowLeft size={16} />
                  Back
                </button>
                <button
                  type="button"
                  className="lister-onb-btn lister-onb-btn-primary"
                  disabled={isSubmitting || !data.declarationAccepted}
                  onClick={handleFinishOnboarding}
                >
                  {isSubmitting ? (
                    'Completing Onboarding…'
                  ) : (
                    <>
                      <Sparkles size={16} />
                      Complete Onboarding & Unlock Posting
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
};
