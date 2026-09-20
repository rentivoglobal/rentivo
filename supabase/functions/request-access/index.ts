import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  const authHeader = req.headers.get("Authorization") || "";
  const jwt = authHeader.replace("Bearer ", "");
  const { data: userData } = await supabase.auth.getUser(jwt);
  if (!userData.user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: cors });
  }

  const body = await req.json();
  const token = crypto.randomUUID();
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  const hash = Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");

  const { data, error } = await supabase
    .from("availability_requests")
    .insert({
      listing_id: body.listingId,
      renter_user_id: userData.user.id,
      renter_name: body.renterName,
      renter_phone: body.renterPhone,
      renter_email: body.renterEmail,
      status: "availability_pending",
      email_confirmation_token_hash: hash,
      token_expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    })
    .select("*")
    .single();

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: cors });
  }

  const appUrl = Deno.env.get("APP_URL") || "http://localhost:5173";
  const resendKey = Deno.env.get("RESEND_API_KEY");
  const { data: listing } = await supabase.from("listings").select("title, owner_user_id").eq("id", body.listingId).single();
  const { data: owner } = listing ? await supabase.from("users").select("email, full_name").eq("id", listing.owner_user_id).single() : { data: null };

  if (resendKey && owner?.email) {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: "Rentivo <notifications@rentivo.ng>",
        to: [owner.email],
        subject: `Action Required: Is "${listing?.title}" still available? — Rentivo`,
        html: `<p>A renter requested access to <b>${listing?.title}</b>.</p>
          <p><a href="${appUrl}/availability/action?token=${token}&decision=yes">YES, IT'S STILL AVAILABLE</a></p>
          <p><a href="${appUrl}/availability/action?token=${token}&decision=no">NO, ALREADY TAKEN</a></p>`
      })
    });
  }

  return new Response(JSON.stringify({ request: data, tokenPreview: token }), {
    headers: { ...cors, "Content-Type": "application/json" }
  });
});
