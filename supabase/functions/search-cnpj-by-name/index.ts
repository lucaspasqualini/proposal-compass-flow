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

    // Use Casa dos Dados API for searching by company name
    const response = await fetch(
      "https://api.casadosdados.com.br/v2/cnpj",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: {
            termo: [nome],
            situacao_cadastral: "ATIVA",
          },
          range_query: {},
          extras: {},
          page: 1,
        }),
      }
    );

    if (!response.ok) {
      const text = await response.text();
      return new Response(
        JSON.stringify({ error: `API retornou ${response.status}`, detail: text }),
        { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();

    // Normalize results
    const results = (data.data?.cnpj || []).map((item: any) => ({
      cnpj: item.cnpj,
      razao_social: item.razao_social,
      nome_fantasia: item.nome_fantasia,
      municipio: item.municipio,
      uf: item.uf,
      situacao_cadastral: item.situacao_cadastral,
    }));

    return new Response(JSON.stringify({ results, total: data.data?.count || 0 }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Erro ao buscar CNPJ por nome" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
