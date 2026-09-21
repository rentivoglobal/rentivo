import React, { useState, useRef, useEffect } from 'react';
import { 
  ShieldCheck, 
  Plus, 
  ChevronDown, 
  LogOut, 
  Heart, 
  FileText, 
  Building, 
  User as UserIcon, 
  Menu, 
  X, 
  Lock,
  ExternalLink,
  Sparkles
} from 'lucide-react';
import { NavigationTab, User } from '../types';

interface NavbarProps {
  currentTab: NavigationTab;
  onNavigate: (tab: NavigationTab) => void;
  currentUser: User | null;
  onSignOut: () => void;
  onOpenAuth: (mode?: 'signin' | 'signup', role?: 'renter' | 'lister') => void;
  favoritesCount?: number;
  activeRequestsCount?: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onNavigate,
  currentUser,
  onSignOut,
  onOpenAuth,
  favoritesCount = 0,
  activeRequestsCount = 0
}) => {
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const userDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userDropdownRef.current && !userDropdownRef.current.contains(event.target as Node)) {
        setUserDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNav = (tab: NavigationTab) => {
    onNavigate(tab);
    setMobileMenuOpen(false);
    setUserDropdownOpen(false);
  };

  const isLister = currentUser?.role === 'landlord' || currentUser?.role === 'agent';
  const isAdmin = currentUser?.role === 'admin';

  return (
    <header 
      style={{
        backgroundColor: '#FFFFFF',
        borderBottom: '1px solid #E6E3EE',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        boxShadow: '0 2px 10px rgba(0,0,82,0.03)'
      }}
    >
      <div 
        style={{
          maxWidth: '1240px',
          margin: '0 auto',
          padding: '0 20px',
          height: '70px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px'
        }}
      >
        {/* Brand Logo Lockup */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
          <a 
            href="/" 
            onClick={(e) => { e.preventDefault(); handleNav('home'); }}
            style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}
          >
            <img src="/RENTIVO-lockup.svg" alt="Rentivo" style={{ height: '32px' }} />
          </a>

          {/* Desktop Navigation Links */}
          <nav style={{ display: 'flex', alignItems: 'center', gap: '8px' }} className="desktop-nav-links">
            <button
              type="button"
              onClick={() => handleNav('search')}
              style={{
                background: 'none',
                border: 'none',
                padding: '8px 14px',
                borderRadius: '8px',
                fontSize: '13.5px',
                fontWeight: currentTab === 'search' || currentTab === 'detail' ? 800 : 600,
                color: currentTab === 'search' || currentTab === 'detail' ? '#000052' : '#636377',
                backgroundColor: currentTab === 'search' || currentTab === 'detail' ? '#F1F5F9' : 'transparent',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              Browse Properties
            </button>
            <button
              type="button"
              onClick={() => handleNav('list_property')}
              style={{
                background: 'none',
                border: 'none',
                padding: '8px 14px',
                borderRadius: '8px',
                fontSize: '13.5px',
                fontWeight: currentTab === 'list_property' ? 800 : 600,
                color: currentTab === 'list_property' ? '#000052' : '#636377',
                backgroundColor: currentTab === 'list_property' ? '#F1F5F9' : 'transparent',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              For Property Owners
            </button>
          </nav>
        </div>

        {/* Right-Side Actions & Auth Menu */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Saved Properties Pill (Accessible to both guests & authenticated users) */}
          <button
            type="button"
            onClick={() => handleNav('favorites')}
            style={{
              background: currentTab === 'favorites' ? '#F1F5F9' : 'transparent',
              border: '1.5px solid',
              borderColor: currentTab === 'favorites' ? '#000052' : '#E2E8F0',
              padding: '6px 14px',
              borderRadius: '9999px',
              fontSize: '13px',
              fontWeight: 700,
              color: '#000052',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s ease'
            }}
            title="View saved properties"
          >
            <Heart size={14} color="#000052" fill={favoritesCount > 0 ? '#000052' : 'none'} />
            <span className="nav-saved-text">Saved</span>
            {favoritesCount > 0 && (
              <span style={{
                backgroundColor: '#BE89FF',
                color: '#000052',
                fontSize: '11px',
                fontWeight: 800,
                borderRadius: '999px',
                padding: '1px 6px',
                lineHeight: 1.2
              }}>
                {favoritesCount}
              </span>
            )}
          </button>

          {/* My Requests Pill (For renters / authenticated tenants) */}
          {currentUser && !isLister && !isAdmin && (
            <button
              type="button"
              className="nav-action-pill-desktop"
              onClick={() => handleNav('requests')}
              style={{
                background: currentTab === 'requests' ? '#F1F5F9' : 'transparent',
                border: '1.5px solid',
                borderColor: currentTab === 'requests' ? '#000052' : '#E2E8F0',
                padding: '6px 14px',
                borderRadius: '9999px',
                fontSize: '13px',
                fontWeight: 700,
                color: '#000052',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.15s ease'
              }}
              title="View your inspection and booking requests"
            >
              <FileText size={14} color="#000052" />
              <span>My Requests</span>
            </button>
          )}

          {/* Persistent "List your property" Doorway for Guests & Seekers */}
          {!isLister && !isAdmin && (
            <button
              type="button"
              className="nav-action-pill-desktop"
              onClick={() => handleNav('list_property')}
              style={{
                background: currentTab === 'list_property' ? '#F8F3FF' : '#FFFFFF',
                border: '1.5px solid',
                borderColor: currentTab === 'list_property' ? '#7E22CE' : '#E2E8F0',
                padding: '6px 14px',
                borderRadius: '9999px',
                fontSize: '13px',
                fontWeight: 700,
                color: '#000052',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.15s ease'
              }}
              title="Put your property on Rentivo for free"
            >
              <Building size={14} color="#7E22CE" />
              <span>List your property</span>
            </button>
          )}

          {/* My Properties link for authenticated property owner */}
          {isLister && (
            <button
              type="button"
              className="nav-action-pill-desktop"
              onClick={() => handleNav('lister')}
              style={{
                background: currentTab === 'lister' || currentTab === 'listing_editor' ? '#F1F5F9' : 'transparent',
                border: '1.5px solid',
                borderColor: currentTab === 'lister' || currentTab === 'listing_editor' ? '#000052' : '#E2E8F0',
                padding: '6px 14px',
                borderRadius: '9999px',
                fontSize: '13px',
                fontWeight: 700,
                color: '#000052',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.15s ease'
              }}
            >
              <Building size={14} color="#000052" />
              <span>My Properties</span>
            </button>
          )}

          {/* Admin link for authenticated admin */}
          {isAdmin && (
            <button
              type="button"
              className="nav-action-pill-desktop"
              onClick={() => handleNav('admin')}
              style={{
                background: '#FEE2E2',
                border: '1px solid #FECACA',
                padding: '6px 12px',
                borderRadius: '8px',
                fontSize: '12.5px',
                fontWeight: 800,
                color: '#DC2626',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <ShieldCheck size={13} color="#DC2626" />
              <span>Admin Operations</span>
            </button>
          )}

          {/* GUEST: Sign In & Register Buttons */}
          {!currentUser ? (
            <div className="nav-action-pill-desktop" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                type="button"
                onClick={() => onOpenAuth('signin')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#000052',
                  fontSize: '13.5px',
                  fontWeight: 700,
                  padding: '8px 14px',
                  cursor: 'pointer'
                }}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => onOpenAuth('signup')}
                style={{
                  backgroundColor: '#000052',
                  color: '#FFFFFF',
                  border: 'none',
                  padding: '8px 18px',
                  borderRadius: '9999px',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Create Account
              </button>
            </div>
          ) : (
            /* AUTHENTICATED: Profile Avatar & Menu */
            <div style={{ position: 'relative' }} ref={userDropdownRef}>
              <button
                type="button"
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                style={{
                  backgroundColor: '#F8F3FF',
                  border: '1.5px solid #E6E3EE',
                  borderRadius: '9999px',
                  padding: '4px 12px 4px 6px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  cursor: 'pointer'
                }}
              >
                <div 
                  style={{
                    width: '30px',
                    height: '30px',
                    borderRadius: '50%',
                    backgroundColor: '#000052',
                    color: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '12px',
                    fontWeight: 800,
                    overflow: 'hidden'
                  }}
                >
                  {currentUser.avatarUrl ? (
                    <img src={currentUser.avatarUrl} alt={currentUser.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    currentUser.name.charAt(0).toUpperCase()
                  )}
                </div>
                <div style={{ textAlign: 'left', lineHeight: 1.1 }}>
                  <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#000052', maxWidth: '120px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {currentUser.name}
                  </div>
                  <div style={{ fontSize: '10px', fontWeight: 600, color: '#7E22CE', textTransform: 'capitalize' }}>
                    {currentUser.role.replace('_', ' ')}
                  </div>
                </div>
                <ChevronDown size={12} color="#64748B" />
              </button>

              {/* Dropdown Menu */}
              {userDropdownOpen && (
                <div
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 8px)',
                    right: 0,
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #E6E3EE',
                    borderRadius: '16px',
                    boxShadow: '0 12px 32px rgba(0,0,82,0.12)',
                    padding: '8px',
                    minWidth: '220px',
                    zIndex: 200,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '2px'
                  }}
                >
                  <div style={{ padding: '8px 12px 10px', borderBottom: '1px solid #F1F5F9' }}>
                    <div style={{ fontSize: '13px', fontWeight: 800, color: '#000052' }}>{currentUser.name}</div>
                    <div style={{ fontSize: '11px', color: '#636377' }}>{currentUser.email}</div>
                  </div>

                  {/* Renter Links */}
                  {!isLister && !isAdmin && (
                    <>
                      <button
                        type="button"
                        onClick={() => handleNav('requests')}
                        style={{
                          textAlign: 'left',
                          padding: '9px 12px',
                          borderRadius: '8px',
                          border: 'none',
                          background: currentTab === 'requests' ? '#F8F3FF' : 'none',
                          color: '#000052',
                          fontSize: '12.5px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px'
                        }}
                      >
                        <FileText size={14} color="#000052" />
                        <span>My Property Requests</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleNav('favorites')}
                        style={{
                          textAlign: 'left',
                          padding: '9px 12px',
                          borderRadius: '8px',
                          border: 'none',
                          background: currentTab === 'favorites' ? '#F8F3FF' : 'none',
                          color: '#000052',
                          fontSize: '12.5px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px'
                        }}
                      >
                        <Heart size={14} color="#000052" />
                        <span>Saved Properties</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleNav('list_property')}
                        style={{
                          textAlign: 'left',
                          padding: '9px 12px',
                          borderRadius: '8px',
                          border: 'none',
                          background: currentTab === 'list_property' ? '#F8F3FF' : 'none',
                          color: '#5B14B8',
                          fontSize: '12.5px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px'
                        }}
                      >
                        <Building size={14} color="#7E22CE" />
                        <span>List your property</span>
                      </button>
                    </>
                  )}

                  {/* Lister Links */}
                  {isLister && (
                    <>
                      <button
                        type="button"
                        onClick={() => handleNav('lister')}
                        style={{
                          textAlign: 'left',
                          padding: '9px 12px',
                          borderRadius: '8px',
                          border: 'none',
                          background: currentTab === 'lister' ? '#F8F3FF' : 'none',
                          color: '#000052',
                          fontSize: '12.5px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px'
                        }}
                      >
                        <Building size={14} color="#000052" />
                        <span>My Properties</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleNav('listing_editor')}
                        style={{
                          textAlign: 'left',
                          padding: '9px 12px',
                          borderRadius: '8px',
                          border: 'none',
                          background: currentTab === 'listing_editor' ? '#F8F3FF' : 'none',
                          color: '#000052',
                          fontSize: '12.5px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px'
                        }}
                      >
                        <Plus size={14} color="#000052" />
                        <span>Add New Listing</span>
                      </button>
                    </>
                  )}

                  {/* Admin Link */}
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => handleNav('admin')}
                      style={{
                        textAlign: 'left',
                        padding: '9px 12px',
                        borderRadius: '8px',
                        border: 'none',
                        background: '#FEF2F2',
                        color: '#DC2626',
                        fontSize: '12.5px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}
                    >
                      <Lock size={14} color="#DC2626" />
                      <span>Admin Operations Queue</span>
                    </button>
                  )}

                  {/* Account Profile & Settings (Available for all authenticated users) */}
                  <button
                    type="button"
                    onClick={() => handleNav('profile')}
                    style={{
                      textAlign: 'left',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      border: 'none',
                      background: currentTab === 'profile' ? '#F8F3FF' : 'none',
                      color: '#000052',
                      fontSize: '12.5px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    <UserIcon size={14} color="#000052" />
                    <span>Profile & Settings</span>
                  </button>

                  <div style={{ height: '1px', backgroundColor: '#F1F5F9', margin: '4px 0' }} />

                  {/* Sign Out */}
                  <button
                    type="button"
                    onClick={() => {
                      onSignOut();
                      setUserDropdownOpen(false);
                    }}
                    style={{
                      textAlign: 'left',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      border: 'none',
                      background: 'none',
                      color: '#DC2626',
                      fontSize: '12.5px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    <LogOut size={14} color="#DC2626" />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Mobile Menu Hamburger */}
          <button
            type="button"
            className="mobile-nav-toggle"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            style={{
              background: 'none',
              border: 'none',
              color: '#000052',
              cursor: 'pointer',
              padding: '8px'
            }}
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Responsive Mobile Drawer */}
      {mobileMenuOpen && (
        <div 
          style={{
            backgroundColor: '#FFFFFF',
            borderTop: '1px solid #E6E3EE',
            padding: '16px 20px 24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            boxShadow: '0 12px 30px rgba(0,0,82,0.08)',
            maxHeight: 'calc(100vh - 70px)',
            overflowY: 'auto'
          }}
        >
          <button
            type="button"
            onClick={() => handleNav('search')}
            style={{ textAlign: 'left', minHeight: '44px', padding: '10px 12px', background: currentTab === 'search' ? '#F1F5F9' : 'none', border: 'none', borderRadius: '8px', fontWeight: 700, color: '#000052', fontSize: '14.5px', display: 'flex', alignItems: 'center' }}
          >
            Browse Properties
          </button>

          {/* Saved properties on mobile (visible for all users) */}
          <button
            type="button"
            onClick={() => handleNav('favorites')}
            style={{ textAlign: 'left', minHeight: '44px', padding: '10px 12px', background: currentTab === 'favorites' ? '#F1F5F9' : 'none', border: 'none', borderRadius: '8px', fontWeight: 700, color: '#000052', fontSize: '14.5px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Heart size={16} color="#000052" fill={favoritesCount > 0 ? '#000052' : 'none'} />
              <span>Saved Properties</span>
            </span>
            {favoritesCount > 0 && (
              <span style={{ backgroundColor: '#BE89FF', color: '#000052', fontSize: '11px', fontWeight: 800, borderRadius: '999px', padding: '1px 8px' }}>
                {favoritesCount}
              </span>
            )}
          </button>

          {/* Renter requests on mobile */}
          {currentUser && !isLister && !isAdmin && (
            <button
              type="button"
              onClick={() => handleNav('requests')}
              style={{ textAlign: 'left', minHeight: '44px', padding: '10px 12px', background: currentTab === 'requests' ? '#F1F5F9' : 'none', border: 'none', borderRadius: '8px', fontWeight: 700, color: '#000052', fontSize: '14.5px', display: 'flex', alignItems: 'center', gap: '10px' }}
            >
              <FileText size={16} color="#000052" />
              <span>My Requests</span>
            </button>
          )}

          {/* List your property doorway on mobile for guests & renters */}
          {!isLister && !isAdmin && (
            <button
              type="button"
              onClick={() => handleNav('list_property')}
              style={{
                textAlign: 'left',
                minHeight: '46px',
                padding: '10px 14px',
                background: currentTab === 'list_property' ? '#F8F3FF' : '#FAF5FF',
                border: '1.5px solid #E9D5FF',
                borderRadius: '8px',
                fontWeight: 800,
                color: '#5B14B8',
                fontSize: '14.5px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}
            >
              <Building size={17} color="#7E22CE" />
              <span>List your property for free</span>
            </button>
          )}

          {/* My Properties link on mobile */}
          {isLister && (
            <button
              type="button"
              onClick={() => handleNav('lister')}
              style={{ textAlign: 'left', minHeight: '44px', padding: '10px 12px', background: currentTab === 'lister' || currentTab === 'listing_editor' ? '#F1F5F9' : 'none', border: 'none', borderRadius: '8px', fontWeight: 700, color: '#000052', fontSize: '14.5px', display: 'flex', alignItems: 'center', gap: '10px' }}
            >
              <Building size={16} color="#000052" />
              <span>My Properties</span>
            </button>
          )}

          {isAdmin && (
            <button
              type="button"
              onClick={() => handleNav('admin')}
              style={{ textAlign: 'left', minHeight: '44px', padding: '10px 12px', background: '#FEE2E2', border: 'none', borderRadius: '8px', fontWeight: 700, color: '#DC2626', fontSize: '14.5px', display: 'flex', alignItems: 'center' }}
            >
              Admin Operations
            </button>
          )}

          {currentUser && (
            <button
              type="button"
              onClick={() => handleNav('profile')}
              style={{ textAlign: 'left', minHeight: '44px', padding: '10px 12px', background: currentTab === 'profile' ? '#F1F5F9' : 'none', border: 'none', borderRadius: '8px', fontWeight: 700, color: '#000052', fontSize: '14.5px', display: 'flex', alignItems: 'center', gap: '10px' }}
            >
              <UserIcon size={16} color="#000052" />
              <span>Profile & Settings</span>
            </button>
          )}

          <div style={{ height: '1px', backgroundColor: '#F1F5F9', margin: '8px 0' }} />

          {!currentUser ? (
            <div style={{ display: 'flex', gap: '10px', paddingTop: '4px' }}>
              <button
                type="button"
                onClick={() => { onOpenAuth('signin'); setMobileMenuOpen(false); }}
                style={{ flex: 1, minHeight: '44px', padding: '10px', borderRadius: '8px', border: '1.5px solid #000052', background: 'none', color: '#000052', fontWeight: 700, fontSize: '13.5px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => { onOpenAuth('signup'); setMobileMenuOpen(false); }}
                style={{ flex: 1, minHeight: '44px', padding: '10px', borderRadius: '8px', border: 'none', background: '#000052', color: '#FFFFFF', fontWeight: 700, fontSize: '13.5px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                Sign Up
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => { onSignOut(); setMobileMenuOpen(false); }}
              style={{ textAlign: 'left', minHeight: '44px', padding: '10px 12px', background: 'none', border: 'none', color: '#DC2626', fontWeight: 700, fontSize: '14.5px', display: 'flex', alignItems: 'center', gap: '10px' }}
            >
              <LogOut size={16} />
              <span>Sign Out ({currentUser.name})</span>
            </button>
          )}
        </div>
      )}
    </header>
  );
};
