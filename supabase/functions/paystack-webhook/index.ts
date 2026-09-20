import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createHmac } from "node:crypto";

serve(async (req) => {
  const raw = await req.text();
  const signature = req.headers.get("x-paystack-signature") || "";
  const secret = Deno.env.get("PAYSTACK_SECRET_KEY") || "";
  const hash = createHmac("sha512", secret).update(raw).digest("hex");
  if (hash !== signature) {
    return new Response("invalid signature", { status: 401 });
  }

  const event = JSON.parse(raw);
  if (event.event !== "charge.success") {
    return new Response("ignored", { status: 200 });
  }

  const reference = event.data?.reference as string;
  const requestId = event.data?.metadata?.requestId as string;
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  const { data: existing } = await supabase
    .from("payments")
    .select("id, status")
    .eq("paystack_reference", reference)
    .maybeSingle();

  if (existing?.status === "success") {
    return new Response("ok", { status: 200 });
  }

  await supabase.from("payments").upsert({
    paystack_reference: reference,
    availability_request_id: requestId,
    renter_user_id: event.data?.metadata?.renterId,
    amount_kobo: event.data?.amount,
    status: "success",
    paystack_transaction_id: String(event.data?.id || ""),
    channel: event.data?.channel,
    paid_at: new Date().toISOString(),
    raw_webhook_payload: event
  }, { onConflict: "paystack_reference" });

  await supabase
    .from("availability_requests")
    .update({ status: "paid", contact_unlocked_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", requestId);

  return new Response("ok", { status: 200 });
});
