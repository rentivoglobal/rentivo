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
  Plus,
  Edit2,
  Trash2,
  Layers,
  Globe,
  Power,
  LogOut
} from 'lucide-react';
import { Listing, VerificationStatus, ReportItem, User, CityLocation, AreaLocation } from '../types';
import { formatNaira } from '../utils/formatters';
import { reportsService } from '../services/reportsService';
import { requestsService } from '../services/requestsService';
import { locationsService } from '../services/locationsService';
import { listingsService } from '../services/listingsService';
import { paymentsService } from '../services/paymentsService';
import { verificationService } from '../services/verificationService';
import { authService } from '../services/authService';
import { LocalPayment } from '../services/localStore';

type AdminSection = 'overview' | 'listings' | 'verification' | 'escalations' | 'users' | 'reports' | 'payments' | 'locations';

interface AdminQueuePageProps {
  listings: Listing[];
  onApproveVerification: (listingId: string) => void | Promise<void>;
  onReload?: () => void | Promise<void>;
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
  onReload,
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

  // Mobile Navigation & Search State
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const tabRailRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (tabRailRef.current) {
      const activeEl = tabRailRef.current.querySelector('.active') as HTMLElement | null;
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      }
    }
  }, [activeSection]);

  // Active Row Action Menu State
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  // Modal Inspection Form State
  const [modalInspector, setModalInspector] = useState('Unassigned');
  const [modalInspectionDate, setModalInspectionDate] = useState(() => new Date().toISOString().slice(0, 10));
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
  const [reports, setReports] = useState<ReportItem[]>([]);

  // Live Users Directory State
  const [liveUsers, setLiveUsers] = useState<User[]>([]);

  useEffect(() => {
    void paymentsService.listPayments().then(setPayments);
    void reportsService.loadReports().then(setReports).catch(() => undefined);
    void locationsService.loadCities().then(() => setLocationsVersion((v) => v + 1)).catch(() => undefined);
    void authService.listUsers().then(setLiveUsers).catch(() => undefined);

    void verificationService.list().then((items) => {
      setVerificationItems(items.map((v) => {
        const matched = listings.find((l) => l.id === v.listingId);
        return {
          id: v.id,
          listingId: v.listingId,
          title: matched?.title || 'Property Verification',
          area: matched?.area || 'Ibadan',
          category: matched?.category === 'commercial' ? 'Commercial' : 'Residential',
          listerName: matched?.lister.fullName || 'Landlord',
          listerPhone: v.onSiteContactPhone || matched?.lister.phone || '',
          listerInitials: (matched?.lister.fullName || 'LL').slice(0, 2).toUpperCase(),
          submittedDate: new Date(v.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          status: v.status === 'verified' ? 'completed' : v.status === 'scheduled' ? 'scheduled' : 'pending',
          inspector: v.inspector || 'Unassigned',
          daysInQueue: Math.max(1, Math.floor((Date.now() - new Date(v.createdAt).getTime()) / (1000 * 60 * 60 * 24))),
          isOverdue: (Date.now() - new Date(v.createdAt).getTime()) > 48 * 60 * 60 * 1000,
          photo: matched?.photos?.[0] || 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=400&q=80',
          price: matched?.price || 0
        };
      }));
    }).catch(() => undefined);

    void requestsService.getAllRequests().then((reqs) => {
      const esc = reqs.filter((r) => r.status === 'manual_escalation' || r.status === 'availability_pending');
      setEscalations(esc.map((r) => {
        const matched = listings.find((l) => l.id === r.listingId);
        return {
          id: r.id,
          listingTitle: r.listingTitle,
          area: r.listingArea,
          listerName: matched?.lister?.fullName || 'Property Lister',
          listerPhone: matched?.lister?.phone || '',
          renterName: r.renterName,
          timeSinceRequest: new Date(r.createdAt).toLocaleDateString(),
          automatedStatus: r.status === 'manual_escalation' ? 'No response' : 'Delivered',
          isOverdue: r.status === 'manual_escalation' || (Date.now() - new Date(r.createdAt).getTime()) > 3600000,
          photo: r.listingPhoto || matched?.photos?.[0] || 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=400&q=80'
        };
      }));
    }).catch(() => undefined);

    void requestsService.loadPromotionStats().then(setPromoStats).catch(() => undefined);
  }, [listings]);

  // Promotion Stats State (FR-5.3 & FR-5.4 First 100 users waiver)
  const [promoStats, setPromoStats] = useState(() => requestsService.getPromotionStats());

  // Multi-City Location Management State (FR-7.6)
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [locationsVersion, setLocationsVersion] = useState(0);
  const allCities = useMemo(() => locationsService.getCities(), [locationsVersion]);
  const [selectedLocationCity, setSelectedLocationCity] = useState('Ibadan');
  const [areaSearchQuery, setAreaSearchQuery] = useState('');

  // Register City Modal State
  const [isAddCityModalOpen, setIsAddCityModalOpen] = useState(false);
  const [newCityName, setNewCityName] = useState('');
  const [newCityState, setNewCityState] = useState('');
  const [newCityIsActive, setNewCityIsActive] = useState(false);
  const [newCityInitialAreas, setNewCityInitialAreas] = useState('');
  const [isSubmittingCity, setIsSubmittingCity] = useState(false);

  // Edit City Modal State
  const [editingCity, setEditingCity] = useState<CityLocation | null>(null);
  const [editCityName, setEditCityName] = useState('');
  const [editCityState, setEditCityState] = useState('');
  const [editCityIsActive, setEditCityIsActive] = useState(true);

  // Add Area Form State
  const [newAreaCity, setNewAreaCity] = useState('Ibadan');
  const [newAreaName, setNewAreaName] = useState('');
  const [isSubmittingArea, setIsSubmittingArea] = useState(false);

  // Delete Prompt / Relational Confirmation Modal State
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    type: 'city' | 'area';
    id: string;
    name: string;
    cityName?: string;
    hasListings: boolean;
    listingCount: number;
  } | null>(null);

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
    if (onReload) await onReload();
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

  // Handlers for City Operations
  const handleToggleCityStatus = async (city: CityLocation) => {
    try {
      await locationsService.toggleCityActive(city.id, !city.isActive);
      setLocationsVersion(v => v + 1);
      showToast(`${city.name} is now ${!city.isActive ? 'Active for Operations' : 'Staged for Phase 2'}.`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update city status.';
      showToast(msg);
    }
  };

  const handleSetPilotCity = async (city: CityLocation) => {
    try {
      await locationsService.setPilotCity(city.id);
      setLocationsVersion(v => v + 1);
      showToast(`${city.name} is now designated as the Primary Pilot City.`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to set pilot city.';
      showToast(msg);
    }
  };

  const handleOpenEditCity = (city: CityLocation) => {
    setEditingCity(city);
    setEditCityName(city.name);
    setEditCityState(city.state);
    setEditCityIsActive(city.isActive);
  };

  const handleSaveEditCity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCity || !editCityName.trim() || !editCityState.trim()) return;
    try {
      await locationsService.updateCity(editingCity.id, {
        name: editCityName.trim(),
        state: editCityState.trim(),
        isActive: editCityIsActive
      });
      setLocationsVersion(v => v + 1);
      showToast(`Updated city details for ${editCityName.trim()}.`);
      setEditingCity(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update city.';
      showToast(msg);
    }
  };

  const handlePromptDeleteCity = (city: CityLocation) => {
    const attachedListings = listings.filter(l => l.city.toLowerCase() === city.name.toLowerCase()).length;
    setDeleteConfirmation({
      type: 'city',
      id: city.id,
      name: city.name,
      hasListings: attachedListings > 0,
      listingCount: attachedListings
    });
  };

  const handleConfirmDeleteCity = async () => {
    if (!deleteConfirmation || deleteConfirmation.type !== 'city') return;
    try {
      const res = await locationsService.deleteCity(deleteConfirmation.id);
      if (!res.success) {
        showToast(res.error || 'Cannot delete city.');
        return;
      }
      setLocationsVersion(v => v + 1);
      showToast(`Removed "${deleteConfirmation.name}" from regional coverage.`);
      setDeleteConfirmation(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete city.';
      showToast(msg);
    }
  };

  const handleRegisterCity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCityName.trim() || !newCityState.trim()) return;
    setIsSubmittingCity(true);
    try {
      const initialAreas = newCityInitialAreas
        .split(',')
        .map(a => a.trim())
        .filter(Boolean);
      await locationsService.addCity({
        name: newCityName.trim(),
        state: newCityState.trim(),
        isActive: newCityIsActive,
        initialAreas
      });
      setLocationsVersion(v => v + 1);
      showToast(`Registered "${newCityName.trim()}" in coverage directory.`);
      setNewCityName('');
      setNewCityState('');
      setNewCityInitialAreas('');
      setNewCityIsActive(false);
      setIsAddCityModalOpen(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to register city.';
      showToast(msg);
    } finally {
      setIsSubmittingCity(false);
    }
  };

  // Handlers for Area Operations
  const handleAddAreaToCity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAreaName.trim()) return;
    setIsSubmittingArea(true);
    try {
      await locationsService.addAreaToCity(newAreaCity, newAreaName.trim());
      setLocationsVersion(v => v + 1);
      showToast(`Neighborhood "${newAreaName.trim()}" added to ${newAreaCity}.`);
      setNewAreaName('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to add neighborhood.';
      showToast(msg);
    } finally {
      setIsSubmittingArea(false);
    }
  };

  const handleToggleAreaActive = async (area: AreaLocation) => {
    try {
      await locationsService.toggleAreaActive(area.id, !area.isActive);
      setLocationsVersion(v => v + 1);
      showToast(`Neighborhood "${area.name}" is now ${!area.isActive ? 'Active' : 'Inactive'}.`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to toggle neighborhood status.';
      showToast(msg);
    }
  };

  const handlePromptDeleteArea = (area: AreaLocation, cityName: string) => {
    const attachedListings = listings.filter(l => l.area.toLowerCase() === area.name.toLowerCase()).length;
    setDeleteConfirmation({
      type: 'area',
      id: area.id,
      name: area.name,
      cityName,
      hasListings: attachedListings > 0,
      listingCount: attachedListings
    });
  };

  const handleConfirmDeleteArea = async () => {
    if (!deleteConfirmation || deleteConfirmation.type !== 'area') return;
    try {
      const res = await locationsService.deleteArea(deleteConfirmation.id);
      if (!res.success) {
        showToast(res.error || 'Cannot delete neighborhood.');
        return;
      }
      setLocationsVersion(v => v + 1);
      showToast(`Removed neighborhood "${deleteConfirmation.name}".`);
      setDeleteConfirmation(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete neighborhood.';
      showToast(msg);
    }
  };

  const handleDeactivateInstead = async () => {
    if (!deleteConfirmation) return;
    try {
      if (deleteConfirmation.type === 'city') {
        await locationsService.toggleCityActive(deleteConfirmation.id, false);
        showToast(`City "${deleteConfirmation.name}" deactivated.`);
      } else {
        await locationsService.toggleAreaActive(deleteConfirmation.id, false);
        showToast(`Neighborhood "${deleteConfirmation.name}" deactivated.`);
      }
      setLocationsVersion(v => v + 1);
      setDeleteConfirmation(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to deactivate.';
      showToast(msg);
    }
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

  // Verification Items loaded from live backend
  const [verificationItems, setVerificationItems] = useState<VerificationItem[]>([]);

  // Escalations List loaded from live backend
  const [escalations, setEscalations] = useState<EscalationItem[]>([]);

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

  // Computed dynamic stats
  const activeListingsCount = useMemo(() => {
    return listings.filter(l => l.isAvailable !== false && l.moderationStatus !== 'rejected').length;
  }, [listings]);

  const pendingApprovalCount = useMemo(() => {
    return listings.filter(l => l.isApproved === false || l.moderationStatus === 'pending_approval').length;
  }, [listings]);

  const verifiedListingsCount = useMemo(() => {
    return listings.filter(l => l.verificationStatus === 'verified').length;
  }, [listings]);

  const verifiedRate = useMemo(() => {
    return listings.length > 0 ? Math.round((verifiedListingsCount / listings.length) * 100) : 0;
  }, [listings, verifiedListingsCount]);

  const pendingInspectionsCount = useMemo(() => {
    return verificationItems.filter(i => i.status === 'pending').length;
  }, [verificationItems]);

  const overdueInspectionsCount = useMemo(() => {
    return verificationItems.filter(i => i.isOverdue).length;
  }, [verificationItems]);

  const unassignedInspectionsCount = useMemo(() => {
    return verificationItems.filter(i => !i.inspector || i.inspector === 'Unassigned').length;
  }, [verificationItems]);

  const awaitingConfirmationCount = useMemo(() => {
    return escalations.length;
  }, [escalations]);

  const overdueEscalationsCount = useMemo(() => {
    return escalations.filter(e => e.isOverdue).length;
  }, [escalations]);

  const paidPayments = useMemo(() => {
    return payments.filter(p => p.status === 'success');
  }, [payments]);

  const totalAccessFeeRevenue = useMemo(() => {
    return paidPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
  }, [paidPayments]);

  const distinctAreas = useMemo(() => {
    const fromListings = listings.map(l => l.area).filter(Boolean);
    const fromCities = allCities.flatMap(c => c.areas);
    const set = new Set([...fromListings, ...fromCities]);
    return Array.from(set).sort();
  }, [listings, allCities]);

  const availableInspectors = useMemo(() => {
    return liveUsers.filter(u => u.role === 'admin' || (u.role as string) === 'inspector');
  }, [liveUsers]);

  // Open Centered Modal Handler
  const handleOpenModal = (item: VerificationItem) => {
    setSelectedVerifItem(item);
    setModalInspector(item.inspector || 'Unassigned');
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
  const handleApproveVerificationAction = async (item: VerificationItem) => {
    setVerificationItems(prev =>
      prev.map(i => (i.id === item.id ? { ...i, status: 'completed', isOverdue: false } : i))
    );
    await onApproveVerification(item.listingId);
    if (onReload) await onReload();
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
    <div className="admin-page-root" style={{ backgroundColor: '#F7F8FA', minHeight: '100vh', color: '#17172B', fontFamily: 'inherit' }}>

      {/* -------------------------------------------------------------
          TOP STICKY NAVIGATION BAR (MATCHING rentivo-admin.html)
         ------------------------------------------------------------- */}
      <header className="admin-header" style={{
        backgroundColor: '#000052',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        position: 'sticky',
        top: 0,
        zIndex: 50,
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.15)'
      }}>
        {/* =============================================================
            DESKTOP HEADER INNER (>= 1024px) - 100% PRESERVED FIDELITY
           ============================================================= */}
        <div className="admin-header-desktop-inner" style={{
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
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
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

        {/* =============================================================
            MOBILE TWO-TIER HEADER (< 1024px) - FLUID TOUCH NAVIGATION
           ============================================================= */}
        <div className="admin-header-mobile-wrapper">
          {/* Tier 1: Brand Lockup + Compact Utilities */}
          <div className="admin-header-tier1">
            <div 
              className="admin-mobile-brand"
              onClick={() => setActiveSection('overview')}
              title="Admin Overview"
            >
              <span style={{ fontSize: '17px', fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.02em' }}>
                RENT<span style={{ color: '#BE89FF' }}>ivo</span>
              </span>
              <span style={{
                fontSize: '9.5px',
                fontWeight: 800,
                backgroundColor: 'rgba(190, 137, 255, 0.18)',
                color: '#BE89FF',
                padding: '2px 7px',
                borderRadius: '5px',
                letterSpacing: '0.04em'
              }}>
                ADMIN
              </span>
            </div>

            <div className="admin-header-mobile-actions">
              <button
                type="button"
                onClick={() => setIsMobileSearchOpen(!isMobileSearchOpen)}
                style={{
                  width: '44px',
                  height: '44px',
                  minWidth: '44px',
                  minHeight: '44px',
                  borderRadius: '8px',
                  border: '1px solid rgba(255, 255, 255, 0.14)',
                  backgroundColor: isMobileSearchOpen ? 'rgba(190, 137, 255, 0.2)' : 'rgba(255, 255, 255, 0.08)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: isMobileSearchOpen ? '#BE89FF' : '#C9C6E8',
                  cursor: 'pointer'
                }}
                aria-label="Toggle search"
              >
                <Search size={16} />
              </button>

              <button
                type="button"
                style={{
                  width: '44px',
                  height: '44px',
                  minWidth: '44px',
                  minHeight: '44px',
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
                aria-label="Admin notifications"
              >
                <Bell size={16} />
                <span style={{
                  position: 'absolute',
                  top: '9px',
                  right: '9px',
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
                    padding: '6px 12px',
                    fontSize: '11.5px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    minHeight: '44px'
                  }}
                  title="Exit Admin to Consumer Home"
                >
                  <LogOut size={13} />
                  <span>Exit</span>
                </button>
              )}

              <div style={{
                width: '30px',
                height: '30px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #BE89FF, #8F5BD6)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '11px',
                fontWeight: 800,
                color: '#FFFFFF',
                flexShrink: 0
              }}>
                RV
              </div>
            </div>
          </div>

          {/* Quick Search Dropdown Bar */}
          {isMobileSearchOpen && (
            <div className="admin-header-search-bar">
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.14)',
                borderRadius: '8px',
                padding: '6px 12px'
              }}>
                <Search size={14} color="#8E8BB8" />
                <input
                  type="text"
                  placeholder="Search listings, users..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    border: 'none',
                    background: 'none',
                    outline: 'none',
                    color: '#FFFFFF',
                    fontSize: '13px',
                    width: '100%'
                  }}
                  autoFocus
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: 0 }}
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Tier 2: Fluid Horizontal Touch-Scrolling Rail */}
          <nav
            ref={tabRailRef}
            className="admin-tab-rail"
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
                  onClick={() => setActiveSection(tab.id as AdminSection)}
                  className={`admin-tab-rail-item ${isActive ? 'active' : ''}`}
                >
                  <Icon size={15} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      {/* -------------------------------------------------------------
          MAIN ADMIN VIEWPORT
         ------------------------------------------------------------- */}
      <main className="admin-main" style={{ maxWidth: '1500px', margin: '0 auto', padding: '26px 32px 60px' }}>

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
                    transition: 'all 0.15s ease',
                    minHeight: '44px'
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
                    cursor: 'pointer',
                    minHeight: '44px'
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
                    boxShadow: '0 2px 6px rgba(0, 0, 82, 0.15)',
                    minHeight: '44px'
                  }}
                >
                  <Download size={15} />
                  <span>Export report</span>
                </button>
              </div>
            </div>

            {/* 8 Stats Metric Cards */}
            <div className="admin-kpi-grid" style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: '14px',
              marginBottom: '24px'
            }}>
              {/* 1. Active listings */}
              <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E6E3EE', borderRadius: '14px', padding: '16px' }}>
                <div className="admin-kpi-card-title" style={{ fontSize: '11.5px', fontWeight: 700, color: '#636377', textTransform: 'uppercase', letterSpacing: '0.03em', marginBottom: '8px' }}>
                  Active listings
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                  <span className="admin-kpi-card-val" style={{ fontSize: '26px', fontWeight: 800, color: '#000052' }}>{activeListingsCount}</span>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#047857', display: 'flex', alignItems: 'center', gap: '3px' }}>
                    <TrendingUp size={14} /> {listings.length} total
                  </span>
                </div>
                <div className="admin-kpi-card-sub" style={{ fontSize: '11.5px', color: '#636377', marginTop: '6px' }}>
                  {pendingApprovalCount} pending admin approval
                </div>
              </div>

              {/* 2. Verified listings */}
              <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E6E3EE', borderRadius: '14px', padding: '16px' }}>
                <div className="admin-kpi-card-title" style={{ fontSize: '11.5px', fontWeight: 700, color: '#636377', textTransform: 'uppercase', letterSpacing: '0.03em', marginBottom: '8px' }}>
                  Verified listings
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                  <span className="admin-kpi-card-val" style={{ fontSize: '26px', fontWeight: 800, color: '#000052' }}>{verifiedListingsCount}</span>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#047857', display: 'flex', alignItems: 'center', gap: '3px' }}>
                    <TrendingUp size={14} /> {verifiedRate}%
                  </span>
                </div>
                <div className="admin-kpi-card-sub" style={{ fontSize: '11.5px', color: '#636377', marginTop: '6px' }}>
                  {verifiedRate}% of catalog verified
                </div>
              </div>

              {/* 3. Pending inspections */}
              <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E6E3EE', borderRadius: '14px', padding: '16px' }}>
                <div className="admin-kpi-card-title" style={{ fontSize: '11.5px', fontWeight: 700, color: '#636377', textTransform: 'uppercase', letterSpacing: '0.03em', marginBottom: '8px' }}>
                  Pending inspections
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                  <span className="admin-kpi-card-val" style={{ fontSize: '26px', fontWeight: 800, color: '#000052' }}>{pendingInspectionsCount}</span>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: overdueInspectionsCount > 0 ? '#BE123C' : '#047857', display: 'flex', alignItems: 'center', gap: '3px' }}>
                    {overdueInspectionsCount > 0 ? <AlertCircle size={14} /> : <CheckCircle2 size={14} />} {unassignedInspectionsCount} unassigned
                  </span>
                </div>
                <div className="admin-kpi-card-sub" style={{ fontSize: '11.5px', color: '#636377', marginTop: '6px' }}>
                  {overdueInspectionsCount} overdue for 48h+
                </div>
              </div>

              {/* 4. Requests awaiting confirmation */}
              <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E6E3EE', borderRadius: '14px', padding: '16px' }}>
                <div className="admin-kpi-card-title" style={{ fontSize: '11.5px', fontWeight: 700, color: '#636377', textTransform: 'uppercase', letterSpacing: '0.03em', marginBottom: '8px' }}>
                  Requests awaiting confirmation
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                  <span className="admin-kpi-card-val" style={{ fontSize: '26px', fontWeight: 800, color: '#000052' }}>{awaitingConfirmationCount}</span>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: overdueEscalationsCount > 0 ? '#B45309' : '#047857', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Clock size={13} /> {overdueEscalationsCount > 0 ? `${overdueEscalationsCount} overdue` : 'On track'}
                  </span>
                </div>
                <div className="admin-kpi-card-sub" style={{ fontSize: '11.5px', color: '#636377', marginTop: '6px' }}>
                  {escalations.length} escalation items in queue
                </div>
              </div>

              {/* 5. Confirmation rate */}
              <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E6E3EE', borderRadius: '14px', padding: '16px' }}>
                <div className="admin-kpi-card-title" style={{ fontSize: '11.5px', fontWeight: 700, color: '#636377', textTransform: 'uppercase', letterSpacing: '0.03em', marginBottom: '8px' }}>
                  Confirmation rate
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                  <span className="admin-kpi-card-val" style={{ fontSize: '26px', fontWeight: 800, color: '#000052' }}>
                    {tabCounts.all > 0 ? `${Math.round((tabCounts.completed / tabCounts.all) * 100)}%` : '100%'}
                  </span>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#047857', display: 'flex', alignItems: 'center', gap: '3px' }}>
                    <TrendingUp size={14} /> Live
                  </span>
                </div>
                <div className="admin-kpi-card-sub" style={{ fontSize: '11.5px', color: '#636377', marginTop: '6px' }}>
                  {tabCounts.completed} verified of {tabCounts.all} requests
                </div>
              </div>

              {/* 6. Access-fee revenue */}
              <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E6E3EE', borderRadius: '14px', padding: '16px' }}>
                <div className="admin-kpi-card-title" style={{ fontSize: '11.5px', fontWeight: 700, color: '#636377', textTransform: 'uppercase', letterSpacing: '0.03em', marginBottom: '8px' }}>
                  Access-fee revenue
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                  <span className="admin-kpi-card-val" style={{ fontSize: '26px', fontWeight: 800, color: '#000052' }}>{formatNaira(totalAccessFeeRevenue)}</span>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#047857', display: 'flex', alignItems: 'center', gap: '3px' }}>
                    <CreditCard size={14} /> Paystack
                  </span>
                </div>
                <div className="admin-kpi-card-sub" style={{ fontSize: '11.5px', color: '#636377', marginTop: '6px' }}>
                  {paidPayments.length} paid access unlock{paidPayments.length === 1 ? '' : 's'} recorded
                </div>
              </div>

              {/* 7. Promotion redemptions (FR-5.3 / FR-5.4) */}
              <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E6E3EE', borderRadius: '14px', padding: '16px' }}>
                <div className="admin-kpi-card-title" style={{ fontSize: '11.5px', fontWeight: 700, color: '#636377', textTransform: 'uppercase', letterSpacing: '0.03em', marginBottom: '8px' }}>
                  Promotion redemptions
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                  <span className="admin-kpi-card-val" style={{ fontSize: '24px', fontWeight: 800, color: '#000052' }}>
                    {promoStats.redeemed} / {promoStats.total}
                  </span>
                  <span style={{ fontSize: '11.5px', fontWeight: 800, color: '#7E22CE', backgroundColor: '#F3E8FF', padding: '2px 8px', borderRadius: '12px' }}>
                    {promoStats.remaining} left
                  </span>
                </div>
                <div className="admin-kpi-card-sub" style={{ fontSize: '11.5px', color: '#636377', marginTop: '6px' }}>
                  First 100 Users Promotional Waiver Quota
                </div>
              </div>

              {/* 8. Reported listings (FR-6.4) */}
              <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E6E3EE', borderRadius: '14px', padding: '16px' }}>
                <div className="admin-kpi-card-title" style={{ fontSize: '11.5px', fontWeight: 700, color: '#636377', textTransform: 'uppercase', letterSpacing: '0.03em', marginBottom: '8px' }}>
                  Reported listings
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                  <span className="admin-kpi-card-val" style={{ fontSize: '26px', fontWeight: 800, color: '#000052' }}>
                    {reports.filter(r => r.status === 'pending' || r.status === 'investigating').length}
                  </span>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: reports.filter(r => r.status === 'pending').length > 0 ? '#BE123C' : '#047857', display: 'flex', alignItems: 'center', gap: '3px' }}>
                    <AlertTriangle size={13} /> {reports.filter(r => r.status === 'pending').length} new
                  </span>
                </div>
                <div className="admin-kpi-card-sub" style={{ fontSize: '11.5px', color: '#636377', marginTop: '6px' }}>
                  {reports.length} total dispute reports on file
                </div>
              </div>
            </div>

            {/* 2-Column: Verification Queue Snapshot + Chart & Distribution */}
            <div className="admin-split-grid" style={{
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
                    <span>View all ({tabCounts.all})</span>
                    <ChevronRight size={13} />
                  </button>
                </div>

                {/* Sub tabs */}
                <div style={{ display: 'flex', gap: '6px', padding: '12px 18px 0', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '12px', fontWeight: 600, padding: '6px 12px', borderRadius: '8px', backgroundColor: '#F8F3FF', color: '#000052', border: '1px solid #E1CBFF' }}>
                    All ({tabCounts.all})
                  </span>
                  <span style={{ fontSize: '12px', fontWeight: 600, padding: '6px 12px', borderRadius: '8px', color: '#636377' }}>
                    Pending ({tabCounts.pending})
                  </span>
                  <span style={{ fontSize: '12px', fontWeight: 600, padding: '6px 12px', borderRadius: '8px', color: '#636377' }}>
                    Scheduled ({tabCounts.scheduled})
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
                      {verificationItems.length === 0 ? (
                        <tr>
                          <td colSpan={5} style={{ padding: '32px 18px', textAlign: 'center', color: '#64748B', fontSize: '13px' }}>
                            No verification requests currently in queue.
                          </td>
                        </tr>
                      ) : (
                        verificationItems.slice(0, 4).map(item => {
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
                      }))}
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
                    {tabCounts.all > 0 ? `${tabCounts.completed} verified of ${tabCounts.all} submitted requests` : 'Platform verification compliance tracker'}
                  </p>

                  <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#000052', margin: '0 0 8px' }}>
                    Verification queue distribution
                  </h4>

                  {/* Stack Bar */}
                  {tabCounts.all === 0 ? (
                    <div style={{ height: '14px', borderRadius: '999px', backgroundColor: '#E2E8F0', marginTop: '6px' }} />
                  ) : (
                    <div style={{ display: 'flex', height: '14px', borderRadius: '999px', overflow: 'hidden', marginTop: '6px' }}>
                      {tabCounts.pending > 0 && <div style={{ width: `${(tabCounts.pending / tabCounts.all) * 100}%`, backgroundColor: '#B45309' }} title={`Pending (${tabCounts.pending})`} />}
                      {tabCounts.scheduled > 0 && <div style={{ width: `${(tabCounts.scheduled / tabCounts.all) * 100}%`, backgroundColor: '#4338CA' }} title={`Scheduled (${tabCounts.scheduled})`} />}
                      {tabCounts.progress > 0 && <div style={{ width: `${(tabCounts.progress / tabCounts.all) * 100}%`, backgroundColor: '#334155' }} title={`In progress (${tabCounts.progress})`} />}
                      {tabCounts.completed > 0 && <div style={{ width: `${(tabCounts.completed / tabCounts.all) * 100}%`, backgroundColor: '#047857' }} title={`Completed (${tabCounts.completed})`} />}
                    </div>
                  )}

                  {/* Legend */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginTop: '14px' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', color: '#636377' }}>
                      <span style={{ width: '9px', height: '9px', borderRadius: '3px', backgroundColor: '#B45309' }} />
                      <span>Pending ({tabCounts.pending})</span>
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', color: '#636377' }}>
                      <span style={{ width: '9px', height: '9px', borderRadius: '3px', backgroundColor: '#4338CA' }} />
                      <span>Scheduled ({tabCounts.scheduled})</span>
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', color: '#636377' }}>
                      <span style={{ width: '9px', height: '9px', borderRadius: '3px', backgroundColor: '#334155' }} />
                      <span>In progress ({tabCounts.progress})</span>
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', color: '#636377' }}>
                      <span style={{ width: '9px', height: '9px', borderRadius: '3px', backgroundColor: '#047857' }} />
                      <span>Completed ({tabCounts.completed})</span>
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
                  backgroundColor: overdueEscalationsCount > 0 ? '#FFF1F2' : '#ECFDF5',
                  color: overdueEscalationsCount > 0 ? '#BE123C' : '#047857',
                  border: overdueEscalationsCount > 0 ? '1px solid #FECDD3' : '1px solid #A7F3D0'
                }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: overdueEscalationsCount > 0 ? '#BE123C' : '#047857' }} />
                  <span>{overdueEscalationsCount > 0 ? `${overdueEscalationsCount} overdue` : 'All on schedule'}</span>
                </span>
              </div>

              <div className="admin-table-desktop no-scrollbar" style={{ overflowX: 'auto', scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
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
                    {escalations.length === 0 ? (
                      <tr>
                        <td colSpan={6} style={{ padding: '36px 18px', textAlign: 'center', color: '#64748B', fontSize: '13px' }}>
                          No availability escalations pending. All property listers are responding within the confirmation window.
                        </td>
                      </tr>
                    ) : (
                      escalations.map(esc => (
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
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Mobile Escalation Cards (< 768px) */}
              <div className="admin-cards-mobile" style={{ padding: '14px' }}>
                {escalations.length === 0 ? (
                  <div style={{ padding: '24px 12px', textAlign: 'center', color: '#64748B', fontSize: '13px' }}>
                    No availability escalations pending. All property listers are responding within the confirmation window.
                  </div>
                ) : (
                  escalations.map(esc => (
                    <div
                      key={esc.id}
                      className={`admin-mobile-card ${esc.isOverdue ? 'urgent' : ''}`}
                    >
                      <div className="admin-mobile-card-header">
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                          <img
                            src={esc.photo}
                            alt=""
                            style={{ width: '44px', height: '44px', borderRadius: '8px', objectFit: 'cover', flexShrink: 0 }}
                          />
                          <div>
                            <div style={{ fontWeight: 700, fontSize: '13.5px', color: '#000052' }}>{esc.listingTitle}</div>
                            <div style={{ fontSize: '11px', color: '#636377' }}>{esc.area}</div>
                          </div>
                        </div>

                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '11px',
                          fontWeight: 800,
                          padding: '3px 8px',
                          borderRadius: '999px',
                          backgroundColor: esc.isOverdue ? '#FFE4E6' : '#F1F5F9',
                          color: esc.isOverdue ? '#BE123C' : '#475569',
                          border: esc.isOverdue ? '1px solid #FDA4AF' : '1px solid #E2E8F0',
                          whiteSpace: 'nowrap'
                        }}>
                          <Clock size={12} />
                          <span>{esc.timeSinceRequest}</span>
                        </span>
                      </div>

                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: '8px',
                        padding: '10px',
                        backgroundColor: '#F8FAFC',
                        borderRadius: '8px',
                        fontSize: '12px'
                      }}>
                        <div>
                          <div style={{ fontSize: '10.5px', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>Seeker</div>
                          <div style={{ fontWeight: 700, color: '#000052', marginTop: '2px' }}>{esc.renterName}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: '10.5px', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>Lister</div>
                          <div style={{ fontWeight: 700, color: '#000052', marginTop: '2px' }}>{esc.listerName}</div>
                          <div style={{ fontSize: '11px', color: '#64748B' }}>{esc.listerPhone}</div>
                        </div>
                      </div>

                      <div className="admin-mobile-card-actions">
                        <button
                          type="button"
                          onClick={() => handleCallLister(esc)}
                          disabled={!esc.isOverdue}
                          style={{
                            backgroundColor: esc.isOverdue ? '#BE123C' : '#F1F5F9',
                            color: esc.isOverdue ? '#FFFFFF' : '#94A3B8',
                            border: esc.isOverdue ? 'none' : '1px solid #CBD5E1',
                            cursor: esc.isOverdue ? 'pointer' : 'default',
                            boxShadow: esc.isOverdue ? '0 2px 6px rgba(190, 18, 60, 0.2)' : 'none'
                          }}
                        >
                          <Phone size={14} />
                          <span>{esc.isOverdue ? 'Call Lister' : 'On Track'}</span>
                        </button>

                        <a
                          href={`https://wa.me/${esc.listerPhone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Hello ${esc.listerName}, this is Rentivo Admin regarding seeker access request on "${esc.listingTitle}". Please confirm availability.`)}`}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            backgroundColor: '#16794A',
                            color: '#FFFFFF',
                            boxShadow: '0 2px 6px rgba(22, 121, 74, 0.2)'
                          }}
                        >
                          <MessageSquare size={14} />
                          <span>WhatsApp</span>
                        </a>
                      </div>
                    </div>
                  ))
                )}
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
                <div style={{ fontSize: '26px', fontWeight: 800, color: '#000052' }}>{tabCounts.pending}</div>
                <div style={{ fontSize: '11.5px', color: '#636377', marginTop: '6px' }}>{unassignedInspectionsCount} unassigned</div>
              </div>

              <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E6E3EE', borderRadius: '14px', padding: '16px' }}>
                <div style={{ fontSize: '11.5px', fontWeight: 700, color: '#636377', textTransform: 'uppercase', letterSpacing: '0.03em', marginBottom: '8px' }}>
                  Avg time to inspection
                </div>
                <div style={{ fontSize: '26px', fontWeight: 800, color: '#000052' }}>Under 48h</div>
                <div style={{ fontSize: '11.5px', color: '#636377', marginTop: '6px' }}>Platform turnaround target</div>
              </div>

              <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E6E3EE', borderRadius: '14px', padding: '16px' }}>
                <div style={{ fontSize: '11.5px', fontWeight: 700, color: '#636377', textTransform: 'uppercase', letterSpacing: '0.03em', marginBottom: '8px' }}>
                  Verified rate
                </div>
                <div style={{ fontSize: '26px', fontWeight: 800, color: '#000052' }}>{verifiedRate}%</div>
                <div style={{ fontSize: '11.5px', color: '#636377', marginTop: '6px' }}>{verifiedListingsCount} of {listings.length} active listings</div>
              </div>

              <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E6E3EE', borderRadius: '14px', padding: '16px' }}>
                <div style={{ fontSize: '11.5px', fontWeight: 700, color: '#636377', textTransform: 'uppercase', letterSpacing: '0.03em', marginBottom: '8px' }}>
                  Overdue (48h+)
                </div>
                <div style={{ fontSize: '26px', fontWeight: 800, color: overdueInspectionsCount > 0 ? '#BE123C' : '#047857' }}>{overdueInspectionsCount}</div>
                <div style={{ fontSize: '11.5px', color: '#636377', marginTop: '6px' }}>{overdueInspectionsCount > 0 ? 'Needs inspector reassignment' : 'All within SLA window'}</div>
              </div>
            </div>

            {/* Toolbar */}
            <div className="admin-toolbar-wrap" style={{
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
              <div className="admin-toolbar-row" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                {/* Segmented Status Tabs */}
                <div className="admin-touch-rail" style={{
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
                          transition: 'all 0.15s ease',
                          whiteSpace: 'nowrap',
                          flexShrink: 0
                        }}
                      >
                        {labels[tab]}
                      </button>
                    );
                  })}
                </div>

                {/* Filters Grid */}
                <div className="admin-toolbar-filters-grid" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
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
                    {distinctAreas.map(area => (
                      <option key={area} value={area}>{area}</option>
                    ))}
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
                    <option value="Unassigned">Unassigned</option>
                    {availableInspectors.map(ins => (
                      <option key={ins.id} value={ins.name}>{ins.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Search Bar */}
              <div className="admin-toolbar-search-box" style={{
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
              <div className="admin-bulk-bar" style={{
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
                <div className="admin-bulk-bar-actions" style={{ display: 'flex', gap: '8px' }}>
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
              <div className="admin-table-desktop no-scrollbar" style={{ overflowX: 'auto', scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
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
                    {filteredVerificationItems.length === 0 ? (
                      <tr>
                        <td colSpan={9} style={{ padding: '48px 16px', textAlign: 'center', color: '#64748B', fontSize: '13.5px' }}>
                          No verification requests match the selected filters.
                        </td>
                      </tr>
                    ) : (
                      filteredVerificationItems.map(item => {
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
                    }))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Inspection Cards (< 768px) */}
              <div className="admin-cards-mobile" style={{ padding: '14px' }}>
                {filteredVerificationItems.length === 0 ? (
                  <div style={{ padding: '32px 14px', textAlign: 'center', color: '#64748B', fontSize: '13px' }}>
                    No listings matching this filter query.
                  </div>
                ) : (
                  filteredVerificationItems.map(item => {
                    const statusBadgesMap: Record<string, { bg: string; color: string; border: string; label: string }> = {
                      pending: { bg: '#FEF3C7', color: '#B45309', border: '#FDE68A', label: 'Pending Inspection' },
                      scheduled: { bg: '#EFF6FF', color: '#1E40AF', border: '#BFDBFE', label: 'Visit Scheduled' },
                      progress: { bg: '#F3E8FF', color: '#7E22CE', border: '#E9D5FF', label: 'In Progress' },
                      in_progress: { bg: '#F3E8FF', color: '#7E22CE', border: '#E9D5FF', label: 'In Progress' },
                      completed: { bg: '#ECFDF5', color: '#047857', border: '#A7F3D0', label: 'Accredited' }
                    };
                    const statusBadges = statusBadgesMap[item.status] || { bg: '#F1F5F9', color: '#475569', border: '#CBD5E1', label: item.status || 'Pending' };

                    return (
                      <div
                        key={item.id}
                        className={`admin-mobile-card ${item.isOverdue ? 'urgent' : ''}`}
                      >
                        <div className="admin-mobile-card-header">
                          <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '10.5px', fontWeight: 700, backgroundColor: '#F0E6FF', color: '#000052', padding: '2px 8px', borderRadius: '4px' }}>
                              {item.category}
                            </span>
                            {item.isOverdue && (
                              <span style={{ fontSize: '10.5px', fontWeight: 800, color: '#BE123C', backgroundColor: '#FFE4E6', padding: '2px 7px', borderRadius: '4px' }}>
                                Overdue (48h+)
                              </span>
                            )}
                          </div>
                          <span style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            padding: '3px 9px',
                            borderRadius: '999px',
                            backgroundColor: statusBadges.bg,
                            color: statusBadges.color,
                            border: `1px solid ${statusBadges.border}`,
                            whiteSpace: 'nowrap'
                          }}>
                            {statusBadges.label}
                          </span>
                        </div>

                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                          <img
                            src={item.photo}
                            alt=""
                            style={{ width: '48px', height: '48px', borderRadius: '8px', objectFit: 'cover', flexShrink: 0 }}
                          />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 700, fontSize: '13.5px', color: '#000052', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {item.title}
                            </div>
                            <div style={{ fontSize: '11.5px', color: '#636377', marginTop: '2px' }}>
                              {item.area}, Ibadan · {formatNaira(item.price)}
                            </div>
                            <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>
                              Lister: <strong>{item.listerName}</strong> ({item.listerPhone})
                            </div>
                          </div>
                        </div>

                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: '1fr 1fr',
                          gap: '8px',
                          padding: '10px',
                          backgroundColor: '#F8FAFC',
                          borderRadius: '8px',
                          fontSize: '12px'
                        }}>
                          <div>
                            <div style={{ fontSize: '10px', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>Inspector</div>
                            <div style={{ fontWeight: 700, color: '#000052', marginTop: '2px' }}>{item.inspector}</div>
                          </div>
                          <div>
                            <div style={{ fontSize: '10px', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>Queue Age</div>
                            <div style={{ fontWeight: 700, color: item.isOverdue ? '#BE123C' : '#000052', marginTop: '2px' }}>
                              {item.daysInQueue > 0 ? `${item.daysInQueue} days` : 'New'} {item.isOverdue ? '(SLA Alert)' : ''}
                            </div>
                          </div>
                        </div>

                        <div className="admin-mobile-card-actions">
                          <button
                            type="button"
                            onClick={() => handleOpenModal(item)}
                            style={{
                              backgroundColor: '#000052',
                              color: '#FFFFFF',
                              border: 'none'
                            }}
                          >
                            <Eye size={14} />
                            <span>Audit Details</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleApproveVerificationAction(item)}
                            style={{
                              backgroundColor: '#047857',
                              color: '#FFFFFF',
                              border: 'none'
                            }}
                          >
                            <ShieldCheck size={14} />
                            <span>Approve</span>
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
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
                <span style={{
                  fontSize: '12px',
                  fontWeight: 700,
                  color: overdueEscalationsCount > 0 ? '#BE123C' : '#047857',
                  backgroundColor: overdueEscalationsCount > 0 ? '#FFF1F2' : '#ECFDF5',
                  padding: '3px 10px',
                  borderRadius: '20px'
                }}>
                  {overdueEscalationsCount} urgent {overdueEscalationsCount === 1 ? 'timeout' : 'timeouts'}
                </span>
              </div>

              {/* Desktop Table View */}
              <div className="admin-table-desktop no-scrollbar" style={{ overflowX: 'auto', scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
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
                    {escalations.length === 0 ? (
                      <tr>
                        <td colSpan={5} style={{ padding: '48px 18px', textAlign: 'center', color: '#64748B', fontSize: '13.5px' }}>
                          No pending availability escalations at this time.
                        </td>
                      </tr>
                    ) : (
                      escalations.map(esc => (
                        <tr key={esc.id} style={{ borderTop: '1px solid #E6E3EE', backgroundColor: esc.isOverdue ? '#FFF1F2' : 'transparent' }}>
                          <td style={{ padding: '14px 18px' }}>
                            <div style={{ fontWeight: 700, fontSize: '13.5px', color: '#000052' }}>{esc.listingTitle}</div>
                            <div style={{ fontSize: '11px', color: '#636377' }}>{esc.area}</div>
                          </td>
                          <td style={{ padding: '14px 18px', fontSize: '13px', fontWeight: 600 }}>{esc.renterName}</td>
                          <td style={{ padding: '14px 18px' }}>
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontSize: '11.5px',
                              fontWeight: 700,
                              padding: '3px 8px',
                              borderRadius: '999px',
                              backgroundColor: esc.isOverdue ? '#FFE4E6' : '#F1F5F9',
                              color: esc.isOverdue ? '#BE123C' : '#475569',
                              border: esc.isOverdue ? '1px solid #FDA4AF' : '1px solid #E2E8F0'
                            }}>
                              <Clock size={12} />
                              <span>{esc.timeSinceRequest}</span>
                            </span>
                          </td>
                          <td style={{ padding: '14px 18px', fontSize: '13px', color: '#17172B' }}>
                            {esc.listerName} ({esc.listerPhone})
                          </td>
                          <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                            <div style={{ display: 'inline-flex', gap: '8px', alignItems: 'center' }}>
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
                                  gap: '6px',
                                  minHeight: '40px'
                                }}
                              >
                                <Phone size={13} />
                                <span>Call Lister</span>
                              </button>
                              <a
                                href={`https://wa.me/${esc.listerPhone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Hello ${esc.listerName}, this is Rentivo Admin regarding seeker access request on "${esc.listingTitle}". Please confirm availability.`)}`}
                                target="_blank"
                                rel="noreferrer"
                                style={{
                                  backgroundColor: '#16794A',
                                  color: '#FFFFFF',
                                  borderRadius: '8px',
                                  padding: '8px 12px',
                                  fontSize: '12px',
                                  fontWeight: 700,
                                  textDecoration: 'none',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                  minHeight: '40px'
                                }}
                              >
                                <MessageSquare size={13} />
                                <span>WhatsApp</span>
                              </a>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Mobile Escalation Cards (< 768px) */}
              <div className="admin-cards-mobile" style={{ padding: '14px' }}>
                {escalations.length === 0 ? (
                  <div style={{ padding: '36px 14px', textAlign: 'center', color: '#64748B', fontSize: '13.5px' }}>
                    No pending availability escalations at this time.
                  </div>
                ) : (
                  escalations.map(esc => (
                    <div
                      key={esc.id}
                      className={`admin-mobile-card ${esc.isOverdue ? 'urgent' : ''}`}
                    >
                      <div className="admin-mobile-card-header">
                        <div>
                          <div style={{ fontWeight: 800, fontSize: '14.5px', color: '#000052' }}>{esc.listingTitle}</div>
                          <div style={{ fontSize: '11.5px', color: '#636377', marginTop: '2px' }}>{esc.area}, Ibadan</div>
                        </div>

                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '11px',
                          fontWeight: 800,
                          padding: '4px 9px',
                          borderRadius: '999px',
                          whiteSpace: 'nowrap',
                          backgroundColor: esc.isOverdue ? '#FFE4E6' : '#F1F5F9',
                          color: esc.isOverdue ? '#BE123C' : '#475569',
                          border: esc.isOverdue ? '1px solid #FDA4AF' : '1px solid #E2E8F0'
                        }}>
                          <Clock size={12} />
                          <span>{esc.timeSinceRequest}</span>
                        </span>
                      </div>

                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: '8px',
                        padding: '10px',
                        backgroundColor: '#FFFFFF',
                        borderRadius: '8px',
                        border: '1px solid #E6E3EE',
                        fontSize: '12px'
                      }}>
                        <div>
                          <div style={{ fontSize: '10.5px', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>Applicant</div>
                          <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#000052', marginTop: '2px' }}>{esc.renterName}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: '10.5px', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>Lister</div>
                          <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#000052', marginTop: '2px' }}>{esc.listerName}</div>
                          <div style={{ fontSize: '11px', color: '#64748B' }}>{esc.listerPhone}</div>
                        </div>
                      </div>

                      <div className="admin-mobile-card-actions">
                        <a
                          href={`tel:${esc.listerPhone.replace(/\s/g, '')}`}
                          style={{
                            minHeight: '44px',
                            backgroundColor: '#BE123C',
                            color: '#FFFFFF',
                            borderRadius: '8px',
                            fontSize: '13px',
                            fontWeight: 700,
                            textDecoration: 'none',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                            boxShadow: '0 2px 6px rgba(190, 18, 60, 0.2)'
                          }}
                        >
                          <Phone size={15} />
                          <span>Call Lister</span>
                        </a>

                        <a
                          href={`https://wa.me/${esc.listerPhone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Hello ${esc.listerName}, this is Rentivo Admin regarding seeker access request on "${esc.listingTitle}". Please confirm availability.`)}`}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            minHeight: '44px',
                            backgroundColor: '#16794A',
                            color: '#FFFFFF',
                            borderRadius: '8px',
                            fontSize: '13px',
                            fontWeight: 700,
                            textDecoration: 'none',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                            boxShadow: '0 2px 6px rgba(22, 121, 74, 0.2)'
                          }}
                        >
                          <MessageSquare size={15} />
                          <span>WhatsApp</span>
                        </a>
                      </div>
                    </div>
                  ))
                )}
              </div>
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
              {/* Desktop Table View (>= 768px) */}
              <div className="admin-table-desktop no-scrollbar" style={{ overflowX: 'auto', scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
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
                    {listings.length === 0 ? (
                      <tr>
                        <td colSpan={5} style={{ padding: '48px 18px', textAlign: 'center', color: '#64748B', fontSize: '13.5px' }}>
                          No listings found in the marketplace.
                        </td>
                      </tr>
                    ) : (
                      listings.map(l => (
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
                                  onClick={async () => {
                                    if (l.isApproved === false || l.moderationStatus === 'pending_approval') {
                                      await listingsService.moderateListing(l.id, 'approve');
                                      if (onReload) await onReload();
                                      showToast(`Published "${l.title}"`);
                                    } else {
                                      await onApproveVerification(l.id);
                                      if (onReload) await onReload();
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
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Mobile Queue Cards (< 768px) with 44px Touch Targets */}
              <div className="admin-cards-mobile" style={{ padding: '14px' }}>
                {listings.length === 0 ? (
                  <div style={{ padding: '36px 14px', textAlign: 'center', color: '#64748B', fontSize: '13.5px' }}>
                    No listings found in the marketplace.
                  </div>
                ) : (
                  listings.map(l => (
                    <div key={l.id} className="admin-mobile-card">
                      <div className="admin-mobile-card-header">
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                          <img
                            src={l.photos?.[0] || 'https://images.unsplash.com/photo-1570129477492-45c003edd2be?auto=format&fit=crop&w=200&q=80'}
                            alt=""
                            style={{ width: '46px', height: '46px', borderRadius: '8px', objectFit: 'cover', flexShrink: 0 }}
                          />
                          <div>
                            <div style={{ fontWeight: 800, fontSize: '13.5px', color: '#000052' }}>{l.title}</div>
                            <div style={{ fontSize: '11.5px', color: '#636377' }}>{l.area}, Ibadan · {l.type}</div>
                          </div>
                        </div>
                        <span style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          backgroundColor: l.isAvailable ? '#ECFDF5' : '#FFF1F2',
                          color: l.isAvailable ? '#047857' : '#BE123C',
                          padding: '3px 8px',
                          borderRadius: '999px',
                          whiteSpace: 'nowrap'
                        }}>
                          {l.isAvailable ? 'Available' : 'Occupied'}
                        </span>
                      </div>

                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: '8px',
                        padding: '10px',
                        backgroundColor: '#F8FAFC',
                        borderRadius: '8px',
                        fontSize: '12px'
                      }}>
                        <div>
                          <div style={{ fontSize: '10.5px', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>Rent Amount</div>
                          <div style={{ fontWeight: 800, color: '#000052', marginTop: '2px', fontSize: '13px' }}>{formatNaira(l.price)}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: '10.5px', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>Lister</div>
                          <div style={{ fontWeight: 700, color: '#000052', marginTop: '2px' }}>{l.lister?.fullName || 'Landlord'}</div>
                        </div>
                      </div>

                      <div className="admin-mobile-card-actions">
                        {l.verificationStatus === 'verified' ? (
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                            minHeight: '44px',
                            backgroundColor: '#ECFDF5',
                            color: '#047857',
                            borderRadius: '8px',
                            fontWeight: 700,
                            fontSize: '13px',
                            flex: 1
                          }}>
                            <ShieldCheck size={16} />
                            <span>Verified Badge Active</span>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={async () => {
                              if (l.isApproved === false || l.moderationStatus === 'pending_approval') {
                                await listingsService.moderateListing(l.id, 'approve');
                                if (onReload) await onReload();
                                showToast(`Published "${l.title}"`);
                              } else {
                                await onApproveVerification(l.id);
                                if (onReload) await onReload();
                              }
                            }}
                            style={{
                              backgroundColor: '#000052',
                              color: '#FFFFFF',
                              border: 'none',
                              minHeight: '44px'
                            }}
                          >
                            <ShieldCheck size={15} />
                            <span>Approve</span>
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
                            minHeight: '44px'
                          }}
                        >
                          <X size={15} />
                          <span>Reject</span>
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
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
              {/* Desktop Table View (>= 768px) */}
              <div className="admin-table-desktop no-scrollbar" style={{ overflowX: 'auto', scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
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
                    {liveUsers.length === 0 ? (
                      <tr>
                        <td colSpan={4} style={{ padding: '24px', textAlign: 'center', color: '#636377', fontSize: '13px' }}>
                          Loading users from database...
                        </td>
                      </tr>
                    ) : (
                      liveUsers.map((u) => {
                        const initials = (u.name || 'User')
                          .split(' ')
                          .map((p) => p[0])
                          .slice(0, 2)
                          .join('')
                          .toUpperCase();
                        const roleLabel =
                          u.role === 'admin'
                            ? 'Administrator'
                            : u.role === 'landlord'
                            ? 'Landlord'
                            : u.role === 'agent'
                            ? 'Agent'
                            : 'Renter';
                        return (
                          <tr key={u.id} style={{ borderTop: '1px solid #E6E3EE' }}>
                            <td style={{ padding: '12px 18px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: '#000052', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700 }}>
                                  {initials}
                                </div>
                                <div>
                                  <div style={{ fontWeight: 600, fontSize: '13px' }}>{u.name}</div>
                                  <div style={{ fontSize: '11.5px', color: '#636377' }}>{u.email}</div>
                                </div>
                              </div>
                            </td>
                            <td style={{ padding: '12px 18px', fontSize: '12px', fontWeight: 700, color: '#000052' }}>{roleLabel}</td>
                            <td style={{ padding: '12px 18px', fontSize: '13px', color: '#636377' }}>{u.agencyName || u.phone || 'Ibadan'}</td>
                            <td style={{ padding: '12px 18px', textAlign: 'center' }}>
                              <span style={{ fontSize: '11px', fontWeight: 700, color: '#047857', backgroundColor: '#ECFDF5', padding: '2px 8px', borderRadius: '999px' }}>
                                Active
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Mobile User Cards (< 768px) */}
              <div className="admin-cards-mobile" style={{ padding: '14px' }}>
                {liveUsers.length === 0 ? (
                  <div style={{ padding: '32px 14px', textAlign: 'center', color: '#64748B', fontSize: '13px' }}>
                    Loading users from database...
                  </div>
                ) : (
                  liveUsers.map((u) => {
                    const initials = (u.name || 'User')
                      .split(' ')
                      .map((p) => p[0])
                      .slice(0, 2)
                      .join('')
                      .toUpperCase();
                    const roleBadge =
                      u.role === 'admin'
                        ? { label: 'Administrator', bg: '#EDE9FE', color: '#4338CA', border: '#C7D2FE' }
                        : u.role === 'landlord'
                        ? { label: 'Landlord', bg: '#EFF6FF', color: '#1E40AF', border: '#BFDBFE' }
                        : u.role === 'agent'
                        ? { label: 'Agent', bg: '#ECFDF5', color: '#047857', border: '#A7F3D0' }
                        : { label: 'Renter', bg: '#F1F5F9', color: '#334155', border: '#E2E8F0' };

                    return (
                      <div key={u.id} className="admin-mobile-card">
                        <div className="admin-mobile-card-header">
                          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                            <div style={{
                              width: '36px',
                              height: '36px',
                              borderRadius: '50%',
                              backgroundColor: '#000052',
                              color: '#FFFFFF',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '12px',
                              fontWeight: 800,
                              flexShrink: 0
                            }}>
                              {initials}
                            </div>
                            <div>
                              <div style={{ fontWeight: 800, fontSize: '13.5px', color: '#000052' }}>{u.name}</div>
                              <div style={{ fontSize: '11.5px', color: '#636377' }}>{u.email}</div>
                            </div>
                          </div>
                          <span style={{
                            fontSize: '10.5px',
                            fontWeight: 700,
                            backgroundColor: roleBadge.bg,
                            color: roleBadge.color,
                            border: `1px solid ${roleBadge.border}`,
                            padding: '3px 8px',
                            borderRadius: '999px',
                            whiteSpace: 'nowrap'
                          }}>
                            {roleBadge.label}
                          </span>
                        </div>

                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '8px 10px',
                          backgroundColor: '#F8FAFC',
                          borderRadius: '8px',
                          fontSize: '12px',
                          border: '1px solid #E2E8F0'
                        }}>
                          <span style={{ color: '#64748B' }}>Location / Phone:</span>
                          <span style={{ fontWeight: 600, color: '#000052' }}>{u.agencyName || u.phone || 'Ibadan'}</span>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '4px' }}>
                          <span style={{ fontSize: '11px', fontWeight: 700, color: '#047857', backgroundColor: '#ECFDF5', border: '1px solid #A7F3D0', padding: '3px 10px', borderRadius: '999px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#059669' }} />
                            Active Member
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}

        {activeSection === 'payments' && (
          <div>
            <div style={{ marginBottom: '22px' }}>
              <h1 style={{ fontSize: '24px', fontWeight: 800, margin: '0 0 4px', color: '#000052' }}>Paystack ledger</h1>
              <p style={{ margin: 0, fontSize: '13.5px', color: '#636377' }}>Access fees, references, and refunds.</p>
            </div>
            <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 16, overflow: 'hidden' }}>
              {/* Desktop Table View (>= 768px) */}
              <div className="admin-table-desktop no-scrollbar" style={{ overflowX: 'auto', scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
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

              {/* Mobile Transaction Audit Cards (< 768px) */}
              <div className="admin-cards-mobile" style={{ padding: '14px' }}>
                {payments.length === 0 ? (
                  <div style={{ padding: '32px 14px', textAlign: 'center', color: '#64748B', fontSize: '13px' }}>
                    No Paystack transactions yet.
                  </div>
                ) : (
                  payments.map((p) => {
                    const statusBadge =
                      p.status === 'success'
                        ? { bg: '#ECFDF5', color: '#047857', border: '#A7F3D0', label: 'Success' }
                        : p.status === 'pending'
                        ? { bg: '#FFFBEB', color: '#B45309', border: '#FDE68A', label: 'Pending' }
                        : { bg: '#F5F3FF', color: '#6D28D9', border: '#DDD6FE', label: p.status };

                    return (
                      <div key={p.id} className="admin-mobile-card">
                        <div className="admin-mobile-card-header">
                          <div>
                            <div style={{ fontSize: '16px', fontWeight: 800, color: '#000052' }}>
                              {formatNaira(p.amount)}
                            </div>
                            <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>
                              {new Date(p.createdAt).toLocaleString()}
                            </div>
                          </div>
                          <span style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            padding: '3px 9px',
                            borderRadius: '999px',
                            backgroundColor: statusBadge.bg,
                            color: statusBadge.color,
                            border: `1px solid ${statusBadge.border}`,
                            textTransform: 'capitalize'
                          }}>
                            {statusBadge.label}
                          </span>
                        </div>

                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: '1fr',
                          gap: '6px',
                          padding: '10px',
                          backgroundColor: '#F8FAFC',
                          borderRadius: '8px',
                          fontSize: '12px',
                          border: '1px solid #E2E8F0'
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: '#64748B' }}>Renter:</span>
                            <span style={{ fontWeight: 600, color: '#000052' }}>{p.renterName || p.renterEmail || '—'}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: '#64748B' }}>Request ID:</span>
                            <span style={{ fontWeight: 600, color: '#000052', fontFamily: 'monospace' }}>{p.requestId.slice(0, 8)}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: '#64748B' }}>Reference:</span>
                            <span style={{ fontWeight: 600, color: '#000052', fontFamily: 'monospace', fontSize: '11px' }}>{p.reference}</span>
                          </div>
                        </div>

                        {p.status === 'success' && (
                          <div className="admin-mobile-card-actions">
                            <button
                              type="button"
                              onClick={() => {
                                void paymentsService.refund(p.id, 'Admin refund').then(() => {
                                  showToast('Refund issued');
                                  void paymentsService.listPayments().then(setPayments);
                                });
                              }}
                              style={{
                                minHeight: '44px',
                                backgroundColor: '#FFFFFF',
                                border: '1.5px solid #FCA5A5',
                                color: '#B91C1C',
                                borderRadius: '8px',
                                fontWeight: 700,
                                fontSize: '13px',
                                cursor: 'pointer'
                              }}
                            >
                              Issue Refund ({formatNaira(p.amount)})
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
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
            {/* Topline Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '22px', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h1 style={{ fontSize: '24px', fontWeight: 800, margin: '0 0 4px', color: '#000052' }}>
                  Locations &amp; Neighborhoods Registry
                </h1>
                <p style={{ margin: 0, fontSize: '13.5px', color: '#636377' }}>
                  Manage active pilot coverage (Ibadan), verified neighborhoods, and Phase 2 expansion cities across Nigeria.
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#000052', backgroundColor: '#EFF6FF', padding: '7px 14px', borderRadius: '999px', border: '1px solid #BFDBFE', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <MapPin size={14} color="#000052" />
                  <span>Pilot City: {allCities.find(c => c.isPilot)?.name || 'Ibadan'}</span>
                </span>

                <button
                  type="button"
                  onClick={() => setIsAddCityModalOpen(true)}
                  style={{
                    backgroundColor: '#000052',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '9px',
                    padding: '8px 16px',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 2px 6px rgba(0, 0, 82, 0.15)'
                  }}
                >
                  <Plus size={15} />
                  <span>Register Expansion City</span>
                </button>
              </div>
            </div>

            {/* Quick Metrics Bar */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', marginBottom: '24px' }}>
              <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '16px 20px' }}>
                <div style={{ fontSize: '11.5px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Active Operational Cities</div>
                <div style={{ fontSize: '26px', fontWeight: 800, color: '#000052', marginTop: '4px' }}>
                  {allCities.filter(c => c.isActive).length}
                </div>
                <div style={{ fontSize: '12px', color: '#16794A', marginTop: '4px', fontWeight: 600 }}>
                  {allCities.find(c => c.isPilot)?.name || 'Ibadan'} (Primary Pilot Live)
                </div>
              </div>

              <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '16px 20px' }}>
                <div style={{ fontSize: '11.5px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Total Verified Neighborhoods</div>
                <div style={{ fontSize: '26px', fontWeight: 800, color: '#000052', marginTop: '4px' }}>
                  {allCities.reduce((sum, c) => sum + (c.areaItems?.length || c.areas.length), 0)}
                </div>
                <div style={{ fontSize: '12px', color: '#636377', marginTop: '4px' }}>
                  Across {allCities.length} registered cities
                </div>
              </div>

              <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '16px 20px' }}>
                <div style={{ fontSize: '11.5px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Phase 2 Pipeline</div>
                <div style={{ fontSize: '26px', fontWeight: 800, color: '#000052', marginTop: '4px' }}>
                  {allCities.filter(c => !c.isActive).length}
                </div>
                <div style={{ fontSize: '12px', color: '#D97706', marginTop: '4px', fontWeight: 600 }}>
                  Staged for rollout
                </div>
              </div>

              <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '16px 20px' }}>
                <div style={{ fontSize: '11.5px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Catalog Listings Mapped</div>
                <div style={{ fontSize: '26px', fontWeight: 800, color: '#000052', marginTop: '4px' }}>
                  {listings.length}
                </div>
                <div style={{ fontSize: '12px', color: '#4338CA', marginTop: '4px', fontWeight: 600 }}>
                  Active marketplace coverage
                </div>
              </div>
            </div>

            {/* City Registry Table */}
            <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E6E3EE', borderRadius: '16px', overflow: 'hidden', marginBottom: '28px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#000052' }}>Marketplace Coverage Directory</h3>
                  <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#64748B' }}>Toggle operations, designate pilot, or manage neighborhood zones per city</p>
                </div>
              </div>

              {/* Desktop Table View (>= 768px) */}
              <div className="admin-table-desktop no-scrollbar" style={{ overflowX: 'auto', scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#64748B', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      <th style={{ textAlign: 'left', padding: '14px 18px' }}>City &amp; State</th>
                      <th style={{ textAlign: 'left', padding: '14px 18px' }}>Operational Status</th>
                      <th style={{ textAlign: 'center', padding: '14px 18px' }}>Listings Attached</th>
                      <th style={{ textAlign: 'left', padding: '14px 18px' }}>Neighborhoods</th>
                      <th style={{ textAlign: 'right', padding: '14px 20px', minWidth: '280px' }}>Management Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allCities.map(city => {
                      const attachedCount = listings.filter(l => l.city.toLowerCase() === city.name.toLowerCase()).length;
                      const areasList = city.areaItems || city.areas.map(name => ({ id: name, name, isActive: true, cityId: city.id, slug: name }));
                      const isCurrentSelected = selectedLocationCity.toLowerCase() === city.name.toLowerCase();

                      return (
                        <tr key={city.id} style={{ borderTop: '1px solid #E2E8F0', backgroundColor: isCurrentSelected ? '#FAFBFF' : 'transparent' }}>
                          <td style={{ padding: '14px 18px' }}>
                            <div style={{ fontWeight: 800, color: '#000052', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span>{city.name}</span>
                              {city.isPilot && (
                                <span style={{ fontSize: '10px', fontWeight: 800, backgroundColor: '#000052', color: '#FFFFFF', padding: '2px 8px', borderRadius: '999px', textTransform: 'uppercase' }}>
                                  Pilot City
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>{city.state} State</div>
                          </td>

                          <td style={{ padding: '14px 18px' }}>
                            <span style={{
                              fontSize: '11px',
                              fontWeight: 700,
                              backgroundColor: city.isActive ? '#ECFDF5' : '#FEF3C7',
                              color: city.isActive ? '#065F46' : '#92400E',
                              border: `1px solid ${city.isActive ? '#A7F3D0' : '#FDE68A'}`,
                              padding: '3px 9px',
                              borderRadius: '999px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px'
                            }}>
                              <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: city.isActive ? '#059669' : '#D97706' }} />
                              {city.isActive ? 'Active Operations' : 'Phase 2 Staged'}
                            </span>
                          </td>

                          <td style={{ padding: '14px 18px', textAlign: 'center' }}>
                            <span style={{
                              fontSize: '12px',
                              fontWeight: 700,
                              color: attachedCount > 0 ? '#000052' : '#94A3B8',
                              backgroundColor: attachedCount > 0 ? '#F1F5F9' : '#F8FAFC',
                              padding: '3px 10px',
                              borderRadius: '999px'
                            }}>
                              {attachedCount} listing{attachedCount === 1 ? '' : 's'}
                            </span>
                          </td>

                          <td style={{ padding: '14px 18px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                              <span style={{ fontWeight: 700, color: '#000052', fontSize: '12px' }}>
                                {areasList.length} total
                              </span>
                              <span style={{ color: '#94A3B8', fontSize: '11px' }}>·</span>
                              <span style={{ fontSize: '11.5px', color: '#64748B' }}>
                                {areasList.slice(0, 3).map(a => a.name).join(', ')}
                                {areasList.length > 3 && ` +${areasList.length - 3} more`}
                              </span>
                            </div>
                          </td>

                          <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                              {/* Manage Neighborhoods button */}
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedLocationCity(city.name);
                                  setNewAreaCity(city.name);
                                }}
                                style={{
                                  backgroundColor: isCurrentSelected ? '#000052' : '#EFF6FF',
                                  color: isCurrentSelected ? '#FFFFFF' : '#1E40AF',
                                  border: `1px solid ${isCurrentSelected ? '#000052' : '#BFDBFE'}`,
                                  borderRadius: '6px',
                                  padding: '5px 10px',
                                  fontSize: '11.5px',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px'
                                }}
                              >
                                <Layers size={13} />
                                <span>{isCurrentSelected ? 'Viewing Areas' : 'Manage Areas'}</span>
                              </button>

                              {/* Toggle Active / Staged */}
                              <button
                                type="button"
                                onClick={() => handleToggleCityStatus(city)}
                                style={{
                                  backgroundColor: city.isActive ? '#FFFBEB' : '#ECFDF5',
                                  color: city.isActive ? '#92400E' : '#047857',
                                  border: `1px solid ${city.isActive ? '#FDE68A' : '#A7F3D0'}`,
                                  borderRadius: '6px',
                                  padding: '5px 9px',
                                  fontSize: '11px',
                                  fontWeight: 600,
                                  cursor: 'pointer'
                                }}
                                title={city.isActive ? 'Stage city (pause public listings)' : 'Activate city for live operations'}
                              >
                                {city.isActive ? 'Stage (Pause)' : 'Activate'}
                              </button>

                              {/* Make Pilot City */}
                              {!city.isPilot && city.isActive && (
                                <button
                                  type="button"
                                  onClick={() => handleSetPilotCity(city)}
                                  style={{
                                    backgroundColor: '#FFFFFF',
                                    color: '#000052',
                                    border: '1px solid #CBD5E1',
                                    borderRadius: '6px',
                                    padding: '5px 8px',
                                    fontSize: '11px',
                                    fontWeight: 600,
                                    cursor: 'pointer'
                                  }}
                                  title="Designate as primary pilot city"
                                >
                                  Set Pilot
                                </button>
                              )}

                              {/* Edit City */}
                              <button
                                type="button"
                                onClick={() => handleOpenEditCity(city)}
                                style={{
                                  backgroundColor: '#F8FAFC',
                                  color: '#475569',
                                  border: '1px solid #CBD5E1',
                                  borderRadius: '6px',
                                  padding: '5px 8px',
                                  fontSize: '11px',
                                  cursor: 'pointer'
                                }}
                                title="Edit city details"
                              >
                                <Edit2 size={13} />
                              </button>

                              {/* Delete City */}
                              {!city.isPilot && (
                                <button
                                  type="button"
                                  onClick={() => handlePromptDeleteCity(city)}
                                  style={{
                                    backgroundColor: '#FEF2F2',
                                    color: '#DC2626',
                                    border: '1px solid #FECACA',
                                    borderRadius: '6px',
                                    padding: '5px 8px',
                                    fontSize: '11px',
                                    cursor: 'pointer'
                                  }}
                                  title="Delete city from directory"
                                >
                                  <Trash2 size={13} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile City Cards (< 768px) */}
              <div className="admin-cards-mobile" style={{ padding: '14px' }}>
                {allCities.map(city => {
                  const attachedCount = listings.filter(l => l.city.toLowerCase() === city.name.toLowerCase()).length;
                  const areasList = city.areaItems || city.areas.map(name => ({ id: name, name, isActive: true, cityId: city.id, slug: name }));
                  const isCurrentSelected = selectedLocationCity.toLowerCase() === city.name.toLowerCase();

                  return (
                    <div key={city.id} className="admin-mobile-card" style={{ backgroundColor: isCurrentSelected ? '#FAFBFF' : '#FFFFFF', border: isCurrentSelected ? '1.5px solid #000052' : '1px solid #E6E3EE' }}>
                      <div className="admin-mobile-card-header">
                        <div>
                          <div style={{ fontWeight: 800, color: '#000052', fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span>{city.name}</span>
                            {city.isPilot && (
                              <span style={{ fontSize: '10px', fontWeight: 800, backgroundColor: '#000052', color: '#FFFFFF', padding: '2px 8px', borderRadius: '999px', textTransform: 'uppercase' }}>
                                Pilot City
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>{city.state} State</div>
                        </div>

                        <span style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          backgroundColor: city.isActive ? '#ECFDF5' : '#FEF3C7',
                          color: city.isActive ? '#065F46' : '#92400E',
                          border: `1px solid ${city.isActive ? '#A7F3D0' : '#FDE68A'}`,
                          padding: '3px 9px',
                          borderRadius: '999px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          whiteSpace: 'nowrap'
                        }}>
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: city.isActive ? '#059669' : '#D97706' }} />
                          {city.isActive ? 'Active' : 'Staged'}
                        </span>
                      </div>

                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: '8px',
                        padding: '10px',
                        backgroundColor: '#F8FAFC',
                        borderRadius: '8px',
                        fontSize: '12px',
                        border: '1px solid #E2E8F0'
                      }}>
                        <div>
                          <div style={{ fontSize: '10.5px', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>Listings Attached</div>
                          <div style={{ fontWeight: 800, color: '#000052', marginTop: '2px' }}>{attachedCount}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: '10.5px', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>Neighborhoods</div>
                          <div style={{ fontWeight: 800, color: '#000052', marginTop: '2px' }}>{areasList.length} total</div>
                        </div>
                      </div>

                      <div className="admin-mobile-card-actions" style={{ flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedLocationCity(city.name);
                            setNewAreaCity(city.name);
                          }}
                          style={{
                            backgroundColor: isCurrentSelected ? '#000052' : '#EFF6FF',
                            color: isCurrentSelected ? '#FFFFFF' : '#1E40AF',
                            border: `1px solid ${isCurrentSelected ? '#000052' : '#BFDBFE'}`,
                            minHeight: '44px',
                            flex: 1
                          }}
                        >
                          <Layers size={14} />
                          <span>{isCurrentSelected ? 'Viewing Areas' : 'Manage Areas'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleToggleCityStatus(city)}
                          style={{
                            backgroundColor: city.isActive ? '#FFFBEB' : '#ECFDF5',
                            color: city.isActive ? '#92400E' : '#047857',
                            border: `1px solid ${city.isActive ? '#FDE68A' : '#A7F3D0'}`,
                            minHeight: '44px',
                            flex: 1
                          }}
                        >
                          {city.isActive ? 'Stage (Pause)' : 'Activate'}
                        </button>

                        {!city.isPilot && city.isActive && (
                          <button
                            type="button"
                            onClick={() => handleSetPilotCity(city)}
                            style={{
                              backgroundColor: '#F8FAFC',
                              color: '#000052',
                              border: '1px solid #CBD5E1',
                              minHeight: '44px',
                              width: '100%'
                            }}
                          >
                            Set as Pilot City
                          </button>
                        )}

                        <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
                          <button
                            type="button"
                            onClick={() => handleOpenEditCity(city)}
                            style={{
                              backgroundColor: '#F8FAFC',
                              color: '#475569',
                              border: '1px solid #CBD5E1',
                              minHeight: '44px',
                              flex: 1
                            }}
                          >
                            <Edit2 size={14} />
                            <span>Edit City</span>
                          </button>

                          {!city.isPilot && (
                            <button
                              type="button"
                              onClick={() => handlePromptDeleteCity(city)}
                              style={{
                                backgroundColor: '#FEF2F2',
                                color: '#DC2626',
                                border: '1px solid #FECACA',
                                minHeight: '44px',
                                flex: 1
                              }}
                            >
                              <Trash2 size={14} />
                              <span>Delete City</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Dedicated Neighborhood / Area Manager for Selected City */}
            {(() => {
              const currentCity = allCities.find(c => c.name.toLowerCase() === selectedLocationCity.toLowerCase()) || allCities[0];
              if (!currentCity) return null;

              const rawAreas = currentCity.areaItems || currentCity.areas.map(a => ({
                id: a,
                cityId: currentCity.id,
                name: a,
                slug: a,
                isActive: true,
                listingCount: 0
              }));

              const filteredAreas = rawAreas.filter(a =>
                a.name.toLowerCase().includes(areaSearchQuery.trim().toLowerCase())
              );

              return (
                <div style={{ backgroundColor: '#FFFFFF', border: '1.5px solid #CBD5E1', borderRadius: '16px', padding: '24px', marginBottom: '28px', boxShadow: '0 4px 12px rgba(0,0,82,0.04)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '14px' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <MapPin size={20} color="#000052" />
                        <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#000052' }}>
                          Neighborhoods Registry: {currentCity.name} ({filteredAreas.length})
                        </h2>
                      </div>
                      <p style={{ margin: '3px 0 0', fontSize: '12.5px', color: '#64748B' }}>
                        Add, toggle active availability, or delete verified neighborhoods in {currentCity.name}, {currentCity.state}.
                      </p>
                    </div>

                    {/* City Switcher Tabs */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748B', marginRight: '4px' }}>Select City:</span>
                      {allCities.map(c => {
                        const isSelected = c.name.toLowerCase() === currentCity.name.toLowerCase();
                        return (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => {
                              setSelectedLocationCity(c.name);
                              setNewAreaCity(c.name);
                              setAreaSearchQuery('');
                            }}
                            style={{
                              backgroundColor: isSelected ? '#000052' : '#F1F5F9',
                              color: isSelected ? '#FFFFFF' : '#475569',
                              border: `1px solid ${isSelected ? '#000052' : '#CBD5E1'}`,
                              borderRadius: '8px',
                              padding: '5px 12px',
                              fontSize: '12px',
                              fontWeight: 700,
                              cursor: 'pointer'
                            }}
                          >
                            {c.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Add Neighborhood + Search Filter Controls Bar */}
                  <div className="admin-location-controls-grid" style={{
                    display: 'grid',
                    gridTemplateColumns: 'minmax(280px, 1fr) minmax(220px, 320px)',
                    gap: '14px',
                    backgroundColor: '#F8FAFC',
                    padding: '16px',
                    borderRadius: '12px',
                    border: '1px solid #E2E8F0',
                    marginBottom: '20px'
                  }}>
                    {/* Add Area Form */}
                    <form onSubmit={handleAddAreaToCity} style={{ display: 'flex', gap: '8px' }}>
                      <input
                        type="text"
                        required
                        placeholder={`Add new neighborhood to ${currentCity.name}...`}
                        value={newAreaName}
                        onChange={(e) => {
                          setNewAreaName(e.target.value);
                          setNewAreaCity(currentCity.name);
                        }}
                        style={{
                          flex: 1,
                          height: '42px',
                          border: '1px solid #CBD5E1',
                          borderRadius: '8px',
                          padding: '0 12px',
                          fontSize: '13px',
                          outline: 'none',
                          backgroundColor: '#FFFFFF',
                          color: '#000052'
                        }}
                      />
                      <button
                        type="submit"
                        disabled={isSubmittingArea || !newAreaName.trim()}
                        style={{
                          backgroundColor: '#000052',
                          color: '#FFFFFF',
                          border: 'none',
                          borderRadius: '8px',
                          padding: '0 16px',
                          fontSize: '13px',
                          fontWeight: 700,
                          cursor: isSubmittingArea ? 'wait' : 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          whiteSpace: 'nowrap',
                          minHeight: '42px'
                        }}
                      >
                        <Plus size={15} />
                        <span>Add Neighborhood</span>
                      </button>
                    </form>

                    {/* Search Area Input */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid #CBD5E1', borderRadius: '8px', padding: '0 12px', backgroundColor: '#FFFFFF', height: '42px' }}>
                      <Search size={15} color="#64748B" />
                      <input
                        type="text"
                        placeholder={`Search ${currentCity.name} areas...`}
                        value={areaSearchQuery}
                        onChange={(e) => setAreaSearchQuery(e.target.value)}
                        style={{ border: 'none', outline: 'none', width: '100%', fontSize: '12.5px', color: '#000052' }}
                      />
                      {areaSearchQuery && (
                        <button
                          type="button"
                          onClick={() => setAreaSearchQuery('')}
                          style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: 0 }}
                        >
                          <X size={13} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Neighborhoods Grid */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                    gap: '12px'
                  }}>
                    {filteredAreas.length === 0 ? (
                      <div style={{ gridColumn: '1 / -1', padding: '36px 16px', textAlign: 'center', color: '#64748B', fontSize: '13px' }}>
                        No neighborhoods found matching "{areaSearchQuery}".
                      </div>
                    ) : (
                      filteredAreas.map(area => {
                        const attachedListingCount = listings.filter(
                          l => l.area.toLowerCase() === area.name.toLowerCase()
                        ).length;

                        return (
                          <div
                            key={area.id}
                            style={{
                              backgroundColor: area.isActive ? '#FFFFFF' : '#F8FAFC',
                              border: `1.5px solid ${area.isActive ? '#E2E8F0' : '#E2E8F0'}`,
                              borderRadius: '10px',
                              padding: '12px 14px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: '10px',
                              boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                              opacity: area.isActive ? 1 : 0.75
                            }}
                          >
                            <div>
                              <div style={{ fontWeight: 700, fontSize: '13px', color: '#000052', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span>{area.name}</span>
                                {!area.isActive && (
                                  <span style={{ fontSize: '10px', fontWeight: 700, color: '#64748B', backgroundColor: '#E2E8F0', padding: '1px 6px', borderRadius: '4px' }}>
                                    Inactive
                                  </span>
                                )}
                              </div>
                              <div style={{ fontSize: '11px', color: attachedListingCount > 0 ? '#047857' : '#64748B', marginTop: '2px', fontWeight: 600 }}>
                                {attachedListingCount} active listing{attachedListingCount === 1 ? '' : 's'}
                              </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              {/* Toggle Active Button */}
                              <button
                                type="button"
                                onClick={() => handleToggleAreaActive(area)}
                                style={{
                                  backgroundColor: area.isActive ? '#EFF6FF' : '#F1F5F9',
                                  color: area.isActive ? '#1E40AF' : '#64748B',
                                  border: `1px solid ${area.isActive ? '#BFDBFE' : '#CBD5E1'}`,
                                  borderRadius: '6px',
                                  padding: '8px 12px',
                                  fontSize: '11.5px',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  minHeight: '44px'
                                }}
                                title={area.isActive ? 'Deactivate (hide from filters & new listings)' : 'Activate neighborhood'}
                              >
                                {area.isActive ? 'Active' : 'Enable'}
                              </button>

                              {/* Delete Area Button */}
                              <button
                                type="button"
                                onClick={() => handlePromptDeleteArea(area, currentCity.name)}
                                style={{
                                  backgroundColor: '#FFFFFF',
                                  color: '#DC2626',
                                  border: '1px solid #FECACA',
                                  borderRadius: '6px',
                                  padding: '6px 12px',
                                  fontSize: '11px',
                                  cursor: 'pointer',
                                  minHeight: '44px',
                                  minWidth: '44px',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center'
                                }}
                                title="Delete neighborhood"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })()}

          </div>
        )}

      </main>

      {/* -------------------------------------------------------------
          REJECTION FEEDBACK MODAL (Listing Pre-Publish Moderation)
         ------------------------------------------------------------- */}
      {/* -------------------------------------------------------------
          REJECTION FEEDBACK MODAL (Listing Pre-Publish Moderation)
         ------------------------------------------------------------- */}
      {rejectModalListing && (
        <div className="admin-modal-overlay">
          <div
            className="admin-modal-backdrop"
            onClick={() => setRejectModalListing(null)}
          />
          <div className="admin-modal-card">
            <div className="admin-modal-header">
              <div>
                <h3 style={{ margin: '0 0 4px', fontSize: '17px', fontWeight: 800, color: '#991B1B', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <AlertTriangle size={18} color="#DC2626" /> Reject Property Listing
                </h3>
                <p style={{ margin: 0, fontSize: '12px', color: '#636377' }}>
                  Provide specific compliance feedback for the lister to revise.
                </p>
              </div>
              <button
                type="button"
                className="admin-modal-close-btn"
                onClick={() => setRejectModalListing(null)}
                aria-label="Close rejection dialogue"
              >
                <X size={18} />
              </button>
            </div>

            <div className="admin-modal-body">
              <div style={{ backgroundColor: '#F8FAFC', padding: '12px 14px', borderRadius: '10px', border: '1px solid #E2E8F0', marginBottom: '16px' }}>
                <div style={{ fontWeight: 800, fontSize: '13px', color: '#000052' }}>{rejectModalListing.title}</div>
                <div style={{ fontSize: '11.5px', color: '#64748B', marginTop: '2px' }}>
                  {rejectModalListing.area}, Ibadan · {formatNaira(rejectModalListing.price)} · Lister: {rejectModalListing.lister?.fullName || 'Lister'}
                </div>
              </div>

              <form id="rejection-moderation-form" onSubmit={handleConfirmReject} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#000052', marginBottom: '6px' }}>
                    Rejection Reason Category
                  </label>
                  <select
                    value={rejectCategory}
                    onChange={(e) => setRejectCategory(e.target.value)}
                    style={{ width: '100%', minHeight: '42px', height: '42px', borderRadius: '8px', border: '1px solid #CBD5E1', padding: '0 10px', fontSize: '13px', outline: 'none', backgroundColor: '#FFFFFF' }}
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
              </form>
            </div>

            <div className="admin-modal-footer">
              <button
                type="button"
                onClick={() => setRejectModalListing(null)}
                style={{ backgroundColor: '#F1F5F9', color: '#475569', border: '1px solid #CBD5E1', padding: '10px 16px', borderRadius: '8px', fontWeight: 600, fontSize: '13px', cursor: 'pointer', minHeight: '44px' }}
              >
                Cancel
              </button>
              <button
                type="submit"
                form="rejection-moderation-form"
                style={{ backgroundColor: '#DC2626', color: '#FFFFFF', border: 'none', padding: '10px 18px', borderRadius: '8px', fontWeight: 700, fontSize: '13px', cursor: 'pointer', minHeight: '44px' }}
              >
                Confirm Rejection &amp; Notify Lister
              </button>
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------
          CENTERED POPUP MODAL WITH SCROLLING PROGRESS LINE
          (Replaces the side drawer to pop directly in the main page)
         ------------------------------------------------------------- */}
      {isModalOpen && selectedVerifItem && (
        <div className="admin-modal-overlay">
          {/* Dimmed Backdrop Blur Overlay */}
          <div
            className="admin-modal-backdrop"
            onClick={handleCloseModal}
          />

          {/* Centered Modal Card */}
          <div className="admin-modal-card admin-modal-card-lg" style={{
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
            <div className="admin-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '8px',
                  backgroundColor: '#ECFDF5',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
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
                className="admin-modal-close-btn"
                onClick={handleCloseModal}
                aria-label="Close modal"
              >
                <X size={18} color="#636377" />
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
              className="admin-modal-body"
              style={{
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
              <div className="admin-modal-metadata-grid" style={{
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

                <div className="admin-modal-assign-grid">
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
                      <option value="Unassigned">Unassigned</option>
                      {availableInspectors.map((ins) => (
                        <option key={ins.id} value={ins.name}>
                          {ins.name} ({ins.role})
                        </option>
                      ))}
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
            <div className="admin-modal-footer">
              <button
                type="button"
                className="admin-touch-target admin-footer-left"
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
                  cursor: 'pointer',
                  minHeight: '44px'
                }}
              >
                <Ban size={14} />
                <span>Revoke</span>
              </button>

              <button
                type="button"
                className="admin-touch-target"
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
                  cursor: 'pointer',
                  minHeight: '44px'
                }}
              >
                <MessageSquare size={15} />
                <span>Request changes</span>
              </button>

              <button
                type="button"
                className="admin-touch-target"
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
                  boxShadow: '0 2px 8px rgba(4, 120, 87, 0.25)',
                  minHeight: '44px'
                }}
              >
                <ShieldCheck size={16} />
                <span>Approve verified badge</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* -------------------------------------------------------------
          CONTACT LISTER MODAL (FR-6.4 Dispute Resolution)
         ------------------------------------------------------------- */}
      {contactingReportItem && (
        <div className="admin-modal-overlay">
          <div
            className="admin-modal-backdrop"
            onClick={() => setContactingReportItem(null)}
          />
          <div className="admin-modal-card">
            <div className="admin-modal-header">
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
                className="admin-modal-close-btn"
                onClick={() => setContactingReportItem(null)}
                aria-label="Close dialogue"
              >
                <X size={18} />
              </button>
            </div>

            <div className="admin-modal-body">
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

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px', marginBottom: '18px' }}>
                <a
                  href={`tel:${contactingReportItem.listerPhone || '+2348000000000'}`}
                  className="admin-touch-target"
                  style={{
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
                    textDecoration: 'none',
                    minHeight: '44px'
                  }}
                >
                  <Phone size={15} />
                  <span>Call Lister ({contactingReportItem.listerPhone || 'Call'})</span>
                </a>

                <a
                  href={`https://wa.me/${(contactingReportItem.listerPhone || '').replace(/[^0-9]/g, '')}?text=Hello%20from%20Rentivo%20Admin%20regarding%20${encodeURIComponent(contactingReportItem.listingTitle)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="admin-touch-target"
                  style={{
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
                    textDecoration: 'none',
                    minHeight: '44px'
                  }}
                >
                  <MessageSquare size={15} />
                  <span>WhatsApp Audit</span>
                </a>
              </div>
            </div>

            <div className="admin-modal-footer">
              <button
                type="button"
                className="admin-touch-target"
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
                  cursor: 'pointer',
                  minHeight: '44px'
                }}
              >
                Mark Investigating
              </button>

              <button
                type="button"
                className="admin-touch-target"
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
                  cursor: 'pointer',
                  minHeight: '44px'
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
      {/* -------------------------------------------------------------
          MODAL 1: REGISTER EXPANSION CITY MODAL (FR-7.6)
         ------------------------------------------------------------- */}
      {isAddCityModalOpen && (
        <div className="admin-modal-overlay">
          <div
            className="admin-modal-backdrop"
            onClick={() => setIsAddCityModalOpen(false)}
          />
          <div className="admin-modal-card">
            <div className="admin-modal-header">
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#000052' }}>
                  Register Expansion City
                </h3>
                <p style={{ margin: '3px 0 0', fontSize: '12.5px', color: '#64748B' }}>
                  Stage new metropolitan regions for Rentivo's multi-city expansion.
                </p>
              </div>
              <button
                type="button"
                className="admin-modal-close-btn"
                onClick={() => setIsAddCityModalOpen(false)}
                aria-label="Close dialogue"
              >
                <X size={18} />
              </button>
            </div>

            <div className="admin-modal-body">
              <form id="register-city-form" onSubmit={handleRegisterCity} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#000052', marginBottom: '4px' }}>
                    City Name <span style={{ color: '#DC2626' }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Lagos, Abeokuta, Port Harcourt"
                    value={newCityName}
                    onChange={(e) => setNewCityName(e.target.value)}
                    style={{
                      width: '100%',
                      minHeight: '42px',
                      height: '42px',
                      borderRadius: '8px',
                      border: '1px solid #CBD5E1',
                      padding: '0 12px',
                      fontSize: '13px',
                      color: '#000052',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#000052', marginBottom: '4px' }}>
                    State <span style={{ color: '#DC2626' }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Lagos, Ogun, Rivers"
                    value={newCityState}
                    onChange={(e) => setNewCityState(e.target.value)}
                    style={{
                      width: '100%',
                      minHeight: '42px',
                      height: '42px',
                      borderRadius: '8px',
                      border: '1px solid #CBD5E1',
                      padding: '0 12px',
                      fontSize: '13px',
                      color: '#000052',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#000052', marginBottom: '4px' }}>
                    Initial Neighborhoods (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Ikeja, Lekki, Victoria Island (comma-separated)"
                    value={newCityInitialAreas}
                    onChange={(e) => setNewCityInitialAreas(e.target.value)}
                    style={{
                      width: '100%',
                      minHeight: '42px',
                      height: '42px',
                      borderRadius: '8px',
                      border: '1px solid #CBD5E1',
                      padding: '0 12px',
                      fontSize: '13px',
                      color: '#000052',
                      boxSizing: 'border-box'
                    }}
                  />
                  <span style={{ fontSize: '11px', color: '#64748B', marginTop: '3px', display: 'block' }}>
                    Separate multiple neighborhoods with commas.
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px', backgroundColor: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                  <input
                    type="checkbox"
                    id="activate-city-now"
                    checked={newCityIsActive}
                    onChange={(e) => setNewCityIsActive(e.target.checked)}
                    style={{ cursor: 'pointer', width: '18px', height: '18px' }}
                  />
                  <label htmlFor="activate-city-now" style={{ fontSize: '12.5px', fontWeight: 600, color: '#000052', cursor: 'pointer' }}>
                    Activate immediately for live operations (uncheck to stage for Phase 2 rollout)
                  </label>
                </div>
              </form>
            </div>

            <div className="admin-modal-footer">
              <button
                type="button"
                className="admin-touch-target"
                onClick={() => setIsAddCityModalOpen(false)}
                style={{
                  backgroundColor: '#F1F5F9',
                  border: '1px solid #CBD5E1',
                  color: '#475569',
                  borderRadius: '8px',
                  padding: '9px 16px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  minHeight: '44px'
                }}
              >
                Cancel
              </button>

              <button
                type="submit"
                form="register-city-form"
                disabled={isSubmittingCity}
                className="admin-touch-target"
                style={{
                  backgroundColor: '#000052',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '9px 20px',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: isSubmittingCity ? 'wait' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  minHeight: '44px'
                }}
              >
                <Plus size={15} />
                <span>{isSubmittingCity ? 'Registering...' : 'Register City'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------
          MODAL 2: EDIT CITY DETAILS MODAL
         ------------------------------------------------------------- */}
      {editingCity && (
        <div className="admin-modal-overlay">
          <div
            className="admin-modal-backdrop"
            onClick={() => setEditingCity(null)}
          />
          <div className="admin-modal-card">
            <div className="admin-modal-header">
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#000052' }}>
                  Edit City: {editingCity.name}
                </h3>
                <p style={{ margin: '3px 0 0', fontSize: '12px', color: '#64748B' }}>
                  Update city metadata and operational state
                </p>
              </div>
              <button
                type="button"
                className="admin-modal-close-btn"
                onClick={() => setEditingCity(null)}
                aria-label="Close dialogue"
              >
                <X size={18} />
              </button>
            </div>

            <div className="admin-modal-body">
              <form id="edit-city-form" onSubmit={handleSaveEditCity} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#000052', marginBottom: '4px' }}>
                    City Name
                  </label>
                  <input
                    type="text"
                    required
                    value={editCityName}
                    onChange={(e) => setEditCityName(e.target.value)}
                    style={{
                      width: '100%',
                      minHeight: '42px',
                      height: '42px',
                      borderRadius: '8px',
                      border: '1px solid #CBD5E1',
                      padding: '0 12px',
                      fontSize: '13px',
                      color: '#000052',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#000052', marginBottom: '4px' }}>
                    State
                  </label>
                  <input
                    type="text"
                    required
                    value={editCityState}
                    onChange={(e) => setEditCityState(e.target.value)}
                    style={{
                      width: '100%',
                      minHeight: '42px',
                      height: '42px',
                      borderRadius: '8px',
                      border: '1px solid #CBD5E1',
                      padding: '0 12px',
                      fontSize: '13px',
                      color: '#000052',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px', backgroundColor: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                  <input
                    type="checkbox"
                    id="edit-city-active"
                    checked={editCityIsActive}
                    onChange={(e) => setEditCityIsActive(e.target.checked)}
                    style={{ cursor: 'pointer', width: '18px', height: '18px' }}
                  />
                  <label htmlFor="edit-city-active" style={{ fontSize: '12.5px', fontWeight: 600, color: '#000052', cursor: 'pointer' }}>
                    Active for Marketplace Operations
                  </label>
                </div>
              </form>
            </div>

            <div className="admin-modal-footer">
              <button
                type="button"
                className="admin-touch-target"
                onClick={() => setEditingCity(null)}
                style={{
                  backgroundColor: '#F1F5F9',
                  border: '1px solid #CBD5E1',
                  color: '#475569',
                  borderRadius: '8px',
                  padding: '8px 16px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  minHeight: '44px'
                }}
              >
                Cancel
              </button>

              <button
                type="submit"
                form="edit-city-form"
                className="admin-touch-target"
                style={{
                  backgroundColor: '#000052',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '8px 18px',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  minHeight: '44px'
                }}
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------
          MODAL 3: RELATIONAL DELETION CONFIRMATION & SAFETY MODAL
         ------------------------------------------------------------- */}
      {deleteConfirmation && (
        <div className="admin-modal-overlay">
          <div
            className="admin-modal-backdrop"
            onClick={() => setDeleteConfirmation(null)}
          />
          <div className="admin-modal-card">
            <div className="admin-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '50%',
                  backgroundColor: deleteConfirmation.hasListings ? '#FEF2F2' : '#FFF1F2',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#DC2626',
                  flexShrink: 0
                }}>
                  <AlertTriangle size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#000052' }}>
                    {deleteConfirmation.hasListings ? 'Relational Constraint Warning' : `Confirm Deleting ${deleteConfirmation.type === 'city' ? 'City' : 'Neighborhood'}`}
                  </h3>
                  <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
                    Target: {deleteConfirmation.name} {deleteConfirmation.cityName ? `(${deleteConfirmation.cityName})` : ''}
                  </div>
                </div>
              </div>
              <button
                type="button"
                className="admin-modal-close-btn"
                onClick={() => setDeleteConfirmation(null)}
                aria-label="Close dialogue"
              >
                <X size={18} />
              </button>
            </div>

            <div className="admin-modal-body">
              {deleteConfirmation.hasListings ? (
                <div style={{ marginBottom: '20px' }}>
                  <div style={{
                    padding: '12px 14px',
                    backgroundColor: '#FEF2F2',
                    border: '1px solid #FECACA',
                    borderRadius: '10px',
                    fontSize: '13px',
                    color: '#991B1B',
                    lineHeight: 1.5,
                    marginBottom: '12px'
                  }}>
                    <strong>Cannot permanently delete:</strong> There {deleteConfirmation.listingCount === 1 ? 'is' : 'are'} <strong>{deleteConfirmation.listingCount} active listing{deleteConfirmation.listingCount === 1 ? '' : 's'}</strong> linked to this {deleteConfirmation.type}. Deleting it would orphan those listings.
                  </div>
                  <p style={{ margin: 0, fontSize: '12.5px', color: '#475569', lineHeight: 1.5 }}>
                    <strong>Recommended Action:</strong> Deactivate this {deleteConfirmation.type} instead. This hides it from tenant search filters and new listing submissions while preserving historical integrity.
                  </p>
                </div>
              ) : (
                <div style={{ marginBottom: '20px' }}>
                  <p style={{ margin: 0, fontSize: '13px', color: '#334155', lineHeight: 1.5 }}>
                    Are you sure you want to permanently delete <strong>"{deleteConfirmation.name}"</strong>? Since zero listings reference this {deleteConfirmation.type}, it can be safely removed.
                  </p>
                </div>
              )}
            </div>

            <div className="admin-modal-footer">
              <button
                type="button"
                className="admin-touch-target"
                onClick={() => setDeleteConfirmation(null)}
                style={{
                  backgroundColor: '#F1F5F9',
                  border: '1px solid #CBD5E1',
                  color: '#475569',
                  borderRadius: '8px',
                  padding: '9px 16px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  minHeight: '44px'
                }}
              >
                Cancel
              </button>

              {deleteConfirmation.hasListings ? (
                <button
                  type="button"
                  className="admin-touch-target"
                  onClick={handleDeactivateInstead}
                  style={{
                    backgroundColor: '#D97706',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '9px 18px',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    minHeight: '44px'
                  }}
                >
                  Deactivate Location Instead
                </button>
              ) : (
                <button
                  type="button"
                  className="admin-touch-target"
                  onClick={deleteConfirmation.type === 'city' ? handleConfirmDeleteCity : handleConfirmDeleteArea}
                  style={{
                    backgroundColor: '#DC2626',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '9px 18px',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    minHeight: '44px'
                  }}
                >
                  Permanently Delete
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------
          MODAL 4: QUICK LOCATIONS MODAL (SYNCED OVERVIEW MODAL)
         ------------------------------------------------------------- */}
      {isLocationModalOpen && (
        <div className="admin-modal-overlay">
          <div
            className="admin-modal-backdrop"
            onClick={() => setIsLocationModalOpen(false)}
          />
          <div className="admin-modal-card admin-modal-card-lg">
            <div className="admin-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <MapPin size={22} color="#000052" />
                <div>
                  <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#000052' }}>
                    Multi-City Locations &amp; Regional Registry
                  </h3>
                  <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
                    Manage pilot coverage (Ibadan) and Phase 2 expansion cities
                  </div>
                </div>
              </div>
              <button
                type="button"
                className="admin-modal-close-btn"
                onClick={() => setIsLocationModalOpen(false)}
                aria-label="Close dialogue"
              >
                <X size={18} />
              </button>
            </div>

            <div className="admin-modal-body">
              {/* Quick Actions Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
                <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#000052', textTransform: 'uppercase' }}>
                  Operational &amp; Pipeline Cities ({allCities.length})
                </span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setIsLocationModalOpen(false);
                      setActiveSection('locations');
                    }}
                    style={{
                      backgroundColor: '#EFF6FF',
                      border: '1px solid #BFDBFE',
                      color: '#1E40AF',
                      borderRadius: '6px',
                      padding: '6px 12px',
                      fontSize: '11.5px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      minHeight: '44px'
                    }}
                  >
                    Open Full Locations Tab →
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsAddCityModalOpen(true)}
                    style={{
                      backgroundColor: '#000052',
                      border: 'none',
                      color: '#FFFFFF',
                      borderRadius: '6px',
                      padding: '6px 12px',
                      fontSize: '11.5px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      minHeight: '44px'
                    }}
                  >
                    <Plus size={13} />
                    <span>New City</span>
                  </button>
                </div>
              </div>

              {/* Cities Cards */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '22px' }}>
                {allCities.map(city => {
                  const attachedCount = listings.filter(l => l.city.toLowerCase() === city.name.toLowerCase()).length;
                  return (
                    <div
                      key={city.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px 14px',
                        borderRadius: '10px',
                        border: '1px solid #E2E8F0',
                        backgroundColor: city.isPilot ? '#F8FAFF' : '#FFFFFF',
                        flexWrap: 'wrap',
                        gap: '10px'
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 800, fontSize: '13.5px', color: '#000052', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span>{city.name}, {city.state} State</span>
                          {city.isPilot && (
                            <span style={{ fontSize: '10px', fontWeight: 800, backgroundColor: '#000052', color: '#FFFFFF', padding: '1px 6px', borderRadius: '4px' }}>
                              Pilot
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '11.5px', color: '#64748B', marginTop: '2px' }}>
                          {city.areas.length} neighborhoods · {attachedCount} active listings
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          backgroundColor: city.isActive ? '#ECFDF5' : '#FEF3C7',
                          color: city.isActive ? '#065F46' : '#92400E',
                          padding: '2px 8px',
                          borderRadius: '12px'
                        }}>
                          {city.isActive ? 'Active' : 'Staged'}
                        </span>

                        <button
                          type="button"
                          onClick={() => handleToggleCityStatus(city)}
                          style={{
                            backgroundColor: '#F1F5F9',
                            border: '1px solid #CBD5E1',
                            color: '#334155',
                            borderRadius: '6px',
                            padding: '6px 10px',
                            fontSize: '11px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            minHeight: '44px'
                          }}
                        >
                          {city.isActive ? 'Stage' : 'Activate'}
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setSelectedLocationCity(city.name);
                            setNewAreaCity(city.name);
                            setIsLocationModalOpen(false);
                            setActiveSection('locations');
                          }}
                          style={{
                            backgroundColor: '#000052',
                            color: '#FFFFFF',
                            border: 'none',
                            borderRadius: '6px',
                            padding: '6px 12px',
                            fontSize: '11px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            minHeight: '44px'
                          }}
                        >
                          Manage Areas
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Quick Add Area Form */}
              <div style={{ backgroundColor: '#F8FAFC', padding: '16px', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
                <div style={{ fontSize: '12.5px', fontWeight: 800, color: '#000052', marginBottom: '10px' }}>
                  Quick Add Neighborhood to City
                </div>
                <form onSubmit={handleAddAreaToCity} className="admin-modal-quick-add-form">
                  <select
                    value={newAreaCity}
                    onChange={(e) => setNewAreaCity(e.target.value)}
                    style={{
                      height: '44px',
                      minHeight: '44px',
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
                      height: '44px',
                      minHeight: '44px',
                      borderRadius: '6px',
                      border: '1px solid #CBD5E1',
                      padding: '0 12px',
                      fontSize: '13px',
                      outline: 'none'
                    }}
                  />

                  <button
                    type="submit"
                    disabled={isSubmittingArea || !newAreaName.trim()}
                    style={{
                      backgroundColor: '#000052',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '0 16px',
                      height: '44px',
                      minHeight: '44px',
                      fontSize: '13px',
                      fontWeight: 700,
                      cursor: isSubmittingArea ? 'wait' : 'pointer'
                    }}
                  >
                    Add Area
                  </button>
                </form>
              </div>
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
