import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Content-Type": "application/json"
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const body = await req.json().catch(() => ({}));
    const email = (body.email || "").trim().toLowerCase();
    const password = body.password || "";
    const fullName = (body.fullName || "").trim();
    const phone = (body.phone || "").trim();
    const role = body.role || "tenant";
    const agencyName = (body.agencyName || "").trim();

    if (!email || !password || password.length < 8) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: "Valid email and 8+ character password required." 
      }), {
        status: 200,
        headers: cors
      });
    }

    // 1. Create user with admin client (auto-confirmed)
    const { data: userData, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        phone,
        role,
        agency_name: agencyName
      }
    });

    if (createError) {
      const msg = createError.message || "";
      // If user already exists
      if (
        msg.includes("already registered") || 
        msg.includes("already exists") || 
        msg.includes("email_exists") ||
        (createError as any).status === 422
      ) {
        return new Response(JSON.stringify({ 
          success: false, 
          error: "An account with this email already exists. Please sign in with your password." 
        }), {
          status: 200,
          headers: cors
        });
      }
      return new Response(JSON.stringify({ 
        success: false, 
        error: createError.message || "Failed to create account" 
      }), {
        status: 200,
        headers: cors
      });
    }

    const user = userData.user;

    // 2. Ensure public.users profile exists with correct role
    if (user) {
      await adminClient.from("users").upsert({
        id: user.id,
        email,
        full_name: fullName || "Rentivo Member",
        phone,
        whatsapp: phone,
        agency_name: agencyName || null,
        role: role as any,
        is_active: true
      }, { onConflict: "id" });
    }

    return new Response(JSON.stringify({ success: true, user }), {
      status: 200,
      headers: cors
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ 
      success: false, 
      error: err?.message || "Failed to create account" 
    }), {
      status: 200,
      headers: cors
    });
  }
});
