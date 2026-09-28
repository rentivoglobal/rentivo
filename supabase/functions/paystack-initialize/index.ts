import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS"
};

const PAYSTACK_SECRET_KEY = Deno.env.get("PAYSTACK_SECRET_KEY") || "sk_test_fc887e80e16d307c2cc39ca6fe6951d0cf8e1849";
const DEFAULT_APP_URL = Deno.env.get("APP_URL") || "https://rentivos.com.ng";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get("Authorization") || "";
    const { data: userData } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (!userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized: Please sign in to continue." }), { 
        status: 401, 
        headers: { ...cors, "Content-Type": "application/json" } 
      });
    }

    const { requestId, email } = await req.json();
    if (!requestId || !email) {
      return new Response(JSON.stringify({ error: "requestId and email are required" }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" }
      });
    }

    // Verify availability request exists and renter has rights
    const { data: requestRow, error: reqErr } = await supabase
      .from("availability_requests")
      .select("id, status, renter_user_id, listing_id")
      .eq("id", requestId)
      .maybeSingle();

    if (reqErr || !requestRow) {
      return new Response(JSON.stringify({ error: "Availability request not found." }), {
        status: 404,
        headers: { ...cors, "Content-Type": "application/json" }
      });
    }

    if (requestRow.status === "paid") {
      return new Response(JSON.stringify({ 
        alreadyPaid: true,
        message: "This request has already been paid and landlord contact is unlocked." 
      }), {
        status: 200,
        headers: { ...cors, "Content-Type": "application/json" }
      });
    }

    const origin = req.headers.get("origin") || DEFAULT_APP_URL;
    const reference = `rnt_${requestId.slice(0, 8)}_${Date.now()}`;
    const amount = Number(Deno.env.get("ACCESS_FEE_KOBO") || 500000);

    // Update availability request status to payment_pending
    await supabase
      .from("availability_requests")
      .update({
        status: "payment_pending",
        updated_at: new Date().toISOString()
      })
      .eq("id", requestId);

    // Record pending transaction in Supabase
    await supabase.from("payments").insert({
      availability_request_id: requestId,
      renter_user_id: userData.user.id,
      amount_kobo: amount,
      currency_code: "NGN",
      provider: "paystack",
      paystack_reference: reference,
      status: "pending"
    });

    // Initialize with Paystack REST API
    const init = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        email,
        amount,
        currency: "NGN",
        reference,
        metadata: { 
          requestId,
          renterId: userData.user.id
        },
        callback_url: `${origin}/requests/${requestId}`
      })
    });

    const json = await init.json();
    if (!init.ok || !json.status) {
      console.error("Paystack API initialize failed:", json);
      return new Response(JSON.stringify({ 
        error: json?.message || "Failed to initialize Paystack transaction." 
      }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" }
      });
    }

    return new Response(JSON.stringify({
      reference,
      authorizationUrl: json.data?.authorization_url,
      accessCode: json.data?.access_code
    }), { 
      status: 200,
      headers: { ...cors, "Content-Type": "application/json" } 
    });
  } catch (err: any) {
    console.error("paystack-initialize error:", err);
    return new Response(JSON.stringify({ error: err?.message || "Internal error" }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" }
    });
  }
});
