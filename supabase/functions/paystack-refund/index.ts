import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS"
};

const PAYSTACK_SECRET_KEY = Deno.env.get("PAYSTACK_SECRET_KEY") || "sk_test_fc887e80e16d307c2cc39ca6fe6951d0cf8e1849";
const APP_URL = Deno.env.get("APP_URL") || "https://rentivos.com.ng";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get("Authorization") || "";
    const { data: userData } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    const { data: profile } = userData?.user
      ? await supabase.from("users").select("role").eq("id", userData.user.id).single()
      : { data: null };

    if (profile?.role !== "admin") {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { 
        status: 401, 
        headers: { ...cors, "Content-Type": "application/json" } 
      });
    }

    const { paymentId, reason } = await req.json();
    const { data: payment } = await supabase.from("payments").select("*").eq("id", paymentId).single();
    if (!payment) {
      return new Response(JSON.stringify({ error: "Payment not found" }), { 
        status: 404, 
        headers: { ...cors, "Content-Type": "application/json" } 
      });
    }

    if (PAYSTACK_SECRET_KEY && payment.paystack_reference) {
      const refundRes = await fetch("https://api.paystack.co/refund", {
        method: "POST",
        headers: { 
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`, 
          "Content-Type": "application/json" 
        },
        body: JSON.stringify({ transaction: payment.paystack_reference })
      });
      const refundData = await refundRes.json().catch(() => ({}));
      console.log("Paystack refund response:", refundData);
    }

    await supabase.from("payments").update({
      status: "refunded",
      refunded_at: new Date().toISOString(),
      refund_reason: reason || "Admin refund"
    }).eq("id", paymentId);

    // Send refund confirmation email
    try {
      if (payment.availability_request_id) {
        const { data: requestRow } = await supabase
          .from("availability_requests")
          .select("*, listings(title, areas(name))")
          .eq("id", payment.availability_request_id)
          .maybeSingle();

        if (requestRow?.renter_email) {
          const propertyTitle = (requestRow as any)?.listings?.title || "Requested Property";
          const propertyArea = (requestRow as any)?.listings?.areas?.name || "Ibadan";

          await supabase.functions.invoke("send-email", {
            body: {
              template: "refund_processed",
              recipientEmail: requestRow.renter_email,
              recipientName: requestRow.renter_name || "Rentivo Member",
              data: {
                propertyTitle,
                propertyArea,
                originalTransaction: payment.paystack_reference,
                refundReference: `RF-${Date.now().toString().slice(-6)}`,
                browseUrl: `${APP_URL}/search`
              }
            }
          });
        }
      }
    } catch (emailErr) {
      console.error("Failed to dispatch refund email:", emailErr);
    }

    return new Response(JSON.stringify({ ok: true, status: "refunded" }), { 
      headers: { ...cors, "Content-Type": "application/json" } 
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err?.message || "Internal error" }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" }
    });
  }
});
