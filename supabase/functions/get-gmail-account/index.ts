// Edge Function: get-gmail-account
// Retorna o endereço Gmail conectado (via gmail.users.getProfile).

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GMAIL_GATEWAY = "https://connector-gateway.lovable.dev/google_mail/gmail/v1";
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const GOOGLE_MAIL_API_KEY = Deno.env.get("GOOGLE_MAIL_API_KEY");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  if (!LOVABLE_API_KEY || !GOOGLE_MAIL_API_KEY) {
    return new Response(JSON.stringify({ connected: false }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const res = await fetch(`${GMAIL_GATEWAY}/users/me/profile`, {
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": GOOGLE_MAIL_API_KEY,
      },
    });
    if (!res.ok) {
      const txt = await res.text();
      return new Response(JSON.stringify({ connected: false, error: txt }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const data = await res.json();
    return new Response(JSON.stringify({ connected: true, email: data.emailAddress }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ connected: false, error: e?.message || String(e) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
