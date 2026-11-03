import { emailHead, emailFoot, formatNaira, DEFAULT_PHOTO } from "./common.ts";

export function generateVerificationApprovedEmailHtml(p: {
  recipientName: string;
  propertyTitle: string;
  propertyArea: string;
  propertyPrice: number | string;
  propertyType: string;
  propertyPhoto?: string;
  viewUrl?: string;
  inspectorName?: string;
  auditorNotes?: string;
  referenceId?: string;
}): string {
  const priceFormatted = formatNaira(p.propertyPrice);
  const photo = p.propertyPhoto || DEFAULT_PHOTO;
  const viewLink = p.viewUrl || "https://rentivos.com.ng/properties";
  const ref = p.referenceId || "VR-AUDIT";

  return `${emailHead(
    `Verified: "${p.propertyTitle}" has been Emerald Verified!`,
    `Great news! Your property in ${p.propertyArea} passed physical verification and has been awarded the Emerald Verified trust badge.`
  )}
<tr><td style="padding:32px 32px 20px;" class="px">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
    <td style="background:#E8F7F0;color:#16794A;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:13px;font-weight:700;padding:7px 16px;border-radius:20px;border:1px solid #9BD8B8;">
      <span style="letter-spacing:0.02em;">&#10003;&nbsp;&nbsp;EMERALD VERIFIED BADGE AWARDED</span>
    </td></tr></table>
  <h1 class="h1" style="margin:16px 0 8px;font-family:'Outfit',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:24px;line-height:1.25;font-weight:700;color:#16163a;letter-spacing:-0.01em;">Congratulations! Your property is officially verified.</h1>
  <p style="margin:0 0 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:#55557a;">Hello ${p.recipientName || 'Property Owner'},<br><br>Rentivo field audit has verified your property on-site in <strong>${p.propertyArea}, Ibadan</strong>. Your listing now features the verified emerald badge and gets priority ranking across search results.</p>
</td></tr>
<tr><td style="padding:0 32px 24px;" class="px">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1.5px solid #9BD8B8;background:#F8FCFA;border-radius:14px;">
    <tr>
      <td style="padding:16px;" class="px">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
          <td width="104" valign="top" class="stack">
            <img src="${photo}" width="104" height="78" class="prop-photo" style="border-radius:8px;display:block;width:104px;height:78px;object-fit:cover;" alt="Property Photo" onerror="this.src='${DEFAULT_PHOTO}';">
          </td>
          <td width="16" style="font-size:0;line-height:0;">&nbsp;</td>
          <td valign="top" class="stack prop-text-cell">
            <p style="margin:0 0 2px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:11px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;color:#16794A;">&#9679; Emerald Verified &middot; ${p.propertyArea}, Ibadan</p>
            <p style="margin:0 0 4px;font-family:'Outfit',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:16px;font-weight:700;color:#16163a;">${p.propertyTitle}</p>
            <p style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:13px;color:#55557a;">${p.propertyType} &middot; Audited by ${p.inspectorName || 'Senior Field Auditor'}</p>
          </td>
          <td width="110" valign="top" align="right" class="stack price-cell">
            <p style="margin:0;font-family:'Outfit',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:16px;font-weight:700;color:#16163a;white-space:nowrap;">₦${priceFormatted}</p>
            <p style="margin:2px 0 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:12px;color:#55557a;">per year</p>
          </td>
        </tr></table>
      </td>
    </tr>
  </table>
</td></tr>
<tr><td style="padding:0 32px 24px;" class="px">
  <div style="background:#FFFFFF;border:1px solid #E4E1ED;border-radius:12px;padding:18px 20px;">
    <p style="margin:0 0 10px;font-family:'Outfit',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:14px;font-weight:700;color:#000052;">Verified On-Site Checklist Confirmed:</p>
    <ul style="margin:0;padding-left:18px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:13.5px;line-height:1.7;color:#333355;">
      <li><strong>Physical vacancy &amp; authority:</strong> Confirmed ready for tenant handover.</li>
      <li><strong>Electricity &amp; meter:</strong> Functional dedicated meter and feeder band recorded.</li>
      <li><strong>Clean running water:</strong> Borehole/water pressure tested and flowing clean.</li>
      <li><strong>Access road &amp; security:</strong> Verified compound perimeter, road and safety.</li>
    </ul>
    ${p.auditorNotes ? `<p style="margin:12px 0 0;padding-top:12px;border-top:1px dashed #E4E1ED;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:13px;color:#55557a;font-style:italic;">&ldquo;${p.auditorNotes}&rdquo;</p>` : ''}
  </div>
</td></tr>
<tr><td style="padding:0 32px 32px;" class="px">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr>
      <td align="center">
        <a href="${viewLink}" style="display:inline-block;background-color:#16794A;color:#FFFFFF;text-decoration:none;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-weight:700;font-size:15px;padding:15px 32px;border-radius:10px;text-align:center;box-shadow:0 2px 10px rgba(22,121,74,0.3);">
          View Your Verified Listing on Rentivo &rarr;
        </a>
      </td>
    </tr>
  </table>
  <p style="margin:16px 0 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:12px;color:#8583a8;text-align:center;">Audit Reference: ${ref}</p>
</td></tr>
${emailFoot("You are receiving this because you listed a property on Rentivo.")}`;
}

export function generateVerificationChangesRequestedEmailHtml(p: {
  recipientName: string;
  propertyTitle: string;
  propertyArea: string;
  propertyPrice: number | string;
  propertyType: string;
  propertyPhoto?: string;
  editUrl?: string;
  requestedItems?: string[];
  auditorNotes?: string;
  referenceId?: string;
}): string {
  const priceFormatted = formatNaira(p.propertyPrice);
  const photo = p.propertyPhoto || DEFAULT_PHOTO;
  const editLink = p.editUrl || "https://rentivos.com.ng/lister/listings";
  const ref = p.referenceId || "VR-AUDIT";
  const items = p.requestedItems && p.requestedItems.length > 0
    ? p.requestedItems
    : ['Please review photo clarity or specification claims.'];

  return `${emailHead(
    `Action Required: Verification feedback for "${p.propertyTitle}"`,
    `Rentivo field auditor reviewed your listing and requested minor updates before awarding the Emerald Verified badge.`
  )}
<tr><td style="padding:32px 32px 20px;" class="px">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
    <td style="background:#FFF5E5;color:#8A4F00;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:13px;font-weight:700;padding:7px 16px;border-radius:20px;border:1px solid #F2D6A6;">
      <span style="letter-spacing:0.02em;">ACTION REQUIRED &middot; REVISIONS NEEDED</span>
    </td></tr></table>
  <h1 class="h1" style="margin:16px 0 8px;font-family:'Outfit',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:24px;line-height:1.25;font-weight:700;color:#16163a;letter-spacing:-0.01em;">Please update your listing to complete verification.</h1>
  <p style="margin:0 0 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:#55557a;">Hello ${p.recipientName || 'Property Owner'},<br><br>Our audit team reviewed <strong>"${p.propertyTitle}"</strong> in ${p.propertyArea}, Ibadan. To help ensure 100% renter confidence and award your Emerald badge, please address the following feedback items:</p>
</td></tr>
<tr><td style="padding:0 32px 24px;" class="px">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #e6e2f4;border-radius:12px;">
    <tr>
      <td style="padding:16px;" class="px">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
          <td width="104" valign="top" class="stack">
            <img src="${photo}" width="104" height="78" class="prop-photo" style="border-radius:8px;display:block;width:104px;height:78px;object-fit:cover;" alt="Property Photo" onerror="this.src='${DEFAULT_PHOTO}';">
          </td>
          <td width="16" style="font-size:0;line-height:0;">&nbsp;</td>
          <td valign="top" class="stack prop-text-cell">
            <p style="margin:0 0 2px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:11px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;color:#8A4F00;">Pending Updates &middot; ${p.propertyArea}</p>
            <p style="margin:0 0 4px;font-family:'Outfit',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:16px;font-weight:700;color:#16163a;">${p.propertyTitle}</p>
            <p style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:13px;color:#55557a;">${p.propertyType}</p>
          </td>
          <td width="110" valign="top" align="right" class="stack price-cell">
            <p style="margin:0;font-family:'Outfit',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:16px;font-weight:700;color:#16163a;white-space:nowrap;">₦${priceFormatted}</p>
            <p style="margin:2px 0 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:12px;color:#55557a;">per year</p>
          </td>
        </tr></table>
      </td>
    </tr>
  </table>
</td></tr>
<tr><td style="padding:0 32px 24px;" class="px">
  <div style="background:#FFFDF7;border:1.5px solid #F2D6A6;border-radius:12px;padding:20px;">
    <p style="margin:0 0 10px;font-family:'Outfit',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:14px;font-weight:700;color:#8A4F00;">Requested Changes from Auditor:</p>
    <ul style="margin:0 0 14px;padding-left:18px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:14px;line-height:1.65;color:#333355;">
      ${items.map(item => `<li style="margin-bottom:6px;">${item}</li>`).join('')}
    </ul>
    ${p.auditorNotes ? `
    <div style="background:#FFFFFF;border:1px solid #E4E1ED;border-radius:8px;padding:12px 14px;">
      <p style="margin:0 0 4px;font-size:11.5px;font-weight:700;color:#8583a8;text-transform:uppercase;">Auditor Notes:</p>
      <p style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:13.5px;color:#16163a;line-height:1.5;">${p.auditorNotes}</p>
    </div>` : ''}
  </div>
</td></tr>
<tr><td style="padding:0 32px 32px;" class="px">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr>
      <td align="center">
        <a href="${editLink}" style="display:inline-block;background-color:#000052;color:#FFFFFF;text-decoration:none;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-weight:700;font-size:15px;padding:15px 32px;border-radius:10px;text-align:center;box-shadow:0 2px 10px rgba(0,0,82,0.25);">
          Update Listing in Lister Portal &rarr;
        </a>
      </td>
    </tr>
  </table>
  <p style="margin:16px 0 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:12px;color:#8583a8;text-align:center;">Once updated, our audit team will immediately re-inspect the submission.</p>
</td></tr>
${emailFoot("You are receiving this because you submitted this listing for verification on Rentivo.")}`;
}

export function generateVerificationRejectedEmailHtml(p: {
  recipientName: string;
  propertyTitle: string;
  propertyArea: string;
  propertyPrice: number | string;
  propertyType: string;
  propertyPhoto?: string;
  reason: string;
  auditorNotes?: string;
  supportUrl?: string;
  referenceId?: string;
}): string {
  const priceFormatted = formatNaira(p.propertyPrice);
  const photo = p.propertyPhoto || DEFAULT_PHOTO;
  const supportLink = p.supportUrl || "https://rentivos.com.ng/lister/listings";
  const ref = p.referenceId || "VR-AUDIT";

  return `${emailHead(
    `Verification decision regarding "${p.propertyTitle}"`,
    `Rentivo field audit was unable to approve verification for "${p.propertyTitle}" in ${p.propertyArea}.`
  )}
<tr><td style="padding:32px 32px 20px;" class="px">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
    <td style="background:#FEE4E2;color:#B42318;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:13px;font-weight:700;padding:7px 16px;border-radius:20px;border:1px solid #F5B5AF;">
      <span style="letter-spacing:0.02em;">VERIFICATION UNSUCCESSFUL</span>
    </td></tr></table>
  <h1 class="h1" style="margin:16px 0 8px;font-family:'Outfit',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:24px;line-height:1.25;font-weight:700;color:#16163a;letter-spacing:-0.01em;">Verification could not be approved at this time.</h1>
  <p style="margin:0 0 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:#55557a;">Hello ${p.recipientName || 'Property Owner'},<br><br>Following an on-site audit of <strong>"${p.propertyTitle}"</strong> in ${p.propertyArea}, Ibadan, Rentivo is unable to verify this listing under our emerald standards.</p>
</td></tr>
<tr><td style="padding:0 32px 24px;" class="px">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #e6e2f4;border-radius:12px;">
    <tr>
      <td style="padding:16px;" class="px">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
          <td width="104" valign="top" class="stack">
            <img src="${photo}" width="104" height="78" class="prop-photo" style="border-radius:8px;display:block;width:104px;height:78px;object-fit:cover;" alt="Property Photo" onerror="this.src='${DEFAULT_PHOTO}';">
          </td>
          <td width="16" style="font-size:0;line-height:0;">&nbsp;</td>
          <td valign="top" class="stack prop-text-cell">
            <p style="margin:0 0 2px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:11px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;color:#B42318;">Verification Rejected &middot; ${p.propertyArea}</p>
            <p style="margin:0 0 4px;font-family:'Outfit',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:16px;font-weight:700;color:#16163a;">${p.propertyTitle}</p>
            <p style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:13px;color:#55557a;">${p.propertyType}</p>
          </td>
          <td width="110" valign="top" align="right" class="stack price-cell">
            <p style="margin:0;font-family:'Outfit',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:16px;font-weight:700;color:#16163a;white-space:nowrap;">₦${priceFormatted}</p>
            <p style="margin:2px 0 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:12px;color:#55557a;">per year</p>
          </td>
        </tr></table>
      </td>
    </tr>
  </table>
</td></tr>
<tr><td style="padding:0 32px 24px;" class="px">
  <div style="background:#FFF6F6;border:1.5px solid #F5B5AF;border-radius:12px;padding:20px;">
    <p style="margin:0 0 6px;font-family:'Outfit',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:14px;font-weight:700;color:#B42318;">Primary Reason for Rejection:</p>
    <p style="margin:0 0 12px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:14px;font-weight:600;color:#16163a;">${p.reason}</p>
    ${p.auditorNotes ? `
    <div style="background:#FFFFFF;border:1px solid #E4E1ED;border-radius:8px;padding:12px 14px;">
      <p style="margin:0 0 4px;font-size:11.5px;font-weight:700;color:#8583a8;text-transform:uppercase;">Auditor Comments:</p>
      <p style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:13.5px;color:#55557a;line-height:1.5;">${p.auditorNotes}</p>
    </div>` : ''}
  </div>
</td></tr>
<tr><td style="padding:0 32px 32px;" class="px">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr>
      <td align="center">
        <a href="${supportLink}" style="display:inline-block;background-color:#000052;color:#FFFFFF;text-decoration:none;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-weight:700;font-size:15px;padding:15px 32px;border-radius:10px;text-align:center;">
          Return to Lister Dashboard &rarr;
        </a>
      </td>
    </tr>
  </table>
  <p style="margin:16px 0 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:12px;color:#8583a8;text-align:center;">Audit Reference: ${ref}</p>
</td></tr>
${emailFoot("You are receiving this because you submitted this listing for verification on Rentivo.")}`;
}

export function generateAdminInvitationEmailHtml(p: {
  recipientName: string;
  invitedByName?: string;
  role?: string;
  inviteUrl: string;
  notes?: string;
  expiresInDays?: number;
}): string {
  const inviter = p.invitedByName || "The Rentivo Operations Team";
  const roleLabel = p.role === "super_admin" 
    ? "Super Administrator" 
    : p.role === "auditor" 
    ? "Field Verification Auditor" 
    : "Operations Administrator";
  
  const roleDesc = p.role === "super_admin"
    ? "Full administrative access across team management, verification operations, user accounts, and financial monitoring."
    : p.role === "auditor"
    ? "Operational privileges to inspect on-site property verifications, review dossiers, and capture physical evidence."
    : "Administrative control over listing moderation, verification requests, inquiry escalations, and customer support.";

  const link = p.inviteUrl || "https://rentivos.com.ng/admin/invite";
  const days = p.expiresInDays || 7;

  return `${emailHead(
    `You've been invited to join the Rentivo Administration Team`,
    `You have been invited by ${inviter} to join Rentivo as an ${roleLabel}. Complete your account setup to get started.`
  )}
<tr><td style="padding:32px 32px 20px;" class="px">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
    <td style="background:#F1E5FF;color:#4C1D95;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:12.5px;font-weight:700;padding:6px 16px;border-radius:20px;letter-spacing:0.04em;text-transform:uppercase;">
      <span>&#128272;&nbsp;&nbsp;Admin Team Invitation</span>
    </td></tr></table>
  <h1 class="h1" style="margin:18px 0 8px;font-family:'Outfit',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:24px;line-height:1.25;font-weight:700;color:#000052;letter-spacing:-0.01em;">
    Welcome to the Team, ${p.recipientName}
  </h1>
  <p style="margin:0 0 16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:#55557a;">
    <strong>${inviter}</strong> has invited you to join the Rentivo Administration and Operations platform as an <strong>${roleLabel}</strong>.
  </p>
</td></tr>
<tr><td style="padding:0 32px 24px;" class="px">
  <div style="background:#FAF9FD;border:1.5px solid #E4E1ED;border-radius:14px;padding:22px;">
    <div style="display:flex;align-items:center;margin-bottom:12px;">
      <span style="font-family:'Outfit',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:12px;font-weight:700;color:#5B21B6;text-transform:uppercase;letter-spacing:0.05em;background:#FFFFFF;border:1px solid #E2CCFF;padding:4px 10px;border-radius:6px;">
        Role: ${roleLabel}
      </span>
    </div>
    <p style="margin:0 0 12px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:14px;line-height:1.6;color:#333355;">
      ${roleDesc}
    </p>
    ${p.notes ? `
    <div style="background:#FFFFFF;border-left:3px solid #BE89FF;padding:12px 14px;border-radius:0 8px 8px 0;margin-top:14px;">
      <p style="margin:0 0 4px;font-size:11px;font-weight:700;color:#8583a8;text-transform:uppercase;letter-spacing:0.04em;">Note from ${inviter}:</p>
      <p style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:13.5px;color:#11112B;font-style:italic;">"${p.notes}"</p>
    </div>` : ''}
  </div>
</td></tr>
<tr><td style="padding:0 32px 32px;" class="px">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr>
      <td align="center">
        <a href="${link}" style="display:inline-block;background-color:#000052;color:#FFFFFF;text-decoration:none;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-weight:700;font-size:15px;padding:15px 36px;border-radius:10px;text-align:center;box-shadow:0 3px 12px rgba(0,0,82,0.25);">
          Accept Invitation &amp; Setup Admin Account &rarr;
        </a>
      </td>
    </tr>
  </table>
  <p style="margin:20px 0 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:12.5px;color:#8583a8;text-align:center;line-height:1.5;">
    This secure invitation link is valid for <strong>${days} days</strong>. If the button above does not open, copy and paste this link into your browser:<br>
    <a href="${link}" style="color:#5B21B6;word-break:break-all;font-size:11.5px;">${link}</a>
  </p>
</td></tr>
${emailFoot("You are receiving this invitation because an administrator authorized your access to Rentivo.")}`;
}

