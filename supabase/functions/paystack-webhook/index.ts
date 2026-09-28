import { createClient } from "npm:@supabase/supabase-js@2";
import { createHmac } from "node:crypto";

const PAYSTACK_SECRET_KEY = Deno.env.get("PAYSTACK_SECRET_KEY") || "sk_test_fc887e80e16d307c2cc39ca6fe6951d0cf8e1849";
const APP_URL = Deno.env.get("APP_URL") || "https://rentivos.com.ng";

Deno.serve(async (req) => {
  const raw = await req.text();
  const signature = req.headers.get("x-paystack-signature") || "";
  
  if (PAYSTACK_SECRET_KEY) {
    const hash = createHmac("sha512", PAYSTACK_SECRET_KEY).update(raw).digest("hex");
    if (hash !== signature) {
      console.warn("Paystack webhook signature mismatch", { hash, signature });
      return new Response("invalid signature", { status: 401 });
    }
  }

  let event: any;
  try {
    event = JSON.parse(raw);
  } catch (_e) {
    return new Response("bad json", { status: 400 });
  }

  if (event.event !== "charge.success") {
    return new Response("ignored", { status: 200 });
  }

  const reference = event.data?.reference as string;
  const requestId = event.data?.metadata?.requestId as string;
  const renterId = event.data?.metadata?.renterId as string | undefined;

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Check if already processed
  const { data: existing } = await supabase
    .from("payments")
    .select("id, status, renter_user_id, availability_request_id")
    .eq("paystack_reference", reference)
    .maybeSingle();

  if (existing?.status === "success") {
    return new Response("ok", { status: 200 });
  }

  // Resolve target availability_request_id and renter_user_id
  const targetRequestId = requestId || existing?.availability_request_id;
  let targetRenterId = renterId || existing?.renter_user_id;

  if (!targetRenterId && targetRequestId) {
    const { data: reqRow } = await supabase
      .from("availability_requests")
      .select("renter_user_id")
      .eq("id", targetRequestId)
      .maybeSingle();
    targetRenterId = reqRow?.renter_user_id;
  }

  // Upsert successful payment record
  await supabase.from("payments").upsert({
    paystack_reference: reference,
    availability_request_id: targetRequestId,
    renter_user_id: targetRenterId,
    amount_kobo: event.data?.amount || 500000,
    currency_code: "NGN",
    provider: "paystack",
    status: "success",
    paystack_transaction_id: String(event.data?.id || ""),
    channel: event.data?.channel || "card",
    paid_at: new Date().toISOString(),
    raw_webhook_payload: event
  }, { onConflict: "paystack_reference" });

  if (targetRequestId) {
    // Unlock contact details in availability_requests
    await supabase
      .from("availability_requests")
      .update({
        status: "paid",
        contact_unlocked_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq("id", targetRequestId);

    // Dispatch payment confirmation & landlord dossier email via send-email function
    try {
      const { data: requestRow } = await supabase
        .from("availability_requests")
        .select("*")
        .eq("id", targetRequestId)
        .maybeSingle();

      if (requestRow && requestRow.renter_email) {
        const { data: listing } = await supabase
          .from("listings")
          .select("*, areas(name)")
          .eq("id", requestRow.listing_id)
          .maybeSingle();

        const { data: owner } = listing?.owner_user_id ? await supabase
          .from("users")
          .select("*")
          .eq("id", listing.owner_user_id)
          .maybeSingle() : { data: null };

        const { data: photos } = await supabase
          .from("listing_photos")
          .select("url")
          .eq("listing_id", requestRow.listing_id)
          .order("sort_order", { ascending: true })
          .limit(1);

        const { data: privateDetails } = await supabase
          .from("listing_private_details")
          .select("address_full")
          .eq("listing_id", requestRow.listing_id)
          .maybeSingle();

        const photoUrl = photos?.[0]?.url || "";
        const areaName = (listing as any)?.areas?.name || "Ibadan";
        const exactAddress = privateDetails?.address_full || listing?.address_summary || "Ibadan, Oyo State";

        await supabase.functions.invoke("send-email", {
          body: {
            template: "payment_success",
            recipientEmail: requestRow.renter_email,
            recipientName: requestRow.renter_name || "Rentivo Member",
            data: {
              propertyTitle: listing?.title || "Verified Property",
              propertyArea: areaName,
              propertyPrice: listing?.price_amount ? listing.price_amount / 100 : 0,
              propertyType: listing?.property_type || "Residential",
              propertyPhoto: photoUrl,
              requestUrl: `${APP_URL}/requests/${targetRequestId}`,
              landlordName: owner?.full_name || "Verified Landlord",
              landlordPhone: owner?.phone || "",
              landlordWhatsapp: owner?.whatsapp || owner?.phone || "",
              agencyName: owner?.agency_name,
              exactAddress: exactAddress,
              paymentReference: reference
            }
          }
        });
      }
    } catch (emailErr) {
      console.error("Failed to dispatch payment success email in webhook:", emailErr);
    }
  }

  return new Response("ok", { status: 200 });
});
