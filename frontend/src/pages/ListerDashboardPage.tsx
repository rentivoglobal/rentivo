import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Home,
  Building2,
  Mail,
  ShieldCheck,
  User,
  Plus,
  Search,
  Pencil,
  Trash2,
  CheckCircle2,
  Clock,
  Check,
  X,
  AlertTriangle,
  ArrowRight,
  Copy,
  Sparkles,
  Camera,
  Phone,
  LayoutGrid,
  Lock,
  Bell,
  Save,
  ExternalLink
} from 'lucide-react';
import '../styles/lister.css';
import { Listing } from '../types';
import { formatNaira, formatPriceWithPeriod } from '../utils/formatters';
import { listingsService } from '../services/listingsService';
import { requestsService } from '../services/requestsService';
import { authService } from '../services/authService';
import { useAuth } from '../contexts/AuthContext';
import { ListerVerificationPage } from './ListerVerificationPage';

interface ListerDashboardPageProps {
  onListingCreated?: () => void;
  listings?: Listing[];
  onSwitchRole?: () => void;
  onSelectListingToView?: (listing: Listing) => void;
  onOpenCreateListing?: () => void;
  onOpenEditListing?: (listing: Listing) => void;
  onNavigateToMarketplace?: () => void;
  onOpenVerification?: () => void;
  onOpenRequests?: () => void;
  onNavigateToProfile?: () => void;
  onSignOut?: () => void;
  forcedTab?: 'home' | 'listings' | 'inquiries' | 'verification' | 'profile' | 'account' | 'stats';
}

interface ListerInquiry {
  id: string;
  listingId: string;
  listingTitle: string;
  listingArea: string;
  listingPhoto: string;
  listingPrice: number;
  renterName: string;
  renterInitials: string;
  renterEmail: string;
  renterPhone: string;
  renterType?: 'residential' | 'business';
  status: 'needs_response' | 'confirmed' | 'payment_pending' | 'paid' | 'unavailable' | 'escalated';
  submittedAt: string;
  since?: string;
  minutesRemaining?: number;
}

export const ListerDashboardPage: React.FC<ListerDashboardPageProps> = ({
  onListingCreated,
  listings: propListings,
  onSelectListingToView,
  onOpenCreateListing,
  onOpenEditListing,
  onNavigateToMarketplace,
  onOpenVerification,
  onOpenRequests,
  onNavigateToProfile,
  onSignOut,
  forcedTab
}) => {
  const { user, refresh } = useAuth();
  const listerName = user?.name || 'Adebayo Okonkwo';
  const listerFirstName = listerName.split(' ')[0] || 'Lister';
  const listerInitials = listerName
    .split(' ')
    .filter(Boolean)
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  const listerRole = user?.role === 'agent' ? 'Licensed Agent' : 'Landlord';

  // Active Tab state
  const normalizeTab = (t?: string): 'home' | 'listings' | 'inquiries' | 'verification' | 'profile' => {
    if (t === 'stats') return 'home';
    if (t === 'account') return 'profile';
    if (t === 'home' || t === 'listings' || t === 'inquiries' || t === 'verification' || t === 'profile') return t;
    return 'home';
  };

  const [activeTab, setActiveTab] = useState<'home' | 'listings' | 'inquiries' | 'verification' | 'profile'>(
    normalizeTab(forcedTab)
  );

  useEffect(() => {
    if (forcedTab) {
      setActiveTab(normalizeTab(forcedTab));
    }
  }, [forcedTab]);

  // Account & Profile Management State
  const [accName, setAccName] = useState(user?.name || '');
  const [accPhone, setAccPhone] = useState(user?.phone || '');
  const [accEmail, setAccEmail] = useState(user?.email || '');
  const [accPreferredArea, setAccPreferredArea] = useState('Bodija, Ibadan');
  const [accWhatsappAlerts, setAccWhatsappAlerts] = useState(true);
  const [accSmsAlerts, setAccSmsAlerts] = useState(true);
  const [accEmailAlerts, setAccEmailAlerts] = useState(true);
  const [accSaving, setAccSaving] = useState(false);
  const [accSavedSuccess, setAccSavedSuccess] = useState(false);

  // Security / Password update state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  useEffect(() => {
    if (user) {
      setAccName(user.name || '');
      setAccPhone(user.phone || '');
      setAccEmail(user.email || '');
    }
  }, [user]);

  const handleSaveAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setAccSaving(true);
    try {
      const updated = await authService.updateProfile(accName, accPhone, accEmail, {
        preferredArea: accPreferredArea,
        emailAlerts: accEmailAlerts
      });
      if (updated) {
        await refresh();
        setAccSavedSuccess(true);
        showToast('Account details saved successfully.');
        setTimeout(() => setAccSavedSuccess(false), 3000);
      }
    } catch (err: any) {
      showToast(err?.message || 'Failed to update account.');
    } finally {
      setAccSaving(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword) {
      setPasswordError('Please enter a new password.');
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match.');
      return;
    }
    setPasswordLoading(true);
    setPasswordError('');
    try {
      const res = await authService.updatePassword(newPassword);
      if (res.success) {
        setNewPassword('');
        setConfirmPassword('');
        setPasswordSuccess(true);
        showToast('Password updated successfully.');
        setTimeout(() => setPasswordSuccess(false), 3000);
      } else {
        setPasswordError(res.error || 'Failed to update password.');
      }
    } catch (err: any) {
      setPasswordError(err?.message || 'Failed to update password.');
    } finally {
      setPasswordLoading(false);
    }
  };

  // Listings State
  const [dashboardListings, setDashboardListings] = useState<Listing[]>([]);
  const [availabilityFilter, setAvailabilityFilter] = useState<'all' | 'available' | 'rented'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'price_asc' | 'price_desc'>('newest');
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Inquiries / Requests State
  const [inquiries, setInquiries] = useState<ListerInquiry[]>([]);

  // Modals & Feedback
  const [denyModalInquiry, setDenyModalInquiry] = useState<ListerInquiry | null>(null);
  const [deleteModalListing, setDeleteModalListing] = useState<Listing | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Load latest listings
  useEffect(() => {
    if (propListings && propListings.length > 0) {
      setDashboardListings(propListings);
    } else {
      void listingsService.getListings().then((items) => {
        setDashboardListings(items);
      });
    }
  }, [propListings]);

  // Load inquiries
  useEffect(() => {
    void requestsService.getAllRequests().then((rows) => {
      setInquiries(
        rows.map((r, idx) => {
          const isAwaiting =
            r.status === 'availability_pending' || r.status === 'submitted';
          const isEscalated = r.status === 'manual_escalation';
          return {
            id: r.id,
            listingId: r.listingId,
            listingTitle: r.listingTitle,
            listingArea: r.listingArea,
            listingPhoto: r.listingPhoto,
            listingPrice: r.listingPrice,
            renterName: r.renterName,
            renterInitials: r.renterName
              .split(' ')
              .map((p) => p[0])
              .join('')
              .slice(0, 2)
              .toUpperCase(),
            renterEmail: r.renterEmail,
            renterPhone: r.renterPhone,
            renterType: idx % 2 === 1 ? 'business' : 'residential',
            status: isEscalated
              ? 'escalated'
              : isAwaiting
              ? 'needs_response'
              : (r.status as ListerInquiry['status']),
            submittedAt: new Date(r.createdAt).toLocaleString(),
            since: `${Math.max(8, (idx + 1) * 12)} min ago`,
            minutesRemaining: Math.max(5, 30 - (idx + 1) * 8)
          };
        })
      );
    });
  }, []);

  // Time-based greeting
  const greeting = useMemo(() => {
    const h = new Date().getHours();
    return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  }, []);

  // Computed Portfolio Stats
  const activeCount = useMemo(() => dashboardListings.filter((l) => l.isAvailable).length, [dashboardListings]);
  const verifiedCount = useMemo(
    () => dashboardListings.filter((l) => l.verificationStatus === 'verified').length,
    [dashboardListings]
  );
  const totalRequestsCount = useMemo(
    () => dashboardListings.reduce((sum, l) => sum + (l.inquiriesCount || 0), 0) + inquiries.length,
    [dashboardListings, inquiries]
  );
  const pendingRequests = useMemo(
    () => inquiries.filter((inq) => inq.status === 'needs_response' || inq.status === 'escalated'),
    [inquiries]
  );
  const escalatedCount = useMemo(
    () => inquiries.filter((inq) => inq.status === 'escalated').length,
    [inquiries]
  );

  // Filtered Listings for Listings Tab
  const filteredListings = useMemo(() => {
    let list = dashboardListings;
    if (availabilityFilter === 'available') {
      list = list.filter((l) => l.isAvailable);
    } else if (availabilityFilter === 'rented') {
      list = list.filter((l) => !l.isAvailable);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (l) =>
          l.title.toLowerCase().includes(q) ||
          l.area.toLowerCase().includes(q) ||
          (l.addressDescription && l.addressDescription.toLowerCase().includes(q)) ||
          l.type.toLowerCase().includes(q)
      );
    }

    return [...list].sort((a, b) => {
      if (sortBy === 'newest') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      if (sortBy === 'oldest') return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      if (sortBy === 'price_asc') return a.price - b.price;
      if (sortBy === 'price_desc') return b.price - a.price;
      return 0;
    });
  }, [dashboardListings, availabilityFilter, searchQuery, sortBy]);

  // Handle Availability Toggle
  const handleToggleAvailability = async (listing: Listing, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const nextStatus = !listing.isAvailable;
    const updated = await listingsService.updateListing(listing.id, { isAvailable: nextStatus });
    if (updated) {
      setDashboardListings((prev) => prev.map((item) => (item.id === listing.id ? updated : item)));
      showToast(nextStatus ? 'Listing marked as Available.' : 'Listing marked as Rented.');
      if (onListingCreated) onListingCreated();
    }
  };

  // Confirm Availability from Request Card (Green action)
  const handleConfirmRequest = async (inquiryId: string) => {
    await requestsService.respond(inquiryId, 'YES');
    setInquiries((prev) =>
      prev.map((item) =>
        item.id === inquiryId
          ? { ...item, status: 'confirmed', since: 'Just now', minutesRemaining: undefined }
          : item
      )
    );
    showToast('Confirmed — the renter can now pay the access fee');
  };

  // Deny Availability from Request Card (Opens dialog)
  const handleOpenDenyModal = (inq: ListerInquiry) => {
    setDenyModalInquiry(inq);
  };

  const handleConfirmDeny = async () => {
    if (!denyModalInquiry) return;
    const inquiryId = denyModalInquiry.id;
    const listingId = denyModalInquiry.listingId;

    await requestsService.respond(inquiryId, 'NO');
    setInquiries((prev) =>
      prev.map((item) =>
        item.id === inquiryId
          ? { ...item, status: 'unavailable', since: 'Just now', minutesRemaining: undefined }
          : item
      )
    );

    // Flag listing as rented
    await listingsService.updateListing(listingId, { isAvailable: false });
    setDashboardListings((prev) =>
      prev.map((l) => (l.id === listingId ? { ...l, isAvailable: false } : l))
    );

    setDenyModalInquiry(null);
    showToast('Renter notified · listing marked as rented');
  };

  // Delete Listing Confirmation
  const handleExecuteDelete = async () => {
    if (!deleteModalListing) return;
    await listingsService.deleteListing(deleteModalListing.id);
    setDashboardListings((prev) => prev.filter((l) => l.id !== deleteModalListing.id));
    setDeleteModalListing(null);
    showToast('Listing removed from your portfolio.');
    if (onListingCreated) onListingCreated();
  };

  // Share Listing Link
  const handleCopyShareLink = (listing: Listing, e: React.MouseEvent) => {
    e.stopPropagation();
    const url = `${window.location.origin}/listings/${listing.id}`;
    if (navigator.clipboard) {
      void navigator.clipboard.writeText(url).then(() => {
        showToast(`Marketplace link for "${listing.title}" copied!`);
      });
    } else {
      showToast(`Listing ID: ${listing.id}`);
    }
  };

  // Helper: Verification Badge rendering
  const renderVerifPill = (status?: string) => {
    if (status === 'verified') {
      return (
        <span className="pill pill-ok">
          <ShieldCheck /> Verified
        </span>
      );
    }
    if (status === 'pending') {
      return (
        <span className="pill pill-info">
          <Clock /> Inspection booked
        </span>
      );
    }
    return <span className="pill pill-muted">Not verified</span>;
  };

  // Helper: Activity Feed generator
  const activityItems = useMemo(() => {
    const items: { cls: string; icon: 'check' | 'x' | 'alert' | 'shield' | 'clock' | 'plus'; title: string; desc: string }[] = [];

    inquiries.forEach((r) => {
      const title = r.listingTitle || 'a listing';
      if (r.status === 'confirmed') {
        items.push({
          cls: 'done',
          icon: 'check',
          title: `You confirmed availability for ${title}`,
          desc: `${r.renterName} can now pay the access fee · ${r.since || 'recently'}`
        });
      } else if (r.status === 'unavailable') {
        items.push({
          cls: '',
          icon: 'x',
          title: `Marked ${title} unavailable`,
          desc: `${r.renterName} was notified at no charge · ${r.since || 'recently'}`
        });
      } else if (r.status === 'escalated') {
        items.push({
          cls: 'attn',
          icon: 'alert',
          title: `Rentivo is following up with ${r.renterName}`,
          desc: `No reply within 30 minutes for ${title} · ${r.since || 'recently'}`
        });
      }
    });

    dashboardListings.forEach((l) => {
      if (l.verificationStatus === 'verified') {
        items.push({
          cls: 'done',
          icon: 'shield',
          title: `${l.title} is now Verified`,
          desc: 'Passed on-site physical verification'
        });
      } else if (l.verificationStatus === 'pending') {
        items.push({
          cls: '',
          icon: 'clock',
          title: `Verification scheduled for ${l.title}`,
          desc: 'Inspection partner assigned'
        });
      }
    });

    if (dashboardListings.length > 0) {
      const newest = dashboardListings[0];
      items.push({
        cls: '',
        icon: 'plus',
        title: `You listed ${newest.title}`,
        desc: `Posted on Rentivo`
      });
    }

    return items.slice(0, 6);
  }, [inquiries, dashboardListings]);

  // Helper: Smart Tips
  const smartTips = useMemo(() => {
    const unverified = dashboardListings.filter((l) => l.isAvailable && l.verificationStatus !== 'verified');
    const incomplete = dashboardListings.filter(
      (l) => (l.photos?.length || 0) < 3 || !(l.description || '').trim()
    );
    const tips: { icon: 'shield' | 'camera'; title: string; body: string; cta: string; action: () => void }[] = [];

    if (unverified.length > 0) {
      tips.push({
        icon: 'shield',
        title: 'Get verified',
        body: `Verified listings get 3× more requests on average. ${unverified.length} ${
          unverified.length === 1 ? 'listing needs' : 'listings need'
        } verification.`,
        cta: 'Request verification',
        action: () => setActiveTab('verification')
      });
    }

    if (incomplete.length > 0) {
      tips.push({
        icon: 'camera',
        title: 'Finish your listings',
        body: `${incomplete.length} ${
          incomplete.length === 1 ? 'listing is' : 'listings are'
        } missing photos or a description — both help renters trust a listing.`,
        cta: 'Complete a listing',
        action: () => {
          if (onOpenEditListing) onOpenEditListing(incomplete[0]);
        }
      });
    }

    return tips;
  }, [dashboardListings, onOpenEditListing]);

  return (
    <div className="lister-portal">
      {/* -------------------------------------------------------------
          TOPBAR (SHARED HORIZONTAL NAVIGATION ACCORDING TO SPEC)
         ------------------------------------------------------------- */}
      <header className="lister-topbar">
        <div className="lister-topbar-in">
          {/* Brand Mark: Rentivo House Logo + Text */}
          <div
            className="lister-brand"
            onClick={() => setActiveTab('home')}
            title="Rentivo Lister Portal"
          >
            <div className="lister-brand-mark">
              <Home />
            </div>
            <span>
              RENT<em>ivo</em>
            </span>
          </div>

          {/* Navigation Tabs */}
          <nav className="lister-tabs" aria-label="Lister Portal Navigation">
            <button
              type="button"
              className={`lister-tab ${activeTab === 'home' ? 'active' : ''}`}
              aria-current={activeTab === 'home' ? 'page' : undefined}
              onClick={() => {
                setActiveTab('home');
                if (window.location.pathname.startsWith('/lister')) {
                  window.history.pushState(null, '', '/lister/home');
                }
              }}
            >
              <Home />
              <span>Home</span>
            </button>

            <button
              type="button"
              className={`lister-tab ${activeTab === 'listings' ? 'active' : ''}`}
              aria-current={activeTab === 'listings' ? 'page' : undefined}
              onClick={() => {
                setActiveTab('listings');
                if (window.location.pathname.startsWith('/lister')) {
                  window.history.pushState(null, '', '/lister/listings');
                }
              }}
            >
              <LayoutGrid />
              <span>Listings</span>
            </button>

            <button
              type="button"
              className={`lister-tab ${activeTab === 'inquiries' ? 'active' : ''}`}
              aria-current={activeTab === 'inquiries' ? 'page' : undefined}
              onClick={() => {
                setActiveTab('inquiries');
                if (window.location.pathname.startsWith('/lister')) {
                  window.history.pushState(null, '', '/lister/requests');
                }
              }}
            >
              <Mail />
              <span>Requests</span>
              {pendingRequests.length > 0 && (
                <span className="count" aria-label={`${pendingRequests.length} awaiting your reply`}>
                  {pendingRequests.length}
                </span>
              )}
            </button>

            <button
              type="button"
              className={`lister-tab ${activeTab === 'verification' ? 'active' : ''}`}
              aria-current={activeTab === 'verification' ? 'page' : undefined}
              onClick={() => {
                setActiveTab('verification');
                if (window.location.pathname.startsWith('/lister')) {
                  window.history.pushState(null, '', '/lister/verification');
                }
              }}
            >
              <ShieldCheck />
              <span>Verification</span>
            </button>

            <button
              type="button"
              className={`lister-tab ${activeTab === 'profile' ? 'active' : ''}`}
              aria-current={activeTab === 'profile' ? 'page' : undefined}
              onClick={() => {
                setActiveTab('profile');
                if (window.location.pathname.startsWith('/lister')) {
                  window.history.pushState(null, '', '/lister/account');
                }
              }}
            >
              <User />
              <span>Account</span>
            </button>
          </nav>

          {/* Top CTA: + Post a listing */}
          <button
            type="button"
            className="btn btn-accent lister-top-cta"
            onClick={onOpenCreateListing}
          >
            <Plus />
            <span>Post a listing</span>
          </button>
        </div>
      </header>

      {/* -------------------------------------------------------------
          TAB 1: HOME DASHBOARD (PIXEL-ACCURATE SYNC FROM DESIGN SPEC)
         ------------------------------------------------------------- */}
      {activeTab === 'home' && (
        <main className="lister-page" id="main">
          {/* Greeting Row */}
          <div className="greet-row">
            <div>
              <h1 className="lister-page-title">
                {greeting}, {listerFirstName}
              </h1>
              <p className="greet-sub">Here's how your properties are doing on Rentivo today.</p>
            </div>
          </div>

          {/* Attention Banner if requests need reply */}
          {escalatedCount > 0 ? (
            <div className="banner" style={{ background: 'var(--bad-bg)' }}>
              <AlertTriangle style={{ color: 'var(--bad)' }} />
              <p>
                <strong>
                  {escalatedCount} {escalatedCount === 1 ? 'request needs' : 'requests need'} your attention.
                </strong>{' '}
                Our team is following up, but a quick reply from you gets the renter to payment faster.{' '}
                <button
                  type="button"
                  className="link-btn"
                  style={{ color: 'var(--bad)', fontWeight: 700 }}
                  onClick={() => setActiveTab('inquiries')}
                >
                  View requests
                </button>
              </p>
            </div>
          ) : pendingRequests.length > 0 ? (
            <div className="banner" style={{ background: 'var(--info-bg)' }}>
              <Clock style={{ color: 'var(--info)' }} />
              <p>
                <strong>
                  {pendingRequests.length} {pendingRequests.length === 1 ? 'renter is' : 'renters are'} waiting on
                  your confirmation.
                </strong>{' '}
                Confirming availability within 30 minutes keeps your response rating high.{' '}
                <button
                  type="button"
                  className="link-btn"
                  style={{ color: 'var(--info)', fontWeight: 700 }}
                  onClick={() => setActiveTab('inquiries')}
                >
                  Review now
                </button>
              </p>
            </div>
          ) : null}

          {/* Top 4 KPI Stat Cards */}
          <div className="stat-grid">
            <div className="stat-card">
              <div className="stat-num">{activeCount}</div>
              <div className="stat-label">Active listings</div>
            </div>
            <div className="stat-card">
              <div className="stat-num">{verifiedCount}</div>
              <div className="stat-label">Verified</div>
            </div>
            <div className="stat-card">
              <div className="stat-num">{totalRequestsCount}</div>
              <div className="stat-label">Access requests</div>
            </div>
            <div
              className="stat-card is-link"
              onClick={() => setActiveTab('inquiries')}
              title="View pending requests"
            >
              <div className="stat-num">{pendingRequests.length}</div>
              <div className="stat-label">Awaiting your reply</div>
            </div>
          </div>

          {/* 2-Column Responsive Layout */}
          <div className="home-grid">
            {/* Main Column */}
            <div className="home-main">
              {/* 1. Needs Your Reply Section */}
              <section aria-labelledby="s-reply">
                <div className="lister-section-title" style={{ marginTop: 0 }}>
                  <span id="s-reply">Needs your reply</span>
                  {pendingRequests.length > 0 && (
                    <button
                      type="button"
                      className="link-btn"
                      onClick={() => setActiveTab('inquiries')}
                    >
                      See all requests
                    </button>
                  )}
                </div>

                {pendingRequests.length > 0 ? (
                  <div className="reply-list">
                    {pendingRequests.map((r) => {
                      const isEscalated = r.status === 'escalated';
                      const matchingListing = dashboardListings.find((l) => l.id === r.listingId);
                      const photoUrl = r.listingPhoto || matchingListing?.photos?.[0];

                      return (
                        <div key={r.id} className="req-card">
                          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 10 }}>
                            <div
                              style={{
                                width: 56,
                                height: 44,
                                borderRadius: 8,
                                overflow: 'hidden',
                                background: 'var(--surface-2)',
                                flexShrink: 0,
                                cursor: 'pointer'
                              }}
                              onClick={() => {
                                if (matchingListing && onSelectListingToView) onSelectListingToView(matchingListing);
                                else window.open(`/listings/${r.listingId}`, '_blank');
                              }}
                              title="View listing details"
                            >
                              {photoUrl ? (
                                <img src={photoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              ) : (
                                <div style={{ display: 'grid', placeItems: 'center', height: '100%', color: 'var(--ink-3)' }}>
                                  <Camera size={18} />
                                </div>
                              )}
                            </div>

                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                                <div className="req-tenant">
                                  {r.renterName}
                                  {r.renterType === 'business' && (
                                    <span className="pill pill-muted" style={{ marginLeft: 8, fontSize: '0.75rem' }}>
                                      Business
                                    </span>
                                  )}
                                </div>
                                <span
                                  className="timer-chip"
                                  style={isEscalated ? { color: 'var(--bad)', background: 'var(--bad-bg)' } : undefined}
                                >
                                  <Clock /> {r.since || 'Just now'}
                                </span>
                              </div>

                              <div className="req-for" style={{ marginTop: 2, marginBottom: 0 }}>
                                Wants access to{' '}
                                <strong
                                  style={{ color: 'var(--ink)', cursor: 'pointer', textDecoration: 'underline' }}
                                  onClick={() => {
                                    if (matchingListing && onSelectListingToView) onSelectListingToView(matchingListing);
                                    else window.open(`/listings/${r.listingId}`, '_blank');
                                  }}
                                  title="Open property page"
                                >
                                  {r.listingTitle}
                                </strong>
                              </div>
                            </div>
                          </div>

                          {isEscalated && (
                            <p className="hint" style={{ color: 'var(--bad)', marginBottom: 10 }}>
                              You didn't reply in time — our team is following up directly. You can still confirm
                              below.
                            </p>
                          )}

                          <div className="req-actions">
                            <button
                              type="button"
                              className="btn btn-success btn-sm"
                              style={{ flex: 1 }}
                              onClick={() => handleConfirmRequest(r.id)}
                            >
                              <Check /> Still available
                            </button>
                            <button
                              type="button"
                              className="btn btn-danger-quiet btn-sm"
                              style={{ flex: 1, border: '1.5px solid var(--field-line)' }}
                              onClick={() => handleOpenDenyModal(r)}
                            >
                              <X /> No longer
                            </button>
                            <button
                              type="button"
                              className="btn btn-outline btn-sm"
                              onClick={() => setActiveTab('inquiries')}
                              title="Go to requests page"
                            >
                              See all requests
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="quiet-note">
                    <CheckCircle2 />
                    <span>You're all caught up — no renters are waiting on a reply.</span>
                  </div>
                )}
              </section>

              {/* 2. Your Listings Mini List */}
              <section aria-labelledby="s-mylistings">
                <div className="lister-section-title">
                  <span id="s-mylistings">Your listings</span>
                  <button
                    type="button"
                    className="link-btn"
                    onClick={() => setActiveTab('listings')}
                  >
                    Manage all
                  </button>
                </div>
                <div className="mini-list">
                  {dashboardListings.slice(0, 4).map((l) => (
                    <div
                      key={l.id}
                      className="mini"
                      onClick={() => {
                        if (onSelectListingToView) onSelectListingToView(l);
                      }}
                      style={{ cursor: 'pointer' }}
                    >
                      <span className="mini-thumb">
                        {l.photos && l.photos[0] ? (
                          <img src={l.photos[0]} alt={l.title} loading="lazy" />
                        ) : (
                          <span className="thumb-empty">
                            <Camera />
                          </span>
                        )}
                      </span>
                      <span className="mini-text">
                        <strong>{l.title}</strong>
                        <span>
                          {l.area} · {l.isAvailable ? 'Available' : 'Rented'}
                        </span>
                      </span>
                      <span className="mini-side">
                        <span className="price">{formatNaira(l.price)}</span>
                        {renderVerifPill(l.verificationStatus)}
                      </span>
                    </div>
                  ))}
                </div>
              </section>

              {/* 3. Recent Activity Feed */}
              <section aria-labelledby="s-activity">
                <div className="lister-section-title">
                  <span id="s-activity">Recent activity</span>
                </div>
                <div className="panel">
                  <div className="tl">
                    {activityItems.map((item, idx) => (
                      <div key={idx} className={`tl-item ${item.cls}`}>
                        <span className="tl-dot">
                          {item.icon === 'check' && <Check />}
                          {item.icon === 'x' && <X />}
                          {item.icon === 'alert' && <AlertTriangle />}
                          {item.icon === 'shield' && <ShieldCheck />}
                          {item.icon === 'clock' && <Clock />}
                          {item.icon === 'plus' && <Plus />}
                        </span>
                        <div className="tl-title">{item.title}</div>
                        <div className="tl-desc">{item.desc}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            </div>

            {/* Sidebar Column */}
            <aside className="home-side">
              {/* Member Profile Card */}
              <div className="tip-card">
                <div className="member-card">
                  <span className="profile-avatar" aria-hidden="true">
                    {listerInitials}
                  </span>
                  <div className="member-meta">
                    <strong>{listerName}</strong>
                    <span>
                      {listerRole} · Member since Feb 2026
                    </span>
                  </div>
                </div>
                <div className="member-stats">
                  <div>
                    <b>{dashboardListings.length}</b>
                    <span>{dashboardListings.length === 1 ? 'Listing' : 'Listings'}</span>
                  </div>
                  <div>
                    <b>{verifiedCount}</b>
                    <span>Verified</span>
                  </div>
                </div>
                <button
                  type="button"
                  className="link-btn"
                  onClick={() => {
                    if (onNavigateToProfile) onNavigateToProfile();
                    else setActiveTab('profile');
                  }}
                >
                  View profile <ArrowRight />
                </button>
              </div>

              {/* Boost Your Listings Tips */}
              {smartTips.length > 0 && (
                <div className="tip-card">
                  <h2>
                    <Sparkles /> Boost your listings
                  </h2>
                  <p className="hint">Small, quick changes that tend to bring more requests.</p>
                  {smartTips.map((tip, idx) => (
                    <div
                      key={idx}
                      style={{
                        marginBottom: idx === smartTips.length - 1 ? 0 : 16,
                        paddingBottom: idx === smartTips.length - 1 ? 0 : 14,
                        borderBottom: idx === smartTips.length - 1 ? 'none' : '1px solid var(--line)'
                      }}
                    >
                      <p style={{ fontWeight: 600, marginBottom: 2 }}>{tip.title}</p>
                      <p className="hint" style={{ marginTop: 0 }}>
                        {tip.body}
                      </p>
                      <button type="button" className="link-btn" onClick={tip.action}>
                        {tip.cta} <ArrowRight />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* How Requests Work Card */}
              <div className="tip-card">
                <h2>
                  <Mail /> How requests work
                </h2>
                <p className="hint">A reminder of what happens after a renter finds your listing.</p>
                <div className="howit">
                  <div className="howit-item">
                    <span className="howit-num">1</span>
                    <p>
                      <strong>Renter requests access</strong> to your listing — it's free to them, no obligation yet.
                    </p>
                  </div>
                  <div className="howit-item">
                    <span className="howit-num">2</span>
                    <p>
                      We text you to <strong>confirm it's still available</strong>. Reply within 30 minutes, or we
                      follow up on your behalf.
                    </p>
                  </div>
                  <div className="howit-item">
                    <span className="howit-num">3</span>
                    <p>
                      Once you confirm, the renter pays a flat access fee and{' '}
                      <strong>your contact is shared</strong> with them.
                    </p>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </main>
      )}

      {/* -------------------------------------------------------------
          TAB 2: LISTINGS MANAGEMENT TAB (SEGMENTED FILTERS & SWITCH TOGGLE)
         ------------------------------------------------------------- */}
      {activeTab === 'listings' && (
        <main className="lister-page">
          <div className="lister-page-head">
            <div>
              <h1 className="lister-page-title">Listings</h1>
              <p className="lister-page-sub">
                Switch a listing to Rented once it's taken, so renters stop requesting it.
              </p>
            </div>
            <button type="button" className="btn btn-primary" onClick={onOpenCreateListing}>
              <Plus /> Post a listing
            </button>
          </div>

          {/* Toolbar: Segmented Availability + Search & Sort */}
          <div className="toolbar">
            <div className="seg">
              <button
                type="button"
                className={availabilityFilter === 'all' ? 'on' : ''}
                onClick={() => setAvailabilityFilter('all')}
              >
                <span>All</span>
                <span className="seg-count">{dashboardListings.length}</span>
              </button>
              <button
                type="button"
                className={availabilityFilter === 'available' ? 'on' : ''}
                onClick={() => setAvailabilityFilter('available')}
              >
                <span>Available</span>
                <span className="seg-count">
                  {dashboardListings.filter((l) => l.isAvailable).length}
                </span>
              </button>
              <button
                type="button"
                className={availabilityFilter === 'rented' ? 'on' : ''}
                onClick={() => setAvailabilityFilter('rented')}
              >
                <span>Rented</span>
                <span className="seg-count">
                  {dashboardListings.filter((l) => !l.isAvailable).length}
                </span>
              </button>
            </div>

            <div className="toolbar-tools">
              <div className="search">
                <Search />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search listings"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <select
                className="select"
                style={{ width: 'auto', minHeight: 40, padding: '0 32px 0 12px' }}
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
              >
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
              </select>
            </div>
          </div>

          {/* Table / Responsive Card View */}
          {filteredListings.length === 0 ? (
            <div className="empty">
              <Building2 />
              <h3>No listings found</h3>
              <p>Try adjusting your search or filter settings to view your properties.</p>
              <button type="button" className="btn btn-outline" onClick={() => { setSearchQuery(''); setAvailabilityFilter('all'); }}>
                Clear filters
              </button>
            </div>
          ) : (
            <table className="ltable">
              <thead>
                <tr>
                  <th>Listing</th>
                  <th className="c-rent">Rent</th>
                  <th className="c-avail">Availability</th>
                  <th className="c-verify">Verification</th>
                  <th className="c-req">Requests</th>
                  <th className="c-act" style={{ textAlign: 'right' }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredListings.map((listing) => {
                  const reqCount = listing.inquiriesCount || 0;
                  return (
                    <tr key={listing.id} className={!listing.isAvailable ? 'is-rented' : ''}>
                      {/* Listing Column */}
                      <td className="c-listing">
                        <div className="lcell">
                          <span
                            className="thumb"
                            onClick={() => onSelectListingToView && onSelectListingToView(listing)}
                            style={{ cursor: 'pointer' }}
                          >
                            {listing.photos && listing.photos[0] ? (
                              <img src={listing.photos[0]} alt="" loading="lazy" />
                            ) : (
                              <span className="thumb-empty">
                                <Camera />
                              </span>
                            )}
                          </span>
                          <div className="ltext">
                            <span
                              className="ltitle"
                              onClick={() => onSelectListingToView && onSelectListingToView(listing)}
                            >
                              {listing.title}
                            </span>
                            <span className="lmeta">
                              <span>{listing.area}, Ibadan</span>
                              <span>·</span>
                              <span>{listing.bedrooms || listing.type}</span>
                            </span>
                            <span className="lprice-inline">
                              {formatPriceWithPeriod(listing.price, listing.pricePeriod, listing.type)}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Rent Column */}
                      <td className="c-rent">
                        <span className="price">{formatNaira(listing.price)}</span>
                        <span className="per"> /yr</span>
                      </td>

                      {/* Availability Switch Column */}
                      <td className="c-avail">
                        <label className="avail">
                          <span className="switch">
                            <input
                              type="checkbox"
                              checked={listing.isAvailable}
                              onChange={(e) => handleToggleAvailability(listing, e as any)}
                            />
                            <span className="track" />
                            <span className="thumb" />
                          </span>
                          <span>{listing.isAvailable ? 'Available' : 'Rented'}</span>
                        </label>
                      </td>

                      {/* Verification Column */}
                      <td className="c-verify">{renderVerifPill(listing.verificationStatus)}</td>

                      {/* Requests Column */}
                      <td className="c-req">
                        <span>
                          {reqCount} {reqCount === 1 ? 'request' : 'requests'}
                        </span>
                      </td>

                      {/* Actions Column */}
                      <td className="c-act" style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                          <button
                            type="button"
                            className="btn btn-outline btn-sm"
                            onClick={() => onOpenEditListing && onOpenEditListing(listing)}
                            title="Edit listing details"
                          >
                            <Pencil />
                            <span>Edit</span>
                          </button>
                          <button
                            type="button"
                            className="btn btn-outline btn-sm"
                            style={{ padding: '0 8px' }}
                            onClick={(e) => handleCopyShareLink(listing, e)}
                            title="Copy marketplace link"
                          >
                            <Copy />
                          </button>
                          <button
                            type="button"
                            className="btn btn-danger-quiet btn-sm"
                            style={{ padding: '0 8px' }}
                            onClick={() => setDeleteModalListing(listing)}
                            title="Delete listing"
                          >
                            <Trash2 />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </main>
      )}

      {/* -------------------------------------------------------------
          TAB 3: REQUESTS & INQUIRIES TAB (DIRECT AVAILABILITY ACTIONS)
         ------------------------------------------------------------- */}
      {activeTab === 'inquiries' && (
        <main className="lister-page">
          <div className="lister-page-head">
            <div>
              <h1 className="lister-page-title">Requests</h1>
              <p className="lister-page-sub">
                Confirm property availability within 30 minutes so prospective renters can proceed to pay the verified access fee.
              </p>
            </div>
          </div>

          {inquiries.length === 0 ? (
            <div className="empty">
              <Mail />
              <h3>No requests yet</h3>
              <p>When renters browse your listings on Rentivo and ask for vacancy confirmation, their requests will appear here.</p>
            </div>
          ) : (
            <div className="panel" style={{ padding: 0, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: 'var(--surface-2)', borderBottom: '1px solid var(--line)', color: 'var(--ink-2)', fontSize: 'var(--fs-sm)', fontWeight: 600 }}>
                    <th style={{ padding: '12px 18px' }}>Renter</th>
                    <th style={{ padding: '12px 16px' }}>Listing Requested</th>
                    <th style={{ padding: '12px 16px' }}>Rent & Area</th>
                    <th style={{ padding: '12px 16px' }}>Status</th>
                    <th style={{ padding: '12px 18px', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {inquiries.map((inq) => {
                    const isNeedsResponse = inq.status === 'needs_response' || inq.status === 'escalated';
                    const matchingListing = dashboardListings.find((l) => l.id === inq.listingId);
                    const photoUrl = inq.listingPhoto || matchingListing?.photos?.[0];

                    return (
                      <tr key={inq.id} style={{ borderBottom: '1px solid var(--line)' }}>
                        <td style={{ padding: '14px 18px' }}>
                          <strong style={{ color: 'var(--ink)', display: 'block' }}>{inq.renterName}</strong>
                          <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--ink-2)' }}>
                            {inq.submittedAt} · {inq.renterType === 'business' ? 'Business tenant' : 'Residential'}
                          </span>
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div
                              style={{
                                width: 44,
                                height: 36,
                                borderRadius: 6,
                                overflow: 'hidden',
                                background: 'var(--surface-2)',
                                flexShrink: 0,
                                cursor: 'pointer'
                              }}
                              onClick={() => {
                                if (matchingListing && onSelectListingToView) onSelectListingToView(matchingListing);
                                else window.open(`/listings/${inq.listingId}`, '_blank');
                              }}
                              title="View listing details"
                            >
                              {photoUrl ? (
                                <img src={photoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              ) : (
                                <div style={{ display: 'grid', placeItems: 'center', height: '100%', color: 'var(--ink-3)' }}>
                                  <Camera size={14} />
                                </div>
                              )}
                            </div>
                            <div>
                              <strong
                                style={{
                                  color: 'var(--ink)',
                                  display: 'block',
                                  cursor: 'pointer',
                                  textDecoration: 'underline'
                                }}
                                onClick={() => {
                                  if (matchingListing && onSelectListingToView) onSelectListingToView(matchingListing);
                                  else window.open(`/listings/${inq.listingId}`, '_blank');
                                }}
                                title="Open property details"
                              >
                                {inq.listingTitle}
                              </strong>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          <span style={{ fontWeight: 700, color: 'var(--ink)' }}>{formatNaira(inq.listingPrice)}/yr</span>
                          <span style={{ display: 'block', fontSize: 'var(--fs-xs)', color: 'var(--ink-2)' }}>{inq.listingArea}, Ibadan</span>
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          {isNeedsResponse ? (
                            <span className="pill pill-warn">
                              <Clock /> Awaiting your confirmation
                            </span>
                          ) : inq.status === 'confirmed' ? (
                            <span className="pill pill-info">
                              <Check /> Availability confirmed
                            </span>
                          ) : inq.status === 'paid' ? (
                            <span className="pill pill-ok">
                              <CheckCircle2 /> Fee paid & unlocked
                            </span>
                          ) : (
                            <span className="pill pill-muted">Marked unavailable</span>
                          )}
                        </td>
                        <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                          {isNeedsResponse ? (
                            <div style={{ display: 'inline-flex', gap: 6 }}>
                              <button
                                type="button"
                                className="btn btn-success btn-sm"
                                onClick={() => handleConfirmRequest(inq.id)}
                              >
                                <Check /> Still available
                              </button>
                              <button
                                type="button"
                                className="btn btn-danger-quiet btn-sm"
                                style={{ border: '1.5px solid var(--field-line)' }}
                                onClick={() => handleOpenDenyModal(inq)}
                              >
                                <X /> No longer
                              </button>
                            </div>
                          ) : inq.status === 'paid' ? (
                            <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--ok)', fontWeight: 600 }}>
                              <Phone style={{ width: 14, height: 14, display: 'inline', marginRight: 4 }} />
                              {inq.renterPhone}
                            </div>
                          ) : (
                            <span style={{ fontSize: 'var(--fs-sm)', color: 'var(--ink-2)' }}>Resolved</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </main>
      )}

      {/* -------------------------------------------------------------
          TAB 4: VERIFICATION CENTER TAB (COMPLETE FLOW EMBEDDED)
         ------------------------------------------------------------- */}
      {activeTab === 'verification' && (
        <ListerVerificationPage
          listings={dashboardListings}
          onBack={() => setActiveTab('home')}
        />
      )}

      {/* -------------------------------------------------------------
          TAB 5: ACCOUNT TAB (LANDLORD IDENTITY, PORTAL CONNECTIONS & SETTINGS)
         ------------------------------------------------------------- */}
      {activeTab === 'profile' && (
        <main className="lister-page">
          <div className="lister-page-head">
            <div>
              <h1 className="lister-page-title">Account &amp; Settings</h1>
              <p className="lister-page-sub">
                Manage your landlord identity, contact info for tenant requests, notification preferences, and verification status.
              </p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24, alignItems: 'start' }}>
            {/* Column 1: Profile & Contact Details + Security */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              
              {/* Profile Card */}
              <div className="panel panel-pad">
                <div className="member-card" style={{ marginBottom: 20 }}>
                  <span className="profile-avatar" style={{ width: 60, height: 60, fontSize: '1.4rem' }}>
                    {listerInitials}
                  </span>
                  <div className="member-meta">
                    <strong style={{ fontSize: '1.15rem' }}>{user?.name || listerName}</strong>
                    <span>{listerRole} · {user?.email || 'No email set'}</span>
                    <span style={{ color: 'var(--ok)', fontWeight: 600, fontSize: 'var(--fs-sm)', marginTop: 4, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <CheckCircle2 size={14} /> Verified Lister Account
                    </span>
                  </div>
                </div>

                <form onSubmit={handleSaveAccount}>
                  <div className="field">
                    <label htmlFor="accName">Full Name</label>
                    <input
                      id="accName"
                      type="text"
                      className="input"
                      value={accName}
                      onChange={(e) => setAccName(e.target.value)}
                      placeholder="e.g. Adebayo Okonkwo"
                      required
                    />
                  </div>

                  <div className="field">
                    <label htmlFor="accPhone">Phone Number</label>
                    <input
                      id="accPhone"
                      type="tel"
                      className="input"
                      value={accPhone}
                      onChange={(e) => setAccPhone(e.target.value)}
                      placeholder="e.g. 08012345678"
                      required
                    />
                    <small style={{ color: 'var(--ink-3)', fontSize: '0.8125rem', marginTop: 4, display: 'block' }}>
                      Prospective tenants and Rentivo verification inspectors will reach you through this number.
                    </small>
                  </div>

                  <div className="field">
                    <label htmlFor="accEmail">Email Address</label>
                    <input
                      id="accEmail"
                      type="email"
                      className="input"
                      value={accEmail}
                      onChange={(e) => setAccEmail(e.target.value)}
                      placeholder="e.g. landlord@example.com"
                      required
                    />
                  </div>

                  <div className="field">
                    <label htmlFor="accArea">Primary Operating City / Area</label>
                    <input
                      id="accArea"
                      type="text"
                      className="input"
                      value={accPreferredArea}
                      onChange={(e) => setAccPreferredArea(e.target.value)}
                      placeholder="e.g. Bodija, Ibadan"
                    />
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 20 }}>
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={accSaving}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
                    >
                      <Save size={16} />
                      <span>{accSaving ? 'Saving…' : 'Save account changes'}</span>
                    </button>
                    {accSavedSuccess && (
                      <span style={{ color: 'var(--ok)', fontSize: 'var(--fs-sm)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <Check size={14} /> Saved!
                      </span>
                    )}
                  </div>
                </form>
              </div>

              {/* Password & Security Card */}
              <div className="panel panel-pad">
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Lock size={18} /> Password &amp; Security
                </h3>
                <p style={{ color: 'var(--ink-2)', fontSize: '0.875rem', marginBottom: 16 }}>
                  Update your login password to keep your property portfolio secure.
                </p>

                <form onSubmit={handleUpdatePassword}>
                  <div className="field">
                    <label htmlFor="accNewPw">New Password</label>
                    <input
                      id="accNewPw"
                      type="password"
                      className="input"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="At least 6 characters"
                    />
                  </div>

                  <div className="field">
                    <label htmlFor="accConfPw">Confirm Password</label>
                    <input
                      id="accConfPw"
                      type="password"
                      className="input"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter new password"
                    />
                  </div>

                  {passwordError && (
                    <div style={{ color: 'var(--bad)', fontSize: '0.85rem', marginBottom: 12, fontWeight: 500 }}>
                      {passwordError}
                    </div>
                  )}

                  {passwordSuccess && (
                    <div style={{ color: 'var(--ok)', fontSize: '0.85rem', marginBottom: 12, fontWeight: 600 }}>
                      Password updated successfully!
                    </div>
                  )}

                  <button
                    type="submit"
                    className="btn btn-outline"
                    disabled={passwordLoading || !newPassword}
                    style={{ minHeight: 38 }}
                  >
                    {passwordLoading ? 'Updating…' : 'Update password'}
                  </button>
                </form>
              </div>

            </div>

            {/* Column 2: Portal Quick-Hub & Preferences */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

              {/* Verification Accreditation Hub Card */}
              <div className="panel panel-pad" style={{ background: 'var(--surface)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--ok-bg)', color: 'var(--ok)', display: 'grid', placeItems: 'center' }}>
                    <ShieldCheck size={20} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0 }}>Property Verification</h3>
                    <span style={{ fontSize: '0.8125rem', color: 'var(--ok)', fontWeight: 600 }}>
                      {verifiedCount} of {dashboardListings.length} properties verified
                    </span>
                  </div>
                </div>
                <p style={{ color: 'var(--ink-2)', fontSize: '0.875rem', lineHeight: 1.5, marginBottom: 16 }}>
                  Verified listings receive our trusted badge, get 3× higher renter inquiries, and rank higher in Ibadan search results.
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={() => {
                      setActiveTab('verification');
                      if (window.location.pathname.startsWith('/lister')) {
                        window.history.pushState(null, '', '/lister/verification');
                      }
                    }}
                  >
                    <ShieldCheck size={15} />
                    <span>Open Verification Hub</span>
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={() => {
                      setActiveTab('verification');
                      if (window.location.pathname.startsWith('/lister')) {
                        window.history.pushState(null, '', '/lister/verification/request');
                      }
                    }}
                  >
                    <span>Request verification</span>
                  </button>
                </div>
              </div>

              {/* Connected Portal Sections Card */}
              <div className="panel panel-pad">
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: 14 }}>
                  Lister Portal Connections
                </h3>
                <div style={{ display: 'grid', gap: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', background: 'var(--surface-2)', borderRadius: 10 }}>
                    <div>
                      <b style={{ display: 'block', fontSize: '0.9375rem' }}>Active Listings</b>
                      <span style={{ fontSize: '0.8125rem', color: 'var(--ink-2)' }}>{dashboardListings.length} properties in portfolio</span>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        onClick={() => {
                          setActiveTab('listings');
                          if (window.location.pathname.startsWith('/lister')) {
                            window.history.pushState(null, '', '/lister/listings');
                          }
                        }}
                      >
                        Manage
                      </button>
                      <button
                        type="button"
                        className="btn btn-accent btn-sm"
                        onClick={onOpenCreateListing}
                      >
                        + Post
                      </button>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', background: 'var(--surface-2)', borderRadius: 10 }}>
                    <div>
                      <b style={{ display: 'block', fontSize: '0.9375rem' }}>Tenant Requests</b>
                      <span style={{ fontSize: '0.8125rem', color: 'var(--ink-2)' }}>
                        {pendingRequests.length > 0 ? `${pendingRequests.length} pending replies` : 'All caught up'}
                      </span>
                    </div>
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      onClick={() => {
                        setActiveTab('inquiries');
                        if (window.location.pathname.startsWith('/lister')) {
                          window.history.pushState(null, '', '/lister/requests');
                        }
                      }}
                    >
                      View ({inquiries.length})
                    </button>
                  </div>
                </div>
              </div>

              {/* Notification Toggles Card */}
              <div className="panel panel-pad">
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Bell size={18} /> Notification Preferences
                </h3>
                <p style={{ color: 'var(--ink-2)', fontSize: '0.875rem', marginBottom: 16 }}>
                  Choose how Rentivo notifies you when a tenant checks availability or sends a request.
                </p>

                <div style={{ display: 'grid', gap: 14 }}>
                  <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
                    <div>
                      <b style={{ display: 'block', fontSize: '0.9375rem' }}>WhatsApp Alerts</b>
                      <span style={{ fontSize: '0.8125rem', color: 'var(--ink-2)' }}>Instant message when a tenant requests your listing</span>
                    </div>
                    <span className="switch">
                      <input
                        type="checkbox"
                        checked={accWhatsappAlerts}
                        onChange={(e) => {
                          setAccWhatsappAlerts(e.target.checked);
                          showToast('Notification preference saved.');
                        }}
                      />
                      <span className="track" />
                      <span className="thumb" />
                    </span>
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
                    <div>
                      <b style={{ display: 'block', fontSize: '0.9375rem' }}>SMS Notifications</b>
                      <span style={{ fontSize: '0.8125rem', color: 'var(--ink-2)' }}>Urgent availability SMS reminders</span>
                    </div>
                    <span className="switch">
                      <input
                        type="checkbox"
                        checked={accSmsAlerts}
                        onChange={(e) => {
                          setAccSmsAlerts(e.target.checked);
                          showToast('Notification preference saved.');
                        }}
                      />
                      <span className="track" />
                      <span className="thumb" />
                    </span>
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
                    <div>
                      <b style={{ display: 'block', fontSize: '0.9375rem' }}>Email Activity Summaries</b>
                      <span style={{ fontSize: '0.8125rem', color: 'var(--ink-2)' }}>Weekly report on views and inquiries</span>
                    </div>
                    <span className="switch">
                      <input
                        type="checkbox"
                        checked={accEmailAlerts}
                        onChange={(e) => {
                          setAccEmailAlerts(e.target.checked);
                          showToast('Notification preference saved.');
                        }}
                      />
                      <span className="track" />
                      <span className="thumb" />
                    </span>
                  </label>
                </div>
              </div>

              {/* Renter Switch & Sign Out */}
              <div className="panel panel-pad" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                <div>
                  <b style={{ display: 'block', fontSize: '0.9375rem' }}>Renter Marketplace</b>
                  <span style={{ fontSize: '0.8125rem', color: 'var(--ink-2)' }}>Explore listings as a home seeker</span>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  {onNavigateToMarketplace && (
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      onClick={onNavigateToMarketplace}
                    >
                      <ExternalLink size={14} />
                      <span>Browse marketplace</span>
                    </button>
                  )}
                  {onSignOut && (
                    <button
                      type="button"
                      className="btn btn-danger-quiet btn-sm"
                      style={{ border: '1px solid var(--bad-solid)' }}
                      onClick={onSignOut}
                    >
                      Sign out
                    </button>
                  )}
                </div>
              </div>

            </div>
          </div>
        </main>
      )}

      {/* -------------------------------------------------------------
          CONFIRMATION DIALOG: MARK AS NO LONGER AVAILABLE
         ------------------------------------------------------------- */}
      {denyModalInquiry && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(10, 10, 30, 0.55)',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16
          }}
          onClick={() => setDenyModalInquiry(null)}
        >
          <div
            className="dialog"
            style={{ width: '100%', maxWidth: 460 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="dialog-body">
              <h3>Mark as no longer available?</h3>
              <p>
                The renter ({denyModalInquiry.renterName}) will be notified at zero charge, and "{denyModalInquiry.listingTitle}" will be switched to Rented so you receive no further inquiries.
              </p>
              <div className="dialog-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setDenyModalInquiry(null)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleConfirmDeny}
                >
                  Confirm, it's taken
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------
          CONFIRMATION DIALOG: DELETE LISTING
         ------------------------------------------------------------- */}
      {deleteModalListing && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(10, 10, 30, 0.55)',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16
          }}
          onClick={() => setDeleteModalListing(null)}
        >
          <div
            className="dialog"
            style={{ width: '100%', maxWidth: 440 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="dialog-body">
              <h3 style={{ color: 'var(--bad)' }}>Delete Listing?</h3>
              <p>
                Are you sure you want to permanently delete "{deleteModalListing.title}"? This cannot be undone.
              </p>
              <div className="dialog-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setDeleteModalListing(null)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={handleExecuteDelete}
                >
                  Delete permanently
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------
          TOAST NOTIFICATION (SHARED TOAST COMPONENT)
         ------------------------------------------------------------- */}
      <div className="toast-wrap" role="status" aria-live="polite">
        <div className={`toast ${toastMessage ? 'show' : ''}`}>
          <Check />
          <span>{toastMessage}</span>
        </div>
      </div>
    </div>
  );
};
