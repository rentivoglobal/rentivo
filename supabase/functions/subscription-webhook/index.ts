import { createClient } from "npm:@supabase/supabase-js@2";
import { createHmac } from "node:crypto";

const secret = Deno.env.get("PAYSTACK_SECRET_KEY") || "";

async function notifySubscriptionStatus(supabase: ReturnType<typeof createClient>, subscriptionCode: string, status: "attention" | "non-renewing" | "cancelled", graceUntil?: string) {
  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("user_id, audience, plan:subscription_plans(name)")
    .eq("provider_subscription_code", subscriptionCode)
    .maybeSingle();
  if (!subscription) return;

  const { data: user } = await supabase
    .from("users")
    .select("full_name, email")
    .eq("id", subscription.user_id)
    .maybeSingle();
  const plan = Array.isArray(subscription.plan) ? subscription.plan[0] : subscription.plan;
  if (!user?.email || !plan?.name) return;

  const { error } = await supabase.functions.invoke("subscription-status-email", {
    body: {
      template: "subscription_status",
      recipientEmail: user.email,
      recipientName: user.full_name || "Rentivo Member",
      data: {
        status,
        planName: plan.name,
        graceUntil,
        dashboardUrl: `${Deno.env.get("APP_URL") || "https://rentivos.com.ng"}/${subscription.audience === "lister" ? "lister" : "account"}/subscription`
      }
    }
  });
  if (error) console.error("Subscription status email was not delivered:", error);
}

Deno.serve(async (req) => {
  const raw = await req.text();
  const signature = req.headers.get("x-paystack-signature") || "";
  if (!secret) return new Response("Paystack secret not configured", { status: 503 });
  if (createHmac("sha512", secret).update(raw).digest("hex") !== signature) {
    return new Response("invalid signature", { status: 401 });
  }

  let event: any;
  try {
    event = JSON.parse(raw);
  } catch {
    return new Response("bad json", { status: 400 });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") || "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
  );
  const data = event.data || {};
  const eventName = event.event as string;
  const subscriptionCode = data.subscription_code || data.subscription?.subscription_code;

  if (eventName === "subscription.disable" || eventName === "subscription.not_renewing" || eventName === "subscription.not_renew") {
    if (subscriptionCode) {
      const status = eventName === "subscription.disable" ? "cancelled" : "non-renewing";
      await supabase
        .from("subscriptions")
        .update({
          status,
          cancel_at_period_end: true,
          cancelled_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq("provider_subscription_code", subscriptionCode);
      await notifySubscriptionStatus(supabase, subscriptionCode, status);
    }
    return new Response("ok", { status: 200 });
  }

  if (eventName === "invoice.payment_failed") {
    if (subscriptionCode) {
      const grace = new Date();
      grace.setDate(grace.getDate() + 7);
      await supabase
        .from("subscriptions")
        .update({
          status: "attention",
          grace_until: grace.toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq("provider_subscription_code", subscriptionCode);
      await notifySubscriptionStatus(supabase, subscriptionCode, "attention", grace.toISOString());
    }
    return new Response("ok", { status: 200 });
  }

  if (eventName !== "charge.success") return new Response("ignored", { status: 200 });

  const metadata = data.metadata || {};
  let userId = metadata.userId as string | undefined;
  let planCode = metadata.planCode as string | undefined;
  const reference = data.reference as string | undefined;

  if ((!userId || !planCode) && subscriptionCode) {
    const { data: existingSubscription } = await supabase
      .from("subscriptions")
      .select("user_id, plan:subscription_plans(code)")
      .eq("provider_subscription_code", subscriptionCode)
      .maybeSingle();
    if (existingSubscription) {
      userId = userId || String(existingSubscription.user_id);
      const existingPlan = Array.isArray(existingSubscription.plan)
        ? existingSubscription.plan[0]
        : existingSubscription.plan;
      planCode = planCode || existingPlan?.code;
    }
  }
  if (!userId || !planCode || !reference) return new Response("missing subscription metadata", { status: 400 });

  const { data: plan } = await supabase
    .from("subscription_plans")
    .select("id, code, name, audience, amount_kobo, entitlements")
    .eq("code", planCode)
    .maybeSingle();
  if (!plan) return new Response("plan not found", { status: 400 });
  if (Number(data.amount) !== Number(plan.amount_kobo) || String(data.currency || "").toUpperCase() !== "NGN") {
    console.error("Subscription charge amount or currency did not match plan:", {
      planCode,
      amount: data.amount,
      currency: data.currency
    });
    return new Response("charge does not match subscription plan", { status: 400 });
  }

  const { data: existing } = await supabase
    .from("billing_transactions")
    .select("id, status, subscription_id")
    .eq("provider_reference", reference)
    .maybeSingle();

  let currentSubscription = null;
  if (existing?.status === "success" && existing.subscription_id) {
    const { data } = await supabase
      .from("subscriptions")
      .select("id, welcome_email_sent_at, welcome_email_claimed_at, current_period_start, current_period_end")
      .eq("id", existing.subscription_id)
      .maybeSingle();
    currentSubscription = data;
  } else {
    const { data } = await supabase
      .from("subscriptions")
      .select("id, welcome_email_sent_at, welcome_email_claimed_at, current_period_start, current_period_end")
      .eq("user_id", userId)
      .eq("audience", plan.audience)
      .in("status", ["pending", "active", "non-renewing", "attention"])
      .maybeSingle();
    currentSubscription = data;
  }
  let start = new Date();
  let end = new Date(start);
  if (existing?.status === "success" && currentSubscription?.current_period_end) {
    start = new Date(currentSubscription.current_period_start || start);
    end = new Date(currentSubscription.current_period_end);
  } else if (currentSubscription?.current_period_end) {
    const existingEnd = new Date(currentSubscription.current_period_end);
    if (!Number.isNaN(existingEnd.getTime()) && existingEnd > new Date()) {
      start = existingEnd;
      end = new Date(existingEnd);
      end.setMonth(end.getMonth() + 1);
    } else {
      end.setMonth(end.getMonth() + 1);
    }
  } else {
    end.setMonth(end.getMonth() + 1);
  }
  const subscriptionValues = {
    user_id: userId,
    plan_id: plan.id,
    audience: plan.audience,
    provider: "paystack",
    provider_customer_code: data.customer?.customer_code || null,
    provider_subscription_code: data.subscription_code || null,
    provider_email_token: data.email_token || null,
    status: "active",
    current_period_start: start.toISOString(),
    current_period_end: end.toISOString(),
    updated_at: start.toISOString()
  };
  const { data: subscription, error: subscriptionError } =
    existing?.status === "success" && currentSubscription
      ? { data: { id: currentSubscription.id }, error: null }
      : await (currentSubscription
        ? supabase.from("subscriptions").update(subscriptionValues).eq("id", currentSubscription.id)
        : supabase.from("subscriptions").insert(subscriptionValues))
        .select("id")
        .single();
  if (subscriptionError) {
    console.error("subscription upsert failed:", subscriptionError);
    return new Response("subscription update failed", { status: 500 });
  }

  if (existing?.status !== "success") {
    const { error: transactionError } = await supabase.from("billing_transactions").upsert({
      user_id: userId,
      subscription_id: subscription.id,
      provider: "paystack",
      provider_reference: reference,
      provider_transaction_id: String(data.id || ""),
      amount_kobo: data.amount || plan.amount_kobo,
      currency_code: data.currency || "NGN",
      status: "success",
      channel: data.channel || null,
      paid_at: start.toISOString(),
      raw_payload: event
    }, { onConflict: "provider_reference" });
    if (transactionError) {
      console.error("Subscription transaction could not be recorded:", transactionError);
      return new Response("transaction update failed", { status: 500 });
    }
  }

  const welcomeSent = currentSubscription?.welcome_email_sent_at;
  if (!welcomeSent) {
    const claimCutoff = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { data: claimedSubscription } = await supabase
      .from("subscriptions")
      .update({ welcome_email_claimed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq("id", subscription.id)
      .is("welcome_email_sent_at", null)
      .or(`welcome_email_claimed_at.is.null,welcome_email_claimed_at.lt.${claimCutoff}`)
      .select("id")
      .maybeSingle();

    if (!claimedSubscription) return new Response("ok", { status: 200 });

    const { data: user } = await supabase
      .from("users")
      .select("full_name, email")
      .eq("id", userId)
      .maybeSingle();

    if (user?.email) {
      const { data: emailResult, error: emailError } = await supabase.functions.invoke("subscription-welcome-email", {
        body: {
          template: "subscription_welcome",
          recipientEmail: user.email,
          recipientName: user.full_name || "Rentivo Member",
          data: {
            planName: plan.name,
            audience: plan.audience,
            monthlyAmount: Number(plan.amount_kobo || 0) / 100,
            entitlements: plan.entitlements || {},
            dashboardUrl: `${Deno.env.get("APP_URL") || "https://rentivos.com.ng"}/${plan.audience === "lister" ? "lister" : "account"}/subscription`
          }
        }
      });

      if (emailError || !emailResult?.success) {
        console.error("Subscription welcome email was not delivered:", emailError || emailResult);
        const { error: claimReleaseError } = await supabase
          .from("subscriptions")
          .update({ welcome_email_claimed_at: null, updated_at: new Date().toISOString() })
          .eq("id", subscription.id);
        if (claimReleaseError) console.error("Unable to release welcome email claim:", claimReleaseError);
        return new Response("welcome email delivery failed", { status: 500 });
      }

      const { error: emailMarkerError } = await supabase
        .from("subscriptions")
        .update({
          welcome_email_sent_at: new Date().toISOString(),
          welcome_email_claimed_at: null,
          updated_at: new Date().toISOString()
        })
        .eq("id", subscription.id);
      if (emailMarkerError) {
        console.error("Welcome email sent but delivery marker could not be saved:", emailMarkerError);
        return new Response("welcome email delivery marker failed", { status: 500 });
      }
    } else {
      await supabase
        .from("subscriptions")
        .update({ welcome_email_claimed_at: null, updated_at: new Date().toISOString() })
        .eq("id", subscription.id);
    }
  }

  return new Response("ok", { status: 200 });
});
