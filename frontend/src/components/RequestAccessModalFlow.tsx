import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  ShieldCheck, 
  CheckCircle2, 
  User as UserIcon, 
  Mail, 
  Phone, 
  Lock, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  AlertCircle,
  RotateCcw,
  Sparkles
} from 'lucide-react';
import { Listing, AccessRequest } from '../types';
import { authService } from '../services/authService';
import { requestsService } from '../services/requestsService';
import { useAuth } from '../contexts/AuthContext';
import { validateNigerianPhone } from '../utils/phoneValidator';
import { formatNaira } from '../utils/formatters';
import { RequestConfirmationModal } from './RequestConfirmationModal';
import '../styles/request-access-flow.css';

interface RequestAccessModalFlowProps {
  isOpen: boolean;
  onClose: () => void;
  listing: Listing;
  onSuccess?: (request: AccessRequest) => void;
  onOpenGlobalAuth?: (mode: 'login' | 'signup') => void;
}

export const RequestAccessModalFlow: React.FC<RequestAccessModalFlowProps> = ({
  isOpen,
  onClose,
  listing,
  onSuccess,
  onOpenGlobalAuth
}) => {
  const { user, refresh } = useAuth();

  // Multi-step modal state: 'guest_form' | 'guest_verify' | 'signin_inline' | 'logged_in_form' | 'confirmed'
  const [step, setStep] = useState<'guest_form' | 'guest_verify' | 'signin_inline' | 'logged_in_form' | 'confirmed'>('guest_form');

  // Form Fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Visibility Toggles
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Inline Sign-In Fields
  const [signinPassword, setSigninPassword] = useState('');
  const [showSigninPassword, setShowSigninPassword] = useState(false);

  // Phone Validation State
  const [phoneTouched, setPhoneTouched] = useState(false);
  const phoneValidation = validateNigerianPhone(phone);

  // 6-Digit OTP State
  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', '']);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [resendCooldown, setResendCooldown] = useState(45);
  const [isResending, setIsResending] = useState(false);

  // UI / Status States
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shake, setShake] = useState(false);
  const [createdRequest, setCreatedRequest] = useState<AccessRequest | null>(null);

  // Determine initial step based on auth state
  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    if (user) {
      setStep('logged_in_form');
      setPhone(user.phone || '');
    } else {
      setStep('guest_form');
      setDigits(['', '', '', '', '', '']);
    }
  }, [isOpen, user]);

  // Resend cooldown timer
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (resendCooldown > 0 && step === 'guest_verify') {
      timer = setTimeout(() => setResendCooldown(prev => prev - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [resendCooldown, step]);

  // Focus first OTP box when entering verify step
  useEffect(() => {
    if (step === 'guest_verify') {
      setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 80);
    }
  }, [step]);

  // Escape key handler
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 450);
  };

  // ---------------------------------------------------------------------------
  // STEP 1: Handle Guest Signup & Request Submit
  // ---------------------------------------------------------------------------
  const handleGuestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanName = fullName.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanPhone = phone.trim();

    // 1. Validation Checks
    if (!cleanName || cleanName.length < 2) {
      setError('Please enter your full name.');
      triggerShake();
      return;
    }

    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setError('Please enter a valid email address.');
      triggerShake();
      return;
    }

    // Phone Validation
    const phoneCheck = validateNigerianPhone(cleanPhone);
    if (!phoneCheck.isValid) {
      setError(phoneCheck.errorMessage || 'Please enter a valid 11-digit phone number.');
      triggerShake();
      return;
    }

    // Password Checks
    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters long.');
      triggerShake();
      return;
    }

    // Confirm Password / Password Two Check
    if (password !== confirmPassword) {
      setError('Passwords do not match. Please ensure both passwords match.');
      triggerShake();
      return;
    }

    setIsLoading(true);

    try {
      // Call Supabase signup
      const signupRes = await authService.signup({
        fullName: cleanName,
        email: cleanEmail,
        phone: phoneCheck.cleaned,
        password,
        role: 'tenant'
      });

      if (!signupRes.success) {
        setIsLoading(false);
        const errMsg = signupRes.error || 'Failed to create account.';
        setError(errMsg);
        triggerShake();

        // If email already exists, offer quick switch to sign in
        if (errMsg.toLowerCase().includes('already exists') || errMsg.toLowerCase().includes('already registered')) {
          // Keep email populated
        }
        return;
      }

      setIsLoading(false);
      // Advance to Modal Step 2: Verification Code Input
      setStep('guest_verify');
      setResendCooldown(45);
      setDigits(['', '', '', '', '', '']);

    } catch (err: any) {
      setIsLoading(false);
      setError(err?.message || 'Could not process request. Please try again.');
      triggerShake();
    }
  };

  // ---------------------------------------------------------------------------
  // STEP 2: Handle 6-Digit OTP Verification & Request Creation
  // ---------------------------------------------------------------------------
  const handleDigitChange = (index: number, value: string) => {
    setError(null);
    const cleaned = value.replace(/\D/g, '');
    if (!cleaned) {
      const nextDigits = [...digits];
      nextDigits[index] = '';
      setDigits(nextDigits);
      return;
    }

    const nextDigits = [...digits];
    nextDigits[index] = cleaned[cleaned.length - 1];
    setDigits(nextDigits);

    // Auto-advance
    if (index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit if all 6 digits entered
    const fullCode = nextDigits.join('');
    if (fullCode.length === 6) {
      void executeVerifyCode(fullCode);
    }
  };

  const handleDigitKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (!digits[index] && index > 0) {
        const nextDigits = [...digits];
        nextDigits[index - 1] = '';
        setDigits(nextDigits);
        inputRefs.current[index - 1]?.focus();
      } else {
        const nextDigits = [...digits];
        nextDigits[index] = '';
        setDigits(nextDigits);
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePasteOtp = (e: React.ClipboardEvent) => {
    e.preventDefault();
    setError(null);
    const raw = e.clipboardData.getData('text');
    const cleaned = raw.replace(/\D/g, '');
    if (!cleaned) return;

    const sixDigits = cleaned.slice(0, 6);
    const nextDigits = ['', '', '', '', '', ''];
    for (let i = 0; i < 6; i++) {
      nextDigits[i] = sixDigits[i] || '';
    }
    setDigits(nextDigits);

    if (sixDigits.length === 6) {
      inputRefs.current[5]?.focus();
      void executeVerifyCode(sixDigits);
    } else {
      inputRefs.current[sixDigits.length]?.focus();
    }
  };

  const executeVerifyCode = async (codeToVerify?: string) => {
    const rawCode = codeToVerify || digits.join('');
    const code = rawCode.replace(/\D/g, '').trim();
    setError(null);

    if (code.length !== 6) {
      setError('Please enter all 6 digits of your verification code.');
      triggerShake();
      return;
    }

    setIsLoading(true);

    try {
      // 1. Verify code with Supabase
      const verifyRes = await authService.verifySignupCode(email.trim().toLowerCase(), code);

      if (!verifyRes.success) {
        setIsLoading(false);
        setError(verifyRes.error || 'Invalid or expired verification code.');
        triggerShake();
        return;
      }

      // 2. Refresh Auth Context
      await refresh();

      // 3. Create Property Access Request
      const created = await requestsService.createRequest(listing, {
        name: fullName.trim(),
        email: email.trim().toLowerCase(),
        phone: phoneValidation.cleaned || phone.trim()
      });

      setCreatedRequest(created);
      setIsLoading(false);

      if (onSuccess) {
        onSuccess(created);
      }

      // 4. Modal Step 3: Open Access Granted Confirmation Modal
      setStep('confirmed');

    } catch (err: any) {
      setIsLoading(false);
      setError(err?.message || 'Verification could not be completed.');
      triggerShake();
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0 || isResending) return;
    setIsResending(true);
    setError(null);

    const res = await authService.resendVerificationCode(email.trim().toLowerCase(), 'signup');
    setIsResending(false);

    if (res.success) {
      setResendCooldown(60);
      setDigits(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } else {
      setError(res.error || 'Could not resend code. Please try again.');
      triggerShake();
    }
  };

  // ---------------------------------------------------------------------------
  // STEP: Handle Logged In User Request Submit
  // ---------------------------------------------------------------------------
  const handleLoggedInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setError(null);

    const phoneCheck = validateNigerianPhone(phone || user.phone || '');
    if (!phoneCheck.isValid) {
      setError(phoneCheck.errorMessage || 'Please enter a valid 11-digit phone number.');
      triggerShake();
      return;
    }

    setIsLoading(true);

    try {
      const created = await requestsService.createRequest(listing, {
        name: user.name,
        email: user.email,
        phone: phoneCheck.cleaned
      });

      setCreatedRequest(created);
      setIsLoading(false);

      if (onSuccess) {
        onSuccess(created);
      }

      setStep('confirmed');
    } catch (err: any) {
      setIsLoading(false);
      setError(err?.message || 'Failed to submit request.');
      triggerShake();
    }
  };

  // ---------------------------------------------------------------------------
  // STEP: Handle Inline Sign-In
  // ---------------------------------------------------------------------------
  const handleInlineSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !signinPassword) {
      setError('Please enter both your email and password.');
      triggerShake();
      return;
    }

    setIsLoading(true);

    try {
      const res = await authService.login(email.trim().toLowerCase(), signinPassword);
      if (!res.success || !res.user) {
        setIsLoading(false);
        setError(res.error || 'Invalid email or password.');
        triggerShake();
        return;
      }

      await refresh();

      // Immediately create request with authenticated user
      const created = await requestsService.createRequest(listing, {
        name: res.user.name,
        email: res.user.email,
        phone: res.user.phone || phone.trim()
      });

      setCreatedRequest(created);
      setIsLoading(false);

      if (onSuccess) {
        onSuccess(created);
      }

      setStep('confirmed');

    } catch (err: any) {
      setIsLoading(false);
      setError(err?.message || 'Sign in failed. Please try again.');
      triggerShake();
    }
  };

  // ---------------------------------------------------------------------------
  // MODAL 3: Access Granted Confirmation Modal
  // ---------------------------------------------------------------------------
  if (step === 'confirmed') {
    return (
      <RequestConfirmationModal
        isOpen={true}
        onClose={onClose}
        listing={listing}
        request={createdRequest}
        onViewRequests={() => {
          onClose();
          window.location.href = '/account/requests';
        }}
        onContinueBrowsing={onClose}
      />
    );
  }

  return (
    <div className="raf-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div 
        className={`raf-card ${shake ? 'raf-shake' : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="raf-header">
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, backgroundColor: '#f5f3ff', padding: '3px 10px', borderRadius: 99, fontSize: '11.5px', fontWeight: 800, color: '#6d35c9', marginBottom: 4 }}>
              <ShieldCheck size={13} />
              <span>Direct Landlord Connection</span>
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#000052', margin: 0 }}>
              {step === 'guest_form' && 'Request Access & Sign Up'}
              {step === 'guest_verify' && 'Verify Your Email'}
              {step === 'signin_inline' && 'Sign In & Request Access'}
              {step === 'logged_in_form' && 'Request Property Access'}
            </h3>

            {/* Progress Stepper for New Users */}
            {(step === 'guest_form' || step === 'guest_verify') && (
              <div className="raf-steps">
                <div className={`raf-step-dot ${step === 'guest_form' ? 'active' : 'completed'}`}>
                  <span className="raf-step-pill">1</span>
                  <span>Details</span>
                </div>
                <div className={`raf-step-line ${step === 'guest_verify' ? 'completed' : ''}`} />
                <div className={`raf-step-dot ${step === 'guest_verify' ? 'active' : ''}`}>
                  <span className="raf-step-pill">2</span>
                  <span>Verification</span>
                </div>
                <div className="raf-step-line" />
                <div className="raf-step-dot">
                  <span className="raf-step-pill">3</span>
                  <span>Access</span>
                </div>
              </div>
            )}
          </div>

          <button 
            type="button" 
            className="raf-close-btn" 
            onClick={onClose}
            aria-label="Close modal"
          >
            <X size={17} />
          </button>
        </div>

        {/* Body */}
        <div className="raf-body">
          {/* Property Summary Mini Card */}
          <div className="raf-prop-card">
            <img 
              src={listing.photos?.[0] || 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=600&q=80'} 
              alt={listing.title} 
              className="raf-prop-thumb"
            />
            <div className="raf-prop-info">
              <div className="raf-prop-title">{listing.title}</div>
              <div className="raf-prop-meta">
                <span>{listing.area}, Ibadan</span>
                <span>·</span>
                <span className="raf-prop-price">{formatNaira(listing.price)}/yr</span>
              </div>
            </div>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="raf-alert error">
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          {/* =========================================================
              MODAL 1: NEW USER SIGNUP & REQUEST ACCESS FORM
             ========================================================= */}
          {step === 'guest_form' && (
            <form onSubmit={handleGuestSubmit}>
              {/* Reassurance Box */}
              <div className="raf-reassurance">
                <Sparkles size={16} color="#6d35c9" style={{ flexShrink: 0, marginTop: 2 }} />
                <div className="raf-reassurance-text">
                  <strong>Free Request Submission:</strong> Creating your account lets us notify you as soon as the landlord confirms vacancy. Nothing is charged to submit this inquiry.
                </div>
              </div>

              {/* Full Name */}
              <div className="raf-field">
                <label className="raf-label">Full Name</label>
                <div className="raf-input-wrap">
                  <UserIcon size={16} className="raf-input-icon" />
                  <input
                    type="text"
                    className="raf-input"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Adeola Johnson"
                    required
                    autoFocus
                  />
                </div>
              </div>

              {/* Email Address */}
              <div className="raf-field">
                <label className="raf-label">Email Address</label>
                <div className="raf-input-wrap">
                  <Mail size={16} className="raf-input-icon" />
                  <input
                    type="email"
                    className="raf-input"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                  />
                </div>
                <div className="raf-help-text">
                  We'll send your 6-digit confirmation code and landlord contact details here.
                </div>
              </div>

              {/* Phone Number with Live Nigerian Validation */}
              <div className="raf-field">
                <label className="raf-label">WhatsApp Phone Number</label>
                <div className="raf-input-wrap">
                  <Phone size={16} className="raf-input-icon" />
                  <input
                    type="tel"
                    className={`raf-input ${phoneTouched && !phoneValidation.isValid ? 'has-error' : phoneTouched && phoneValidation.isValid ? 'is-valid' : ''}`}
                    value={phone}
                    onChange={(e) => {
                      setPhone(e.target.value);
                      if (!phoneTouched) setPhoneTouched(true);
                    }}
                    onBlur={() => setPhoneTouched(true)}
                    placeholder="0803 123 4567"
                    required
                  />
                  {phoneTouched && phoneValidation.isValid && (
                    <CheckCircle2 size={16} color="#16a34a" style={{ position: 'absolute', right: 12 }} />
                  )}
                </div>
                {phoneTouched && !phoneValidation.isValid && phone.trim().length > 0 && (
                  <div className="raf-error-text">
                    <AlertCircle size={13} />
                    <span>{phoneValidation.errorMessage}</span>
                  </div>
                )}
                {(!phoneTouched || phone.trim().length === 0) && (
                  <div className="raf-help-text">
                    Must be a valid 11-digit Nigerian number (e.g. 0803 123 4567).
                  </div>
                )}
              </div>

              {/* Password 1 */}
              <div className="raf-field">
                <label className="raf-label">Create Password</label>
                <div className="raf-input-wrap">
                  <Lock size={16} className="raf-input-icon" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="raf-input"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    minLength={6}
                    required
                  />
                  <button
                    type="button"
                    className="raf-toggle-pw"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Password 2 (Confirm Password) */}
              <div className="raf-field">
                <label className="raf-label">Confirm Password (Password Two)</label>
                <div className="raf-input-wrap">
                  <Lock size={16} className="raf-input-icon" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    className={`raf-input ${confirmPassword && confirmPassword !== password ? 'has-error' : confirmPassword && confirmPassword === password ? 'is-valid' : ''}`}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter your password"
                    required
                  />
                  <button
                    type="button"
                    className="raf-toggle-pw"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    tabIndex={-1}
                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                  >
                    {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {confirmPassword && confirmPassword !== password && (
                  <div className="raf-error-text">
                    <AlertCircle size={13} />
                    <span>Passwords do not match.</span>
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                className="raf-btn-primary"
                disabled={isLoading || !fullName.trim() || !email.trim() || !phoneValidation.isValid || !password || password !== confirmPassword}
              >
                <span>{isLoading ? 'Creating Account & Sending Code...' : 'Sign Up & Request Access (Free)'}</span>
                <ArrowRight size={16} />
              </button>

              <button
                type="button"
                className="raf-btn-ghost"
                onClick={onClose}
              >
                Cancel
              </button>

              {/* Switch to Existing Account Sign In */}
              <div className="raf-switch-link">
                Already have a Rentivo account?
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setStep('signin_inline');
                  }}
                >
                  Sign In
                </button>
              </div>
            </form>
          )}

          {/* =========================================================
              MODAL 2: 6-DIGIT VERIFICATION CODE MODAL
             ========================================================= */}
          {step === 'guest_verify' && (
            <div>
              <div className="raf-verify-hero">
                <div className="raf-verify-badge">
                  <Mail size={24} />
                </div>
                <h3>Enter 6-Digit Code</h3>
                <p>
                  We sent a verification code to <strong>{email}</strong>. Enter it below to activate your account and grant property access.
                </p>
              </div>

              {/* 6-Digit Code Inputs */}
              <div className="raf-otp-wrap" onPaste={handlePasteOtp}>
                {digits.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={(el) => { inputRefs.current[idx] = el; }}
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={1}
                    className={`raf-otp-box ${digit ? 'filled' : ''}`}
                    value={digit}
                    onChange={(e) => handleDigitChange(idx, e.target.value)}
                    onKeyDown={(e) => handleDigitKeyDown(idx, e)}
                  />
                ))}
              </div>

              {/* Submit Verification */}
              <button
                type="button"
                className="raf-btn-primary"
                onClick={() => void executeVerifyCode()}
                disabled={isLoading || digits.join('').length !== 6}
              >
                <span>{isLoading ? 'Verifying & Granting Access...' : 'Verify & Grant Access'}</span>
                <ArrowRight size={16} />
              </button>

              {/* Resend Code & Edit Email Actions */}
              <div className="raf-verify-footer">
                <div style={{ fontSize: '12.5px', color: '#6b6b8d', marginBottom: 6 }}>
                  Didn't receive the code?
                </div>
                <button
                  type="button"
                  className="raf-resend-btn"
                  onClick={handleResendOtp}
                  disabled={resendCooldown > 0 || isResending}
                >
                  {isResending ? 'Resending code...' : resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : 'Resend 6-digit code'}
                </button>
                <div style={{ marginTop: 8 }}>
                  <button
                    type="button"
                    style={{ background: 'none', border: 'none', color: '#6b6b8d', fontSize: '11.5px', textDecoration: 'underline', cursor: 'pointer' }}
                    onClick={() => {
                      setError(null);
                      setStep('guest_form');
                    }}
                  >
                    Edit email address
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* =========================================================
              MODAL: INLINE SIGN IN (For existing accounts)
             ========================================================= */}
          {step === 'signin_inline' && (
            <form onSubmit={handleInlineSignIn}>
              <div className="raf-field">
                <label className="raf-label">Email Address</label>
                <div className="raf-input-wrap">
                  <Mail size={16} className="raf-input-icon" />
                  <input
                    type="email"
                    className="raf-input"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    autoFocus
                  />
                </div>
              </div>

              <div className="raf-field">
                <label className="raf-label">Password</label>
                <div className="raf-input-wrap">
                  <Lock size={16} className="raf-input-icon" />
                  <input
                    type={showSigninPassword ? 'text' : 'password'}
                    className="raf-input"
                    value={signinPassword}
                    onChange={(e) => setSigninPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                  />
                  <button
                    type="button"
                    className="raf-toggle-pw"
                    onClick={() => setShowSigninPassword(!showSigninPassword)}
                    tabIndex={-1}
                  >
                    {showSigninPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="raf-btn-primary"
                disabled={isLoading || !email.trim() || !signinPassword}
              >
                <span>{isLoading ? 'Signing In & Submitting...' : 'Sign In & Request Access'}</span>
                <ArrowRight size={16} />
              </button>

              <button
                type="button"
                className="raf-btn-ghost"
                onClick={() => {
                  setError(null);
                  setStep('guest_form');
                }}
              >
                Back to Sign Up
              </button>
            </form>
          )}

          {/* =========================================================
              MODAL: LOGGED IN USER REQUEST FORM
             ========================================================= */}
          {step === 'logged_in_form' && user && (
            <form onSubmit={handleLoggedInSubmit}>
              <p style={{ fontSize: '13.5px', color: '#55557a', marginBottom: 16, lineHeight: 1.5 }}>
                Submitting request as <strong>{user.name}</strong> ({user.email}). We'll save this directly to your <strong>My Requests</strong> portal.
              </p>

              <div className="raf-field">
                <label className="raf-label">Phone Number for Landlord Confirmation</label>
                <div className="raf-input-wrap">
                  <Phone size={16} className="raf-input-icon" />
                  <input
                    type="tel"
                    className={`raf-input ${phoneTouched && !phoneValidation.isValid ? 'has-error' : phoneTouched && phoneValidation.isValid ? 'is-valid' : ''}`}
                    value={phone}
                    onChange={(e) => {
                      setPhone(e.target.value);
                      if (!phoneTouched) setPhoneTouched(true);
                    }}
                    onBlur={() => setPhoneTouched(true)}
                    placeholder="0803 123 4567"
                    required
                  />
                  {phoneValidation.isValid && (
                    <CheckCircle2 size={16} color="#16a34a" style={{ position: 'absolute', right: 12 }} />
                  )}
                </div>
                {phoneTouched && !phoneValidation.isValid && (
                  <div className="raf-error-text">
                    <AlertCircle size={13} />
                    <span>{phoneValidation.errorMessage}</span>
                  </div>
                )}
              </div>

              <button
                type="submit"
                className="raf-btn-primary"
                disabled={isLoading || !phoneValidation.isValid}
              >
                <span>{isLoading ? 'Submitting Request...' : 'Send Request (Free)'}</span>
                <ArrowRight size={16} />
              </button>

              <button
                type="button"
                className="raf-btn-ghost"
                onClick={onClose}
              >
                Cancel
              </button>
            </form>
          )}

        </div>
      </div>
    </div>
  );
};
