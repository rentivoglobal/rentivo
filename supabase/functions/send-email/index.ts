import { cors, BREVO_API_KEY, DEFAULT_SENDER, supabaseAdmin } from "./common.ts";
import {
  generateLandlordVacancyCheckEmailHtml,
  generateAvailabilityEmailHtml,
  generatePaymentSuccessEmailHtml
} from "./renter_part1.ts";
import {
  generateRefundProcessedEmailHtml,
  generateRequestReceivedEmailHtml,
  generatePropertyUnavailableEmailHtml,
  generateListerUnresponsiveEmailHtml
} from "./renter_part2.ts";
import {
  generateVerificationApprovedEmailHtml,
  generateVerificationChangesRequestedEmailHtml,
  generateVerificationRejectedEmailHtml,
  generateAdminInvitationEmailHtml
} from "./admin_templates.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const body = await req.json().catch(() => ({}));
    const { template, recipientEmail, recipientName = "Rentivo Member", data = {} } = body;

    if (!recipientEmail) {
      return new Response(JSON.stringify({ success: false, error: "Recipient email is required" }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" }
      });
    }

    let subject = "Notification from Rentivo";
    let htmlContent = "";

    if (template === "availability_confirmed") {
      subject = `Available! Good news regarding "${data.propertyTitle || 'your requested property'}" — Rentivo`;
      htmlContent = generateAvailabilityEmailHtml({
        recipientName,
        propertyTitle: data.propertyTitle || "Verified Property",
        propertyArea: data.propertyArea || "Bodija",
        propertyPrice: data.propertyPrice || 850000,
        propertyType: data.propertyType || "2-Bedroom Self-Contain",
        propertyPhoto: data.propertyPhoto,
        requestUrl: data.requestUrl || "https://rentivos.com.ng",
        referenceId: data.referenceId || "RQ-20604"
      });
    } else if (template === "payment_success") {
      subject = `Access Unlocked: Landlord details for "${data.propertyTitle || 'your requested property'}" — Rentivo`;
      htmlContent = generatePaymentSuccessEmailHtml({
        recipientName,
        propertyTitle: data.propertyTitle || "Verified Property",
        propertyArea: data.propertyArea || "Bodija",
        propertyPrice: data.propertyPrice || 850000,
        propertyType: data.propertyType || "2-Bedroom Self-Contain",
        propertyPhoto: data.propertyPhoto,
        requestUrl: data.requestUrl || "https://rentivos.com.ng",
        landlordName: data.landlordName || "Mr. Adewale Ogunleye",
        landlordPhone: data.landlordPhone || "0803 123 4567",
        landlordWhatsapp: data.landlordWhatsapp || "2348031234567",
        exactAddress: data.exactAddress || "12 Awolowo Close, off Awolowo Avenue, Bodija, Ibadan",
        paymentReference: data.paymentReference || "T240927-8841-RNT"
      });
    } else if (template === "refund_processed") {
      subject = `Refund Approved: ₦5,000 for "${data.propertyTitle || 'your requested property'}" — Rentivo`;
      htmlContent = generateRefundProcessedEmailHtml({
        recipientName,
        propertyTitle: data.propertyTitle || "Verified Property",
        propertyArea: data.propertyArea || "Bodija",
        originalTransaction: data.originalTransaction || "T240927-8841-RNT",
        refundReference: data.refundReference || "RF-240927-3319",
        browseUrl: data.browseUrl || "https://rentivos.com.ng"
      });
    } else if (template === "request_received" || template === "request_acknowledgment") {
      subject = `We're checking on this one for you: "${data.propertyTitle || 'your requested property'}" — Rentivo`;
      htmlContent = generateRequestReceivedEmailHtml({
        recipientName,
        propertyTitle: data.propertyTitle || "Verified Property",
        propertyArea: data.propertyArea || "Bodija",
        propertyPrice: data.propertyPrice || 850000,
        propertyType: data.propertyType || "2-Bedroom Self-Contain",
        propertyPhoto: data.propertyPhoto,
        trackUrl: data.trackUrl || data.requestUrl || "https://rentivos.com.ng",
        referenceId: data.referenceId || "RQ-20604"
      });
    } else if (template === "property_unavailable") {
      subject = `Update: "${data.propertyTitle || 'your requested property'}" is no longer available — Rentivo`;
      htmlContent = generatePropertyUnavailableEmailHtml({
        recipientName,
        propertyTitle: data.propertyTitle || "Verified Property",
        propertyArea: data.propertyArea || "Bodija",
        propertyPrice: data.propertyPrice || 850000,
        propertyType: data.propertyType || "2-Bedroom Self-Contain",
        propertyPhoto: data.propertyPhoto,
        browseUrl: data.browseUrl || "https://rentivos.com.ng",
        alternatives: data.alternatives
      });
    } else if (template === "landlord_vacancy_check" || template === "vacancy_check") {
      subject = `Action Required: Is "${data.propertyTitle || 'your requested property'}" still available? — Rentivo`;
      htmlContent = generateLandlordVacancyCheckEmailHtml({
        recipientName,
        renterName: data.renterName || "A verified renter",
        propertyTitle: data.propertyTitle || "Verified Property",
        propertyArea: data.propertyArea || "Bodija",
        propertyPrice: data.propertyPrice || 850000,
        propertyType: data.propertyType || "2-Bedroom Self-Contain",
        propertyPhoto: data.propertyPhoto,
        yesLink: data.yesLink || "https://rentivos.com.ng",
        noLink: data.noLink || "https://rentivos.com.ng",
        referenceId: data.referenceId || "RQ-20604"
      });
    } else if (template === "verification_approved") {
      subject = `Verified: "${data.propertyTitle || 'Your property'}" has been Emerald Verified! — Rentivo`;
      htmlContent = generateVerificationApprovedEmailHtml({
        recipientName,
        propertyTitle: data.propertyTitle || "Verified Property",
        propertyArea: data.propertyArea || "Bodija",
        propertyPrice: data.propertyPrice || 850000,
        propertyType: data.propertyType || "Flat",
        propertyPhoto: data.propertyPhoto,
        viewUrl: data.viewUrl || "https://rentivos.com.ng/properties",
        inspectorName: data.inspectorName || "Senior Field Auditor",
        auditorNotes: data.auditorNotes,
        referenceId: data.referenceId || "VR-AUDIT"
      });
    } else if (template === "verification_changes_requested") {
      subject = `Action Required: Verification feedback for "${data.propertyTitle || 'your property'}" — Rentivo`;
      htmlContent = generateVerificationChangesRequestedEmailHtml({
        recipientName,
        propertyTitle: data.propertyTitle || "Property",
        propertyArea: data.propertyArea || "Bodija",
        propertyPrice: data.propertyPrice || 850000,
        propertyType: data.propertyType || "Flat",
        propertyPhoto: data.propertyPhoto,
        editUrl: data.editUrl || "https://rentivos.com.ng/lister/listings",
        requestedItems: data.requestedItems || [],
        auditorNotes: data.auditorNotes,
        referenceId: data.referenceId || "VR-AUDIT"
      });
    } else if (template === "verification_rejected") {
      subject = `Verification decision regarding "${data.propertyTitle || 'your property'}" — Rentivo`;
      htmlContent = generateVerificationRejectedEmailHtml({
        recipientName,
        propertyTitle: data.propertyTitle || "Property",
        propertyArea: data.propertyArea || "Bodija",
        propertyPrice: data.propertyPrice || 850000,
        propertyType: data.propertyType || "Flat",
        propertyPhoto: data.propertyPhoto,
        reason: data.reason || "Physical audit criteria unfulfilled",
        auditorNotes: data.auditorNotes,
        supportUrl: data.supportUrl || "https://rentivos.com.ng/lister/listings",
        referenceId: data.referenceId || "VR-AUDIT"
      });
    } else if (template === "lister_unresponsive") {
      subject = `Update on your availability inquiry: ${data.propertyTitle || 'your requested property'} — Rentivo`;
      htmlContent = generateListerUnresponsiveEmailHtml({
        recipientName,
        propertyTitle: data.propertyTitle || "Verified Property",
        propertyArea: data.propertyArea || "Bodija",
        propertyPrice: data.propertyPrice || 850000,
        propertyType: data.propertyType || "Flat",
        propertyPhoto: data.propertyPhoto,
        listerName: data.listerName,
        browseUrl: data.browseUrl || "https://rentivos.com.ng/search",
        alternatives: data.alternatives
      });
    } else if (template === "admin_invitation") {
      subject = `Invitation to join Rentivo Administration Team — Rentivo`;
      htmlContent = generateAdminInvitationEmailHtml({
        recipientName,
        invitedByName: data.invitedByName || "Rentivo Operations",
        role: data.role || "admin",
        inviteUrl: data.inviteUrl || "https://rentivos.com.ng/admin/invite",
        notes: data.notes,
        expiresInDays: data.expiresInDays || 7
      });

    } else {
      return new Response(JSON.stringify({ success: false, error: `Unknown template: ${template}` }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" }
      });
    }

    // 1. If Brevo API key is configured and valid, forward via Brevo
    let brevoErrorMsg: string | undefined;
    if (BREVO_API_KEY && BREVO_API_KEY.trim().length > 5) {
      try {
        const brevoRes = await fetch("https://api.brevo.com/v3/smtp/email", {
          method: "POST",
          headers: {
            "api-key": BREVO_API_KEY.trim(),
            "Content-Type": "application/json",
            "accept": "application/json"
          },
          body: JSON.stringify({
            sender: DEFAULT_SENDER,
            to: [{ email: recipientEmail.trim(), name: recipientName.trim() }],
            subject,
            htmlContent
          })
        });

        const brevoData = await brevoRes.json().catch(() => ({}));
        if (brevoRes.ok) {
          return new Response(JSON.stringify({
            success: true,
            provider: "brevo",
            messageId: brevoData.messageId
          }), {
            status: 200,
            headers: { ...cors, "Content-Type": "application/json" }
          });
        }
        // Capture the specific Brevo error for propagation
        brevoErrorMsg = brevoData?.message
          ? `Brevo: ${brevoData.message} (${brevoData.code || brevoRes.status})`
          : `Brevo returned HTTP ${brevoRes.status}`;
        console.warn("Brevo API non-200 response:", brevoData);
      } catch (brevoErr: any) {
        brevoErrorMsg = `Brevo network error: ${brevoErr?.message || "unknown"}`;
        console.warn("Brevo fetch error:", brevoErr);
      }
    }

    // 2. For admin_invitation: try Supabase Auth inviteUserByEmail as a reliable fallback
    let supabaseAuthSent = false;
    if (template === "admin_invitation" && supabaseAdmin) {
      try {
        const { error: invErr } = await supabaseAdmin.auth.admin.inviteUserByEmail(
          recipientEmail.trim().toLowerCase(),
          {
            data: {
              role: data.role || "admin",
              full_name: recipientName.trim(),
              invited_by_name: data.invitedByName || "Rentivo Operations"
            },
            redirectTo: data.inviteUrl || "https://rentivos.com.ng/admin/invite"
          }
        );
        if (invErr) {
          console.warn("Supabase Auth inviteUserByEmail note:", invErr.message);
        } else {
          supabaseAuthSent = true;
          console.log("Supabase Auth native invite sent to:", recipientEmail);
        }
      } catch (authErr: any) {
        console.warn("Supabase Auth invite exception:", authErr?.message);
      }
    }

    // 3. Audit log (best effort — skip if supabaseAdmin not initialised)
    if (supabaseAdmin) {
      try {
        await supabaseAdmin.from("audit_logs").insert({
          action: "email_notification_dispatched",
          entity_type: template,
          metadata: {
            recipientEmail: recipientEmail.trim(),
            recipientName: recipientName.trim(),
            subject,
            template,
            referenceId: data.referenceId || null,
            role: data.role || null,
            brevoError: brevoErrorMsg || null,
            supabaseAuthSent,
            dispatchedAt: new Date().toISOString()
          }
        });
      } catch (auditErr: any) {
        console.warn("Audit log insert note:", auditErr?.message);
      }
    }

    // Determine delivery outcome
    const delivered = supabaseAuthSent;
    const emailError = !delivered && brevoErrorMsg
      ? `${brevoErrorMsg}. To fix: go to brevo.com → Settings → API Keys and enable "Transactional emails" scope on your key.`
      : undefined;

    if (emailError) {
      console.warn(`[send-email] Email NOT sent for "${template}" to ${recipientEmail}. Reason: ${emailError}`);
    } else {
      console.log(`[send-email] Notification "${template}" delivered for ${recipientEmail}`);
    }

    return new Response(JSON.stringify({
      success: true,
      delivered,
      mode: supabaseAuthSent ? "supabase_auth" : (brevoErrorMsg ? "failed_brevo_fallback" : "supabase_direct"),
      template,
      recipientEmail: recipientEmail.trim(),
      subject,
      ...(emailError ? { emailError } : {}),
      ...(brevoErrorMsg ? { brevoError: brevoErrorMsg } : {}),
      message: supabaseAuthSent
        ? "Invitation email sent via Supabase Auth"
        : emailError
          ? "Invitation created but email delivery failed — share the link manually"
          : "Notification recorded"
    }), {
      status: 200,
      headers: { ...cors, "Content-Type": "application/json" }
    });
  } catch (err: any) {
    console.error("Send-email Edge Function error:", err);
    return new Response(JSON.stringify({ success: false, error: err?.message || "Internal server error" }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" }
    });
  }
});
