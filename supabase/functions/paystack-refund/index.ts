import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS"
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );
    const authHeader = req.headers.get("Authorization") || "";
    const { data: userData } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    const { data: profile } = userData?.user
      ? await supabase.from("users").select("role").eq("id", userData.user.id).single()
      : { data: null };

    if (profile?.role !== "admin") {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: cors });
    }

    const { paymentId, reason } = await req.json();
    const { data: payment } = await supabase.from("payments").select("*").eq("id", paymentId).single();
    if (!payment) return new Response(JSON.stringify({ error: "Not found" }), { status: 404, headers: cors });

    const secret = Deno.env.get("PAYSTACK_SECRET_KEY") || "";
    if (secret) {
      await fetch("https://api.paystack.co/refund", {
        method: "POST",
        headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" },
        body: JSON.stringify({ transaction: payment.paystack_reference })
      });
    }

    await supabase.from("payments").update({
      status: "refunded",
      refunded_at: new Date().toISOString(),
      refund_reason: reason || "Admin refund"
    }).eq("id", paymentId);

    return new Response(JSON.stringify({ ok: true }), { headers: { ...cors, "Content-Type": "application/json" } });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err?.message || "Internal error" }), {
      status: 500,
      headers: cors
    });
  }
});
