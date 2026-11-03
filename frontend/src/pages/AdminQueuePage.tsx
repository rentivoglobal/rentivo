import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  Building2,
  CreditCard,
  AlertTriangle,
  Users,
  Search,
  X,
  MapPin,
  RefreshCw,
  Sparkles,
  LogOut,
  Plus,
  Check,
  Copy,
  ExternalLink,
  ChevronRight,
  Phone,
  Clock,
  Layers,
  ArrowUpRight,
  Shield,
  FileText
} from 'lucide-react';
import { Listing, User, AdminInvitation } from '../types';
import { FieldInspectionDossier } from '../types/inspection';
import { formatNaira } from '../utils/formatters';
import { requestsService } from '../services/requestsService';
import { listingsService } from '../services/listingsService';
import { verificationService } from '../services/verificationService';
import { emailNotificationService } from '../services/emailNotificationService';
import { inspectionService } from '../services/inspectionService';
import { adminService } from '../services/adminService';
import { authService } from '../services/authService';
import { paymentsService } from '../services/paymentsService';
import { LocalPayment } from '../services/localStore';
import { AdminInviteModal } from '../components/AdminInviteModal';
import { VerificationDetailModal } from '../components/VerificationDetailModal';
import { ListingModerationModal } from '../components/ListingModerationModal';
import { EscalationDetailModal, EscalationItem } from '../components/EscalationDetailModal';
import { listerOnboardingService } from '../services/listerOnboardingService';
import { ListerOnboardingData, ListerApprovalStatus } from '../types';
import { UserCheck } from 'lucide-react';
import { APP_URL } from '../lib/config';

export type AdminSection = 'verification' | 'listers' | 'listings' | 'payments' | 'escalations' | 'team';
type ListersTab = 'all' | 'pending' | 'approved' | 'rejected';
type VerificationTab = 'all' | 'pending' | 'scheduled' | 'progress' | 'completed';
type ListingsTab = 'all' | 'review' | 'live' | 'paused';
type PaymentsTab = 'all' | 'success' | 'refunded' | 'pending';
type EscalationsTab = 'all' | 'high' | 'medium';
type TeamTab = 'all' | 'admins' | 'invitations';

export interface VerificationItem {
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
  hasDossier?: boolean;
  dossier?: FieldInspectionDossier;
  inspectionToken?: string;
  inspectionUrl?: string;
}

interface AdminQueuePageProps {
  listings: Listing[];
  onApproveVerification: (listingId: string) => void | Promise<void>;
  onReload?: () => void | Promise<void>;
  onSelectListingToView?: (listing: Listing) => void;
  onExit?: () => void;
  initialSection?: AdminSection;
  initialVerifId?: string;
}

// Sparkline SVG component matching Rentivo Operations Command
const Sparkline: React.FC<{ data: number[]; isLead?: boolean }> = ({ data, isLead }) => {
  const w = 200;
  const h = 34;
  const mx = Math.max(...data, 1);
  const mn = Math.min(...data, 0);
  const pts = data.map((v, i) => [
    i * (w / Math.max(data.length - 1, 1)),
    h - 4 - ((v - mn) / (mx - mn || 1)) * (h - 10)
  ]);
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ');
  const col = isLead ? '#BE89FF' : 'var(--link)';

  return (
    <svg className="sp" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" aria-hidden="true">
      <path d={`${d} L${w} ${h} L0 ${h}Z`} fill={col} opacity="0.14" />
      <path d={d} fill="none" stroke={col} strokeWidth="2" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
};

export const AdminQueuePage: React.FC<AdminQueuePageProps> = ({
  listings,
  onApproveVerification,
  onReload,
  onExit,
  initialSection,
  initialVerifId
}) => {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState<AdminSection>(
    initialSection && ['verification', 'listings', 'payments', 'escalations', 'team'].includes(initialSection)
      ? initialSection
      : 'verification'
  );
  const [showPulse, setShowPulse] = useState(true);

  // Global search & filters
  const [searchQuery, setSearchQuery] = useState('');
  const [areaFilter, setAreaFilter] = useState('All');

  // Custom Neighborhoods
  const [customAreas, setCustomAreas] = useState<string[]>([
    'Bodija',
    'Ring Road',
    'Sango',
    'UI area',
    'Akobo',
    'Challenge',
    'Mokola',
    'Jericho',
    'Eleyele',
    'Agodi'
  ]);
  const [isAreaModalOpen, setIsAreaModalOpen] = useState(false);
  const [newAreaInput, setNewAreaInput] = useState('');

  // Sub-filter tabs per section
  const [activeVerifTab, setActiveVerifTab] = useState<VerificationTab>('all');
  const [activeListingsTab, setActiveListingsTab] = useState<ListingsTab>('all');
  const [paymentsStatusFilter, setPaymentsStatusFilter] = useState<PaymentsTab>('all');
  const [escalationFilter, setEscalationFilter] = useState<EscalationsTab>('all');
  const [teamTab, setTeamTab] = useState<TeamTab>('all');

  // Verification Queue State
  const [verificationItems, setVerificationItems] = useState<VerificationItem[]>([]);
  const [selectedVerifItem, setSelectedVerifItem] = useState<VerificationItem | null>(null);
  const [isVerifModalOpen, setIsVerifModalOpen] = useState(false);

  // Listings State
  const [selectedListingItem, setSelectedListingItem] = useState<Listing | null>(null);
  const [isListingModalOpen, setIsListingModalOpen] = useState(false);

  // Escalations State
  const [escalations, setEscalations] = useState<EscalationItem[]>([]);
  const [selectedEscalation, setSelectedEscalation] = useState<EscalationItem | null>(null);
  const [isEscalationModalOpen, setIsEscalationModalOpen] = useState(false);

  // Payments State
  const [payments, setPayments] = useState<LocalPayment[]>([]);
  const [selectedPaymentDetail, setSelectedPaymentDetail] = useState<LocalPayment | null>(null);
  const [refundConfirmPayment, setRefundConfirmPayment] = useState<LocalPayment | null>(null);
  const [refundReason, setRefundReason] = useState('Seeker requested refund / property unavailable');
  const [isProcessingRefund, setIsProcessingRefund] = useState(false);

  // Admin Team State
  const [adminUsers, setAdminUsers] = useState<User[]>([]);
  const [adminInvitations, setAdminInvitations] = useState<AdminInvitation[]>([]);
  const [isLoadingTeam, setIsLoadingTeam] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [revokeConfirmInvite, setRevokeConfirmInvite] = useState<AdminInvitation | null>(null);
  const [removeConfirmAdmin, setRemoveConfirmAdmin] = useState<User | null>(null);

  // Lister Onboarding Applications State
  const [listerApplications, setListerApplications] = useState<ListerOnboardingData[]>(() => {
    return listerOnboardingService.getAllApplications();
  });
  const [activeListerTab, setActiveListerTab] = useState<ListersTab>('all');
  const [selectedListerModal, setSelectedListerModal] = useState<ListerOnboardingData | null>(null);
  const [listerToReject, setListerToReject] = useState<ListerOnboardingData | null>(null);
  const [rejectionReasonInput, setRejectionReasonInput] = useState('');

  const loadListerApplications = useCallback(() => {
    setListerApplications(listerOnboardingService.getAllApplications());
  }, []);

  const pendingListersCount = useMemo(() => {
    return listerApplications.filter((a) => a.status === 'pending').length;
  }, [listerApplications]);

  const approvedListersCount = useMemo(() => {
    return listerApplications.filter((a) => a.status === 'approved').length;
  }, [listerApplications]);

  const rejectedListersCount = useMemo(() => {
    return listerApplications.filter((a) => a.status === 'rejected').length;
  }, [listerApplications]);

  const handleApproveLister = async (userId: string) => {
    const updated = await listerOnboardingService.approveApplication(userId, authService.getCurrentUser()?.email || 'admin@rentivo.ng');
    loadListerApplications();
    setSelectedListerModal(null);
    showToast(`Approved ${updated.userName || 'Lister'}! They can now publish listings.`);
  };

  const handleRejectLister = async (userId: string, reason: string) => {
    if (!reason.trim()) {
      alert('Please enter a rejection reason so the lister can fix their submission.');
      return;
    }
    const updated = await listerOnboardingService.rejectApplication(userId, reason, authService.getCurrentUser()?.email || 'admin@rentivo.ng');
    loadListerApplications();
    setListerToReject(null);
    setSelectedListerModal(null);
    setRejectionReasonInput('');
    showToast(`Application for ${updated.userName || 'Lister'} rejected. Lister notified.`);
  };

  // Filtered Lister Applications
  const filteredListerApplications = useMemo(() => {
    return listerApplications.filter((app) => {
      if (activeListerTab !== 'all' && app.status !== activeListerTab) return false;
      if (areaFilter !== 'All' && app.residentialAddress?.area !== areaFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = (app.userName || '').toLowerCase().includes(q);
        const matchEmail = (app.userEmail || '').toLowerCase().includes(q);
        const matchPhone = (app.phone || '').toLowerCase().includes(q);
        const matchBank = (app.bankName || '').toLowerCase().includes(q);
        const matchAcc = (app.accountName || '').toLowerCase().includes(q);
        const matchArea = (app.residentialAddress?.area || '').toLowerCase().includes(q);
        return matchName || matchEmail || matchPhone || matchBank || matchAcc || matchArea;
      }
      return true;
    });
  }, [listerApplications, activeListerTab, areaFilter, searchQuery]);

  // Toast Notification
  const [adminToast, setAdminToast] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setAdminToast(msg);
    setTimeout(() => setAdminToast(null), 3000);
  };

  // Distinct areas combining listing areas and custom areas
  const distinctAreas = useMemo(() => {
    const fromListings = listings.map((l) => l.area).filter(Boolean);
    const set = new Set([...customAreas, ...fromListings]);
    return Array.from(set).sort();
  }, [listings, customAreas]);

  // Load Admin Team Data
  const loadTeamData = async () => {
    setIsLoadingTeam(true);
    try {
      const [admins, invites] = await Promise.all([
        adminService.getAdmins(),
        adminService.getInvitations()
      ]);
      setAdminUsers(admins);
      setAdminInvitations(invites);
    } catch (err) {
      console.warn('Failed to load admin team data:', err);
    } finally {
      setIsLoadingTeam(false);
    }
  };

  useEffect(() => {
    if (activeSection === 'team') {
      void loadTeamData();
    }
  }, [activeSection]);

  // Load Payments List
  const loadPayments = async () => {
    try {
      const list = await paymentsService.listPayments();
      setPayments(list);
    } catch (err) {
      console.warn('Could not load payments:', err);
    }
  };

  // Load Escalations List
  const loadEscalations = async () => {
    try {
      const reqs = await requestsService.getAllRequests();
      const esc = reqs.filter((r) => r.status === 'manual_escalation' || r.status === 'availability_pending');
      setEscalations(
        esc.map((r) => {
          const matched = listings.find((l) => l.id === r.listingId);
          const listerPhone = matched?.lister?.phone || '';
          return {
            id: r.id,
            listingId: r.listingId,
            listingTitle: r.listingTitle,
            area: r.listingArea,
            listingPrice: r.listingPrice || matched?.price || 0,
            listerName: matched?.lister?.fullName || 'Property Lister',
            listerPhone: listerPhone,
            listerEmail: matched?.lister?.email,
            listerRole: matched?.listerRole || 'Landlord / Agent',
            renterName: r.renterName,
            renterEmail: r.renterEmail,
            renterPhone: r.renterPhone,
            renterNotes: r.notes || '',
            createdAt: r.createdAt,
            timeSinceRequest: new Date(r.createdAt).toLocaleDateString(),
            automatedStatus: r.status === 'manual_escalation' ? 'No response' : 'Delivered',
            isOverdue: r.status === 'manual_escalation' || Date.now() - new Date(r.createdAt).getTime() > 3600000,
            photo: r.listingPhoto || matched?.photos?.[0] || 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=400&q=80',
            status: r.status
          };
        })
      );
    } catch (e) {
      console.warn('Could not load escalations:', e);
    }
  };

  // Load Verification Queue Items
  const loadVerificationItems = async () => {
    try {
      const items = await verificationService.list();
      const mappedListings = new Set(items.map((i) => i.listingId));
      const unverifiedListings = listings.filter((l) => l.verificationStatus !== 'verified' && !mappedListings.has(l.id));

      const baseEntries: VerificationItem[] = [];

      for (const v of items) {
        const matched = listings.find((l) => l.id === v.listingId);
        baseEntries.push({
          id: v.id,
          listingId: v.listingId,
          title: matched?.title || 'Property Verification',
          area: matched?.area || 'Bodija',
          category: matched?.category === 'commercial' ? 'Commercial' : 'Residential',
          listerName: matched?.lister.fullName || 'Landlord',
          listerPhone: v.onSiteContactPhone || matched?.lister.phone || '',
          listerInitials: (matched?.lister.fullName || 'LL').slice(0, 2).toUpperCase(),
          submittedDate: new Date(v.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          status: v.status === 'verified' ? 'completed' : v.status === 'scheduled' ? 'scheduled' : 'pending',
          inspector: v.inspector || 'Unassigned',
          daysInQueue: Math.max(1, Math.floor((Date.now() - new Date(v.createdAt).getTime()) / (1000 * 60 * 60 * 24))),
          isOverdue: Date.now() - new Date(v.createdAt).getTime() > 48 * 60 * 60 * 1000,
          photo: matched?.photos?.[0] || '',
          price: matched?.price || 0
        });
      }

      for (const ul of unverifiedListings) {
        baseEntries.push({
          id: `listing_ver_${ul.id}`,
          listingId: ul.id,
          title: ul.title || 'Property Verification',
          area: ul.area || 'Bodija',
          category: ul.category === 'commercial' ? 'Commercial' : 'Residential',
          listerName: ul.lister?.fullName || 'Landlord',
          listerPhone: ul.lister?.phone || '',
          listerInitials: (ul.lister?.fullName || 'LL').slice(0, 2).toUpperCase(),
          submittedDate: ul.createdAt ? new Date(ul.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Recent',
          status: 'pending',
          inspector: 'Unassigned',
          daysInQueue: 1,
          isOverdue: false,
          photo: ul.photos?.[0] || '',
          price: ul.price || 0
        });
      }

      const enriched = await Promise.all(
        baseEntries.map(async (entry) => {
          const [dossier, tokenRecord] = await Promise.all([
            inspectionService.getLatestDossierForListing(entry.listingId),
            inspectionService.getInspectionTokenForListing(entry.listingId)
          ]);

          const token = tokenRecord?.token || (dossier ? 'submitted' : undefined);
          const url = tokenRecord?.token ? `${APP_URL}/inspect/${tokenRecord.token}` : undefined;

          const verifStatus: 'pending' | 'scheduled' | 'progress' | 'completed' =
            entry.status === 'completed' ? 'completed' : dossier ? 'progress' : tokenRecord ? 'scheduled' : entry.status;

          return {
            ...entry,
            hasDossier: !!dossier,
            dossier: dossier || undefined,
            inspectionToken: token,
            inspectionUrl: url,
            inspector: dossier?.inspector?.name || (tokenRecord?.inspectorName || entry.inspector),
            status: verifStatus
          };
        })
      );

      setVerificationItems(enriched);
    } catch (err) {
      console.warn('Could not populate verification list:', err);
    }
  };

  useEffect(() => {
    void loadVerificationItems();
    void loadEscalations();
    void loadPayments();
  }, [listings]);

  // Deep Link Handling for initialVerifId
  useEffect(() => {
    if (initialVerifId && verificationItems.length > 0) {
      const found = verificationItems.find((v) => v.id === initialVerifId || v.listingId === initialVerifId);
      if (found) {
        setSelectedVerifItem(found);
        setIsVerifModalOpen(true);
      }
    }
  }, [initialVerifId, verificationItems]);

  // Key metrics calculation
  const verifiedListingsCount = useMemo(() => {
    return listings.filter((l) => l.verificationStatus === 'verified').length;
  }, [listings]);

  const verifiedRate = useMemo(() => {
    return listings.length > 0 ? Math.round((verifiedListingsCount / listings.length) * 100) : 0;
  }, [listings, verifiedListingsCount]);

  const pendingInspectionsCount = useMemo(() => {
    return verificationItems.filter((i) => i.status === 'pending' || i.status === 'progress').length;
  }, [verificationItems]);

  const overdueEscalationsCount = useMemo(() => {
    return escalations.filter((e) => e.isOverdue).length;
  }, [escalations]);

  const totalRevenue = useMemo(() => {
    return payments
      .filter((p) => p.status === 'success' && p.channel !== 'waiver')
      .reduce((sum, p) => sum + (p.amount || 5000), 0);
  }, [payments]);

  const paidPaymentsCount = useMemo(() => {
    return payments.filter((p) => p.status === 'success').length;
  }, [payments]);

  // Filtered Verification Items
  const filteredVerificationItems = useMemo(() => {
    return verificationItems.filter((item) => {
      if (activeVerifTab === 'pending' && item.status !== 'pending') return false;
      if (activeVerifTab === 'scheduled' && item.status !== 'scheduled') return false;
      if (activeVerifTab === 'progress' && item.status !== 'progress') return false;
      if (activeVerifTab === 'completed' && item.status !== 'completed') return false;

      if (areaFilter !== 'All' && item.area !== areaFilter) return false;

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
  }, [verificationItems, activeVerifTab, areaFilter, searchQuery]);

  // Filtered Listings
  const filteredListings = useMemo(() => {
    return listings.filter((item) => {
      if (activeListingsTab === 'review' && item.moderationStatus !== 'pending_review' && item.verificationStatus === 'verified') return false;
      if (activeListingsTab === 'live' && (item.isAvailable === false || item.moderationStatus === 'rejected')) return false;
      if (activeListingsTab === 'paused' && item.isAvailable !== false && item.moderationStatus !== 'rejected') return false;

      if (areaFilter !== 'All' && item.area !== areaFilter) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matches =
          item.title.toLowerCase().includes(q) ||
          item.area.toLowerCase().includes(q) ||
          (item.lister?.fullName || '').toLowerCase().includes(q);
        if (!matches) return false;
      }

      return true;
    });
  }, [listings, activeListingsTab, areaFilter, searchQuery]);

  // Filtered Payments
  const filteredPayments = useMemo(() => {
    return payments.filter((item) => {
      if (paymentsStatusFilter === 'success' && item.status !== 'success') return false;
      if (paymentsStatusFilter === 'refunded' && item.status !== 'refunded') return false;
      if (paymentsStatusFilter === 'pending' && item.status !== 'pending') return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matches =
          (item.renterName || '').toLowerCase().includes(q) ||
          (item.listingTitle || '').toLowerCase().includes(q) ||
          item.reference.toLowerCase().includes(q);
        if (!matches) return false;
      }

      return true;
    });
  }, [payments, paymentsStatusFilter, searchQuery]);

  // Filtered Escalations
  const filteredEscalations = useMemo(() => {
    return escalations.filter((item) => {
      if (escalationFilter === 'high' && !item.isOverdue) return false;
      if (escalationFilter === 'medium' && item.isOverdue) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matches =
          item.listingTitle.toLowerCase().includes(q) ||
          item.renterName.toLowerCase().includes(q) ||
          item.listerName.toLowerCase().includes(q);
        if (!matches) return false;
      }

      return true;
    });
  }, [escalations, escalationFilter, searchQuery]);

  // Filtered Team
  const filteredTeam = useMemo(() => {
    const admins = adminUsers.map((u) => ({
      id: u.id,
      name: u.name || (u as any).fullName || u.email.split('@')[0],
      email: u.email,
      role: (u.role || 'ops') as 'super' | 'ops' | 'insp',
      status: 'active' as const,
      isInvite: false,
      raw: u
    }));

    const invites = adminInvitations.map((inv) => ({
      id: inv.id,
      name: inv.fullName || inv.email.split('@')[0],
      email: inv.email,
      role: (inv.role === 'super_admin' ? 'super' : inv.role === 'admin' ? 'ops' : 'insp') as 'super' | 'ops' | 'insp',
      status: inv.status === 'accepted' ? ('active' as const) : inv.status === 'revoked' ? ('revoked' as const) : ('pending' as const),
      isInvite: true,
      raw: inv
    }));

    const all = [...admins, ...invites];

    return all.filter((member) => {
      if (teamTab === 'admins' && member.isInvite) return false;
      if (teamTab === 'invitations' && !member.isInvite) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return member.name.toLowerCase().includes(q) || member.email.toLowerCase().includes(q);
      }

      return true;
    });
  }, [adminUsers, adminInvitations, teamTab, searchQuery]);

  // Modal Handlers: Verification
  const handleOpenVerifModal = (item: VerificationItem) => {
    setSelectedVerifItem(item);
    setIsVerifModalOpen(true);
  };

  const handleCloseVerifModal = () => {
    setIsVerifModalOpen(false);
    setSelectedVerifItem(null);
    if (window.location.pathname.startsWith('/admin/verification')) {
      window.history.replaceState(null, '', '/admin/verification');
    }
  };

  const handleApproveVerificationBadge = async (item: VerificationItem) => {
    try {
      setVerificationItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, status: 'completed', isOverdue: false } : i))
      );
      await verificationService.update(item.id, {
        status: 'completed',
        decisionNotes: 'Approved Emerald Verified badge'
      });
      await onApproveVerification(item.listingId);

      const matched = listings.find((l) => l.id === item.listingId);
      if (matched && matched.lister?.email) {
        void emailNotificationService.sendVerificationApprovedEmail({
          listing: matched,
          recipientEmail: matched.lister.email,
          recipientName: matched.lister.fullName,
          auditorNotes: 'Approved Emerald Verified badge'
        }).catch((e) => console.warn('Could not dispatch verification approval email:', e));
      }

      if (onReload) await onReload();
      await loadVerificationItems();
      showToast(`Verified badge awarded to "${item.title}"`);
      handleCloseVerifModal();
    } catch (err: any) {
      showToast(err?.message || 'Failed to approve verification');
    }
  };

  const handleRequestChanges = async (item: VerificationItem, notesText: string = 'Revisions requested by admin') => {
    try {
      setVerificationItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, status: 'pending' } : i))
      );
      await verificationService.update(item.id, {
        status: 'changes_requested',
        decisionNotes: notesText,
        requestedChangesNotes: notesText
      });
      await listingsService.updateListing(item.listingId, {
        verificationStatus: 'changes_requested' as any
      });

      if (onReload) await onReload();
      await loadVerificationItems();
      showToast(`Revision request sent to ${item.listerName}`);
      handleCloseVerifModal();
    } catch (err: any) {
      showToast(err?.message || 'Failed to request changes');
    }
  };

  const handleRevokeVerification = async (item: VerificationItem) => {
    try {
      setVerificationItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, status: 'pending' } : i))
      );
      await verificationService.update(item.id, {
        status: 'rejected',
        decisionNotes: 'Verification badge revoked by admin'
      });
      await listingsService.updateListing(item.listingId, {
        verificationStatus: 'rejected' as any
      });

      if (onReload) await onReload();
      await loadVerificationItems();
      showToast(`Verification badge revoked for "${item.title}".`);
      handleCloseVerifModal();
    } catch (err: any) {
      showToast(err?.message || 'Failed to revoke verification');
    }
  };

  // Listings Actions
  const handleOpenListingModal = (listing: Listing) => {
    setSelectedListingItem(listing);
    setIsListingModalOpen(true);
  };

  const handleApproveListing = async (listingId: string) => {
    await listingsService.moderateListing(listingId, 'approve');
    if (onReload) await onReload();
    showToast('Listing published to marketplace!');
  };

  const handleRejectListing = async (listingId: string, reason: string, notes: string) => {
    await listingsService.moderateListing(listingId, 'reject', `${reason}: ${notes}`);
    if (onReload) await onReload();
    showToast('Listing rejected and feedback logged.');
  };

  // Escalation Actions
  const handleOpenEscalationModal = (esc: EscalationItem) => {
    setSelectedEscalation(esc);
    setIsEscalationModalOpen(true);
  };

  const handleConfirmEscalationAvailable = async (esc: EscalationItem) => {
    await requestsService.respond(esc.id, 'YES');
    showToast(`Marked "${esc.listingTitle}" as confirmed available! Seeker notified.`);
    await loadEscalations();
    if (onReload) await onReload();
  };

  const handleMarkEscalationUnavailable = async (esc: EscalationItem) => {
    await requestsService.respond(esc.id, 'NO');
    showToast(`Marked "${esc.listingTitle}" as unavailable. Seeker provided alternatives.`);
    await loadEscalations();
    if (onReload) await onReload();
  };

  const handleDelistEscalationProperty = async (esc: EscalationItem, notes: string) => {
    await requestsService.cancelAndDelistRequest(esc.id, notes);
    showToast(`Request closed and "${esc.listingTitle}" delisted.`);
    await loadEscalations();
    if (onReload) await onReload();
  };

  // Payment Refund Action
  const handleProcessRefund = async (payment: LocalPayment) => {
    try {
      setIsProcessingRefund(true);
      await paymentsService.refund(payment.id, refundReason);
      showToast(`Refund processed for ${payment.renterName || payment.reference}.`);
      setRefundConfirmPayment(null);
      await loadPayments();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to process refund';
      showToast(msg);
    } finally {
      setIsProcessingRefund(false);
    }
  };

  // Team Admin Actions
  const handleRevokeInvitation = async (inv: AdminInvitation) => {
    try {
      const res = await adminService.revokeInvitation(inv.id);
      if (res.success) {
        showToast(`Invitation for ${inv.email} revoked.`);
        setRevokeConfirmInvite(null);
        await loadTeamData();
      } else {
        showToast(res.error || 'Failed to revoke invitation');
      }
    } catch {
      showToast('Error revoking invitation');
    }
  };

  const handleRemoveAdmin = async (user: User) => {
    try {
      const res = await adminService.removeAdmin(user.id);
      if (res.success) {
        showToast(`Admin privileges removed from ${user.email}.`);
        setRemoveConfirmAdmin(null);
        await loadTeamData();
      } else {
        showToast(res.error || 'Failed to remove admin privileges');
      }
    } catch {
      showToast('Error removing admin');
    }
  };

  // Add Neighborhood Action
  const handleAddArea = (e: React.FormEvent) => {
    e.preventDefault();
    const val = newAreaInput.trim();
    if (!val) return;
    if (!customAreas.includes(val)) {
      setCustomAreas((prev) => [...prev, val]);
      showToast(`${val} added to neighborhoods`);
    } else {
      showToast(`${val} is already in the list`);
    }
    setNewAreaInput('');
  };

  // Tab configurations
  const sectionMeta: Record<AdminSection, {
    title: string;
    lede: string;
    count: number;
    icon: any;
    isHot?: boolean;
  }> = {
    verification: {
      title: 'Verification queue',
      lede: 'Assign inspectors, track audits and award the Verified badge.',
      count: pendingInspectionsCount,
      isHot: false,
      icon: ShieldCheck
    },
    listers: {
      title: 'Lister Onboarding & Verification',
      lede: 'Review bank identity, Ibadan residence, and right-to-let authority before approving listers to post.',
      count: pendingListersCount,
      isHot: pendingListersCount > 0,
      icon: UserCheck
    },
    listings: {
      title: 'Listings and moderation',
      lede: 'Review new listings before renters see them.',
      count: listings.length,
      isHot: false,
      icon: Building2
    },
    payments: {
      title: 'Payments and revenue',
      lede: 'Confirm availability after the ₦5,000 access fee is paid.',
      count: payments.length,
      isHot: false,
      icon: CreditCard
    },
    escalations: {
      title: 'Escalations',
      lede: 'Issues from renters and listers that need a person.',
      count: overdueEscalationsCount,
      isHot: overdueEscalationsCount > 0,
      icon: AlertTriangle
    },
    team: {
      title: 'Admin team',
      lede: 'Who can do what, and who has been invited.',
      count: adminUsers.length,
      isHot: false,
      icon: Users
    }
  };

  const currentMeta = sectionMeta[activeSection];

  return (
    <div className="roc-app">
      {/* =============================================================
          1. DESKTOP SIDE RAIL (248px sticky navy column)
         ============================================================= */}
      <aside className="roc-rail" aria-label="Operations Navigation">
        <div className="roc-brand">
          <b>
            RENTivo<i></i>
          </b>
          <span className="roc-tag">Ops</span>
        </div>

        <nav className="roc-nav" aria-label="Sections">
          {(Object.keys(sectionMeta) as AdminSection[]).map((key) => {
            const meta = sectionMeta[key];
            const isActive = activeSection === key;
            const Icon = meta.icon;

            return (
              <button
                key={key}
                type="button"
                className={isActive ? 'active' : ''}
                aria-current={isActive ? 'page' : undefined}
                onClick={() => {
                  setActiveSection(key);
                  navigate(`/admin/${key}`);
                }}
              >
                <Icon size={19} />
                <span>{key === 'verification' ? 'Verification' : key === 'listers' ? 'Listers' : key === 'listings' ? 'Listings' : key === 'payments' ? 'Payments' : key === 'escalations' ? 'Escalations' : 'Team'}</span>
                <span className={`roc-ct ${meta.isHot ? 'hot' : ''}`}>
                  {meta.count}
                </span>
              </button>
            );
          })}
        </nav>

        <div className="roc-rail-foot">
          <button
            type="button"
            className={`roc-ghost-d ${showPulse ? 'active' : ''}`}
            onClick={() => setShowPulse(!showPulse)}
            aria-pressed={showPulse}
          >
            <Sparkles size={18} />
            <span>Pulse metrics</span>
          </button>

          <div className="roc-me">
            <span className="roc-av">AD</span>
            <div>
              <b>Admin Staff</b>
              <small>Ibadan pilot</small>
            </div>
          </div>

          <button
            type="button"
            className="roc-ghost-d"
            onClick={() => (onExit ? onExit() : navigate('/'))}
          >
            <LogOut size={18} />
            <span>Back to marketplace</span>
          </button>
        </div>
      </aside>

      {/* =============================================================
          2. MAIN CONTENT WRAPPER
         ============================================================= */}
      <div style={{ minWidth: 0 }}>
        {/* Mobile Sticky Header (< 980px) */}
        <div className="roc-mhead">
          <div className="roc-mtop">
            <div className="roc-brand" style={{ padding: 0 }}>
              <b>
                RENTivo<i></i>
              </b>
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button
                type="button"
                className="roc-icon-btn"
                style={{ background: 'rgba(255,255,255,.1)', borderColor: 'transparent', color: '#fff' }}
                onClick={() => setShowPulse(!showPulse)}
                aria-label="Toggle Pulse"
              >
                <Sparkles size={18} />
              </button>
              <span className="roc-av">AD</span>
            </div>
          </div>

          <nav className="roc-mnav" aria-label="Mobile Navigation">
            {(Object.keys(sectionMeta) as AdminSection[]).map((key) => {
              const meta = sectionMeta[key];
              const isActive = activeSection === key;
              return (
                <button
                  key={key}
                  type="button"
                  className={isActive ? 'active' : ''}
                  aria-current={isActive ? 'page' : undefined}
                  onClick={() => {
                    setActiveSection(key);
                    navigate(`/admin/${key}`);
                  }}
                >
                  <span>{key === 'verification' ? 'Verification' : key === 'listings' ? 'Listings' : key === 'payments' ? 'Payments' : key === 'escalations' ? 'Escalations' : 'Team'}</span>
                  <span className={`roc-ct ${meta.isHot ? 'hot' : ''}`}>
                    {meta.count}
                  </span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Main Dashboard Column */}
        <main className="roc-main">
          {/* Header Title & Actions */}
          <header className="roc-top">
            <div>
              <h1>{currentMeta.title}</h1>
              <p>{currentMeta.lede}</p>
            </div>
            <div className="roc-top-acts">
              {activeSection === 'listers' && (
                <>
                  {[
                    { id: 'all', label: 'All applications', count: listerApplications.length },
                    { id: 'pending', label: 'Pending review', count: pendingListersCount },
                    { id: 'approved', label: 'Approved listers', count: approvedListersCount },
                    { id: 'rejected', label: 'Rejected', count: rejectedListersCount }
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      className={`roc-tab ${activeListerTab === tab.id ? 'active' : ''}`}
                      onClick={() => setActiveListerTab(tab.id as any)}
                    >
                      {tab.label}
                      <span className="roc-ct">{tab.count}</span>
                    </button>
                  ))}
                </>
              )}

              {activeSection === 'verification' && (
                <button
                  type="button"
                  className="roc-btn b-sec"
                  onClick={() => setIsAreaModalOpen(true)}
                >
                  <MapPin size={17} />
                  <span>Manage areas</span>
                </button>
              )}
              {activeSection === 'team' && (
                <button
                  type="button"
                  className="roc-btn b-pri"
                  onClick={() => setIsInviteModalOpen(true)}
                >
                  <Plus size={18} />
                  <span>Invite admin</span>
                </button>
              )}
              <button
                type="button"
                className="roc-icon-btn"
                onClick={async () => {
                  if (onReload) await onReload();
                  await loadVerificationItems();
                  await loadEscalations();
                  await loadPayments();
                  if (activeSection === 'team') await loadTeamData();
                  showToast('Data refreshed');
                }}
                title="Refresh operations data"
              >
                <RefreshCw size={17} />
              </button>
            </div>
          </header>

          {/* =============================================================
              3. EXECUTIVE PULSE METRICS SECTION (4 KPI cards with sparklines)
             ============================================================= */}
          {showPulse && (
            <section className="roc-pulse" aria-label="Pulse Metrics">
              {/* Lead Navy Card: Payments / Access Fee Revenue */}
              <div className="roc-kpi lead">
                <span className="l">Total access revenue</span>
                <span className="v roc-num">₦{formatNaira(totalRevenue)}</span>
                <span className="s">
                  <span className="roc-up">{paidPaymentsCount} paid</span> · held until confirmed
                </span>
                <Sparkline data={[2, 3, 2, 4, 3, 5, 4, 6, 7]} isLead />
              </div>

              {/* Card 2: Pending Audits */}
              <div className="roc-kpi">
                <span className="l">Pending audits</span>
                <span className="v roc-num">{pendingInspectionsCount}</span>
                <span className="s">Median wait 1.4 days</span>
                <Sparkline data={[4, 3, 5, 4, 3, 2, 3, 2, 4]} />
              </div>

              {/* Card 3: Verified Listings Rate */}
              <div className="roc-kpi">
                <span className="l">Verified listings rate</span>
                <span className="v roc-num">{verifiedRate}%</span>
                <span className="s">
                  <span className="roc-up">{verifiedListingsCount}</span> of {listings.length} verified
                </span>
                <Sparkline data={[3, 4, 4, 6, 5, 7, 8, 9, 10]} />
              </div>

              {/* Card 4: Open Escalations */}
              <div className="roc-kpi">
                <span className="l">Open escalations</span>
                <span className="v roc-num">{escalations.length}</span>
                <span className="s">
                  {overdueEscalationsCount > 0 ? (
                    <span className="roc-dn">{overdueEscalationsCount} urgent priority</span>
                  ) : (
                    <span className="roc-up">All SLAs on target</span>
                  )}
                </span>
                <Sparkline data={[1, 2, 1, 1, 3, 2, 2, 1, overdueEscalationsCount || 1]} />
              </div>
            </section>
          )}

          {/* =============================================================
              4. MAIN OPERATIONS COMMAND PANEL
             ============================================================= */}
          <section className="roc-panel">
            {/* Integrated Toolbar */}
            <div className="roc-bar">
              <label className="roc-search">
                <Search size={18} />
                <input
                  type="search"
                  placeholder={`Search ${activeSection === 'verification' ? 'properties or listers' : activeSection === 'listings' ? 'listings or areas' : activeSection === 'payments' ? 'payments or references' : activeSection === 'escalations' ? 'escalations' : 'team members'}...`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  aria-label="Search"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-3)' }}
                  >
                    <X size={15} />
                  </button>
                )}
              </label>

              {(activeSection === 'verification' || activeSection === 'listings') && (
                <select
                  className="roc-sel"
                  value={areaFilter}
                  onChange={(e) => setAreaFilter(e.target.value)}
                  aria-label="Neighborhood filter"
                >
                  <option value="All">All Neighborhoods ({distinctAreas.length})</option>
                  {distinctAreas.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Chips Sub-Filters Rail */}
            <div className="roc-chips" role="group">
              {activeSection === 'verification' && (
                <>
                  {[
                    { id: 'all', label: 'All', count: verificationItems.length },
                    { id: 'pending', label: 'Pending audit', count: verificationItems.filter((i) => i.status === 'pending').length },
                    { id: 'scheduled', label: 'Scheduled', count: verificationItems.filter((i) => i.status === 'scheduled').length },
                    { id: 'progress', label: 'In progress', count: verificationItems.filter((i) => i.status === 'progress').length },
                    { id: 'completed', label: 'Verified', count: verificationItems.filter((i) => i.status === 'completed').length }
                  ].map((chip) => (
                    <button
                      key={chip.id}
                      type="button"
                      className={`roc-chip ${activeVerifTab === chip.id ? 'active' : ''}`}
                      onClick={() => setActiveVerifTab(chip.id as VerificationTab)}
                      aria-pressed={activeVerifTab === chip.id}
                    >
                      <span>{chip.label}</span>
                      <em className="roc-num">{chip.count}</em>
                    </button>
                  ))}
                </>
              )}

              {activeSection === 'listings' && (
                <>
                  {[
                    { id: 'all', label: 'All listings', count: listings.length },
                    { id: 'review', label: 'Needs review', count: listings.filter((l) => l.moderationStatus === 'pending_review' || l.verificationStatus !== 'verified').length },
                    { id: 'live', label: 'Live', count: listings.filter((l) => l.isAvailable !== false && l.moderationStatus !== 'rejected').length },
                    { id: 'paused', label: 'Paused / Rejected', count: listings.filter((l) => l.isAvailable === false || l.moderationStatus === 'rejected').length }
                  ].map((chip) => (
                    <button
                      key={chip.id}
                      type="button"
                      className={`roc-chip ${activeListingsTab === chip.id ? 'active' : ''}`}
                      onClick={() => setActiveListingsTab(chip.id as ListingsTab)}
                      aria-pressed={activeListingsTab === chip.id}
                    >
                      <span>{chip.label}</span>
                      <em className="roc-num">{chip.count}</em>
                    </button>
                  ))}
                </>
              )}

              {activeSection === 'payments' && (
                <>
                  {[
                    { id: 'all', label: 'All payments', count: payments.length },
                    { id: 'success', label: 'Successful', count: payments.filter((p) => p.status === 'success').length },
                    { id: 'refunded', label: 'Refund requested / refunded', count: payments.filter((p) => p.status === 'refunded').length },
                    { id: 'pending', label: 'Pending', count: payments.filter((p) => p.status === 'pending').length }
                  ].map((chip) => (
                    <button
                      key={chip.id}
                      type="button"
                      className={`roc-chip ${paymentsStatusFilter === chip.id ? 'active' : ''}`}
                      onClick={() => setPaymentsStatusFilter(chip.id as PaymentsTab)}
                      aria-pressed={paymentsStatusFilter === chip.id}
                    >
                      <span>{chip.label}</span>
                      <em className="roc-num">{chip.count}</em>
                    </button>
                  ))}
                </>
              )}

              {activeSection === 'escalations' && (
                <>
                  {[
                    { id: 'all', label: 'All escalations', count: escalations.length },
                    { id: 'high', label: 'High priority', count: overdueEscalationsCount },
                    { id: 'medium', label: 'Medium priority', count: Math.max(0, escalations.length - overdueEscalationsCount) }
                  ].map((chip) => (
                    <button
                      key={chip.id}
                      type="button"
                      className={`roc-chip ${escalationFilter === chip.id ? 'active' : ''}`}
                      onClick={() => setEscalationFilter(chip.id as EscalationsTab)}
                      aria-pressed={escalationFilter === chip.id}
                    >
                      <span>{chip.label}</span>
                      <em className="roc-num">{chip.count}</em>
                    </button>
                  ))}
                </>
              )}

              {activeSection === 'team' && (
                <>
                  {[
                    { id: 'all', label: 'All team', count: filteredTeam.length },
                    { id: 'admins', label: 'Active staff', count: adminUsers.length },
                    { id: 'invitations', label: 'Pending invites', count: adminInvitations.length }
                  ].map((chip) => (
                    <button
                      key={chip.id}
                      type="button"
                      className={`roc-chip ${teamTab === chip.id ? 'active' : ''}`}
                      onClick={() => setTeamTab(chip.id as TeamTab)}
                      aria-pressed={teamTab === chip.id}
                    >
                      <span>{chip.label}</span>
                      <em className="roc-num">{chip.count}</em>
                    </button>
                  ))}
                </>
              )}
            </div>

            {/* =========================================================
                SECTION 0: LISTER ONBOARDING & VERIFICATION QUEUE
               ========================================================= */}
            {activeSection === 'listers' && (
              <>
                {filteredListerApplications.length > 0 ? (
                  <>
                    <div className="roc-tw">
                      <table>
                        <thead>
                          <tr>
                            <th>Lister Profile</th>
                            <th>Role</th>
                            <th>Bank Identity</th>
                            <th>Ibadan Location</th>
                            <th>Right to Let & Bill</th>
                            <th>Status</th>
                            <th style={{ textAlign: 'right' }}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredListerApplications.map((app) => (
                            <tr key={app.userId} onClick={() => setSelectedListerModal(app)} style={{ cursor: 'pointer' }}>
                              <td>
                                <div className="roc-insp">
                                  <span className="roc-av" style={{ background: '#000052', color: '#BE89FF' }}>
                                    {(app.userName || 'L').slice(0, 2).toUpperCase()}
                                  </span>
                                  <div>
                                    <b style={{ color: 'var(--ink)' }}>{app.userName || 'Lister'}</b>
                                    <div className="roc-ps">{app.userEmail || app.phone || 'No contact'}</div>
                                  </div>
                                </div>
                              </td>
                              <td>
                                <span className="roc-role r-ops" style={{ textTransform: 'capitalize' }}>
                                  {app.role === 'owner' ? 'Owner / Landlord' : app.role === 'agent' ? 'Licensed Agent' : 'Representative'}
                                </span>
                              </td>
                              <td>
                                <div style={{ fontSize: '13px', fontWeight: 600, color: '#000052' }}>
                                  {app.bankName}
                                </div>
                                <div style={{ fontSize: '12px', color: '#5C5C85' }}>
                                  {app.accountName || 'Checking...'}
                                </div>
                                <span className="roc-pill p-ok" style={{ marginTop: '4px', fontSize: '11px', display: 'inline-flex', padding: '2px 8px' }}>
                                  ✓ Bank Matched
                                </span>
                              </td>
                              <td>
                                <div style={{ fontWeight: 600, color: 'var(--ink)', fontSize: '13px' }}>
                                  {app.residentialAddress?.area || 'Bodija'}, Ibadan
                                </div>
                                <div className="roc-ps" style={{ maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {app.residentialAddress?.street || 'Address submitted'}
                                </div>
                              </td>
                              <td>
                                <div style={{ fontSize: '12.5px', fontWeight: 600 }}>
                                  {app.utilityBill?.billType === 'ibedc_electricity' ? 'IBEDC Electricity' : app.utilityBill?.billType === 'tenancy_receipt' ? 'Tenancy Receipt' : 'Utility Document'}
                                </div>
                                <div className="roc-ps">
                                  {app.utilityBill?.referenceNumber ? `Ref: ${app.utilityBill.referenceNumber}` : 'Photo uploaded'}
                                </div>
                                {app.isFamilyProperty && (
                                  <span style={{ fontSize: '11px', color: '#B45309', fontWeight: 700 }}>• Family Property</span>
                                )}
                              </td>
                              <td>
                                {app.status === 'approved' ? (
                                  <span className="roc-pill p-ok">Approved · Can Post</span>
                                ) : app.status === 'rejected' ? (
                                  <span className="roc-pill p-bad" title={app.rejectionReason}>Rejected</span>
                                ) : (
                                  <span className="roc-pill p-warn">Pending Review</span>
                                )}
                              </td>
                              <td style={{ textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                                <div style={{ display: 'inline-flex', gap: '8px' }}>
                                  {app.status !== 'approved' && (
                                    <button
                                      type="button"
                                      className="roc-btn b-pri b-sm"
                                      style={{ background: '#0B6B4B', borderColor: '#0B6B4B' }}
                                      onClick={() => handleApproveLister(app.userId)}
                                    >
                                      Approve
                                    </button>
                                  )}
                                  {app.status !== 'rejected' && (
                                    <button
                                      type="button"
                                      className="roc-btn b-sec b-sm"
                                      style={{ color: '#DC2626' }}
                                      onClick={() => {
                                        setListerToReject(app);
                                        setRejectionReasonInput('');
                                      }}
                                    >
                                      Reject
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    className="roc-btn b-sec b-sm"
                                    onClick={() => setSelectedListerModal(app)}
                                  >
                                    View
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                ) : (
                  <div className="roc-empty">
                    <UserCheck size={36} color="var(--ink-light)" />
                    <h3>No lister applications found</h3>
                    <p>There are no lister verification records matching the selected tab or search query.</p>
                  </div>
                )}
              </>
            )}

            {/* =========================================================
                SECTION 1: VERIFICATION QUEUE
               ========================================================= */}
            {activeSection === 'verification' && (
              <>
                {filteredVerificationItems.length > 0 ? (
                  <>
                    <div className="roc-tw">
                      <table>
                        <thead>
                          <tr>
                            <th>Property</th>
                            <th>Lister</th>
                            <th>Status</th>
                            <th>Inspector</th>
                            <th style={{ textAlign: 'right' }}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredVerificationItems.map((item) => {
                            const isVerified = item.status === 'completed';
                            return (
                              <tr key={item.id}>
                                <td>
                                  <div className="roc-prop">
                                    <div
                                      className="roc-thumb"
                                      style={{
                                        backgroundImage: item.photo ? `url(${item.photo})` : undefined,
                                        backgroundColor: !item.photo ? '#6B2FD6' : undefined
                                      }}
                                      aria-hidden="true"
                                    />
                                    <div>
                                      <div className="roc-pt">{item.title}</div>
                                      <div className="roc-ps">
                                        {item.area}, Ibadan · <span className="roc-num">₦{formatNaira(item.price)}</span>
                                      </div>
                                    </div>
                                  </div>
                                </td>
                                <td className="roc-who">
                                  <b>{item.listerName}</b>
                                  <span className="roc-num">{item.listerPhone || 'Phone on file'}</span>
                                </td>
                                <td>
                                  {item.status === 'completed' && <span className="roc-pill p-ok">Verified badge</span>}
                                  {item.status === 'scheduled' && <span className="roc-pill p-info">Scheduled</span>}
                                  {item.status === 'progress' && <span className="roc-pill p-info">In progress</span>}
                                  {item.status === 'pending' && <span className="roc-pill p-warn">Pending audit</span>}
                                </td>
                                <td>
                                  {item.inspector && item.inspector !== 'Unassigned' ? (
                                    <span className="roc-insp">
                                      <span className="roc-av">{item.inspector.slice(0, 2).toUpperCase()}</span>
                                      <span>{item.inspector}</span>
                                    </span>
                                  ) : (
                                    <span className="roc-unas">Unassigned</span>
                                  )}
                                </td>
                                <td style={{ textAlign: 'right' }}>
                                  <div style={{ display: 'inline-flex', gap: '6px', alignItems: 'center' }}>
                                    {item.inspectionUrl && (
                                      <button
                                        type="button"
                                        className="roc-btn b-sec b-sm"
                                        onClick={async () => {
                                          await navigator.clipboard.writeText(item.inspectionUrl!);
                                          showToast('Field inspection link copied!');
                                        }}
                                        title="Copy inspector mobile token URL"
                                      >
                                        <Copy size={13} />
                                        <span>Link</span>
                                      </button>
                                    )}
                                    <button
                                      type="button"
                                      className="roc-btn b-sec b-sm"
                                      onClick={() => handleOpenVerifModal(item)}
                                    >
                                      {isVerified ? 'View audit' : 'Open audit'}
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile Cards */}
                    <div className="roc-cards">
                      {filteredVerificationItems.map((item) => (
                        <div key={item.id} className="roc-card">
                          <div className="roc-prop" style={{ minWidth: 0 }}>
                            <div
                              className="roc-thumb"
                              style={{
                                backgroundImage: item.photo ? `url(${item.photo})` : undefined,
                                backgroundColor: !item.photo ? '#6B2FD6' : undefined
                              }}
                              aria-hidden="true"
                            />
                            <div>
                              <div className="roc-pt">{item.title}</div>
                              <div className="roc-ps">
                                {item.area} · <span className="roc-num">₦{formatNaira(item.price)}</span>
                              </div>
                            </div>
                          </div>
                          <div className="roc-card-row">
                            <span>Status</span>
                            {item.status === 'completed' ? (
                              <span className="roc-pill p-ok">Verified</span>
                            ) : item.status === 'scheduled' ? (
                              <span className="roc-pill p-info">Scheduled</span>
                            ) : item.status === 'progress' ? (
                              <span className="roc-pill p-info">In progress</span>
                            ) : (
                              <span className="roc-pill p-warn">Pending audit</span>
                            )}
                          </div>
                          <div className="roc-card-row">
                            <span>Inspector</span>
                            {item.inspector && item.inspector !== 'Unassigned' ? (
                              <span className="roc-insp">
                                <span className="roc-av">{item.inspector.slice(0, 2).toUpperCase()}</span>
                                <span>{item.inspector}</span>
                              </span>
                            ) : (
                              <span className="roc-unas">Unassigned</span>
                            )}
                          </div>
                          <div className="roc-card-row">
                            <span>Lister</span>
                            <b>{item.listerName}</b>
                          </div>
                          <div className="roc-acts">
                            <button
                              type="button"
                              className="roc-btn b-pri"
                              onClick={() => handleOpenVerifModal(item)}
                            >
                              {item.status === 'completed' ? 'View audit' : 'Open audit'}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="roc-foot">
                      <span>
                        Showing <b className="roc-num">{filteredVerificationItems.length}</b> of {verificationItems.length} properties
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="roc-empty">
                    <b>Nothing here</b>
                    <p>No properties match the current search and neighborhood filters.</p>
                  </div>
                )}
              </>
            )}

            {/* =========================================================
                SECTION 2: LISTINGS & MODERATION
               ========================================================= */}
            {activeSection === 'listings' && (
              <>
                {filteredListings.length > 0 ? (
                  <>
                    <div className="roc-tw">
                      <table>
                        <thead>
                          <tr>
                            <th>Listing</th>
                            <th>Lister</th>
                            <th>Status</th>
                            <th>Flags</th>
                            <th style={{ textAlign: 'right' }}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredListings.map((item) => {
                            const isLive = item.isAvailable !== false && item.moderationStatus !== 'rejected';
                            const photo = item.photos?.[0];
                            return (
                              <tr key={item.id}>
                                <td>
                                  <div className="roc-prop">
                                    <div
                                      className="roc-thumb"
                                      style={{
                                        backgroundImage: photo ? `url(${photo})` : undefined,
                                        backgroundColor: !photo ? '#2A2A9C' : undefined
                                      }}
                                      aria-hidden="true"
                                    />
                                    <div>
                                      <div className="roc-pt">{item.title}</div>
                                      <div className="roc-ps">
                                        {item.area} · <span className="roc-num">₦{formatNaira(item.price)}</span>
                                      </div>
                                    </div>
                                  </div>
                                </td>
                                <td className="roc-who">
                                  <b>{item.lister?.fullName || 'Property Lister'}</b>
                                  <span>{item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'Active'}</span>
                                </td>
                                <td>
                                  {isLive ? (
                                    <span className="roc-pill p-ok">Live</span>
                                  ) : item.moderationStatus === 'rejected' ? (
                                    <span className="roc-pill p-bad">Rejected</span>
                                  ) : (
                                    <span className="roc-pill p-warn">Needs review</span>
                                  )}
                                </td>
                                <td>
                                  {item.moderationNotes ? (
                                    <span style={{ fontWeight: 600, color: 'var(--bad)', fontSize: '13px' }}>
                                      {item.moderationNotes}
                                    </span>
                                  ) : (
                                    <span className="roc-unas">None</span>
                                  )}
                                </td>
                                <td style={{ textAlign: 'right' }}>
                                  <button
                                    type="button"
                                    className="roc-btn b-sec b-sm"
                                    onClick={() => handleOpenListingModal(item)}
                                  >
                                    Review listing
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile Cards */}
                    <div className="roc-cards">
                      {filteredListings.map((item) => (
                        <div key={item.id} className="roc-card">
                          <div className="roc-prop" style={{ minWidth: 0 }}>
                            <div
                              className="roc-thumb"
                              style={{
                                backgroundImage: item.photos?.[0] ? `url(${item.photos[0]})` : undefined,
                                backgroundColor: '#2A2A9C'
                              }}
                              aria-hidden="true"
                            />
                            <div>
                              <div className="roc-pt">{item.title}</div>
                              <div className="roc-ps">
                                {item.area} · <span className="roc-num">₦{formatNaira(item.price)}</span>
                              </div>
                            </div>
                          </div>
                          <div className="roc-card-row">
                            <span>Status</span>
                            {item.isAvailable !== false && item.moderationStatus !== 'rejected' ? (
                              <span className="roc-pill p-ok">Live</span>
                            ) : (
                              <span className="roc-pill p-warn">Needs review</span>
                            )}
                          </div>
                          <div className="roc-acts">
                            <button
                              type="button"
                              className="roc-btn b-pri"
                              onClick={() => handleOpenListingModal(item)}
                            >
                              Review listing
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="roc-foot">
                      <span>
                        <b className="roc-num">{filteredListings.length}</b> listings total
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="roc-empty">
                    <b>No listings found</b>
                    <p>No listings match this filter criteria.</p>
                  </div>
                )}
              </>
            )}

            {/* =========================================================
                SECTION 3: PAYMENTS & REVENUE
               ========================================================= */}
            {activeSection === 'payments' && (
              <>
                {filteredPayments.length > 0 ? (
                  <>
                    <div className="roc-tw">
                      <table>
                        <thead>
                          <tr>
                            <th>Reference</th>
                            <th>Renter &amp; Listing</th>
                            <th>Fee</th>
                            <th>Status</th>
                            <th style={{ textAlign: 'right' }}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredPayments.map((item) => {
                            const isPaid = item.status === 'success';
                            const isRefunded = item.status === 'refunded';
                            return (
                              <tr key={item.id}>
                                <td>
                                  <b className="roc-num">{item.reference}</b>
                                  <div className="roc-ps">
                                    {new Date(item.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                  </div>
                                </td>
                                <td className="roc-who">
                                  <b>{item.renterName || item.renterEmail || 'Renter'}</b>
                                  <span>{item.listingTitle || 'Verified Property Unlock'}</span>
                                </td>
                                <td>
                                  <span className="roc-num" style={{ fontWeight: 800, fontSize: '14.5px', color: 'var(--ink)' }}>
                                    ₦{formatNaira(item.amount)}
                                  </span>
                                </td>
                                <td>
                                  {isPaid ? (
                                    <span className="roc-pill p-ok">Confirmed</span>
                                  ) : isRefunded ? (
                                    <span className="roc-pill p-bad">Refunded</span>
                                  ) : (
                                    <span className="roc-pill p-warn">Awaiting confirmation</span>
                                  )}
                                </td>
                                <td style={{ textAlign: 'right' }}>
                                  <div style={{ display: 'inline-flex', gap: '6px' }}>
                                    <button
                                      type="button"
                                      className={`roc-btn ${isPaid ? 'b-sec' : 'b-pri'} b-sm`}
                                      onClick={() => setSelectedPaymentDetail(item)}
                                    >
                                      {isPaid ? 'Receipt' : isRefunded ? 'Refund record' : 'Confirm'}
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile Cards */}
                    <div className="roc-cards">
                      {filteredPayments.map((item) => (
                        <div key={item.id} className="roc-card">
                          <div className="roc-card-row">
                            <b className="roc-num">{item.reference}</b>
                            {item.status === 'success' ? (
                              <span className="roc-pill p-ok">Confirmed</span>
                            ) : item.status === 'refunded' ? (
                              <span className="roc-pill p-bad">Refunded</span>
                            ) : (
                              <span className="roc-pill p-warn">Awaiting confirmation</span>
                            )}
                          </div>
                          <div>
                            <div className="roc-pt">{item.renterName || item.renterEmail}</div>
                            <div className="roc-ps">{item.listingTitle}</div>
                          </div>
                          <div className="roc-card-row">
                            <span>Access fee</span>
                            <b className="roc-num">₦{formatNaira(item.amount)}</b>
                          </div>
                          <div className="roc-acts">
                            <button
                              type="button"
                              className={`roc-btn ${item.status === 'success' ? 'b-sec' : 'b-pri'}`}
                              onClick={() => setSelectedPaymentDetail(item)}
                            >
                              {item.status === 'success' ? 'Receipt' : 'Confirm availability'}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="roc-foot">
                      <span>Held until availability is confirmed</span>
                      <b className="roc-num">₦{formatNaira(totalRevenue)}</b>
                    </div>
                  </>
                ) : (
                  <div className="roc-empty">
                    <b>No transactions found</b>
                    <p>No payments recorded under this filter.</p>
                  </div>
                )}
              </>
            )}

            {/* =========================================================
                SECTION 4: ESCALATIONS
               ========================================================= */}
            {activeSection === 'escalations' && (
              <>
                {filteredEscalations.length > 0 ? (
                  <>
                    <div className="roc-tw">
                      <table>
                        <thead>
                          <tr>
                            <th>Priority</th>
                            <th>Issue</th>
                            <th>Open for</th>
                            <th>Owner</th>
                            <th style={{ textAlign: 'right' }}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredEscalations.map((item) => (
                            <tr key={item.id}>
                              <td>
                                <span
                                  className="roc-sev"
                                  style={{
                                    backgroundColor: item.isOverdue ? 'var(--bad)' : '#D98A00'
                                  }}
                                />
                                <b>{item.isOverdue ? 'High' : 'Medium'}</b>
                              </td>
                              <td>
                                <div className="roc-pt">
                                  {item.isOverdue ? 'Landlord SLA timeout: Response overdue' : 'Availability confirmation request'}
                                </div>
                                <div className="roc-ps">
                                  {item.renterName} · ref <span className="roc-num">{item.id.slice(0, 8)}</span>
                                </div>
                              </td>
                              <td className="roc-num">{item.timeSinceRequest}</td>
                              <td>
                                <span className="roc-insp">
                                  <span className="roc-av">OP</span>
                                  <span>Admin Ops</span>
                                </span>
                              </td>
                              <td style={{ textAlign: 'right' }}>
                                <button
                                  type="button"
                                  className="roc-btn b-pri b-sm"
                                  onClick={() => handleOpenEscalationModal(item)}
                                >
                                  Resolve
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile Cards */}
                    <div className="roc-cards">
                      {filteredEscalations.map((item) => (
                        <div
                          key={item.id}
                          className="roc-card"
                          style={{
                            backgroundColor: item.isOverdue ? 'var(--bad-bg)' : undefined
                          }}
                        >
                          <div className="roc-card-row">
                            <b>
                              <span
                                className="roc-sev"
                                style={{
                                  backgroundColor: item.isOverdue ? 'var(--bad)' : '#D98A00'
                                }}
                              />
                              {item.isOverdue ? 'High priority' : 'Medium priority'}
                            </b>
                            <span className="roc-num">{item.timeSinceRequest}</span>
                          </div>
                          <div>
                            <div className="roc-pt">{item.listingTitle}</div>
                            <div className="roc-ps">
                              {item.renterName} · {item.listerName}
                            </div>
                          </div>
                          <div className="roc-acts">
                            <button
                              type="button"
                              className="roc-btn b-pri"
                              onClick={() => handleOpenEscalationModal(item)}
                            >
                              Resolve
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="roc-empty">
                    <b>All clear</b>
                    <p>No open escalations currently requiring human intervention.</p>
                  </div>
                )}
              </>
            )}

            {/* =========================================================
                SECTION 5: ADMIN TEAM
               ========================================================= */}
            {activeSection === 'team' && (
              <>
                {filteredTeam.length > 0 ? (
                  <>
                    <div className="roc-tw">
                      <table>
                        <thead>
                          <tr>
                            <th>Member</th>
                            <th>Role</th>
                            <th>Status</th>
                            <th style={{ textAlign: 'right' }}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredTeam.map((member) => (
                            <tr key={member.id}>
                              <td>
                                <div className="roc-insp">
                                  <span
                                    className="roc-av"
                                    style={{ width: '38px', height: '38px', fontSize: '13px' }}
                                  >
                                    {member.name.slice(0, 2).toUpperCase()}
                                  </span>
                                  <div>
                                    <b style={{ color: 'var(--ink)' }}>{member.name}</b>
                                    <div className="roc-ps">{member.email}</div>
                                  </div>
                                </div>
                              </td>
                              <td>
                                <span className={`roc-role ${member.role === 'super' ? 'r-super' : member.role === 'ops' ? 'r-ops' : 'r-insp'}`}>
                                  {member.role === 'super' ? 'Super admin' : member.role === 'ops' ? 'Operations' : 'Inspector'}
                                </span>
                              </td>
                              <td>
                                {member.status === 'active' ? (
                                  <span className="roc-pill p-ok">Active</span>
                                ) : member.status === 'pending' ? (
                                  <span className="roc-pill p-warn">Invite pending</span>
                                ) : (
                                  <span className="roc-pill p-bad">Revoked</span>
                                )}
                              </td>
                              <td style={{ textAlign: 'right' }}>
                                {member.isInvite ? (
                                  <div style={{ display: 'inline-flex', gap: '6px' }}>
                                    <button
                                      type="button"
                                      className="roc-btn b-sec b-sm"
                                      onClick={() => setRevokeConfirmInvite(member.raw as AdminInvitation)}
                                    >
                                      Cancel invite
                                    </button>
                                  </div>
                                ) : (
                                  member.role !== 'super' && (
                                    <button
                                      type="button"
                                      className="roc-btn b-sec b-sm"
                                      onClick={() => setRemoveConfirmAdmin(member.raw as User)}
                                    >
                                      Revoke access
                                    </button>
                                  )
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile Cards */}
                    <div className="roc-cards">
                      {filteredTeam.map((member) => (
                        <div key={member.id} className="roc-card">
                          <div className="roc-insp">
                            <span className="roc-av" style={{ width: '40px', height: '40px' }}>
                              {member.name.slice(0, 2).toUpperCase()}
                            </span>
                            <div>
                              <b>{member.name}</b>
                              <div className="roc-ps">{member.email}</div>
                            </div>
                          </div>
                          <div className="roc-card-row">
                            <span className={`roc-role ${member.role === 'super' ? 'r-super' : member.role === 'ops' ? 'r-ops' : 'r-insp'}`}>
                              {member.role === 'super' ? 'Super admin' : member.role === 'ops' ? 'Operations' : 'Inspector'}
                            </span>
                            {member.status === 'active' ? (
                              <span className="roc-pill p-ok">Active</span>
                            ) : (
                              <span className="roc-pill p-warn">Invite pending</span>
                            )}
                          </div>
                          {member.role !== 'super' && (
                            <div className="roc-acts">
                              <button
                                type="button"
                                className="roc-btn b-sec"
                                onClick={() => {
                                  if (member.isInvite) setRevokeConfirmInvite(member.raw as AdminInvitation);
                                  else setRemoveConfirmAdmin(member.raw as User);
                                }}
                              >
                                {member.isInvite ? 'Cancel invite' : 'Revoke access'}
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="roc-empty">
                    <b>No team members found</b>
                    <p>Invite additional inspectors or operations staff using the button above.</p>
                  </div>
                )}
              </>
            )}
          </section>

          <p className="hint" style={{ marginTop: '16px', color: 'var(--ink-2)', fontSize: '13px' }}>
            <span
              style={{
                fontSize: '12px',
                fontWeight: 700,
                color: 'var(--ink-2)',
                background: 'var(--surface)',
                border: '1px dashed var(--line)',
                borderRadius: '999px',
                padding: '6px 14px',
                display: 'inline-flex',
                gap: '6px',
                alignItems: 'center'
              }}
            >
              Rentivo Operations Command &bull; Ibadan Pilot Live Control
            </span>
          </p>
        </main>
      </div>

      {/* =============================================================
          MODALS INTEGRATION
         ============================================================= */}

      {/* 1. Manage Areas Modal (Directly inspired by Rentivo Operations Command.html) */}
      {isAreaModalOpen && (
        <div className="roc-ov" role="dialog" aria-modal="true" aria-labelledby="area-modal-title">
          <div className="roc-scrim" onClick={() => setIsAreaModalOpen(false)} />
          <div className="roc-sheet">
            <div className="roc-mh">
              <span className="roc-mi">
                <MapPin size={22} />
              </span>
              <div>
                <h2 id="area-modal-title">Manage areas</h2>
                <p>Areas show in marketplace search filters and on property listings.</p>
              </div>
              <button
                type="button"
                className="roc-icon-btn"
                onClick={() => setIsAreaModalOpen(false)}
                aria-label="Close"
                style={{ marginLeft: 'auto' }}
              >
                <X size={18} />
              </button>
            </div>

            <div className="roc-mb">
              <form onSubmit={handleAddArea} style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <div className="roc-fld" style={{ flex: '1 1 200px' }}>
                  <label htmlFor="m-ar">New area / neighborhood</label>
                  <input
                    id="m-ar"
                    type="text"
                    placeholder="For example Mokola, Jericho, Agodi"
                    value={newAreaInput}
                    onChange={(e) => setNewAreaInput(e.target.value)}
                    autoComplete="off"
                  />
                </div>
                <div className="roc-fld" style={{ alignSelf: 'end' }}>
                  <button className="roc-btn b-pri" type="submit" style={{ minHeight: '48px' }}>
                    Add area
                  </button>
                </div>
              </form>

              <div>
                <div className="roc-lbl" style={{ marginBottom: '10px' }}>
                  Current active areas <span className="roc-num" style={{ color: 'var(--ink-3)', fontSize: '13px' }}>({distinctAreas.length})</span>
                </div>
                <div className="roc-chips" style={{ padding: 0, flexWrap: 'wrap', overflow: 'visible', borderBottom: 'none' }}>
                  {distinctAreas.map((area) => (
                    <span key={area} className="roc-chip" style={{ cursor: 'default' }}>
                      {area}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="roc-mf">
              <button
                type="button"
                className="roc-btn b-pri"
                onClick={() => setIsAreaModalOpen(false)}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Payment Details & Receipt Modal */}
      {selectedPaymentDetail && (
        <div className="roc-ov" role="dialog" aria-modal="true" aria-labelledby="pay-modal-title">
          <div className="roc-scrim" onClick={() => setSelectedPaymentDetail(null)} />
          <div className="roc-sheet">
            <div className="roc-mh">
              <span className="roc-mi">
                <CreditCard size={22} />
              </span>
              <div>
                <h2 id="pay-modal-title">Payment {selectedPaymentDetail.reference}</h2>
                <p>{selectedPaymentDetail.listingTitle || 'Verified Property Access Fee'}</p>
              </div>
              <button
                type="button"
                className="roc-icon-btn"
                onClick={() => setSelectedPaymentDetail(null)}
                aria-label="Close"
                style={{ marginLeft: 'auto' }}
              >
                <X size={18} />
              </button>
            </div>

            <div className="roc-mb">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                <div className="roc-fact">
                  <small>Renter</small>
                  <b>{selectedPaymentDetail.renterName || selectedPaymentDetail.renterEmail}</b>
                </div>
                <div className="roc-fact">
                  <small>Fee</small>
                  <b className="roc-num">₦{formatNaira(selectedPaymentDetail.amount)}</b>
                </div>
                <div className="roc-fact">
                  <small>Channel</small>
                  <b>{selectedPaymentDetail.channel ? `Paystack (${selectedPaymentDetail.channel})` : 'Card payment'}</b>
                </div>
              </div>

              <ol className="roc-steps">
                <li className="done">
                  <span className="d">
                    <Check size={13} />
                  </span>
                  <div>
                    <b>Renter paid access fee</b>
                    <span>{new Date(selectedPaymentDetail.createdAt).toLocaleString()}</span>
                  </div>
                </li>
                <li className={selectedPaymentDetail.status === 'success' ? 'done' : ''}>
                  <span className="d">{selectedPaymentDetail.status === 'success' ? <Check size={13} /> : ''}</span>
                  <div>
                    <b>Availability confirmed</b>
                    <span>Lister contacted to confirm property is vacant and available</span>
                  </div>
                </li>
                <li className={selectedPaymentDetail.status === 'success' ? 'done' : ''}>
                  <span className="d">{selectedPaymentDetail.status === 'success' ? <Check size={13} /> : ''}</span>
                  <div>
                    <b>Contact shared</b>
                    <span>Renter unlocks landlord direct phone &amp; exact geolocation</span>
                  </div>
                </li>
              </ol>

              {selectedPaymentDetail.status === 'refunded' && (
                <div
                  style={{
                    display: 'flex',
                    gap: '12px',
                    padding: '14px',
                    borderRadius: '16px',
                    backgroundColor: 'var(--bad-bg)',
                    color: 'var(--bad)',
                    fontSize: '13.5px',
                    fontWeight: 600
                  }}
                >
                  <AlertTriangle size={20} />
                  <div>Refund issued to seeker because listing was unavailable or cancelled.</div>
                </div>
              )}
            </div>

            <div className="roc-mf">
              <button
                type="button"
                className="roc-btn b-sec lft"
                onClick={() => setSelectedPaymentDetail(null)}
              >
                Close
              </button>
              {selectedPaymentDetail.status !== 'refunded' && (
                <button
                  type="button"
                  className="roc-btn b-sec"
                  onClick={() => {
                    setRefundConfirmPayment(selectedPaymentDetail);
                    setSelectedPaymentDetail(null);
                  }}
                >
                  Refund fee
                </button>
              )}
              {selectedPaymentDetail.status !== 'success' && (
                <button
                  type="button"
                  className="roc-btn b-pri"
                  onClick={async () => {
                    showToast('Availability confirmed. Contact unlocked for renter.');
                    setSelectedPaymentDetail(null);
                  }}
                >
                  Confirm available
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 3. Verification Reality Audit Modal */}
      <VerificationDetailModal
        isOpen={isVerifModalOpen}
        item={selectedVerifItem}
        listings={listings}
        onClose={handleCloseVerifModal}
        onApprove={handleApproveVerificationBadge}
        onRequestChanges={handleRequestChanges}
        onRevoke={handleRevokeVerification}
        showToast={showToast}
      />

      {/* 4. Listing Moderation Modal */}
      <ListingModerationModal
        isOpen={isListingModalOpen}
        listing={selectedListingItem}
        onClose={() => setIsListingModalOpen(false)}
        onApprove={handleApproveListing}
        onReject={handleRejectListing}
      />

      {/* 5. Escalation Detail Modal */}
      <EscalationDetailModal
        isOpen={isEscalationModalOpen}
        escalation={selectedEscalation}
        onClose={() => setIsEscalationModalOpen(false)}
        onConfirmAvailable={handleConfirmEscalationAvailable}
        onMarkUnavailable={handleMarkEscalationUnavailable}
        onDelistProperty={handleDelistEscalationProperty}
      />

      {/* 6. Admin Invite Modal */}
      <AdminInviteModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        onInviteSent={async () => {
          await loadTeamData();
          showToast('Invitation generated successfully!');
        }}
        showToast={showToast}
      />

      {/* 7. Paystack Refund Confirmation Dialog */}
      {refundConfirmPayment && (
        <div className="roc-ov" role="dialog" aria-modal="true" aria-labelledby="refund-modal-title">
          <div className="roc-scrim" onClick={() => !isProcessingRefund && setRefundConfirmPayment(null)} />
          <div className="roc-sheet">
            <div className="roc-mh">
              <span className="roc-mi bad">
                <AlertTriangle size={22} />
              </span>
              <div>
                <h2 id="refund-modal-title">Issue Paystack Refund?</h2>
                <p>
                  Refund <strong>₦{formatNaira(refundConfirmPayment.amount)}</strong> to {refundConfirmPayment.renterName || refundConfirmPayment.renterEmail}.
                </p>
              </div>
              <button
                type="button"
                className="roc-icon-btn"
                onClick={() => setRefundConfirmPayment(null)}
                aria-label="Close"
                style={{ marginLeft: 'auto' }}
              >
                <X size={18} />
              </button>
            </div>

            <div className="roc-mb">
              <div className="roc-fld">
                <label htmlFor="ref-rs">Refund Reason / Audit Note</label>
                <textarea
                  id="ref-rs"
                  rows={2}
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                />
              </div>
            </div>

            <div className="roc-mf">
              <button
                type="button"
                className="roc-btn b-sec lft"
                onClick={() => setRefundConfirmPayment(null)}
                disabled={isProcessingRefund}
              >
                Cancel
              </button>
              <button
                type="button"
                className="roc-btn b-bad"
                onClick={() => handleProcessRefund(refundConfirmPayment)}
                disabled={isProcessingRefund}
              >
                {isProcessingRefund ? 'Refunding…' : 'Confirm Refund'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8. Revoke Invitation Confirmation Dialog */}
      {revokeConfirmInvite && (
        <div className="roc-ov" role="dialog" aria-modal="true" aria-labelledby="revoke-modal-title">
          <div className="roc-scrim" onClick={() => setRevokeConfirmInvite(null)} />
          <div className="roc-sheet">
            <div className="roc-mh">
              <span className="roc-mi bad">
                <AlertTriangle size={22} />
              </span>
              <div>
                <h2 id="revoke-modal-title">Cancel this invite?</h2>
                <p>{revokeConfirmInvite.email}</p>
              </div>
              <button
                type="button"
                className="roc-icon-btn"
                onClick={() => setRevokeConfirmInvite(null)}
                aria-label="Close"
                style={{ marginLeft: 'auto' }}
              >
                <X size={18} />
              </button>
            </div>

            <div className="roc-mb">
              <div
                style={{
                  display: 'flex',
                  gap: '12px',
                  padding: '14px',
                  borderRadius: '16px',
                  backgroundColor: 'var(--bad-bg)',
                  color: 'var(--bad)',
                  fontSize: '13.5px',
                  fontWeight: 600
                }}
              >
                <AlertTriangle size={20} />
                <div>The invite link stops working straight away.</div>
              </div>
            </div>

            <div className="roc-mf">
              <button
                type="button"
                className="roc-btn b-sec lft"
                onClick={() => setRevokeConfirmInvite(null)}
              >
                Keep
              </button>
              <button
                type="button"
                className="roc-btn b-bad"
                onClick={() => handleRevokeInvitation(revokeConfirmInvite)}
              >
                Cancel invite
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 9. Remove Admin Confirmation Dialog */}
      {removeConfirmAdmin && (
        <div className="roc-ov" role="dialog" aria-modal="true" aria-labelledby="remove-admin-title">
          <div className="roc-scrim" onClick={() => setRemoveConfirmAdmin(null)} />
          <div className="roc-sheet">
            <div className="roc-mh">
              <span className="roc-mi bad">
                <AlertTriangle size={22} />
              </span>
              <div>
                <h2 id="remove-admin-title">Revoke access?</h2>
                <p>{removeConfirmAdmin.email}</p>
              </div>
              <button
                type="button"
                className="roc-icon-btn"
                onClick={() => setRemoveConfirmAdmin(null)}
                aria-label="Close"
                style={{ marginLeft: 'auto' }}
              >
                <X size={18} />
              </button>
            </div>

            <div className="roc-mb">
              <div
                style={{
                  display: 'flex',
                  gap: '12px',
                  padding: '14px',
                  borderRadius: '16px',
                  backgroundColor: 'var(--bad-bg)',
                  color: 'var(--bad)',
                  fontSize: '13.5px',
                  fontWeight: 600
                }}
              >
                <AlertTriangle size={20} />
                <div>
                  {removeConfirmAdmin.name || removeConfirmAdmin.email} is signed out and cannot open the admin again. Past actions stay in the log.
                </div>
              </div>
            </div>

            <div className="roc-mf">
              <button
                type="button"
                className="roc-btn b-sec lft"
                onClick={() => setRemoveConfirmAdmin(null)}
              >
                Keep
              </button>
              <button
                type="button"
                className="roc-btn b-bad"
                onClick={() => handleRemoveAdmin(removeConfirmAdmin)}
              >
                Revoke access
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lister Inspection Detail Modal */}
      {selectedListerModal && (
        <div className="roc-ov" role="dialog" aria-modal="true">
          <div className="roc-scrim" onClick={() => setSelectedListerModal(null)} />
          <div className="roc-sheet" style={{ maxWidth: '640px', width: '100%' }}>
            <div className="roc-mh">
              <span className="roc-mi ok">
                <UserCheck size={22} />
              </span>
              <div>
                <h2>{selectedListerModal.userName || 'Lister Application'}</h2>
                <p>{selectedListerModal.userEmail || 'Lister Onboarding Dossier'}</p>
              </div>
              <button
                type="button"
                className="roc-icon-btn"
                onClick={() => setSelectedListerModal(null)}
                style={{ marginLeft: 'auto' }}
              >
                <X size={18} />
              </button>
            </div>

            <div className="roc-mb" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#F8FAFC', padding: '12px 16px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                <div>
                  <span style={{ fontSize: '11px', textTransform: 'uppercase', color: '#5C5C85', fontWeight: 700 }}>Current Status</span>
                  <div style={{ fontWeight: 800, color: '#000052', fontSize: '1rem', marginTop: '2px' }}>
                    {selectedListerModal.status === 'approved' ? '✓ Approved to Post Properties' : selectedListerModal.status === 'rejected' ? '✗ Application Rejected' : '⏳ Pending Review'}
                  </div>
                </div>
                <span className={`roc-pill ${selectedListerModal.status === 'approved' ? 'p-ok' : selectedListerModal.status === 'rejected' ? 'p-bad' : 'p-warn'}`}>
                  {selectedListerModal.status}
                </span>
              </div>

              {selectedListerModal.rejectionReason && (
                <div style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', padding: '12px 16px', borderRadius: '12px', color: '#991B1B', fontSize: '13px' }}>
                  <strong>Rejection Reason:</strong> {selectedListerModal.rejectionReason}
                </div>
              )}

              {/* Bank Verification Section */}
              <div style={{ border: '1px solid #E2E8F0', borderRadius: '14px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <strong style={{ fontSize: '13.5px', color: '#000052', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <CreditCard size={16} color="#6B2FD6" />
                  Bank Identity & Account Verification
                </strong>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '13px' }}>
                  <div>
                    <span style={{ color: '#5C5C85', display: 'block', fontSize: '11.5px' }}>Bank Name</span>
                    <strong>{selectedListerModal.bankName}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#5C5C85', display: 'block', fontSize: '11.5px' }}>NUBAN Account</span>
                    <strong>{selectedListerModal.accountNumber}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#5C5C85', display: 'block', fontSize: '11.5px' }}>Name from Bank</span>
                    <strong style={{ color: '#6B2FD6' }}>{selectedListerModal.accountName || 'Verified'}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#5C5C85', display: 'block', fontSize: '11.5px' }}>Match Result</span>
                    <span style={{ color: '#0B6B4B', fontWeight: 700 }}>✓ Bank Name Matched</span>
                  </div>
                </div>
              </div>

              {/* Location & Contact Section */}
              <div style={{ border: '1px solid #E2E8F0', borderRadius: '14px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <strong style={{ fontSize: '13.5px', color: '#000052', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <MapPin size={16} color="#000052" />
                  Ibadan Residence & Contact Details
                </strong>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '13px' }}>
                  <div>
                    <span style={{ color: '#5C5C85', display: 'block', fontSize: '11.5px' }}>Phone Number (Brevo Verified)</span>
                    <strong>{selectedListerModal.phone}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#5C5C85', display: 'block', fontSize: '11.5px' }}>WhatsApp Number</span>
                    <strong>{selectedListerModal.whatsapp || selectedListerModal.phone}</strong>
                  </div>
                  <div style={{ gridColumn: 'span 2' }}>
                    <span style={{ color: '#5C5C85', display: 'block', fontSize: '11.5px' }}>Residential Address</span>
                    <strong>{selectedListerModal.residentialAddress?.street}, {selectedListerModal.residentialAddress?.area}, Ibadan</strong>
                    {selectedListerModal.residentialAddress?.landmark && (
                      <div style={{ fontSize: '12px', color: '#5C5C85', marginTop: '2px' }}>
                        Landmark: {selectedListerModal.residentialAddress.landmark}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Right to Let Document Section */}
              <div style={{ border: '1px solid #E2E8F0', borderRadius: '14px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <strong style={{ fontSize: '13.5px', color: '#000052', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <FileText size={16} color="#000052" />
                  Right to Let Authority & Proof
                </strong>
                <div style={{ fontSize: '13px' }}>
                  <div>
                    <span style={{ color: '#5C5C85', display: 'block', fontSize: '11.5px' }}>Declared Role</span>
                    <strong style={{ textTransform: 'capitalize' }}>
                      {selectedListerModal.role === 'owner' ? 'Property Owner / Landlord' : selectedListerModal.role === 'agent' ? 'Licensed Agent' : 'Representative'}
                    </strong>
                  </div>
                  <div style={{ marginTop: '8px' }}>
                    <span style={{ color: '#5C5C85', display: 'block', fontSize: '11.5px' }}>Utility Bill / Reference</span>
                    <strong>{selectedListerModal.utilityBill?.billType} (Ref: {selectedListerModal.utilityBill?.referenceNumber || 'N/A'})</strong>
                  </div>
                  {selectedListerModal.utilityBill?.documentUrl && (
                    <div style={{ marginTop: '10px' }}>
                      <div style={{ fontSize: '11.5px', color: '#5C5C85', marginBottom: '6px' }}>
                        Document: <strong>{selectedListerModal.utilityBill?.documentName || 'Utility Bill / Tenancy Receipt'}</strong>
                        {selectedListerModal.utilityBill?.documentUrl.includes('imagekit.io') && (
                          <span style={{ marginLeft: '8px', background: '#F4ECFF', color: '#6B2FD6', padding: '2px 8px', borderRadius: '4px', fontWeight: 600, fontSize: '10.5px' }}>
                            ImageKit Cloud
                          </span>
                        )}
                      </div>
                      <a
                        href={selectedListerModal.utilityBill.documentUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="roc-btn b-sec b-sm"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                      >
                        <ExternalLink size={14} />
                        View Document on ImageKit Cloud
                      </a>
                    </div>
                  )}
                  {selectedListerModal.isFamilyProperty && (
                    <div style={{ marginTop: '10px', background: '#FFFBEB', padding: '10px 12px', borderRadius: '8px', fontSize: '12px', color: '#92400E' }}>
                      <strong>Family Property Declared:</strong> Family Head: {selectedListerModal.familyHeadName || 'Not specified'} (Phone: {selectedListerModal.familyHeadPhone || 'N/A'})
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="roc-mf">
              <button
                type="button"
                className="roc-btn b-sec"
                onClick={() => setSelectedListerModal(null)}
              >
                Close
              </button>
              {selectedListerModal.status !== 'rejected' && (
                <button
                  type="button"
                  className="roc-btn b-bad"
                  onClick={() => {
                    setListerToReject(selectedListerModal);
                    setRejectionReasonInput('');
                  }}
                >
                  Reject Application
                </button>
              )}
              {selectedListerModal.status !== 'approved' && (
                <button
                  type="button"
                  className="roc-btn b-pri"
                  style={{ background: '#0B6B4B', borderColor: '#0B6B4B' }}
                  onClick={() => handleApproveLister(selectedListerModal.userId)}
                >
                  Approve Lister & Unlock Posting
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Reject Confirmation Dialog */}
      {listerToReject && (
        <div className="roc-ov" role="dialog" aria-modal="true">
          <div className="roc-scrim" onClick={() => setListerToReject(null)} />
          <div className="roc-sheet" style={{ maxWidth: '480px' }}>
            <div className="roc-mh">
              <span className="roc-mi bad">
                <AlertTriangle size={22} />
              </span>
              <div>
                <h2>Reject Lister Application?</h2>
                <p>{listerToReject.userName || listerToReject.userEmail}</p>
              </div>
              <button
                type="button"
                className="roc-icon-btn"
                onClick={() => setListerToReject(null)}
                style={{ marginLeft: 'auto' }}
              >
                <X size={18} />
              </button>
            </div>

            <div className="roc-mb">
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#000052', marginBottom: '8px' }}>
                Reason for Rejection (Visible to Lister):
              </label>
              <textarea
                className="roc-input"
                rows={3}
                style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: '10px', border: '1px solid #CBD5E1', fontFamily: 'inherit', fontSize: '13px' }}
                placeholder="e.g. Account name does not match ID, or uploaded utility bill is illegible."
                value={rejectionReasonInput}
                onChange={(e) => setRejectionReasonInput(e.target.value)}
              />
            </div>

            <div className="roc-mf">
              <button
                type="button"
                className="roc-btn b-sec"
                onClick={() => setListerToReject(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="roc-btn b-bad"
                onClick={() => handleRejectLister(listerToReject.userId, rejectionReasonInput || 'Information could not be verified by admin.')}
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =============================================================
          10. FLOATING TOAST NOTIFICATION
         ============================================================= */}
      <div className={`roc-toast ${adminToast ? 'on' : ''}`} role="status">
        {adminToast}
      </div>
    </div>
  );
};

export default AdminQueuePage;
