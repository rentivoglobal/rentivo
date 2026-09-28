import { AccessRequest, Listing, ListerContact } from '../types';
import { APP_URL, isLiveBackend } from '../lib/config';
import { supabase } from '../lib/supabase';

const BREVO_API_KEY = (import.meta as any).env?.VITE_BREVO_API_KEY || '';
const DEFAULT_SENDER = { name: 'Rentivo', email: 'info@rentivos.com.ng' };
const LOGO_URL = 'https://uovlgngsmvjcgkgznyme.supabase.co/storage/v1/object/public/assets/rentivo-logo.svg';
const DEFAULT_PHOTO = 'https://ik.imagekit.io/3unwhixxd/Property%20type.png';

function formatNaira(amount: number | string): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return '0';
  return num.toLocaleString('en-NG');
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

function emailFoot(footerNote: string): string {
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

export function generateLandlordVacancyCheckHtml(p: {
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
  const priceFormatted = formatNaira(p.propertyPrice);
  const photo = p.propertyPhoto || DEFAULT_PHOTO;
  const ref = p.referenceId || "RQ-20604";

  return `${emailHead(
    `Action Required: Is "${p.propertyTitle}" still available?`,
    `A verified renter requested access for ${p.propertyTitle}. Please confirm if it's still available with 1 click.`
  )}
<tr><td style="padding:32px 32px 20px;" class="px">
<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
    <td style="background:#efe6ff;color:#5b28b0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:13px;font-weight:700;padding:7px 16px;border-radius:20px;">
      <span style="letter-spacing:0.02em;">Action Required &middot; Vacancy Check</span>
    </td></tr></table>
<h1 class="h1" style="margin:16px 0 8px;font-family:'Outfit',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:24px;line-height:1.25;font-weight:700;color:#16163a;letter-spacing:-0.01em;">Is this property still available?</h1>
<p style="margin:0 0 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:#55557a;">Hello ${p.recipientName || 'Property Owner'},<br><br><strong>${p.renterName}</strong> submitted an access request for this listing. Please confirm if the property is still vacant and available for inspection.</p>
</td></tr><tr><td style="padding:0 32px 24px;" class="px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #e6e2f4;border-radius:12px;">
    <tr>
      <td style="padding:16px;" class="px">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
          <td width="104" valign="top" class="stack">
            <img src="${photo}" width="104" height="78" class="prop-photo" style="border-radius:8px;display:block;width:104px;height:78px;object-fit:cover;" alt="Property Photo" onerror="this.src='${DEFAULT_PHOTO}';">
          </td>
          <td width="16" style="font-size:0;line-height:0;">&nbsp;</td>
          <td valign="top" class="stack prop-text-cell">
            <p style="margin:0 0 2px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:11px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;color:#8583a8;">${p.propertyArea}, Ibadan</p>
            <p style="margin:0 0 4px;font-family:'Outfit',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:16px;font-weight:700;color:#16163a;">${p.propertyTitle}</p>
            <p style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:13px;color:#55557a;">${p.propertyType} &middot; Verified listing</p>
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
      <a href="${p.yesLink}" style="display:block;background-color:#16794A;color:#FFFFFF;text-decoration:none;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-weight:700;font-size:15px;padding:15px 24px;border-radius:10px;text-align:center;box-shadow:0 2px 8px rgba(22,121,74,0.25);">
        &#10003;&nbsp;&nbsp;YES, IT'S STILL AVAILABLE
      </a>
    </td>
  </tr>
  <tr>
    <td>
      <a href="${p.noLink}" style="display:block;background-color:#ffffff;color:#55557a;text-decoration:none;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-weight:600;font-size:14px;padding:12px 24px;border-radius:10px;text-align:center;border:1px solid #e6e2f4;">
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

<p style="margin:16px 0 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:12px;color:#8583a8;text-align:center;">Request Reference: ${ref}</p>
</td></tr>
${emailFoot("You're receiving this because you listed this property on Rentivo.")}`;
}

export function generateAvailabilityHtml(p: {
  recipientName: string;
  propertyTitle: string;
  propertyArea: string;
  propertyPrice: number | string;
  propertyType: string;
  propertyPhoto?: string;
  requestUrl: string;
  referenceId?: string;
}): string {
  const priceFormatted = formatNaira(p.propertyPrice);
  const photo = p.propertyPhoto || DEFAULT_PHOTO;
  const ref = p.referenceId || "RQ-20604";

  return `${emailHead(
    `Available: ${p.propertyTitle}`,
    `It's still available — the landlord just confirmed. Unlock their contact for a flat access fee, fully refundable.`
  )}
<tr><td style="padding:32px 32px 20px;" class="px">
<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
    <td style="background:#e3f4ec;color:#17794e;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:13px;font-weight:700;padding:7px 16px;border-radius:20px;">
      <span style="letter-spacing:0.02em;">&#10003; Confirmed available</span>
    </td></tr></table>
<h1 class="h1" style="margin:16px 0 8px;font-family:'Outfit',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:24px;line-height:1.25;font-weight:700;color:#16163a;letter-spacing:-0.01em;">Good news — it&rsquo;s still available!</h1>
<p style="margin:0 0 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:#55557a;">The landlord just confirmed this property hasn&rsquo;t been taken. It&rsquo;s reserved for your review for the next little while, so it&rsquo;s worth acting on soon.</p>
</td></tr><tr><td style="padding:0 32px 24px;" class="px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #e6e2f4;border-radius:12px;">
    <tr>
      <td style="padding:16px;" class="px">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
          <td width="104" valign="top" class="stack">
            <img src="${photo}" width="104" height="78" class="prop-photo" style="border-radius:8px;display:block;width:104px;height:78px;object-fit:cover;" alt="Property Photo" onerror="this.src='${DEFAULT_PHOTO}';">
          </td>
          <td width="16" style="font-size:0;line-height:0;">&nbsp;</td>
          <td valign="top" class="stack prop-text-cell">
            <p style="margin:0 0 2px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:11px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;color:#8583a8;">${p.propertyArea}, Ibadan</p>
            <p style="margin:0 0 4px;font-family:'Outfit',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:16px;font-weight:700;color:#16163a;">${p.propertyTitle}</p>
            <p style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:13px;color:#55557a;">${p.propertyType} &middot; Verified listing</p>
          </td>
          <td width="110" valign="top" align="right" class="stack price-cell">
            <p style="margin:0;font-family:'Outfit',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:16px;font-weight:700;color:#16163a;white-space:nowrap;">₦${priceFormatted}</p>
            <p style="margin:2px 0 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:12px;color:#55557a;">per year</p>
          </td>
        </tr></table>
      </td>
    </tr>
  </table></td></tr><tr><td style="padding:0 32px 20px;" class="px">
<p style="margin:0 0 10px;font-family:'Outfit',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:14px;font-weight:700;color:#16163a;">To unlock the landlord&rsquo;s contact details</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f7f5fc;border-radius:12px;"><tr><td style="padding:18px 20px;" class="px">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr>
    <td style="padding:11px 0;border-bottom:1px solid #e6e2f4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:13.5px;color:#55557a;">Access fee (one-time, flat rate)</td>
    <td align="right" style="padding:11px 0;border-bottom:1px solid #e6e2f4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:13.5px;font-weight:600;color:#16163a;">₦5,000</td>
  </tr>
    <tr>
    <td style="padding:11px 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:13.5px;color:#55557a;">What it unlocks</td>
    <td align="right" style="padding:11px 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:13.5px;font-weight:600;color:#16163a;">Phone number, WhatsApp, exact address</td>
  </tr>
  </table>
</td></tr></table>
</td></tr><tr><td style="padding:0 32px 28px;" class="px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#e3f4ec;border-radius:12px;"><tr>
    <td style="padding:16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:13.5px;line-height:1.6;color:#16163a;" class="px">
      <span style="color:#17794e;font-weight:700;">&#10003;&nbsp;&nbsp;</span><strong style="color:#17794e;">100% refund guarantee:</strong> if you get there and it&rsquo;s already gone, or the landlord goes quiet, we refund the full access fee &mdash; no questions asked.
    </td></tr></table></td></tr><tr><td style="padding:0 32px 32px;" class="px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td align="center">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
    <td style="border-radius:10px;background:#000052;">
      <a href="${p.requestUrl}" style="display:inline-block;padding:15px 30px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:10px;">View Request &amp; Unlock Contact &rarr;</a>
    </td></tr></table>
</td></tr></table>
<p style="margin:14px 0 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:12.5px;color:#8583a8;text-align:center;">Reference ${ref} &middot; This offer to pay is only shown to you</p>
</td></tr>
${emailFoot("You're receiving this because you requested availability on this listing on Rentivo.")}`;
}

export function generatePaymentSuccessHtml(p: {
  recipientName: string;
  propertyTitle: string;
  propertyArea: string;
  propertyPrice: number | string;
  propertyType: string;
  propertyPhoto?: string;
  requestUrl: string;
  landlordName: string;
  landlordPhone: string;
  landlordWhatsapp?: string;
  agencyName?: string;
  exactAddress?: string;
  paymentReference: string;
}): string {
  const cleanPhone = p.landlordPhone.replace(/\s+/g, '');
  const cleanWa = (p.landlordWhatsapp || p.landlordPhone).replace(/\D/g, '');

  return `${emailHead(
    `Contact Unlocked: ${p.propertyTitle}`,
    `Payment received — here's the landlord's phone number, WhatsApp, and exact address, plus a 3-step prep checklist.`
  )}
<tr><td style="padding:32px 32px 20px;" class="px">
<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
    <td style="background:#e3f4ec;color:#17794e;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:13px;font-weight:700;padding:7px 16px;border-radius:20px;">
      <span style="letter-spacing:0.02em;">&#10003; Payment confirmed</span>
    </td></tr></table>
<h1 class="h1" style="margin:16px 0 8px;font-family:'Outfit',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:24px;line-height:1.25;font-weight:700;color:#16163a;letter-spacing:-0.01em;">You&rsquo;re in &mdash; contact unlocked</h1>
<p style="margin:0 0 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:#55557a;">Your access fee went through and the landlord&rsquo;s direct contact details are below. Reach out and arrange your walkthrough whenever suits you both.</p>
</td></tr><tr><td style="padding:0 32px 24px;" class="px">
<p style="margin:0 0 10px;font-family:'Outfit',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:14px;font-weight:700;color:#16163a;">Receipt</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #e6e2f4;border-radius:12px;"><tr><td style="padding:18px 20px;" class="px">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr>
    <td style="padding:11px 0;border-bottom:1px solid #e6e2f4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:13.5px;color:#55557a;">Amount paid</td>
    <td align="right" style="padding:11px 0;border-bottom:1px solid #e6e2f4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:13.5px;font-weight:600;color:#16163a;">₦5,000</td>
  </tr>
    <tr>
    <td style="padding:11px 0;border-bottom:1px solid #e6e2f4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:13.5px;color:#55557a;">Paystack reference</td>
    <td align="right" style="padding:11px 0;border-bottom:1px solid #e6e2f4;font-family:'SFMono-Regular',Consolas,monospace;font-size:13.5px;font-weight:600;color:#16163a;">${p.paymentReference}</td>
  </tr>
    <tr>
    <td style="padding:11px 0;border-bottom:1px solid #e6e2f4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:13.5px;color:#55557a;">Property</td>
    <td align="right" style="padding:11px 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:13.5px;font-weight:600;color:#16163a;">${p.propertyTitle}, ${p.propertyArea}</td>
  </tr>
  </table>
</td></tr></table>
</td></tr><tr><td style="padding:0 32px 28px;" class="px">
<p style="margin:0 0 10px;font-family:'Outfit',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:14px;font-weight:700;color:#16163a;">Landlord contact</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#efe6ff;border-radius:12px;"><tr><td style="padding:18px 20px;" class="px">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr>
    <td style="padding:11px 0;border-bottom:1px solid #e6e2f4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:13.5px;color:#55557a;">Landlord</td>
    <td align="right" style="padding:11px 0;border-bottom:1px solid #e6e2f4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:13.5px;font-weight:600;color:#16163a;">${p.landlordName}</td>
  </tr>
    <tr>
    <td style="padding:11px 0;border-bottom:1px solid #e6e2f4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:13.5px;color:#55557a;">Phone</td>
    <td align="right" style="padding:11px 0;border-bottom:1px solid #e6e2f4;font-family:'SFMono-Regular',Consolas,monospace;font-size:13.5px;font-weight:600;color:#16163a;"><a href="tel:${cleanPhone}" style="color:#16163a;text-decoration:none;">${p.landlordPhone}</a></td>
  </tr>
    <tr>
    <td style="padding:11px 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:13.5px;color:#55557a;">Exact address</td>
    <td align="right" style="padding:11px 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:13.5px;font-weight:600;color:#16163a;">${p.exactAddress || `${p.propertyArea}, Ibadan`}</td>
  </tr>
  </table>
</td></tr></table>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:14px;"><tr>
  <td width="50%" class="two-col" style="padding-right:6px;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
    <td align="center" style="border-radius:10px;background:#1f9e56;">
      <a href="https://wa.me/${cleanWa}" style="display:inline-block;padding:15px 24px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:10px;">Message on WhatsApp</a>
    </td></tr></table>
  </td>
  <td width="50%" class="two-col" style="padding-left:6px;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
    <td align="center" style="border-radius:10px;background:#000052;">
      <a href="tel:${cleanPhone}" style="display:inline-block;padding:15px 24px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:10px;">Call Landlord</a>
    </td></tr></table>
  </td>
</tr></table>
</td></tr><tr><td style="padding:0 32px 24px;" class="px">
<p style="margin:0 0 12px;font-family:'Outfit',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:14px;font-weight:700;color:#16163a;">Before you go</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
    <td width="32" valign="top">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td width="26" height="26" align="center" valign="middle" style="background:#000052;border-radius:50%;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:12px;font-weight:700;color:#ffffff;">1</td></tr></table>
    </td>
    <td width="12"></td>
    <td valign="top" style="padding-bottom:18px;">
      <p style="margin:2px 0 2px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:14px;font-weight:700;color:#16163a;">Agree on a time</p>
      <p style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:13.5px;line-height:1.55;color:#55557a;">Message or call the landlord directly to confirm a walkthrough slot that works for both of you.</p>
    </td>
  </tr></table>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
    <td width="32" valign="top">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td width="26" height="26" align="center" valign="middle" style="background:#000052;border-radius:50%;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:12px;font-weight:700;color:#ffffff;">2</td></tr></table>
    </td>
    <td width="12"></td>
    <td valign="top" style="padding-bottom:18px;">
      <p style="margin:2px 0 2px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:14px;font-weight:700;color:#16163a;">Bring valid ID</p>
      <p style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:13.5px;line-height:1.55;color:#55557a;">Landlords in Ibadan generally expect this for a first viewing &mdash; a national ID or driver&rsquo;s licence is fine.</p>
    </td>
  </tr></table>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
    <td width="32" valign="top">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td width="26" height="26" align="center" valign="middle" style="background:#000052;border-radius:50%;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:12px;font-weight:700;color:#ffffff;">3</td></tr></table>
    </td>
    <td width="12"></td>
    <td valign="top" style="padding-bottom:0;">
      <p style="margin:2px 0 2px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:14px;font-weight:700;color:#16163a;">Inspect before you commit</p>
      <p style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:13.5px;line-height:1.55;color:#55557a;">Check the taps, sockets, and doors/locks in person. Don&rsquo;t send any rent or deposit before you&rsquo;ve seen the property.</p>
    </td>
  </tr></table>
</td></tr><tr><td style="padding:0 32px 32px;" class="px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#e3f4ec;border-radius:12px;"><tr>
    <td style="padding:16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:13.5px;line-height:1.6;color:#16163a;" class="px">
      <span style="color:#17794e;font-weight:700;">&#10003;&nbsp;&nbsp;</span><strong style="color:#17794e;">Still covered:</strong> if the landlord turns out to be unreachable or the unit was already taken, this fee is fully refunded within 24&ndash;48 hours.
    </td></tr></table></td></tr>
${emailFoot("This receipt is for your Rentivo access fee payment, processed securely via Paystack.")}`;
}

export function generateRefundProcessedHtml(p: {
  recipientName: string;
  propertyTitle: string;
  propertyArea: string;
  originalTransaction: string;
  refundReference: string;
  browseUrl?: string;
}): string {
  const browse = p.browseUrl || `${APP_URL}/search`;

  return `${emailHead(
    `Refund Approved: ₦5,000`,
    `Your ₦5,000 access fee has been refunded in full — funds arrive within 24–48 hours.`
  )}
<tr><td style="padding:32px 32px 20px;" class="px">
<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
    <td style="background:#e3f4ec;color:#17794e;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:13px;font-weight:700;padding:7px 16px;border-radius:20px;">
      <span style="letter-spacing:0.02em;">&#10003; Refund approved</span>
    </td></tr></table>
<h1 class="h1" style="margin:16px 0 8px;font-family:'Outfit',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:24px;line-height:1.25;font-weight:700;color:#16163a;letter-spacing:-0.01em;">Your ₦5,000 has been refunded</h1>
<p style="margin:0 0 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:#55557a;">We&rsquo;re sorry this one didn&rsquo;t work out &mdash; you shouldn&rsquo;t have to pay for a property that was already gone. Your full access fee is on its way back to you.</p>
</td></tr><tr><td style="padding:0 32px 24px;" class="px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #e6e2f4;border-radius:12px;"><tr><td style="padding:18px 20px;" class="px">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr>
    <td style="padding:11px 0;border-bottom:1px solid #e6e2f4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:13.5px;color:#55557a;">Amount refunded</td>
    <td align="right" style="padding:11px 0;border-bottom:1px solid #e6e2f4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:13.5px;font-weight:600;color:#17794e;">₦5,000</td>
  </tr>
    <tr>
    <td style="padding:11px 0;border-bottom:1px solid #e6e2f4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:13.5px;color:#55557a;">Original transaction</td>
    <td align="right" style="padding:11px 0;border-bottom:1px solid #e6e2f4;font-family:'SFMono-Regular',Consolas,monospace;font-size:13.5px;font-weight:600;color:#16163a;">${p.originalTransaction}</td>
  </tr>
    <tr>
    <td style="padding:11px 0;border-bottom:1px solid #e6e2f4;font-family:'SFMono-Regular',Consolas,monospace;font-size:13.5px;font-weight:600;color:#16163a;">Refund reference</td>
    <td align="right" style="padding:11px 0;border-bottom:1px solid #e6e2f4;font-family:'SFMono-Regular',Consolas,monospace;font-size:13.5px;font-weight:600;color:#16163a;">${p.refundReference}</td>
  </tr>
    <tr>
    <td style="padding:11px 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:13.5px;color:#55557a;">Property</td>
    <td align="right" style="padding:11px 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:13.5px;font-weight:600;color:#16163a;">${p.propertyTitle}, ${p.propertyArea}</td>
  </tr>
  </table>
</td></tr></table>
</td></tr><tr><td style="padding:0 32px 28px;" class="px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#efe6ff;border-radius:12px;"><tr>
    <td style="padding:16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:13.5px;line-height:1.6;color:#16163a;" class="px">
      <span style="color:#5b28b0;font-weight:700;">&#128337;&nbsp;&nbsp;</span><strong style="color:#5b28b0;">When to expect it:</strong> funds typically land back in your account within 24&ndash;48 hours, depending on your bank. No action needed on your end.
    </td></tr></table></td></tr><tr><td style="padding:0 32px 32px;" class="px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td align="center">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
    <td style="border-radius:10px;background:#000052;">
      <a href="${browse}" style="display:inline-block;padding:15px 30px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:10px;">Browse Other Listings &rarr;</a>
    </td></tr></table>
</td></tr></table>
<p style="margin:14px 0 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:12.5px;color:#8583a8;text-align:center;">Refunded under Rentivo&rsquo;s walkthrough guarantee</p>
</td></tr>
${emailFoot("This refund was issued under Rentivo's walkthrough guarantee after admin review.")}`;
}

export function generateRequestReceivedHtml(p: {
  recipientName: string;
  propertyTitle: string;
  propertyArea: string;
  propertyPrice: number | string;
  propertyType: string;
  propertyPhoto?: string;
  trackUrl: string;
  referenceId?: string;
}): string {
  const priceFormatted = formatNaira(p.propertyPrice);
  const photo = p.propertyPhoto || DEFAULT_PHOTO;
  const ref = p.referenceId || "RQ-20604";

  return `${emailHead(
    `Request Received: ${p.propertyTitle}`,
    `Got it — we're contacting the landlord to verify this one's still vacant. No charge unless it's confirmed available.`
  )}
<tr><td style="padding:32px 32px 20px;" class="px">
<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
    <td style="background:#efe6ff;color:#5b28b0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:13px;font-weight:700;padding:7px 16px;border-radius:20px;">
      <span style="letter-spacing:0.02em;">&#128712; Request received</span>
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
            <p style="margin:0 0 2px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:11px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;color:#8583a8;">${p.propertyArea}, Ibadan</p>
            <p style="margin:0 0 4px;font-family:'Outfit',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:16px;font-weight:700;color:#16163a;">${p.propertyTitle}</p>
            <p style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:13px;color:#55557a;">${p.propertyType} &middot; Verified listing</p>
          </td>
          <td width="110" valign="top" align="right" class="stack price-cell">
            <p style="margin:0;font-family:'Outfit',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:16px;font-weight:700;color:#16163a;white-space:nowrap;">₦${priceFormatted}</p>
            <p style="margin:2px 0 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:12px;color:#55557a;">per year</p>
          </td>
        </tr></table>
      </td>
    </tr>
  </table></td></tr><tr><td style="padding:0 32px 24px;" class="px">
<p style="margin:0 0 12px;font-family:'Outfit',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:14px;font-weight:700;color:#16163a;">What happens next</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
    <td width="32" valign="top">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td width="26" height="26" align="center" valign="middle" style="background:#000052;border-radius:50%;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:12px;font-weight:700;color:#ffffff;">1</td></tr></table>
    </td>
    <td width="12"></td>
    <td valign="top" style="padding-bottom:18px;">
      <p style="margin:2px 0 2px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:14px;font-weight:700;color:#16163a;">We contact the landlord</p>
      <p style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:13.5px;line-height:1.55;color:#55557a;">Rentivo reaches out directly to confirm the unit is still available &mdash; you don&rsquo;t need to do anything.</p>
    </td>
  </tr></table>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
    <td width="32" valign="top">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td width="26" height="26" align="center" valign="middle" style="background:#000052;border-radius:50%;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:12px;font-weight:700;color:#ffffff;">2</td></tr></table>
    </td>
    <td width="12"></td>
    <td valign="top" style="padding-bottom:0;">
      <p style="margin:2px 0 2px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:14px;font-weight:700;color:#16163a;">You get an update</p>
      <p style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:13.5px;line-height:1.55;color:#55557a;">We&rsquo;ll email you the moment we hear back, whether it&rsquo;s good news or not.</p>
    </td>
  </tr></table>
</td></tr><tr><td style="padding:0 32px 28px;" class="px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#efe6ff;border-radius:12px;"><tr>
    <td style="padding:16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:13.5px;line-height:1.6;color:#16163a;" class="px">
      <span style="color:#5b28b0;font-weight:700;">&#10022;&nbsp;&nbsp;</span><strong style="color:#5b28b0;">No charge yet:</strong> this request costs nothing. We only ever ask for the flat access fee after the landlord confirms the property is available.
    </td></tr></table></td></tr><tr><td style="padding:0 32px 32px;" class="px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td align="center">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
    <td style="border-radius:10px;background:#000052;">
      <a href="${p.trackUrl}" style="display:inline-block;padding:15px 30px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:10px;">Track Your Request &rarr;</a>
    </td></tr></table>
</td></tr></table>
<p style="margin:14px 0 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:12.5px;color:#8583a8;text-align:center;">Reference ${ref} &middot; Most landlords respond the same day</p>
</td></tr>
${emailFoot("You're receiving this because you clicked 'Check Availability' on a Rentivo listing.")}`;
}

export function generatePropertyUnavailableHtml(p: {
  recipientName: string;
  propertyTitle: string;
  propertyArea: string;
  propertyPrice: number | string;
  propertyType: string;
  propertyPhoto?: string;
  browseUrl?: string;
  alternatives?: Array<{
    title: string;
    area: string;
    price: number | string;
    type: string;
    photo: string;
  }>;
}): string {
  const priceFormatted = formatNaira(p.propertyPrice);
  const photo = p.propertyPhoto || DEFAULT_PHOTO;
  const browse = p.browseUrl || `${APP_URL}/search`;

  const defaultAlternatives = [
    {
      title: "2-Bedroom Flat",
      area: "Bodija Estate, Ibadan",
      price: 800000,
      type: "2 bedrooms · Verified listing",
      photo: "https://ik.imagekit.io/3unwhixxd/rentivo/listings/206941881_MzAwLTM5OS05YjkyYzliMDAx_ImG8z8ufl.webp"
    },
    {
      title: "Self-Contain + BQ",
      area: "Bodija, Ibadan",
      price: 900000,
      type: "2 bedrooms · Verified listing",
      photo: "https://ik.imagekit.io/3unwhixxd/rentivo/listings/206941889_MzAwLTM5OS01NGEzMTRmNTVm_-xr5K_pYQ.webp"
    }
  ];

  const altList = (p.alternatives && p.alternatives.length > 0) ? p.alternatives : defaultAlternatives;

  const altCardsHtml = altList.map(alt => `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #e6e2f4;border-radius:12px;margin-bottom:12px;"><tr>
  <td style="padding:14px;" class="px">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
      <td width="72" valign="top" class="stack">
        <img src="${alt.photo}" width="72" height="54" class="prop-photo" style="border-radius:7px;display:block;width:72px;height:54px;object-fit:cover;" alt="Property Photo" onerror="this.src='${DEFAULT_PHOTO}';">
      </td>
      <td width="14" style="font-size:0;line-height:0;">&nbsp;</td>
      <td valign="top" class="stack prop-text-cell">
        <p style="margin:0 0 2px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:10.5px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;color:#8583a8;">${alt.area}</p>
        <p style="margin:0 0 2px;font-family:'Outfit',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:14.5px;font-weight:700;color:#16163a;">${alt.title}</p>
        <p style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:12.5px;color:#55557a;">${alt.type}</p>
      </td>
      <td width="90" valign="top" align="right" class="stack price-cell">
        <p style="margin:0;font-family:'Outfit',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:14.5px;font-weight:700;color:#16163a;white-space:nowrap;">₦${formatNaira(alt.price)}</p>
        <p style="margin:1px 0 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:11px;color:#55557a;">per year</p>
      </td>
    </tr></table>
  </td>
</tr></table>`).join('');

  return `${emailHead(
    `Update: ${p.propertyTitle}`,
    `This one was just taken — but we found verified alternatives nearby at a similar price.`
  )}
<tr><td style="padding:32px 32px 20px;" class="px">
<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
    <td style="background:#efedf7;color:#55557a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:13px;font-weight:700;padding:7px 16px;border-radius:20px;">
      <span style="letter-spacing:0.02em;">&#8635; No longer available</span>
    </td></tr></table>
<h1 class="h1" style="margin:16px 0 8px;font-family:'Outfit',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:24px;line-height:1.25;font-weight:700;color:#16163a;letter-spacing:-0.01em;">This one&rsquo;s just been taken</h1>
<p style="margin:0 0 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:#55557a;">The landlord let us know this property was rented out before we could confirm it for you. Sorry for the near-miss &mdash; we know that&rsquo;s disappointing.</p>
</td></tr><tr><td style="padding:0 32px 8px;" class="px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #e6e2f4;border-radius:12px;">
    <tr>
      <td style="padding:16px;" class="px">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
          <td width="104" valign="top" class="stack">
            <img src="${photo}" width="104" height="78" class="prop-photo" style="border-radius:8px;display:block;width:104px;height:78px;object-fit:cover;" alt="Property Photo" onerror="this.src='${DEFAULT_PHOTO}';">
          </td>
          <td width="16" style="font-size:0;line-height:0;">&nbsp;</td>
          <td valign="top" class="stack prop-text-cell">
            <p style="margin:0 0 2px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:11px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;color:#8583a8;">${p.propertyArea}, Ibadan</p>
            <p style="margin:0 0 4px;font-family:'Outfit',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:16px;font-weight:700;color:#16163a;">${p.propertyTitle}</p>
            <p style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:13px;color:#55557a;">${p.propertyType} &middot; Verified listing</p>
          </td>
          <td width="110" valign="top" align="right" class="stack price-cell">
            <p style="margin:0;font-family:'Outfit',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:16px;font-weight:700;color:#16163a;white-space:nowrap;">₦${priceFormatted}</p>
            <p style="margin:2px 0 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:12px;color:#55557a;">per year</p>
          </td>
        </tr></table>
      </td>
    </tr>
  </table></td></tr><tr><td style="padding:12px 32px 28px;" class="px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#e3f4ec;border-radius:12px;"><tr>
    <td style="padding:16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:13.5px;line-height:1.6;color:#16163a;" class="px">
      <span style="color:#17794e;font-weight:700;">&#10003;&nbsp;&nbsp;</span><strong style="color:#17794e;">Good news:</strong> no fee was ever requested for this one, so there&rsquo;s nothing to refund &mdash; this request simply closes here.
    </td></tr></table></td></tr><tr><td style="padding:0 32px 28px;" class="px">
<p style="margin:0 0 4px;font-family:'Outfit',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:16px;font-weight:700;color:#16163a;">Verified alternatives nearby</p>
<p style="margin:0 0 16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:13.5px;color:#55557a;">Similar size and price, still in ${p.propertyArea}.</p>
${altCardsHtml}
</td></tr><tr><td style="padding:0 32px 32px;" class="px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td align="center">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
    <td style="border-radius:10px;background:#000052;">
      <a href="${browse}" style="display:inline-block;padding:15px 30px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:10px;">Browse Similar Listings &rarr;</a>
    </td></tr></table>
</td></tr></table>
</td></tr>
${emailFoot("No access fee was charged for this request.")}`;
}

export const emailNotificationService = {
  /**
   * 0. Notifies the landlord that a verified renter has requested access, asking them to confirm availability.
   */
  async sendLandlordVacancyCheckEmail(params: {
    recipientEmail: string;
    recipientName?: string;
    renterName: string;
    propertyTitle: string;
    propertyArea: string;
    propertyPrice: number | string;
    propertyType: string;
    propertyPhoto?: string;
    yesLink: string;
    noLink: string;
    referenceId?: string;
  }): Promise<{ success: boolean; error?: string }> {
    const {
      recipientEmail,
      recipientName = 'Property Owner',
      renterName,
      propertyTitle,
      propertyArea,
      propertyPrice,
      propertyType,
      propertyPhoto,
      yesLink,
      noLink,
      referenceId = 'RQ-20604'
    } = params;

    const payload = {
      template: 'landlord_vacancy_check',
      recipientEmail,
      recipientName,
      data: {
        renterName,
        propertyTitle,
        propertyArea,
        propertyPrice,
        propertyType,
        propertyPhoto,
        yesLink,
        noLink,
        referenceId
      }
    };

    if (isLiveBackend && supabase) {
      try {
        const { data, error } = await supabase.functions.invoke('send-email', {
          body: payload
        });
        if (!error && data?.success) {
          return { success: true };
        }
      } catch (err) {
        console.warn('Edge Function send-email invoke failed, trying Brevo fallback:', err);
      }
    }

    if (BREVO_API_KEY && recipientEmail) {
      try {
        const html = generateLandlordVacancyCheckHtml({
          recipientName,
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

        const res = await fetch('https://api.brevo.com/v3/smtp/email', {
          method: 'POST',
          headers: {
            'api-key': BREVO_API_KEY,
            'Content-Type': 'application/json',
            accept: 'application/json'
          },
          body: JSON.stringify({
            sender: DEFAULT_SENDER,
            to: [{ email: recipientEmail, name: recipientName }],
            subject: `Action Required: Is "${propertyTitle}" still available? — Rentivo`,
            htmlContent: html
          })
        });

        if (res.ok) return { success: true };
        const errJson = await res.json().catch(() => ({}));
        return { success: false, error: errJson.message || 'Failed to send email via Brevo' };
      } catch (err: any) {
        return { success: false, error: err?.message || 'Brevo network error' };
      }
    }

    return { success: false, error: 'No email service available' };
  },

  /**
   * 1. Notifies the renter that the property has been verified as AVAILABLE by the landlord.
   */
  async sendAvailabilityConfirmedEmail(params: {
    request: AccessRequest;
    listing?: Listing | null;
  }): Promise<{ success: boolean; error?: string }> {
    const { request, listing } = params;

    const recipientEmail = request.renterEmail;
    const recipientName = request.renterName || 'Rentivo Member';
    const propertyTitle = listing?.title || request.listingTitle || 'Verified Property';
    const propertyArea = listing?.area || request.listingArea || 'Bodija';
    const propertyPrice = listing?.price || request.listingPrice || 850000;
    const propertyType = listing?.type || '2-Bedroom Self-Contain';
    const propertyPhoto = listing?.photos?.[0] || request.listingPhoto || DEFAULT_PHOTO;
    const requestUrl = `${APP_URL}/requests/${request.id}`;

    const payload = {
      template: 'availability_confirmed',
      recipientEmail,
      recipientName,
      data: {
        propertyTitle,
        propertyArea,
        propertyPrice,
        propertyType,
        propertyPhoto,
        requestUrl,
        referenceId: `RQ-${request.id?.slice(0, 5) || '20604'}`
      }
    };

    if (isLiveBackend && supabase) {
      try {
        const { data, error } = await supabase.functions.invoke('send-email', {
          body: payload
        });
        if (!error && data?.success) {
          return { success: true };
        }
      } catch (err) {
        console.warn('Edge Function send-email invoke failed, trying Brevo fallback:', err);
      }
    }

    try {
      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'api-key': BREVO_API_KEY,
          'Content-Type': 'application/json',
          'accept': 'application/json'
        },
        body: JSON.stringify({
          sender: DEFAULT_SENDER,
          to: [{ email: recipientEmail, name: recipientName }],
          subject: `Available! Good news regarding "${propertyTitle}" — Rentivo`,
          htmlContent: generateAvailabilityHtml({
            recipientName,
            propertyTitle,
            propertyArea,
            propertyPrice,
            propertyType,
            propertyPhoto,
            requestUrl
          })
        })
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        return { success: false, error: errJson.message || 'Failed to send email via Brevo' };
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Network error' };
    }
  },

  /**
   * 2. Notifies the renter immediately after successful access fee payment.
   */
  async sendPaymentSuccessEmail(params: {
    request: AccessRequest;
    listing?: Listing | null;
    unlockedContact?: ListerContact | null;
    paymentReference?: string;
  }): Promise<{ success: boolean; error?: string }> {
    const { request, listing, unlockedContact, paymentReference = 'T240927-8841-RNT' } = params;

    const recipientEmail = request.renterEmail;
    const recipientName = request.renterName || 'Rentivo Member';
    const propertyTitle = listing?.title || request.listingTitle || 'Verified Property';
    const propertyArea = listing?.area || request.listingArea || 'Bodija';
    const propertyPrice = listing?.price || request.listingPrice || 850000;
    const propertyType = listing?.type || '2-Bedroom Self-Contain';
    const propertyPhoto = listing?.photos?.[0] || request.listingPhoto || DEFAULT_PHOTO;
    const requestUrl = `${APP_URL}/requests/${request.id}`;

    const contact = unlockedContact || request.unlockedListerContact;
    const landlordName = contact?.fullName || listing?.lister?.fullName || 'Mr. Adewale Ogunleye';
    const landlordPhone = contact?.phone || listing?.lister?.phone || '0803 123 4567';
    const landlordWhatsapp = contact?.whatsapp || listing?.lister?.whatsapp || '2348031234567';
    const exactAddress = contact?.exactAddress || `${propertyArea}, Ibadan`;

    const payload = {
      template: 'payment_success',
      recipientEmail,
      recipientName,
      data: {
        propertyTitle,
        propertyArea,
        propertyPrice,
        propertyType,
        propertyPhoto,
        requestUrl,
        landlordName,
        landlordPhone,
        landlordWhatsapp,
        exactAddress,
        paymentReference
      }
    };

    if (isLiveBackend && supabase) {
      try {
        const { data, error } = await supabase.functions.invoke('send-email', {
          body: payload
        });
        if (!error && data?.success) {
          return { success: true };
        }
      } catch (err) {
        console.warn('Edge Function send-email invoke failed, trying Brevo fallback:', err);
      }
    }

    try {
      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'api-key': BREVO_API_KEY,
          'Content-Type': 'application/json',
          'accept': 'application/json'
        },
        body: JSON.stringify({
          sender: DEFAULT_SENDER,
          to: [{ email: recipientEmail, name: recipientName }],
          subject: `Access Unlocked: Landlord details for "${propertyTitle}" — Rentivo`,
          htmlContent: generatePaymentSuccessHtml({
            recipientName,
            propertyTitle,
            propertyArea,
            propertyPrice,
            propertyType,
            propertyPhoto,
            requestUrl,
            landlordName,
            landlordPhone,
            landlordWhatsapp,
            exactAddress,
            paymentReference
          })
        })
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        return { success: false, error: errJson.message || 'Failed to send email via Brevo' };
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Network error' };
    }
  },

  /**
   * 3. Notifies the renter that a refund has been approved & processed.
   */
  async sendRefundProcessedEmail(params: {
    recipientEmail: string;
    recipientName?: string;
    propertyTitle: string;
    propertyArea?: string;
    originalTransaction: string;
    refundReference: string;
  }): Promise<{ success: boolean; error?: string }> {
    const { recipientEmail, recipientName = 'Rentivo Member', propertyTitle, propertyArea = 'Bodija', originalTransaction, refundReference } = params;

    const payload = {
      template: 'refund_processed',
      recipientEmail,
      recipientName,
      data: {
        propertyTitle,
        propertyArea,
        originalTransaction,
        refundReference
      }
    };

    if (isLiveBackend && supabase) {
      try {
        const { data, error } = await supabase.functions.invoke('send-email', {
          body: payload
        });
        if (!error && data?.success) return { success: true };
      } catch (err) {
        console.warn('Edge Function send-email invoke failed, trying Brevo fallback:', err);
      }
    }

    try {
      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'api-key': BREVO_API_KEY,
          'Content-Type': 'application/json',
          'accept': 'application/json'
        },
        body: JSON.stringify({
          sender: DEFAULT_SENDER,
          to: [{ email: recipientEmail, name: recipientName }],
          subject: `Refund Approved: ₦5,000 for "${propertyTitle}" — Rentivo`,
          htmlContent: generateRefundProcessedHtml({
            recipientName,
            propertyTitle,
            propertyArea,
            originalTransaction,
            refundReference
          })
        })
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        return { success: false, error: errJson.message || 'Failed to send email via Brevo' };
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Network error' };
    }
  },

  /**
   * 4. Acknowledges a new property availability inquiry from a renter.
   */
  async sendRequestReceivedEmail(params: {
    request: AccessRequest;
    listing?: Listing | null;
  }): Promise<{ success: boolean; error?: string }> {
    const { request, listing } = params;
    const recipientEmail = request.renterEmail;
    const recipientName = request.renterName || 'Rentivo Member';
    const propertyTitle = listing?.title || request.listingTitle || 'Verified Property';
    const propertyArea = listing?.area || request.listingArea || 'Bodija';
    const propertyPrice = listing?.price || request.listingPrice || 850000;
    const propertyType = listing?.type || '2-Bedroom Self-Contain';
    const propertyPhoto = listing?.photos?.[0] || request.listingPhoto || DEFAULT_PHOTO;
    const trackUrl = `${APP_URL}/requests/${request.id}`;

    const payload = {
      template: 'request_received',
      recipientEmail,
      recipientName,
      data: {
        propertyTitle,
        propertyArea,
        propertyPrice,
        propertyType,
        propertyPhoto,
        trackUrl,
        referenceId: `RQ-${request.id?.slice(0, 5) || '20604'}`
      }
    };

    if (isLiveBackend && supabase) {
      try {
        const { data, error } = await supabase.functions.invoke('send-email', {
          body: payload
        });
        if (!error && data?.success) return { success: true };
      } catch (err) {
        console.warn('Edge Function send-email invoke failed, trying Brevo fallback:', err);
      }
    }

    try {
      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'api-key': BREVO_API_KEY,
          'Content-Type': 'application/json',
          'accept': 'application/json'
        },
        body: JSON.stringify({
          sender: DEFAULT_SENDER,
          to: [{ email: recipientEmail, name: recipientName }],
          subject: `We're checking on this one for you: "${propertyTitle}" — Rentivo`,
          htmlContent: generateRequestReceivedHtml({
            recipientName,
            propertyTitle,
            propertyArea,
            propertyPrice,
            propertyType,
            propertyPhoto,
            trackUrl
          })
        })
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        return { success: false, error: errJson.message || 'Failed to send email via Brevo' };
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Network error' };
    }
  },

  /**
   * 5. Informs the renter that a property was already taken and provides alternatives.
   */
  async sendPropertyUnavailableEmail(params: {
    request: AccessRequest;
    listing?: Listing | null;
    alternatives?: Array<{
      title: string;
      area: string;
      price: number | string;
      type: string;
      photo: string;
    }>;
  }): Promise<{ success: boolean; error?: string }> {
    const { request, listing, alternatives } = params;
    const recipientEmail = request.renterEmail;
    const recipientName = request.renterName || 'Rentivo Member';
    const propertyTitle = listing?.title || request.listingTitle || 'Verified Property';
    const propertyArea = listing?.area || request.listingArea || 'Bodija';
    const propertyPrice = listing?.price || request.listingPrice || 850000;
    const propertyType = listing?.type || '2-Bedroom Self-Contain';
    const propertyPhoto = listing?.photos?.[0] || request.listingPhoto || DEFAULT_PHOTO;

    const payload = {
      template: 'property_unavailable',
      recipientEmail,
      recipientName,
      data: {
        propertyTitle,
        propertyArea,
        propertyPrice,
        propertyType,
        propertyPhoto,
        alternatives
      }
    };

    if (isLiveBackend && supabase) {
      try {
        const { data, error } = await supabase.functions.invoke('send-email', {
          body: payload
        });
        if (!error && data?.success) return { success: true };
      } catch (err) {
        console.warn('Edge Function send-email invoke failed, trying Brevo fallback:', err);
      }
    }

    try {
      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'api-key': BREVO_API_KEY,
          'Content-Type': 'application/json',
          'accept': 'application/json'
        },
        body: JSON.stringify({
          sender: DEFAULT_SENDER,
          to: [{ email: recipientEmail, name: recipientName }],
          subject: `Update: "${propertyTitle}" is no longer available — Rentivo`,
          htmlContent: generatePropertyUnavailableHtml({
            recipientName,
            propertyTitle,
            propertyArea,
            propertyPrice,
            propertyType,
            propertyPhoto,
            alternatives
          })
        })
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        return { success: false, error: errJson.message || 'Failed to send email via Brevo' };
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Network error' };
    }
  }
};
