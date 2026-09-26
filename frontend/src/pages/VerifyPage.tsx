import React, { useState, useEffect, useRef, useId } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  ShieldCheck, 
  CheckCircle2, 
  AlertCircle, 
  ArrowLeft, 
  ArrowRight, 
  Mail, 
  RotateCw, 
  KeyRound,
  Edit2,
  Check
} from 'lucide-react';
import { authService } from '../services/authService';
import { useAuth } from '../contexts/AuthContext';
import { NavigationTab } from '../types';

interface VerifyPageProps {
  onSuccess?: (target?: NavigationTab) => void;
  onNavigateHome?: () => void;
}

export const VerifyPage: React.FC<VerifyPageProps> = ({
  onSuccess,
  onNavigateHome
}) => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { refresh } = useAuth();

  const initialEmail = searchParams.get('email') || '';
  const initialType = (searchParams.get('type') === 'login' ? 'login' : 'signup') as 'signup' | 'login';
  const initialRole = searchParams.get('role') || 'renter';
  const nextParam = searchParams.get('next') || '';

  const [email, setEmail] = useState(initialEmail);
  const [isEditingEmail, setIsEditingEmail] = useState(!initialEmail);
  const [editedEmail, setEditedEmail] = useState(initialEmail);
  const [verifyType, setVerifyType] = useState<'signup' | 'login'>(initialType);

  // 6 digit code boxes
  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', '']);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(45);
  const [error, setError] = useState<string | null>(null);
  const [shake, setShake] = useState(false);
  const [success, setSuccess] = useState(false);
  const [resendFeedback, setResendFeedback] = useState<string | null>(null);

  const emailInputId = useId();

  // Keep state synced with URL search params
  useEffect(() => {
    const qEmail = searchParams.get('email');
    if (qEmail && qEmail !== email) {
      setEmail(qEmail);
      setEditedEmail(qEmail);
      setIsEditingEmail(false);
    }
    const qType = searchParams.get('type');
    if (qType === 'login' || qType === 'signup') {
      setVerifyType(qType);
    }
  }, [searchParams]);

  // Focus the first input on mount
  useEffect(() => {
    if (!isEditingEmail) {
      const firstEmpty = digits.findIndex(d => !d);
      const targetIndex = firstEmpty !== -1 ? firstEmpty : 0;
      inputRefs.current[targetIndex]?.focus();
    }
  }, [isEditingEmail]);

  // Resend cooldown timer
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (resendCooldown > 0) {
      timer = setTimeout(() => setResendCooldown(prev => prev - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 450);
  };

  const handleDigitChange = (index: number, value: string) => {
    setError(null);
    setResendFeedback(null);

    // Extract only digits
    const cleaned = value.replace(/\D/g, '');
    if (!cleaned) {
      const nextDigits = [...digits];
      nextDigits[index] = '';
      setDigits(nextDigits);
      return;
    }

    // Single digit input
    const nextDigits = [...digits];
    nextDigits[index] = cleaned[cleaned.length - 1]; // pick the latest typed digit
    setDigits(nextDigits);

    // Auto-advance to next input
    if (index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit if all 6 digits are filled
    const fullCode = nextDigits.join('');
    if (fullCode.length === 6) {
      void executeVerification(fullCode);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (!digits[index] && index > 0) {
        // Move back to previous box and clear it
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

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    setError(null);
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;

    const nextDigits = [...digits];
    for (let i = 0; i < 6; i++) {
      nextDigits[i] = pasted[i] || '';
    }
    setDigits(nextDigits);

    if (pasted.length === 6) {
      inputRefs.current[5]?.focus();
      void executeVerification(pasted);
    } else {
      inputRefs.current[Math.min(pasted.length, 5)]?.focus();
    }
  };

  const executeVerification = async (codeOverride?: string) => {
    const code = codeOverride || digits.join('');
    setError(null);

    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Please provide a valid email address.');
      setIsEditingEmail(true);
      triggerShake();
      return;
    }

    if (code.length !== 6) {
      setError('Please enter all 6 digits of your verification code.');
      triggerShake();
      return;
    }

    setIsVerifying(true);

    try {
      const res = verifyType === 'signup' 
        ? await authService.verifySignupCode(email, code)
        : await authService.verifyLoginCode(email, code);

      if (!res.success) {
        setIsVerifying(false);
        setError(res.error || 'Verification failed. Please check the code or request a new one.');
        triggerShake();
        return;
      }

      setSuccess(true);
      await refresh();

      setTimeout(() => {
        // Redirection logic
        if (nextParam && nextParam.startsWith('/')) {
          navigate(nextParam, { replace: true });
          return;
        }

        if (verifyType === 'signup') {
          // If renter signup -> redirect immediately to renter onboarding!
          if (initialRole === 'renter' || res.user?.role === 'tenant' || res.user?.role === 'business_renter') {
            navigate('/onboarding/renter', { replace: true });
            return;
          }
          // If lister signup -> redirect to lister portal
          if (res.user?.role === 'landlord' || res.user?.role === 'agent') {
            navigate('/lister', { replace: true });
            return;
          }
        }

        // Login redirection
        if (res.user?.role === 'admin') {
          navigate('/admin', { replace: true });
        } else if (res.user?.role === 'landlord' || res.user?.role === 'agent') {
          navigate('/lister', { replace: true });
        } else {
          navigate('/search', { replace: true });
        }

        if (onSuccess) {
          onSuccess();
        }
      }, 700);

    } catch (err: any) {
      setIsVerifying(false);
      setError(err?.message || 'Verification could not be completed.');
      triggerShake();
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0 || isResending) return;
    if (!email.trim()) {
      setError('Please enter your email to resend the code.');
      setIsEditingEmail(true);
      return;
    }

    setIsResending(true);
    setError(null);
    setResendFeedback(null);

    const res = await authService.resendVerificationCode(email, verifyType);
    setIsResending(false);

    if (res.success) {
      setResendFeedback(`A fresh 6-digit code has been sent to ${email}.`);
      setResendCooldown(60);
      setDigits(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } else {
      setError(res.error || 'Could not resend verification code. Please try again.');
      triggerShake();
    }
  };

  const handleSaveEmail = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editedEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editedEmail.trim())) {
      setError('Enter a valid email address.');
      triggerShake();
      return;
    }
    setEmail(editedEmail.trim());
    setIsEditingEmail(false);
    setError(null);
    setSearchParams(prev => {
      prev.set('email', editedEmail.trim());
      return prev;
    }, { replace: true });
    // Reset digits
    setDigits(['', '', '', '', '', '']);
    setTimeout(() => inputRefs.current[0]?.focus(), 50);
  };

  const toggleVerifyType = (type: 'signup' | 'login') => {
    setVerifyType(type);
    setError(null);
    setResendFeedback(null);
    setDigits(['', '', '', '', '', '']);
    setSearchParams(prev => {
      prev.set('type', type);
      return prev;
    }, { replace: true });
    setTimeout(() => inputRefs.current[0]?.focus(), 50);
  };

  return (
    <div style={{
      backgroundColor: '#F8FAFC',
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '36px 16px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>

      {/* Brand Header */}
      <div style={{ marginBottom: '28px', textAlign: 'center' }}>
        <button
          type="button"
          onClick={() => onNavigateHome ? onNavigateHome() : navigate('/')}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 0,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <img 
            src="https://uovlgngsmvjcgkgznyme.supabase.co/storage/v1/object/public/assets/rentivo-logo.svg" 
            alt="Rentivo" 
            style={{ width: '32px', height: '32px', borderRadius: '6px' }} 
          />
          <span style={{ fontSize: '20px', fontWeight: 800, color: '#000052', letterSpacing: '-0.4px' }}>
            RENTIVO
          </span>
        </button>
      </div>

      {/* Centered Minimalist Card */}
      <div style={{
        maxWidth: '460px',
        width: '100%',
        backgroundColor: '#FFFFFF',
        borderRadius: '20px',
        border: '1px solid #E2E8F0',
        boxShadow: '0 10px 30px rgba(0, 0, 82, 0.05), 0 1px 3px rgba(0, 0, 0, 0.02)',
        padding: '36px 32px',
        transition: 'transform 0.2s ease',
        transform: shake ? 'translateX(-6px)' : 'none'
      }}>

        {success ? (
          /* Success State View */
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              backgroundColor: '#ECFDF5',
              color: '#047857',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px'
            }}>
              <CheckCircle2 size={36} />
            </div>

            <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#000052', margin: '0 0 8px', letterSpacing: '-0.3px' }}>
              Verification Successful!
            </h2>
            <p style={{ fontSize: '14.5px', color: '#64748B', lineHeight: 1.6, margin: '0 0 20px' }}>
              Your account is verified. Redirecting you to {verifyType === 'signup' && initialRole === 'renter' ? 'renter onboarding' : 'your portal'}…
            </p>

            <div style={{ display: 'inline-block', width: '28px', height: '28px', border: '3px solid #000052', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          </div>
        ) : (
          /* Verification Form */
          <div>
            {/* Top Type Switcher Pills */}
            <div style={{
              display: 'flex',
              backgroundColor: '#F1F5F9',
              borderRadius: '10px',
              padding: '4px',
              marginBottom: '24px'
            }}>
              <button
                type="button"
                onClick={() => toggleVerifyType('signup')}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  borderRadius: '7px',
                  fontSize: '13px',
                  fontWeight: verifyType === 'signup' ? 700 : 500,
                  color: verifyType === 'signup' ? '#000052' : '#64748B',
                  backgroundColor: verifyType === 'signup' ? '#FFFFFF' : 'transparent',
                  border: 'none',
                  boxShadow: verifyType === 'signup' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                Sign Up Verification
              </button>
              <button
                type="button"
                onClick={() => toggleVerifyType('login')}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  borderRadius: '7px',
                  fontSize: '13px',
                  fontWeight: verifyType === 'login' ? 700 : 500,
                  color: verifyType === 'login' ? '#000052' : '#64748B',
                  backgroundColor: verifyType === 'login' ? '#FFFFFF' : 'transparent',
                  border: 'none',
                  boxShadow: verifyType === 'login' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                Login with Code
              </button>
            </div>

            {/* Title & Explanatory Subtitle */}
            <div style={{ marginBottom: '24px' }}>
              <div style={{
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                backgroundColor: '#F0E6FF',
                color: '#000052',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '14px'
              }}>
                <KeyRound size={22} color="#000052" />
              </div>

              <h1 style={{
                fontSize: '22px',
                fontWeight: 800,
                color: '#000052',
                margin: '0 0 8px',
                letterSpacing: '-0.3px'
              }}>
                {verifyType === 'signup' ? 'Verify your email address' : 'Enter 6-digit login code'}
              </h1>

              {isEditingEmail ? (
                <form onSubmit={handleSaveEmail} style={{ marginTop: '12px' }}>
                  <label htmlFor={emailInputId} style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                    Email address receiving the code:
                  </label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      id={emailInputId}
                      type="email"
                      value={editedEmail}
                      onChange={(e) => setEditedEmail(e.target.value)}
                      placeholder="e.g. name@example.com"
                      autoFocus
                      style={{
                        flex: 1,
                        padding: '9px 12px',
                        borderRadius: '8px',
                        border: '1.5px solid #CBD5E1',
                        fontSize: '14px',
                        outline: 'none',
                        color: '#000052'
                      }}
                    />
                    <button
                      type="submit"
                      style={{
                        backgroundColor: '#000052',
                        color: '#FFFFFF',
                        border: 'none',
                        padding: '0 16px',
                        borderRadius: '8px',
                        fontSize: '13px',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      Save
                    </button>
                  </div>
                </form>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '14px', color: '#64748B' }}>
                    We sent a 6-digit code to
                  </span>
                  <strong style={{ fontSize: '14px', color: '#000052' }}>
                    {email || 'your email'}
                  </strong>
                  <button
                    type="button"
                    onClick={() => { setEditedEmail(email); setIsEditingEmail(true); }}
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: '2px 6px',
                      color: '#6366F1',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '3px'
                    }}
                  >
                    <Edit2 size={11} />
                    Edit
                  </button>
                </div>
              )}
            </div>

            {/* Error Banner */}
            {error && (
              <div style={{
                backgroundColor: '#FEF2F2',
                border: '1px solid #FCA5A5',
                borderRadius: '10px',
                padding: '12px 14px',
                marginBottom: '20px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px'
              }}>
                <AlertCircle size={18} color="#B91C1C" style={{ flexShrink: 0, marginTop: '2px' }} />
                <span style={{ fontSize: '13px', color: '#991B1B', lineHeight: 1.4 }}>
                  {error}
                </span>
              </div>
            )}

            {/* Resend Success Banner */}
            {resendFeedback && (
              <div style={{
                backgroundColor: '#ECFDF5',
                border: '1px solid #A7F3D0',
                borderRadius: '10px',
                padding: '12px 14px',
                marginBottom: '20px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}>
                <Check size={18} color="#047857" style={{ flexShrink: 0 }} />
                <span style={{ fontSize: '13px', color: '#065F46', lineHeight: 1.4 }}>
                  {resendFeedback}
                </span>
              </div>
            )}

            {/* 6 Individual Digit Inputs */}
            <div 
              onPaste={handlePaste}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: '8px',
                marginBottom: '24px'
              }}
            >
              {digits.map((digit, idx) => (
                <input
                  key={idx}
                  ref={el => { inputRefs.current[idx] = el; }}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={1}
                  value={digit}
                  disabled={isVerifying}
                  onChange={e => handleDigitChange(idx, e.target.value)}
                  onKeyDown={e => handleKeyDown(idx, e)}
                  onFocus={e => e.target.select()}
                  style={{
                    width: '100%',
                    maxWidth: '56px',
                    height: '58px',
                    textAlign: 'center',
                    fontSize: '24px',
                    fontWeight: 700,
                    fontFamily: '"SF Mono", Monaco, Consolas, monospace',
                    color: '#000052',
                    backgroundColor: digit ? '#F8FAFC' : '#FFFFFF',
                    border: `2px solid ${digit ? '#000052' : '#CBD5E1'}`,
                    borderRadius: '12px',
                    outline: 'none',
                    transition: 'all 0.15s ease',
                    boxShadow: digit ? '0 2px 8px rgba(0, 0, 82, 0.08)' : 'none'
                  }}
                />
              ))}
            </div>

            {/* Primary Action Button */}
            <button
              type="button"
              disabled={isVerifying || digits.join('').length !== 6}
              onClick={() => void executeVerification()}
              style={{
                width: '100%',
                backgroundColor: digits.join('').length === 6 ? '#000052' : '#94A3B8',
                color: '#FFFFFF',
                border: 'none',
                padding: '14px',
                borderRadius: '12px',
                fontSize: '15px',
                fontWeight: 700,
                cursor: digits.join('').length === 6 && !isVerifying ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'all 0.2s ease',
                boxShadow: digits.join('').length === 6 ? '0 4px 12px rgba(0, 0, 82, 0.2)' : 'none'
              }}
            >
              {isVerifying ? (
                <>
                  <div style={{ width: '18px', height: '18px', border: '2px solid #FFFFFF', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                  <span>Verifying Code…</span>
                </>
              ) : (
                <>
                  <span>Verify & Continue</span>
                  <ArrowRight size={18} />
                </>
              )}
            </button>

            {/* Resend Code Section */}
            <div style={{
              marginTop: '22px',
              paddingTop: '18px',
              borderTop: '1px solid #F1F5F9',
              textAlign: 'center'
            }}>
              <p style={{ fontSize: '13px', color: '#64748B', margin: '0 0 8px' }}>
                Didn't receive the verification code?
              </p>

              {resendCooldown > 0 ? (
                <span style={{ fontSize: '13px', color: '#94A3B8', fontWeight: 500 }}>
                  Resend available in <strong style={{ color: '#000052' }}>{resendCooldown}s</strong>
                </span>
              ) : (
                <button
                  type="button"
                  disabled={isResending}
                  onClick={handleResend}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#000052',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    textDecoration: 'underline'
                  }}
                >
                  <RotateCw size={13} className={isResending ? 'spin' : ''} />
                  {isResending ? 'Sending code…' : 'Resend Code Now'}
                </button>
              )}
            </div>

            {/* Fallback to Password Sign In */}
            <div style={{ marginTop: '20px', textAlign: 'center' }}>
              <button
                type="button"
                onClick={() => navigate('/login')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#64748B',
                  fontSize: '13px',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px'
                }}
              >
                <ArrowLeft size={13} />
                <span>Return to password sign in</span>
              </button>
            </div>

          </div>
        )}

      </div>

      {/* Trust & Guarantee Micro-Footer */}
      <div style={{ marginTop: '24px', textAlign: 'center', display: 'flex', alignItems: 'center', gap: '8px', color: '#94A3B8', fontSize: '12px' }}>
        <ShieldCheck size={14} color="#64748B" />
        <span>100% verified properties &middot; Direct landlord mandates &middot; Ibadan, Nigeria</span>
      </div>

    </div>
  );
};
