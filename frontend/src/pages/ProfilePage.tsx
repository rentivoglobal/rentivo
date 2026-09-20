import React, { useState } from 'react';
import { 
  User as UserIcon, 
  Mail, 
  Phone, 
  MapPin, 
  ShieldCheck, 
  Check, 
  ArrowLeft, 
  Building, 
  Heart, 
  FileText, 
  Bell, 
  Lock, 
  Sparkles,
  ExternalLink
} from 'lucide-react';
import { User, NavigationTab } from '../types';
import { authService } from '../services/authService';

interface ProfilePageProps {
  currentUser: User | null;
  onUpdateUser: (user: User) => void;
  onBack: () => void;
  onNavigateToTab: (tab: NavigationTab) => void;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({
  currentUser,
  onUpdateUser,
  onBack,
  onNavigateToTab
}) => {
  const [name, setName] = useState(currentUser?.name || 'Renter Account');
  const [email, setEmail] = useState(currentUser?.email || '');
  const [phone, setPhone] = useState(currentUser?.phone || '');
  const [preferredArea, setPreferredArea] = useState('Bodija');
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    authService.updateProfile(name, phone, email, { preferredArea, emailAlerts }).then((updated) => {
      if (updated) onUpdateUser(updated);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    });
  };

  const isLister = currentUser?.role === 'landlord' || currentUser?.role === 'agent';

  return (
    <div style={{ backgroundColor: '#F8FAFC', minHeight: '100vh', paddingBottom: '80px' }}>
      {/* Top Header Bar */}
      <div style={{ backgroundColor: '#FFFFFF', borderBottom: '1px solid #E2E8F0', padding: '16px 0', position: 'sticky', top: 0, zIndex: 20 }}>
        <div style={{ maxWidth: '960px', margin: '0 auto', padding: '0 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button 
            onClick={onBack}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '13.5px', fontWeight: 700, color: '#000052', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            <ArrowLeft size={16} />
            <span>Back</span>
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#64748B' }}>
            <UserIcon size={15} color="#000052" />
            <span style={{ fontWeight: 600 }}>Account &amp; Profile Settings</span>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div style={{ maxWidth: '800px', margin: '32px auto 0', padding: '0 20px' }}>
        
        {/* User Identity Header Card */}
        <div style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          border: '1.5px solid #E2E8F0',
          padding: '24px 28px',
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              backgroundColor: '#000052',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '22px',
              fontWeight: 800
            }}>
              {currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div>
              <h1 style={{ fontSize: '20px', fontWeight: 800, color: '#000052', margin: '0 0 4px' }}>
                {currentUser?.name || 'My Profile'}
              </h1>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{
                  backgroundColor: '#F0E6FF',
                  color: '#7E22CE',
                  fontSize: '11px',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: '999px',
                  textTransform: 'capitalize'
                }}>
                  {currentUser?.role?.replace('_', ' ') || 'Renter'}
                </span>
                <span style={{ fontSize: '12px', color: '#64748B' }}>{currentUser?.email}</span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={() => onNavigateToTab('favorites')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                borderRadius: '8px',
                border: '1px solid #E2E8F0',
                backgroundColor: '#F8FAFC',
                fontSize: '12.5px',
                fontWeight: 700,
                color: '#000052',
                cursor: 'pointer'
              }}
            >
              <Heart size={14} />
              <span>Saved</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigateToTab('requests')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                borderRadius: '8px',
                border: '1px solid #E2E8F0',
                backgroundColor: '#F8FAFC',
                fontSize: '12.5px',
                fontWeight: 700,
                color: '#000052',
                cursor: 'pointer'
              }}
            >
              <FileText size={14} />
              <span>My Requests</span>
            </button>
          </div>
        </div>

        {/* Profile Details Form */}
        <div style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          border: '1.5px solid #E2E8F0',
          padding: '32px 28px',
          marginBottom: '24px'
        }}>
          <h2 style={{ fontSize: '16px', fontWeight: 800, color: '#000052', margin: '0 0 16px' }}>
            Personal Contact Details
          </h2>

          {savedSuccess && (
            <div style={{
              backgroundColor: '#ECFDF5',
              border: '1px solid #A7F3D0',
              borderRadius: '8px',
              padding: '10px 14px',
              marginBottom: '20px',
              color: '#065F46',
              fontSize: '13px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <Check size={16} />
              <span>Profile details updated successfully!</span>
            </div>
          )}

          <form onSubmit={handleSave}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
                  Full Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  style={{ width: '100%', height: '42px', borderRadius: '8px', border: '1.5px solid #CBD5E1', padding: '0 12px', fontSize: '13.5px', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
                  WhatsApp Phone Number (for lister contact)
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. 0803 123 4567"
                  style={{ width: '100%', height: '42px', borderRadius: '8px', border: '1.5px solid #CBD5E1', padding: '0 12px', fontSize: '13.5px', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  disabled
                  style={{ width: '100%', height: '42px', borderRadius: '8px', border: '1.5px solid #E2E8F0', backgroundColor: '#F8FAFC', padding: '0 12px', fontSize: '13.5px', color: '#64748B', boxSizing: 'border-box' }}
                />
                <span style={{ fontSize: '11px', color: '#94A3B8', marginTop: '4px', display: 'block' }}>Email cannot be changed directly</span>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
                  Primary Ibadan Area of Interest
                </label>
                <select
                  value={preferredArea}
                  onChange={(e) => setPreferredArea(e.target.value)}
                  style={{ width: '100%', height: '42px', borderRadius: '8px', border: '1.5px solid #CBD5E1', padding: '0 12px', fontSize: '13.5px', boxSizing: 'border-box' }}
                >
                  <option value="Bodija">Bodija Housing Estate</option>
                  <option value="Akobo">Akobo &amp; General Gas</option>
                  <option value="Ring Road">Ring Road Corridor</option>
                  <option value="UI / Samonda">UI / Samonda</option>
                  <option value="Oluyole">Oluyole Estate</option>
                  <option value="Jericho">Jericho GRA</option>
                </select>
              </div>
            </div>

            {/* Notification Checkbox */}
            <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <input
                type="checkbox"
                id="alerts"
                checked={emailAlerts}
                onChange={(e) => setEmailAlerts(e.target.checked)}
                style={{ width: '16px', height: '16px', cursor: 'pointer' }}
              />
              <label htmlFor="alerts" style={{ fontSize: '13px', color: '#334155', cursor: 'pointer' }}>
                Receive instant email notifications when landlords verify availability for my requests
              </label>
            </div>

            <button
              type="submit"
              style={{
                backgroundColor: '#000052',
                color: '#FFFFFF',
                border: 'none',
                padding: '11px 24px',
                borderRadius: '9999px',
                fontSize: '13.5px',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              Save Profile Changes
            </button>
          </form>
        </div>

        {/* Lister Portal Transition / Discovery Card */}
        {!isLister ? (
          <div style={{
            backgroundColor: '#F0E6FF',
            border: '1.5px solid #E9D5FF',
            borderRadius: '16px',
            padding: '24px 28px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '16px'
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '15px', fontWeight: 800, color: '#000052', marginBottom: '4px' }}>
                <Building size={18} color="#7E22CE" />
                <span>Own or Manage Property in Ibadan?</span>
              </div>
              <p style={{ fontSize: '13px', color: '#6B21A8', margin: 0, maxWidth: '480px', lineHeight: 1.5 }}>
                Post your verified apartments, houses, or commercial units for free. Zero listing fees, pre-screened seekers, and structured in-person inspection bookings.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigateToTab('lister')}
              style={{
                backgroundColor: '#7E22CE',
                color: '#FFFFFF',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '9999px',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <span>Go to Lister Portal</span>
              <Building size={14} />
            </button>
          </div>
        ) : (
          <div style={{
            backgroundColor: '#F8FAFC',
            border: '1.5px solid #E2E8F0',
            borderRadius: '16px',
            padding: '20px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '16px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                backgroundColor: '#EFF6FF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Building size={20} color="#000052" />
              </div>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 800, color: '#000052' }}>
                  Verified Lister Account
                </div>
                <div style={{ fontSize: '12px', color: '#64748B' }}>
                  Manage your active listings, renter inquiries, and scheduled inspections.
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onNavigateToTab('lister')}
              style={{
                backgroundColor: '#000052',
                color: '#FFFFFF',
                border: 'none',
                padding: '9px 18px',
                borderRadius: '9999px',
                fontSize: '12.5px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <span>Open Lister Dashboard</span>
            </button>
          </div>
        )}

      </div>
    </div>
  );
};
