import { createHmac, randomUUID } from "node:crypto";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS"
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: cors });
  }

  const privateKey = Deno.env.get("IMAGEKIT_PRIVATE_KEY") || "private_0RiBnIfaHaZ50e1mqrvcg64QftY=";

  const token = randomUUID();
  const expire = Math.floor(Date.now() / 1000) + 1800;
  const signature = createHmac("sha1", privateKey).update(token + expire).digest("hex");

  return new Response(
    JSON.stringify({
      token,
      expire,
      signature
    }),
    {
      headers: { ...cors, "Content-Type": "application/json" }
    }
  );
});
