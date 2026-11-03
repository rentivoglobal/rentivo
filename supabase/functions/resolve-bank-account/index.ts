const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS"
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: cors });
  }

  try {
    const PAYSTACK_SECRET_KEY = Deno.env.get("PAYSTACK_SECRET_KEY") || "";
    if (!PAYSTACK_SECRET_KEY) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "PAYSTACK_SECRET_KEY secret is not configured in Supabase. Please set it in Supabase Project Settings > Edge Functions."
        }),
        {
          status: 500,
          headers: { ...cors, "Content-Type": "application/json" }
        }
      );
    }

    const { accountNumber, bankCode, bankName, listerName } = await req.json().catch(() => ({}));

    const cleanAcc = (accountNumber || "").toString().trim();
    const cleanBankCode = (bankCode || "").toString().trim();

    if (!cleanAcc || cleanAcc.length !== 10 || !/^\d{10}$/.test(cleanAcc)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Please provide a valid 10-digit NUBAN account number."
        }),
        {
          status: 400,
          headers: { ...cors, "Content-Type": "application/json" }
        }
      );
    }

    if (!cleanBankCode) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Please select a bank with a valid bank code."
        }),
        {
          status: 400,
          headers: { ...cors, "Content-Type": "application/json" }
        }
      );
    }

    // Call Paystack Bank NUBAN Resolution API
    const paystackUrl = `https://api.paystack.co/bank/resolve?account_number=${encodeURIComponent(cleanAcc)}&bank_code=${encodeURIComponent(cleanBankCode)}`;
    const paystackRes = await fetch(paystackUrl, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${PAYSTACK_SECRET_KEY}`,
        "Content-Type": "application/json",
        "Accept": "application/json"
      }
    });

    const paystackJson = await paystackRes.json().catch(() => null);

    if (!paystackRes.ok || !paystackJson?.status || !paystackJson?.data?.account_name) {
      const errMsg = paystackJson?.message || "Could not resolve account name. Please verify your 10-digit account number and bank.";
      return new Response(
        JSON.stringify({
          success: false,
          error: errMsg
        }),
        {
          status: 400,
          headers: { ...cors, "Content-Type": "application/json" }
        }
      );
    }

    const resolvedAccountName = paystackJson.data.account_name.trim();

    // Calculate name match similarity between lister's entered profile name and official bank account name
    const cleanListerName = (listerName || "").toString().trim().toUpperCase();
    const cleanResolvedName = resolvedAccountName.toUpperCase();

    const listerTokens = cleanListerName.split(/[^A-Z0-9]+/).filter((t) => t.length > 1);
    const resolvedTokens = cleanResolvedName.split(/[^A-Z0-9]+/).filter((t) => t.length > 1);

    let matchedTokenCount = 0;
    for (const token of listerTokens) {
      if (resolvedTokens.some((r) => r.includes(token) || token.includes(r))) {
        matchedTokenCount++;
      }
    }

    const similarity = listerTokens.length > 0 
      ? Math.round((matchedTokenCount / listerTokens.length) * 100) 
      : 100;

    const isMatch = similarity >= 50;
    const maskedAccount = cleanAcc.slice(0, 2) + "******" + cleanAcc.slice(8);

    return new Response(
      JSON.stringify({
        success: true,
        accountName: resolvedAccountName,
        accountNumber: cleanAcc,
        bankCode: cleanBankCode,
        bankName: bankName || "Selected Bank",
        matched: isMatch,
        similarity,
        maskedAccount
      }),
      {
        status: 200,
        headers: { ...cors, "Content-Type": "application/json" }
      }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({
        success: false,
        error: err?.message || "An unexpected error occurred during account resolution."
      }),
      {
        status: 500,
        headers: { ...cors, "Content-Type": "application/json" }
      }
    );
  }
});

