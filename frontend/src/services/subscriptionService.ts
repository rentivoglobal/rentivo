import { isLiveBackend } from '../lib/config';
import { supabase, extractEdgeFunctionError } from '../lib/supabase';
import {
  SubscriptionAudience,
  SubscriptionEntitlements,
  SubscriptionPlan,
  UsageSummary
} from '../types';

function mapPlan(row: Record<string, unknown>): SubscriptionPlan {
  return {
    id: String(row.id),
    code: String(row.code),
    name: String(row.name),
    audience: row.audience as SubscriptionAudience,
    amountKobo: Number(row.amount_kobo || 0),
    currencyCode: String(row.currency_code || 'NGN'),
    interval: row.interval as 'monthly' | 'annual',
    paystackPlanCode: row.paystack_plan_code ? String(row.paystack_plan_code) : undefined,
    entitlements: (row.entitlements || {}) as Record<string, number | boolean | null>,
    isFree: Boolean(row.is_free),
    sortOrder: Number(row.sort_order || 0)
  };
}

export const subscriptionService = {
  async bootstrapPlans(): Promise<{
    results: Array<{ code: string; status: string; error?: string }>;
  }> {
    if (!isLiveBackend || !supabase) {
      throw new Error('Subscription billing is not configured.');
    }

    const { data, error } = await supabase.functions.invoke('subscription-plan-bootstrap', {
      body: {}
    });
    if (error) {
      throw new Error(await extractEdgeFunctionError(error, 'Unable to provision subscription plans.'));
    }
    return data as { results: Array<{ code: string; status: string; error?: string }> };
  },

  async listPlans(audience?: SubscriptionAudience): Promise<SubscriptionPlan[]> {
    if (!isLiveBackend || !supabase) return [];

    let query = supabase
      .from('subscription_plans')
      .select('id, code, name, audience, amount_kobo, currency_code, interval, paystack_plan_code, entitlements, is_free, sort_order')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (audience) query = query.eq('audience', audience);

    const { data, error } = await query;
    if (error) throw error;
    return (data || []).map((row) => mapPlan(row as Record<string, unknown>));
  },

  async getEntitlements(): Promise<SubscriptionEntitlements | null> {
    if (!isLiveBackend || !supabase) return null;

    const { data, error } = await supabase.rpc('get_current_entitlements');
    if (error) throw error;
    return data as SubscriptionEntitlements;
  },

  async getUsageSummary(): Promise<UsageSummary | null> {
    if (!isLiveBackend || !supabase) return null;

    const { data, error } = await supabase.rpc('get_usage_summary');
    if (error) throw error;
    return data as UsageSummary;
  },

  async consumeRenterUnlock(requestId: string): Promise<{
    granted: boolean;
    alreadyGranted: boolean;
    remaining?: number;
  }> {
    if (!isLiveBackend || !supabase) {
      throw new Error('Subscription billing is not configured.');
    }

    const { data, error } = await supabase.rpc('consume_renter_unlock', {
      p_request_id: requestId
    });
    if (error) throw error;
    return data as {
      granted: boolean;
      alreadyGranted: boolean;
      remaining?: number;
    };
  },

  async initialize(planCode: string, email: string): Promise<{ authorizationUrl?: string; reference: string }> {
    if (!isLiveBackend || !supabase) {
      throw new Error('Subscription billing is not configured.');
    }

    const { data, error } = await supabase.functions.invoke('subscription-initialize', {
      body: { planCode, email }
    });
    if (error) {
      throw new Error(await extractEdgeFunctionError(error, 'Unable to start subscription checkout.'));
    }
    return data as { authorizationUrl?: string; reference: string };
  },

  async cancel(): Promise<{ accessUntil?: string }> {
    if (!isLiveBackend || !supabase) {
      throw new Error('Subscription billing is not configured.');
    }

    const { data, error } = await supabase.functions.invoke('subscription-cancel', {
      body: {}
    });
    if (error) {
      throw new Error(await extractEdgeFunctionError(error, 'Unable to cancel subscription.'));
    }
    return data as { accessUntil?: string };
  }
};
