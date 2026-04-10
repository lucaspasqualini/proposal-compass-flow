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

    const encoded = encodeURIComponent(nome);

    // Try casadosdados.com.br API (POST-based search)
    try {
      const cdResponse = await fetch("https://api.casadosdados.com.br/v2/public/cnpj/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "Mozilla/5.0",
        },
        body: JSON.stringify({
          query: {
            termo: [nome],
            situacao_cadastral: "ATIVA",
          },
          range: { inicio: 0, fim: 10 },
        }),
      });

      if (cdResponse.ok) {
        const cdData = await cdResponse.json();
        if (cdData?.data?.cnpj && cdData.data.cnpj.length > 0) {
          const results = cdData.data.cnpj.map((item: any) => ({
            cnpj: item.cnpj || "",
            razao_social: item.razao_social || "",
            nome_fantasia: item.nome_fantasia || "",
            uf: item.uf || "",
            municipio: item.municipio || "",
            situacao_cadastral: item.situacao_cadastral || "",
            cnae_principal: item.cnae?.codigo || "",
            cnae_descricao: item.cnae?.descricao || "",
          }));
          return new Response(JSON.stringify({ results, source: "casadosdados" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }
    } catch (_) {
      // fallthrough to next API
    }

    // Fallback: cnpjs.dev open API
    try {
      const response = await fetch(
        `https://open.cnpjs.dev/office?company_name=${encoded}&limit=10`,
        { headers: { Accept: "application/json" } }
      );

      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data) && data.length > 0) {
          return new Response(JSON.stringify({ results: data, source: "cnpjs.dev" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }
    } catch (_) {
      // fallthrough
    }

    // No results found
    return new Response(
      JSON.stringify({ results: [], source: "none", message: "Nenhum resultado encontrado" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Erro ao buscar CNPJ por nome", detail: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
