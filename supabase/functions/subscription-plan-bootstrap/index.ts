import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "https://www.rentivos.com.ng",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return new Response("method not allowed", { status: 405, headers: cors });

  try {
    const secret = Deno.env.get("PAYSTACK_SECRET_KEY") || "";
    if (!secret) {
      return new Response(JSON.stringify({ success: false, error: "PAYSTACK_SECRET_KEY is not configured" }), {
        status: 503,
        headers: { ...cors, "Content-Type": "application/json" }
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") || "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
    );
    const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
    if (!token) {
      return new Response(JSON.stringify({ success: false, error: "Administrator authentication required" }), {
        status: 401,
        headers: { ...cors, "Content-Type": "application/json" }
      });
    }

    const { data: auth, error: authError } = await supabase.auth.getUser(token);
    if (authError || !auth.user) {
      return new Response(JSON.stringify({ success: false, error: "Invalid administrator session" }), {
        status: 401,
        headers: { ...cors, "Content-Type": "application/json" }
      });
    }

    const { data: admin, error: adminError } = await supabase
      .from("users")
      .select("role, is_active")
      .eq("id", auth.user.id)
      .maybeSingle();
    if (adminError) throw adminError;
    if (admin?.role !== "admin" || !admin.is_active) {
      return new Response(JSON.stringify({ success: false, error: "Active administrator access required" }), {
        status: 403,
        headers: { ...cors, "Content-Type": "application/json" }
      });
    }

    const { data: plans, error: plansError } = await supabase
      .from("subscription_plans")
      .select("id, code, name, amount_kobo, paystack_plan_code")
      .eq("is_active", true)
      .eq("is_free", false);
    if (plansError) throw plansError;

    const results: Array<Record<string, unknown>> = [];
    for (const plan of plans || []) {
      if (plan.paystack_plan_code) {
        results.push({ code: plan.code, planCode: plan.paystack_plan_code, status: "already-configured" });
        continue;
      }

      const response = await fetch("https://api.paystack.co/plan", {
        method: "POST",
        headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `${plan.name} - Monthly`,
          amount: plan.amount_kobo,
          interval: "monthly",
          currency: "NGN"
        })
      });
      const payload = await response.json();
      const paystackPlanCode = payload.data?.plan_code;
      if (!response.ok || !payload.status || !paystackPlanCode) {
        results.push({ code: plan.code, status: "failed", error: payload.message || "Paystack rejected the plan" });
        continue;
      }

      const { error: updateError } = await supabase
        .from("subscription_plans")
        .update({ paystack_plan_code: paystackPlanCode })
        .eq("id", plan.id)
        .is("paystack_plan_code", null);
      if (updateError) throw updateError;

      results.push({ code: plan.code, planCode: paystackPlanCode, status: "created" });
    }

    return new Response(JSON.stringify({ success: true, results }), {
      status: 200,
      headers: { ...cors, "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error("Subscription plan bootstrap failed:", error);
    return new Response(JSON.stringify({ success: false, error: "Unable to provision subscription plans" }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" }
    });
  }
});
