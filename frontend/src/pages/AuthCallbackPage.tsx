import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { isLiveBackend } from '../lib/config';
import { authService } from '../services/authService';
import { adminService } from '../services/adminService';
import { useAuth } from '../contexts/AuthContext';

function safeInternalPath(value: string | null, fallback: string): string {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return fallback;
  try {
    const candidate = new URL(value, window.location.origin);
    if (candidate.origin !== window.location.origin) return fallback;
    return `${candidate.pathname}${candidate.search}${candidate.hash}`;
  } catch {
    return fallback;
  }
}

export const AuthCallbackPage: React.FC = () => {
  const navigate = useNavigate();
  const { refresh } = useAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const run = async () => {
      try {
        const url = new URL(window.location.href);
        const authError = url.searchParams.get('error_description') || url.searchParams.get('error');
        if (authError) throw new Error(authError.replace(/\+/g, ' '));

        let sessionUserExists = false;
        if (isLiveBackend && supabase) {
          const code = url.searchParams.get('code');
          const { data: initialSession, error: sessionError } = await supabase.auth.getSession();
          if (sessionError) throw sessionError;
          let session = initialSession.session;

          // Supabase may already have exchanged the PKCE code during client initialization.
          // Exchange manually only if initialization did not establish a session.
          if (!session && code) {
            const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
            if (exchangeError) throw exchangeError;
            session = data.session;
          }
          sessionUserExists = Boolean(session?.user);
          if (!sessionUserExists) {
            throw new Error('This email link could not be completed. It may have expired; request a fresh link and try again.');
          }
        }

        const recoveryFlow = url.searchParams.get('flow') === 'recovery';
        if (recoveryFlow) {
          try {
            window.sessionStorage.setItem('rentivo:password-recovery', '1');
          } catch {
            throw new Error('This browser cannot securely continue the password-reset flow. Please request a new link.');
          }
          const target = safeInternalPath(url.searchParams.get('next'), '/reset-password');
          if (active) navigate(target, { replace: true });
          return;
        }

        const inviteToken = url.searchParams.get('adminInviteToken');
        if (inviteToken) {
          const acceptance = await adminService.acceptInvitation(inviteToken, {});
          if (!acceptance.success) {
            throw new Error(acceptance.error || 'Email confirmed, but administrator setup could not be completed. Reopen your invitation or contact an administrator.');
          }
          await refresh();
          if (active) navigate('/admin', { replace: true });
          return;
        }

        const user = await authService.getSessionUser();
        if (!user && sessionUserExists) {
          throw new Error('Your email was confirmed, but your Rentivo profile could not be loaded. Please sign in and contact support if this continues.');
        }
        if (user?.role === 'admin') navigate('/admin', { replace: true });
        else if (user?.role === 'landlord' || user?.role === 'agent') navigate('/lister', { replace: true });
        else navigate('/search', { replace: true });
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : 'Could not complete this email link.');
      }
    };

    void run();
    return () => {
      active = false;
    };
  }, [navigate, refresh]);

  return (
    <main className="auth-callback-page">
      <div className="auth-callback-card">
        <img src="/RENTIVO-lockup.svg" alt="Rentivo" className="auth-callback-logo" />
        <h1>{error ? 'Email link could not be completed' : 'Completing secure sign-in'}</h1>
        <p role={error ? 'alert' : undefined}>{error || 'Please wait while Rentivo verifies your account…'}</p>
        {error && (
          <div className="auth-callback-actions">
            <Link to="/admin/login">Admin sign-in</Link>
            <Link to="/auth">Return to Rentivo sign-in</Link>
          </div>
        )}
      </div>
    </main>
  );
};
