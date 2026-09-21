import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { NavigationTab } from '../types';

interface FooterProps {
  onNavigate?: (tab: NavigationTab) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  const navigate = useNavigate();
  const [subscribed, setSubscribed] = useState(false);

  const goSearchArea = (area: string) => {
    navigate(`/search?area=${encodeURIComponent(area)}`);
  };

  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-grid">
          {/* Brand Column */}
          <div className="footer-col">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <img 
                src="/RENTIVO-lockup.svg" 
                alt="Rentivo" 
                style={{ height: '32px', filter: 'brightness(0) invert(1)' }} 
              />
            </div>
            <p style={{ color: 'rgba(255, 255, 255, 0.75)', fontSize: '13.5px', lineHeight: 1.6, marginBottom: '16px', maxWidth: '300px' }}>
              Ibadan's trusted residential and commercial property marketplace. Physical on-site inspections, genuine listings, and direct lister connections with zero agency inflation.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--color-lilac)' }}>
              <ShieldCheck size={16} />
              <span>Flat ₦5,000 access fee only after confirmation.</span>
            </div>
          </div>

          {/* Quick Links */}
          <div className="footer-col">
            <h4>Explore</h4>
            <ul>
              <li>
                <a href="/search" onClick={(e) => { e.preventDefault(); onNavigate?.('search'); }}>
                  Browse Listings
                </a>
              </li>
              <li>
                <a href="/how-it-works" onClick={(e) => { e.preventDefault(); onNavigate?.('how_it_works'); }}>
                  How ₦5,000 Fee Works
                </a>
              </li>
              <li>
                <a href="/access-fee-terms" onClick={(e) => { e.preventDefault(); onNavigate?.('access_fee_terms'); }}>
                  Access Fee Policy &amp; Refund Guarantee
                </a>
              </li>
            </ul>
          </div>

          {/* Property Owners Column */}
          <div className="footer-col">
            <h4>Property Owners</h4>
            <ul>
              <li>
                <a href="/list-property" onClick={(e) => { e.preventDefault(); onNavigate?.('list_property'); }}>
                  List Your Property (Free)
                </a>
              </li>
              <li>
                <a href="/lister/verification" onClick={(e) => { e.preventDefault(); onNavigate?.('lister'); }}>
                  Free Property Verification
                </a>
              </li>
              <li>
                <a href="/lister" onClick={(e) => { e.preventDefault(); onNavigate?.('lister'); }}>
                  My Properties Hub
                </a>
              </li>
              <li>
                <a href="/list-property" onClick={(e) => { e.preventDefault(); onNavigate?.('list_property'); }}>
                  Owner FAQs &amp; Direct Tenants
                </a>
              </li>
            </ul>
          </div>

          {/* Locations in Ibadan */}
          <div className="footer-col">
            <h4>Ibadan Areas</h4>
            <ul>
              <li><a href="/search?area=Bodija" onClick={(e) => { e.preventDefault(); goSearchArea('Bodija'); }}>Bodija Housing Estate</a></li>
              <li><a href="/search?area=Akobo" onClick={(e) => { e.preventDefault(); goSearchArea('Akobo'); }}>Akobo &amp; General Gas</a></li>
              <li><a href="/search?area=Jericho" onClick={(e) => { e.preventDefault(); goSearchArea('Jericho'); }}>Jericho GRA</a></li>
              <li><a href="/search?area=Ring%20Road" onClick={(e) => { e.preventDefault(); goSearchArea('Ring Road'); }}>Ring Road Corridor</a></li>
              <li><a href="/search?area=UI%20%2F%20Samonda" onClick={(e) => { e.preventDefault(); goSearchArea('UI / Samonda'); }}>UI / Samonda</a></li>
            </ul>
          </div>

          {/* Newsletter / Verification Updates */}
          <div className="footer-col">
            <h4>Stay Updated</h4>
            <p style={{ color: 'rgba(255, 255, 255, 0.75)', fontSize: '13px', marginBottom: '12px' }}>
              Receive weekly alerts for newly verified properties in your preferred Ibadan neighborhood.
            </p>
            <form onSubmit={(e) => { e.preventDefault(); setSubscribed(true); }} style={{ display: 'flex', gap: '8px' }}>
              <input 
                type="email" 
                placeholder="you@example.com" 
                required
                style={{
                  flex: 1,
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  backgroundColor: 'rgba(255, 255, 255, 0.08)',
                  color: '#fff',
                  fontSize: '13px',
                  outline: 'none'
                }}
              />
              <button 
                type="submit" 
                className="btn btn-accent btn-sm"
              >
                {subscribed ? 'Joined' : 'Join'}
              </button>
            </form>
            {subscribed && (
              <p style={{ color: '#BE89FF', fontSize: '12px', marginTop: '8px' }}>
                You are on the weekly Ibadan verified listings list.
              </p>
            )}
          </div>
        </div>

        {/* Footer Bottom */}
        <div className="footer-bottom">
          <div>
            © {new Date().getFullYear()} Rentivo Technologies Ltd. All rights reserved. Operating in Ibadan, Oyo State, Nigeria.
          </div>
          <div style={{ display: 'flex', gap: '18px', flexWrap: 'wrap', justifyContent: 'center' }}>
            <a href="/terms" onClick={(e) => { e.preventDefault(); onNavigate?.('terms'); }}>
              Terms of Service
            </a>
            <a href="/privacy" onClick={(e) => { e.preventDefault(); onNavigate?.('privacy'); }}>
              Privacy Policy
            </a>
            <a href="/access-fee-terms" onClick={(e) => { e.preventDefault(); onNavigate?.('access_fee_terms'); }}>
              Access Fee Terms (₦5,000)
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};
