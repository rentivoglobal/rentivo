import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import ImageKit from "npm:imagekit";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const imagekit = new ImageKit({
    publicKey: Deno.env.get("IMAGEKIT_PUBLIC_KEY") ?? "",
    privateKey: Deno.env.get("IMAGEKIT_PRIVATE_KEY") ?? "",
    urlEndpoint: Deno.env.get("IMAGEKIT_URL_ENDPOINT") ?? ""
  });

  const auth = imagekit.getAuthenticationParameters();
  return new Response(JSON.stringify(auth), {
    headers: { ...cors, "Content-Type": "application/json" }
  });
});
