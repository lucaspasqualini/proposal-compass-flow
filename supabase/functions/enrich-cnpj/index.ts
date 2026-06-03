// Edge function: enrich a single CNPJ with BrasilAPI + Firecrawl (with Google CSE fallback)
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SOCIAL_DOMAINS = [
  "linkedin.com",
  "facebook.com",
  "instagram.com",
  "twitter.com",
  "x.com",
  "youtube.com",
  "glassdoor.com",
  "glassdoor.com.br",
  "indeed.com",
  "reclameaqui.com.br",
  "jusbrasil.com.br",
  "cnpj.biz",
  "econodata.com.br",
  "casadosdados.com.br",
  "empresaaqui.com.br",
  "cnpjs.rocks",
  "consultacnpj.com",
  "receitaws.com.br",
  "brasilapi.com.br",
  "serasaexperian.com.br",
  "wikipedia.org",
];

function rootDomain(url: string): string | null {
  try {
    const u = new URL(url.startsWith("http") ? url : `https://${url}`);
    return u.hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

function isSocialOrAggregator(url: string): boolean {
  const d = rootDomain(url);
  if (!d) return true;
  return SOCIAL_DOMAINS.some((s) => d === s || d.endsWith(`.${s}`));
}

async function fetchBrasilApi(cnpj: string) {
  const resp = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`);
  if (!resp.ok) return null;
  return await resp.json();
}

type SearchHit = { url: string; title?: string; description?: string };

async function firecrawlSearch(query: string, apiKey: string, limit = 5): Promise<SearchHit[]> {
  const resp = await fetch("https://api.firecrawl.dev/v2/search", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query, limit }),
  });
  if (resp.status === 402) {
    const err: any = new Error("firecrawl_credits");
    err.code = "no_credits";
    throw err;
  }
  if (!resp.ok) {
    const err: any = new Error(`firecrawl_${resp.status}`);
    err.code = resp.status >= 500 ? "server" : "client";
    throw err;
  }
  const data = await resp.json();
  // v2 may return { data: { web: [...] } } or { web: [...] }
  const web = data?.data?.web ?? data?.web ?? data?.data ?? [];
  return (Array.isArray(web) ? web : []).map((r: any) => ({
    url: r.url,
    title: r.title,
    description: r.description,
  }));
}

async function googleSearch(query: string, apiKey: string, cx: string, limit = 5): Promise<SearchHit[]> {
  const url = `https://www.googleapis.com/customsearch/v1?key=${encodeURIComponent(apiKey)}&cx=${encodeURIComponent(cx)}&q=${encodeURIComponent(query)}&num=${limit}`;
  const resp = await fetch(url);
  if (!resp.ok) {
    throw new Error(`google_${resp.status}`);
  }
  const data = await resp.json();
  const items = data?.items ?? [];
  return items.map((r: any) => ({ url: r.link, title: r.title, description: r.snippet }));
}

async function runSearch(
  query: string,
  fcKey: string | undefined,
  googleKey: string | undefined,
  googleCx: string | undefined,
  state: { firecrawlExhausted: boolean },
): Promise<{ hits: SearchHit[]; source: "firecrawl" | "google" | "none" }> {
  if (fcKey && !state.firecrawlExhausted) {
    try {
      const hits = await firecrawlSearch(query, fcKey);
      return { hits, source: "firecrawl" };
    } catch (e: any) {
      if (e?.code === "no_credits") {
        state.firecrawlExhausted = true;
      } else {
        // network/server error → try fallback too
      }
    }
  }
  if (googleKey && googleCx) {
    try {
      const hits = await googleSearch(query, googleKey, googleCx);
      return { hits, source: "google" };
    } catch {
      return { hits: [], source: "none" };
    }
  }
  return { hits: [], source: "none" };
}

function pickSite(hits: SearchHit[]): string | null {
  for (const h of hits) {
    if (!h.url) continue;
    if (isSocialOrAggregator(h.url)) continue;
    const d = rootDomain(h.url);
    if (!d) continue;
    return `https://${d}`;
  }
  return null;
}

function pickLinkedIn(hits: SearchHit[]): string | null {
  for (const h of hits) {
    if (!h.url) continue;
    const d = rootDomain(h.url);
    if (!d || (d !== "linkedin.com" && !d.endsWith(".linkedin.com"))) continue;
    if (!/\/company\//i.test(h.url) && !/\/school\//i.test(h.url)) continue;
    // strip query/fragments
    try {
      const u = new URL(h.url);
      return `${u.origin}${u.pathname.replace(/\/$/, "")}`;
    } catch {
      return h.url;
    }
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const cnpjRaw = String(body?.cnpj ?? "");
    const cnpj = cnpjRaw.replace(/\D/g, "");

    if (cnpj.length !== 14) {
      return new Response(
        JSON.stringify({ error: "CNPJ deve conter 14 dígitos", cnpj: cnpjRaw }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const fcKey = Deno.env.get("FIRECRAWL_API_KEY");
    const googleKey = Deno.env.get("GOOGLE_CSE_API_KEY");
    const googleCx = Deno.env.get("GOOGLE_CSE_CX");

    const result: any = {
      cnpj,
      razao_social: "",
      nome_fantasia: "",
      cnae: "",
      industria: "",
      site: null,
      linkedin: null,
      sources: { site: "none", linkedin: "none", cadastro: "none" },
      errors: [] as string[],
    };

    // 1. BrasilAPI
    const cadastro = await fetchBrasilApi(cnpj);
    if (cadastro) {
      result.razao_social = cadastro.razao_social || "";
      result.nome_fantasia = cadastro.nome_fantasia || "";
      result.cnae = String(cadastro.cnae_fiscal || "");
      result.industria = cadastro.cnae_fiscal_descricao || "";
      result.sources.cadastro = "brasilapi";
    } else {
      result.errors.push("brasilapi_not_found");
    }

    // Best query name: razão social ou nome fantasia; sem isso pulamos buscas web
    const name = (result.nome_fantasia || result.razao_social || "").trim();

    if (name) {
      const state = { firecrawlExhausted: false };

      // 2. Site oficial
      const siteQuery = `"${name}" site oficial`;
      const siteRes = await runSearch(siteQuery, fcKey, googleKey, googleCx, state);
      result.site = pickSite(siteRes.hits);
      result.sources.site = result.site ? siteRes.source : "none";

      // 3. LinkedIn
      const liQuery = `"${name}" site:linkedin.com/company`;
      const liRes = await runSearch(liQuery, fcKey, googleKey, googleCx, state);
      result.linkedin = pickLinkedIn(liRes.hits);
      result.sources.linkedin = result.linkedin ? liRes.source : "none";

      if (state.firecrawlExhausted) result.errors.push("firecrawl_credits_exhausted");
    } else {
      result.errors.push("no_company_name");
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err?.message || "internal_error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
