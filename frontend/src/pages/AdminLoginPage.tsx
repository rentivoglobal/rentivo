import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { AlertCircle, ArrowLeft, ArrowRight, KeyRound, LockKeyhole, Mail, ShieldCheck } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { authService } from '../services/authService';

interface AdminLoginPageProps {
  initialMode?: 'signin' | 'forgot';
}

function safeAdminDestination(candidate: string | null): string {
  if (!candidate || (candidate !== '/admin' && !candidate.startsWith('/admin/')) || candidate.startsWith('//') || candidate.includes('\\')) {
    return '/admin';
  }
  if (candidate === '/admin/login' || candidate.startsWith('/admin/forgot-password') || candidate.startsWith('/admin/reset-password')) {
    return '/admin';
  }
  return candidate;
}

export const AdminLoginPage: React.FC<AdminLoginPageProps> = ({ initialMode = 'signin' }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { user, loading: authLoading, refresh, signOut } = useAuth();
  const mode: 'signin' | 'forgot' = location.pathname === '/admin/forgot-password' || initialMode === 'forgot' ? 'forgot' : 'signin';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const nextPath = safeAdminDestination(searchParams.get('next'));
  const hasOtherSession = Boolean(user && user.role !== 'admin');

  useEffect(() => {
    if (!authLoading && user?.role === 'admin' && mode === 'signin') {
      navigate(nextPath, { replace: true });
    }
  }, [authLoading, mode, navigate, nextPath, user]);

  const handleSignIn = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setBusy(true);

    try {
      const result = await authService.login(email.trim().toLowerCase(), password);
      if (!result.success) {
        setError(result.error || 'Unable to sign in. Check your email and password.');
        return;
      }
      if (result.user?.role !== 'admin') {
        await signOut();
        setError('This account does not have Rentivo Admin access. Sign in with an authorized administrator account.');
        return;
      }
      await refresh();
      navigate(nextPath, { replace: true });
    } catch {
      setError('Sign-in could not be completed. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const handlePasswordReset = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setBusy(true);

    try {
      const result = await authService.requestPasswordReset(email.trim().toLowerCase(), '/admin/reset-password');
      if (!result.success) {
        setError(result.error || 'We could not send a reset link. Please try again.');
        return;
      }
      setResetSent(true);
    } catch {
      setError('We could not send a reset link. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const handleSignOut = async () => {
    setBusy(true);
    try {
      await signOut();
      setError(null);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: '32px 20px', background: 'linear-gradient(135deg, #f7f5fc 0%, #eef1fa 100%)' }}>
      <section style={{ width: 'min(100%, 460px)', background: '#fff', border: '1px solid #e6e2f4', borderRadius: 20, padding: '36px clamp(22px, 6vw, 42px)', boxShadow: '0 18px 55px rgba(0, 0, 82, 0.10)' }}>
        <a href="/" onClick={(event) => { event.preventDefault(); navigate('/'); }} aria-label="Rentivo home" style={{ display: 'inline-flex', marginBottom: 28 }}>
          <img src="/RENTIVO-lockup.svg" alt="Rentivo" style={{ height: 34 }} />
        </a>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <div style={{ width: 44, height: 44, borderRadius: 14, display: 'grid', placeItems: 'center', color: '#fff', background: '#000052' }}>
            {mode === 'signin' ? <ShieldCheck size={22} /> : <KeyRound size={22} />}
          </div>
          <div>
            <p style={{ margin: 0, color: '#6d35c9', fontWeight: 800, fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Rentivo Admin Portal</p>
            <h1 style={{ margin: '3px 0 0', color: '#000052', fontSize: 25, lineHeight: 1.2, fontWeight: 800 }}>
              {mode === 'signin' ? 'Administrator sign in' : 'Reset admin password'}
            </h1>
          </div>
        </div>
        <p style={{ margin: '0 0 24px', color: '#636377', fontSize: 14, lineHeight: 1.6 }}>
          {mode === 'signin'
            ? 'This area is for authorized Rentivo administrators only.'
            : 'Enter the email on your administrator account. We’ll send a secure link to set a new password.'}
        </p>

        {hasOtherSession && (
          <div role="status" style={{ padding: '12px 14px', marginBottom: 18, border: '1px solid #f2d08a', borderRadius: 10, background: '#fff8e6', color: '#7a4d00', fontSize: 13, lineHeight: 1.5 }}>
            The current account is not an administrator.
            <button type="button" onClick={() => void handleSignOut()} disabled={busy} style={{ display: 'block', marginTop: 8, padding: 0, border: 0, background: 'none', color: '#000052', fontWeight: 700, textDecoration: 'underline', cursor: 'pointer' }}>
              Sign out to switch accounts
            </button>
          </div>
        )}

        {error && (
          <div role="alert" style={{ display: 'flex', gap: 8, alignItems: 'flex-start', padding: '11px 13px', marginBottom: 18, border: '1px solid #fecaca', borderRadius: 10, background: '#fef2f2', color: '#b91c1c', fontSize: 13, lineHeight: 1.5 }}>
            <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
            <span>{error}</span>
          </div>
        )}

        {mode === 'signin' ? (
          <form onSubmit={handleSignIn}>
            <label htmlFor="admin-email" style={{ display: 'block', marginBottom: 7, color: '#334155', fontSize: 12, fontWeight: 700 }}>Email address</label>
            <div style={{ position: 'relative', marginBottom: 16 }}>
              <Mail size={16} aria-hidden="true" style={{ position: 'absolute', left: 13, top: 13, color: '#8583a8' }} />
              <input id="admin-email" type="email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="admin@company.com" style={{ boxSizing: 'border-box', width: '100%', height: 44, padding: '0 12px 0 39px', border: '1px solid #d7d5e5', borderRadius: 10, color: '#16163a', fontSize: 14 }} />
            </div>

            <label htmlFor="admin-password" style={{ display: 'block', marginBottom: 7, color: '#334155', fontSize: 12, fontWeight: 700 }}>Password</label>
            <div style={{ position: 'relative', marginBottom: 10 }}>
              <LockKeyhole size={16} aria-hidden="true" style={{ position: 'absolute', left: 13, top: 13, color: '#8583a8' }} />
              <input id="admin-password" type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter your admin password" style={{ boxSizing: 'border-box', width: '100%', height: 44, padding: '0 12px 0 39px', border: '1px solid #d7d5e5', borderRadius: 10, color: '#16163a', fontSize: 14 }} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20 }}>
              <button type="button" onClick={() => { setError(null); navigate('/admin/forgot-password'); }} style={{ padding: 0, border: 0, background: 'none', color: '#5b28b0', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                Forgot password?
              </button>
            </div>

            <button type="submit" disabled={busy || authLoading} style={{ width: '100%', minHeight: 46, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9, border: 0, borderRadius: 999, background: busy ? '#77779b' : '#000052', color: '#fff', fontSize: 14, fontWeight: 800, cursor: busy ? 'wait' : 'pointer' }}>
              {busy ? 'Signing in…' : <>Sign in to Admin <ArrowRight size={16} /></>}
            </button>
          </form>
        ) : resetSent ? (
          <div role="status" style={{ padding: '18px 16px', border: '1px solid #ccebdc', borderRadius: 12, background: '#f0fdf4', color: '#166534', fontSize: 14, lineHeight: 1.6 }}>
            If an account matches that email, a reset link has been sent. Open it on this device to set a new password and return to Admin sign in.
          </div>
        ) : (
          <form onSubmit={handlePasswordReset}>
            <label htmlFor="admin-reset-email" style={{ display: 'block', marginBottom: 7, color: '#334155', fontSize: 12, fontWeight: 700 }}>Admin account email</label>
            <div style={{ position: 'relative', marginBottom: 20 }}>
              <Mail size={16} aria-hidden="true" style={{ position: 'absolute', left: 13, top: 13, color: '#8583a8' }} />
              <input id="admin-reset-email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="admin@company.com" style={{ boxSizing: 'border-box', width: '100%', height: 44, padding: '0 12px 0 39px', border: '1px solid #d7d5e5', borderRadius: 10, color: '#16163a', fontSize: 14 }} />
            </div>
            <button type="submit" disabled={busy} style={{ width: '100%', minHeight: 46, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9, border: 0, borderRadius: 999, background: busy ? '#77779b' : '#000052', color: '#fff', fontSize: 14, fontWeight: 800, cursor: busy ? 'wait' : 'pointer' }}>
              {busy ? 'Sending…' : <>Send reset link <ArrowRight size={16} /></>}
            </button>
          </form>
        )}

        <div style={{ marginTop: 22, paddingTop: 18, borderTop: '1px solid #eeedf5', display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', fontSize: 13 }}>
          <button type="button" onClick={() => { setError(null); setResetSent(false); navigate('/admin/login'); }} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: 0, border: 0, background: 'none', color: '#5b28b0', fontWeight: 700, cursor: 'pointer' }}>
            <ArrowLeft size={14} /> {mode === 'signin' ? 'Back to Rentivo' : 'Back to Admin sign in'}
          </button>
          {mode === 'signin' && <a href="/login" style={{ color: '#636377', textDecoration: 'none' }}>Customer sign in</a>}
        </div>

        <p style={{ margin: '22px 0 0', color: '#8583a8', textAlign: 'center', fontSize: 11.5, lineHeight: 1.5 }}>
          <ShieldCheck size={13} aria-hidden="true" style={{ verticalAlign: 'middle', marginRight: 5 }} />
          Access is restricted to accounts with the Rentivo Admin role.
        </p>
      </section>
    </main>
  );
};

export default AdminLoginPage;
