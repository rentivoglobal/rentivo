// Deprecated: public account creation must go through Supabase Auth signUp so
// the configured email-confirmation and callback flow cannot be bypassed.
Deno.serve(async (req) => {
  const cors = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json"
  };

  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  return new Response(JSON.stringify({
    success: false,
    error: "This signup endpoint is disabled. Use Rentivo's native email-confirmation flow."
  }), {
    status: 410,
    headers: cors
  });
});
