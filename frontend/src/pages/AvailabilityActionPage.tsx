import React, { useState, useEffect } from 'react';
import { ShieldCheck, CheckCircle2, XCircle, Clock, ArrowRight, AlertTriangle } from 'lucide-react';
import { requestsService } from '../services/requestsService';
import { listingsService } from '../services/listingsService';
import { Listing, AccessRequest } from '../types';

interface AvailabilityActionPageProps {
  onNavigateHome?: () => void;
  onNavigateToLister?: () => void;
}

export const AvailabilityActionPage: React.FC<AvailabilityActionPageProps> = ({
  onNavigateHome,
  onNavigateToLister
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [decision, setDecision] = useState<'YES' | 'NO' | null>(null);
  const [request, setRequest] = useState<AccessRequest | null>(null);
  const [listing, setListing] = useState<Listing | null>(null);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const run = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const token = urlParams.get('token') || '';
      const replyParam = urlParams.get('reply')?.toUpperCase() || urlParams.get('decision')?.toUpperCase();
      try {
        if (token && (replyParam === 'YES' || replyParam === 'NO')) {
          const updated = await requestsService.verifyToken(token, replyParam as 'YES' | 'NO');
          setRequest(updated || null);
          setDecision(replyParam as 'YES' | 'NO');
          setSubmitted(true);
          if (updated) {
            const found = await listingsService.getListingById(updated.listingId);
            setListing(found || null);
          }
        } else if (token) {
          setError('Choose YES or NO from the email buttons.');
        } else {
          setError('This confirmation link is missing a token.');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Invalid or expired confirmation link');
      } finally {
        setLoading(false);
      }
    };
    void run();
  }, []);

  return (
    <div style={{ backgroundColor: '#F8FAFC', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '30px 20px' }}>
      <a href="/" onClick={(e) => { e.preventDefault(); onNavigateHome?.(); }} style={{ marginBottom: 28 }}>
        <img src="/RENTIVO-lockup.svg" alt="Rentivo" style={{ height: 36 }} />
      </a>
      <div style={{ maxWidth: 480, width: '100%', background: '#fff', border: '1.5px solid #E2E8F0', borderRadius: 20, padding: 32, textAlign: 'center' }}>
        {loading && <p style={{ color: '#000052' }}><Clock size={16} /> Confirming availability…</p>}
        {error && (
          <div>
            <AlertTriangle color="#B45309" style={{ margin: '0 auto 12px' }} />
            <h2 style={{ color: '#000052' }}>Link could not be used</h2>
            <p style={{ color: '#64748B' }}>{error}</p>
          </div>
        )}
        {submitted && !error && (
          <div>
            {decision === 'YES' ? <CheckCircle2 color="#16794A" size={40} style={{ margin: '0 auto 12px' }} /> : <XCircle color="#B42318" size={40} style={{ margin: '0 auto 12px' }} />}
            <h2 style={{ color: '#000052' }}>Thank you{listing ? `,` : '.'}</h2>
            <p style={{ color: '#475569', lineHeight: 1.6 }}>
              You confirmed that {listing?.title || 'this listing'} is {decision === 'YES' ? 'AVAILABLE' : 'RENTED'}. The renter has been notified.
            </p>
            <button type="button" onClick={() => onNavigateToLister?.()} style={{ marginTop: 16, background: '#000052', color: '#fff', border: 'none', borderRadius: 999, padding: '10px 16px', fontWeight: 700, cursor: 'pointer' }}>
              Open lister portal <ArrowRight size={14} />
            </button>
            <p style={{ marginTop: 12, fontSize: 12, color: '#94A3B8' }}><ShieldCheck size={12} /> No login was required for this email action.</p>
          </div>
        )}
      </div>
    </div>
  );
};
