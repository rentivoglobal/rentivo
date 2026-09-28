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
  Check,
  X
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

  const editEmailInputId = useId();

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
    if (!isEditingEmail && !success) {
      const firstEmpty = digits.findIndex(d => !d);
      const targetIndex = firstEmpty !== -1 ? firstEmpty : 0;
      inputRefs.current[targetIndex]?.focus();
    }
  }, [isEditingEmail, success]);

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

    // Pick latest typed digit
    const nextDigits = [...digits];
    nextDigits[index] = cleaned[cleaned.length - 1];
    setDigits(nextDigits);

    // Auto-advance to next input
    if (index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit if all 6 digits are entered
    const fullCode = nextDigits.join('');
    if (fullCode.length === 6) {
      void executeVerification(fullCode);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (!digits[index] && index > 0) {
        // Move back to previous box, clear it, and focus it
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
    setResendFeedback(null);

    const raw = e.clipboardData.getData('text');
    const cleaned = raw.replace(/\D/g, '');
    if (!cleaned) return;

    // Strictly extract the first 6 digits only
    const sixDigits = cleaned.slice(0, 6);
    const nextDigits = ['', '', '', '', '', ''];
    for (let i = 0; i < 6; i++) {
      nextDigits[i] = sixDigits[i] || '';
    }
    setDigits(nextDigits);

    if (sixDigits.length === 6) {
      inputRefs.current[5]?.focus();
      void executeVerification(sixDigits);
    } else {
      inputRefs.current[sixDigits.length]?.focus();
    }
  };

  const executeVerification = async (codeOverride?: string) => {
    const rawCode = codeOverride || digits.join('');
    const code = rawCode.replace(/\D/g, '').trim();
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
        setError(res.error || 'Invalid or expired verification code. Please check your email or request a new code.');
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

  const isComplete = digits.join('').length === 6;

  return (
    <div style={{
      backgroundColor: '#F8FAFC',
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '32px 16px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif',
      boxSizing: 'border-box'
    }}>

      {/* Brand Header */}
      <div style={{ marginBottom: '20px', textAlign: 'center' }}>
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
            style={{ width: '30px', height: '30px', borderRadius: '6px' }} 
          />
          <span style={{ fontSize: '19px', fontWeight: 800, color: '#000052', letterSpacing: '-0.3px' }}>
            RENTIVO
          </span>
        </button>
      </div>

      {/* Top Back Link */}
      <div style={{ maxWidth: '430px', width: '100%', marginBottom: '12px' }}>
        <button
          type="button"
          onClick={() => {
            if (window.history.length > 1) {
              navigate(-1);
            } else {
              navigate('/login');
            }
          }}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            background: 'none',
            border: 'none',
            color: '#000052',
            fontSize: '13px',
            fontWeight: 700,
            cursor: 'pointer',
            padding: 0
          }}
          aria-label="Back"
        >
          <ArrowLeft size={14} />
          <span>Back</span>
        </button>
      </div>

      {/* Centered Minimalist Card */}
      <div style={{
        maxWidth: '430px',
        width: '100%',
        backgroundColor: '#FFFFFF',
        borderRadius: '16px',
        border: '1px solid #E2E8F0',
        boxShadow: '0 4px 20px -2px rgba(0, 0, 82, 0.04), 0 2px 6px -1px rgba(0, 0, 0, 0.02)',
        padding: '32px 28px',
        boxSizing: 'border-box',
        transition: 'transform 0.2s ease',
        transform: shake ? 'translateX(-6px)' : 'none'
      }}>

        {success ? (
          /* Success State View */
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              backgroundColor: '#ECFDF5',
              color: '#059669',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px'
            }}>
              <CheckCircle2 size={32} />
            </div>

            <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#000052', margin: '0 0 6px', letterSpacing: '-0.2px' }}>
              Verification Successful
            </h2>
            <p style={{ fontSize: '14px', color: '#64748B', lineHeight: 1.5, margin: '0 0 20px' }}>
              Your account is verified. Redirecting you to {verifyType === 'signup' && initialRole === 'renter' ? 'renter onboarding' : 'your portal'}…
            </p>

            <div style={{
              display: 'inline-block',
              width: '24px',
              height: '24px',
              border: '2.5px solid #000052',
              borderTopColor: 'transparent',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite'
            }} />
          </div>
        ) : (
          /* Verification Form */
          <div>
            {/* Header Lockup */}
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <div style={{
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                backgroundColor: '#EEF2F6',
                color: '#000052',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '12px'
              }}>
                {verifyType === 'signup' ? (
                  <ShieldCheck size={22} color="#000052" />
                ) : (
                  <KeyRound size={22} color="#000052" />
                )}
              </div>

              <h1 style={{
                fontSize: '21px',
                fontWeight: 700,
                color: '#000052',
                margin: '0 0 8px',
                letterSpacing: '-0.3px'
              }}>
                {verifyType === 'signup' ? 'Verify your email' : 'Sign in with code'}
              </h1>

              {/* Minimalist Email Pill / Inline Editor */}
              {isEditingEmail ? (
                <form onSubmit={handleSaveEmail} style={{ marginTop: '10px' }}>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <input
                      id={editEmailInputId}
                      type="email"
                      value={editedEmail}
                      onChange={(e) => setEditedEmail(e.target.value)}
                      placeholder="name@example.com"
                      autoFocus
                      style={{
                        flex: 1,
                        padding: '8px 12px',
                        borderRadius: '8px',
                        border: '1.5px solid #CBD5E1',
                        fontSize: '13px',
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
                        padding: '8px 12px',
                        borderRadius: '8px',
                        fontSize: '12.5px',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      Save
                    </button>
                    {email && (
                      <button
                        type="button"
                        onClick={() => { setEditedEmail(email); setIsEditingEmail(false); }}
                        style={{
                          background: '#F1F5F9',
                          border: 'none',
                          padding: '8px',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        <X size={14} color="#64748B" />
                      </button>
                    )}
                  </div>
                </form>
              ) : (
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  backgroundColor: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  borderRadius: '999px',
                  padding: '5px 12px',
                  maxWidth: '100%',
                  boxSizing: 'border-box'
                }}>
                  <Mail size={13} color="#64748B" style={{ flexShrink: 0 }} />
                  <span style={{
                    fontSize: '13px',
                    color: '#000052',
                    fontWeight: 600,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    maxWidth: '240px'
                  }}>
                    {email || 'your email'}
                  </span>
                  <button
                    type="button"
                    onClick={() => { setEditedEmail(email); setIsEditingEmail(true); }}
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: 0,
                      color: '#64748B',
                      fontSize: '12px',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '2px',
                      textDecoration: 'underline'
                    }}
                    title="Change email"
                  >
                    <Edit2 size={10} />
                    <span>Edit</span>
                  </button>
                </div>
              )}

              <p style={{
                fontSize: '13px',
                color: '#64748B',
                margin: '8px 0 0',
                lineHeight: 1.4
              }}>
                Enter the 6-digit verification code sent to your inbox.
              </p>
            </div>

            {/* Error Notification */}
            {error && (
              <div style={{
                backgroundColor: '#FEF2F2',
                border: '1px solid #FCA5A5',
                borderRadius: '8px',
                padding: '10px 12px',
                marginBottom: '18px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '8px'
              }}>
                <AlertCircle size={16} color="#DC2626" style={{ flexShrink: 0, marginTop: '2px' }} />
                <span style={{ fontSize: '12.5px', color: '#991B1B', lineHeight: 1.4 }}>
                  {error}
                </span>
              </div>
            )}

            {/* Resend Confirmation Banner */}
            {resendFeedback && (
              <div style={{
                backgroundColor: '#ECFDF5',
                border: '1px solid #A7F3D0',
                borderRadius: '8px',
                padding: '10px 12px',
                marginBottom: '18px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <Check size={16} color="#059669" style={{ flexShrink: 0 }} />
                <span style={{ fontSize: '12.5px', color: '#065F46', lineHeight: 1.4 }}>
                  {resendFeedback}
                </span>
              </div>
            )}

            {/* 6-Digit Code Input Section */}
            <div 
              onPaste={handlePaste}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                marginBottom: '22px'
              }}
            >
              {/* First 3 Digits */}
              {digits.slice(0, 3).map((digit, idx) => (
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
                    maxWidth: '46px',
                    height: '52px',
                    textAlign: 'center',
                    fontSize: '22px',
                    fontWeight: 700,
                    fontFamily: '"SF Mono", Monaco, Consolas, monospace',
                    color: '#000052',
                    backgroundColor: digit ? '#FFFFFF' : '#F8FAFC',
                    border: `1.5px solid ${digit ? '#000052' : '#CBD5E1'}`,
                    borderRadius: '10px',
                    outline: 'none',
                    transition: 'all 0.15s ease',
                    boxShadow: digit ? '0 1px 3px rgba(0, 0, 82, 0.06)' : 'none'
                  }}
                />
              ))}

              {/* Minimalist Divider Dash */}
              <div style={{
                width: '8px',
                height: '2px',
                backgroundColor: '#CBD5E1',
                margin: '0 2px'
              }} />

              {/* Last 3 Digits */}
              {digits.slice(3, 6).map((digit, relIdx) => {
                const idx = relIdx + 3;
                return (
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
                      maxWidth: '46px',
                      height: '52px',
                      textAlign: 'center',
                      fontSize: '22px',
                      fontWeight: 700,
                      fontFamily: '"SF Mono", Monaco, Consolas, monospace',
                      color: '#000052',
                      backgroundColor: digit ? '#FFFFFF' : '#F8FAFC',
                      border: `1.5px solid ${digit ? '#000052' : '#CBD5E1'}`,
                      borderRadius: '10px',
                      outline: 'none',
                      transition: 'all 0.15s ease',
                      boxShadow: digit ? '0 1px 3px rgba(0, 0, 82, 0.06)' : 'none'
                    }}
                  />
                );
              })}
            </div>

            {/* Primary Action Button */}
            <button
              type="button"
              disabled={isVerifying || !isComplete}
              onClick={() => void executeVerification()}
              style={{
                width: '100%',
                backgroundColor: isComplete ? '#000052' : '#E2E8F0',
                color: isComplete ? '#FFFFFF' : '#94A3B8',
                border: 'none',
                height: '46px',
                borderRadius: '10px',
                fontSize: '14px',
                fontWeight: 600,
                cursor: isComplete && !isVerifying ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'all 0.2s ease',
                boxShadow: isComplete ? '0 2px 8px rgba(0, 0, 82, 0.12)' : 'none'
              }}
            >
              {isVerifying ? (
                <>
                  <div style={{
                    width: '16px',
                    height: '16px',
                    border: '2px solid #FFFFFF',
                    borderTopColor: 'transparent',
                    borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite'
                  }} />
                  <span>Verifying Code…</span>
                </>
              ) : (
                <>
                  <span>Verify & Continue</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>

            {/* Resend Code Section */}
            <div style={{
              marginTop: '20px',
              paddingTop: '16px',
              borderTop: '1px solid #F1F5F9',
              textAlign: 'center'
            }}>
              <p style={{ fontSize: '13px', color: '#64748B', margin: '0 0 6px' }}>
                Didn't receive the email? Check spam or
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
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    textDecoration: 'underline'
                  }}
                >
                  <RotateCw size={12} className={isResending ? 'spin' : ''} />
                  {isResending ? 'Sending code…' : 'Resend 6-digit code'}
                </button>
              )}
            </div>

            {/* Secondary Switchers & Fallback Navigation */}
            <div style={{
              marginTop: '16px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '8px'
            }}>
              {verifyType === 'signup' ? (
                <button
                  type="button"
                  onClick={() => toggleVerifyType('login')}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#64748B',
                    fontSize: '12.5px',
                    cursor: 'pointer',
                    padding: 0
                  }}
                >
                  Need to log in instead? <span style={{ color: '#000052', fontWeight: 600, textDecoration: 'underline' }}>Login with code</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => toggleVerifyType('signup')}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#64748B',
                    fontSize: '12.5px',
                    cursor: 'pointer',
                    padding: 0
                  }}
                >
                  New account? <span style={{ color: '#000052', fontWeight: 600, textDecoration: 'underline' }}>Verify registration</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => navigate('/login')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#94A3B8',
                  fontSize: '12.5px',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: 0
                }}
              >
                <ArrowLeft size={12} />
                <span>Return to password sign in</span>
              </button>
            </div>

          </div>
        )}

      </div>

      {/* Trust & Guarantee Micro-Footer */}
      <div style={{
        marginTop: '20px',
        textAlign: 'center',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        color: '#94A3B8',
        fontSize: '12px'
      }}>
        <ShieldCheck size={13} color="#64748B" />
        <span>100% verified properties &middot; Direct landlord mandates &middot; Ibadan, Nigeria</span>
      </div>

    </div>
  );
};

export default VerifyPage;
