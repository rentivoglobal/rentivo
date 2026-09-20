import React, { useState } from 'react';
import { Lock, CheckCircle2, AlertCircle, Eye, EyeOff, ArrowRight, ShieldCheck } from 'lucide-react';
import { authService } from '../services/authService';

interface ResetPasswordPageProps {
  onSuccess: () => void;
  onNavigateHome: () => void;
}

export const ResetPasswordPage: React.FC<ResetPasswordPageProps> = ({
  onSuccess,
  onNavigateHome
}) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Password rules validation
  const hasMinLength = password.length >= 8;
  const hasNumber = /\d/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const passwordsMatch = password === confirmPassword && password.length > 0;
  const isFormValid = hasMinLength && hasNumber && passwordsMatch;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!isFormValid) {
      setError('Please ensure your password meets all strength requirements and passwords match.');
      return;
    }

    setLoading(true);
    const result = await authService.updatePassword(password);
    setLoading(false);
    if (!result.success) {
      setError(result.error || 'Could not update password.');
      return;
    }
    setSuccess(true);
  };

  return (
    <div style={{ backgroundColor: '#F8FAFC', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '30px 20px' }}>
      
      {/* Brand Header */}
      <div style={{ marginBottom: '28px', textAlign: 'center' }}>
        <a 
          href="/" 
          onClick={(e) => { e.preventDefault(); onNavigateHome(); }} 
          style={{ textDecoration: 'none', display: 'inline-block' }}
        >
          <img src="/RENTIVO-lockup.svg" alt="Rentivo" style={{ height: '36px' }} />
        </a>
      </div>

      {/* Main Card */}
      <div style={{
        maxWidth: '440px',
        width: '100%',
        backgroundColor: '#FFFFFF',
        borderRadius: '20px',
        border: '1.5px solid #E2E8F0',
        boxShadow: '0 10px 30px rgba(0, 0, 82, 0.06)',
        padding: '36px 32px'
      }}>
        {success ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              backgroundColor: '#ECFDF5',
              color: '#047857',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px'
            }}>
              <CheckCircle2 size={34} />
            </div>

            <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#000052', margin: '0 0 8px' }}>
              Password Reset Successful!
            </h2>
            <p style={{ fontSize: '13.5px', color: '#64748B', lineHeight: 1.6, margin: '0 0 24px' }}>
              Your account password has been securely updated. You can now sign in with your new credentials.
            </p>

            <button
              type="button"
              onClick={onSuccess}
              style={{
                width: '100%',
                backgroundColor: '#000052',
                color: '#FFFFFF',
                border: 'none',
                padding: '12px',
                borderRadius: '9999px',
                fontSize: '13.5px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              <span>Continue to Sign In</span>
              <ArrowRight size={14} />
            </button>
          </div>
        ) : (
          <div>
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <div style={{
                width: '52px',
                height: '52px',
                borderRadius: '50%',
                backgroundColor: '#F0E6FF',
                color: '#000052',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 12px'
              }}>
                <Lock size={24} />
              </div>
              <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#000052', margin: '0 0 6px' }}>
                Set New Password
              </h2>
              <p style={{ fontSize: '13px', color: '#64748B', margin: 0 }}>
                Enter your new secure password below to regain access.
              </p>
            </div>

            {error && (
              <div style={{
                backgroundColor: '#FEF2F2',
                border: '1px solid #FECACA',
                borderRadius: '8px',
                padding: '10px 14px',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                color: '#DC2626',
                fontSize: '12.5px'
              }}>
                <AlertCircle size={15} style={{ flexShrink: 0 }} />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              {/* New Password */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  New Password
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter at least 8 characters"
                    required
                    style={{
                      width: '100%',
                      height: '42px',
                      padding: '0 40px 0 12px',
                      borderRadius: '8px',
                      border: '1.5px solid #CBD5E1',
                      fontSize: '13.5px',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: 0 }}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Confirm New Password
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter your new password"
                  required
                  style={{
                    width: '100%',
                    height: '42px',
                    padding: '0 12px',
                    borderRadius: '8px',
                    border: '1.5px solid #CBD5E1',
                    fontSize: '13.5px',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {/* Password Checklist */}
              <div style={{ backgroundColor: '#F8FAFC', borderRadius: '8px', padding: '10px 12px', marginBottom: '20px', fontSize: '12px', color: '#64748B' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: hasMinLength ? '#16794A' : '#94A3B8', marginBottom: '3px' }}>
                  <ShieldCheck size={13} />
                  <span>At least 8 characters</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: hasNumber ? '#16794A' : '#94A3B8', marginBottom: '3px' }}>
                  <ShieldCheck size={13} />
                  <span>Contains at least one number</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: passwordsMatch ? '#16794A' : '#94A3B8' }}>
                  <ShieldCheck size={13} />
                  <span>Passwords match</span>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !isFormValid}
                style={{
                  width: '100%',
                  backgroundColor: isFormValid ? '#000052' : '#CBD5E1',
                  color: '#FFFFFF',
                  border: 'none',
                  padding: '12px',
                  borderRadius: '9999px',
                  fontSize: '13.5px',
                  fontWeight: 700,
                  cursor: isFormValid ? 'pointer' : 'not-allowed',
                  transition: 'background-color 0.2s ease'
                }}
              >
                {loading ? 'Updating Password...' : 'Save New Password'}
              </button>
            </form>
          </div>
        )}
      </div>

      <div style={{ marginTop: '20px', fontSize: '12px', color: '#94A3B8' }}>
        Rentivo Account Security • Ibadan, Nigeria
      </div>
    </div>
  );
};
