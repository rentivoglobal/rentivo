import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { isLiveBackend } from '../lib/config';
import { authService } from '../services/authService';

export const AuthCallbackPage: React.FC = () => {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      try {
        if (isLiveBackend && supabase) {
          const url = new URL(window.location.href);
          const code = url.searchParams.get('code');
          if (code) {
            const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
            if (exchangeError) throw exchangeError;
          }
        }
        const user = await authService.getSessionUser();
        if (user?.role === 'admin') navigate('/admin', { replace: true });
        else if (user?.role === 'landlord' || user?.role === 'agent') navigate('/lister', { replace: true });
        else navigate('/search', { replace: true });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not complete sign-in.');
      }
    };
    void run();
  }, [navigate]);

  return (
    <div style={{ minHeight: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ textAlign: 'center', color: '#000052' }}>
        <img src="/RENTIVO-lockup.svg" alt="Rentivo" style={{ height: 32, marginBottom: 16 }} />
        <p>{error || 'Completing sign-in…'}</p>
      </div>
    </div>
  );
};
