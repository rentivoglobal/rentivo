import { ReportItem } from '../types';
import { isLiveBackend } from '../lib/config';
import { supabase } from '../lib/supabase';
import { localStore } from './localStore';
import { listingsService } from './listingsService';
import { authService } from './authService';

const REASON_TO_DB: Record<ReportItem['reason'], string> = {
  'Already Rented': 'already_rented',
  'Price Changed': 'inflated_price',
  'Misleading Photos': 'misleading_photos',
  'Suspected Fraud': 'fake_listing',
  Other: 'other'
};

const DB_TO_REASON: Record<string, ReportItem['reason']> = {
  already_rented: 'Already Rented',
  inflated_price: 'Price Changed',
  misleading_photos: 'Misleading Photos',
  fake_listing: 'Suspected Fraud',
  other: 'Other'
};

export const reportsService = {
  getReports(): ReportItem[] {
    return localStore.getReports();
  },

  async loadReports(): Promise<ReportItem[]> {
    if (!isLiveBackend || !supabase) return localStore.getReports();
    const { data, error } = await supabase.from('reports').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    const listings = await listingsService.getListings();
    return (data || []).map((row) => {
      const listing = listings.find((l) => l.id === row.listing_id);
      return {
        id: row.id,
        listingId: row.listing_id,
        listingTitle: listing?.title || 'Listing',
        listingArea: listing?.area || '',
        listingPhoto: listing?.photos[0] || '',
        listerName: listing?.lister.fullName || '',
        listerPhone: '',
        reason: DB_TO_REASON[row.reason] || 'Other',
        details: row.details || undefined,
        reportedAt: new Date(row.created_at).toLocaleString(),
        status: row.status
      } as ReportItem;
    });
  },

  getActiveReportsCount(): number {
    return this.getReports().filter((r) => r.status === 'pending' || r.status === 'investigating').length;
  },

  submitReport(newReportData: Omit<ReportItem, 'id' | 'reportedAt' | 'status'>): ReportItem {
    const report: ReportItem = {
      ...newReportData,
      listerPhone: '',
      id: localStore.createId('rep'),
      reportedAt: 'Just now',
      status: 'pending'
    };
    const reports = localStore.getReports();
    reports.unshift(report);
    localStore.saveReports(reports);

    if (isLiveBackend && supabase) {
      const user = authService.getCurrentUser();
      void supabase.from('reports').insert({
        listing_id: newReportData.listingId,
        reporter_user_id: user?.id || null,
        reason: REASON_TO_DB[newReportData.reason],
        details: newReportData.details,
        status: 'pending'
      });
    }
    return report;
  },

  updateReportStatus(id: string, status: ReportItem['status']): ReportItem | undefined {
    const reports = localStore.getReports();
    const report = reports.find((r) => r.id === id);
    if (report) {
      report.status = status;
      localStore.saveReports(reports);
    }
    if (isLiveBackend && supabase) {
      void supabase.from('reports').update({ status, resolved_at: status === 'resolved' || status === 'dismissed' ? new Date().toISOString() : null }).eq('id', id);
    }
    return report;
  },

  dismissReport(id: string): void {
    this.updateReportStatus(id, 'dismissed');
  }
};
