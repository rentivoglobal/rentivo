import {
  BREVO_API_KEY,
  cors,
  supabaseAdmin,
  SUPABASE_SERVICE_ROLE_KEY
} from "../send-email/common.ts";

const jsonHeaders = { ...cors, "Content-Type": "application/json" };
const MAX_SENDS_PER_HOUR = 3;
const MAX_ATTEMPTS = 10;
const CODE_TTL_MINUTES = 10;

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: jsonHeaders });
}

function normalizeNigerianPhone(value: string): string | null {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("0")) return `+234${digits.slice(1)}`;
  if (digits.length === 13 && digits.startsWith("234")) return `+${digits}`;
  if (digits.length === 10) return `+234${digits}`;
  return null;
}

function newCode(): string {
  const values = new Uint32Array(1);
  crypto.getRandomValues(values);
  return String(100000 + (values[0] % 900000));
}

async function codeDigest(userId: string, phone: string, code: string): Promise<string> {
  if (!SUPABASE_SERVICE_ROLE_KEY) throw new Error("Verification service is not configured.");
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(SUPABASE_SERVICE_ROLE_KEY),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(`${userId}:${phone}:${code}`)
  );
  return Array.from(new Uint8Array(signature), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function constantTimeEqual(left: string, right: string): boolean {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return jsonResponse({ success: false, error: "Method not allowed." }, 405);
  if (!supabaseAdmin) return jsonResponse({ success: false, error: "Phone verification service is not configured." }, 503);

  const accessToken = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
  if (!accessToken) return jsonResponse({ success: false, error: "Sign in before verifying your phone." }, 401);

  try {
    const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(accessToken);
    const user = authData.user;
    if (authError || !user) return jsonResponse({ success: false, error: "Your session is invalid or expired. Please sign in again." }, 401);

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("users")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    if (profileError || !profile || !["landlord", "agent"].includes(profile.role)) {
      return jsonResponse({ success: false, error: "Only signed-in Rentivo listers can verify a phone number." }, 403);
    }

    const body = await req.json().catch(() => ({}));
    const action = body?.action;
    if (action !== "send" && action !== "verify") {
      return jsonResponse({ success: false, error: "Choose a valid phone-verification action." }, 400);
    }

    const phone = typeof body?.phone === "string" ? normalizeNigerianPhone(body.phone) : null;
    if (!phone) return jsonResponse({ success: false, error: "Enter a valid Nigerian mobile number." }, 400);

    if (action === "send") {
      if (!BREVO_API_KEY || BREVO_API_KEY.trim().length < 10) {
        return jsonResponse({ success: false, error: "SMS delivery is not configured. Please contact Rentivo support." }, 503);
      }

      const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const { count, error: countError } = await supabaseAdmin
        .from("phone_verification_challenges")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .gte("created_at", since);
      if (countError) return jsonResponse({ success: false, error: "Could not start phone verification. Please try again." }, 500);
      if ((count || 0) >= MAX_SENDS_PER_HOUR) {
        return jsonResponse({ success: false, error: "Too many verification codes were requested. Please try again in an hour." }, 429);
      }

      const closedAt = new Date().toISOString();
      const { error: closeError } = await supabaseAdmin
        .from("phone_verification_challenges")
        .update({ attempts: MAX_ATTEMPTS, expires_at: closedAt })
        .eq("user_id", user.id);
      if (closeError) return jsonResponse({ success: false, error: "Could not start phone verification. Please try again." }, 500);

      const code = newCode();
      const digest = await codeDigest(user.id, phone, code);
      const expiresAt = new Date(Date.now() + CODE_TTL_MINUTES * 60 * 1000).toISOString();
      const { error: insertError } = await supabaseAdmin.from("phone_verification_challenges").insert({
        user_id: user.id,
        phone,
        code_hash: digest,
        attempts: 0,
        expires_at: expiresAt
      });
      if (insertError) return jsonResponse({ success: false, error: "Could not start phone verification. Please try again." }, 500);

      const smsResponse = await fetch("https://api.brevo.com/v3/transactionalSMS/sms", {
        method: "POST",
        headers: {
          "api-key": BREVO_API_KEY.trim(),
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({
          sender: "Rentivo",
          recipient: phone.replace(/\D/g, ""),
          type: "transactional",
          content: `Your Rentivo phone verification code is ${code}. It expires in ${CODE_TTL_MINUTES} minutes. Do not share it.`
        })
      });

      if (!smsResponse.ok) {
        await supabaseAdmin.from("phone_verification_challenges")
          .update({ attempts: MAX_ATTEMPTS, expires_at: new Date().toISOString() })
          .eq("user_id", user.id);
        console.warn("Rentivo phone verification SMS provider returned status", smsResponse.status);
        return jsonResponse({ success: false, error: "The SMS provider could not deliver the code. Please retry later." }, 502);
      }

      return jsonResponse({
        success: true,
        smsSent: true,
        emailSent: false,
        deliveryChannel: "sms",
        recipientFormatted: phone,
        recipientEmail: user.email || "",
        statusMessage: `A verification code was sent by SMS to ${phone}. It expires in ${CODE_TTL_MINUTES} minutes.`
      });
    }

    const cleanCode = typeof body?.code === "string" ? body.code.replace(/\D/g, "") : "";
    if (cleanCode.length !== 6) return jsonResponse({ success: false, error: "Enter the full 6-digit verification code." }, 400);

    const { data: challenge, error: challengeError } = await supabaseAdmin
      .from("phone_verification_challenges")
      .select("id, phone, code_hash, attempts, expires_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (challengeError || !challenge) return jsonResponse({ success: false, error: "No active phone-verification code was found. Request a new code." }, 400);
    if (challenge.phone !== phone) return jsonResponse({ success: false, error: "The code was sent to a different phone number. Request a new code." }, 400);
    if (new Date(challenge.expires_at).getTime() <= Date.now()) {
      return jsonResponse({ success: false, error: "This verification code has expired. Request a new one." }, 400);
    }
    if (challenge.attempts >= MAX_ATTEMPTS) {
      return jsonResponse({ success: false, error: "Too many incorrect codes. Request a new one." }, 429);
    }

    const expected = await codeDigest(user.id, phone, cleanCode);
    if (!constantTimeEqual(expected, challenge.code_hash)) {
      const nextAttempts = challenge.attempts + 1;
      if (nextAttempts >= MAX_ATTEMPTS) {
        await supabaseAdmin.from("phone_verification_challenges").update({ attempts: MAX_ATTEMPTS }).eq("id", challenge.id);
      } else {
        await supabaseAdmin.from("phone_verification_challenges").update({ attempts: nextAttempts }).eq("id", challenge.id);
      }
      return jsonResponse({ success: false, error: "Incorrect verification code. Please check the SMS and try again." }, 400);
    }

    const { error: updateError } = await supabaseAdmin
      .from("users")
      .update({ phone, whatsapp: phone, phone_verified_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq("id", user.id);
    if (updateError) return jsonResponse({ success: false, error: "The code was valid, but the profile could not be updated. Please retry." }, 500);

    await supabaseAdmin.from("phone_verification_challenges")
      .update({ attempts: MAX_ATTEMPTS, expires_at: new Date().toISOString() })
      .eq("id", challenge.id);
    return jsonResponse({ success: true, verified: true, phone });
  } catch (error) {
    console.error("Rentivo phone verification failed:", error instanceof Error ? error.message : "unknown error");
    return jsonResponse({ success: false, error: "Phone verification could not be completed. Please try again." }, 500);
  }
});
