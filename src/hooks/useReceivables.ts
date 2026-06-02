import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { fetchAllPaginated } from "@/lib/fetchAll";

export function useReceivables() {
  return useQuery({
    queryKey: ["receivables"],
    queryFn: async () => {
      return await fetchAllPaginated(() =>
        supabase
          .from("receivables")
          .select("*, proposals(proposal_number, title, empresa, tipo_projeto, payment_type), clients(id, name, cnpj, razao_social, contact_name, email, cnpjs_vinculados)")
          .order("due_date", { ascending: true, nullsFirst: false })
          .order("id", { ascending: true })
      );
    },
  });
}

export function useUpdateReceivable() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: {
      id: string;
      status?: string;
      paid_at?: string | null;
      notes?: string | null;
      invoice_date?: string | null;
      due_date?: string | null;
      previsao_nf?: string | null;
      nfe_number?: string | null;
      billing_cnpj?: string | null;
      billing_razao_social?: string | null;
      cofins?: number | null;
      csll?: number | null;
      irpj?: number | null;
      pis?: number | null;
      responsavel_projeto?: string | null;
    }) => {
      const { data, error } = await supabase
        .from("receivables")
        .update(updates)
        .eq("id", id)
        .select("*, proposals(proposal_number, title, empresa, tipo_projeto, payment_type), clients(id, name, cnpj, razao_social, contact_name, email, cnpjs_vinculados)")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      qc.setQueryData<any[]>(["receivables"], (old) =>
        old ? old.map((r) => (r.id === (data as any).id ? { ...r, ...(data as any) } : r)) : old
      );
    },
  });
}

export type BulkReceivableUpdate = {
  id: string;
  status?: string;
  paid_at?: string | null;
  invoice_date?: string | null;
  due_date?: string | null;
  previsao_nf?: string | null;
  nfe_number?: string | null;
};

export function useBulkUpdateReceivables() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (updates: BulkReceivableUpdate[]) => {
      const errors: { id: string; error: string }[] = [];
      const succeeded: BulkReceivableUpdate[] = [];

      // Paralelo em lotes para não estourar conexões nem travar a UI.
      const BATCH = 10;
      for (let i = 0; i < updates.length; i += BATCH) {
        const slice = updates.slice(i, i + BATCH);
        const results = await Promise.all(
          slice.map(async (u) => {
            const { id, ...patch } = u;
            const { error } = await supabase.from("receivables").update(patch).eq("id", id);
            return { u, error };
          })
        );
        for (const { u, error } of results) {
          if (error) errors.push({ id: u.id, error: error.message });
          else succeeded.push(u);
        }
      }
      return { ok: succeeded.length, errors, succeeded };
    },
    onSuccess: ({ succeeded }) => {
      if (succeeded.length === 0) return;
      // Atualiza in-place no cache em vez de refetch da lista inteira (~1.9k linhas).
      const byId = new Map(succeeded.map((u) => [u.id, u]));
      qc.setQueryData<any[]>(["receivables"], (old) =>
        old
          ? old.map((r) => {
              const patch = byId.get(r.id);
              if (!patch) return r;
              const { id: _omit, ...rest } = patch;
              return { ...r, ...rest };
            })
          : old
      );
    },
  });
}
