import React, { useEffect, useMemo, useState } from 'react';
import { Check, CreditCard, ArrowLeft, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatNaira } from '../utils/formatters';
import { subscriptionService } from '../services/subscriptionService';
import { SubscriptionAudience, SubscriptionEntitlements, SubscriptionPlan, UsageSummary } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { isLiveBackend } from '../lib/config';

const FALLBACK_PLANS: SubscriptionPlan[] = [
  { id: 'renter-free', code: 'renter_free', name: 'Free Explorer', audience: 'renter', amountKobo: 0, currencyCode: 'NGN', interval: 'monthly', entitlements: { renter_contact_unlocks: 3, saved_listing_limit: 20 }, isFree: true, sortOrder: 10 },
  { id: 'renter-plus', code: 'renter_plus', name: 'Renter Plus', audience: 'renter', amountKobo: 250000, currencyCode: 'NGN', interval: 'monthly', entitlements: { renter_contact_unlocks: 15, saved_listing_limit: null, priority_support: true }, isFree: false, sortOrder: 20 },
  { id: 'renter-pro', code: 'renter_pro', name: 'Renter Pro', audience: 'renter', amountKobo: 500000, currencyCode: 'NGN', interval: 'monthly', entitlements: { renter_contact_unlocks: 40, saved_listing_limit: null, priority_support: true, priority_availability: true }, isFree: false, sortOrder: 30 },
  { id: 'lister-free', code: 'lister_free', name: 'Lister Free', audience: 'lister', amountKobo: 0, currencyCode: 'NGN', interval: 'monthly', entitlements: { active_listing_limit: 1, monthly_lead_limit: 5 }, isFree: true, sortOrder: 10 },
  { id: 'lister-starter', code: 'lister_starter', name: 'Lister Starter', audience: 'lister', amountKobo: 300000, currencyCode: 'NGN', interval: 'monthly', entitlements: { active_listing_limit: 10, monthly_lead_limit: 40 }, isFree: false, sortOrder: 20 },
  { id: 'lister-growth', code: 'lister_growth', name: 'Lister Growth', audience: 'lister', amountKobo: 750000, currencyCode: 'NGN', interval: 'monthly', entitlements: { active_listing_limit: 40, monthly_lead_limit: 150 }, isFree: false, sortOrder: 30 },
  { id: 'lister-pro', code: 'lister_pro', name: 'Lister Pro', audience: 'lister', amountKobo: 1500000, currencyCode: 'NGN', interval: 'monthly', entitlements: { active_listing_limit: 100, monthly_lead_limit: null, priority_moderation: true }, isFree: false, sortOrder: 40 }
];

function entitlementLabel(key: string, value: number | boolean | null): string {
  if (key === 'renter_contact_unlocks') return `${value ?? 0} contact unlocks / month`;
  if (key === 'saved_listing_limit') return value === null ? 'Unlimited saved listings' : `${value} saved listings`;
  if (key === 'active_listing_limit') return `${value ?? 0} active listings`;
  if (key === 'monthly_lead_limit') return value === null ? 'Unlimited renter leads' : `${value} renter leads / month`;
  if (value === true) return key.replaceAll('_', ' ');
  return '';
}

export const SubscriptionPage: React.FC<{ defaultAudience?: SubscriptionAudience }> = ({ defaultAudience }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const initialAudience = defaultAudience || (user?.role === 'landlord' || user?.role === 'agent' ? 'lister' : 'renter');
  const accountAudience = user
    ? user.role === 'landlord' || user.role === 'agent' ? 'lister' : 'renter'
    : null;
  const [audience, setAudience] = useState<SubscriptionAudience>(initialAudience);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [entitlements, setEntitlements] = useState<SubscriptionEntitlements | null>(null);
  const [usage, setUsage] = useState<UsageSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkoutCode, setCheckoutCode] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [availablePlans, currentEntitlements, currentUsage] = await Promise.all([
        subscriptionService.listPlans(audience),
        user ? subscriptionService.getEntitlements() : Promise.resolve(null),
        user ? subscriptionService.getUsageSummary() : Promise.resolve(null)
      ]);
      setPlans(availablePlans.length ? availablePlans : FALLBACK_PLANS.filter((plan) => plan.audience === audience));
      setEntitlements(currentEntitlements);
      setUsage(currentUsage);
    } catch (error) {
      console.error('Failed to load subscription plans:', error);
      setPlans(FALLBACK_PLANS.filter((plan) => plan.audience === audience));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, [audience, user?.id]);

  const selectedPlan = useMemo(
    () => plans.find((plan) => plan.code === entitlements?.planCode),
    [plans, entitlements?.planCode]
  );
  const used = usage?.period?.renter_unlocks_used || 0;
  const limit = Number(entitlements?.entitlements?.renter_contact_unlocks || 0);
  const billingStatusMessage = entitlements?.status === 'attention'
    ? `We could not confirm your latest payment. Please update your payment method${entitlements.graceUntil ? ` before ${new Date(entitlements.graceUntil).toLocaleDateString()}` : ''} to keep your subscription active.`
    : entitlements?.status === 'non-renewing'
      ? 'Your subscription will remain active until the end of the current billing period and will not renew.'
      : entitlements?.status === 'cancelled' || entitlements?.status === 'expired'
        ? 'Your subscription is no longer active. Choose a plan below to restore your access.'
        : null;

  const choosePlan = async (plan: SubscriptionPlan) => {
    const subscriptionPath = audience === 'lister' ? '/lister/subscription' : '/account/subscription';
    if (plan.isFree) {
      navigate(user ? subscriptionPath : `/signup?role=${audience}`);
      return;
    }
    if (!user?.email) {
      navigate(`/login?role=${audience}&next=${encodeURIComponent(subscriptionPath)}`);
      return;
    }
    setCheckoutCode(plan.code);
    try {
      const checkout = await subscriptionService.initialize(plan.code, user.email);
      if (checkout.authorizationUrl) {
        window.location.assign(checkout.authorizationUrl);
      } else {
        throw new Error('Paystack did not return a checkout URL.');
      }
    } catch (error) {
      console.error('Subscription checkout failed:', error);
      window.alert(error instanceof Error ? error.message : 'Unable to start subscription checkout.');
    } finally {
      setCheckoutCode(null);
    }
  };

  const cancelSubscription = async () => {
    if (!window.confirm('Cancel renewal for this subscription? Your current access remains active until the paid period ends.')) return;
    setCancelling(true);
    try {
      await subscriptionService.cancel();
      await load();
    } catch (error) {
      console.error('Subscription cancellation failed:', error);
      window.alert(error instanceof Error ? error.message : 'Unable to cancel subscription.');
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div style={{ minHeight: 'calc(100vh - 72px)', background: '#F8FAFC', padding: '32px 20px 72px' }}>
      <div style={{ maxWidth: 1120, margin: '0 auto' }}>
        <button type="button" onClick={() => navigate(-1)} style={{ display: 'inline-flex', gap: 8, alignItems: 'center', color: '#000052', fontWeight: 700, marginBottom: 24 }}>
          <ArrowLeft size={17} /> Back
        </button>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <p style={{ color: '#6B21A8', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.08em', fontSize: 12 }}>Rentivo membership</p>
          <h1 style={{ color: '#000052', fontSize: 40, margin: '8px 0 10px' }}>Choose the access that fits you</h1>
          <p style={{ maxWidth: 640, margin: '0 auto', fontSize: 16 }}>Browse freely. Upgrade when you need more verified property access or more renter leads.</p>
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 28 }}>
          {(['renter', 'lister'] as SubscriptionAudience[]).map((value) => (
            <button key={value} type="button" onClick={() => setAudience(value)} style={{ padding: '11px 20px', borderRadius: 999, border: `1px solid ${audience === value ? '#000052' : '#CBD5E1'}`, background: audience === value ? '#000052' : '#fff', color: audience === value ? '#fff' : '#475569', fontWeight: 800 }}>
              {value === 'renter' ? 'I am looking for a property' : 'I list properties'}
            </button>
          ))}
        </div>
        {user && entitlements && (
          <>
            {billingStatusMessage && (
              <div role="alert" style={{ background: entitlements.status === 'attention' ? '#FFF7ED' : '#F1F5F9', border: `1px solid ${entitlements.status === 'attention' ? '#FDBA74' : '#CBD5E1'}`, color: '#334155', borderRadius: 12, padding: '12px 16px', marginBottom: 12, fontSize: 14 }}>
                {billingStatusMessage}
              </div>
            )}
            <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 16, padding: 18, marginBottom: 20, display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
              <div>
                <strong style={{ color: '#000052' }}>Current plan: {entitlements.planName}</strong>
                <div style={{ color: '#64748B', fontSize: 13, marginTop: 4 }}>Status: {entitlements.status} {entitlements.periodEnd ? `· renews ${new Date(entitlements.periodEnd).toLocaleDateString()}` : ''}</div>
              </div>
              {audience === 'renter' && <div style={{ color: '#475569', fontSize: 14 }}>{used} of {limit} contact unlocks used this period</div>}
              {entitlements.subscriptionId && ['active', 'attention'].includes(entitlements.status) && (
                <button type="button" onClick={() => void cancelSubscription()} disabled={cancelling} style={{ color: '#B42318', fontWeight: 800, fontSize: 13 }}>
                  {cancelling ? 'Cancelling...' : 'Cancel renewal'}
                </button>
              )}
            </div>
          </>
        )}
        {loading ? (
          <div style={{ textAlign: 'center', padding: 48, color: '#64748B' }}><RefreshCw size={22} /> Loading plans...</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(plans.length, 4)}, minmax(0, 1fr))`, gap: 16, alignItems: 'stretch' }}>
            {plans.map((plan) => {
              const isCurrent = selectedPlan?.code === plan.code;
              const isUnavailable = !plan.isFree && !plan.paystackPlanCode && !isLiveBackend;
              const isWrongAudience = Boolean(accountAudience && accountAudience !== audience);
              return (
                <article key={plan.code} style={{ background: '#fff', border: `2px solid ${isCurrent ? '#BE89FF' : '#E2E8F0'}`, borderRadius: 18, padding: 22, display: 'flex', flexDirection: 'column', boxShadow: isCurrent ? '0 8px 24px rgba(0,0,82,.08)' : 'none' }}>
                  <h2 style={{ color: '#000052', fontSize: 22 }}>{plan.name}</h2>
                  <div style={{ margin: '18px 0 4px', color: '#000052', fontWeight: 900, fontSize: 28 }}>{plan.amountKobo === 0 ? 'Free' : `${formatNaira(plan.amountKobo / 100)}`}</div>
                  <div style={{ color: '#64748B', fontSize: 13, marginBottom: 18 }}>per month</div>
                  <ul style={{ display: 'grid', gap: 11, marginBottom: 24, flex: 1 }}>
                    {Object.entries(plan.entitlements).map(([key, value]) => {
                      const label = entitlementLabel(key, value);
                      return label ? <li key={key} style={{ display: 'flex', gap: 8, color: '#475569', fontSize: 14 }}><Check size={17} color="#16794A" /> <span style={{ textTransform: value === true ? 'capitalize' : 'none' }}>{label}</span></li> : null;
                    })}
                  </ul>
                  <button type="button" disabled={isCurrent || isUnavailable || isWrongAudience || checkoutCode === plan.code} onClick={() => void choosePlan(plan)} style={{ width: '100%', padding: '12px 14px', borderRadius: 10, background: isCurrent || isUnavailable || isWrongAudience ? '#E2E8F0' : '#000052', color: isCurrent || isUnavailable || isWrongAudience ? '#64748B' : '#fff', fontWeight: 800 }}>
                    {isCurrent ? 'Current plan' : isWrongAudience ? `For ${audience} accounts` : isUnavailable ? 'Coming soon' : checkoutCode === plan.code ? 'Opening checkout...' : plan.isFree ? 'Start free' : <><CreditCard size={16} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 6 }} />Choose plan</>}
                  </button>
                </article>
              );
            })}
          </div>
        )}
        <p style={{ textAlign: 'center', color: '#64748B', fontSize: 13, marginTop: 24 }}>Recurring payments will be processed securely through Paystack. Existing verified one-time unlocks remain valid.</p>
      </div>
    </div>
  );
};
