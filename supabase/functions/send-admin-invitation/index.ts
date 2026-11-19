import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};
const jsonHeaders = { ...cors, "Content-Type": "application/json" };

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: jsonHeaders });
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[character] || character);
}

Deno.serve(async req => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return jsonResponse({ success: false, error: "Method not allowed." }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const brevoApiKey = Deno.env.get("BREVO_API_KEY")?.trim();
  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse({ success: false, delivered: false, error: "Supabase admin service is not configured." }, 503);
  }
  if (!brevoApiKey) {
    return jsonResponse({ success: false, delivered: false, error: "BREVO_API_KEY is not configured in Supabase Edge Function secrets." }, 503);
  }

  const accessToken = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
  if (!accessToken) return jsonResponse({ success: false, delivered: false, error: "Sign in as an administrator to send invitations." }, 401);

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
  const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(accessToken);
  if (authError || !authData.user) {
    return jsonResponse({ success: false, delivered: false, error: "Your administrator session is invalid or expired." }, 401);
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from("users")
    .select("role, is_active")
    .eq("id", authData.user.id)
    .maybeSingle();
  if (profileError) {
    console.error("Could not verify admin invitation sender:", profileError.message);
    return jsonResponse({ success: false, delivered: false, error: "Could not verify administrator access." }, 500);
  }
  if (!profile || profile.role !== "admin" || !profile.is_active) {
    return jsonResponse({ success: false, delivered: false, error: "Only active administrators can send team invitations." }, 403);
  }

  let payload: {
    recipientEmail?: string;
    recipientName?: string;
    invitedByName?: string;
    role?: string;
    inviteUrl?: string;
    notes?: string;
    expiresInDays?: number;
  };
  try {
    payload = await req.json();
  } catch {
    return jsonResponse({ success: false, delivered: false, error: "Invalid request body." }, 400);
  }

  const recipientEmail = payload.recipientEmail?.trim().toLowerCase();
  const recipientName = payload.recipientName?.trim();
  if (!recipientEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipientEmail)) {
    return jsonResponse({ success: false, delivered: false, error: "A valid recipient email is required." }, 400);
  }
  if (!recipientName || !payload.inviteUrl) {
    return jsonResponse({ success: false, delivered: false, error: "Recipient name and invitation URL are required." }, 400);
  }

  let inviteUrl: URL;
  try {
    inviteUrl = new URL(payload.inviteUrl);
  } catch {
    return jsonResponse({ success: false, delivered: false, error: "Invitation URL is invalid." }, 400);
  }
  if (inviteUrl.protocol !== "https:" && inviteUrl.protocol !== "http:") {
    return jsonResponse({ success: false, delivered: false, error: "Invitation URL must use HTTP or HTTPS." }, 400);
  }

  const escape = (value: string | undefined) => escapeHtml(value || "");
  const invitedByName = payload.invitedByName?.trim() || "Rentivo Operations";
  const role = payload.role === "super_admin"
    ? "Super Administrator"
    : payload.role === "auditor"
      ? "Field Verification Auditor"
      : "Operations Administrator";
  const notes = payload.notes?.trim();
  const expiresInDays = Number.isFinite(payload.expiresInDays) ? payload.expiresInDays : 7;
  const subject = "Invitation to join Rentivo Administration Team — Rentivo";
  const htmlContent = `<!doctype html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:32px 16px;background:#f2f0fa;font-family:Arial,sans-serif;color:#16163a">
<main style="max-width:560px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden">
<header style="padding:22px 32px;background:#000052;color:#fff;font-size:20px;font-weight:700">RENT<span style="color:#be89ff">ivo</span></header>
<section style="padding:32px">
<p style="color:#5b21b6;font-size:12px;font-weight:700;text-transform:uppercase">Admin team invitation</p>
<h1 style="font-size:24px">Welcome to the team, ${escape(recipientName)}</h1>
<p><strong>${escape(invitedByName)}</strong> invited you to join the Rentivo administration team as an <strong>${role}</strong>.</p>
${notes ? `<p style="padding:14px;background:#f7f5fc;border-left:3px solid #be89ff">${escape(notes)}</p>` : ""}
<p style="text-align:center;margin:28px 0"><a href="${escape(inviteUrl.href)}" style="display:inline-block;padding:15px 28px;border-radius:10px;background:#000052;color:#fff;text-decoration:none;font-weight:700">Accept Invitation &amp; Set Up Account</a></p>
<p style="font-size:13px;color:#666">This invitation expires in ${expiresInDays} days. If the button does not work, copy this link into your browser:</p>
<p style="font-size:12px;word-break:break-all"><a href="${escape(inviteUrl.href)}">${escape(inviteUrl.href)}</a></p>
</section></main></body></html>`;

  let brevoResponse: Response;
  try {
    brevoResponse = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": brevoApiKey,
        "Content-Type": "application/json",
        "accept": "application/json"
      },
      body: JSON.stringify({
        sender: { name: "Rentivo", email: "info@rentivos.com.ng" },
        to: [{ email: recipientEmail, name: recipientName }],
        subject,
        htmlContent
      })
    });
  } catch (error) {
    console.error("Brevo invitation request failed:", error);
    return jsonResponse({ success: false, delivered: false, error: "Could not connect to Brevo to send the invitation." }, 502);
  }

  const brevoResult = await brevoResponse.json().catch(() => ({}));
  if (!brevoResponse.ok) {
    const providerMessage = typeof brevoResult?.message === "string" ? brevoResult.message : "Brevo rejected the message.";
    const providerCode = typeof brevoResult?.code === "string" ? brevoResult.code : brevoResponse.status;
    console.warn("Brevo rejected admin invitation:", providerCode, providerMessage);
    return jsonResponse({
      success: false,
      delivered: false,
      error: `Brevo rejected the invitation (${providerCode}): ${providerMessage}`
    }, 502);
  }

  return jsonResponse({
    success: true,
    delivered: true,
    provider: "brevo",
    messageId: brevoResult?.messageId
  });
});
