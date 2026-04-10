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

    // Try BrasilAPI CNPJ search (requires exact CNPJ, so skip)
    // Try publica.cnpj.ws search by name
    try {
      const response = await fetch(
        `https://publica.cnpj.ws/cnpj/pesquisa?razao_social=${encoded}`,
        {
          headers: {
            Accept: "application/json",
            "User-Agent": "Mozilla/5.0 (compatible; LovableBot/1.0)",
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data) && data.length > 0) {
          const results = data.slice(0, 10).map((item: any) => ({
            cnpj: item.cnpj || item.cnpj_raiz || "",
            razao_social: item.razao_social || "",
            nome_fantasia: item.nome_fantasia || "",
            uf: item.uf || item.estado || "",
            municipio: item.municipio || item.cidade || "",
            situacao_cadastral: item.situacao_cadastral || item.situacao || "",
            cnae_principal: item.cnae_fiscal || "",
            cnae_descricao: item.cnae_fiscal_descricao || "",
          }));
          return new Response(JSON.stringify({ results, source: "cnpj.ws" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }
    } catch (_) {
      // fallthrough
    }

    // Fallback: ReceitaWS free API
    try {
      const response = await fetch(
        `https://receitaws.com.br/v1/cnpj/search?query=${encoded}`,
        {
          headers: {
            Accept: "application/json",
            "User-Agent": "Mozilla/5.0 (compatible; LovableBot/1.0)",
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        const items = Array.isArray(data) ? data : data?.results || [];
        if (items.length > 0) {
          const results = items.slice(0, 10).map((item: any) => ({
            cnpj: item.cnpj || "",
            razao_social: item.nome || item.razao_social || "",
            nome_fantasia: item.fantasia || item.nome_fantasia || "",
            uf: item.uf || "",
            municipio: item.municipio || "",
            situacao_cadastral: item.situacao || "",
            cnae_principal: item.atividade_principal?.[0]?.code || "",
            cnae_descricao: item.atividade_principal?.[0]?.text || "",
          }));
          return new Response(JSON.stringify({ results, source: "receitaws" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }
    } catch (_) {
      // fallthrough
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
