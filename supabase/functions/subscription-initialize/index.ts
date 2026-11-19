import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

const secret = Deno.env.get("PAYSTACK_SECRET_KEY") || "";
const appUrl = Deno.env.get("APP_URL") || "https://www.rentivos.com.ng";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return new Response("method not allowed", { status: 405, headers: cors });

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

    const { planCode } = await req.json();
    if (!planCode) {
      return new Response(JSON.stringify({ error: "planCode is required." }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" }
      });
    }
    if (!secret) {
      return new Response(JSON.stringify({ error: "Recurring payments are not configured." }), {
        status: 503,
        headers: { ...cors, "Content-Type": "application/json" }
      });
    }

    const { data: plan } = await supabase
      .from("subscription_plans")
      .select("id, code, name, audience, amount_kobo, paystack_plan_code, is_free, is_active")
      .eq("code", planCode)
      .eq("is_active", true)
      .maybeSingle();

    if (!plan || plan.is_free) {
      return new Response(JSON.stringify({ error: "This plan is not configured for recurring billing yet." }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" }
      });
    }

    const { data: user } = await supabase
      .from("users")
      .select("role")
      .eq("id", auth.user.id)
      .maybeSingle();
    const expectedAudience = user?.role === "landlord" || user?.role === "agent" ? "lister" : "renter";
    if (plan.audience !== expectedAudience) {
      return new Response(JSON.stringify({ error: "This plan is not available for your account type." }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" }
      });
    }

    let paystackPlanCode = plan.paystack_plan_code as string | null;
    if (!paystackPlanCode) {
      const createPlanResponse = await fetch("https://api.paystack.co/plan", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${secret}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name: `${plan.name} - Monthly`,
          amount: plan.amount_kobo,
          interval: "monthly",
          currency: "NGN"
        })
      });
      const createdPlan = await createPlanResponse.json();
      paystackPlanCode = createdPlan.data?.plan_code || null;

      if (!createPlanResponse.ok || !createdPlan.status || !paystackPlanCode) {
        return new Response(JSON.stringify({
          error: createdPlan.message || "Unable to create the recurring billing plan."
        }), {
          status: 400,
          headers: { ...cors, "Content-Type": "application/json" }
        });
      }

      const { error: planUpdateError } = await supabase
        .from("subscription_plans")
        .update({ paystack_plan_code: paystackPlanCode })
        .eq("id", plan.id);

      if (planUpdateError) {
        console.error("Unable to store Paystack plan code:", planUpdateError);
        return new Response(JSON.stringify({
          error: "The recurring plan was created but could not be saved."
        }), {
          status: 500,
          headers: { ...cors, "Content-Type": "application/json" }
        });
      }
    }

    const reference = `sub_${auth.user.id.slice(0, 8)}_${Date.now()}`;
    const response = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secret}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        email: auth.user.email,
        amount: plan.amount_kobo,
        currency: "NGN",
        plan: paystackPlanCode,
        reference,
        metadata: { userId: auth.user.id, planCode: plan.code, subscriptionPlanId: plan.id },
        callback_url: `${appUrl.replace(/\/$/, "")}/${plan.audience === "lister" ? "lister" : "account"}/subscription?plan=${encodeURIComponent(plan.code)}`
      })
    });
    const payload = await response.json();
    if (!response.ok || !payload.status) {
      return new Response(JSON.stringify({ error: payload.message || "Failed to initialize subscription." }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" }
      });
    }

    return new Response(JSON.stringify({
      reference,
      authorizationUrl: payload.data?.authorization_url,
      accessCode: payload.data?.access_code
    }), {
      status: 200,
      headers: { ...cors, "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error("subscription-initialize error:", error);
    return new Response(JSON.stringify({ error: "Unable to initialize subscription." }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" }
    });
  }
});
