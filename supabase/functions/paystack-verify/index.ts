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
      return new Response(JSON.stringify({ error: "Unauthorized: Please sign in." }), { 
        status: 401, 
        headers: { ...cors, "Content-Type": "application/json" } 
      });
    }

    const { requestId, reference } = await req.json();
    if (!reference) {
      return new Response(JSON.stringify({ error: "reference is required" }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" }
      });
    }

    // Verify with Paystack API directly
    const verifyRes = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        "Content-Type": "application/json"
      }
    });

    const verifyJson = await verifyRes.json();
    if (!verifyRes.ok || !verifyJson.status || verifyJson.data?.status !== "success") {
      console.warn("Paystack verification was not successful:", verifyJson);
      return new Response(JSON.stringify({ 
        success: false, 
        error: verifyJson?.message || "Payment verification failed or status is not successful." 
      }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" }
      });
    }

    const paystackData = verifyJson.data;
    const targetRequestId = requestId || paystackData?.metadata?.requestId;
    const amountKobo = paystackData?.amount || 500000;

    // Check if payment was already recorded as success (e.g. by webhook)
    const { data: existingPayment } = await supabase
      .from("payments")
      .select("id, status")
      .eq("paystack_reference", reference)
      .maybeSingle();

    const alreadyProcessed = existingPayment?.status === "success";

    // Record or update payment record
    await supabase.from("payments").upsert({
      paystack_reference: reference,
      availability_request_id: targetRequestId,
      renter_user_id: userData.user.id,
      amount_kobo: amountKobo,
      currency_code: "NGN",
      provider: "paystack",
      status: "success",
      paystack_transaction_id: String(paystackData?.id || ""),
      channel: paystackData?.channel || "card",
      paid_at: new Date().toISOString(),
      raw_webhook_payload: paystackData
    }, { onConflict: "paystack_reference" });

    // Mark availability_request as paid & unlocked
    if (targetRequestId) {
      await supabase
        .from("availability_requests")
        .update({
          status: "paid",
          contact_unlocked_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq("id", targetRequestId);

      // Trigger payment confirmation email only if not already sent
      if (!alreadyProcessed) {
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

            const origin = req.headers.get("origin") || DEFAULT_APP_URL;
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
                  requestUrl: `${origin}/requests/${targetRequestId}`,
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
          console.error("Failed to dispatch email in paystack-verify:", emailErr);
        }
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      reference, 
      status: "paid",
      requestId: targetRequestId
    }), {
      status: 200,
      headers: { ...cors, "Content-Type": "application/json" }
    });
  } catch (err: any) {
    console.error("paystack-verify error:", err);
    return new Response(JSON.stringify({ error: err?.message || "Internal error" }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" }
    });
  }
});
