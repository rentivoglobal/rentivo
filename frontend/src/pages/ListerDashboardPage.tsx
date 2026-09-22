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
  LayoutGrid
} from 'lucide-react';
import '../styles/lister.css';
import { Listing } from '../types';
import { formatNaira, formatPriceWithPeriod } from '../utils/formatters';
import { listingsService } from '../services/listingsService';
import { requestsService } from '../services/requestsService';
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
  forcedTab?: 'home' | 'listings' | 'inquiries' | 'verification' | 'profile' | 'stats';
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
  const { user } = useAuth();
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
              onClick={() => setActiveTab('home')}
            >
              <Home />
              <span>Home</span>
            </button>

            <button
              type="button"
              className={`lister-tab ${activeTab === 'listings' ? 'active' : ''}`}
              aria-current={activeTab === 'listings' ? 'page' : undefined}
              onClick={() => setActiveTab('listings')}
            >
              <LayoutGrid />
              <span>Listings</span>
            </button>

            <button
              type="button"
              className={`lister-tab ${activeTab === 'inquiries' ? 'active' : ''}`}
              aria-current={activeTab === 'inquiries' ? 'page' : undefined}
              onClick={() => setActiveTab('inquiries')}
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
              onClick={() => setActiveTab('verification')}
            >
              <ShieldCheck />
              <span>Verification</span>
            </button>

            <button
              type="button"
              className={`lister-tab ${activeTab === 'profile' ? 'active' : ''}`}
              aria-current={activeTab === 'profile' ? 'page' : undefined}
              onClick={() => {
                if (onNavigateToProfile) onNavigateToProfile();
                else setActiveTab('profile');
              }}
            >
              <User />
              <span>Profile</span>
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
                      return (
                        <div key={r.id} className="req-card">
                          <div className="req-top">
                            <div>
                              <div className="req-tenant">
                                {r.renterName}
                                {r.renterType === 'business' && (
                                  <span className="pill pill-muted" style={{ marginLeft: 8, fontSize: '0.75rem' }}>
                                    Business
                                  </span>
                                )}
                              </div>
                              <div className="req-for">
                                Wants access to <strong style={{ color: 'var(--ink)' }}>{r.listingTitle}</strong>
                              </div>
                            </div>
                            <span
                              className="timer-chip"
                              style={isEscalated ? { color: 'var(--bad)', background: 'var(--bad-bg)' } : undefined}
                            >
                              <Clock /> {r.since || 'Just now'}
                            </span>
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
                      Once you confirm, the renter pays a flat ₦5,000 access fee and{' '}
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
                Confirm property availability within 30 minutes so prospective renters can proceed to pay the ₦5,000 verified access fee.
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
                    return (
                      <tr key={inq.id} style={{ borderBottom: '1px solid var(--line)' }}>
                        <td style={{ padding: '14px 18px' }}>
                          <strong style={{ color: 'var(--ink)', display: 'block' }}>{inq.renterName}</strong>
                          <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--ink-2)' }}>
                            {inq.submittedAt} · {inq.renterType === 'business' ? 'Business tenant' : 'Residential'}
                          </span>
                        </td>
                        <td style={{ padding: '14px 16px', fontWeight: 600, color: 'var(--ink)' }}>
                          {inq.listingTitle}
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
          TAB 5: PROFILE TAB (LANDLORD CREDENTIALS & ACCOUNT SUMMARY)
         ------------------------------------------------------------- */}
      {activeTab === 'profile' && (
        <main className="lister-page">
          <div className="lister-page-head">
            <div>
              <h1 className="lister-page-title">Profile & Credentials</h1>
              <p className="lister-page-sub">
                Manage your landlord identity, contact preferences, and portfolio verification accreditation.
              </p>
            </div>
          </div>

          <div className="panel" style={{ maxWidth: 640 }}>
            <div className="member-card" style={{ marginBottom: 20 }}>
              <span className="profile-avatar" style={{ width: 64, height: 64, fontSize: '1.5rem' }}>
                {listerInitials}
              </span>
              <div className="member-meta">
                <strong style={{ fontSize: '1.2rem' }}>{listerName}</strong>
                <span>{listerRole} · {user?.email || 'lister@rentivo.ng'}</span>
                <span style={{ color: 'var(--ok)', fontWeight: 600, fontSize: 'var(--fs-sm)', marginTop: 4 }}>
                  Verified Landlord Account
                </span>
              </div>
            </div>

            <div style={{ borderTop: '1px solid var(--line)', paddingTop: 16, display: 'grid', gap: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--fs-base)' }}>
                <span style={{ color: 'var(--ink-2)' }}>Registered Phone:</span>
                <strong>+234 803 452 8819</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--fs-base)' }}>
                <span style={{ color: 'var(--ink-2)' }}>Preferred Notification:</span>
                <strong>WhatsApp & SMS</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--fs-base)' }}>
                <span style={{ color: 'var(--ink-2)' }}>Operating City:</span>
                <strong>Ibadan, Oyo State</strong>
              </div>
            </div>

            <div style={{ marginTop: 24, display: 'flex', gap: 10 }}>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => {
                  if (onNavigateToProfile) onNavigateToProfile();
                }}
              >
                Edit full profile
              </button>
              {onSignOut && (
                <button
                  type="button"
                  className="btn btn-danger-quiet"
                  style={{ border: '1px solid var(--bad-solid)' }}
                  onClick={onSignOut}
                >
                  Sign out
                </button>
              )}
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
