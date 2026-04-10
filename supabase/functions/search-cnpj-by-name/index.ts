const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const nome = url.searchParams.get("nome")?.trim();

    if (!nome || nome.length < 3) {
      return new Response(
        JSON.stringify({ error: "Nome deve ter pelo menos 3 caracteres" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Try cnpjs.dev open API
    const encoded = encodeURIComponent(nome);
    const response = await fetch(
      `https://open.cnpjs.dev/office?company_name=${encoded}&limit=5`,
      { headers: { "Accept": "application/json" } }
    );

    if (!response.ok) {
      // Fallback: try Minha Receita API
      const fallback = await fetch(
        `https://minhareceita.org/?nome=${encoded}`,
        { headers: { "Accept": "application/json" } }
      );
      
      if (!fallback.ok) {
        const text = await fallback.text();
        return new Response(
          JSON.stringify({ error: `APIs retornaram erro`, detail: text }),
          { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      const fdata = await fallback.json();
      return new Response(JSON.stringify({ results: Array.isArray(fdata) ? fdata : [fdata], source: "minhareceita" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    return new Response(JSON.stringify({ results: data, source: "cnpjs.dev" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Erro ao buscar CNPJ por nome", detail: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
