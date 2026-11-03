import { createClient } from "npm:@supabase/supabase-js@2";

export const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS"
};

export const BREVO_API_KEY = Deno.env.get("BREVO_API_KEY") || "";
export const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
export const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

// Initialize Supabase Admin client using service role key
export let supabaseAdmin: any = null;
if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
  try {
    supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
  } catch (err) {
    console.warn("Could not initialize Supabase Admin client in send-email:", err);
  }
}

export const DEFAULT_SENDER = { name: "Rentivo", email: "info@rentivos.com.ng" };
export const LOGO_URL = "https://uovlgngsmvjcgkgznyme.supabase.co/storage/v1/object/public/assets/rentivo-logo.svg";
export const DEFAULT_PHOTO = "https://ik.imagekit.io/3unwhixxd/Property%20type.png";

export function formatNaira(amount: number | string): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(num)) return "0";
  return num.toLocaleString("en-NG");
}

export function emailHead(title: string, preheader: string): string {
  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<title>${title} — Rentivo</title>
<!--[if mso]>
<noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript>
<![endif]-->
<style>
  body,table,td,a{ -webkit-text-size-adjust:100%; -ms-text-size-adjust:100%; }
  table,td{ mso-table-lspace:0pt; mso-table-rspace:0pt; }
  img{ -ms-interpolation-mode:bicubic; border:0; outline:none; text-decoration:none; }
  body{ margin:0; padding:0; width:100% !important; height:100% !important; background:#f2f0fa; }
  a{ color:#6d35c9; }
  @media only screen and (max-width:600px){
    .container{ width:100% !important; }
    .stack{ display:block !important; width:100% !important; }
    .px{ padding-left:20px !important; padding-right:20px !important; }
    .h1{ font-size:21px !important; }
    .prop-photo{ width:100% !important; height:auto !important; display:block !important; margin-bottom:14px !important; }
    .prop-text-cell{ display:block !important; width:100% !important; padding-left:0 !important; }
    .price-cell{ display:block !important; width:100% !important; text-align:left !important; padding-top:12px !important; }
    .two-col{ display:block !important; width:100% !important; }
    .two-col + .two-col{ margin-top:16px !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background:#f2f0fa;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;font-size:1px;line-height:1px;color:#f2f0fa;">${preheader}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f2f0fa;">
<tr><td align="center" style="padding:32px 16px;">
<table role="presentation" class="container" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;background:#ffffff;border-radius:16px;overflow:hidden;">
<tr><td style="background:#000052;padding:22px 32px;" class="px">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
    <td align="left" valign="middle">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td style="padding-right:10px;vertical-align:middle;">
            <img src="${LOGO_URL}" alt="Rentivo Logo" width="28" height="28" style="display:block;border:0;outline:none;border-radius:6px;" />
          </td>
          <td valign="middle" style="font-family:'Outfit',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:19px;font-weight:700;color:#ffffff;letter-spacing:-0.01em;">
            RENT<span style="color:#be89ff;">ivo</span>
          </td>
        </tr>
      </table>
    </td>
    <td align="right" valign="middle" style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:12px;color:#c9c3e8;">Ibadan pilot</td>
  </tr></table>
</td></tr>`;
}

export function emailFoot(footerNote: string): string {
  return `<tr><td style="padding:24px 32px 32px;border-top:1px solid #e6e2f4;background:#f7f5fc;" class="px">
  <p style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:13px;color:#55557a;">Questions about this? Just reply to this email — a real person reads every message.</p>
  <p style="margin:8px 0 0;font-size:12px;line-height:1.6;color:#8583a8;">${footerNote}</p>
  <p style="margin:16px 0 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:11px;color:#8583a8;">Rentivo &middot; Ibadan, Nigeria &middot; This is a transactional email related to your account activity.</p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

