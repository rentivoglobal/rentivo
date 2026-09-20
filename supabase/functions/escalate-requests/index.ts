import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );
  const { data, error } = await supabase.rpc("escalate_stale_requests", { p_hours: 2 });
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: cors });
  return new Response(JSON.stringify({ escalated: data }), { headers: { ...cors, "Content-Type": "application/json" } });
});
