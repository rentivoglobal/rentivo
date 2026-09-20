import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Building2,
  ShieldCheck,
  Clock,
  CheckCircle2,
  Plus,
  ArrowRight,
  Phone,
  Mail,
  Check,
  X,
  Eye,
  Search,
  Pencil,
  Trash2,
  BarChart3,
  ExternalLink,
  PlusCircle,
  DollarSign,
  Zap,
  ChevronDown,
  Filter,
  SlidersHorizontal,
  TrendingUp,
  Users,
  MapPin,
  Calendar,
  AlertCircle,
  Sparkles,
  Percent,
  CheckSquare,
  Square,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  List,
  Copy,
  AlertTriangle,
  User,
  LogOut,
  Compass
} from 'lucide-react';
import { Listing } from '../types';
import { formatNaira } from '../utils/formatters';
import { listingsService } from '../services/listingsService';
import { requestsService } from '../services/requestsService';
import { Sheet, OnboardingWidget } from '../components/ui';
import { useAuth } from '../contexts/AuthContext';

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
  forcedTab?: 'listings' | 'inquiries' | 'stats';
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
  status: 'needs_response' | 'confirmed' | 'payment_pending' | 'paid' | 'unavailable';
  submittedAt: string;
  minutesRemaining?: number;
}

const SAMPLE_FALLBACK_PHOTO = 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=800&q=80';

export const ListerDashboardPage: React.FC<ListerDashboardPageProps> = ({
  onListingCreated,
  listings: propListings,
  onSwitchRole,
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
  const listerName = user?.name || 'Rentivo Lister';
  const listerInitials = listerName.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase();
  const [activeTab, setActiveTab] = useState<'listings' | 'inquiries' | 'stats'>(forcedTab || 'listings');
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
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

  // Local listings state synced with listingsService
  const [dashboardListings, setDashboardListings] = useState<Listing[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'live' | 'pending' | 'occupied'>('all');
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const statusDropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Pagination, View Mode & Listing Removal States
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [deleteModalListing, setDeleteModalListing] = useState<Listing | null>(null);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  const tableTopRef = useRef<HTMLDivElement>(null);

  // Inquiries State
  const [inquiries, setInquiries] = useState<ListerInquiry[]>([]);
  const [selectedInquiry, setSelectedInquiry] = useState<ListerInquiry | null>(null);
  const [isInquiryDrawerOpen, setIsInquiryDrawerOpen] = useState(false);

  useEffect(() => {
    if (forcedTab) setActiveTab(forcedTab);
  }, [forcedTab]);

  useEffect(() => {
    void requestsService.getAllRequests().then((rows) => {
      setInquiries(rows.map((r) => ({
        id: r.id,
        listingId: r.listingId,
        listingTitle: r.listingTitle,
        listingArea: r.listingArea,
        listingPhoto: r.listingPhoto,
        listingPrice: r.listingPrice,
        renterName: r.renterName,
        renterInitials: r.renterName.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase(),
        renterEmail: r.renterEmail,
        renterPhone: r.renterPhone,
        status: r.status === 'availability_pending' || r.status === 'submitted' || r.status === 'manual_escalation' ? 'needs_response' : r.status as ListerInquiry['status'],
        submittedAt: new Date(r.createdAt).toLocaleString()
      })));
    });
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(e.target as Node)) {
        setStatusDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard shortcut Ctrl+K / Cmd+K to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Load listings from prop or service
  useEffect(() => {
    if (propListings && propListings.length > 0) {
      setDashboardListings(propListings);
    } else {
      listingsService.getListings().then(items => {
        setDashboardListings(items);
      });
    }
  }, [propListings]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Status counts
  const statusCounts = useMemo(() => {
    const live = dashboardListings.filter(l => l.isAvailable && l.verificationStatus !== 'rejected').length;
    const pending = dashboardListings.filter(l => l.verificationStatus === 'pending').length;
    const occupied = dashboardListings.filter(l => !l.isAvailable).length;
    return { all: dashboardListings.length, live, pending, occupied };
  }, [dashboardListings]);

  // Filter listings based on Spotahome "Quick find" search query and status filter
  const filteredListings = useMemo(() => {
    return dashboardListings.filter(l => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q ||
        l.title.toLowerCase().includes(q) ||
        l.id.toLowerCase().includes(q) ||
        l.area.toLowerCase().includes(q) ||
        l.type.toLowerCase().includes(q) ||
        l.addressDescription?.toLowerCase().includes(q);

      if (!matchesSearch) return false;

      if (statusFilter === 'live') {
        return l.isAvailable && l.verificationStatus !== 'rejected';
      }
      if (statusFilter === 'pending') {
        return l.verificationStatus === 'pending';
      }
      if (statusFilter === 'occupied') {
        return !l.isAvailable;
      }
      return true;
    });
  }, [dashboardListings, searchQuery, statusFilter]);

  // Reset to page 1 whenever search, filter, or page size changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, pageSize]);

  // Scalable pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredListings.length / pageSize));

  const paginatedListings = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredListings.slice(start, start + pageSize);
  }, [filteredListings, currentPage, pageSize]);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
      tableTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Handle select all checkbox on current page or filtered
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(filteredListings.map(l => l.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleToggleSelectRow = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  // Bulk actions
  const handleBulkToggleAvailability = async (makeAvailable: boolean) => {
    if (selectedIds.length === 0) return;
    for (const id of selectedIds) {
      await listingsService.updateListing(id, { isAvailable: makeAvailable });
    }
    const refreshed = await listingsService.getListings();
    setDashboardListings(refreshed);
    showToast(`Marked ${selectedIds.length} properties as ${makeAvailable ? 'Available' : 'Occupied'}.`);
    if (onListingCreated) onListingCreated();
  };

  // Modern In-App Listing Deletion (Single & Bulk)
  const handleOpenDeleteSingle = (listing: Listing, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteModalListing(listing);
  };

  const confirmDeleteSingle = async () => {
    if (!deleteModalListing) return;
    const { id, title } = deleteModalListing;
    const success = await listingsService.deleteListing(id);
    if (success) {
      setDashboardListings(prev => prev.filter(item => item.id !== id));
      setSelectedIds(prev => prev.filter(selected => selected !== id));
      showToast(`Listing "${title}" removed from your portfolio.`);
      if (onListingCreated) onListingCreated();
    }
    setDeleteModalListing(null);
  };

  const handleOpenBulkDelete = () => {
    if (selectedIds.length === 0) return;
    setIsBulkDeleteModalOpen(true);
  };

  const confirmBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    const count = selectedIds.length;
    for (const id of selectedIds) {
      await listingsService.deleteListing(id);
    }
    const refreshed = await listingsService.getListings();
    setDashboardListings(refreshed);
    setSelectedIds([]);
    showToast(`Successfully removed ${count} listings from your portfolio.`);
    if (onListingCreated) onListingCreated();
    setIsBulkDeleteModalOpen(false);
  };

  // Quick Share Listing Link
  const handleCopyShareLink = (listing: Listing, e: React.MouseEvent) => {
    e.stopPropagation();
    const url = `${window.location.origin}/listings/${listing.id}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url).then(() => {
        showToast(`Marketplace link for "${listing.title}" copied to clipboard!`);
      }).catch(() => {
        showToast(`Listing ID: ${listing.id}`);
      });
    } else {
      showToast(`Listing ID: ${listing.id}`);
    }
  };

  // Trigger dedicated page for Create Listing
  const handleTriggerCreate = () => {
    if (onOpenCreateListing) {
      onOpenCreateListing();
    }
  };

  // Trigger dedicated page for Edit Listing
  const handleTriggerEdit = (listing: Listing) => {
    if (onOpenEditListing) {
      onOpenEditListing(listing);
    }
  };

  // Top toolbar edit button
  const handleToolbarEdit = () => {
    if (selectedIds.length > 0) {
      const target = dashboardListings.find(l => l.id === selectedIds[0]);
      if (target) {
        handleTriggerEdit(target);
        return;
      }
    }
    if (filteredListings.length > 0) {
      handleTriggerEdit(filteredListings[0]);
    } else {
      handleTriggerCreate();
    }
  };

  // Toggle availability from table row or grid card
  const handleToggleAvailability = async (listing: Listing, e: React.MouseEvent) => {
    e.stopPropagation();
    const nextStatus = !listing.isAvailable;
    const updated = await listingsService.updateListing(listing.id, { isAvailable: nextStatus });
    if (updated) {
      setDashboardListings(prev => prev.map(item => item.id === listing.id ? updated : item));
      showToast(nextStatus ? `Listing marked as Available Now.` : `Listing marked as Occupied.`);
      if (onListingCreated) onListingCreated();
    }
  };

  // Request Physical Inspection (FR-1.6 & FR-1.7)
  const handleRequestInspection = async (item: Listing, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const updated = await listingsService.updateListing(item.id, { verificationStatus: 'pending' });
    if (updated) {
      setDashboardListings(prev => prev.map(l => l.id === item.id ? updated : l));
      showToast(`Physical inspection requested for "${item.title}". Rentivo field inspector assigned.`);
      if (onListingCreated) onListingCreated();
    }
  };

  // Inquiry confirmation actions
  const handleOpenInquiry = (inquiry: ListerInquiry) => {
    setSelectedInquiry(inquiry);
    setIsInquiryDrawerOpen(true);
  };

  const handleConfirmAvailability = async (inquiryId: string, isAvailable: boolean) => {
    await requestsService.respond(inquiryId, isAvailable ? 'YES' : 'NO');
    setInquiries(prev => prev.map(item => {
      if (item.id === inquiryId) {
        return {
          ...item,
          status: isAvailable ? 'confirmed' : 'unavailable',
          minutesRemaining: undefined
        };
      }
      return item;
    }));

    setIsInquiryDrawerOpen(false);
    if (isAvailable) {
      showToast('Confirmed available. Renter notified to complete access fee payment.');
    } else {
      showToast('Marked as unavailable. Renter notified at zero charge.');
    }
  };

  const urgentInquiry = inquiries.find(inq => inq.status === 'needs_response');

  // Status Filter Options for custom dropdown
  const statusOptions = [
    { value: 'all', label: 'All Statuses', dotColor: '#64748B', count: statusCounts.all },
    { value: 'live', label: 'Live & Available', dotColor: '#16794A', count: statusCounts.live },
    { value: 'pending', label: 'Inspection Pending', dotColor: '#B45309', count: statusCounts.pending },
    { value: 'occupied', label: 'Rented / Occupied', dotColor: '#DC2626', count: statusCounts.occupied }
  ];

  const currentStatusOption = statusOptions.find(o => o.value === statusFilter) || statusOptions[0];

  // Onboarding steps (FR-2.1: 30-min SLA)
  const onboardingSteps = [
    {
      id: 'step-1',
      title: 'Phone & Identity Verified',
      description: 'Lister identity verified with Ibadan phone number (+234 803 ***).',
      isCompleted: true
    },
    {
      id: 'step-2',
      title: 'Post First Ibadan Property',
      description: `${dashboardListings.length} listings registered in your portfolio.`,
      isCompleted: dashboardListings.length > 0
    },
    {
      id: 'step-3',
      title: 'Schedule Free Physical Inspection',
      description: 'Earn the Rentivo Verified Badge to receive 3.4x more renter access requests.',
      isCompleted: dashboardListings.some(l => l.verificationStatus === 'verified'),
      actionText: 'Schedule Visit',
      onAction: () => {
        setActiveTab('stats');
        showToast('Viewing physical inspection status in Stats & Performance.');
      }
    },
    {
      id: 'step-4',
      title: 'Receive Direct Zero-Commission Leads',
      description: 'Confirm tenant availability within 30 minutes to maintain top marketplace ranking.',
      isCompleted: inquiries.some(i => i.status === 'paid')
    }
  ];

  return (
    <div style={{ backgroundColor: '#F8FAFC', minHeight: '100vh', color: '#1E293B', paddingBottom: '80px' }}>
      
      {/* -------------------------------------------------------------
          TOAST NOTIFICATION
         ------------------------------------------------------------- */}
      {toastMessage && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          backgroundColor: '#000052',
          color: '#FFFFFF',
          padding: '12px 20px',
          borderRadius: '8px',
          boxShadow: '0 10px 25px rgba(0, 0, 82, 0.25)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          zIndex: 9999,
          fontSize: '13px',
          fontWeight: 600
        }}>
          <CheckCircle2 size={16} color="#4ADE80" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* -------------------------------------------------------------
          TOP LANDLORD NAVIGATION HEADER (3 FOCUSED TABS)
         ------------------------------------------------------------- */}
      <header style={{
        backgroundColor: '#FFFFFF',
        borderBottom: '1px solid #E2E8F0',
        position: 'sticky',
        top: 0,
        zIndex: 50
      }}>
        <div style={{
          maxWidth: '1380px',
          margin: '0 auto',
          padding: '0 24px',
          height: '64px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          {/* Left: Brand + Navigation Tabs */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
            <div 
              style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: onNavigateToMarketplace ? 'pointer' : 'default' }}
              onClick={onNavigateToMarketplace}
              title={onNavigateToMarketplace ? "Return to Rentivo Marketplace" : undefined}
            >
              <img 
                src="/RENTIVO-lockup.svg" 
                alt="Rentivo" 
                style={{ height: '28px', width: 'auto', display: 'block' }} 
              />
              <span style={{
                backgroundColor: '#F8F3FF',
                color: '#7E22CE',
                border: '1px solid #E9D5FF',
                borderRadius: '9999px',
                padding: '2px 10px',
                fontSize: '11px',
                fontWeight: 700,
                letterSpacing: '0.02em'
              }}>
                Lister Portal
              </span>
            </div>

            {/* Navigation links (Clean 3-Tab Architecture) */}
            <nav style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <button
                type="button"
                onClick={() => setActiveTab('listings')}
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: activeTab === 'listings' ? '#F1F5F9' : 'transparent',
                  color: activeTab === 'listings' ? '#000052' : '#64748B',
                  fontWeight: activeTab === 'listings' ? 700 : 500,
                  fontSize: '13px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.15s ease'
                }}
              >
                <Building2 size={15} color={activeTab === 'listings' ? '#000052' : '#64748B'} />
                <span>Listings</span>
                <span style={{
                  backgroundColor: activeTab === 'listings' ? '#000052' : '#E2E8F0',
                  color: activeTab === 'listings' ? '#FFFFFF' : '#64748B',
                  fontSize: '11px',
                  fontWeight: 700,
                  padding: '1px 6px',
                  borderRadius: '9999px'
                }}>
                  {dashboardListings.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('inquiries')}
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: activeTab === 'inquiries' ? '#F1F5F9' : 'transparent',
                  color: activeTab === 'inquiries' ? '#000052' : '#64748B',
                  fontWeight: activeTab === 'inquiries' ? 700 : 500,
                  fontSize: '13px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  position: 'relative',
                  transition: 'all 0.15s ease'
                }}
              >
                <Clock size={15} color={activeTab === 'inquiries' ? '#000052' : '#64748B'} />
                <span>Bookings & Inquiries</span>
                {urgentInquiry && (
                  <span style={{
                    backgroundColor: '#B45309',
                    color: '#FFFFFF',
                    fontSize: '10px',
                    fontWeight: 700,
                    padding: '1px 6px',
                    borderRadius: '9999px',
                    marginLeft: '2px'
                  }}>
                    1 Urgent
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('stats')}
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: activeTab === 'stats' ? '#F1F5F9' : 'transparent',
                  color: activeTab === 'stats' ? '#000052' : '#64748B',
                  fontWeight: activeTab === 'stats' ? 700 : 500,
                  fontSize: '13px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.15s ease'
                }}
              >
                <BarChart3 size={15} color={activeTab === 'stats' ? '#000052' : '#64748B'} />
                <span>Stats & Performance</span>
              </button>
            </nav>
          </div>

          {/* Right: Landlord Profile info & quick actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {onOpenVerification && (
              <button
                type="button"
                onClick={onOpenVerification}
                style={{
                  backgroundColor: '#ECFDF5',
                  border: '1px solid #A7F3D0',
                  borderRadius: '9999px',
                  padding: '5px 12px',
                  fontSize: '12px',
                  fontWeight: 700,
                  color: '#065F46',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.15s ease'
                }}
                title="Schedule in-person property inspection"
              >
                <ShieldCheck size={13} color="#059669" />
                <span>Book Inspection</span>
              </button>
            )}

            {onNavigateToMarketplace && (
              <button
                type="button"
                onClick={onNavigateToMarketplace}
                style={{
                  backgroundColor: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  borderRadius: '8px',
                  padding: '6px 12px',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#334155',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.15s ease'
                }}
                title="Browse public marketplace as a seeker"
              >
                <Compass size={13} color="#475569" />
                <span>Browse as Seeker</span>
              </button>
            )}

            {/* Authenticated Lister Profile Dropdown Menu */}
            <div style={{ position: 'relative' }} ref={userDropdownRef}>
              <button
                type="button"
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                style={{
                  backgroundColor: userDropdownOpen ? '#F1F5F9' : '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  borderRadius: '9999px',
                  padding: '4px 10px 4px 5px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  transition: 'background-color 0.15s ease'
                }}
              >
                <div style={{
                  width: '30px',
                  height: '30px',
                  borderRadius: '50%',
                  backgroundColor: '#000052',
                  color: '#FFFFFF',
                  fontWeight: 700,
                  fontSize: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden'
                }}>
                  {user?.avatarUrl ? (
                    <img src={user.avatarUrl} alt={listerName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    listerInitials
                  )}
                </div>
                <div style={{ textAlign: 'left', lineHeight: 1.15 }}>
                  <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#000052', maxWidth: '110px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {listerName}
                  </div>
                  <div style={{ fontSize: '10px', fontWeight: 600, color: '#16794A', display: 'flex', alignItems: 'center', gap: '3px' }}>
                    <ShieldCheck size={10} color="#16794A" />
                    <span>Verified</span>
                  </div>
                </div>
                <ChevronDown size={12} color="#64748B" />
              </button>

              {userDropdownOpen && (
                <div
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 8px)',
                    right: 0,
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #E6E3EE',
                    borderRadius: '14px',
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
                    <div style={{ fontSize: '13px', fontWeight: 800, color: '#000052' }}>{listerName}</div>
                    <div style={{ fontSize: '11px', color: '#636377' }}>{user?.email || 'landlord@rentivo.ng'}</div>
                  </div>

                  {onNavigateToProfile && (
                    <button
                      type="button"
                      onClick={() => { setUserDropdownOpen(false); onNavigateToProfile(); }}
                      style={{
                        textAlign: 'left',
                        padding: '9px 12px',
                        borderRadius: '8px',
                        border: 'none',
                        background: 'none',
                        color: '#000052',
                        fontSize: '12.5px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}
                    >
                      <User size={14} color="#000052" />
                      <span>Account Profile &amp; Settings</span>
                    </button>
                  )}

                  {onOpenVerification && (
                    <button
                      type="button"
                      onClick={() => { setUserDropdownOpen(false); onOpenVerification(); }}
                      style={{
                        textAlign: 'left',
                        padding: '9px 12px',
                        borderRadius: '8px',
                        border: 'none',
                        background: 'none',
                        color: '#000052',
                        fontSize: '12.5px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}
                    >
                      <ShieldCheck size={14} color="#059669" />
                      <span>Inspection Hub</span>
                    </button>
                  )}

                  {onNavigateToMarketplace && (
                    <button
                      type="button"
                      onClick={() => { setUserDropdownOpen(false); onNavigateToMarketplace(); }}
                      style={{
                        textAlign: 'left',
                        padding: '9px 12px',
                        borderRadius: '8px',
                        border: 'none',
                        background: 'none',
                        color: '#000052',
                        fontSize: '12.5px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}
                    >
                      <Compass size={14} color="#000052" />
                      <span>Browse as Seeker</span>
                    </button>
                  )}

                  {onSignOut && (
                    <div style={{ borderTop: '1px solid #F1F5F9', marginTop: '4px', paddingTop: '4px' }}>
                      <button
                        type="button"
                        onClick={() => { setUserDropdownOpen(false); onSignOut(); }}
                        style={{
                          width: '100%',
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
            </div>
          </div>
        </div>
      </header>

      {/* -------------------------------------------------------------
          MAIN CONTENT AREA
         ------------------------------------------------------------- */}
      <main style={{ maxWidth: '1380px', margin: '0 auto', padding: '28px 24px' }}>

        {/* URGENT NOTIFICATION BANNER IF REQUESTS PENDING */}
        {urgentInquiry && activeTab !== 'inquiries' && (
          <div style={{
            backgroundColor: '#FEF3C7',
            border: '1px solid #FDE68A',
            borderRadius: '10px',
            padding: '14px 20px',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Clock size={18} color="#B45309" />
              <div>
                <span style={{ fontWeight: 700, fontSize: '13px', color: '#92400E' }}>
                  Action Needed: {urgentInquiry.renterName} requested access for "{urgentInquiry.listingTitle}"
                </span>
                <span style={{ fontSize: '12px', color: '#B45309', marginLeft: '8px' }}>
                  ({urgentInquiry.minutesRemaining} mins remaining to maintain 100% response rating)
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setActiveTab('inquiries');
                handleOpenInquiry(urgentInquiry);
              }}
              style={{
                backgroundColor: '#B45309',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '6px',
                padding: '6px 14px',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <span>Confirm Availability</span>
              <ArrowRight size={13} />
            </button>
          </div>
        )}

        {/* =============================================================
            TAB 1: SPOTAHOME LISTINGS TAB
           ============================================================= */}
        {activeTab === 'listings' && (
          <div>
            {/* INTERACTIVE PORTFOLIO QUICK FILTER CHIPS */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '20px',
              flexWrap: 'wrap'
            }}>
              {[
                { id: 'all', label: 'All Portfolio', count: dashboardListings.length },
                { id: 'live', label: 'Live & Available', count: statusCounts.live, dotColor: '#10B981' },
                { id: 'occupied', label: 'Occupied / Rented', count: statusCounts.occupied, dotColor: '#94A3B8' },
                { id: 'pending', label: 'Pending Inspection', count: statusCounts.pending, dotColor: '#F59E0B' }
              ].map(chip => {
                const isActive = statusFilter === chip.id;
                return (
                  <button
                    key={chip.id}
                    type="button"
                    onClick={() => setStatusFilter(chip.id as any)}
                    style={{
                      padding: '7px 14px',
                      borderRadius: '999px',
                      border: isActive ? '1.5px solid #000052' : '1px solid #E2E8F0',
                      backgroundColor: isActive ? '#000052' : '#FFFFFF',
                      color: isActive ? '#FFFFFF' : '#334155',
                      fontSize: '12.5px',
                      fontWeight: 700,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      boxShadow: isActive ? '0 2px 6px rgba(0,0,82,0.15)' : '0 1px 2px rgba(0,0,0,0.02)'
                    }}
                  >
                    {chip.dotColor && (
                      <span style={{
                        width: '7px',
                        height: '7px',
                        borderRadius: '50%',
                        backgroundColor: isActive ? '#FFFFFF' : chip.dotColor
                      }} />
                    )}
                    <span>{chip.label}</span>
                    <span style={{
                      backgroundColor: isActive ? 'rgba(255,255,255,0.22)' : '#F1F5F9',
                      color: isActive ? '#FFFFFF' : '#475569',
                      fontSize: '11px',
                      fontWeight: 800,
                      padding: '1px 6px',
                      borderRadius: '999px'
                    }}>
                      {chip.count}
                    </span>
                  </button>
                );
              })}
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '999px',
                    border: '1px dashed #CBD5E1',
                    backgroundColor: '#F8FAFC',
                    color: '#64748B',
                    fontSize: '12px',
                    fontWeight: 600,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    cursor: 'pointer'
                  }}
                >
                  <X size={12} />
                  <span>Clear Search: "{searchQuery}"</span>
                </button>
              )}
            </div>

            {/* SUB-HEADER TOOLBAR (UPGRADED EXECUTIVE DESIGN) */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '16px',
              flexWrap: 'wrap',
              gap: '16px'
            }}>
              {/* Left: Heading with count & badge */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <h1 style={{
                    fontSize: '24px',
                    fontWeight: 800,
                    color: '#000052',
                    margin: 0,
                    letterSpacing: '-0.02em'
                  }}>
                    {dashboardListings.length} Listings
                  </h1>
                  <span style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    color: '#065F46',
                    backgroundColor: '#ECFDF5',
                    border: '1px solid #A7F3D0',
                    padding: '2px 8px',
                    borderRadius: '9999px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10B981' }} />
                    <span>Ibadan Portfolio</span>
                  </span>
                </div>
                <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#64748B' }}>
                  Manage availability, pricing, photos, and live verification status for your properties.
                </p>
              </div>

              {/* Right: Actions Toolbar with Harmonized 40px Height */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                
                {/* 1. UPGRADED QUICK FIND SEARCH BAR */}
                <div style={{ position: 'relative', width: '280px' }}>
                  <Search
                    size={15}
                    color="#64748B"
                    style={{
                      position: 'absolute',
                      left: '13px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      pointerEvents: 'none'
                    }}
                  />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Quick find by title, area, REF..."
                    style={{
                      width: '100%',
                      height: '40px',
                      padding: '0 38px 0 38px',
                      backgroundColor: '#FFFFFF',
                      border: '1.5px solid #CBD5E1',
                      borderRadius: '8px',
                      fontSize: '13px',
                      fontWeight: 500,
                      color: '#000052',
                      outline: 'none',
                      boxSizing: 'border-box',
                      transition: 'border-color 0.15s ease, box-shadow 0.15s ease'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#000052';
                      e.target.style.boxShadow = '0 0 0 3px rgba(0, 0, 82, 0.08)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#CBD5E1';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                  {searchQuery ? (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      title="Clear search"
                      style={{
                        position: 'absolute',
                        right: '10px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: '#F1F5F9',
                        border: 'none',
                        borderRadius: '4px',
                        color: '#64748B',
                        cursor: 'pointer',
                        padding: '3px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <X size={12} />
                    </button>
                  ) : (
                    <span style={{
                      position: 'absolute',
                      right: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      fontSize: '10px',
                      fontWeight: 700,
                      color: '#94A3B8',
                      backgroundColor: '#F1F5F9',
                      padding: '2px 5px',
                      borderRadius: '4px',
                      border: '1px solid #E2E8F0',
                      pointerEvents: 'none'
                    }}>
                      Ctrl K
                    </span>
                  )}
                </div>

                {/* 2. BESPOKE CUSTOM STATUS FILTER DROPDOWN */}
                <div ref={statusDropdownRef} style={{ position: 'relative' }}>
                  <button
                    type="button"
                    onClick={() => setStatusDropdownOpen(!statusDropdownOpen)}
                    style={{
                      height: '40px',
                      padding: '0 14px',
                      backgroundColor: statusDropdownOpen ? '#F8FAFC' : '#FFFFFF',
                      border: statusDropdownOpen ? '1.5px solid #000052' : '1.5px solid #CBD5E1',
                      borderRadius: '8px',
                      fontSize: '13px',
                      fontWeight: 600,
                      color: '#1E293B',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      transition: 'all 0.15s ease',
                      boxShadow: statusDropdownOpen ? '0 0 0 3px rgba(0, 0, 82, 0.08)' : 'none'
                    }}
                  >
                    <span style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      backgroundColor: currentStatusOption.dotColor
                    }} />
                    <span>{currentStatusOption.label}</span>
                    <span style={{
                      backgroundColor: '#F1F5F9',
                      color: '#475569',
                      fontSize: '11px',
                      fontWeight: 700,
                      padding: '1px 6px',
                      borderRadius: '9999px'
                    }}>
                      {currentStatusOption.count}
                    </span>
                    <ChevronDown
                      size={14}
                      color="#64748B"
                      style={{
                        transform: statusDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                        transition: 'transform 0.15s ease'
                      }}
                    />
                  </button>

                  {/* Dropdown Popover Menu */}
                  {statusDropdownOpen && (
                    <div style={{
                      position: 'absolute',
                      top: 'calc(100% + 6px)',
                      left: 0,
                      minWidth: '220px',
                      backgroundColor: '#FFFFFF',
                      borderRadius: '10px',
                      border: '1px solid #E2E8F0',
                      boxShadow: '0 10px 25px -3px rgba(0, 0, 82, 0.12), 0 4px 6px -2px rgba(0, 0, 82, 0.04)',
                      padding: '6px',
                      zIndex: 100
                    }}>
                      <div style={{
                        padding: '6px 10px 4px',
                        fontSize: '10px',
                        fontWeight: 800,
                        color: '#94A3B8',
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em'
                      }}>
                        Filter by Status
                      </div>
                      {statusOptions.map(option => {
                        const isSelected = statusFilter === option.value;
                        return (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => {
                              setStatusFilter(option.value as any);
                              setStatusDropdownOpen(false);
                            }}
                            style={{
                              width: '100%',
                              padding: '8px 10px',
                              borderRadius: '6px',
                              border: 'none',
                              backgroundColor: isSelected ? '#EFF6FF' : 'transparent',
                              color: isSelected ? '#000052' : '#334155',
                              fontSize: '13px',
                              fontWeight: isSelected ? 700 : 500,
                              textAlign: 'left',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              transition: 'background-color 0.1s ease'
                            }}
                            onMouseEnter={(e) => {
                              if (!isSelected) e.currentTarget.style.backgroundColor = '#F8FAFC';
                            }}
                            onMouseLeave={(e) => {
                              if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{
                                width: '7px',
                                height: '7px',
                                borderRadius: '50%',
                                backgroundColor: option.dotColor
                              }} />
                              <span>{option.label}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{
                                fontSize: '11px',
                                fontWeight: 700,
                                color: isSelected ? '#000052' : '#94A3B8'
                              }}>
                                {option.count}
                              </span>
                              {isSelected && <Check size={13} color="#000052" />}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* 2.5 VIEW MODE SWITCHER (Table vs Grid) */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  backgroundColor: '#F1F5F9',
                  padding: '3px',
                  borderRadius: '8px',
                  border: '1.5px solid #CBD5E1',
                  height: '40px',
                  boxSizing: 'border-box'
                }}>
                  <button
                    type="button"
                    onClick={() => setViewMode('table')}
                    title="Compact Table View"
                    style={{
                      height: '32px',
                      padding: '0 10px',
                      borderRadius: '6px',
                      border: 'none',
                      backgroundColor: viewMode === 'table' ? '#FFFFFF' : 'transparent',
                      color: viewMode === 'table' ? '#000052' : '#64748B',
                      boxShadow: viewMode === 'table' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      fontSize: '12.5px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <List size={14} color={viewMode === 'table' ? '#000052' : '#64748B'} />
                    <span>Table</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('grid')}
                    title="Visual Card Grid View"
                    style={{
                      height: '32px',
                      padding: '0 10px',
                      borderRadius: '6px',
                      border: 'none',
                      backgroundColor: viewMode === 'grid' ? '#FFFFFF' : 'transparent',
                      color: viewMode === 'grid' ? '#000052' : '#64748B',
                      boxShadow: viewMode === 'grid' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      fontSize: '12.5px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <LayoutGrid size={14} color={viewMode === 'grid' ? '#000052' : '#64748B'} />
                    <span>Cards</span>
                  </button>
                </div>

                {/* 3. SPOTAHOME OUTLINE [ EDIT ] BUTTON */}
                <button
                  type="button"
                  onClick={handleToolbarEdit}
                  title="Open dedicated editor page for selected property"
                  style={{
                    height: '40px',
                    backgroundColor: '#FFFFFF',
                    border: '1.5px solid #CBD5E1',
                    color: '#000052',
                    padding: '0 16px',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#000052'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#CBD5E1'; }}
                >
                  <Pencil size={14} color="#000052" />
                  <span>Edit</span>
                  {selectedIds.length > 0 && (
                    <span style={{
                      backgroundColor: '#000052',
                      color: '#FFFFFF',
                      fontSize: '10px',
                      padding: '1px 5px',
                      borderRadius: '4px'
                    }}>
                      {selectedIds.length}
                    </span>
                  )}
                </button>

                {/* 4. SPOTAHOME PRIMARY [ + ADD A LISTING ] BUTTON */}
                <button
                  type="button"
                  onClick={handleTriggerCreate}
                  style={{
                    height: '40px',
                    backgroundColor: '#000052',
                    border: 'none',
                    color: '#FFFFFF',
                    padding: '0 20px',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    cursor: 'pointer',
                    boxShadow: '0 2px 6px rgba(0, 0, 82, 0.15)',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#00007A'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#000052'; }}
                >
                  <PlusCircle size={15} color="#FFFFFF" />
                  <span>+ Add a listing</span>
                </button>
              </div>
            </div>

            {/* BULK ACTION BAR (Visible when 1+ rows selected) */}
            {selectedIds.length > 0 && (
              <div style={{
                backgroundColor: '#EFF6FF',
                border: '1.5px solid #BFDBFE',
                borderRadius: '8px',
                padding: '10px 18px',
                marginBottom: '14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#1E40AF', fontWeight: 700 }}>
                  <CheckSquare size={16} color="#1D4ED8" />
                  <span>{selectedIds.length} properties selected</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => handleBulkToggleAvailability(true)}
                    style={{
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #93C5FD',
                      borderRadius: '6px',
                      padding: '5px 12px',
                      fontSize: '12px',
                      fontWeight: 700,
                      color: '#16794A',
                      cursor: 'pointer'
                    }}
                  >
                    Mark Available
                  </button>
                  <button
                    type="button"
                    onClick={() => handleBulkToggleAvailability(false)}
                    style={{
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #93C5FD',
                      borderRadius: '6px',
                      padding: '5px 12px',
                      fontSize: '12px',
                      fontWeight: 700,
                      color: '#DC2626',
                      cursor: 'pointer'
                    }}
                  >
                    Mark Rented
                  </button>
                  <button
                    type="button"
                    onClick={handleOpenBulkDelete}
                    style={{
                      backgroundColor: '#FEF2F2',
                      border: '1px solid #FECACA',
                      borderRadius: '6px',
                      padding: '5px 12px',
                      fontSize: '12px',
                      fontWeight: 700,
                      color: '#DC2626',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      cursor: 'pointer'
                    }}
                  >
                    <Trash2 size={13} color="#DC2626" />
                    <span>Remove Selected ({selectedIds.length})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedIds([])}
                    style={{
                      backgroundColor: 'transparent',
                      border: 'none',
                      fontSize: '12px',
                      fontWeight: 600,
                      color: '#1E40AF',
                      cursor: 'pointer',
                      textDecoration: 'underline'
                    }}
                  >
                    Deselect All
                  </button>
                </div>
              </div>
            )}

            {/* Scroll Anchor */}
            <div ref={tableTopRef} />

            {/* -------------------------------------------------------------
                MAIN VIEW: TABLE VIEW OR GRID CARD VIEW
               ------------------------------------------------------------- */}
            {viewMode === 'table' ? (
              <div style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '10px',
                border: '1px solid #E2E8F0',
                overflow: 'hidden',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)'
              }}>
                <div className="no-scrollbar" style={{ width: '100%', overflowX: 'auto', scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                  <table style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    textAlign: 'left',
                    fontSize: '13px'
                  }}>
                    <thead>
                      <tr style={{
                        backgroundColor: '#F8FAFC',
                        borderBottom: '1px solid #E2E8F0',
                        color: '#64748B',
                        fontSize: '11px',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em'
                      }}>
                        {/* 1. Selection */}
                        <th style={{ width: '42px', padding: '14px 12px 14px 18px', textAlign: 'center' }}>
                          <input
                            type="checkbox"
                            checked={filteredListings.length > 0 && selectedIds.length === filteredListings.length}
                            onChange={(e) => handleSelectAll(e.target.checked)}
                            style={{ cursor: 'pointer' }}
                            title="Select all matching properties"
                          />
                        </th>
                        {/* 2. Property Dossier */}
                        <th style={{ padding: '14px 16px' }}>Property</th>
                        {/* 3. Rent Price */}
                        <th style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>Rent Price</th>
                        {/* 4. Availability */}
                        <th style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>Availability</th>
                        {/* 5. Verification */}
                        <th style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>Verification</th>
                        {/* 6. Inquiries */}
                        <th style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>Inquiries</th>
                        {/* 7. Actions */}
                        <th style={{ padding: '14px 20px 14px 16px', textAlign: 'right', whiteSpace: 'nowrap' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredListings.length === 0 ? (
                        <tr>
                          <td colSpan={7} style={{ padding: '60px 24px', textAlign: 'center' }}>
                            <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                              <Building2 size={38} color="#94A3B8" />
                              <div style={{ fontSize: '16px', fontWeight: 800, color: '#000052' }}>
                                No listings match your search or filter
                              </div>
                              <div style={{ fontSize: '13px', color: '#64748B', maxWidth: '380px' }}>
                                {searchQuery ? `No listings matching "${searchQuery}".` : 'No listings currently under this status filter.'}
                              </div>
                              <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                                {(searchQuery || statusFilter !== 'all') && (
                                  <button
                                    type="button"
                                    onClick={() => { setSearchQuery(''); setStatusFilter('all'); }}
                                    style={{
                                      backgroundColor: '#FFFFFF',
                                      color: '#000052',
                                      border: '1.5px solid #CBD5E1',
                                      borderRadius: '6px',
                                      padding: '8px 14px',
                                      fontSize: '12px',
                                      fontWeight: 700,
                                      cursor: 'pointer'
                                    }}
                                  >
                                    Reset Filters
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={handleTriggerCreate}
                                  style={{
                                    backgroundColor: '#000052',
                                    color: '#FFFFFF',
                                    border: 'none',
                                    borderRadius: '6px',
                                    padding: '8px 16px',
                                    fontSize: '12px',
                                    fontWeight: 700,
                                    cursor: 'pointer'
                                  }}
                                >
                                  + Add a listing
                                </button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        paginatedListings.map(item => {
                          const isSelected = selectedIds.includes(item.id);
                          const isVerified = item.verificationStatus === 'verified';
                          const inquiryCount = item.accessRequestsCount !== undefined ? item.accessRequestsCount : (inquiries.filter(i => i.listingId === item.id).length || 1);

                          return (
                            <tr
                              key={item.id}
                              style={{
                                borderBottom: '1px solid #F1F5F9',
                                backgroundColor: isSelected ? '#EFF6FF' : '#FFFFFF',
                                transition: 'background-color 0.15s ease'
                              }}
                            >
                              {/* 1. Checkbox */}
                              <td style={{ padding: '14px 12px 14px 18px', textAlign: 'center' }}>
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => handleToggleSelectRow(item.id)}
                                  style={{ cursor: 'pointer' }}
                                />
                              </td>

                              {/* 2. Unified Property Dossier (Photo + Title + Meta) */}
                              <td style={{ padding: '12px 16px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                  <div style={{
                                    width: '46px',
                                    height: '46px',
                                    borderRadius: '8px',
                                    overflow: 'hidden',
                                    border: '1px solid #E2E8F0',
                                    backgroundColor: '#F1F5F9',
                                    flexShrink: 0
                                  }}>
                                    <img
                                      src={item.photos && item.photos[0] ? item.photos[0] : SAMPLE_FALLBACK_PHOTO}
                                      alt={item.title}
                                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                    />
                                  </div>
                                  <div style={{ minWidth: 0, flex: 1 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                      <button
                                        type="button"
                                        onClick={() => handleTriggerEdit(item)}
                                        title="Open full-page editor"
                                        style={{
                                          background: 'none',
                                          border: 'none',
                                          padding: 0,
                                          fontSize: '13.5px',
                                          fontWeight: 700,
                                          color: '#000052',
                                          textAlign: 'left',
                                          cursor: 'pointer',
                                          lineHeight: 1.3,
                                          whiteSpace: 'nowrap',
                                          overflow: 'hidden',
                                          textOverflow: 'ellipsis',
                                          maxWidth: '320px'
                                        }}
                                      >
                                        {item.title}
                                      </button>
                                      {onSelectListingToView && (
                                        <button
                                          type="button"
                                          onClick={() => onSelectListingToView(item)}
                                          title="View public details"
                                          style={{
                                            background: 'none',
                                            border: 'none',
                                            padding: 0,
                                            color: '#94A3B8',
                                            cursor: 'pointer',
                                            display: 'inline-flex'
                                          }}
                                        >
                                          <ExternalLink size={12} />
                                        </button>
                                      )}
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', color: '#64748B', marginTop: '3px', flexWrap: 'wrap' }}>
                                      <span style={{
                                        backgroundColor: '#F1F5F9',
                                        color: '#475569',
                                        fontWeight: 700,
                                        padding: '1px 5px',
                                        borderRadius: '4px'
                                      }}>
                                        {item.type}
                                      </span>
                                      <span>•</span>
                                      <span>{item.area}, Ibadan</span>
                                      <span>•</span>
                                      <span style={{ fontFamily: 'monospace', color: '#94A3B8' }}>
                                        REF-{item.id.slice(-4).toUpperCase()}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </td>

                              {/* 3. Rent Price */}
                              <td style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>
                                <div style={{ fontWeight: 800, color: '#000052', fontSize: '13.5px' }}>
                                  {formatNaira(item.price)}
                                </div>
                                <div style={{ fontSize: '11px', color: '#64748B' }}>
                                  {item.pricePeriod === 'per_year' ? 'per year' : item.pricePeriod === 'per_month' ? 'per month' : 'outright'}
                                </div>
                              </td>

                              {/* 4. 1-Click Availability Toggle */}
                              <td style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>
                                <button
                                  type="button"
                                  onClick={(e) => handleToggleAvailability(item, e)}
                                  title="Click to toggle availability"
                                  style={{
                                    backgroundColor: item.isAvailable ? '#ECFDF5' : '#F1F5F9',
                                    color: item.isAvailable ? '#065F46' : '#64748B',
                                    border: item.isAvailable ? '1px solid #A7F3D0' : '1px solid #CBD5E1',
                                    padding: '4px 10px',
                                    borderRadius: '999px',
                                    fontSize: '11.5px',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '5px',
                                    transition: 'all 0.15s ease'
                                  }}
                                >
                                  <span style={{
                                    width: '6px',
                                    height: '6px',
                                    borderRadius: '50%',
                                    backgroundColor: item.isAvailable ? '#10B981' : '#94A3B8'
                                  }} />
                                  <span>{item.isAvailable ? 'Available' : 'Occupied'}</span>
                                </button>
                              </td>

                              {/* 5. Verification Status */}
                              <td style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>
                                {isVerified ? (
                                  <div style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '5px',
                                    backgroundColor: '#ECFDF5',
                                    color: '#065F46',
                                    border: '1px solid #A7F3D0',
                                    borderRadius: '6px',
                                    padding: '3px 8px',
                                    fontSize: '11.5px',
                                    fontWeight: 700
                                  }}>
                                    <ShieldCheck size={13} color="#16794A" />
                                    <span>Emerald Verified</span>
                                  </div>
                                ) : item.verificationStatus === 'pending' ? (
                                  <div style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '5px',
                                    backgroundColor: '#FEF3C7',
                                    color: '#92400E',
                                    border: '1px solid #FDE68A',
                                    borderRadius: '6px',
                                    padding: '3px 8px',
                                    fontSize: '11.5px',
                                    fontWeight: 700
                                  }}>
                                    <Clock size={13} color="#B45309" />
                                    <span>Visit Pending</span>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={(e) => handleRequestInspection(item, e)}
                                    title="Dispatch field inspector to earn Emerald Badge"
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      backgroundColor: '#EFF6FF',
                                      color: '#1D4ED8',
                                      border: '1.5px solid #BFDBFE',
                                      borderRadius: '6px',
                                      padding: '4px 8px',
                                      fontSize: '11px',
                                      fontWeight: 700,
                                      cursor: 'pointer',
                                      transition: 'all 0.15s ease'
                                    }}
                                  >
                                    <ShieldCheck size={12} color="#1D4ED8" />
                                    <span>Request Visit</span>
                                  </button>
                                )}
                              </td>

                              {/* 6. Inquiries / Leads */}
                              <td style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>
                                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                  <span style={{
                                    backgroundColor: '#EFF6FF',
                                    color: '#1E40AF',
                                    borderRadius: '12px',
                                    padding: '2px 8px',
                                    fontSize: '12px',
                                    fontWeight: 800,
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px'
                                  }}>
                                    <MessageSquare size={12} color="#1D4ED8" />
                                    {inquiryCount}
                                  </span>
                                  <span style={{ fontSize: '11px', color: '#64748B' }}>leads</span>
                                </div>
                              </td>

                              {/* 7. Actions (Edit, Share, Remove) */}
                              <td style={{ padding: '14px 20px 14px 16px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', justifyContent: 'flex-end' }}>
                                  <button
                                    type="button"
                                    onClick={() => handleTriggerEdit(item)}
                                    title="Edit property details"
                                    style={{
                                      backgroundColor: '#FFFFFF',
                                      border: '1.5px solid #CBD5E1',
                                      borderRadius: '6px',
                                      padding: '5px 9px',
                                      fontSize: '12px',
                                      fontWeight: 700,
                                      color: '#000052',
                                      cursor: 'pointer',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      transition: 'all 0.15s ease'
                                    }}
                                  >
                                    <Pencil size={12} color="#000052" />
                                    <span>Edit</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => handleCopyShareLink(item, e)}
                                    title="Copy public marketplace link"
                                    style={{
                                      backgroundColor: '#FFFFFF',
                                      border: '1px solid #CBD5E1',
                                      borderRadius: '6px',
                                      padding: '5px 7px',
                                      color: '#64748B',
                                      cursor: 'pointer',
                                      display: 'inline-flex',
                                      alignItems: 'center'
                                    }}
                                  >
                                    <Copy size={13} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => handleOpenDeleteSingle(item, e)}
                                    title="Remove listing from portfolio"
                                    style={{
                                      backgroundColor: '#FFFFFF',
                                      border: '1px solid #CBD5E1',
                                      borderRadius: '6px',
                                      padding: '5px 7px',
                                      color: '#94A3B8',
                                      cursor: 'pointer',
                                      display: 'inline-flex',
                                      alignItems: 'center'
                                    }}
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Scalable Pagination Controls Bar */}
                <div style={{
                  padding: '14px 20px',
                  backgroundColor: '#F8FAFC',
                  borderTop: '1px solid #E2E8F0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: '12.5px',
                  color: '#64748B',
                  flexWrap: 'wrap',
                  gap: '14px'
                }}>
                  {/* Left: Results Range Counter */}
                  <div style={{ fontWeight: 500 }}>
                    Showing <strong>{filteredListings.length > 0 ? (currentPage - 1) * pageSize + 1 : 0}–{Math.min(currentPage * pageSize, filteredListings.length)}</strong> of <strong>{filteredListings.length}</strong> properties
                  </div>

                  {/* Center: Rows Per Page Selector */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '12px' }}>Rows:</span>
                    {[5, 10, 20].map(size => (
                      <button
                        key={size}
                        type="button"
                        onClick={() => setPageSize(size)}
                        style={{
                          padding: '3px 9px',
                          borderRadius: '6px',
                          border: pageSize === size ? '1.5px solid #000052' : '1px solid #CBD5E1',
                          backgroundColor: pageSize === size ? '#000052' : '#FFFFFF',
                          color: pageSize === size ? '#FFFFFF' : '#475569',
                          fontSize: '11.5px',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        {size}
                      </button>
                    ))}
                  </div>

                  {/* Right: Scalable Next / Previous & Page Number Chips */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <button
                      type="button"
                      disabled={currentPage === 1}
                      onClick={() => handlePageChange(currentPage - 1)}
                      style={{
                        padding: '5px 10px',
                        borderRadius: '6px',
                        border: '1px solid #CBD5E1',
                        backgroundColor: '#FFFFFF',
                        color: currentPage === 1 ? '#CBD5E1' : '#000052',
                        fontSize: '12px',
                        fontWeight: 600,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        cursor: currentPage === 1 ? 'not-allowed' : 'pointer'
                      }}
                    >
                      <ChevronLeft size={14} />
                      <span>Previous</span>
                    </button>

                    {/* Dynamic Page Number Chips */}
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                      .map((pageNum, idx, arr) => {
                        const prev = arr[idx - 1];
                        const showEllipsis = prev && pageNum - prev > 1;
                        return (
                          <React.Fragment key={pageNum}>
                            {showEllipsis && <span style={{ padding: '0 3px', color: '#94A3B8' }}>…</span>}
                            <button
                              type="button"
                              onClick={() => handlePageChange(pageNum)}
                              style={{
                                width: '28px',
                                height: '28px',
                                borderRadius: '6px',
                                border: currentPage === pageNum ? '1.5px solid #000052' : '1px solid #E2E8F0',
                                backgroundColor: currentPage === pageNum ? '#000052' : '#FFFFFF',
                                color: currentPage === pageNum ? '#FFFFFF' : '#475569',
                                fontSize: '12px',
                                fontWeight: 700,
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer'
                              }}
                            >
                              {pageNum}
                            </button>
                          </React.Fragment>
                        );
                      })}

                    <button
                      type="button"
                      disabled={currentPage === totalPages}
                      onClick={() => handlePageChange(currentPage + 1)}
                      style={{
                        padding: '5px 10px',
                        borderRadius: '6px',
                        border: '1px solid #CBD5E1',
                        backgroundColor: '#FFFFFF',
                        color: currentPage === totalPages ? '#CBD5E1' : '#000052',
                        fontSize: '12px',
                        fontWeight: 600,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        cursor: currentPage === totalPages ? 'not-allowed' : 'pointer'
                      }}
                    >
                      <span>Next</span>
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* GRID CARD VIEW */
              <div>
                {filteredListings.length === 0 ? (
                  <div style={{ backgroundColor: '#FFFFFF', borderRadius: '10px', border: '1px solid #E2E8F0', padding: '60px 24px', textAlign: 'center' }}>
                    <Building2 size={38} color="#94A3B8" style={{ margin: '0 auto 12px' }} />
                    <div style={{ fontSize: '16px', fontWeight: 800, color: '#000052' }}>No listings match your search or filter</div>
                    <div style={{ fontSize: '13px', color: '#64748B', marginTop: '4px' }}>Try resetting your search query or status filter.</div>
                    <button
                      type="button"
                      onClick={() => { setSearchQuery(''); setStatusFilter('all'); }}
                      style={{ marginTop: '14px', backgroundColor: '#000052', color: '#FFFFFF', padding: '8px 16px', borderRadius: '6px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
                    >
                      Reset Filters
                    </button>
                  </div>
                ) : (
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                    gap: '20px',
                    marginBottom: '20px'
                  }}>
                    {paginatedListings.map(item => {
                      const isSelected = selectedIds.includes(item.id);
                      const isVerified = item.verificationStatus === 'verified';
                      const inquiryCount = item.accessRequestsCount !== undefined ? item.accessRequestsCount : (inquiries.filter(i => i.listingId === item.id).length || 1);

                      return (
                        <div
                          key={item.id}
                          style={{
                            backgroundColor: '#FFFFFF',
                            borderRadius: '12px',
                            border: isSelected ? '2px solid #3B82F6' : '1px solid #E2E8F0',
                            overflow: 'hidden',
                            boxShadow: '0 2px 5px rgba(0,0,0,0.04)',
                            display: 'flex',
                            flexDirection: 'column',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          {/* Card Photo & Badges */}
                          <div style={{ position: 'relative', height: '170px', backgroundColor: '#F1F5F9' }}>
                            <img
                              src={item.photos && item.photos[0] ? item.photos[0] : SAMPLE_FALLBACK_PHOTO}
                              alt={item.title}
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                            {/* Checkbox overlay */}
                            <div style={{ position: 'absolute', top: '10px', left: '10px' }}>
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleToggleSelectRow(item.id)}
                                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                              />
                            </div>
                            {/* Status Pills overlay */}
                            <div style={{ position: 'absolute', top: '10px', right: '10px', display: 'flex', gap: '6px' }}>
                              {isVerified && (
                                <span style={{ backgroundColor: '#ECFDF5', color: '#065F46', border: '1px solid #A7F3D0', padding: '2px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '3px' }}>
                                  <ShieldCheck size={11} color="#16794A" /> Verified
                                </span>
                              )}
                              <span style={{ backgroundColor: item.isAvailable ? '#000052' : '#64748B', color: '#FFFFFF', padding: '2px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 700 }}>
                                {item.isAvailable ? 'Available' : 'Occupied'}
                              </span>
                            </div>
                          </div>

                          {/* Card Content */}
                          <div style={{ padding: '16px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#64748B', marginBottom: '6px' }}>
                              <span style={{ backgroundColor: '#F1F5F9', color: '#475569', fontWeight: 700, padding: '1px 5px', borderRadius: '4px' }}>{item.type}</span>
                              <span>•</span>
                              <span>{item.area}, Ibadan</span>
                              <span>•</span>
                              <span style={{ fontFamily: 'monospace' }}>REF-{item.id.slice(-4).toUpperCase()}</span>
                            </div>

                            <h3
                              onClick={() => handleTriggerEdit(item)}
                              title={item.title}
                              style={{
                                fontSize: '14.5px',
                                fontWeight: 700,
                                color: '#000052',
                                margin: '0 0 10px',
                                lineHeight: 1.35,
                                cursor: 'pointer',
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden'
                              }}
                            >
                              {item.title}
                            </h3>

                            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '14px' }}>
                              <div>
                                <span style={{ fontSize: '17px', fontWeight: 800, color: '#000052' }}>{formatNaira(item.price)}</span>
                                <span style={{ fontSize: '11px', color: '#64748B' }}> / {item.pricePeriod === 'per_year' ? 'yr' : 'mo'}</span>
                              </div>
                              <span style={{ fontSize: '11.5px', color: '#1E40AF', backgroundColor: '#EFF6FF', padding: '2px 8px', borderRadius: '999px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                <MessageSquare size={11} /> {inquiryCount} leads
                              </span>
                            </div>

                            {/* Card Action Row */}
                            <div style={{ marginTop: 'auto', borderTop: '1px solid #F1F5F9', paddingTop: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                              <button
                                type="button"
                                onClick={(e) => handleToggleAvailability(item, e)}
                                style={{
                                  backgroundColor: item.isAvailable ? '#ECFDF5' : '#F1F5F9',
                                  color: item.isAvailable ? '#065F46' : '#64748B',
                                  border: item.isAvailable ? '1px solid #A7F3D0' : '1px solid #CBD5E1',
                                  padding: '4px 8px',
                                  borderRadius: '6px',
                                  fontSize: '11px',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px'
                                }}
                              >
                                <span style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: item.isAvailable ? '#10B981' : '#94A3B8' }} />
                                <span>{item.isAvailable ? 'Mark Occupied' : 'Mark Available'}</span>
                              </button>

                              <div style={{ display: 'flex', gap: '6px' }}>
                                <button
                                  type="button"
                                  onClick={() => handleTriggerEdit(item)}
                                  title="Edit listing"
                                  style={{ padding: '5px 8px', borderRadius: '6px', border: '1.5px solid #CBD5E1', backgroundColor: '#FFFFFF', color: '#000052', fontSize: '11.5px', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                                >
                                  <Pencil size={11} /> Edit
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => handleCopyShareLink(item, e)}
                                  title="Share link"
                                  style={{ padding: '5px 7px', borderRadius: '6px', border: '1px solid #CBD5E1', backgroundColor: '#FFFFFF', color: '#64748B', cursor: 'pointer' }}
                                >
                                  <Copy size={12} />
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => handleOpenDeleteSingle(item, e)}
                                  title="Remove listing"
                                  style={{ padding: '5px 7px', borderRadius: '6px', border: '1px solid #CBD5E1', backgroundColor: '#FFFFFF', color: '#94A3B8', cursor: 'pointer' }}
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Grid Pagination Bar */}
                <div style={{
                  padding: '14px 20px',
                  backgroundColor: '#FFFFFF',
                  borderRadius: '10px',
                  border: '1px solid #E2E8F0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: '12.5px',
                  color: '#64748B',
                  flexWrap: 'wrap',
                  gap: '14px'
                }}>
                  <div style={{ fontWeight: 500 }}>
                    Showing <strong>{filteredListings.length > 0 ? (currentPage - 1) * pageSize + 1 : 0}–{Math.min(currentPage * pageSize, filteredListings.length)}</strong> of <strong>{filteredListings.length}</strong> properties
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '12px' }}>Rows:</span>
                    {[5, 10, 20].map(size => (
                      <button
                        key={size}
                        type="button"
                        onClick={() => setPageSize(size)}
                        style={{
                          padding: '3px 9px',
                          borderRadius: '6px',
                          border: pageSize === size ? '1.5px solid #000052' : '1px solid #CBD5E1',
                          backgroundColor: pageSize === size ? '#000052' : '#FFFFFF',
                          color: pageSize === size ? '#FFFFFF' : '#475569',
                          fontSize: '11.5px',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <button
                      type="button"
                      disabled={currentPage === 1}
                      onClick={() => handlePageChange(currentPage - 1)}
                      style={{ padding: '5px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', backgroundColor: '#FFFFFF', color: currentPage === 1 ? '#CBD5E1' : '#000052', fontSize: '12px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px', cursor: currentPage === 1 ? 'not-allowed' : 'pointer' }}
                    >
                      <ChevronLeft size={14} /> Previous
                    </button>
                    <button
                      type="button"
                      disabled={currentPage === totalPages}
                      onClick={() => handlePageChange(currentPage + 1)}
                      style={{ padding: '5px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', backgroundColor: '#FFFFFF', color: currentPage === totalPages ? '#CBD5E1' : '#000052', fontSize: '12px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer' }}
                    >
                      Next <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* =============================================================
            TAB 2: BOOKINGS & INQUIRIES TAB (Access Requests)
           ============================================================= */}
        {activeTab === 'inquiries' && (
          <div>
            <div style={{ marginBottom: '24px' }}>
              <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#000052', margin: 0 }}>
                Renter Bookings & Availability Inquiries
              </h1>
              <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#64748B' }}>
                Confirm property availability within 30 minutes so prospective renters can proceed to pay the ₦5,000 verified access fee.
              </p>
            </div>

            <div style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '10px',
              border: '1px solid #E2E8F0',
              overflow: 'hidden'
            }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                <thead>
                  <tr style={{
                    backgroundColor: '#F8FAFC',
                    borderBottom: '1px solid #E2E8F0',
                    color: '#64748B',
                    fontSize: '11px',
                    fontWeight: 700,
                    textTransform: 'uppercase'
                  }}>
                    <th style={{ padding: '14px 20px' }}>Request ID</th>
                    <th style={{ padding: '14px 16px' }}>Prospective Renter</th>
                    <th style={{ padding: '14px 16px' }}>Listing Requested</th>
                    <th style={{ padding: '14px 16px' }}>Rent & Area</th>
                    <th style={{ padding: '14px 16px' }}>Response Status</th>
                    <th style={{ padding: '14px 20px', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {inquiries.map(inq => (
                    <tr key={inq.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '14px 20px', fontFamily: 'monospace', fontWeight: 700, color: '#000052' }}>
                        {inq.id}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ fontWeight: 700, color: '#1E293B' }}>{inq.renterName}</div>
                        <div style={{ fontSize: '11px', color: '#64748B' }}>{inq.submittedAt}</div>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ fontWeight: 600, color: '#000052' }}>{inq.listingTitle}</div>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ fontWeight: 700, color: '#1E293B' }}>{formatNaira(inq.listingPrice)}/yr</div>
                        <div style={{ fontSize: '11px', color: '#64748B' }}>{inq.listingArea}, Ibadan</div>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        {inq.status === 'needs_response' ? (
                          <span style={{
                            backgroundColor: '#FEF3C7',
                            color: '#92400E',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            fontSize: '11px',
                            fontWeight: 700,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}>
                            <Clock size={12} />
                            <span>Action Required ({inq.minutesRemaining}m left)</span>
                          </span>
                        ) : inq.status === 'confirmed' ? (
                          <span style={{
                            backgroundColor: '#EFF6FF',
                            color: '#1E40AF',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            fontSize: '11px',
                            fontWeight: 700
                          }}>
                            Availability Confirmed
                          </span>
                        ) : inq.status === 'paid' ? (
                          <span style={{
                            backgroundColor: '#ECFDF5',
                            color: '#065F46',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            fontSize: '11px',
                            fontWeight: 700,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}>
                            <CheckCircle2 size={12} />
                            <span>Fee Paid & Unlocked</span>
                          </span>
                        ) : (
                          <span style={{
                            backgroundColor: '#F1F5F9',
                            color: '#64748B',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            fontSize: '11px',
                            fontWeight: 600
                          }}>
                            Marked Taken
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                        <button
                          type="button"
                          onClick={() => handleOpenInquiry(inq)}
                          style={{
                            backgroundColor: inq.status === 'needs_response' ? '#000052' : '#FFFFFF',
                            color: inq.status === 'needs_response' ? '#FFFFFF' : '#000052',
                            border: inq.status === 'needs_response' ? 'none' : '1px solid #CBD5E1',
                            borderRadius: '6px',
                            padding: '6px 12px',
                            fontSize: '12px',
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}
                        >
                          {inq.status === 'needs_response' ? 'Respond Now' : 'View Details'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* =============================================================
            TAB 3: STATS & PERFORMANCE TAB (COMPREHENSIVELY UPGRADED)
           ============================================================= */}
        {activeTab === 'stats' && (
          <div>
            {/* Header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '24px',
              flexWrap: 'wrap',
              gap: '16px'
            }}>
              <div>
                <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#000052', margin: 0, letterSpacing: '-0.02em' }}>
                  Portfolio Performance & Market Insights
                </h1>
                <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#64748B' }}>
                  Real-time occupancy, renter search demand, and physical inspection accreditation across your Ibadan portfolio.
                </p>
              </div>

              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                backgroundColor: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: '8px',
                padding: '6px 12px',
                fontSize: '12px',
                fontWeight: 600,
                color: '#000052'
              }}>
                <MapPin size={13} color="#000052" />
                <span>Ibadan Metropolis</span>
                <span style={{ color: '#94A3B8' }}>•</span>
                <span style={{ color: '#16794A' }}>Bodija, Akobo, Jericho</span>
              </div>
            </div>

            {/* 1. TOP 5 EXECUTIVE KPI METRIC CARDS */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '16px',
              marginBottom: '28px'
            }}>
              {[
                {
                  title: 'Total Portfolio Rent',
                  value: '₦4,700,000',
                  sub: '+14% vs Ibadan benchmark',
                  icon: DollarSign,
                  accentColor: '#000052',
                  tag: 'Annual Value'
                },
                {
                  title: 'Portfolio Occupancy',
                  value: '75%',
                  sub: '3 of 4 Units Leased (1 Vacant)',
                  icon: Building2,
                  accentColor: '#16794A',
                  tag: 'Occupied'
                },
                {
                  title: 'Direct Tenant Inquiries',
                  value: '18 Inquiries',
                  sub: '₦90,000 saved in agent commissions',
                  icon: Users,
                  accentColor: '#B45309',
                  tag: 'Direct Leads'
                },
                {
                  title: 'Avg. Days on Market',
                  value: '9 Days',
                  sub: '68% faster than street agents',
                  icon: TrendingUp,
                  accentColor: '#2563EB',
                  tag: 'Turnover'
                },
                {
                  title: 'Landlord Response Rating',
                  value: '100%',
                  sub: 'Avg response time: 18 mins',
                  icon: Zap,
                  accentColor: '#7C3AED',
                  tag: 'Top Rated'
                }
              ].map((stat, idx) => {
                const Icon = stat.icon;
                return (
                  <div
                    key={idx}
                    style={{
                      backgroundColor: '#FFFFFF',
                      borderRadius: '10px',
                      border: '1px solid #E2E8F0',
                      padding: '20px',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between'
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748B' }}>{stat.title}</span>
                        <div style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '8px',
                          backgroundColor: `${stat.accentColor}12`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          <Icon size={16} color={stat.accentColor} />
                        </div>
                      </div>
                      <div style={{ fontSize: '22px', fontWeight: 800, color: '#000052', letterSpacing: '-0.02em' }}>
                        {stat.value}
                      </div>
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748B', marginTop: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ fontWeight: 600 }}>{stat.sub}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 2. VISUAL INQUIRY DEMAND TRENDS & NEIGHBORHOOD DISTRIBUTION */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '2fr 1fr',
              gap: '20px',
              marginBottom: '28px'
            }}>
              {/* Left: Monthly Inquiry Volume Chart */}
              <div style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '10px',
                border: '1px solid #E2E8F0',
                padding: '24px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                  <div>
                    <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#000052', margin: 0 }}>
                      Monthly Renter Inquiries & Lease Activity
                    </h3>
                    <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
                      Renter inquiries received across Bodija, Akobo, and Jericho
                    </div>
                  </div>
                  <span style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    color: '#16794A',
                    backgroundColor: '#ECFDF5',
                    padding: '3px 8px',
                    borderRadius: '4px'
                  }}>
                    +32% vs Last Month
                  </span>
                </div>

                {/* Visual Bar Graph */}
                <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', height: '160px', paddingTop: '20px' }}>
                  {[
                    { month: 'May', inquiries: 6, leased: 1 },
                    { month: 'Jun', inquiries: 9, leased: 1 },
                    { month: 'Jul', inquiries: 11, leased: 2 },
                    { month: 'Aug', inquiries: 14, leased: 2 },
                    { month: 'Sep', inquiries: 18, leased: 3, isCurrent: true }
                  ].map((bar, i) => (
                    <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', flex: 1 }}>
                      <span style={{ fontSize: '11px', fontWeight: 700, color: bar.isCurrent ? '#000052' : '#64748B' }}>
                        {bar.inquiries}
                      </span>
                      <div style={{ width: '42px', height: '110px', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
                        <div
                          style={{
                            width: '32px',
                            height: `${(bar.inquiries / 20) * 100}%`,
                            backgroundColor: bar.isCurrent ? '#000052' : '#CBD5E1',
                            borderRadius: '4px 4px 0 0',
                            transition: 'height 0.3s ease'
                          }}
                        />
                      </div>
                      <span style={{ fontSize: '12px', fontWeight: bar.isCurrent ? 700 : 500, color: bar.isCurrent ? '#000052' : '#64748B' }}>
                        {bar.month}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right: Area Demand Share */}
              <div style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '10px',
                border: '1px solid #E2E8F0',
                padding: '24px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
              }}>
                <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#000052', margin: '0 0 4px' }}>
                  Neighborhood Demand Share
                </h3>
                <div style={{ fontSize: '12px', color: '#64748B', marginBottom: '16px' }}>
                  Where verified renters in Ibadan are searching
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {[
                    { area: 'Bodija Housing & Estate', percent: 45, color: '#000052', demand: 'Very High' },
                    { area: 'Akobo & General Gas', percent: 32, color: '#16794A', demand: 'High' },
                    { area: 'Jericho GRA / Ring Road', percent: 23, color: '#2563EB', demand: 'Steady' }
                  ].map((item, idx) => (
                    <div key={idx}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                        <span style={{ fontWeight: 700, color: '#1E293B' }}>{item.area}</span>
                        <span style={{ fontWeight: 800, color: item.color }}>{item.percent}%</span>
                      </div>
                      <div style={{ width: '100%', height: '6px', backgroundColor: '#F1F5F9', borderRadius: '9999px', overflow: 'hidden' }}>
                        <div style={{ width: `${item.percent}%`, height: '100%', backgroundColor: item.color }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 3. PROPERTY-BY-PROPERTY PERFORMANCE TABLE */}
            <div style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '10px',
              border: '1px solid #E2E8F0',
              overflow: 'hidden',
              marginBottom: '28px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
            }}>
              <div style={{ padding: '18px 24px', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#000052', margin: 0 }}>
                    Listing-by-Listing Engagement
                  </h3>
                  <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
                    Views, inquiries, and physical verification audit for each unit
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('listings')}
                  style={{
                    backgroundColor: '#F1F5F9',
                    border: '1px solid #CBD5E1',
                    borderRadius: '6px',
                    padding: '6px 12px',
                    fontSize: '12px',
                    fontWeight: 700,
                    color: '#000052',
                    cursor: 'pointer'
                  }}
                >
                  View in Properties Table
                </button>
              </div>

              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                <thead>
                  <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#64748B', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' }}>
                    <th style={{ padding: '12px 24px' }}>Property</th>
                    <th style={{ padding: '12px 16px' }}>Annual Rent</th>
                    <th style={{ padding: '12px 16px' }}>Market Views</th>
                    <th style={{ padding: '12px 16px' }}>Inquiries</th>
                    <th style={{ padding: '12px 16px' }}>Status</th>
                    <th style={{ padding: '12px 24px', textAlign: 'right' }}>Audit Status</th>
                  </tr>
                </thead>
                <tbody>
                  {dashboardListings.map(item => (
                    <tr key={item.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '14px 24px' }}>
                        <div style={{ fontWeight: 700, color: '#000052' }}>{item.title}</div>
                        <div style={{ fontSize: '11px', color: '#64748B' }}>{item.area}, Ibadan • {item.type}</div>
                      </td>
                      <td style={{ padding: '14px 16px', fontWeight: 700, color: '#1E293B' }}>
                        {formatNaira(item.price)}/yr
                      </td>
                      <td style={{ padding: '14px 16px', color: '#475569', fontWeight: 600 }}>
                        {item.id === 'prop-1' ? '640 views' : item.id === 'prop-2' ? '512 views' : item.id === 'prop-3' ? '280 views' : '190 views'}
                      </td>
                      <td style={{ padding: '14px 16px', fontWeight: 700, color: '#000052' }}>
                        {item.id === 'prop-1' ? '7 Inquiries' : item.id === 'prop-2' ? '6 Inquiries' : item.id === 'prop-3' ? '3 Inquiries' : '2 Inquiries'}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{
                          backgroundColor: item.isAvailable ? '#ECFDF5' : '#F1F5F9',
                          color: item.isAvailable ? '#065F46' : '#64748B',
                          padding: '3px 8px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: 700
                        }}>
                          {item.isAvailable ? 'Available' : 'Occupied'}
                        </span>
                      </td>
                      <td style={{ padding: '14px 24px', textAlign: 'right' }}>
                        {item.verificationStatus === 'verified' ? (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            backgroundColor: '#ECFDF5',
                            color: '#065F46',
                            border: '1px solid #A7F3D0',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            fontSize: '11px',
                            fontWeight: 700
                          }}>
                            <ShieldCheck size={12} color="#16794A" />
                            <span>Verified Badge</span>
                          </span>
                        ) : (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            backgroundColor: '#FEF3C7',
                            color: '#92400E',
                            border: '1px solid #FDE68A',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            fontSize: '11px',
                            fontWeight: 700
                          }}>
                            <Clock size={12} color="#B45309" />
                            <span>Visit Pending</span>
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* 4. PHYSICAL VERIFICATION & ACCREDITATION CENTER (MOVED HERE AS REQUESTED) */}
            <div style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              border: '1.5px solid #E2E8F0',
              padding: '28px',
              boxShadow: '0 2px 8px rgba(0, 0, 82, 0.04)'
            }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '32px', alignItems: 'center' }}>
                <div>
                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    backgroundColor: '#ECFDF5',
                    color: '#065F46',
                    border: '1px solid #A7F3D0',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontWeight: 800,
                    marginBottom: '10px'
                  }}>
                    <ShieldCheck size={14} color="#16794A" />
                    <span>Accredited Physical Inspection Health</span>
                  </div>
                  <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#000052', margin: '0 0 8px' }}>
                    Accredited Physical Verification & Inspection Center
                  </h3>
                  <p style={{ fontSize: '13px', color: '#64748B', lineHeight: 1.5, margin: '0 0 18px' }}>
                    Every verified listing receives our emerald Shield badge following an on-site physical inspection in Ibadan. 
                    Verified properties receive <strong>3.4x more renter inquiries</strong> and unlock zero-commission direct contacts.
                  </p>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    {[
                      { step: '1. Legal Title Match', desc: 'Confirm C of O & landlord mandate' },
                      { step: '2. Field Inspection', desc: 'On-site photos by accredited agent' },
                      { step: '3. Utility Audit', desc: 'Prepaid meter & borehole water check' },
                      { step: '4. Emerald Badge', desc: 'Instant badge issued to listing' }
                    ].map((s, i) => (
                      <div key={i} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                        <CheckCircle2 size={15} color="#16794A" style={{ marginTop: '2px', flexShrink: 0 }} />
                        <div>
                          <div style={{ fontSize: '12px', fontWeight: 700, color: '#1E293B' }}>{s.step}</div>
                          <div style={{ fontSize: '11px', color: '#64748B' }}>{s.desc}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{
                  backgroundColor: '#F8FAFC',
                  borderRadius: '10px',
                  border: '1px solid #E2E8F0',
                  padding: '24px',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#64748B', marginBottom: '6px' }}>
                    Portfolio Accreditation Rate
                  </div>
                  <div style={{ fontSize: '32px', fontWeight: 800, color: '#16794A', letterSpacing: '-0.03em' }}>
                    75% Verified
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748B', marginTop: '4px', marginBottom: '18px' }}>
                    3 of 4 properties verified • 1 pending free visit
                  </div>

                  <button
                    type="button"
                    onClick={() => onOpenVerification ? onOpenVerification() : showToast('Open /lister/verification to book an inspection.')}
                    style={{
                      width: '100%',
                      backgroundColor: '#16794A',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '11px 18px',
                      fontSize: '13px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      boxShadow: '0 2px 6px rgba(22, 121, 74, 0.2)'
                    }}
                  >
                    <ShieldCheck size={16} />
                    <span>Book Free Inspection Visit</span>
                  </button>
                </div>
              </div>
            </div>

          </div>
        )}

      </main>

      {/* -------------------------------------------------------------
          INQUIRY RESPONSE SLIDE-OVER DRAWER
         ------------------------------------------------------------- */}
      <Sheet
        isOpen={isInquiryDrawerOpen}
        onClose={() => setIsInquiryDrawerOpen(false)}
        title={selectedInquiry ? `Inquiry: ${selectedInquiry.id}` : 'Inquiry Details'}
        description={selectedInquiry ? `${selectedInquiry.listingTitle} • ${selectedInquiry.listingArea}` : ''}
      >
        {selectedInquiry && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* Action Callout if needs response */}
            {selectedInquiry.status === 'needs_response' && (
              <div style={{
                backgroundColor: '#FEF3C7',
                border: '1px solid #FDE68A',
                borderRadius: '8px',
                padding: '16px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, color: '#92400E', fontSize: '13px', marginBottom: '6px' }}>
                  <Clock size={16} />
                  <span>Is this property available for rent today?</span>
                </div>
                <p style={{ fontSize: '12px', color: '#B45309', margin: '0 0 14px', lineHeight: 1.4 }}>
                  Confirming availability allows {selectedInquiry.renterName} to pay the ₦5,000 fee and receive your direct phone number.
                </p>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => handleConfirmAvailability(selectedInquiry.id, true)}
                    style={{
                      flex: 1,
                      backgroundColor: '#16794A',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '10px',
                      fontSize: '13px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px'
                    }}
                  >
                    <Check size={15} />
                    <span>YES, AVAILABLE</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleConfirmAvailability(selectedInquiry.id, false)}
                    style={{
                      flex: 1,
                      backgroundColor: '#FFFFFF',
                      color: '#DC2626',
                      border: '1px solid #FCA5A5',
                      borderRadius: '6px',
                      padding: '10px',
                      fontSize: '13px',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    NO, TAKEN
                  </button>
                </div>
              </div>
            )}

            {/* Renter Details */}
            <div style={{ border: '1px solid #E2E8F0', borderRadius: '8px', padding: '16px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#64748B', marginBottom: '8px' }}>
                Prospective Renter
              </div>
              <div style={{ fontWeight: 800, fontSize: '15px', color: '#000052' }}>
                {selectedInquiry.renterName}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '10px', fontSize: '12px', color: '#475569' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Mail size={14} color="#94A3B8" />
                  <span>{selectedInquiry.renterEmail}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Phone size={14} color="#94A3B8" />
                  <span>{selectedInquiry.renterPhone}</span>
                </div>
              </div>
            </div>

            {/* Property Summary */}
            <div style={{ border: '1px solid #E2E8F0', borderRadius: '8px', padding: '16px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#64748B', marginBottom: '8px' }}>
                Listing Under Request
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <img
                  src={selectedInquiry.listingPhoto}
                  alt={selectedInquiry.listingTitle}
                  style={{ width: '60px', height: '60px', borderRadius: '6px', objectFit: 'cover' }}
                />
                <div>
                  <div style={{ fontWeight: 700, fontSize: '13px', color: '#000052' }}>
                    {selectedInquiry.listingTitle}
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748B' }}>
                    {selectedInquiry.listingArea}, Ibadan
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: 800, color: '#16794A', marginTop: '4px' }}>
                    {formatNaira(selectedInquiry.listingPrice)}/yr
                  </div>
                </div>
              </div>
            </div>

          </div>
        )}
      </Sheet>

      {/* Single Listing Delete Confirmation Modal */}
      {deleteModalListing && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 82, 0.45)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '20px'
          }}
          onClick={() => setDeleteModalListing(null)}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '14px',
              maxWidth: '480px',
              width: '100%',
              boxShadow: '0 20px 40px rgba(0, 0, 82, 0.2)',
              overflow: 'hidden',
              border: '1px solid #E2E8F0',
              animation: 'fadeIn 0.18s ease-out'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ padding: '24px 24px 20px', display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '10px', backgroundColor: '#FEE2E2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Trash2 size={22} color="#DC2626" />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h3 style={{ fontSize: '17px', fontWeight: 800, color: '#000052', margin: '0 0 6px', letterSpacing: '-0.01em' }}>
                  Remove Property from Search?
                </h3>
                <p style={{ fontSize: '13px', color: '#64748B', margin: '0 0 14px', lineHeight: 1.5 }}>
                  Are you sure you want to remove <strong>"{deleteModalListing.title}"</strong>? This listing will be immediately delisted from the Ibadan search marketplace.
                </p>
                <div style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '10px 12px', fontSize: '12px', color: '#475569', display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <img
                    src={deleteModalListing.photos?.[0] || SAMPLE_FALLBACK_PHOTO}
                    alt=""
                    style={{ width: '40px', height: '40px', borderRadius: '6px', objectFit: 'cover', flexShrink: 0 }}
                  />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 700, color: '#000052', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      REF-{deleteModalListing.id.slice(-4).toUpperCase()} • {deleteModalListing.title}
                    </div>
                    <div style={{ fontSize: '11.5px', color: '#64748B' }}>
                      {deleteModalListing.area}, Ibadan • {formatNaira(deleteModalListing.price)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div style={{ backgroundColor: '#F8FAFC', padding: '14px 24px', borderTop: '1px solid #E2E8F0', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setDeleteModalListing(null)}
                style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #CBD5E1', backgroundColor: '#FFFFFF', color: '#475569', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteSingle}
                style={{ padding: '8px 18px', borderRadius: '8px', border: 'none', backgroundColor: '#DC2626', color: '#FFFFFF', fontSize: '13px', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <Trash2 size={13} color="#FFFFFF" />
                <span>Confirm Remove</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Confirmation Modal */}
      {isBulkDeleteModalOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 82, 0.45)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '20px'
          }}
          onClick={() => setIsBulkDeleteModalOpen(false)}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '14px',
              maxWidth: '480px',
              width: '100%',
              boxShadow: '0 20px 40px rgba(0, 0, 82, 0.2)',
              overflow: 'hidden',
              border: '1px solid #E2E8F0',
              animation: 'fadeIn 0.18s ease-out'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ padding: '24px 24px 20px', display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '10px', backgroundColor: '#FEE2E2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <AlertTriangle size={22} color="#DC2626" />
              </div>
              <div>
                <h3 style={{ fontSize: '17px', fontWeight: 800, color: '#000052', margin: '0 0 6px', letterSpacing: '-0.01em' }}>
                  Remove {selectedIds.length} Selected Properties?
                </h3>
                <p style={{ fontSize: '13px', color: '#64748B', margin: '0 0 12px', lineHeight: 1.5 }}>
                  This will permanently remove <strong>{selectedIds.length} properties</strong> from your portfolio and delist them from the Ibadan marketplace. This action cannot be undone.
                </p>
                <div style={{ fontSize: '11.5px', color: '#94A3B8', backgroundColor: '#F8FAFC', padding: '8px 12px', borderRadius: '6px', border: '1px solid #E2E8F0' }}>
                  Any active inquiry communications for these listings will be archived.
                </div>
              </div>
            </div>
            <div style={{ backgroundColor: '#F8FAFC', padding: '14px 24px', borderTop: '1px solid #E2E8F0', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setIsBulkDeleteModalOpen(false)}
                style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #CBD5E1', backgroundColor: '#FFFFFF', color: '#475569', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmBulkDelete}
                style={{ padding: '8px 18px', borderRadius: '8px', border: 'none', backgroundColor: '#DC2626', color: '#FFFFFF', fontSize: '13px', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <Trash2 size={13} color="#FFFFFF" />
                <span>Remove All {selectedIds.length} Properties</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Onboarding corner guide */}
      <OnboardingWidget steps={onboardingSteps} />

    </div>
  );
};
