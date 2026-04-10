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
    const errors: string[] = [];

    // 1) Try cnpj.ws public search
    try {
      const resp = await fetch(`https://publica.cnpj.ws/cnpj/pesquisa?razao_social=${encoded}`, {
        headers: { Accept: "application/json" },
      });
      console.log(`cnpj.ws status: ${resp.status}`);
      if (resp.ok) {
        const data = await resp.json();
        if (Array.isArray(data) && data.length > 0) {
          const results = data.slice(0, 10).map((item: any) => ({
            cnpj: item.cnpj || "",
            razao_social: item.razao_social || "",
            nome_fantasia: item.nome_fantasia || "",
            uf: item.uf || "",
            municipio: item.municipio || "",
            situacao_cadastral: item.situacao_cadastral || "",
          }));
          return new Response(JSON.stringify({ results, source: "cnpj.ws" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      } else {
        errors.push(`cnpj.ws: ${resp.status}`);
      }
    } catch (e) {
      errors.push(`cnpj.ws: ${e}`);
    }

    // 2) Try casadosdados
    try {
      const resp = await fetch("https://api.casadosdados.com.br/v2/public/cnpj/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: { termo: [nome], situacao_cadastral: "ATIVA" },
          range: { inicio: 0, fim: 10 },
        }),
      });
      console.log(`casadosdados status: ${resp.status}`);
      if (resp.ok) {
        const cdData = await resp.json();
        if (cdData?.data?.cnpj?.length > 0) {
          const results = cdData.data.cnpj.map((item: any) => ({
            cnpj: item.cnpj || "",
            razao_social: item.razao_social || "",
            nome_fantasia: item.nome_fantasia || "",
            uf: item.uf || "",
            municipio: item.municipio || "",
            situacao_cadastral: item.situacao_cadastral || "",
          }));
          return new Response(JSON.stringify({ results, source: "casadosdados" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      } else {
        errors.push(`casadosdados: ${resp.status}`);
      }
    } catch (e) {
      errors.push(`casadosdados: ${e}`);
    }

    // 3) Try cnpjs.dev
    try {
      const resp = await fetch(`https://open.cnpjs.dev/office?company_name=${encoded}&limit=10`, {
        headers: { Accept: "application/json" },
      });
      console.log(`cnpjs.dev status: ${resp.status}`);
      if (resp.ok) {
        const data = await resp.json();
        if (Array.isArray(data) && data.length > 0) {
          return new Response(JSON.stringify({ results: data, source: "cnpjs.dev" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      } else {
        errors.push(`cnpjs.dev: ${resp.status}`);
      }
    } catch (e) {
      errors.push(`cnpjs.dev: ${e}`);
    }

    console.log("All APIs failed or returned empty:", errors);

    return new Response(
      JSON.stringify({ results: [], source: "none", message: "Nenhum resultado encontrado", debug: errors }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Erro ao buscar CNPJ por nome", detail: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
