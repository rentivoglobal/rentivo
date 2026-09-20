import React, { useState } from 'react';
import {
  Building2,
  Users,
  ShieldCheck,
  CreditCard,
  LayoutDashboard,
  Plus,
  Bell,
  Search,
  ChevronDown,
  ArrowRight,
  CheckCircle2,
  Clock,
  Menu,
  X,
  ExternalLink,
  HelpCircle,
  SlidersHorizontal,
  Home
} from 'lucide-react';
import { Popover } from './Popover';
import { Tooltip } from './Tooltip';

interface DashboardShellProps {
  children: React.ReactNode;
  activeNav?: 'overview' | 'my_listings' | 'post_new' | 'inspections';
  onNavigate?: (tab: 'overview' | 'my_listings' | 'post_new') => void;
  onPostNewProperty?: () => void;
  propertiesCount?: number;
  urgentInquiriesCount?: number;
  onSwitchRole?: () => void;
}

export const DashboardShell: React.FC<DashboardShellProps> = ({
  children,
  activeNav = 'overview',
  onNavigate,
  onPostNewProperty,
  propertiesCount = 4,
  urgentInquiriesCount = 1,
  onSwitchRole
}) => {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState([
    {
      id: 'notif-1',
      title: 'Tenant Access Request Pending',
      message: 'Olawale B. submitted a request for 2-bedroom flat in Akobo.',
      time: '24 mins ago',
      isUrgent: true,
      read: false
    },
    {
      id: 'notif-2',
      title: 'Listing Approved by Admin',
      message: 'Your serviced apartment in Jericho GRA is now live on the marketplace.',
      time: '2 hours ago',
      isUrgent: false,
      read: false
    }
  ]);

  const markAllAsRead = () => {
    setUnreadNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#F8FAFC' }}>
      
      {/* -------------------------------------------------------------
          LEFT SIDEBAR (DESKTOP + RESPONSIVE MOBILE DRAWER)
         ------------------------------------------------------------- */}
      <aside
        style={{
          width: '260px',
          backgroundColor: '#FFFFFF',
          borderRight: '1px solid #E2E8F0',
          display: 'flex',
          flexDirection: 'column',
          position: 'sticky',
          top: 0,
          height: '100vh',
          zIndex: 1000,
          flexShrink: 0,
          transition: 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
        className={`lister-sidebar ${mobileSidebarOpen ? 'mobile-open' : ''}`}
      >
        {/* Brand & Lister Portal Lockup */}
        <div style={{ padding: '22px 20px 18px', borderBottom: '1px solid #F1F5F9' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <a href="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
              <img src="/RENTIVO-lockup.svg" alt="Rentivo" style={{ height: '28px', width: 'auto' }} />
            </a>
            <span
              style={{
                backgroundColor: '#FAF5FF',
                color: '#6B21A8',
                border: '1px solid #E9D5FF',
                fontSize: '10px',
                fontWeight: 800,
                padding: '2px 7px',
                borderRadius: '6px',
                letterSpacing: '0.04em'
              }}
            >
              LISTER
            </span>
          </div>

          {/* Workspace / Portfolio Switcher */}
          <div
            style={{
              marginTop: '16px',
              padding: '10px 12px',
              backgroundColor: '#FAFAFD',
              border: '1px solid #E2E8F0',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
              <div
                style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '6px',
                  backgroundColor: '#000052',
                  color: '#FFFFFF',
                  fontSize: '11px',
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}
              >
                A
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#000052', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  Adeola Portfolio
                </div>
                <div style={{ fontSize: '10px', color: '#64748B' }}>
                  Bodija &amp; Akobo
                </div>
              </div>
            </div>
            <ChevronDown size={14} color="#94A3B8" />
          </div>
        </div>

        {/* Primary Navigation Menu */}
        <nav style={{ padding: '16px 12px', flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: '#94A3B8', padding: '6px 10px', letterSpacing: '0.05em' }}>
            Main Menu
          </div>

          <button
            type="button"
            onClick={() => onNavigate && onNavigate('overview')}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '9px 12px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: activeNav === 'overview' ? '#EEF2FF' : 'transparent',
              color: activeNav === 'overview' ? '#000052' : '#475569',
              fontWeight: activeNav === 'overview' ? 700 : 500,
              fontSize: '13px',
              cursor: 'pointer',
              transition: 'background-color 0.15s ease'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <LayoutDashboard size={16} color={activeNav === 'overview' ? '#000052' : '#64748B'} />
              <span>Dashboard Overview</span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => onNavigate && onNavigate('my_listings')}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '9px 12px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: activeNav === 'my_listings' ? '#EEF2FF' : 'transparent',
              color: activeNav === 'my_listings' ? '#000052' : '#475569',
              fontWeight: activeNav === 'my_listings' ? 700 : 500,
              fontSize: '13px',
              cursor: 'pointer',
              transition: 'background-color 0.15s ease'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Building2 size={16} color={activeNav === 'my_listings' ? '#000052' : '#64748B'} />
              <span>My Properties</span>
            </div>
            <span
              style={{
                backgroundColor: activeNav === 'my_listings' ? '#000052' : '#F1F5F9',
                color: activeNav === 'my_listings' ? '#FFFFFF' : '#475569',
                fontSize: '11px',
                fontWeight: 700,
                padding: '1px 7px',
                borderRadius: '9999px'
              }}
            >
              {propertiesCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate && onNavigate('overview')}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '9px 12px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: 'transparent',
              color: '#475569',
              fontWeight: 500,
              fontSize: '13px',
              cursor: 'pointer'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Users size={16} color="#64748B" />
              <span>Tenant Inquiries</span>
            </div>
            {urgentInquiriesCount > 0 && (
              <span
                style={{
                  backgroundColor: '#FEF3C7',
                  color: '#B45309',
                  fontSize: '10px',
                  fontWeight: 800,
                  padding: '2px 6px',
                  borderRadius: '9999px',
                  border: '1px solid #FCD34D',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '3px'
                }}
              >
                <Clock size={10} />
                <span>{urgentInquiriesCount} Action</span>
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => onNavigate && onNavigate('post_new')}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '9px 12px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: activeNav === 'post_new' ? '#EEF2FF' : 'transparent',
              color: activeNav === 'post_new' ? '#000052' : '#475569',
              fontWeight: activeNav === 'post_new' ? 700 : 500,
              fontSize: '13px',
              cursor: 'pointer'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Plus size={16} color={activeNav === 'post_new' ? '#000052' : '#64748B'} />
              <span>Create Listing</span>
            </div>
          </button>

          <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: '#94A3B8', padding: '16px 10px 6px', letterSpacing: '0.05em' }}>
            Operations &amp; Trust
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '9px 12px',
              borderRadius: '8px',
              color: '#475569',
              fontSize: '13px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <ShieldCheck size={16} color="#16794A" />
              <span>Inspection Certs</span>
            </div>
            <span style={{ fontSize: '11px', color: '#16794A', fontWeight: 700 }}>3 Active</span>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '9px 12px',
              borderRadius: '8px',
              color: '#475569',
              fontSize: '13px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <CreditCard size={16} color="#64748B" />
              <span>Direct Rents</span>
            </div>
            <span style={{ fontSize: '10px', color: '#94A3B8', backgroundColor: '#F1F5F9', padding: '1px 5px', borderRadius: '4px' }}>Zero Cut</span>
          </div>
        </nav>

        {/* Lister Profile Card & Mode Switcher */}
        <div style={{ padding: '14px 16px', borderTop: '1px solid #F1F5F9', backgroundColor: '#FAFAFD' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
            <div
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '9999px',
                backgroundColor: '#000052',
                color: '#BE89FF',
                fontSize: '12px',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              AB
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#000052', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                Adeola Balogun
              </div>
              <div style={{ fontSize: '11px', color: '#059669', display: 'flex', alignItems: 'center', gap: '3px', fontWeight: 600 }}>
                <CheckCircle2 size={11} />
                <span>Verified Landlord</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onSwitchRole}
            style={{
              width: '100%',
              backgroundColor: '#FFFFFF',
              border: '1px solid #CBD5E1',
              borderRadius: '6px',
              padding: '6px 10px',
              fontSize: '11px',
              fontWeight: 600,
              color: '#334155',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              transition: 'all 0.15s ease'
            }}
          >
            <span>Browse Marketplace</span>
            <ArrowRight size={11} />
          </button>
        </div>
      </aside>

      {/* -------------------------------------------------------------
          MAIN CONTENT WRAPPER
         ------------------------------------------------------------- */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        
        {/* Top Header Bar */}
        <header
          style={{
            height: '64px',
            backgroundColor: '#FFFFFF',
            borderBottom: '1px solid #E2E8F0',
            padding: '0 28px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            position: 'sticky',
            top: 0,
            zIndex: 900
          }}
        >
          {/* Breadcrumb / Section Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              type="button"
              className="lister-mobile-menu-btn"
              onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
              style={{
                display: 'none',
                background: 'none',
                border: 'none',
                padding: '6px',
                cursor: 'pointer',
                color: '#000052'
              }}
            >
              <Menu size={20} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
              <span style={{ color: '#94A3B8' }}>Portals</span>
              <span style={{ color: '#CBD5E1' }}>/</span>
              <span style={{ color: '#94A3B8' }}>Lister Center</span>
              <span style={{ color: '#CBD5E1' }}>/</span>
              <span style={{ fontWeight: 700, color: '#000052', textTransform: 'capitalize' }}>
                {activeNav === 'overview' ? 'Overview' : activeNav === 'my_listings' ? 'My Properties' : 'Create Listing'}
              </span>
            </div>
          </div>

          {/* Header Action Tools */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            {/* Notifications Popover */}
            <Popover
              align="right"
              width="320px"
              trigger={
                <div
                  style={{
                    position: 'relative',
                    width: '36px',
                    height: '36px',
                    borderRadius: '8px',
                    border: '1px solid #E2E8F0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#475569',
                    backgroundColor: '#FFFFFF'
                  }}
                >
                  <Bell size={17} />
                  {unreadNotifications.some(n => !n.read) && (
                    <span
                      style={{
                        position: 'absolute',
                        top: '6px',
                        right: '6px',
                        width: '8px',
                        height: '8px',
                        borderRadius: '9999px',
                        backgroundColor: '#EF4444',
                        border: '1.5px solid #FFFFFF'
                      }}
                    />
                  )}
                </div>
              }
              content={(close) => (
                <div style={{ padding: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <h4 style={{ fontSize: '13px', fontWeight: 800, color: '#000052', margin: 0 }}>
                      Notifications
                    </h4>
                    <button
                      type="button"
                      onClick={markAllAsRead}
                      style={{ background: 'none', border: 'none', color: '#4F46E5', fontSize: '11px', fontWeight: 600, cursor: 'pointer', padding: 0 }}
                    >
                      Mark all read
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {unreadNotifications.map(n => (
                      <div
                        key={n.id}
                        style={{
                          padding: '10px',
                          borderRadius: '8px',
                          backgroundColor: n.isUrgent ? '#FFFDF5' : '#F8FAFC',
                          border: `1px solid ${n.isUrgent ? '#FCD34D' : '#E2E8F0'}`
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '12px', fontWeight: 700, color: '#000052' }}>{n.title}</span>
                          <span style={{ fontSize: '10px', color: '#94A3B8' }}>{n.time}</span>
                        </div>
                        <p style={{ fontSize: '11px', color: '#475569', margin: '4px 0 0', lineHeight: 1.4 }}>
                          {n.message}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            />

            {/* Post New Property Header Button */}
            <button
              type="button"
              onClick={onPostNewProperty}
              style={{
                backgroundColor: '#000052',
                color: '#FFFFFF',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '9999px',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 2px 6px rgba(0, 0, 82, 0.2)'
              }}
            >
              <Plus size={14} />
              <span>Post Property</span>
            </button>
          </div>
        </header>

        {/* Main Content Viewport */}
        <main style={{ flex: 1 }}>
          {children}
        </main>
      </div>

    </div>
  );
};
