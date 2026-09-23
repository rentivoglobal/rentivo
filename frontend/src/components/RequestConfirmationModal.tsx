import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Listing, AccessRequest } from '../types';
import { formatNaira } from '../utils/formatters';
import '../styles/request-confirmation-modal.css';

interface RequestConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  listing: Listing;
  request?: AccessRequest | { id: string; reference?: string; createdAt?: string } | null;
  onViewRequests?: () => void;
  onContinueBrowsing?: () => void;
}

const DEFAULT_HOUSE_ART = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 480">
  <rect width="640" height="480" fill="#e7defb"/><circle cx="540" cy="90" r="36" fill="#f2c46b"/>
  <rect y="370" width="640" height="110" fill="#d3c8ee"/>
  <rect x="150" y="215" width="340" height="165" fill="#f5efe6"/><polygon points="126,220 320,118 514,220" fill="#3b2a7a"/>
  <rect x="290" y="285" width="62" height="95" fill="#000052"/><rect x="186" y="255" width="66" height="58" fill="#9fb8e8"/><rect x="388" y="255" width="66" height="58" fill="#9fb8e8"/>
  <rect x="60" y="340" width="6" height="40" fill="#3b2a7a"/><circle cx="63" cy="318" r="34" fill="#be89ff" opacity=".55"/>
</svg>
`)}`;

export const RequestConfirmationModal: React.FC<RequestConfirmationModalProps> = ({
  isOpen,
  onClose,
  listing,
  request,
  onViewRequests,
  onContinueBrowsing
}) => {
  const navigate = useNavigate();

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const photo = listing.photos?.[0] || DEFAULT_HOUSE_ART;
  const bedroomsLabel = listing.bedrooms
    ? `${listing.bedrooms} ${listing.bedrooms === 1 ? 'bedroom' : 'bedrooms'}`
    : listing.type || 'Residential';

  const getRefCode = () => {
    if ((request as any)?.reference) return (request as any).reference;
    if (request?.id) {
      const clean = request.id.replace(/^req-?/i, '').replace(/[^a-zA-Z0-9]/g, '');
      const code = (clean.length >= 5 ? clean.slice(0, 5) : clean.padEnd(5, '0')).toUpperCase();
      return `RQ-${code}`;
    }
    return 'RQ-20604';
  };
  const refCode = getRefCode();

  const handleGoToRequests = () => {
    onClose();
    if (onViewRequests) {
      onViewRequests();
    } else {
      navigate('/account/requests');
    }
  };

  const handleDismiss = () => {
    onClose();
    if (onContinueBrowsing) {
      onContinueBrowsing();
    }
  };

  return (
    <div className="rc-modal-scope">
      <div className="rc-overlay" onClick={onClose} role="dialog" aria-modal="true">
        <div className="rc-dialog" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            className="rc-modal-close"
            onClick={onClose}
            aria-label="Close"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>

          <div className="rc-dialog-body">
            {/* Success Hero */}
            <div className="rc-success-hero">
              <div className="rc-success-badge">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              </div>
              <h2>Request sent</h2>
              <p className="rc-success-note">
                We've let the lister know you're interested in this property. Nothing has been charged — this request is free.
              </p>
              <p className="rc-success-ref">Reference {refCode}</p>
            </div>

            {/* Property Summary */}
            <div className="rc-prop-summary">
              <span className="rc-prop-thumb">
                <img src={photo} alt={listing.title} />
              </span>
              <div className="rc-prop-text">
                <p className="rc-kicker">You requested</p>
                <strong>{listing.title}</strong>
                <div className="rc-prop-meta">
                  <span className="mi">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 22s7-6.5 7-12a7 7 0 1 0-14 0c0 5.5 7 12 7 12z" />
                      <circle cx="12" cy="10" r="2.5" />
                    </svg>
                    {listing.area}
                  </span>
                  <span>{bedroomsLabel}</span>
                </div>
              </div>
              <div className="rc-prop-price">
                <div className="amt">{formatNaira(listing.price)}</div>
                <div className="per">per year</div>
              </div>
            </div>

            {/* What Happens Next Timeline */}
            <div className="rc-modal-status">
              <h3>What happens next</h3>
              <div className="rc-tl">
                {/* Step 1: Request sent */}
                <div className="rc-tl-item done">
                  <span className="rc-tl-dot">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                  </span>
                  <div className="rc-tl-title-row">
                    <span className="rc-tl-title">Request sent</span>
                  </div>
                  <div className="rc-tl-desc">Submitted just now</div>
                </div>

                {/* Step 2: Confirming with the lister */}
                <div className="rc-tl-item now">
                  <span className="rc-tl-dot">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="9" />
                      <path d="M12 7v5l3 3" />
                    </svg>
                  </span>
                  <div className="rc-tl-title-row">
                    <span className="rc-tl-title">Confirming with the lister</span>
                  </div>
                  <div className="rc-tl-desc">
                    We're checking this property is still available. We'll notify you as soon as they reply — no need to keep this page open.
                  </div>
                </div>

                {/* Step 3: Pay the access fee */}
                <div className="rc-tl-item todo">
                  <span className="rc-tl-dot">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="5" y="11" width="14" height="9" rx="2" />
                      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
                    </svg>
                  </span>
                  <div className="rc-tl-title-row">
                    <span className="rc-tl-title">Pay the access fee</span>
                    <span className="rc-pill rc-pill-info">First 100 renters free</span>
                  </div>
                  <div className="rc-tl-desc">
                    A flat access fee, only if the lister confirms. Nothing is charged until then.
                  </div>
                </div>

                {/* Step 4: Get their contact details */}
                <div className="rc-tl-item todo">
                  <span className="rc-tl-dot">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="5" y="11" width="14" height="9" rx="2" />
                      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
                    </svg>
                  </span>
                  <div className="rc-tl-title-row">
                    <span className="rc-tl-title">Get their contact details</span>
                  </div>
                  <div className="rc-tl-desc">
                    Shared with you right after payment, so you can arrange a viewing.
                  </div>
                </div>
              </div>
            </div>

            {/* Free Note */}
            <div className="rc-free-note">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M18 6l-2.5 2.5M8.5 15.5L6 18" />
                <circle cx="12" cy="12" r="3" />
              </svg>
              <p>
                <strong>This step is free.</strong> If the property turns out to be unavailable, we'll tell you at no charge — you won't be asked to pay for a property that's already gone.
              </p>
            </div>

            {/* CTA Column */}
            <div className="rc-cta-col">
              <button
                type="button"
                className="rc-btn rc-btn-primary"
                onClick={handleGoToRequests}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 12h-6l-2 3h-4l-2-3H2" />
                  <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
                </svg>
                View all my requests
              </button>
              <button
                type="button"
                className="rc-link-btn"
                onClick={handleDismiss}
              >
                Continue browsing
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
