const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

const escapeHtml = (value: unknown) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return new Response("method not allowed", { status: 405, headers: cors });

  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (!serviceRoleKey) {
    return new Response(JSON.stringify({ success: false, error: "Email service is not configured" }), {
      status: 503,
      headers: { ...cors, "Content-Type": "application/json" }
    });
  }
  if (req.headers.get("Authorization") !== `Bearer ${serviceRoleKey}`) {
    return new Response(JSON.stringify({ success: false, error: "Internal service authorization required" }), {
      status: 403,
      headers: { ...cors, "Content-Type": "application/json" }
    });
  }

  try {
    const body = await req.json();
    const recipientEmail = String(body.recipientEmail || "").trim();
    const recipientName = String(body.recipientName || "Rentivo Member").trim();
    const data = body.data || {};
    if (!recipientEmail || !data.planName) {
      return new Response(JSON.stringify({ success: false, error: "Missing recipient or plan" }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" }
      });
    }

    const monthlyAmount = Number(data.monthlyAmount || 0).toLocaleString("en-NG");
    const dashboardUrl = String(data.dashboardUrl || "https://rentivos.com.ng/account/subscription");
    const html = `<!doctype html>
<html><body style="margin:0;background:#f2f0fa;padding:32px 16px;font-family:Arial,sans-serif;color:#202040">
<div style="max-width:600px;margin:auto;background:#fff;border-radius:16px;overflow:hidden">
<div style="background:#000052;padding:24px 32px;color:#fff;font-size:22px;font-weight:700">RENT<span style="color:#be89ff">ivo</span></div>
<div style="padding:32px">
<p>Hi ${escapeHtml(recipientName)},</p>
<h1 style="font-size:26px;color:#000052">Welcome to your subscription!</h1>
<p>Your <strong>${escapeHtml(data.planName)}</strong> plan is active. You now have access to the subscription benefits available for your ${escapeHtml(data.audience)} account.</p>
<div style="background:#f7f5fc;border-radius:12px;padding:20px;margin:24px 0">
<p style="margin:0 0 8px"><strong>Plan:</strong> ${escapeHtml(data.planName)}</p>
<p style="margin:0"><strong>Monthly fee:</strong> ₦${escapeHtml(monthlyAmount)}</p>
</div>
<a href="${escapeHtml(dashboardUrl)}" style="display:inline-block;background:#6d35c9;color:#fff;text-decoration:none;padding:14px 22px;border-radius:8px;font-weight:700">Open your subscription</a>
<p style="margin-top:28px">Thanks for choosing Rentivo. We are here to help you find or manage your next place with confidence.</p>
</div>
<div style="padding:20px 32px;background:#f7f5fc;color:#666;font-size:12px">Rentivo · Ibadan, Nigeria · This is a transactional email related to your account activity.</div>
</div></body></html>`;

    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "accept": "application/json",
        "api-key": Deno.env.get("BREVO_API_KEY") || "",
        "content-type": "application/json"
      },
      body: JSON.stringify({
        sender: { name: "Rentivo", email: "info@rentivos.com.ng" },
        to: [{ email: recipientEmail, name: recipientName }],
        subject: `Welcome to your ${data.planName} subscription`,
        htmlContent: html
      })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("Brevo welcome email failed:", error);
      return new Response(JSON.stringify({ success: false, error: "Email provider rejected the message" }), {
        status: 502,
        headers: { ...cors, "Content-Type": "application/json" }
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...cors, "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error("Welcome email error:", error);
    return new Response(JSON.stringify({ success: false, error: "Invalid email request" }), {
      status: 400,
      headers: { ...cors, "Content-Type": "application/json" }
    });
  }
});
