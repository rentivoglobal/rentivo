import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  LayoutDashboard,
  Building2,
  ShieldCheck,
  AlertTriangle,
  Users,
  Flag,
  CreditCard,
  Calendar,
  Download,
  MoreVertical,
  Eye,
  CalendarCheck,
  MessageSquare,
  Ban,
  Filter,
  Search,
  Bell,
  X,
  TrendingUp,
  TrendingDown,
  Clock,
  Phone,
  UserPlus,
  Check,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  MapPin,
  Tag,
  DollarSign,
  CheckSquare,
  Square,
  Sparkles,
  Map,
  Plus
} from 'lucide-react';
import { Listing, VerificationStatus, ReportItem } from '../types';
import { formatNaira } from '../utils/formatters';
import { reportsService } from '../services/reportsService';
import { requestsService } from '../services/requestsService';
import { locationsService } from '../services/locationsService';
import { listingsService } from '../services/listingsService';
import { paymentsService } from '../services/paymentsService';
import { LocalPayment } from '../services/localStore';

type AdminSection = 'overview' | 'listings' | 'verification' | 'escalations' | 'users' | 'reports' | 'payments' | 'locations';

interface AdminQueuePageProps {
  listings: Listing[];
  onApproveVerification: (listingId: string) => void;
  onSelectListingToView?: (listing: Listing) => void;
  onExit?: () => void;
  initialSection?: AdminSection;
}
type VerificationTab = 'all' | 'pending' | 'scheduled' | 'progress' | 'completed';

interface VerificationItem {
  id: string;
  listingId: string;
  title: string;
  area: string;
  category: 'Residential' | 'Commercial';
  listerName: string;
  listerPhone: string;
  listerInitials: string;
  submittedDate: string;
  status: 'pending' | 'scheduled' | 'progress' | 'completed';
  inspector: string;
  daysInQueue: number;
  isOverdue: boolean;
  photo: string;
  price: number;
}

interface EscalationItem {
  id: string;
  listingTitle: string;
  area: string;
  listerName: string;
  listerPhone: string;
  renterName: string;
  timeSinceRequest: string;
  automatedStatus: 'No response' | 'Delivered, unread' | 'Delivered';
  isOverdue: boolean;
  photo: string;
}

export const AdminQueuePage: React.FC<AdminQueuePageProps> = ({
  listings,
  onApproveVerification,
  onSelectListingToView,
  onExit,
  initialSection
}) => {
  const [activeSection, setActiveSection] = useState<AdminSection>(initialSection && ['overview','listings','verification','escalations','users','reports','payments','locations'].includes(initialSection) ? initialSection : 'overview');
  const [payments, setPayments] = useState<LocalPayment[]>([]);
  const [activeVerifTab, setActiveVerifTab] = useState<VerificationTab>('all');

  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [areaFilter, setAreaFilter] = useState('All areas');
  const [inspectorFilter, setInspectorFilter] = useState('All inspectors');

  // Bulk Selection State
  const [selectedRowIds, setSelectedRowIds] = useState<string[]>([]);

  // Centered Modal State & Scroll Progress
  const [selectedVerifItem, setSelectedVerifItem] = useState<VerificationItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalScrollProgress, setModalScrollProgress] = useState(0);
  const modalBodyRef = useRef<HTMLDivElement>(null);

  // Active Row Action Menu State
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  // Modal Inspection Form State
  const [modalInspector, setModalInspector] = useState('Tayo A.');
  const [modalInspectionDate, setModalInspectionDate] = useState('2026-09-22');
  const [modalChecklist, setModalChecklist] = useState({
    addressExists: true,
    detailsMatch: true,
    listerConfirmed: true,
    photosAccurate: true
  });
  const [modalNotes, setModalNotes] = useState('');

  // Toast / Notification
  const [adminToast, setAdminToast] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setAdminToast(msg);
    setTimeout(() => setAdminToast(null), 3000);
  };

  // Reports State (FR-6.4 & FR-7.1)
  const [reports, setReports] = useState<ReportItem[]>(reportsService.getReports());

  useEffect(() => {
    void paymentsService.listPayments().then(setPayments);
    void reportsService.loadReports().then(setReports).catch(() => undefined);
  }, []);

  // Promotion Stats State (FR-5.3 & FR-5.4 First 100 users waiver)
  const promoStats = useMemo(() => requestsService.getPromotionStats(), []);

  // Multi-City Location Management State (FR-7.6)
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [locationsVersion, setLocationsVersion] = useState(0);
  const allCities = useMemo(() => locationsService.getCities(), [locationsVersion]);
  const [newCityName, setNewCityName] = useState('');
  const [newCityState, setNewCityState] = useState('');
  const [newAreaCity, setNewAreaCity] = useState('Ibadan');
  const [newAreaName, setNewAreaName] = useState('');

  // Rejection modal state for listing pre-publish moderation
  const [rejectModalListing, setRejectModalListing] = useState<Listing | null>(null);
  const [rejectCategory, setRejectCategory] = useState<string>('Blurry or unverified photos');
  const [rejectNotes, setRejectNotes] = useState<string>('');

  const handleConfirmReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectModalListing) return;
    await listingsService.moderateListing(
      rejectModalListing.id,
      'reject',
      `${rejectCategory}${rejectNotes.trim() ? ': ' + rejectNotes.trim() : ''}`
    );
    showToast(`Listing "${rejectModalListing.title}" rejected and feedback logged.`);
    setRejectModalListing(null);
    setRejectNotes('');
  };

  // Contact Lister dialog for reports
  const [contactingReportItem, setContactingReportItem] = useState<ReportItem | null>(null);

  const handleDismissReport = (id: string) => {
    reportsService.dismissReport(id);
    setReports(reportsService.getReports());
    showToast('Report dismissed from active queue.');
  };

  const handleDeactivateFlaggedListing = async (report: ReportItem) => {
    reportsService.updateReportStatus(report.id, 'resolved');
    setReports(reportsService.getReports());
    showToast(`Listing "${report.listingTitle}" deactivated from live marketplace.`);
  };

  const handleAddCity = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCityName.trim() || !newCityState.trim()) return;
    locationsService.addCity({ name: newCityName.trim(), state: newCityState.trim(), isActive: true });
    setLocationsVersion(v => v + 1);
    setNewCityName('');
    setNewCityState('');
    showToast(`City added to expansion registry.`);
  };

  const handleAddArea = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAreaName.trim()) return;
    locationsService.addAreaToCity(newAreaCity, newAreaName.trim());
    setLocationsVersion(v => v + 1);
    setNewAreaName('');
    showToast(`Neighborhood "${newAreaName.trim()}" added to ${newAreaCity}.`);
  };

  // Close menus on outside click
  useEffect(() => {
    const handleOutside = () => setActiveMenuId(null);
    document.addEventListener('click', handleOutside);
    return () => document.removeEventListener('click', handleOutside);
  }, []);

  // Handle scroll progress inside the centered modal
  const handleModalScroll = () => {
    if (modalBodyRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = modalBodyRef.current;
      const maxScroll = scrollHeight - clientHeight;
      if (maxScroll > 0) {
        const progress = Math.min(100, Math.max(0, (scrollTop / maxScroll) * 100));
        setModalScrollProgress(progress);
      } else {
        setModalScrollProgress(0);
      }
    }
  };

  // Verification Items synced with mock & listings
  const [verificationItems, setVerificationItems] = useState<VerificationItem[]>([
    {
      id: 'verif-1',
      listingId: 'prop-1',
      title: 'Tidy self-contain near Bodija market',
      area: 'Bodija',
      category: 'Residential',
      listerName: 'Adeola B.',
      listerPhone: '+234 803 123 4567',
      listerInitials: 'AB',
      submittedDate: 'Sep 15',
      status: 'pending',
      inspector: 'Unassigned',
      daysInQueue: 3,
      isOverdue: true,
      photo: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=400&q=80',
      price: 450000
    },
    {
      id: 'verif-2',
      listingId: 'prop-4',
      title: 'Commercial shop facing Ring Road',
      area: 'Ring Road',
      category: 'Commercial',
      listerName: 'Femi O.',
      listerPhone: '+234 809 778 9900',
      listerInitials: 'FO',
      submittedDate: 'Sep 13',
      status: 'scheduled',
      inspector: 'Tayo A.',
      daysInQueue: 5,
      isOverdue: true,
      photo: 'https://images.unsplash.com/photo-1582037928769-181f2644ecb7?auto=format&fit=crop&w=400&q=80',
      price: 1200000
    },
    {
      id: 'verif-3',
      listingId: 'prop-3',
      title: 'Serviced 3-bedroom duplex with prepaid meter',
      area: 'UI area',
      category: 'Residential',
      listerName: 'Chidi J.',
      listerPhone: '+234 802 334 1122',
      listerInitials: 'CJ',
      submittedDate: 'Sep 13',
      status: 'progress',
      inspector: 'Tayo A.',
      daysInQueue: 2,
      isOverdue: false,
      photo: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=400&q=80',
      price: 2200000
    },
    {
      id: 'verif-4',
      listingId: 'prop-2',
      title: '2-bedroom flat, off General Gas',
      area: 'Bodija',
      category: 'Residential',
      listerName: 'Bimbo K.',
      listerPhone: '+234 805 678 1234',
      listerInitials: 'BK',
      submittedDate: 'Sep 10',
      status: 'completed',
      inspector: 'Musa I.',
      daysInQueue: 0,
      isOverdue: false,
      photo: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=400&q=80',
      price: 850000
    },
    {
      id: 'verif-5',
      listingId: 'prop-5',
      title: 'Large Commercial Storage Warehouse',
      area: 'Iwo Road',
      category: 'Commercial',
      listerName: 'Tobi O.',
      listerPhone: '+234 807 555 4321',
      listerInitials: 'TO',
      submittedDate: 'Sep 12',
      status: 'pending',
      inspector: 'Unassigned',
      daysInQueue: 6,
      isOverdue: true,
      photo: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=400&q=80',
      price: 3500000
    },
    {
      id: 'verif-6',
      listingId: 'prop-6',
      title: 'Contemporary 4-Bedroom Villa with Borehole',
      area: 'Jericho',
      category: 'Residential',
      listerName: 'Folake S.',
      listerPhone: '+234 803 888 9911',
      listerInitials: 'FS',
      submittedDate: 'Sep 16',
      status: 'scheduled',
      inspector: 'Musa I.',
      daysInQueue: 1,
      isOverdue: false,
      photo: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=400&q=80',
      price: 4200000
    }
  ]);

  // Escalations List matching rentivo-admin.html
  const [escalations, setEscalations] = useState<EscalationItem[]>([
    {
      id: 'esc-1',
      listingTitle: '2-Bed Flat, Bodija',
      area: 'Bodija',
      listerName: 'Adeola B.',
      listerPhone: '+234 803 123 4567',
      renterName: 'Tunde A.',
      timeSinceRequest: '2h 14m',
      automatedStatus: 'No response',
      isOverdue: true,
      photo: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=400&q=80'
    },
    {
      id: 'esc-2',
      listingTitle: 'Self-Contain, Ring Road',
      area: 'Ring Road',
      listerName: 'Femi O.',
      listerPhone: '+234 809 778 9900',
      renterName: 'Bimbo K.',
      timeSinceRequest: '1h 48m',
      automatedStatus: 'Delivered, unread',
      isOverdue: true,
      photo: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=400&q=80'
    },
    {
      id: 'esc-3',
      listingTitle: 'Retail shop, Sango',
      area: 'Sango',
      listerName: 'Femi O.',
      listerPhone: '+234 809 778 9900',
      renterName: 'Ola F.',
      timeSinceRequest: '22m',
      automatedStatus: 'Delivered',
      isOverdue: false,
      photo: 'https://images.unsplash.com/photo-1582037928769-181f2644ecb7?auto=format&fit=crop&w=400&q=80'
    }
  ]);

  // Filtered Verification Items
  const filteredVerificationItems = useMemo(() => {
    return verificationItems.filter(item => {
      if (activeVerifTab === 'pending' && item.status !== 'pending') return false;
      if (activeVerifTab === 'scheduled' && item.status !== 'scheduled') return false;
      if (activeVerifTab === 'progress' && item.status !== 'progress') return false;
      if (activeVerifTab === 'completed' && item.status !== 'completed') return false;

      if (areaFilter !== 'All areas' && item.area !== areaFilter) return false;

      if (inspectorFilter !== 'All inspectors') {
        if (inspectorFilter === 'Unassigned' && item.inspector !== 'Unassigned') return false;
        if (inspectorFilter !== 'Unassigned' && item.inspector !== inspectorFilter) return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matches =
          item.title.toLowerCase().includes(q) ||
          item.area.toLowerCase().includes(q) ||
          item.listerName.toLowerCase().includes(q) ||
          item.inspector.toLowerCase().includes(q);
        if (!matches) return false;
      }

      return true;
    });
  }, [verificationItems, activeVerifTab, areaFilter, inspectorFilter, searchQuery]);

  // Tab counts
  const tabCounts = useMemo(() => {
    return {
      all: verificationItems.length,
      pending: verificationItems.filter(i => i.status === 'pending').length,
      scheduled: verificationItems.filter(i => i.status === 'scheduled').length,
      progress: verificationItems.filter(i => i.status === 'progress').length,
      completed: verificationItems.filter(i => i.status === 'completed').length
    };
  }, [verificationItems]);

  // Open Centered Modal Handler
  const handleOpenModal = (item: VerificationItem) => {
    setSelectedVerifItem(item);
    setModalInspector(item.inspector === 'Unassigned' ? 'Tayo A.' : item.inspector);
    setModalScrollProgress(0);
    setIsModalOpen(true);
  };

  // Close Centered Modal Handler
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedVerifItem(null);
    setModalScrollProgress(0);
  };

  // Approve Verification Action
  const handleApproveVerificationAction = (item: VerificationItem) => {
    setVerificationItems(prev =>
      prev.map(i => (i.id === item.id ? { ...i, status: 'completed', isOverdue: false } : i))
    );
    onApproveVerification(item.listingId);
    showToast(`Approved Emerald Verified badge for "${item.title}"`);
    handleCloseModal();
  };

  // Request Changes Action
  const handleRequestChanges = (item: VerificationItem) => {
    showToast(`Revision request sent to ${item.listerName} with inspector notes.`);
    handleCloseModal();
  };

  // Revoke Verification Action
  const handleRevoke = (item: VerificationItem) => {
    setVerificationItems(prev =>
      prev.map(i => (i.id === item.id ? { ...i, status: 'pending' } : i))
    );
    showToast(`Verification revoked for "${item.title}".`);
    handleCloseModal();
  };

  // Quick verify all 4 checklist items
  const handleCheckAllChecklist = () => {
    setModalChecklist({
      addressExists: true,
      detailsMatch: true,
      listerConfirmed: true,
      photosAccurate: true
    });
  };

  // Bulk Selection Handlers
  const handleToggleSelectAll = () => {
    if (selectedRowIds.length === filteredVerificationItems.length) {
      setSelectedRowIds([]);
    } else {
      setSelectedRowIds(filteredVerificationItems.map(i => i.id));
    }
  };

  const handleToggleRow = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedRowIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  // Call Lister Simulation
  const handleCallLister = (esc: EscalationItem) => {
    const tel = esc.listerPhone.replace(/\s/g, '');
    window.location.href = `tel:${tel}`;
    showToast(`Opening call to ${esc.listerName} (${esc.listerPhone}) for "${esc.listingTitle}".`);
  };

  return (
    <div style={{ backgroundColor: '#F7F8FA', minHeight: '100vh', color: '#17172B', fontFamily: 'inherit' }}>

      {/* -------------------------------------------------------------
          TOP STICKY NAVIGATION BAR (MATCHING rentivo-admin.html)
         ------------------------------------------------------------- */}
      <header style={{
        backgroundColor: '#000052',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        position: 'sticky',
        top: 0,
        zIndex: 50,
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.15)'
      }}>
        <div style={{
          maxWidth: '1500px',
          margin: '0 auto',
          padding: '0 32px',
          height: '60px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '24px'
        }}>
          {/* Logo & Admin Tag */}
          <div 
            style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0, cursor: onExit ? 'pointer' : 'default' }}
            onClick={onExit}
            title={onExit ? "Exit Admin to Home" : undefined}
          >
            <span style={{ fontSize: '18px', fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.02em' }}>
              RENT<span style={{ color: '#BE89FF' }}>ivo</span>
            </span>
            <span style={{
              fontSize: '10px',
              fontWeight: 800,
              backgroundColor: 'rgba(190, 137, 255, 0.18)',
              color: '#BE89FF',
              padding: '3px 8px',
              borderRadius: '6px',
              letterSpacing: '0.04em'
            }}>
              ADMIN
            </span>
          </div>

          {/* Nav Tabs with Animated Lilac Underline */}
          <nav style={{
            display: 'flex',
            gap: '4px',
            flex: 1,
            height: '100%',
            overflowX: 'auto',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            position: 'relative'
          }}
          className="no-scrollbar"
          >
            {[
              { id: 'overview', label: 'Overview', icon: LayoutDashboard },
              { id: 'listings', label: 'Listings', icon: Building2 },
              { id: 'verification', label: 'Verification', icon: ShieldCheck },
              { id: 'escalations', label: 'Escalations', icon: AlertTriangle },
              { id: 'payments', label: 'Payments', icon: CreditCard },
              { id: 'users', label: 'Users', icon: Users },
              { id: 'reports', label: 'Reports', icon: Flag },
              { id: 'locations', label: 'Locations', icon: MapPin }
            ].map(tab => {
              const Icon = tab.icon;
              const isActive = activeSection === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setActiveSection(tab.id as AdminSection);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '0 14px',
                    fontSize: '13.5px',
                    fontWeight: 600,
                    color: isActive ? '#FFFFFF' : '#A9A6D0',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    position: 'relative',
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                    transition: 'color 0.18s ease'
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) e.currentTarget.style.color = '#FFFFFF';
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) e.currentTarget.style.color = '#A9A6D0';
                  }}
                >
                  <Icon size={16} />
                  <span>{tab.label}</span>
                  {isActive && (
                    <span style={{
                      position: 'absolute',
                      bottom: 0,
                      left: '12px',
                      right: '12px',
                      height: '2.5px',
                      backgroundColor: '#BE89FF',
                      borderRadius: '2px'
                    }} />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Right: Quick Search, Bell, Avatar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: '9px',
              padding: '6px 12px'
            }}>
              <Search size={14} color="#8E8BB8" />
              <input
                type="text"
                placeholder="Search listings, users..."
                style={{
                  border: 'none',
                  background: 'none',
                  outline: 'none',
                  color: '#FFFFFF',
                  fontSize: '12.5px',
                  width: '140px'
                }}
              />
            </div>

            <button
              type="button"
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '50%',
                border: '1px solid rgba(255, 255, 255, 0.14)',
                backgroundColor: 'rgba(255, 255, 255, 0.06)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#C9C6E8',
                cursor: 'pointer',
                position: 'relative'
              }}
            >
              <Bell size={15} />
              <span style={{
                position: 'absolute',
                top: '6px',
                right: '7px',
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: '#F87171'
              }} />
            </button>

            {onExit && (
              <button
                type="button"
                onClick={onExit}
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  color: '#FFFFFF',
                  borderRadius: '8px',
                  padding: '5px 12px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
                title="Exit Admin to Consumer Home"
              >
                <span>Exit Admin</span>
              </button>
            )}

            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #BE89FF, #8F5BD6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '11.5px',
              fontWeight: 800,
              color: '#FFFFFF'
            }}>
              RV
            </div>
          </div>
        </div>
      </header>

      {/* -------------------------------------------------------------
          MAIN ADMIN VIEWPORT
         ------------------------------------------------------------- */}
      <main style={{ maxWidth: '1500px', margin: '0 auto', padding: '26px 32px 60px' }}>

        {/* =============================================================
            TAB 1: ADMIN OVERVIEW (MATCHING rentivo-admin.html)
           ============================================================= */}
        {activeSection === 'overview' && (
          <div>
            {/* Topline Header */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              gap: '20px',
              flexWrap: 'wrap',
              marginBottom: '22px'
            }}>
              <div>
                <h1 style={{ fontSize: '24px', fontWeight: 800, margin: '0 0 4px', letterSpacing: '-0.01em', color: '#000052' }}>
                  Admin overview
                </h1>
                <p style={{ margin: 0, fontSize: '13.5px', color: '#636377' }}>
                  Ibadan pilot · Platform health, verification queue, and escalations.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => setIsLocationModalOpen(true)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    border: '1.5px solid #000052',
                    backgroundColor: '#EFF6FF',
                    padding: '9px 14px',
                    borderRadius: '10px',
                    fontSize: '13px',
                    fontWeight: 700,
                    color: '#000052',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <MapPin size={15} color="#000052" />
                  <span>Manage Cities ({allCities.length})</span>
                </button>

                <button
                  type="button"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    border: '1px solid #E6E3EE',
                    backgroundColor: '#FFFFFF',
                    padding: '9px 14px',
                    borderRadius: '10px',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#17172B',
                    cursor: 'pointer'
                  }}
                >
                  <Calendar size={15} color="#636377" />
                  <span>Last 30 days</span>
                  <ChevronDown size={13} color="#636377" />
                </button>

                <button
                  type="button"
                  onClick={() => showToast('Exporting admin platform performance report (CSV)...')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    border: 'none',
                    backgroundColor: '#000052',
                    color: '#FFFFFF',
                    padding: '9px 16px',
                    borderRadius: '10px',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: '0 2px 6px rgba(0, 0, 82, 0.15)'
                  }}
                >
                  <Download size={15} />
                  <span>Export report</span>
                </button>
              </div>
            </div>

            {/* 8 Stats Metric Cards */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: '14px',
              marginBottom: '24px'
            }}>
              {/* 1. Active listings */}
              <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E6E3EE', borderRadius: '14px', padding: '16px' }}>
                <div style={{ fontSize: '11.5px', fontWeight: 700, color: '#636377', textTransform: 'uppercase', letterSpacing: '0.03em', marginBottom: '8px' }}>
                  Active listings
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '26px', fontWeight: 800, color: '#000052' }}>142</span>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#047857', display: 'flex', alignItems: 'center', gap: '3px' }}>
                    <TrendingUp size={14} /> 8%
                  </span>
                </div>
                <div style={{ fontSize: '11.5px', color: '#636377', marginTop: '6px' }}>
                  6 pending admin approval
                </div>
              </div>

              {/* 2. Verified listings */}
              <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E6E3EE', borderRadius: '14px', padding: '16px' }}>
                <div style={{ fontSize: '11.5px', fontWeight: 700, color: '#636377', textTransform: 'uppercase', letterSpacing: '0.03em', marginBottom: '8px' }}>
                  Verified listings
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '26px', fontWeight: 800, color: '#000052' }}>98</span>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#047857', display: 'flex', alignItems: 'center', gap: '3px' }}>
                    <TrendingUp size={14} /> 5%
                  </span>
                </div>
                <div style={{ fontSize: '11.5px', color: '#636377', marginTop: '6px' }}>
                  69% of active listings verified
                </div>
              </div>

              {/* 3. Pending inspections */}
              <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E6E3EE', borderRadius: '14px', padding: '16px' }}>
                <div style={{ fontSize: '11.5px', fontWeight: 700, color: '#636377', textTransform: 'uppercase', letterSpacing: '0.03em', marginBottom: '8px' }}>
                  Pending inspections
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '26px', fontWeight: 800, color: '#000052' }}>11</span>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#BE123C', display: 'flex', alignItems: 'center', gap: '3px' }}>
                    <TrendingDown size={14} /> 2
                  </span>
                </div>
                <div style={{ fontSize: '11.5px', color: '#636377', marginTop: '6px' }}>
                  3 unscheduled for 48h+
                </div>
              </div>

              {/* 4. Requests awaiting confirmation */}
              <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E6E3EE', borderRadius: '14px', padding: '16px' }}>
                <div style={{ fontSize: '11.5px', fontWeight: 700, color: '#636377', textTransform: 'uppercase', letterSpacing: '0.03em', marginBottom: '8px' }}>
                  Requests awaiting confirmation
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '26px', fontWeight: 800, color: '#000052' }}>7</span>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#B45309', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Clock size={13} /> 2 overdue
                  </span>
                </div>
                <div style={{ fontSize: '11.5px', color: '#636377', marginTop: '6px' }}>
                  Avg lister response: 34 mins
                </div>
              </div>

              {/* 5. Confirmation rate */}
              <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E6E3EE', borderRadius: '14px', padding: '16px' }}>
                <div style={{ fontSize: '11.5px', fontWeight: 700, color: '#636377', textTransform: 'uppercase', letterSpacing: '0.03em', marginBottom: '8px' }}>
                  Confirmation rate
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '26px', fontWeight: 800, color: '#000052' }}>91%</span>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#047857', display: 'flex', alignItems: 'center', gap: '3px' }}>
                    <TrendingUp size={14} /> 3%
                  </span>
                </div>
                <div style={{ fontSize: '11.5px', color: '#636377', marginTop: '6px' }}>
                  Of requests resolved within 1 hour
                </div>
              </div>

              {/* 6. Access-fee revenue */}
              <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E6E3EE', borderRadius: '14px', padding: '16px' }}>
                <div style={{ fontSize: '11.5px', fontWeight: 700, color: '#636377', textTransform: 'uppercase', letterSpacing: '0.03em', marginBottom: '8px' }}>
                  Access-fee revenue
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '26px', fontWeight: 800, color: '#000052' }}>₦610,000</span>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#047857', display: 'flex', alignItems: 'center', gap: '3px' }}>
                    <TrendingUp size={14} /> 14%
                  </span>
                </div>
                <div style={{ fontSize: '11.5px', color: '#636377', marginTop: '6px' }}>
                  122 paid access unlocks this period
                </div>
              </div>

              {/* 7. Promotion redemptions (FR-5.3 / FR-5.4) */}
              <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E6E3EE', borderRadius: '14px', padding: '16px' }}>
                <div style={{ fontSize: '11.5px', fontWeight: 700, color: '#636377', textTransform: 'uppercase', letterSpacing: '0.03em', marginBottom: '8px' }}>
                  Promotion redemptions
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '26px', fontWeight: 800, color: '#000052' }}>
                    {promoStats.redeemed} / {promoStats.total}
                  </span>
                  <span style={{ fontSize: '11.5px', fontWeight: 800, color: '#7E22CE', backgroundColor: '#F3E8FF', padding: '2px 8px', borderRadius: '12px' }}>
                    {promoStats.remaining} left
                  </span>
                </div>
                <div style={{ fontSize: '11.5px', color: '#636377', marginTop: '6px' }}>
                  First 100 Users Promotional Waiver Quota
                </div>
              </div>

              {/* 8. Reported listings (FR-6.4) */}
              <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E6E3EE', borderRadius: '14px', padding: '16px' }}>
                <div style={{ fontSize: '11.5px', fontWeight: 700, color: '#636377', textTransform: 'uppercase', letterSpacing: '0.03em', marginBottom: '8px' }}>
                  Reported listings
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '26px', fontWeight: 800, color: '#000052' }}>
                    {reports.filter(r => r.status === 'pending' || r.status === 'investigating').length}
                  </span>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#BE123C', display: 'flex', alignItems: 'center', gap: '3px' }}>
                    <AlertTriangle size={13} /> {reports.filter(r => r.status === 'pending').length} new
                  </span>
                </div>
                <div style={{ fontSize: '11.5px', color: '#636377', marginTop: '6px' }}>
                  Median time to review: 6 hrs
                </div>
              </div>
            </div>

            {/* 2-Column: Verification Queue Snapshot + Chart & Distribution */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1.7fr 1fr',
              gap: '18px',
              alignItems: 'start',
              marginBottom: '20px'
            }}>
              {/* Left Panel: Verification Queue Snapshot */}
              <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E6E3EE', borderRadius: '16px', overflow: 'hidden' }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '16px 18px',
                  borderBottom: '1px solid #E6E3EE',
                  flexWrap: 'wrap',
                  gap: '10px'
                }}>
                  <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#000052' }}>
                    Verification queue
                  </h3>
                  <button
                    type="button"
                    onClick={() => setActiveSection('verification')}
                    style={{
                      border: '1px solid #E6E3EE',
                      backgroundColor: '#FFFFFF',
                      padding: '7px 12px',
                      borderRadius: '8px',
                      fontSize: '12.5px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <span>View all (11)</span>
                    <ChevronRight size={13} />
                  </button>
                </div>

                {/* Sub tabs */}
                <div style={{ display: 'flex', gap: '6px', padding: '12px 18px 0', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '12px', fontWeight: 600, padding: '6px 12px', borderRadius: '8px', backgroundColor: '#F8F3FF', color: '#000052', border: '1px solid #E1CBFF' }}>
                    All (11)
                  </span>
                  <span style={{ fontSize: '12px', fontWeight: 600, padding: '6px 12px', borderRadius: '8px', color: '#636377' }}>
                    Pending (4)
                  </span>
                  <span style={{ fontSize: '12px', fontWeight: 600, padding: '6px 12px', borderRadius: '8px', color: '#636377' }}>
                    Scheduled (3)
                  </span>
                </div>

                {/* Table */}
                <div className="no-scrollbar" style={{ overflowX: 'auto', scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '6px' }}>
                    <thead>
                      <tr>
                        <th style={{ textAlign: 'left', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.04em', color: '#636377', padding: '9px 18px', fontWeight: 700 }}>
                          Property
                        </th>
                        <th style={{ textAlign: 'left', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.04em', color: '#636377', padding: '9px 18px', fontWeight: 700 }}>
                          Lister
                        </th>
                        <th style={{ textAlign: 'left', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.04em', color: '#636377', padding: '9px 18px', fontWeight: 700 }}>
                          Submitted
                        </th>
                        <th style={{ textAlign: 'center', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.04em', color: '#636377', padding: '9px 18px', fontWeight: 700 }}>
                          Status
                        </th>
                        <th style={{ textAlign: 'left', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.04em', color: '#636377', padding: '9px 18px', fontWeight: 700 }}>
                          Inspector
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {verificationItems.slice(0, 4).map(item => {
                        const statusColors = {
                          pending: { bg: '#FFFBEB', color: '#B45309', border: '#FDE68A', dot: '#B45309', label: 'Pending' },
                          scheduled: { bg: '#EEF2FF', color: '#4338CA', border: '#C7D2FE', dot: '#4338CA', label: 'Scheduled' },
                          progress: { bg: '#F8FAFC', color: '#334155', border: '#E2E8F0', dot: '#334155', label: 'In progress' },
                          completed: { bg: '#ECFDF5', color: '#047857', border: '#A7F3D0', dot: '#047857', label: 'Completed' }
                        }[item.status];

                        return (
                          <tr
                            key={item.id}
                            onClick={() => handleOpenModal(item)}
                            style={{ borderTop: '1px solid #E6E3EE', cursor: 'pointer', transition: 'background-color 0.12s ease' }}
                            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#FAFAFD')}
                            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                          >
                            <td style={{ padding: '12px 18px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <img
                                  src={item.photo}
                                  alt=""
                                  style={{ width: '38px', height: '38px', borderRadius: '8px', objectFit: 'cover' }}
                                />
                                <div>
                                  <div style={{ fontWeight: 600, fontSize: '13px', color: '#17172B' }}>{item.title}</div>
                                  <div style={{ fontSize: '11px', color: '#636377' }}>{item.area}</div>
                                </div>
                              </div>
                            </td>
                            <td style={{ padding: '12px 18px', fontSize: '13px', color: '#17172B', fontWeight: 500 }}>
                              {item.listerName}
                            </td>
                            <td style={{ padding: '12px 18px', fontSize: '13px', color: '#636377' }}>
                              {item.submittedDate}
                            </td>
                            <td style={{ padding: '12px 18px', textAlign: 'center' }}>
                              <span style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                fontSize: '11px',
                                fontWeight: 600,
                                padding: '3px 8px',
                                borderRadius: '999px',
                                backgroundColor: statusColors.bg,
                                color: statusColors.color,
                                border: `1px solid ${statusColors.border}`
                              }}>
                                <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: statusColors.dot }} />
                                <span>{statusColors.label}</span>
                              </span>
                            </td>
                            <td style={{ padding: '12px 18px', fontSize: '13px', color: item.inspector === 'Unassigned' ? '#94A3B8' : '#17172B', fontStyle: item.inspector === 'Unassigned' ? 'italic' : 'normal' }}>
                              {item.inspector}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Right Panel: Chart & Stack Bar Distribution */}
              <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E6E3EE', borderRadius: '16px', overflow: 'hidden' }}>
                <div style={{ padding: '16px 18px', borderBottom: '1px solid #E6E3EE' }}>
                  <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#000052' }}>
                    Confirmation rate trend
                  </h3>
                </div>

                <div style={{ padding: '18px' }}>
                  {/* SVG Sparkline */}
                  <svg viewBox="0 0 260 90" width="100%" height="90">
                    <polyline
                      points="0,60 35,52 70,58 105,40 140,44 175,26 210,22 245,14"
                      fill="none"
                      stroke="#BE89FF"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <polyline
                      points="0,60 35,52 70,58 105,40 140,44 175,26 210,22 245,14 245,90 0,90"
                      fill="url(#adminGradient)"
                      opacity="0.15"
                      stroke="none"
                    />
                    <defs>
                      <linearGradient id="adminGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#BE89FF" />
                        <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <p style={{ fontSize: '11.5px', color: '#636377', margin: '4px 0 16px' }}>
                    Last 8 weeks — up from 78% to 91%
                  </p>

                  <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#000052', margin: '0 0 8px' }}>
                    Verification queue distribution
                  </h4>

                  {/* Stack Bar */}
                  <div style={{ display: 'flex', height: '14px', borderRadius: '999px', overflow: 'hidden', marginTop: '6px' }}>
                    <div style={{ width: '36%', backgroundColor: '#B45309' }} title="Pending (4)" />
                    <div style={{ width: '27%', backgroundColor: '#4338CA' }} title="Scheduled (3)" />
                    <div style={{ width: '18%', backgroundColor: '#334155' }} title="In progress (2)" />
                    <div style={{ width: '19%', backgroundColor: '#047857' }} title="Completed (2)" />
                  </div>

                  {/* Legend */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginTop: '14px' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', color: '#636377' }}>
                      <span style={{ width: '9px', height: '9px', borderRadius: '3px', backgroundColor: '#B45309' }} />
                      <span>Pending (4)</span>
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', color: '#636377' }}>
                      <span style={{ width: '9px', height: '9px', borderRadius: '3px', backgroundColor: '#4338CA' }} />
                      <span>Scheduled (3)</span>
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', color: '#636377' }}>
                      <span style={{ width: '9px', height: '9px', borderRadius: '3px', backgroundColor: '#334155' }} />
                      <span>In progress (2)</span>
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', color: '#636377' }}>
                      <span style={{ width: '9px', height: '9px', borderRadius: '3px', backgroundColor: '#047857' }} />
                      <span>Completed (2)</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Availability Escalation Queue Panel */}
            <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E6E3EE', borderRadius: '16px', overflow: 'hidden' }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '16px 18px',
                borderBottom: '1px solid #E6E3EE'
              }}>
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#000052' }}>
                  Availability escalation queue
                </h3>
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '11.5px',
                  fontWeight: 700,
                  padding: '4px 10px',
                  borderRadius: '999px',
                  backgroundColor: '#FFF1F2',
                  color: '#BE123C',
                  border: '1px solid #FECDD3'
                }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#BE123C' }} />
                  <span>2 overdue</span>
                </span>
              </div>

              <div className="no-scrollbar" style={{ overflowX: 'auto', scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.04em', color: '#636377', padding: '11px 18px', fontWeight: 700 }}>
                        Property
                      </th>
                      <th style={{ textAlign: 'left', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.04em', color: '#636377', padding: '11px 18px', fontWeight: 700 }}>
                        Requesting user
                      </th>
                      <th style={{ textAlign: 'left', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.04em', color: '#636377', padding: '11px 18px', fontWeight: 700 }}>
                        Time since request
                      </th>
                      <th style={{ textAlign: 'left', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.04em', color: '#636377', padding: '11px 18px', fontWeight: 700 }}>
                        Lister
                      </th>
                      <th style={{ textAlign: 'center', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.04em', color: '#636377', padding: '11px 18px', fontWeight: 700 }}>
                        Automated message
                      </th>
                      <th style={{ textAlign: 'right', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.04em', color: '#636377', padding: '11px 18px', fontWeight: 700 }}>
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {escalations.map(esc => (
                      <tr
                        key={esc.id}
                        style={{
                          borderTop: '1px solid #E6E3EE',
                          backgroundColor: esc.isOverdue ? '#FFF1F2' : 'transparent',
                          transition: 'background-color 0.12s ease'
                        }}
                      >
                        <td style={{ padding: '12px 18px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <img
                              src={esc.photo}
                              alt=""
                              style={{ width: '38px', height: '38px', borderRadius: '8px', objectFit: 'cover' }}
                            />
                            <div>
                              <div style={{ fontWeight: 600, fontSize: '13px', color: '#17172B' }}>{esc.listingTitle}</div>
                              <div style={{ fontSize: '11px', color: '#636377' }}>{esc.area}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '12px 18px', fontSize: '13px', fontWeight: 600, color: '#17172B' }}>
                          {esc.renterName}
                        </td>
                        <td style={{
                          padding: '12px 18px',
                          fontSize: '13px',
                          fontWeight: esc.isOverdue ? 700 : 500,
                          color: esc.isOverdue ? '#BE123C' : '#636377'
                        }}>
                          {esc.timeSinceRequest}
                        </td>
                        <td style={{ padding: '12px 18px', fontSize: '13px', color: '#17172B' }}>
                          {esc.listerName}
                        </td>
                        <td style={{ padding: '12px 18px', textAlign: 'center' }}>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            fontSize: '11px',
                            fontWeight: 600,
                            padding: '3px 8px',
                            borderRadius: '999px',
                            backgroundColor: esc.isOverdue ? '#FFF1F2' : '#F8FAFC',
                            color: esc.isOverdue ? '#BE123C' : '#636377',
                            border: esc.isOverdue ? '1px solid #FECDD3' : '1px solid #E2E8F0'
                          }}>
                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: esc.isOverdue ? '#BE123C' : '#94A3B8' }} />
                            <span>{esc.automatedStatus}</span>
                          </span>
                        </td>
                        <td style={{ padding: '12px 18px', textAlign: 'right' }}>
                          <button
                            type="button"
                            onClick={() => handleCallLister(esc)}
                            disabled={!esc.isOverdue}
                            style={{
                              border: '1px solid #E6E3EE',
                              backgroundColor: esc.isOverdue ? '#FFFFFF' : '#F8FAFC',
                              padding: '7px 12px',
                              borderRadius: '8px',
                              fontSize: '12px',
                              fontWeight: 600,
                              color: esc.isOverdue ? '#BE123C' : '#94A3B8',
                              cursor: esc.isOverdue ? 'pointer' : 'default',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px'
                            }}
                          >
                            <Phone size={13} />
                            <span>{esc.isOverdue ? 'Call lister' : 'Within window'}</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* =============================================================
            TAB 2: VERIFICATION QUEUE (MATCHING rentivo-admin-verification.html)
           ============================================================= */}
        {activeSection === 'verification' && (
          <div>
            {/* Topline Header */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              gap: '20px',
              flexWrap: 'wrap',
              marginBottom: '20px'
            }}>
              <div>
                <h1 style={{ fontSize: '24px', fontWeight: 800, margin: '0 0 4px', letterSpacing: '-0.01em', color: '#000052' }}>
                  Verification queue
                </h1>
                <p style={{ margin: 0, fontSize: '13.5px', color: '#636377' }}>
                  Every listing needing a physical inspection before it can carry the Verified badge.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (filteredVerificationItems.length > 0) {
                    handleOpenModal(filteredVerificationItems[0]);
                  }
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  border: 'none',
                  backgroundColor: '#000052',
                  color: '#FFFFFF',
                  padding: '9px 16px',
                  borderRadius: '10px',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 2px 6px rgba(0, 0, 82, 0.15)'
                }}
              >
                <UserPlus size={15} />
                <span>Assign inspector</span>
              </button>
            </div>

            {/* 4 Stat Strip Cards */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '14px',
              marginBottom: '22px'
            }}>
              <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E6E3EE', borderRadius: '14px', padding: '16px' }}>
                <div style={{ fontSize: '11.5px', fontWeight: 700, color: '#636377', textTransform: 'uppercase', letterSpacing: '0.03em', marginBottom: '8px' }}>
                  Awaiting inspection
                </div>
                <div style={{ fontSize: '26px', fontWeight: 800, color: '#000052' }}>11</div>
                <div style={{ fontSize: '11.5px', color: '#636377', marginTop: '6px' }}>4 unassigned</div>
              </div>

              <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E6E3EE', borderRadius: '14px', padding: '16px' }}>
                <div style={{ fontSize: '11.5px', fontWeight: 700, color: '#636377', textTransform: 'uppercase', letterSpacing: '0.03em', marginBottom: '8px' }}>
                  Avg time to inspection
                </div>
                <div style={{ fontSize: '26px', fontWeight: 800, color: '#000052' }}>1.8 days</div>
                <div style={{ fontSize: '11.5px', color: '#636377', marginTop: '6px' }}>Target: under 2 days</div>
              </div>

              <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E6E3EE', borderRadius: '14px', padding: '16px' }}>
                <div style={{ fontSize: '11.5px', fontWeight: 700, color: '#636377', textTransform: 'uppercase', letterSpacing: '0.03em', marginBottom: '8px' }}>
                  Verified rate
                </div>
                <div style={{ fontSize: '26px', fontWeight: 800, color: '#000052' }}>69%</div>
                <div style={{ fontSize: '11.5px', color: '#636377', marginTop: '6px' }}>98 of 142 active listings</div>
              </div>

              <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E6E3EE', borderRadius: '14px', padding: '16px' }}>
                <div style={{ fontSize: '11.5px', fontWeight: 700, color: '#636377', textTransform: 'uppercase', letterSpacing: '0.03em', marginBottom: '8px' }}>
                  Overdue (48h+)
                </div>
                <div style={{ fontSize: '26px', fontWeight: 800, color: '#BE123C' }}>3</div>
                <div style={{ fontSize: '11.5px', color: '#636377', marginTop: '6px' }}>Needs inspector reassignment</div>
              </div>
            </div>

            {/* Toolbar */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '14px',
              flexWrap: 'wrap',
              backgroundColor: '#FFFFFF',
              border: '1px solid #E6E3EE',
              borderRadius: '14px 14px 0 0',
              padding: '14px 18px'
            }}>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                {/* Segmented Status Tabs */}
                <div style={{
                  display: 'flex',
                  gap: '4px',
                  backgroundColor: '#F7F8FA',
                  borderRadius: '10px',
                  padding: '4px'
                }}>
                  {(['all', 'pending', 'scheduled', 'progress', 'completed'] as const).map(tab => {
                    const isActive = activeVerifTab === tab;
                    const labels = {
                      all: `All (${tabCounts.all})`,
                      pending: `Pending (${tabCounts.pending})`,
                      scheduled: `Scheduled (${tabCounts.scheduled})`,
                      progress: `In progress (${tabCounts.progress})`,
                      completed: `Completed (${tabCounts.completed})`
                    };
                    return (
                      <button
                        key={tab}
                        type="button"
                        onClick={() => setActiveVerifTab(tab)}
                        style={{
                          fontSize: '12.5px',
                          fontWeight: 600,
                          color: isActive ? '#000052' : '#636377',
                          backgroundColor: isActive ? '#FFFFFF' : 'transparent',
                          boxShadow: isActive ? '0 2px 6px rgba(23, 23, 43, 0.08)' : 'none',
                          border: 'none',
                          padding: '7px 13px',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        {labels[tab]}
                      </button>
                    );
                  })}
                </div>

                {/* Area Dropdown Filter */}
                <select
                  value={areaFilter}
                  onChange={(e) => setAreaFilter(e.target.value)}
                  style={{
                    border: '1px solid #E6E3EE',
                    borderRadius: '9px',
                    padding: '8px 11px',
                    fontSize: '12.5px',
                    fontWeight: 600,
                    color: '#17172B',
                    backgroundColor: '#FFFFFF',
                    cursor: 'pointer',
                    outline: 'none'
                  }}
                >
                  <option>All areas</option>
                  <option>Bodija</option>
                  <option>Ring Road</option>
                  <option>Sango</option>
                  <option>UI area</option>
                  <option>Jericho</option>
                  <option>Iwo Road</option>
                </select>

                {/* Inspector Dropdown Filter */}
                <select
                  value={inspectorFilter}
                  onChange={(e) => setInspectorFilter(e.target.value)}
                  style={{
                    border: '1px solid #E6E3EE',
                    borderRadius: '9px',
                    padding: '8px 11px',
                    fontSize: '12.5px',
                    fontWeight: 600,
                    color: '#17172B',
                    backgroundColor: '#FFFFFF',
                    cursor: 'pointer',
                    outline: 'none'
                  }}
                >
                  <option>All inspectors</option>
                  <option>Tayo A.</option>
                  <option>Musa I.</option>
                  <option>Unassigned</option>
                </select>
              </div>

              {/* Search Bar */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '7px',
                border: '1px solid #E6E3EE',
                borderRadius: '9px',
                padding: '8px 12px',
                backgroundColor: '#FFFFFF'
              }}>
                <Search size={14} color="#636377" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search property or lister..."
                  style={{
                    border: 'none',
                    outline: 'none',
                    fontSize: '12.5px',
                    width: '180px',
                    color: '#17172B'
                  }}
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: 0 }}
                  >
                    <X size={13} />
                  </button>
                )}
              </div>
            </div>

            {/* Floating Bulk Action Bar */}
            {selectedRowIds.length > 0 && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '14px',
                backgroundColor: '#000052',
                color: '#FFFFFF',
                padding: '12px 18px',
                fontSize: '13px',
                fontWeight: 600,
                flexWrap: 'wrap'
              }}>
                <span>{selectedRowIds.length} properties selected</span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => showToast(`Assigned inspector to ${selectedRowIds.length} selected properties.`)}
                    style={{
                      border: '1px solid rgba(255, 255, 255, 0.25)',
                      backgroundColor: 'rgba(255, 255, 255, 0.08)',
                      color: '#FFFFFF',
                      padding: '7px 12px',
                      borderRadius: '8px',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <UserPlus size={14} />
                    <span>Assign inspector</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => showToast(`Inspection visit scheduled for ${selectedRowIds.length} properties.`)}
                    style={{
                      border: '1px solid rgba(255, 255, 255, 0.25)',
                      backgroundColor: 'rgba(255, 255, 255, 0.08)',
                      color: '#FFFFFF',
                      padding: '7px 12px',
                      borderRadius: '8px',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <CalendarCheck size={14} />
                    <span>Schedule visit</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedRowIds([])}
                    style={{
                      border: '1px solid rgba(255, 255, 255, 0.25)',
                      backgroundColor: 'rgba(255, 255, 255, 0.08)',
                      color: '#FFFFFF',
                      padding: '7px 12px',
                      borderRadius: '8px',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <X size={14} />
                    <span>Clear</span>
                  </button>
                </div>
              </div>
            )}

            {/* Verification Portfolio Table */}
            <div style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #E6E3EE',
              borderTop: selectedRowIds.length > 0 ? 'none' : '1px solid #E6E3EE',
              borderRadius: '0 0 14px 14px',
              overflow: 'hidden',
              marginBottom: '26px'
            }}>
              <div className="no-scrollbar" style={{ overflowX: 'auto', scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={{ width: '38px', padding: '11px 16px', backgroundColor: '#F7F8FA' }}>
                        <input
                          type="checkbox"
                          checked={selectedRowIds.length === filteredVerificationItems.length && filteredVerificationItems.length > 0}
                          onChange={handleToggleSelectAll}
                          style={{ cursor: 'pointer' }}
                        />
                      </th>
                      <th style={{ textAlign: 'left', fontSize: '10.5px', textTransform: 'uppercase', letterSpacing: '0.04em', color: '#636377', padding: '11px 16px', fontWeight: 700, backgroundColor: '#F7F8FA' }}>
                        Property
                      </th>
                      <th style={{ textAlign: 'left', fontSize: '10.5px', textTransform: 'uppercase', letterSpacing: '0.04em', color: '#636377', padding: '11px 16px', fontWeight: 700, backgroundColor: '#F7F8FA' }}>
                        Category
                      </th>
                      <th style={{ textAlign: 'left', fontSize: '10.5px', textTransform: 'uppercase', letterSpacing: '0.04em', color: '#636377', padding: '11px 16px', fontWeight: 700, backgroundColor: '#F7F8FA' }}>
                        Lister
                      </th>
                      <th style={{ textAlign: 'left', fontSize: '10.5px', textTransform: 'uppercase', letterSpacing: '0.04em', color: '#636377', padding: '11px 16px', fontWeight: 700, backgroundColor: '#F7F8FA' }}>
                        Submitted
                      </th>
                      <th style={{ textAlign: 'center', fontSize: '10.5px', textTransform: 'uppercase', letterSpacing: '0.04em', color: '#636377', padding: '11px 16px', fontWeight: 700, backgroundColor: '#F7F8FA' }}>
                        Status
                      </th>
                      <th style={{ textAlign: 'left', fontSize: '10.5px', textTransform: 'uppercase', letterSpacing: '0.04em', color: '#636377', padding: '11px 16px', fontWeight: 700, backgroundColor: '#F7F8FA' }}>
                        Inspector
                      </th>
                      <th style={{ textAlign: 'right', fontSize: '10.5px', textTransform: 'uppercase', letterSpacing: '0.04em', color: '#636377', padding: '11px 16px', fontWeight: 700, backgroundColor: '#F7F8FA' }}>
                        Days in queue
                      </th>
                      <th style={{ textAlign: 'right', width: '48px', padding: '11px 16px', backgroundColor: '#F7F8FA' }} />
                    </tr>
                  </thead>
                  <tbody>
                    {filteredVerificationItems.map(item => {
                      const isSelected = selectedRowIds.includes(item.id);
                      const statusBadges = {
                        pending: { bg: '#FFFBEB', color: '#B45309', border: '#FDE68A', dot: '#B45309', label: 'Pending' },
                        scheduled: { bg: '#EEF2FF', color: '#4338CA', border: '#C7D2FE', dot: '#4338CA', label: 'Scheduled' },
                        progress: { bg: '#F8FAFC', color: '#334155', border: '#E2E8F0', dot: '#334155', label: 'In progress' },
                        completed: { bg: '#ECFDF5', color: '#047857', border: '#A7F3D0', dot: '#047857', label: 'Completed' }
                      }[item.status];

                      return (
                        <tr
                          key={item.id}
                          onClick={() => handleOpenModal(item)}
                          style={{
                            borderTop: '1px solid #E6E3EE',
                            backgroundColor: isSelected ? '#F0E6FF' : item.isOverdue ? '#FFF1F2' : 'transparent',
                            cursor: 'pointer',
                            transition: 'background-color 0.12s ease'
                          }}
                          onMouseEnter={(e) => {
                            if (!isSelected && !item.isOverdue) e.currentTarget.style.backgroundColor = '#FAFAFD';
                          }}
                          onMouseLeave={(e) => {
                            if (!isSelected && !item.isOverdue) e.currentTarget.style.backgroundColor = 'transparent';
                          }}
                        >
                          <td style={{ padding: '13px 16px' }} onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => handleToggleRow(item.id, e as any)}
                              style={{ cursor: 'pointer' }}
                            />
                          </td>
                          <td style={{ padding: '13px 16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <img
                                src={item.photo}
                                alt=""
                                style={{ width: '42px', height: '42px', borderRadius: '9px', objectFit: 'cover' }}
                              />
                              <div>
                                <div style={{ fontWeight: 600, fontSize: '13.5px', color: '#17172B' }}>{item.title}</div>
                                <div style={{ fontSize: '11px', color: '#636377' }}>{item.area}</div>
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: '13px 16px' }}>
                            <span style={{
                              fontSize: '10.5px',
                              fontWeight: 600,
                              backgroundColor: '#F0E6FF',
                              color: '#000052',
                              padding: '3px 8px',
                              borderRadius: '6px'
                            }}>
                              {item.category}
                            </span>
                          </td>
                          <td style={{ padding: '13px 16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <div style={{
                                width: '26px',
                                height: '26px',
                                borderRadius: '50%',
                                backgroundColor: '#F0E6FF',
                                color: '#000052',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '10px',
                                fontWeight: 700
                              }}>
                                {item.listerInitials}
                              </div>
                              <span style={{ fontSize: '13px', fontWeight: 600, color: '#17172B' }}>{item.listerName}</span>
                            </div>
                          </td>
                          <td style={{ padding: '13px 16px', fontSize: '13px', color: '#636377' }}>
                            {item.submittedDate}
                          </td>
                          <td style={{ padding: '13px 16px', textAlign: 'center' }}>
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              fontSize: '11px',
                              fontWeight: 600,
                              padding: '4px 9px',
                              borderRadius: '999px',
                              backgroundColor: statusBadges.bg,
                              color: statusBadges.color,
                              border: `1px solid ${statusBadges.border}`
                            }}>
                              <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: statusBadges.dot }} />
                              <span>{statusBadges.label}</span>
                            </span>
                          </td>
                          <td style={{ padding: '13px 16px', fontSize: '12.5px', color: item.inspector === 'Unassigned' ? '#636377' : '#17172B', fontStyle: item.inspector === 'Unassigned' ? 'italic' : 'normal' }}>
                            {item.inspector}
                          </td>
                          <td style={{
                            padding: '13px 16px',
                            textAlign: 'right',
                            fontSize: '13px',
                            fontWeight: item.isOverdue ? 700 : 500,
                            color: item.isOverdue ? '#BE123C' : '#636377'
                          }}>
                            {item.daysInQueue > 0 ? item.daysInQueue : '—'}
                          </td>
                          <td style={{ padding: '13px 16px', position: 'relative', textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveMenuId(activeMenuId === item.id ? null : item.id);
                              }}
                              style={{
                                border: '1px solid #E6E3EE',
                                backgroundColor: '#FFFFFF',
                                width: '28px',
                                height: '28px',
                                borderRadius: '8px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer'
                              }}
                            >
                              <MoreVertical size={14} color="#636377" />
                            </button>

                            {/* Row Dropdown Action Menu */}
                            {activeMenuId === item.id && (
                              <div style={{
                                position: 'absolute',
                                right: '16px',
                                top: '38px',
                                backgroundColor: '#FFFFFF',
                                border: '1px solid #E6E3EE',
                                borderRadius: '10px',
                                boxShadow: '0 12px 30px rgba(23, 23, 43, 0.14)',
                                minWidth: '176px',
                                padding: '6px',
                                zIndex: 100,
                                textAlign: 'left'
                              }}>
                                <button
                                  type="button"
                                  onClick={() => {
                                    handleOpenModal(item);
                                    setActiveMenuId(null);
                                  }}
                                  style={{
                                    width: '100%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '9px',
                                    background: 'none',
                                    border: 'none',
                                    padding: '9px 10px',
                                    borderRadius: '7px',
                                    fontSize: '12.5px',
                                    fontWeight: 500,
                                    color: '#17172B',
                                    cursor: 'pointer'
                                  }}
                                >
                                  <Eye size={14} />
                                  <span>View details</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    handleOpenModal(item);
                                    setActiveMenuId(null);
                                  }}
                                  style={{
                                    width: '100%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '9px',
                                    background: 'none',
                                    border: 'none',
                                    padding: '9px 10px',
                                    borderRadius: '7px',
                                    fontSize: '12.5px',
                                    fontWeight: 500,
                                    color: '#17172B',
                                    cursor: 'pointer'
                                  }}
                                >
                                  <CalendarCheck size={14} />
                                  <span>Schedule visit</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    handleApproveVerificationAction(item);
                                    setActiveMenuId(null);
                                  }}
                                  style={{
                                    width: '100%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '9px',
                                    background: 'none',
                                    border: 'none',
                                    padding: '9px 10px',
                                    borderRadius: '7px',
                                    fontSize: '12.5px',
                                    fontWeight: 600,
                                    color: '#047857',
                                    cursor: 'pointer'
                                  }}
                                >
                                  <ShieldCheck size={14} />
                                  <span>Approve verified</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    handleRequestChanges(item);
                                    setActiveMenuId(null);
                                  }}
                                  style={{
                                    width: '100%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '9px',
                                    background: 'none',
                                    border: 'none',
                                    padding: '9px 10px',
                                    borderRadius: '7px',
                                    fontSize: '12.5px',
                                    fontWeight: 500,
                                    color: '#B45309',
                                    cursor: 'pointer'
                                  }}
                                >
                                  <MessageSquare size={14} />
                                  <span>Request changes</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    handleRevoke(item);
                                    setActiveMenuId(null);
                                  }}
                                  style={{
                                    width: '100%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '9px',
                                    background: 'none',
                                    border: 'none',
                                    padding: '9px 10px',
                                    borderRadius: '7px',
                                    fontSize: '12.5px',
                                    fontWeight: 600,
                                    color: '#BE123C',
                                    cursor: 'pointer'
                                  }}
                                >
                                  <Ban size={14} />
                                  <span>Revoke status</span>
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* =============================================================
            TAB 3: ESCALATIONS (DEDICATED FULL VIEW)
           ============================================================= */}
        {activeSection === 'escalations' && (
          <div>
            <div style={{ marginBottom: '22px' }}>
              <h1 style={{ fontSize: '24px', fontWeight: 800, margin: '0 0 4px', color: '#000052' }}>
                Availability Escalations
              </h1>
              <p style={{ margin: 0, fontSize: '13.5px', color: '#636377' }}>
                Seeker access requests where the landlord has exceeded the response threshold.
              </p>
            </div>

            <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E6E3EE', borderRadius: '16px', overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid #E6E3EE', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '14px', fontWeight: 700, color: '#000052' }}>
                  Active Escalations ({escalations.length})
                </span>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#BE123C', backgroundColor: '#FFF1F2', padding: '3px 10px', borderRadius: '20px' }}>
                  2 urgent timeouts
                </span>
              </div>

              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', fontSize: '11px', textTransform: 'uppercase', color: '#636377', padding: '11px 18px' }}>Property</th>
                    <th style={{ textAlign: 'left', fontSize: '11px', textTransform: 'uppercase', color: '#636377', padding: '11px 18px' }}>Applicant</th>
                    <th style={{ textAlign: 'left', fontSize: '11px', textTransform: 'uppercase', color: '#636377', padding: '11px 18px' }}>Elapsed</th>
                    <th style={{ textAlign: 'left', fontSize: '11px', textTransform: 'uppercase', color: '#636377', padding: '11px 18px' }}>Lister Phone</th>
                    <th style={{ textAlign: 'right', fontSize: '11px', textTransform: 'uppercase', color: '#636377', padding: '11px 18px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {escalations.map(esc => (
                    <tr key={esc.id} style={{ borderTop: '1px solid #E6E3EE', backgroundColor: esc.isOverdue ? '#FFF1F2' : 'transparent' }}>
                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ fontWeight: 700, fontSize: '13.5px', color: '#000052' }}>{esc.listingTitle}</div>
                        <div style={{ fontSize: '11px', color: '#636377' }}>{esc.area}</div>
                      </td>
                      <td style={{ padding: '14px 18px', fontSize: '13px', fontWeight: 600 }}>{esc.renterName}</td>
                      <td style={{ padding: '14px 18px', fontSize: '13px', fontWeight: 700, color: esc.isOverdue ? '#BE123C' : '#636377' }}>
                        {esc.timeSinceRequest}
                      </td>
                      <td style={{ padding: '14px 18px', fontSize: '13px', color: '#17172B' }}>
                        {esc.listerName} ({esc.listerPhone})
                      </td>
                      <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                        <button
                          type="button"
                          onClick={() => handleCallLister(esc)}
                          style={{
                            backgroundColor: '#BE123C',
                            color: '#FFFFFF',
                            border: 'none',
                            borderRadius: '8px',
                            padding: '8px 14px',
                            fontSize: '12px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px'
                          }}
                        >
                          <Phone size={13} />
                          <span>Call Lister</span>
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
            TAB 4: LISTINGS (MARKETPLACE CATALOG OVERVIEW)
           ============================================================= */}
        {activeSection === 'listings' && (
          <div>
            <div style={{ marginBottom: '22px' }}>
              <h1 style={{ fontSize: '24px', fontWeight: 800, margin: '0 0 4px', color: '#000052' }}>
                All Marketplace Listings ({listings.length})
              </h1>
              <p style={{ margin: 0, fontSize: '13.5px', color: '#636377' }}>
                Master directory of all properties published or drafted on Rentivo Ibadan.
              </p>
            </div>

            <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E6E3EE', borderRadius: '16px', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#F7F8FA' }}>
                    <th style={{ textAlign: 'left', padding: '12px 18px', fontSize: '11px', textTransform: 'uppercase', color: '#636377' }}>Property</th>
                    <th style={{ textAlign: 'left', padding: '12px 18px', fontSize: '11px', textTransform: 'uppercase', color: '#636377' }}>Price</th>
                    <th style={{ textAlign: 'left', padding: '12px 18px', fontSize: '11px', textTransform: 'uppercase', color: '#636377' }}>Lister</th>
                    <th style={{ textAlign: 'center', padding: '12px 18px', fontSize: '11px', textTransform: 'uppercase', color: '#636377' }}>Status</th>
                    <th style={{ textAlign: 'right', padding: '12px 18px', fontSize: '11px', textTransform: 'uppercase', color: '#636377' }}>Verification</th>
                  </tr>
                </thead>
                <tbody>
                  {listings.map(l => (
                    <tr key={l.id} style={{ borderTop: '1px solid #E6E3EE' }}>
                      <td style={{ padding: '12px 18px' }}>
                        <div style={{ fontWeight: 700, fontSize: '13px', color: '#000052' }}>{l.title}</div>
                        <div style={{ fontSize: '11px', color: '#636377' }}>{l.area}, Ibadan · {l.type}</div>
                      </td>
                      <td style={{ padding: '12px 18px', fontSize: '13px', fontWeight: 700, color: '#000052' }}>
                        {formatNaira(l.price)}
                      </td>
                      <td style={{ padding: '12px 18px', fontSize: '13px', color: '#17172B' }}>
                        {l.lister?.fullName || 'Landlord'}
                      </td>
                      <td style={{ padding: '12px 18px', textAlign: 'center' }}>
                        <span style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          backgroundColor: l.isAvailable ? '#ECFDF5' : '#FFF1F2',
                          color: l.isAvailable ? '#047857' : '#BE123C',
                          padding: '3px 8px',
                          borderRadius: '999px'
                        }}>
                          {l.isAvailable ? 'Available' : 'Occupied'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 18px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', alignItems: 'center' }}>
                          {l.verificationStatus === 'verified' ? (
                            <span style={{ fontSize: '11px', fontWeight: 700, color: '#047857', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              <ShieldCheck size={14} /> Verified
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                if (l.isApproved === false || l.moderationStatus === 'pending_approval') {
                                  void listingsService.moderateListing(l.id, 'approve');
                                  showToast(`Published "${l.title}"`);
                                } else {
                                  onApproveVerification(l.id);
                                }
                              }}
                              style={{
                                backgroundColor: '#000052',
                                color: '#FFFFFF',
                                border: 'none',
                                padding: '5px 10px',
                                borderRadius: '6px',
                                fontSize: '11px',
                                fontWeight: 700,
                                cursor: 'pointer'
                              }}
                            >
                              Approve
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              setRejectModalListing(l);
                              setRejectCategory('Blurry or unverified photos');
                              setRejectNotes('');
                            }}
                            style={{
                              backgroundColor: '#FEF2F2',
                              color: '#DC2626',
                              border: '1px solid #FECACA',
                              padding: '5px 10px',
                              borderRadius: '6px',
                              fontSize: '11px',
                              fontWeight: 700,
                              cursor: 'pointer'
                            }}
                          >
                            Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* =============================================================
            TAB 5: USERS & ROLES
           ============================================================= */}
        {activeSection === 'users' && (
          <div>
            <div style={{ marginBottom: '22px' }}>
              <h1 style={{ fontSize: '24px', fontWeight: 800, margin: '0 0 4px', color: '#000052' }}>
                User Directory & Roles
              </h1>
              <p style={{ margin: 0, fontSize: '13.5px', color: '#636377' }}>
                Platform participants across landlords, seekers, field inspectors, and administrators.
              </p>
            </div>

            <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E6E3EE', borderRadius: '16px', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#F7F8FA' }}>
                    <th style={{ textAlign: 'left', padding: '12px 18px', fontSize: '11px', textTransform: 'uppercase', color: '#636377' }}>User</th>
                    <th style={{ textAlign: 'left', padding: '12px 18px', fontSize: '11px', textTransform: 'uppercase', color: '#636377' }}>Role</th>
                    <th style={{ textAlign: 'left', padding: '12px 18px', fontSize: '11px', textTransform: 'uppercase', color: '#636377' }}>Location</th>
                    <th style={{ textAlign: 'center', padding: '12px 18px', fontSize: '11px', textTransform: 'uppercase', color: '#636377' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { name: 'Abdul Rahman Adebambo', role: 'Landlord', location: 'Bodija, Ibadan', status: 'Active', initials: 'AR' },
                    { name: 'Tayo Adeyemi', role: 'Field Inspector', location: 'Agodi GRA, Ibadan', status: 'Active', initials: 'TA' },
                    { name: 'Musa Ibrahim', role: 'Field Inspector', location: 'Ring Road, Ibadan', status: 'Active', initials: 'MI' },
                    { name: 'Olawale Balogun', role: 'Seeker', location: 'Akobo, Ibadan', status: 'Active', initials: 'OB' }
                  ].map((u, i) => (
                    <tr key={i} style={{ borderTop: '1px solid #E6E3EE' }}>
                      <td style={{ padding: '12px 18px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: '#000052', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700 }}>
                            {u.initials}
                          </div>
                          <span style={{ fontWeight: 600, fontSize: '13px' }}>{u.name}</span>
                        </div>
                      </td>
                      <td style={{ padding: '12px 18px', fontSize: '12px', fontWeight: 700, color: '#000052' }}>{u.role}</td>
                      <td style={{ padding: '12px 18px', fontSize: '13px', color: '#636377' }}>{u.location}</td>
                      <td style={{ padding: '12px 18px', textAlign: 'center' }}>
                        <span style={{ fontSize: '11px', fontWeight: 700, color: '#047857', backgroundColor: '#ECFDF5', padding: '2px 8px', borderRadius: '999px' }}>
                          {u.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeSection === 'payments' && (
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: '#000052' }}>Paystack ledger</h1>
            <p style={{ color: '#636377', marginBottom: 18 }}>₦5,000 access fees, references, and refunds.</p>
            <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 12, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#F8FAFC', textAlign: 'left' }}>
                    <th style={{ padding: 12, fontSize: 12 }}>Date</th>
                    <th style={{ padding: 12, fontSize: 12 }}>Request</th>
                    <th style={{ padding: 12, fontSize: 12 }}>Renter</th>
                    <th style={{ padding: 12, fontSize: 12 }}>Reference</th>
                    <th style={{ padding: 12, fontSize: 12 }}>Amount</th>
                    <th style={{ padding: 12, fontSize: 12 }}>Status</th>
                    <th style={{ padding: 12, fontSize: 12 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p) => (
                    <tr key={p.id} style={{ borderTop: '1px solid #E2E8F0' }}>
                      <td style={{ padding: 12, fontSize: 13 }}>{new Date(p.createdAt).toLocaleString()}</td>
                      <td style={{ padding: 12, fontSize: 13 }}>{p.requestId.slice(0, 8)}</td>
                      <td style={{ padding: 12, fontSize: 13 }}>{p.renterName || p.renterEmail || '—'}</td>
                      <td style={{ padding: 12, fontSize: 12, fontFamily: 'monospace' }}>{p.reference}</td>
                      <td style={{ padding: 12, fontSize: 13 }}>{formatNaira(p.amount)}</td>
                      <td style={{ padding: 12, fontSize: 12, fontWeight: 700 }}>{p.status}</td>
                      <td style={{ padding: 12 }}>
                        {p.status === 'success' && (
                          <button
                            type="button"
                            onClick={() => {
                              void paymentsService.refund(p.id, 'Admin refund').then(() => {
                                showToast('Refund issued');
                                void paymentsService.listPayments().then(setPayments);
                              });
                            }}
                            style={{ background: '#fff', border: '1px solid #FCA5A5', color: '#B91C1C', borderRadius: 6, padding: '4px 8px', fontWeight: 700, cursor: 'pointer' }}
                          >
                            Issue refund
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {payments.length === 0 && (
                    <tr><td colSpan={7} style={{ padding: 24, color: '#64748B' }}>No Paystack transactions yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* =============================================================
            TAB 6: REPORTS & DISPUTES (FR-6.4 Community Reports & Disputes)
           ============================================================= */}
        {activeSection === 'reports' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '22px', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h1 style={{ fontSize: '24px', fontWeight: 800, margin: '0 0 4px', color: '#000052' }}>
                  Disputes &amp; Listing Reports Queue
                </h1>
                <p style={{ margin: 0, fontSize: '13.5px', color: '#636377' }}>
                  Seeker complaints, price discrepancies, and mandate disputes requiring admin resolution.
                </p>
              </div>

              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                backgroundColor: '#FEF2F2',
                border: '1px solid #FECACA',
                padding: '8px 14px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 700,
                color: '#991B1B'
              }}>
                <Flag size={15} color="#DC2626" />
                <span>{reports.filter(r => r.status === 'pending').length} Action Required</span>
              </div>
            </div>

            <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E6E3EE', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
              <div className="no-scrollbar" style={{ overflowX: 'auto', scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#64748B', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      <th style={{ padding: '14px 18px' }}>Report ID / Date</th>
                      <th style={{ padding: '14px 16px', minWidth: '220px' }}>Flagged Property</th>
                      <th style={{ padding: '14px 16px', minWidth: '160px' }}>Lister Details</th>
                      <th style={{ padding: '14px 16px', minWidth: '150px' }}>Reason</th>
                      <th style={{ padding: '14px 16px', minWidth: '240px' }}>Dispute Details &amp; Reporter</th>
                      <th style={{ padding: '14px 16px', minWidth: '110px' }}>Status</th>
                      <th style={{ padding: '14px 20px', textAlign: 'right', minWidth: '160px' }}>Moderation Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reports.length === 0 ? (
                      <tr>
                        <td colSpan={7} style={{ padding: '48px 24px', textAlign: 'center', color: '#64748B' }}>
                          No disputes or reported listings currently logged.
                        </td>
                      </tr>
                    ) : (
                      reports.map(report => {
                        const isPending = report.status === 'pending';
                        const isInvestigating = report.status === 'investigating';
                        const isDismissed = report.status === 'dismissed';
                        const isResolved = report.status === 'resolved';

                        const reasonColor = report.reason === 'Already Rented'
                          ? { bg: '#FEF2F2', text: '#991B1B', border: '#FECACA' }
                          : report.reason === 'Price Changed'
                          ? { bg: '#FFFBEB', text: '#92400E', border: '#FDE68A' }
                          : report.reason === 'Misleading Photos'
                          ? { bg: '#EFF6FF', text: '#1E40AF', border: '#BFDBFE' }
                          : { bg: '#FAF5FF', text: '#6B21A8', border: '#E9D5FF' };

                        return (
                          <tr key={report.id} style={{ borderBottom: '1px solid #F1F5F9', backgroundColor: isPending ? '#FFFDFD' : '#FFFFFF' }}>
                            <td style={{ padding: '14px 18px' }}>
                              <span style={{ fontFamily: 'monospace', fontWeight: 800, color: '#000052', fontSize: '12px' }}>
                                {report.id}
                              </span>
                              <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '2px' }}>
                                {report.reportedAt}
                              </div>
                            </td>

                            <td style={{ padding: '14px 16px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                {report.listingPhoto && (
                                  <img
                                    src={report.listingPhoto}
                                    alt=""
                                    style={{ width: '40px', height: '40px', borderRadius: '6px', objectFit: 'cover', border: '1px solid #CBD5E1', flexShrink: 0 }}
                                  />
                                )}
                                <div>
                                  <div style={{ fontWeight: 700, color: '#000052', lineHeight: 1.3 }}>
                                    {report.listingTitle}
                                  </div>
                                  <div style={{ fontSize: '11px', color: '#64748B' }}>
                                    {report.listingArea}, Ibadan
                                  </div>
                                </div>
                              </div>
                            </td>

                            <td style={{ padding: '14px 16px' }}>
                              <div style={{ fontWeight: 700, color: '#000052' }}>{report.listerName}</div>
                              <div style={{ fontSize: '11px', color: '#64748B' }}>{report.listerPhone || 'Phone on file'}</div>
                            </td>

                            <td style={{ padding: '14px 16px' }}>
                              <span style={{
                                backgroundColor: reasonColor.bg,
                                color: reasonColor.text,
                                border: `1px solid ${reasonColor.border}`,
                                padding: '3px 8px',
                                borderRadius: '6px',
                                fontSize: '11px',
                                fontWeight: 700,
                                display: 'inline-block'
                              }}>
                                {report.reason}
                              </span>
                            </td>

                            <td style={{ padding: '14px 16px' }}>
                              <div style={{ fontSize: '12.5px', color: '#334155', lineHeight: 1.4 }}>
                                {report.details}
                              </div>
                              <div style={{ fontSize: '11px', color: '#64748B', marginTop: '3px' }}>
                                Reported by: <strong>{report.reporterName || 'Anonymous Seeker'}</strong> ({report.reporterEmail || 'Contact on file'})
                              </div>
                            </td>

                            <td style={{ padding: '14px 16px' }}>
                              <span style={{
                                backgroundColor: isPending ? '#FEF3C7' : isInvestigating ? '#EFF6FF' : isResolved ? '#ECFDF5' : '#F1F5F9',
                                color: isPending ? '#B45309' : isInvestigating ? '#1E40AF' : isResolved ? '#065F46' : '#64748B',
                                border: `1px solid ${isPending ? '#FDE68A' : isInvestigating ? '#BFDBFE' : isResolved ? '#A7F3D0' : '#CBD5E1'}`,
                                padding: '2px 8px',
                                borderRadius: '999px',
                                fontSize: '11px',
                                fontWeight: 700,
                                textTransform: 'capitalize'
                              }}>
                                {report.status}
                              </span>
                            </td>

                            <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                <button
                                  type="button"
                                  onClick={() => setContactingReportItem(report)}
                                  style={{
                                    backgroundColor: '#FFFFFF',
                                    border: '1.5px solid #000052',
                                    color: '#000052',
                                    borderRadius: '6px',
                                    padding: '5px 9px',
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    cursor: 'pointer'
                                  }}
                                >
                                  Contact Lister
                                </button>

                                {!isDismissed && (
                                  <button
                                    type="button"
                                    onClick={() => handleDismissReport(report.id)}
                                    style={{
                                      backgroundColor: '#F1F5F9',
                                      border: '1px solid #CBD5E1',
                                      color: '#475569',
                                      borderRadius: '6px',
                                      padding: '5px 8px',
                                      fontSize: '11px',
                                      fontWeight: 600,
                                      cursor: 'pointer'
                                    }}
                                  >
                                    Dismiss
                                  </button>
                                )}

                                {!isResolved && (
                                  <button
                                    type="button"
                                    onClick={() => handleDeactivateFlaggedListing(report)}
                                    style={{
                                      backgroundColor: '#FEF2F2',
                                      border: '1px solid #FECACA',
                                      color: '#DC2626',
                                      borderRadius: '6px',
                                      padding: '5px 8px',
                                      fontSize: '11px',
                                      fontWeight: 700,
                                      cursor: 'pointer'
                                    }}
                                  >
                                    Deactivate
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* =============================================================
            TAB 8: MULTI-CITY LOCATIONS & NEIGHBORHOODS REGISTRY (FR-7.6)
           ============================================================= */}
        {activeSection === 'locations' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '22px', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h1 style={{ fontSize: '24px', fontWeight: 800, margin: '0 0 4px', color: '#000052' }}>
                  Locations &amp; Neighborhoods Registry
                </h1>
                <p style={{ margin: 0, fontSize: '13.5px', color: '#636377' }}>
                  Manage active pilot coverage (Ibadan) and Phase 2 expansion cities across Nigeria.
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#000052', backgroundColor: '#EFF6FF', padding: '6px 14px', borderRadius: '999px', border: '1px solid #BFDBFE' }}>
                  Pilot City: Ibadan, Oyo State
                </span>
              </div>
            </div>

            {/* Quick Metrics Bar */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: '24px' }}>
              <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '16px 20px' }}>
                <div style={{ fontSize: '11.5px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Active Cities</div>
                <div style={{ fontSize: '26px', fontWeight: 800, color: '#000052', marginTop: '4px' }}>{allCities.filter(c => c.isActive).length}</div>
                <div style={{ fontSize: '12px', color: '#16794A', marginTop: '4px', fontWeight: 600 }}>Ibadan (Pilot Live)</div>
              </div>
              <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '16px 20px' }}>
                <div style={{ fontSize: '11.5px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Ibadan Neighborhoods</div>
                <div style={{ fontSize: '26px', fontWeight: 800, color: '#000052', marginTop: '4px' }}>
                  {allCities.find(c => c.name.toLowerCase() === 'ibadan')?.areas.length || 0}
                </div>
                <div style={{ fontSize: '12px', color: '#636377', marginTop: '4px' }}>Verified coverage zones</div>
              </div>
              <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '16px 20px' }}>
                <div style={{ fontSize: '11.5px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Phase 2 Pipeline</div>
                <div style={{ fontSize: '26px', fontWeight: 800, color: '#000052', marginTop: '4px' }}>
                  {allCities.filter(c => !c.isActive).length}
                </div>
                <div style={{ fontSize: '12px', color: '#D97706', marginTop: '4px', fontWeight: 600 }}>Staged for rollout</div>
              </div>
            </div>

            {/* City Registry Table */}
            <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E6E3EE', borderRadius: '16px', overflow: 'hidden', marginBottom: '24px' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#000052' }}>Marketplace Coverage Directory</h3>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#64748B', fontSize: '11px', textTransform: 'uppercase' }}>
                    <th style={{ textAlign: 'left', padding: '12px 18px' }}>City &amp; State</th>
                    <th style={{ textAlign: 'left', padding: '12px 18px' }}>Operational Status</th>
                    <th style={{ textAlign: 'left', padding: '12px 18px' }}>Registered Neighborhoods</th>
                  </tr>
                </thead>
                <tbody>
                  {allCities.map(city => (
                    <tr key={city.id} style={{ borderTop: '1px solid #E2E8F0' }}>
                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ fontWeight: 800, color: '#000052', fontSize: '14px' }}>{city.name}</div>
                        <div style={{ fontSize: '12px', color: '#64748B' }}>{city.state} State</div>
                      </td>
                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {city.isPilot && (
                            <span style={{ fontSize: '11px', fontWeight: 800, backgroundColor: '#000052', color: '#FFFFFF', padding: '3px 8px', borderRadius: '999px' }}>
                              Pilot City
                            </span>
                          )}
                          <span style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            backgroundColor: city.isActive ? '#ECFDF5' : '#FEF3C7',
                            color: city.isActive ? '#065F46' : '#92400E',
                            padding: '3px 8px',
                            borderRadius: '999px'
                          }}>
                            {city.isActive ? 'Active Operations' : 'Phase 2 Staged'}
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                          {city.areas.map(area => (
                            <span key={area} style={{ backgroundColor: '#F1F5F9', color: '#000052', fontSize: '11.5px', fontWeight: 600, padding: '3px 8px', borderRadius: '6px' }}>
                              {area}
                            </span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Quick Management Forms Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '20px' }}>
              {/* Form 1: Add Neighborhood to Ibadan */}
              <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E6E3EE', borderRadius: '16px', padding: '20px' }}>
                <h3 style={{ margin: '0 0 4px', fontSize: '15px', fontWeight: 800, color: '#000052' }}>
                  Add Neighborhood to City
                </h3>
                <p style={{ margin: '0 0 16px', fontSize: '12.5px', color: '#636377' }}>
                  Expand searchable areas for property listings and tenant search filters.
                </p>
                <form onSubmit={handleAddArea} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#000052', marginBottom: '4px' }}>Target City</label>
                    <select
                      value={newAreaCity}
                      onChange={(e) => setNewAreaCity(e.target.value)}
                      style={{ width: '100%', height: '38px', borderRadius: '8px', border: '1px solid #CBD5E1', padding: '0 10px', fontSize: '13px' }}
                    >
                      {allCities.map(c => (
                        <option key={c.id} value={c.name}>{c.name} ({c.state})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#000052', marginBottom: '4px' }}>Neighborhood Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Oluyole Estate, Jericho, Samonda"
                      value={newAreaName}
                      onChange={(e) => setNewAreaName(e.target.value)}
                      style={{ width: '100%', height: '38px', borderRadius: '8px', border: '1px solid #CBD5E1', padding: '0 12px', fontSize: '13px', boxSizing: 'border-box' }}
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    style={{ backgroundColor: '#000052', color: '#FFFFFF', border: 'none', borderRadius: '8px', padding: '10px 16px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                  >
                    <Plus size={15} /> Add Neighborhood
                  </button>
                </form>
              </div>

              {/* Form 2: Register Expansion City */}
              <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E6E3EE', borderRadius: '16px', padding: '20px' }}>
                <h3 style={{ margin: '0 0 4px', fontSize: '15px', fontWeight: 800, color: '#000052' }}>
                  Register Expansion City (Phase 2)
                </h3>
                <p style={{ margin: '0 0 16px', fontSize: '12.5px', color: '#636377' }}>
                  Stage new metropolitan regions for Rentivo's staged Nigeria expansion.
                </p>
                <form onSubmit={handleAddCity} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#000052', marginBottom: '4px' }}>City Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Abeokuta, Osogbo, Lagos"
                      value={newCityName}
                      onChange={(e) => setNewCityName(e.target.value)}
                      style={{ width: '100%', height: '38px', borderRadius: '8px', border: '1px solid #CBD5E1', padding: '0 12px', fontSize: '13px', boxSizing: 'border-box' }}
                      required
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#000052', marginBottom: '4px' }}>State</label>
                    <input
                      type="text"
                      placeholder="e.g. Ogun, Osun, Lagos"
                      value={newCityState}
                      onChange={(e) => setNewCityState(e.target.value)}
                      style={{ width: '100%', height: '38px', borderRadius: '8px', border: '1px solid #CBD5E1', padding: '0 12px', fontSize: '13px', boxSizing: 'border-box' }}
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    style={{ backgroundColor: '#4338CA', color: '#FFFFFF', border: 'none', borderRadius: '8px', padding: '10px 16px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                  >
                    <Plus size={15} /> Register Expansion City
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* -------------------------------------------------------------
          REJECTION FEEDBACK MODAL (Listing Pre-Publish Moderation)
         ------------------------------------------------------------- */}
      {rejectModalListing && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 120,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          boxSizing: 'border-box'
        }}>
          <div
            onClick={() => setRejectModalListing(null)}
            style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)' }}
          />
          <div style={{
            position: 'relative',
            zIndex: 2,
            backgroundColor: '#FFFFFF',
            borderRadius: '16px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 82, 0.25)',
            width: '100%',
            maxWidth: '520px',
            padding: '24px',
            boxSizing: 'border-box'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div>
                <h3 style={{ margin: '0 0 4px', fontSize: '17px', fontWeight: 800, color: '#991B1B', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <AlertTriangle size={18} color="#DC2626" /> Reject Property Listing
                </h3>
                <p style={{ margin: 0, fontSize: '12.5px', color: '#636377' }}>
                  Provide specific compliance feedback. The lister will receive this feedback to revise their listing.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setRejectModalListing(null)}
                style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer', padding: 0 }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ backgroundColor: '#F8FAFC', padding: '12px 14px', borderRadius: '10px', border: '1px solid #E2E8F0', marginBottom: '16px' }}>
              <div style={{ fontWeight: 800, fontSize: '13px', color: '#000052' }}>{rejectModalListing.title}</div>
              <div style={{ fontSize: '11.5px', color: '#64748B', marginTop: '2px' }}>
                {rejectModalListing.area}, Ibadan · {formatNaira(rejectModalListing.price)} · Lister: {rejectModalListing.lister?.fullName || 'Lister'}
              </div>
            </div>

            <form onSubmit={handleConfirmReject} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#000052', marginBottom: '6px' }}>
                  Rejection Reason Category
                </label>
                <select
                  value={rejectCategory}
                  onChange={(e) => setRejectCategory(e.target.value)}
                  style={{ width: '100%', height: '38px', borderRadius: '8px', border: '1px solid #CBD5E1', padding: '0 10px', fontSize: '13px', outline: 'none' }}
                >
                  <option value="Blurry or unverified photos">Blurry or unverified photos</option>
                  <option value="Unrealistic or non-market price">Unrealistic or non-market price</option>
                  <option value="Unverified tenancy mandate">Unverified tenancy mandate</option>
                  <option value="Incomplete Ibadan address or missing landmarks">Incomplete Ibadan address or missing landmarks</option>
                  <option value="Duplicate property listing">Duplicate property listing</option>
                  <option value="Other content guideline violation">Other content guideline violation</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#000052', marginBottom: '6px' }}>
                  Detailed Correction Instructions
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. Please provide clear daytime photos of the living room and kitchen, or specify the exact street near Bodija market."
                  value={rejectNotes}
                  onChange={(e) => setRejectNotes(e.target.value)}
                  style={{ width: '100%', borderRadius: '8px', border: '1px solid #CBD5E1', padding: '10px 12px', fontSize: '13px', resize: 'vertical', boxSizing: 'border-box' }}
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={() => setRejectModalListing(null)}
                  style={{ backgroundColor: '#F1F5F9', color: '#475569', border: '1px solid #CBD5E1', padding: '9px 16px', borderRadius: '8px', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ backgroundColor: '#DC2626', color: '#FFFFFF', border: 'none', padding: '9px 18px', borderRadius: '8px', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}
                >
                  Confirm Rejection &amp; Notify Lister
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------
          CENTERED POPUP MODAL WITH SCROLLING PROGRESS LINE
          (Replaces the side drawer to pop directly in the main page)
         ------------------------------------------------------------- */}
      {isModalOpen && selectedVerifItem && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 100,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px 16px',
          boxSizing: 'border-box'
        }}>
          {/* Dimmed Backdrop Blur Overlay */}
          <div
            onClick={handleCloseModal}
            style={{
              position: 'absolute',
              inset: 0,
              backgroundColor: 'rgba(15, 23, 42, 0.65)',
              backdropFilter: 'blur(5px)',
              zIndex: 1,
              transition: 'opacity 0.25s ease'
            }}
          />

          {/* Centered Modal Card */}
          <div style={{
            position: 'relative',
            zIndex: 2,
            backgroundColor: '#FFFFFF',
            borderRadius: '16px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 82, 0.28), 0 0 0 1px rgba(0, 0, 82, 0.08)',
            width: '100%',
            maxWidth: '680px',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            animation: 'modalPop 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
          }}>

            {/* Top Indicator Pill Line */}
            <div style={{
              width: '42px',
              height: '4.5px',
              borderRadius: '9999px',
              backgroundColor: '#CBD5E1',
              margin: '10px auto 4px'
            }} />

            {/* Modal Header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 24px 16px',
              borderBottom: '1px solid #E6E3EE'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '8px',
                  backgroundColor: '#ECFDF5',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <ShieldCheck size={18} color="#047857" />
                </div>
                <div>
                  <h2 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: '#000052' }}>
                    Verification Detail & Inspection Audit
                  </h2>
                  <div style={{ fontSize: '12px', color: '#636377', marginTop: '2px' }}>
                    Physical accreditation audit for Ibadan marketplace listing
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleCloseModal}
                style={{
                  border: 'none',
                  backgroundColor: '#F7F8FA',
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'background-color 0.15s ease'
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#E2E8F0')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#F7F8FA')}
              >
                <X size={16} color="#636377" />
              </button>
            </div>

            {/* DYNAMIC SCROLL INDICATOR LINE (Scrolls as the user scrolls through content) */}
            <div style={{
              width: '100%',
              height: '3.5px',
              backgroundColor: '#F1F5F9',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <div style={{
                height: '100%',
                width: `${modalScrollProgress}%`,
                backgroundColor: '#000052',
                transition: 'width 0.1s ease',
                borderRadius: '0 2px 2px 0'
              }} />
            </div>

            {/* Scrollable Modal Content */}
            <div
              ref={modalBodyRef}
              onScroll={handleModalScroll}
              style={{
                padding: '22px 24px',
                overflowY: 'auto',
                flex: 1,
                scrollbarWidth: 'thin',
                scrollbarColor: '#CBD5E1 #F8FAFC'
              }}
            >
              {/* Property Snapshot Card */}
              <div style={{
                display: 'flex',
                gap: '16px',
                padding: '16px',
                backgroundColor: '#F8FAFC',
                borderRadius: '12px',
                border: '1px solid #E6E3EE',
                marginBottom: '20px'
              }}>
                <img
                  src={selectedVerifItem.photo}
                  alt=""
                  style={{
                    width: '74px',
                    height: '74px',
                    borderRadius: '10px',
                    objectFit: 'cover',
                    border: '1px solid #E2E8F0',
                    flexShrink: 0
                  }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span style={{
                      fontSize: '10.5px',
                      fontWeight: 800,
                      backgroundColor: '#F0E6FF',
                      color: '#000052',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      textTransform: 'uppercase'
                    }}>
                      {selectedVerifItem.category}
                    </span>
                    <span style={{ fontSize: '11px', color: '#636377' }}>
                      REF-{selectedVerifItem.listingId.slice(-4).toUpperCase()}
                    </span>
                  </div>

                  <h3 style={{
                    margin: '0 0 6px',
                    fontSize: '15px',
                    fontWeight: 800,
                    color: '#000052',
                    lineHeight: 1.3
                  }}>
                    {selectedVerifItem.title}
                  </h3>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '12.5px', color: '#475569' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <MapPin size={13} color="#16794A" />
                      <span>{selectedVerifItem.area}, Ibadan</span>
                    </span>
                    <span style={{ fontWeight: 800, color: '#000052' }}>
                      {formatNaira(selectedVerifItem.price)} /yr
                    </span>
                  </div>
                </div>
              </div>

              {/* Lister & Queue Timeline Metadata */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '12px',
                padding: '12px 16px',
                backgroundColor: '#FFFFFF',
                border: '1px solid #E6E3EE',
                borderRadius: '10px',
                marginBottom: '22px'
              }}>
                <div>
                  <div style={{ fontSize: '11px', color: '#636377', textTransform: 'uppercase', fontWeight: 700 }}>Lister Contact</div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#000052', marginTop: '2px' }}>{selectedVerifItem.listerName}</div>
                  <div style={{ fontSize: '11.5px', color: '#64748B' }}>{selectedVerifItem.listerPhone}</div>
                </div>

                <div>
                  <div style={{ fontSize: '11px', color: '#636377', textTransform: 'uppercase', fontWeight: 700 }}>Submitted</div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#000052', marginTop: '2px' }}>{selectedVerifItem.submittedDate}, 2026</div>
                  <div style={{ fontSize: '11.5px', color: '#64748B' }}>Physical queue</div>
                </div>

                <div>
                  <div style={{ fontSize: '11px', color: '#636377', textTransform: 'uppercase', fontWeight: 700 }}>Queue Age</div>
                  <div style={{
                    fontSize: '13px',
                    fontWeight: 800,
                    color: selectedVerifItem.isOverdue ? '#BE123C' : '#000052',
                    marginTop: '2px'
                  }}>
                    {selectedVerifItem.daysInQueue} days in queue
                  </div>
                  <div style={{ fontSize: '11.5px', color: selectedVerifItem.isOverdue ? '#BE123C' : '#64748B' }}>
                    {selectedVerifItem.isOverdue ? 'Overdue (reassign)' : 'Within target'}
                  </div>
                </div>
              </div>

              {/* Underlying Landlord Registry for Agent Lister (PRD Objective 7 & Persona 4) */}
              {(() => {
                const matched = listings.find(l => l.id === selectedVerifItem.listingId);
                if (matched?.listerRole === 'agent' && matched.underlyingLandlord) {
                  return (
                    <div style={{
                      padding: '14px 16px',
                      backgroundColor: '#EFF6FF',
                      border: '1.5px solid #BFDBFE',
                      borderRadius: '10px',
                      marginBottom: '22px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '12px'
                    }}>
                      <div>
                        <div style={{ fontSize: '11px', fontWeight: 800, color: '#1E40AF', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          Underlying Property Owner (Direct Landlord Registry)
                        </div>
                        <div style={{ fontSize: '13.5px', fontWeight: 800, color: '#000052', marginTop: '3px' }}>
                          {matched.underlyingLandlord.fullName} · {matched.underlyingLandlord.phone}
                        </div>
                        <div style={{ fontSize: '11.5px', color: '#475569', marginTop: '2px' }}>
                          Marketing Agent: {selectedVerifItem.listerName} (Mandate: {matched.underlyingLandlord.mandateConfirmed ? 'Confirmed' : 'Pending Verification'})
                        </div>
                      </div>
                      <span style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        color: '#047857',
                        backgroundColor: '#ECFDF5',
                        border: '1px solid #A7F3D0',
                        padding: '3px 10px',
                        borderRadius: '20px',
                        whiteSpace: 'nowrap'
                      }}>
                        Direct Owner Registered
                      </span>
                    </div>
                  );
                }
                return null;
              })()}

              {/* Assign Inspector & Schedule Date */}
              <div style={{ marginBottom: '22px' }}>
                <div style={{
                  fontSize: '12px',
                  fontWeight: 800,
                  color: '#000052',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  marginBottom: '10px'
                }}>
                  Assign & Schedule Inspection Visit
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#17172B', marginBottom: '6px' }}>
                      Accredited Field Inspector
                    </label>
                    <select
                      value={modalInspector}
                      onChange={(e) => setModalInspector(e.target.value)}
                      style={{
                        width: '100%',
                        height: '42px',
                        border: '1.5px solid #CBD5E1',
                        borderRadius: '8px',
                        padding: '0 12px',
                        fontSize: '13px',
                        fontWeight: 600,
                        color: '#000052',
                        backgroundColor: '#FFFFFF',
                        outline: 'none',
                        cursor: 'pointer'
                      }}
                    >
                      <option>Tayo A. (Central & North Ibadan)</option>
                      <option>Musa I. (South & Ring Road)</option>
                      <option>Unassigned</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#17172B', marginBottom: '6px' }}>
                      Scheduled Visit Date
                    </label>
                    <input
                      type="date"
                      value={modalInspectionDate}
                      onChange={(e) => setModalInspectionDate(e.target.value)}
                      style={{
                        width: '100%',
                        height: '42px',
                        border: '1.5px solid #CBD5E1',
                        borderRadius: '8px',
                        padding: '0 12px',
                        fontSize: '13px',
                        fontWeight: 600,
                        color: '#000052',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* 4-Point Physical Verification Checklist */}
              <div style={{ marginBottom: '22px' }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '10px'
                }}>
                  <div style={{
                    fontSize: '12px',
                    fontWeight: 800,
                    color: '#000052',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em'
                  }}>
                    On-Site Physical Audit Checklist
                  </div>

                  <button
                    type="button"
                    onClick={handleCheckAllChecklist}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#047857',
                      fontSize: '11.5px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <CheckCircle2 size={13} />
                    <span>Check all 4 requirements</span>
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {/* Item 1 */}
                  <label style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px',
                    padding: '12px 14px',
                    borderRadius: '8px',
                    border: modalChecklist.addressExists ? '1.5px solid #047857' : '1px solid #E6E3EE',
                    backgroundColor: modalChecklist.addressExists ? '#ECFDF5' : '#FFFFFF',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}>
                    <input
                      type="checkbox"
                      checked={modalChecklist.addressExists}
                      onChange={(e) => setModalChecklist({ ...modalChecklist, addressExists: e.target.checked })}
                      style={{ marginTop: '2px', accentColor: '#047857', width: '16px', height: '16px', flexShrink: 0 }}
                    />
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: modalChecklist.addressExists ? '#065F46' : '#17172B' }}>
                        Property exists at stated address
                      </div>
                      <div style={{ fontSize: '11.5px', color: '#636377', marginTop: '2px' }}>
                        Physical location confirmed with house number and prominent neighborhood landmarks in {selectedVerifItem.area}.
                      </div>
                    </div>
                  </label>

                  {/* Item 2 */}
                  <label style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px',
                    padding: '12px 14px',
                    borderRadius: '8px',
                    border: modalChecklist.detailsMatch ? '1.5px solid #047857' : '1px solid #E6E3EE',
                    backgroundColor: modalChecklist.detailsMatch ? '#ECFDF5' : '#FFFFFF',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}>
                    <input
                      type="checkbox"
                      checked={modalChecklist.detailsMatch}
                      onChange={(e) => setModalChecklist({ ...modalChecklist, detailsMatch: e.target.checked })}
                      style={{ marginTop: '2px', accentColor: '#047857', width: '16px', height: '16px', flexShrink: 0 }}
                    />
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: modalChecklist.detailsMatch ? '#065F46' : '#17172B' }}>
                        Listing details match on-site reality
                      </div>
                      <div style={{ fontSize: '11.5px', color: '#636377', marginTop: '2px' }}>
                        Verified bedrooms, water running from borehole, functional prepaid meter, and compound security.
                      </div>
                    </div>
                  </label>

                  {/* Item 3 */}
                  <label style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px',
                    padding: '12px 14px',
                    borderRadius: '8px',
                    border: modalChecklist.listerConfirmed ? '1.5px solid #047857' : '1px solid #E6E3EE',
                    backgroundColor: modalChecklist.listerConfirmed ? '#ECFDF5' : '#FFFFFF',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}>
                    <input
                      type="checkbox"
                      checked={modalChecklist.listerConfirmed}
                      onChange={(e) => setModalChecklist({ ...modalChecklist, listerConfirmed: e.target.checked })}
                      style={{ marginTop: '2px', accentColor: '#047857', width: '16px', height: '16px', flexShrink: 0 }}
                    />
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: modalChecklist.listerConfirmed ? '#065F46' : '#17172B' }}>
                        Lister identity & mandate confirmed on-site
                      </div>
                      <div style={{ fontSize: '11.5px', color: '#636377', marginTop: '2px' }}>
                        Direct landlord ownership title or verified management mandate confirmed with property caretaker.
                      </div>
                    </div>
                  </label>

                  {/* Item 4 */}
                  <label style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px',
                    padding: '12px 14px',
                    borderRadius: '8px',
                    border: modalChecklist.photosAccurate ? '1.5px solid #047857' : '1px solid #E6E3EE',
                    backgroundColor: modalChecklist.photosAccurate ? '#ECFDF5' : '#FFFFFF',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}>
                    <input
                      type="checkbox"
                      checked={modalChecklist.photosAccurate}
                      onChange={(e) => setModalChecklist({ ...modalChecklist, photosAccurate: e.target.checked })}
                      style={{ marginTop: '2px', accentColor: '#047857', width: '16px', height: '16px', flexShrink: 0 }}
                    />
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: modalChecklist.photosAccurate ? '#065F46' : '#17172B' }}>
                        Photos accurately represent current condition
                      </div>
                      <div style={{ fontSize: '11.5px', color: '#636377', marginTop: '2px' }}>
                        Confirmed zero deceptive angles or false staging; real photos match actual interior spaces.
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Approval Notes & Quick Template Suggestions */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#17172B', marginBottom: '6px' }}>
                  Auditor Notes (Shared with lister upon revision request)
                </label>
                <textarea
                  value={modalNotes}
                  onChange={(e) => setModalNotes(e.target.value)}
                  placeholder="e.g. Physical visit completed. Borehole and prepaid meter confirmed active. Approved for Emerald Verified Badge."
                  style={{
                    width: '100%',
                    border: '1.5px solid #CBD5E1',
                    borderRadius: '8px',
                    padding: '10px 12px',
                    fontSize: '13px',
                    color: '#17172B',
                    minHeight: '65px',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />

                {/* Quick note chips */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
                  {[
                    'All 4 points confirmed on-site',
                    'Kitchen photos need re-upload',
                    'Gate access and caretaker verified'
                  ].map((chip, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setModalNotes(chip)}
                      style={{
                        backgroundColor: '#F1F5F9',
                        border: '1px solid #CBD5E1',
                        borderRadius: '4px',
                        padding: '3px 8px',
                        fontSize: '11px',
                        color: '#000052',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      + {chip}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Sticky Modal Action Footer */}
            <div style={{
              padding: '16px 24px',
              borderTop: '1px solid #E6E3EE',
              backgroundColor: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px'
            }}>
              <button
                type="button"
                onClick={() => handleRevoke(selectedVerifItem)}
                style={{
                  background: 'none',
                  color: '#BE123C',
                  border: '1px solid #FECDD3',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer'
                }}
              >
                <Ban size={14} />
                <span>Revoke</span>
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => handleRequestChanges(selectedVerifItem)}
                  style={{
                    backgroundColor: '#FFFBEB',
                    color: '#B45309',
                    border: '1.5px solid #FDE68A',
                    padding: '10px 18px',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    cursor: 'pointer'
                  }}
                >
                  <MessageSquare size={15} />
                  <span>Request changes</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleApproveVerificationAction(selectedVerifItem)}
                  style={{
                    backgroundColor: '#047857',
                    color: '#FFFFFF',
                    border: 'none',
                    padding: '10px 22px',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(4, 120, 87, 0.25)'
                  }}
                >
                  <ShieldCheck size={16} />
                  <span>Approve verified badge</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* -------------------------------------------------------------
          CONTACT LISTER MODAL (FR-6.4 Dispute Resolution)
         ------------------------------------------------------------- */}
      {contactingReportItem && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 110,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div
            onClick={() => setContactingReportItem(null)}
            style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)' }}
          />
          <div style={{
            position: 'relative',
            zIndex: 2,
            backgroundColor: '#FFFFFF',
            borderRadius: '16px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 82, 0.25)',
            width: '100%',
            maxWidth: '520px',
            padding: '24px',
            boxSizing: 'border-box'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: '#000052' }}>
                  Contact Lister for Dispute Audit
                </h3>
                <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
                  Report REF: {contactingReportItem.id} · {contactingReportItem.reason}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setContactingReportItem(null)}
                style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer', padding: 0 }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ backgroundColor: '#F8FAFC', padding: '14px', borderRadius: '10px', border: '1px solid #E2E8F0', marginBottom: '18px' }}>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#000052', marginBottom: '4px' }}>
                {contactingReportItem.listingTitle}
              </div>
              <div style={{ fontSize: '12px', color: '#64748B', marginBottom: '10px' }}>
                Lister: <strong>{contactingReportItem.listerName}</strong> · {contactingReportItem.listingArea}
              </div>
              <div style={{ fontSize: '12.5px', color: '#991B1B', backgroundColor: '#FEF2F2', padding: '8px 10px', borderRadius: '6px', border: '1px solid #FECACA' }}>
                Dispute: "{contactingReportItem.details}"
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginBottom: '18px' }}>
              <a
                href={`tel:${contactingReportItem.listerPhone || '+2348000000000'}`}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  backgroundColor: '#000052',
                  color: '#FFFFFF',
                  padding: '11px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: 700,
                  textDecoration: 'none'
                }}
              >
                <Phone size={15} />
                <span>Call Lister ({contactingReportItem.listerPhone || 'Call'})</span>
              </a>

              <a
                href={`https://wa.me/${(contactingReportItem.listerPhone || '').replace(/[^0-9]/g, '')}?text=Hello%20from%20Rentivo%20Admin%20regarding%20${encodeURIComponent(contactingReportItem.listingTitle)}`}
                target="_blank"
                rel="noreferrer"
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  backgroundColor: '#16794A',
                  color: '#FFFFFF',
                  padding: '11px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: 700,
                  textDecoration: 'none'
                }}
              >
                <MessageSquare size={15} />
                <span>WhatsApp Audit</span>
              </a>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button
                type="button"
                onClick={() => {
                  reportsService.updateReportStatus(contactingReportItem.id, 'investigating');
                  setReports(reportsService.getReports());
                  setContactingReportItem(null);
                  showToast('Marked report as Under Investigation.');
                }}
                style={{
                  backgroundColor: '#EFF6FF',
                  border: '1px solid #BFDBFE',
                  color: '#1E40AF',
                  padding: '8px 14px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Mark Investigating
              </button>

              <button
                type="button"
                onClick={() => {
                  reportsService.updateReportStatus(contactingReportItem.id, 'resolved');
                  setReports(reportsService.getReports());
                  setContactingReportItem(null);
                  showToast('Dispute resolved.');
                }}
                style={{
                  backgroundColor: '#ECFDF5',
                  border: '1px solid #A7F3D0',
                  color: '#065F46',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Resolve &amp; Close Dispute
              </button>
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------
          LOCATION MANAGEMENT MODAL (FR-7.6 Multi-City Expansion)
         ------------------------------------------------------------- */}
      {isLocationModalOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 110,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px'
        }}>
          <div
            onClick={() => setIsLocationModalOpen(false)}
            style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)' }}
          />
          <div style={{
            position: 'relative',
            zIndex: 2,
            backgroundColor: '#FFFFFF',
            borderRadius: '16px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 82, 0.25)',
            width: '100%',
            maxWidth: '640px',
            maxHeight: '85vh',
            overflowY: 'auto',
            padding: '26px',
            boxSizing: 'border-box'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <MapPin size={22} color="#000052" />
                <div>
                  <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#000052' }}>
                    Multi-City Locations &amp; Area Registry
                  </h3>
                  <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
                    Manage pilot coverage (Ibadan) and Phase 2 expansion cities
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsLocationModalOpen(false)}
                style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer', padding: 0 }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Current Active Cities List */}
            <div style={{ marginBottom: '22px' }}>
              <div style={{ fontSize: '12px', fontWeight: 800, color: '#000052', textTransform: 'uppercase', marginBottom: '8px' }}>
                Active Marketplaces &amp; Pipeline Cities
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {allCities.map(city => (
                  <div
                    key={city.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: '1px solid #E2E8F0',
                      backgroundColor: city.isPilot ? '#EFF6FF' : '#FFFFFF'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '13.5px', color: '#000052' }}>
                        {city.name}, {city.state} State
                      </div>
                      <div style={{ fontSize: '11.5px', color: '#64748B', marginTop: '2px' }}>
                        {city.areas.length} verified neighborhoods: {city.areas.slice(0, 4).join(', ')}...
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {city.isPilot && (
                        <span style={{ fontSize: '11px', fontWeight: 700, backgroundColor: '#000052', color: '#FFFFFF', padding: '2px 8px', borderRadius: '12px' }}>
                          Pilot City
                        </span>
                      )}
                      <span style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        backgroundColor: city.isActive ? '#ECFDF5' : '#FEF3C7',
                        color: city.isActive ? '#065F46' : '#92400E',
                        padding: '2px 8px',
                        borderRadius: '12px'
                      }}>
                        {city.isActive ? 'Active' : 'Expansion Staged'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Add Neighborhood to Existing City */}
            <div style={{ backgroundColor: '#F8FAFC', padding: '16px', borderRadius: '10px', border: '1px solid #E2E8F0', marginBottom: '18px' }}>
              <div style={{ fontSize: '12.5px', fontWeight: 800, color: '#000052', marginBottom: '10px' }}>
                Add Neighborhood / Area to City
              </div>
              <form onSubmit={handleAddArea} style={{ display: 'flex', gap: '10px' }}>
                <select
                  value={newAreaCity}
                  onChange={(e) => setNewAreaCity(e.target.value)}
                  style={{
                    height: '38px',
                    borderRadius: '6px',
                    border: '1px solid #CBD5E1',
                    padding: '0 10px',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#000052',
                    backgroundColor: '#FFFFFF'
                  }}
                >
                  {allCities.map(c => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
                </select>

                <input
                  type="text"
                  required
                  value={newAreaName}
                  onChange={(e) => setNewAreaName(e.target.value)}
                  placeholder="e.g. Alalubosa GRA, Ikolaba..."
                  style={{
                    flex: 1,
                    height: '38px',
                    borderRadius: '6px',
                    border: '1px solid #CBD5E1',
                    padding: '0 12px',
                    fontSize: '13px',
                    outline: 'none'
                  }}
                />

                <button
                  type="submit"
                  style={{
                    backgroundColor: '#000052',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '0 16px',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Add Area
                </button>
              </form>
            </div>

            {/* Add New Expansion City */}
            <div style={{ backgroundColor: '#F8FAFC', padding: '16px', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: '12.5px', fontWeight: 800, color: '#000052', marginBottom: '10px' }}>
                Stage New Expansion City (Multi-City Architecture)
              </div>
              <form onSubmit={handleAddCity} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '10px' }}>
                <input
                  type="text"
                  required
                  value={newCityName}
                  onChange={(e) => setNewCityName(e.target.value)}
                  placeholder="City Name (e.g. Port Harcourt)"
                  style={{ height: '38px', borderRadius: '6px', border: '1px solid #CBD5E1', padding: '0 12px', fontSize: '13px' }}
                />
                <input
                  type="text"
                  required
                  value={newCityState}
                  onChange={(e) => setNewCityState(e.target.value)}
                  placeholder="State (e.g. Rivers)"
                  style={{ height: '38px', borderRadius: '6px', border: '1px solid #CBD5E1', padding: '0 12px', fontSize: '13px' }}
                />
                <button
                  type="submit"
                  style={{
                    backgroundColor: '#000052',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '0 16px',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Stage City
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
      {adminToast && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          backgroundColor: '#000052',
          color: '#FFFFFF',
          padding: '12px 20px',
          borderRadius: '10px',
          boxShadow: '0 10px 25px rgba(0, 0, 82, 0.2)',
          fontSize: '13px',
          fontWeight: 600,
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <CheckCircle2 size={16} color="#BE89FF" />
          <span>{adminToast}</span>
        </div>
      )}

    </div>
  );
};
