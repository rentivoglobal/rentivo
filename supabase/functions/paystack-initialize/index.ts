import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS"
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get("Authorization") || "";
    const { data: userData } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (!userData?.user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: cors });

    const { requestId, email } = await req.json();
    const reference = `rnt_${requestId}_${Date.now()}`;
    const amount = Number(Deno.env.get("ACCESS_FEE_KOBO") || 500000);

    await supabase.from("payments").insert({
      availability_request_id: requestId,
      renter_user_id: userData.user.id,
      amount_kobo: amount,
      paystack_reference: reference,
      status: "pending"
    });

    const secret = Deno.env.get("PAYSTACK_SECRET_KEY") || "";
    const init = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secret}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        email,
        amount,
        currency: "NGN",
        reference,
        metadata: { requestId },
        callback_url: `${Deno.env.get("APP_URL")}/requests/${requestId}`
      })
    });
    const json = await init.json();

    return new Response(JSON.stringify({
      reference,
      authorizationUrl: json.data?.authorization_url
    }), { headers: { ...cors, "Content-Type": "application/json" } });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err?.message || "Internal error" }), {
      status: 500,
      headers: cors
    });
  }
});
