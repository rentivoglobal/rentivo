import React, { useEffect, useState } from 'react';
import { Heart, FileText, User as UserIcon, ArrowRight, ShieldCheck, Search } from 'lucide-react';
import { AccessRequest, Listing, NavigationTab } from '../types';
import { requestsService } from '../services/requestsService';
import { useAuth } from '../contexts/AuthContext';

interface AccountPageProps {
  listings: Listing[];
  favorites: string[];
  onNavigateToTab: (tab: NavigationTab) => void;
  onSelectListing: (listing: Listing) => void;
  onOpenRequest: (request: AccessRequest) => void;
}

export const AccountPage: React.FC<AccountPageProps> = ({
  listings,
  favorites,
  onNavigateToTab,
  onSelectListing,
  onOpenRequest
}) => {
  const { user } = useAuth();
  const [requests, setRequests] = useState<AccessRequest[]>([]);

  useEffect(() => {
    void requestsService.getAllRequests().then(setRequests);
  }, []);

  const latest = requests[0];
  const saved = listings.filter((l) => favorites.includes(l.id)).slice(0, 3);

  return (
    <div style={{ background: '#F8FAFC', minHeight: '70vh', padding: '32px 20px 80px' }}>
      <div style={{ maxWidth: 880, margin: '0 auto' }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: '#000052', marginBottom: 8 }}>
          Hello{user?.name ? `, ${user.name.split(' ')[0]}` : ''}
        </h1>
        <p style={{ color: '#636377', marginBottom: 28 }}>Your requests, saved homes, search portal, and profile shortcuts.</p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 28 }}>
          <button type="button" onClick={() => onNavigateToTab('search')} style={cardBtn}>
            <Search size={18} color="#000052" />
            <strong>Search properties</strong>
            <span>Browse verified listings in your portal</span>
          </button>
          <button type="button" onClick={() => onNavigateToTab('requests')} style={cardBtn}>
            <FileText size={18} color="#000052" />
            <strong>{requests.length} requests</strong>
            <span>Track vacancy checks and unlocks</span>
          </button>
          <button type="button" onClick={() => onNavigateToTab('favorites')} style={cardBtn}>
            <Heart size={18} color="#000052" />
            <strong>{favorites.length} saved</strong>
            <span>Shortlisted Ibadan listings</span>
          </button>
          <button type="button" onClick={() => onNavigateToTab('profile')} style={cardBtn}>
            <UserIcon size={18} color="#000052" />
            <strong>Profile</strong>
            <span>Name, WhatsApp, alerts</span>
          </button>
        </div>

        {latest && (
          <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 16, padding: 20, marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#7E22CE', fontWeight: 700, marginBottom: 8 }}>
              <ShieldCheck size={16} /> Latest request
            </div>
            <h2 style={{ fontSize: 18, color: '#000052', margin: '0 0 6px' }}>{latest.listingTitle}</h2>
            <p style={{ color: '#636377', fontSize: 14, marginBottom: 12 }}>Status: {latest.status.replace(/_/g, ' ')}</p>
            <button type="button" onClick={() => onOpenRequest(latest)} style={primaryBtn}>
              Open request <ArrowRight size={14} />
            </button>
          </div>
        )}

        {saved.length > 0 && (
          <div>
            <h3 style={{ color: '#000052', marginBottom: 12 }}>Saved listings</h3>
            <div style={{ display: 'grid', gap: 10 }}>
              {saved.map((listing) => (
                <button
                  key={listing.id}
                  type="button"
                  onClick={() => onSelectListing(listing)}
                  style={{ ...cardBtn, textAlign: 'left', display: 'flex', gap: 12, alignItems: 'center' }}
                >
                  <img src={listing.photos[0]} alt="" style={{ width: 64, height: 48, objectFit: 'cover', borderRadius: 8 }} />
                  <span>
                    <strong style={{ display: 'block' }}>{listing.title}</strong>
                    <span>{listing.area}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const cardBtn: React.CSSProperties = {
  background: '#fff',
  border: '1px solid #E2E8F0',
  borderRadius: 16,
  padding: 18,
  textAlign: 'left',
  cursor: 'pointer',
  color: '#000052',
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
  alignItems: 'flex-start'
};

const primaryBtn: React.CSSProperties = {
  background: '#000052',
  color: '#fff',
  border: 'none',
  borderRadius: 999,
  padding: '10px 16px',
  fontWeight: 700,
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6
};
