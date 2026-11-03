import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import {
  ShieldCheck,
  ShieldAlert,
  Lock,
  Mail,
  User,
  Phone,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Sparkles,
  ExternalLink
} from 'lucide-react';
import { adminService } from '../services/adminService';
import { AdminRoleTier } from '../types';
import { useAuth } from '../contexts/AuthContext';

interface AdminInviteAcceptPageProps {
  showToast: (msg: string) => void;
}

export const AdminInviteAcceptPage: React.FC<AdminInviteAcceptPageProps> = ({ showToast }) => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user: currentUser, refresh: refreshAuth } = useAuth();

  const token = searchParams.get('token') || '';
  const emailParam = searchParams.get('email') || '';

  const [isLoading, setIsLoading] = useState(true);
  const [isValid, setIsValid] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [invitationData, setInvitationData] = useState<{
    email: string;
    fullName: string;
    role: AdminRoleTier;
    invitedByName?: string;
    notes?: string;
    expiresAt: string;
  } | null>(null);

  // Form states
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Verify token on mount
  useEffect(() => {
    let mounted = true;
    const verifyToken = async () => {
      if (!token) {
        setIsLoading(false);
        setIsValid(false);
        setErrorMessage('Invitation token is missing from the URL. Please verify your invitation link.');
        return;
      }

      try {
        const res = await adminService.verifyInvitationToken(token);
        if (!mounted) return;

        if (!res.valid || !res.invitation) {
          setIsValid(false);
          setErrorMessage(res.error || 'This invitation link is invalid or has expired.');
        } else {
          setIsValid(true);
          setInvitationData(res.invitation);
          setFullName(res.invitation.fullName);
        }
      } catch (err: any) {
        if (!mounted) return;
        setIsValid(false);
        setErrorMessage(err?.message || 'Error validating invitation link.');
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    verifyToken();
    return () => {
      mounted = false;
    };
  }, [token]);

  const roleTitle = invitationData?.role === 'super_admin'
    ? 'Super Administrator'
    : invitationData?.role === 'auditor'
    ? 'Field Verification Auditor'
    : 'Operations Administrator';

  const isAlreadyLoggedInWithMatch =
    currentUser &&
    invitationData &&
    currentUser.email.toLowerCase() === invitationData.email.toLowerCase();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isAlreadyLoggedInWithMatch) {
      if (!password || password.length < 8) {
        showToast('Password must be at least 8 characters long.');
        return;
      }
      if (password !== confirmPassword) {
        showToast('Passwords do not match. Please re-enter.');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const res = await adminService.acceptInvitation(token, {
        password: isAlreadyLoggedInWithMatch ? undefined : password,
        phone: phone.trim() || undefined,
        fullName: fullName.trim() || undefined
      });

      if (!res.success) {
        showToast(`Could not complete setup: ${res.error || 'Please try again'}`);
        return;
      }

      await refreshAuth();
      showToast('🎉 Administrator privileges activated! Welcome to the team.');
      navigate('/admin');
    } catch (err: any) {
      showToast(`Error accepting invitation: ${err?.message || 'Please try again'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          backgroundColor: '#F4F3F8',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px'
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <RefreshCw size={36} color="#000052" className="verif-spinner" style={{ margin: '0 auto 16px' }} />
          <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#000052', margin: '0 0 6px' }}>
            Verifying Admin Authorization...
          </h3>
          <p style={{ fontSize: '13.5px', color: '#5D5D78', margin: 0 }}>
            Checking your invitation token against the Rentivo security vault.
          </p>
        </div>
      </div>
    );
  }

  // Error State
  if (!isValid || !invitationData) {
    return (
      <div
        style={{
          minHeight: '100vh',
          backgroundColor: '#F4F3F8',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px'
        }}
      >
        <div
          style={{
            maxWidth: '460px',
            width: '100%',
            backgroundColor: '#FFFFFF',
            borderRadius: '20px',
            padding: '36px 30px',
            boxShadow: '0 12px 36px rgba(0, 0, 82, 0.08)',
            border: '1px solid #E4E1ED',
            textAlign: 'center'
          }}
        >
          <div
            style={{
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              backgroundColor: '#FEE4E2',
              border: '1.5px solid #F5B5AF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#B42318',
              margin: '0 auto 18px'
            }}
          >
            <ShieldAlert size={30} />
          </div>
          <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#000052', margin: '0 0 8px' }}>
            Invalid or Expired Invitation
          </h2>
          <p style={{ fontSize: '14px', color: '#5D5D78', lineHeight: 1.6, margin: '0 0 24px' }}>
            {errorMessage || 'This invitation link is no longer valid or has already been accepted.'}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <Link
              to="/"
              style={{
                display: 'inline-block',
                padding: '12px 24px',
                borderRadius: '10px',
                backgroundColor: '#000052',
                color: '#FFFFFF',
                textDecoration: 'none',
                fontSize: '14px',
                fontWeight: 700
              }}
            >
              Return to Homepage
            </Link>
            <span style={{ fontSize: '12px', color: '#8583a8' }}>
              If you believe this is an error, contact your inviting team administrator.
            </span>
          </div>
        </div>
      </div>
    );
  }

  // Active Acceptance Form
  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#F4F3F8',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px 16px'
      }}
    >
      <div
        style={{
          maxWidth: '520px',
          width: '100%',
          backgroundColor: '#FFFFFF',
          borderRadius: '24px',
          boxShadow: '0 20px 48px -8px rgba(0, 0, 82, 0.16)',
          border: '1px solid #E4E1ED',
          overflow: 'hidden'
        }}
      >
        {/* Brand Header */}
        <div
          style={{
            backgroundColor: '#000052',
            padding: '32px 32px 28px',
            color: '#FFFFFF',
            position: 'relative'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                backgroundColor: 'rgba(190, 137, 255, 0.2)',
                border: '1px solid #BE89FF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#BE89FF'
              }}
            >
              <ShieldCheck size={20} />
            </div>
            <div>
              <span style={{ fontSize: '12px', fontWeight: 800, letterSpacing: '0.1em', color: '#BE89FF', textTransform: 'uppercase' }}>
                Rentivo Operations
              </span>
              <div style={{ fontSize: '13px', color: '#DEDCF5' }}>Official Administrator Invitation</div>
            </div>
          </div>

          <h1 style={{ fontSize: '24px', fontWeight: 800, margin: '0 0 6px', fontFamily: "'Outfit', sans-serif" }}>
            Welcome to the Team!
          </h1>
          <p style={{ margin: 0, fontSize: '14px', color: '#DEDCF5', lineHeight: 1.5 }}>
            <strong>{invitationData.invitedByName || 'The Rentivo Operations Team'}</strong> has invited you to join as an{' '}
            <strong style={{ color: '#BE89FF' }}>{roleTitle}</strong>.
          </p>
        </div>

        {/* Form Body */}
        <div style={{ padding: '32px' }}>
          {invitationData.notes && (
            <div
              style={{
                padding: '14px 16px',
                backgroundColor: '#FAF9FD',
                borderLeft: '4px solid #BE89FF',
                borderRadius: '0 10px 10px 0',
                marginBottom: '24px',
                fontSize: '13.5px',
                color: '#11112B',
                fontStyle: 'italic',
                lineHeight: 1.5
              }}
            >
              "{invitationData.notes}"
            </div>
          )}

          {isAlreadyLoggedInWithMatch ? (
            /* Logged In Confirmation */
            <div>
              <div
                style={{
                  padding: '16px',
                  backgroundColor: '#ECFDF5',
                  borderRadius: '12px',
                  border: '1px solid #9BD8B8',
                  marginBottom: '24px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px'
                }}
              >
                <CheckCircle2 size={24} color="#16794A" style={{ flexShrink: 0 }} />
                <div style={{ fontSize: '13.5px', color: '#1B4D3E' }}>
                  You are currently logged in as <strong>{currentUser?.email}</strong>. Click below to upgrade your account to <strong>{roleTitle}</strong>.
                </div>
              </div>

              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting}
                style={{
                  width: '100%',
                  padding: '14px',
                  borderRadius: '12px',
                  backgroundColor: '#000052',
                  color: '#FFFFFF',
                  border: 'none',
                  fontSize: '15px',
                  fontWeight: 700,
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 14px rgba(0, 0, 82, 0.25)'
                }}
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw size={16} className="verif-spinner" />
                    <span>Activating Admin Privileges...</span>
                  </>
                ) : (
                  <>
                    <span>Activate Admin Privileges &amp; Enter Portal</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </div>
          ) : (
            /* New Account / Password Setup Form */
            <form onSubmit={handleSubmit}>
              {/* Email Address (read-only) */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#5D5D78', marginBottom: '6px' }}>
                  Authorized Email
                </label>
                <div style={{ position: 'relative' }}>
                  <Mail size={16} color="#8583a8" style={{ position: 'absolute', left: '12px', top: '13px' }} />
                  <input
                    type="email"
                    readOnly
                    value={invitationData.email}
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      padding: '11px 12px 11px 36px',
                      borderRadius: '10px',
                      border: '1.5px solid #E4E1ED',
                      fontSize: '14px',
                      color: '#5D5D78',
                      backgroundColor: '#F4F3F8',
                      cursor: 'not-allowed'
                    }}
                  />
                </div>
              </div>

              {/* Full Name */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#11112B', marginBottom: '6px' }}>
                  Your Full Name <span style={{ color: '#B42318' }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <User size={16} color="#797996" style={{ position: 'absolute', left: '12px', top: '13px' }} />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Samuel Adewale"
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      padding: '11px 12px 11px 36px',
                      borderRadius: '10px',
                      border: '1.5px solid #E4E1ED',
                      fontSize: '14px',
                      color: '#11112B',
                      outline: 'none',
                      backgroundColor: '#FAF9FD'
                    }}
                  />
                </div>
              </div>

              {/* Phone (Optional) */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#11112B', marginBottom: '6px' }}>
                  Phone Number (Optional)
                </label>
                <div style={{ position: 'relative' }}>
                  <Phone size={16} color="#797996" style={{ position: 'absolute', left: '12px', top: '13px' }} />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. 0803 123 4567"
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      padding: '11px 12px 11px 36px',
                      borderRadius: '10px',
                      border: '1.5px solid #E4E1ED',
                      fontSize: '14px',
                      color: '#11112B',
                      outline: 'none',
                      backgroundColor: '#FAF9FD'
                    }}
                  />
                </div>
              </div>

              {/* Password */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#11112B', marginBottom: '6px' }}>
                  Create Administrator Password <span style={{ color: '#B42318' }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <Lock size={16} color="#797996" style={{ position: 'absolute', left: '12px', top: '13px' }} />
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimum 8 characters"
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      padding: '11px 12px 11px 36px',
                      borderRadius: '10px',
                      border: '1.5px solid #E4E1ED',
                      fontSize: '14px',
                      color: '#11112B',
                      outline: 'none',
                      backgroundColor: '#FAF9FD'
                    }}
                  />
                </div>
              </div>

              {/* Confirm Password */}
              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#11112B', marginBottom: '6px' }}>
                  Confirm Password <span style={{ color: '#B42318' }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <Lock size={16} color="#797996" style={{ position: 'absolute', left: '12px', top: '13px' }} />
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat password"
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      padding: '11px 12px 11px 36px',
                      borderRadius: '10px',
                      border: '1.5px solid #E4E1ED',
                      fontSize: '14px',
                      color: '#11112B',
                      outline: 'none',
                      backgroundColor: '#FAF9FD'
                    }}
                  />
                </div>
              </div>

              {/* Submit CTA */}
              <button
                type="submit"
                disabled={isSubmitting}
                style={{
                  width: '100%',
                  padding: '14px',
                  borderRadius: '12px',
                  backgroundColor: '#000052',
                  color: '#FFFFFF',
                  border: 'none',
                  fontSize: '15px',
                  fontWeight: 700,
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 14px rgba(0, 0, 82, 0.25)',
                  opacity: isSubmitting ? 0.75 : 1,
                  transition: 'background 0.15s ease'
                }}
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw size={16} className="verif-spinner" />
                    <span>Setting Up Administrator Account...</span>
                  </>
                ) : (
                  <>
                    <span>Complete Setup &amp; Launch Admin Portal</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
