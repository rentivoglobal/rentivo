import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS"
};

const BREVO_API_KEY = Deno.env.get("BREVO_API_KEY") || "";
const DEFAULT_SENDER = { name: "Rentivo", email: "info@rentivos.com.ng" };
const LOGO_URL = "https://uovlgngsmvjcgkgznyme.supabase.co/storage/v1/object/public/assets/rentivo-logo.svg";
const DEFAULT_PHOTO = "https://ik.imagekit.io/3unwhixxd/Property%20type.png";

function formatNaira(amount: number | string): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(num)) return "0";
  return num.toLocaleString("en-NG");
}

function emailHead(title: string, preheader: string): string {
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

function emailFoot(footerNote: string): string {
  return `<tr><td style="padding:24px 32px 32px;border-top:1px solid #e6e2f4;background:#f7f5fc;" class="px">
  <p style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:13px;color:#55557a;">Questions about this? Just reply to this email — a real person reads every message.</p>
  <p style="margin:8px 0 0;font-size:12px;line-height:1.6;color:#8583a8;">${footerNote}</p>
  <p style="margin:16px 0 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:11px;color:#8583a8;">Rentivo &middot; Ibadan, Nigeria &middot; This is a transactional notification.</p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

function generateLandlordVacancyCheckEmailHtml(params: {
  recipientName: string;
  renterName: string;
  propertyTitle: string;
  propertyArea: string;
  propertyPrice: number | string;
  propertyType: string;
  propertyPhoto?: string;
  yesLink: string;
  noLink: string;
  referenceId?: string;
}): string {
  const {
    recipientName,
    renterName,
    propertyTitle,
    propertyArea,
    propertyPrice,
    propertyType,
    propertyPhoto,
    yesLink,
    noLink,
    referenceId = "RQ-20604"
  } = params;
  const priceFormatted = formatNaira(propertyPrice);
  const photo = propertyPhoto || DEFAULT_PHOTO;

  return `${emailHead(
    `Action Required: Is "${propertyTitle}" still available?`,
    `A verified renter requested access for ${propertyTitle}. Please confirm if it's still available with 1 click.`
  )}
<tr><td style="padding:32px 32px 20px;" class="px">
<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
    <td style="background:#efe6ff;color:#5b28b0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:13px;font-weight:700;padding:7px 16px;border-radius:20px;">
      <span style="letter-spacing:0.02em;">Action Required &middot; Vacancy Check</span>
    </td></tr></table>
<h1 class="h1" style="margin:16px 0 8px;font-family:'Outfit',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:24px;line-height:1.25;font-weight:700;color:#16163a;letter-spacing:-0.01em;">Is this property still available?</h1>
<p style="margin:0 0 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:#55557a;">Hello ${recipientName || 'Property Owner'},<br><br><strong>${renterName}</strong> submitted an access request for this listing. Please confirm if the property is still vacant and available for inspection.</p>
</td></tr><tr><td style="padding:0 32px 24px;" class="px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #e6e2f4;border-radius:12px;">
    <tr>
      <td style="padding:16px;" class="px">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
          <td width="104" valign="top" class="stack">
            <img src="${photo}" width="104" height="78" class="prop-photo" style="border-radius:8px;display:block;width:104px;height:78px;object-fit:cover;" alt="Property Photo" onerror="this.src='${DEFAULT_PHOTO}';">
          </td>
          <td width="16" style="font-size:0;line-height:0;">&nbsp;</td>
          <td valign="top" class="stack prop-text-cell">
            <p style="margin:0 0 2px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:11px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;color:#8583a8;">${propertyArea}, Ibadan</p>
            <p style="margin:0 0 4px;font-family:'Outfit',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:16px;font-weight:700;color:#16163a;">${propertyTitle}</p>
            <p style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:13px;color:#55557a;">${propertyType} &middot; Verified listing</p>
          </td>
          <td width="110" valign="top" align="right" class="stack price-cell">
            <p style="margin:0;font-family:'Outfit',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:16px;font-weight:700;color:#16163a;white-space:nowrap;">₦${priceFormatted}</p>
            <p style="margin:2px 0 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:12px;color:#55557a;">per year</p>
          </td>
        </tr></table>
      </td>
    </tr>
  </table></td></tr><tr><td style="padding:0 32px 28px;" class="px">
<p style="margin:0 0 12px;font-family:'Outfit',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:14px;font-weight:700;color:#16163a;">Please select one of the options below:</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
  <tr>
    <td style="padding-bottom:12px;">
      <a href="${yesLink}" style="display:block;background-color:#16794A;color:#FFFFFF;text-decoration:none;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-weight:700;font-size:15px;padding:15px 24px;border-radius:10px;text-align:center;box-shadow:0 2px 8px rgba(22,121,74,0.25);">
        &#10003;&nbsp;&nbsp;YES, IT'S STILL AVAILABLE
      </a>
    </td>
  </tr>
  <tr>
    <td>
      <a href="${noLink}" style="display:block;background-color:#ffffff;color:#55557a;text-decoration:none;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-weight:600;font-size:14px;padding:12px 24px;border-radius:10px;text-align:center;border:1px solid #e6e2f4;">
        &#10005;&nbsp;&nbsp;NO, ALREADY TAKEN
      </a>
    </td>
  </tr>
</table>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f7f5fc;border-radius:12px;margin-top:20px;">
  <tr>
    <td style="padding:16px 20px;" class="px">
      <p style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:13px;line-height:1.55;color:#55557a;">
        <strong>No login required.</strong> Clicking either button directly updates the request in real-time. If you confirm it is available, the renter will be prompted to pay the flat access fee to unlock your contact details and schedule a physical inspection.
      </p>
    </td>
  </tr>
</table>

<p style="margin:16px 0 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:12px;color:#8583a8;text-align:center;">Request Reference: ${referenceId}</p>
</td></tr>
${emailFoot("You're receiving this because you listed this property on Rentivo.")}`;
}

function generateRenterAcknowledgmentEmailHtml(params: {
  recipientName: string;
  propertyTitle: string;
  propertyArea: string;
  propertyPrice: number | string;
  propertyType: string;
  propertyPhoto?: string;
  trackUrl: string;
  referenceId?: string;
}): string {
  const { propertyTitle, propertyArea, propertyPrice, propertyType, propertyPhoto, trackUrl, referenceId = "RQ-20604" } = params;
  const priceFormatted = formatNaira(propertyPrice);
  const photo = propertyPhoto || DEFAULT_PHOTO;

  return `${emailHead(
    `We're checking: ${propertyTitle}`,
    `Got it — we're contacting the landlord to verify this one's still vacant. No charge unless it's confirmed available.`
  )}
<tr><td style="padding:32px 32px 20px;" class="px">
<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
    <td style="background:#efe6ff;color:#5b28b0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:13px;font-weight:700;padding:7px 16px;border-radius:20px;">
      <span style="letter-spacing:0.02em;">Request Received &middot; In Progress</span>
    </td></tr></table>
<h1 class="h1" style="margin:16px 0 8px;font-family:'Outfit',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:24px;line-height:1.25;font-weight:700;color:#16163a;letter-spacing:-0.01em;">We&rsquo;re checking on this one for you</h1>
<p style="margin:0 0 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:#55557a;">Thanks for your interest &mdash; we&rsquo;ve reached out to the landlord to verify this property is still vacant. You&rsquo;ll hear from us as soon as we know.</p>
</td></tr><tr><td style="padding:0 32px 24px;" class="px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #e6e2f4;border-radius:12px;">
    <tr>
      <td style="padding:16px;" class="px">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
          <td width="104" valign="top" class="stack">
            <img src="${photo}" width="104" height="78" class="prop-photo" style="border-radius:8px;display:block;width:104px;height:78px;object-fit:cover;" alt="Property Photo" onerror="this.src='${DEFAULT_PHOTO}';">
          </td>
          <td width="16" style="font-size:0;line-height:0;">&nbsp;</td>
          <td valign="top" class="stack prop-text-cell">
            <p style="margin:0 0 2px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:11px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;color:#8583a8;">${propertyArea}, Ibadan</p>
            <p style="margin:0 0 4px;font-family:'Outfit',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:16px;font-weight:700;color:#16163a;">${propertyTitle}</p>
            <p style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:13px;color:#55557a;">${propertyType} &middot; Verified listing</p>
          </td>
          <td width="110" valign="top" align="right" class="stack price-cell">
            <p style="margin:0;font-family:'Outfit',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:16px;font-weight:700;color:#16163a;white-space:nowrap;">₦${priceFormatted}</p>
            <p style="margin:2px 0 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:12px;color:#55557a;">per year</p>
          </td>
        </tr></table>
      </td>
    </tr>
  </table></td></tr><tr><td style="padding:0 32px 28px;" class="px">
<p style="margin:0 0 12px;font-family:'Outfit',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:14px;font-weight:700;color:#16163a;">What happens next:</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f7f5fc;border-radius:12px;">
  <tr><td style="padding:16px 20px;" class="px">
    <p style="margin:0 0 8px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:13px;line-height:1.55;color:#55557a;">
      <strong>1. We contact the landlord:</strong> We verify the property hasn't been taken off the market.
    </p>
    <p style="margin:0 0 8px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:13px;line-height:1.55;color:#55557a;">
      <strong>2. You get an email notification:</strong> The moment they confirm, you'll receive a notification.
    </p>
    <p style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:13px;line-height:1.55;color:#55557a;">
      <strong>3. Unlock contact &amp; inspect:</strong> Pay the flat ₦5,000 access fee to unlock the landlord's direct phone number, WhatsApp, and exact location.
    </p>
  </td></tr>
</table>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:20px;"><tr><td align="center">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
    <td style="border-radius:10px;background:#000052;">
      <a href="${trackUrl}" style="display:inline-block;padding:14px 28px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:10px;">Track Request in My Requests &rarr;</a>
    </td></tr></table>
</td></tr></table>
<p style="margin:14px 0 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:12px;color:#8583a8;text-align:center;">Reference: ${referenceId} &middot; Zero fee is charged until vacancy is confirmed</p>
</td></tr>
${emailFoot("You're receiving this because you requested access to this listing on Rentivo.")}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get("Authorization") || "";
    const jwt = authHeader.replace("Bearer ", "");
    const { data: userData } = await supabase.auth.getUser(jwt);
    if (!userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { 
        status: 401, 
        headers: { ...cors, "Content-Type": "application/json" } 
      });
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
      return new Response(JSON.stringify({ error: error.message }), { 
        status: 400, 
        headers: { ...cors, "Content-Type": "application/json" } 
      });
    }

    const appUrl = Deno.env.get("APP_URL") || "https://rentivos.com.ng";
    const { data: listing } = await supabase
      .from("listings")
      .select("id, title, owner_user_id, price_amount, areas(name), property_types(name), listing_photos(url)")
      .eq("id", body.listingId)
      .maybeSingle();

    const { data: owner } = listing?.owner_user_id 
      ? await supabase.from("users").select("email, full_name").eq("id", listing.owner_user_id).maybeSingle() 
      : { data: null };

    const propertyTitle = listing?.title || "your listing";
    const propertyArea = (listing as any)?.areas?.name || "Bodija";
    const propertyType = (listing as any)?.property_types?.name || "Residential";
    const propertyPrice = listing?.price_amount || 0;
    const propertyPhoto = (listing as any)?.listing_photos?.[0]?.url || DEFAULT_PHOTO;
    const renterName = body.renterName || "A verified renter";
    const referenceId = data?.id ? `RQ-${data.id.slice(0, 5).toUpperCase()}` : "RQ-20604";

    // 1. Send vacancy confirmation email to landlord via Brevo
    if (BREVO_API_KEY && owner?.email) {
      try {
        const yesLink = `${appUrl}/availability/action?token=${token}&decision=yes`;
        const noLink = `${appUrl}/availability/action?token=${token}&decision=no`;

        const landlordHtml = generateLandlordVacancyCheckEmailHtml({
          recipientName: owner.full_name || "Property Owner",
          renterName,
          propertyTitle,
          propertyArea,
          propertyPrice,
          propertyType,
          propertyPhoto,
          yesLink,
          noLink,
          referenceId
        });

        await fetch("https://api.brevo.com/v3/smtp/email", {
          method: "POST",
          headers: {
            "api-key": BREVO_API_KEY,
            "Content-Type": "application/json",
            "accept": "application/json"
          },
          body: JSON.stringify({
            sender: DEFAULT_SENDER,
            to: [{ email: owner.email, name: owner.full_name || "Property Owner" }],
            subject: `Action Required: Is "${propertyTitle}" still available? — Rentivo`,
            htmlContent: landlordHtml
          })
        });
      } catch (emailErr) {
        console.error("Landlord vacancy email failed:", emailErr);
      }
    }

    // 2. Send acknowledgment email to renter via Brevo
    if (BREVO_API_KEY && body.renterEmail) {
      try {
        const renterHtml = generateRenterAcknowledgmentEmailHtml({
          recipientName: body.renterName || "Rentivo Member",
          propertyTitle,
          propertyArea,
          propertyPrice,
          propertyType,
          propertyPhoto,
          trackUrl: `${appUrl}/account/requests`,
          referenceId
        });

        await fetch("https://api.brevo.com/v3/smtp/email", {
          method: "POST",
          headers: {
            "api-key": BREVO_API_KEY,
            "Content-Type": "application/json",
            "accept": "application/json"
          },
          body: JSON.stringify({
            sender: DEFAULT_SENDER,
            to: [{ email: body.renterEmail, name: body.renterName || "Rentivo Member" }],
            subject: `We're checking on this one for you: "${propertyTitle}" — Rentivo`,
            htmlContent: renterHtml
          })
        });
      } catch (renterEmailErr) {
        console.error("Renter acknowledgment email failed:", renterEmailErr);
      }
    }

    return new Response(JSON.stringify({ request: data, tokenPreview: token }), {
      headers: { ...cors, "Content-Type": "application/json" }
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err?.message || "Internal error" }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" }
    });
  }
});
