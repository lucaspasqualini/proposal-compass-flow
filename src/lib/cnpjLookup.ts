// Helper para consultar dados de um CNPJ via edge function `search-cnpj`.
// Reutilizado pelo card de Contas a Receber para enriquecer CNPJs vinculados.
export interface CnpjLookupResult {
  cnpj: string;
  razao_social: string;
  nome_fantasia: string;
}

export async function lookupCnpj(cnpj: string): Promise<CnpjLookupResult | null> {
  const digits = (cnpj || "").replace(/\D/g, "");
  if (digits.length !== 14) return null;
  try {
    const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
    const url = `https://${projectId}.supabase.co/functions/v1/search-cnpj?cnpj=${digits}`;
    const response = await fetch(url, {
      headers: { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
    });
    if (!response.ok) return null;
    const data = await response.json();
    return {
      cnpj: digits,
      razao_social: data?.razao_social || "",
      nome_fantasia: data?.nome_fantasia || "",
    };
  } catch {
    return null;
  }
}
