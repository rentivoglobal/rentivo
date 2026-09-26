import { isLiveBackend } from '../lib/config';
import { supabase, extractEdgeFunctionError } from '../lib/supabase';
import { localStore, LocalPayment } from './localStore';

export const paymentsService = {
  async listPayments(): Promise<LocalPayment[]> {
    if (!isLiveBackend || !supabase) return localStore.getPayments();
    const { data, error } = await supabase
      .from('payments')
      .select('id, availability_request_id, amount_kobo, paystack_reference, status, channel, created_at, paid_at, renter_user_id')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map((row) => ({
      id: row.id,
      requestId: row.availability_request_id,
      renterName: '',
      renterEmail: '',
      listingTitle: '',
      amount: Number(row.amount_kobo) / 100,
      reference: row.paystack_reference,
      status: row.status,
      channel: row.channel || undefined,
      createdAt: row.created_at,
      paidAt: row.paid_at || undefined
    }));
  },

  async refund(paymentId: string, reason?: string): Promise<void> {
    if (isLiveBackend && supabase) {
      const { error } = await supabase.functions.invoke('paystack-refund', {
        body: { paymentId, reason }
      });
      if (error) {
        const errMsg = await extractEdgeFunctionError(error, 'Failed to process refund.');
        throw new Error(errMsg);
      }
      return;
    }
    const payments = localStore.getPayments().map((p) =>
      p.id === paymentId ? { ...p, status: 'refunded' as const } : p
    );
    localStore.savePayments(payments);
  }
};
