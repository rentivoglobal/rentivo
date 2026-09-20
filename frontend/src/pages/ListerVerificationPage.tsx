import React, { useEffect, useState } from 'react';
import { CalendarCheck, ShieldCheck, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { Listing } from '../types';
import { listingsService } from '../services/listingsService';
import { verificationService } from '../services/verificationService';
import { LocalVerification } from '../services/localStore';

interface ListerVerificationPageProps {
  listings: Listing[];
  onBack: () => void;
}

export const ListerVerificationPage: React.FC<ListerVerificationPageProps> = ({ listings, onBack }) => {
  const [mine, setMine] = useState<Listing[]>(listings);
  const [items, setItems] = useState<LocalVerification[]>([]);
  const [listingId, setListingId] = useState(listings[0]?.id || '');
  const [scheduledDate, setScheduledDate] = useState('');
  const [preferredTime, setPreferredTime] = useState('10:00');
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    void listingsService.getMyListings().then((rows) => {
      setMine(rows);
      if (!listingId && rows[0]) setListingId(rows[0].id);
    });
    void verificationService.list().then(setItems);
  }, [listingId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const listing = mine.find((l) => l.id === listingId);
    if (!listing) return;
    await verificationService.book({
      listing,
      scheduledDate,
      preferredTime,
      onSiteContactName: contactName,
      onSiteContactPhone: contactPhone
    });
    setMessage('Inspection booked. Rentivo will assign a field officer in Ibadan.');
    setItems(await verificationService.list());
  };

  const statusLabel = (status: string) => {
    if (status === 'verified') return 'Badge issued';
    if (status === 'pending') return 'Booked';
    return status;
  };

  return (
    <div style={{ background: '#F8FAFC', minHeight: '100vh', padding: '24px 20px 80px' }}>
      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        <button type="button" onClick={onBack} style={{ background: 'none', border: 'none', color: '#000052', fontWeight: 700, cursor: 'pointer', marginBottom: 16 }}>
          <ArrowLeft size={14} /> Back to lister portal
        </button>
        <h1 style={{ color: '#000052', fontSize: 26, marginBottom: 8 }}>Inspection booking</h1>
        <p style={{ color: '#636377', marginBottom: 24 }}>
          Verified listings get the green badge after a physical Ibadan visit: address, mandate, and photos.
        </p>

        <form onSubmit={handleSubmit} style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 16, padding: 24, marginBottom: 24 }}>
          <label style={label}>Property</label>
          <select value={listingId} onChange={(e) => setListingId(e.target.value)} style={input} required>
            {mine.map((l) => (
              <option key={l.id} value={l.id}>{l.title}</option>
            ))}
          </select>
          <label style={label}>Preferred date</label>
          <input type="date" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} style={input} required />
          <label style={label}>Preferred time</label>
          <input type="time" value={preferredTime} onChange={(e) => setPreferredTime(e.target.value)} style={input} required />
          <label style={label}>On-site contact name</label>
          <input value={contactName} onChange={(e) => setContactName(e.target.value)} style={input} required />
          <label style={label}>On-site contact phone</label>
          <input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} style={input} required />
          <button type="submit" style={{ marginTop: 16, background: '#000052', color: '#fff', border: 'none', borderRadius: 999, padding: '12px 18px', fontWeight: 700, cursor: 'pointer' }}>
            <CalendarCheck size={14} style={{ verticalAlign: 'middle' }} /> Book free inspection
          </button>
          {message && <p style={{ color: '#16794A', marginTop: 12 }}>{message}</p>}
        </form>

        <h2 style={{ color: '#000052', fontSize: 18 }}>Tracker</h2>
        <div style={{ display: 'grid', gap: 10, marginTop: 12 }}>
          {items.map((item) => (
            <div key={item.id} style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 12, padding: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                <strong style={{ color: '#000052' }}>{mine.find((l) => l.id === item.listingId)?.title || item.listingId}</strong>
                <span style={{ color: '#7E22CE', fontWeight: 700, fontSize: 12 }}>
                  <ShieldCheck size={12} /> {statusLabel(item.status)}
                </span>
              </div>
              <p style={{ color: '#636377', fontSize: 13, margin: '6px 0 0' }}>
                Booked → Assigned → Visit completed → Badge
              </p>
              {item.status === 'verified' && (
                <p style={{ color: '#16794A', fontSize: 13 }}><CheckCircle2 size={12} /> Verified badge issued</p>
              )}
            </div>
          ))}
          {items.length === 0 && <p style={{ color: '#64748B' }}>No inspection bookings yet.</p>}
        </div>
      </div>
    </div>
  );
};

const label: React.CSSProperties = { display: 'block', fontSize: 13, fontWeight: 700, color: '#1E293B', margin: '12px 0 6px' };
const input: React.CSSProperties = {
  width: '100%',
  height: 42,
  borderRadius: 8,
  border: '1.5px solid #CBD5E1',
  padding: '0 12px',
  fontSize: 14
};
