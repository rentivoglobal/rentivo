import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

const secret = Deno.env.get("PAYSTACK_SECRET_KEY") || "";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") || "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
    );
    const token = (req.headers.get("Authorization") || "").replace("Bearer ", "");
    const { data: auth } = await supabase.auth.getUser(token);
    if (!auth.user) {
      return new Response(JSON.stringify({ error: "Unauthorized: Please sign in." }), {
        status: 401,
        headers: { ...cors, "Content-Type": "application/json" }
      });
    }
    if (!secret) {
      return new Response(JSON.stringify({ error: "Recurring payments are not configured." }), {
        status: 503,
        headers: { ...cors, "Content-Type": "application/json" }
      });
    }

    const { data: user } = await supabase
      .from("users")
      .select("role")
      .eq("id", auth.user.id)
      .maybeSingle();
    const audience = user?.role === "landlord" || user?.role === "agent" ? "lister" : "renter";

    const { data: subscription } = await supabase
      .from("subscriptions")
      .select("id, provider_subscription_code, provider_email_token, current_period_end")
      .eq("user_id", auth.user.id)
      .eq("audience", audience)
      .in("status", ["active", "non-renewing", "attention"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!subscription?.provider_subscription_code || !subscription.provider_email_token) {
      return new Response(JSON.stringify({ error: "No active recurring subscription found." }), {
        status: 404,
        headers: { ...cors, "Content-Type": "application/json" }
      });
    }

    const response = await fetch("https://api.paystack.co/subscription/disable", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secret}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        code: subscription.provider_subscription_code,
        token: subscription.provider_email_token
      })
    });
    const payload = await response.json();
    if (!response.ok || !payload.status) {
      return new Response(JSON.stringify({ error: payload.message || "Unable to cancel subscription." }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" }
      });
    }

    await supabase
      .from("subscriptions")
      .update({
        status: "non-renewing",
        cancel_at_period_end: true,
        cancelled_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq("id", subscription.id);

    return new Response(JSON.stringify({
      success: true,
      accessUntil: subscription.current_period_end
    }), {
      status: 200,
      headers: { ...cors, "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error("subscription-cancel error:", error);
    return new Response(JSON.stringify({ error: "Unable to cancel subscription." }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" }
    });
  }
});
