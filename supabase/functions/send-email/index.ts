import { cors, BREVO_API_KEY, DEFAULT_SENDER, supabaseAdmin } from "./common.ts";
import {
  generateLandlordVacancyCheckEmailHtml,
  generateAvailabilityEmailHtml,
  generatePaymentSuccessEmailHtml,
  generateRefundProcessedEmailHtml,
  generateRequestReceivedEmailHtml,
  generatePropertyUnavailableEmailHtml,
  generateListerUnresponsiveEmailHtml
} from "./renter_templates.ts";
import {
  generateVerificationApprovedEmailHtml,
  generateVerificationChangesRequestedEmailHtml,
  generateVerificationRejectedEmailHtml,
  generateAdminInvitationEmailHtml
} from "./admin_templates.ts";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function getRequestContext(requestId: unknown) {
  if (!supabaseAdmin || typeof requestId !== "string" || !UUID_PATTERN.test(requestId)) return null;
  const { data: request, error: requestError } = await supabaseAdmin
    .from("availability_requests")
    .select("id, listing_id, renter_user_id, renter_email, status")
    .eq("id", requestId)
    .maybeSingle();
  if (requestError || !request) return null;

  const { data: listing, error: listingError } = await supabaseAdmin
    .from("listings")
    .select("owner_user_id")
    .eq("id", request.listing_id)
    .maybeSingle();
  if (listingError || !listing) return null;

  const { data: owner, error: ownerError } = await supabaseAdmin
    .from("users")
    .select("email")
    .eq("id", listing.owner_user_id)
    .maybeSingle();
  if (ownerError || !owner) return null;
  return { request, listing, ownerEmail: owner.email as string };
}

async function getListingContext(listingId: unknown) {
  if (!supabaseAdmin || typeof listingId !== "string" || !UUID_PATTERN.test(listingId)) return null;
  const { data: listing, error: listingError } = await supabaseAdmin
    .from("listings")
    .select("id, owner_user_id")
    .eq("id", listingId)
    .maybeSingle();
  if (listingError || !listing) return null;

  const { data: owner, error: ownerError } = await supabaseAdmin
    .from("users")
    .select("email")
    .eq("id", listing.owner_user_id)
    .maybeSingle();
  if (ownerError || !owner) return null;
  return { listing, ownerEmail: owner.email as string };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ success: false, error: "Method not allowed." }), {
      status: 405,
      headers: { ...cors, "Content-Type": "application/json" }
    });
  }

  try {
    if (!supabaseAdmin) {
      return new Response(JSON.stringify({ success: false, error: "Email service is not configured." }), {
        status: 503,
        headers: { ...cors, "Content-Type": "application/json" }
      });
    }
    const accessToken = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
    if (!accessToken) {
      return new Response(JSON.stringify({ success: false, error: "Sign in before sending email." }), {
        status: 401,
        headers: { ...cors, "Content-Type": "application/json" }
      });
    }
    const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(accessToken);
    if (authError || !authData.user) {
      return new Response(JSON.stringify({ success: false, error: "Your session is invalid or expired." }), {
        status: 401,
        headers: { ...cors, "Content-Type": "application/json" }
      });
    }

    const body = await req.json().catch(() => ({}));
    const template = body?.template;
    const recipientEmail = typeof body?.recipientEmail === "string" ? body.recipientEmail.trim().toLowerCase() : "";
    let recipientName = typeof body?.recipientName === "string" ? body.recipientName.trim() : "Rentivo Member";
    let data = body?.data && typeof body.data === "object" && !Array.isArray(body.data) ? body.data : {};

    if (typeof template !== "string" || !template.trim()) {
      return new Response(JSON.stringify({ success: false, error: "A valid email template is required." }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" }
      });
    }

    if (!recipientEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipientEmail)) {
      return new Response(JSON.stringify({ success: false, error: "Recipient email is required" }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" }
      });
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("users")
      .select("role")
      .eq("id", authData.user.id)
      .maybeSingle();
    if (profileError || !profile) {
      return new Response(JSON.stringify({ success: false, error: "A valid Rentivo account is required to send this email." }), {
        status: 403,
        headers: { ...cors, "Content-Type": "application/json" }
      });
    }
    const callerIsAdmin = profile.role === "admin";
    const recipientMatches = (email: unknown) => typeof email === "string" && email.trim().toLowerCase() === recipientEmail;

    if (template === "admin_invitation") {
      if (!callerIsAdmin) {
        return new Response(JSON.stringify({ success: false, error: "Only a Rentivo administrator can send admin invitations." }), {
          status: 403,
          headers: { ...cors, "Content-Type": "application/json" }
        });
      }

      let inviteUrl: URL;
      try {
        inviteUrl = new URL(data.inviteUrl);
      } catch {
        return new Response(JSON.stringify({ success: false, error: "A valid admin invitation URL is required." }), {
          status: 400,
          headers: { ...cors, "Content-Type": "application/json" }
        });
      }
      const trustedOrigins = new Set([
        "https://rentivos.com.ng",
        "https://www.rentivos.com.ng",
        "http://localhost:5173"
      ]);
      const inviteToken = inviteUrl.searchParams.get("token");
      if (!trustedOrigins.has(inviteUrl.origin) || inviteUrl.pathname !== "/admin/invite" || inviteUrl.username || inviteUrl.password || !inviteToken) {
        return new Response(JSON.stringify({ success: false, error: "The invitation URL is not an approved Rentivo invite link." }), {
          status: 400,
          headers: { ...cors, "Content-Type": "application/json" }
        });
      }

      const { data: invitation, error: invitationError } = await supabaseAdmin
        .from("admin_invitations")
        .select("id, email, full_name, role, status, expires_at, invited_by_name")
        .eq("token", inviteToken)
        .maybeSingle();
      if (invitationError || !invitation || invitation.status !== "pending" || new Date(invitation.expires_at).getTime() <= Date.now()) {
        return new Response(JSON.stringify({ success: false, error: "This admin invitation is no longer pending or has expired." }), {
          status: 409,
          headers: { ...cors, "Content-Type": "application/json" }
        });
      }
      if (invitation.email.trim().toLowerCase() !== recipientEmail) {
        return new Response(JSON.stringify({ success: false, error: "The invitation email does not match the pending database invitation." }), {
          status: 400,
          headers: { ...cors, "Content-Type": "application/json" }
        });
      }

      recipientName = invitation.full_name;
      data = {
        ...data,
        role: invitation.role,
        inviteUrl: inviteUrl.toString(),
        invitedByName: invitation.invited_by_name || "Rentivo Operations",
        expiresInDays: 7
      };
    }

    if (template === "landlord_vacancy_check" || template === "vacancy_check") {
      const context = await getRequestContext(data.requestId);
      if (!context || context.request.renter_user_id !== authData.user.id || context.request.status !== "availability_pending" || !recipientMatches(context.ownerEmail)) {
        return new Response(JSON.stringify({ success: false, error: "This vacancy email is not authorized for the request or listing." }), {
          status: 403,
          headers: { ...cors, "Content-Type": "application/json" }
        });
      }
    } else if (template === "request_received" || template === "request_acknowledgment") {
      const context = await getRequestContext(data.requestId);
      if (!context || context.request.renter_user_id !== authData.user.id || !["availability_pending", "submitted"].includes(context.request.status) || !recipientMatches(context.request.renter_email)) {
        return new Response(JSON.stringify({ success: false, error: "This request confirmation is not authorized for the signed-in renter." }), {
          status: 403,
          headers: { ...cors, "Content-Type": "application/json" }
        });
      }
    } else if (template === "payment_success") {
      const context = await getRequestContext(data.requestId);
      if (!context || context.request.renter_user_id !== authData.user.id || context.request.status !== "paid" || !recipientMatches(context.request.renter_email)) {
        return new Response(JSON.stringify({ success: false, error: "A verified paid request for this renter is required before sending access details." }), {
          status: 403,
          headers: { ...cors, "Content-Type": "application/json" }
        });
      }
    } else if (template === "availability_confirmed" || template === "property_unavailable") {
      const context = await getRequestContext(data.requestId);
      const requiredStatus = template === "availability_confirmed" ? "confirmed" : "unavailable";
      if (!context || context.request.status !== requiredStatus || (!callerIsAdmin && context.listing.owner_user_id !== authData.user.id) || !recipientMatches(context.request.renter_email)) {
        return new Response(JSON.stringify({ success: false, error: "This listing update is not authorized for the request owner or renter." }), {
          status: 403,
          headers: { ...cors, "Content-Type": "application/json" }
        });
      }
    } else if (template === "refund_processed") {
      const context = await getRequestContext(data.requestId);
      const { data: refundedPayment, error: refundError } = context
        ? await supabaseAdmin.from("payments").select("id").eq("availability_request_id", context.request.id).eq("status", "refunded").limit(1).maybeSingle()
        : { data: null, error: null };
      if (!callerIsAdmin || !context || refundError || !refundedPayment || !recipientMatches(context.request.renter_email)) {
        return new Response(JSON.stringify({ success: false, error: "Only an administrator can notify the renter about a recorded refund." }), {
          status: 403,
          headers: { ...cors, "Content-Type": "application/json" }
        });
      }
    } else if (template === "lister_unresponsive") {
      const context = await getRequestContext(data.requestId);
      if (!callerIsAdmin || !context || context.request.status !== "unavailable" || !recipientMatches(context.request.renter_email)) {
        return new Response(JSON.stringify({ success: false, error: "Only an administrator can send this notification for a resolved request." }), {
          status: 403,
          headers: { ...cors, "Content-Type": "application/json" }
        });
      }
    } else if (["verification_approved", "verification_changes_requested", "verification_rejected"].includes(template)) {
      const context = await getListingContext(data.listingId);
      if (!callerIsAdmin || !context || !recipientMatches(context.ownerEmail)) {
        return new Response(JSON.stringify({ success: false, error: "Only an administrator can send verification updates to the listing owner." }), {
          status: 403,
          headers: { ...cors, "Content-Type": "application/json" }
        });
      }
    } else if (!["admin_invitation"].includes(template)) {
      return new Response(JSON.stringify({ success: false, error: "This email template is not authorized." }), {
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

    if (!BREVO_API_KEY || BREVO_API_KEY.trim().length < 10) {
      return new Response(JSON.stringify({ success: false, delivered: false, error: "Server-side transactional email is not configured." }), {
        status: 503,
        headers: { ...cors, "Content-Type": "application/json" }
      });
    }

    const brevoRes = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": BREVO_API_KEY.trim(),
        "Content-Type": "application/json",
        "accept": "application/json"
      },
      body: JSON.stringify({
        sender: DEFAULT_SENDER,
        to: [{ email: recipientEmail, name: recipientName || "Rentivo Member" }],
        subject,
        htmlContent
      })
    });

    const brevoData = await brevoRes.json().catch(() => ({}));
    if (!brevoRes.ok) {
      console.warn("Rentivo transactional email provider returned status", brevoRes.status);
      return new Response(JSON.stringify({ success: false, delivered: false, error: "The transactional email provider rejected delivery. Please retry later." }), {
        status: 502,
        headers: { ...cors, "Content-Type": "application/json" }
      });
    }

    const messageId = typeof brevoData?.messageId === "string" ? brevoData.messageId.trim() : "";
    if (!messageId) {
      console.warn("Rentivo transactional email provider returned 2xx without a message receipt");
      return new Response(JSON.stringify({ success: false, delivered: false, error: "The email provider did not confirm acceptance. Please retry later." }), {
        status: 502,
        headers: { ...cors, "Content-Type": "application/json" }
      });
    }

    try {
      await supabaseAdmin.from("audit_logs").insert({
        action: "email_notification_dispatched",
        entity_type: template,
        metadata: {
          template,
          userId: authData.user.id,
          referenceId: data.referenceId || null,
          role: data.role || null,
          dispatchedAt: new Date().toISOString()
        }
      });
    } catch (auditErr: any) {
      console.warn("Rentivo email audit insert failed:", auditErr?.message || "unknown error");
    }

    return new Response(JSON.stringify({
      success: true,
      delivered: true,
      provider: "brevo",
      messageId
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
