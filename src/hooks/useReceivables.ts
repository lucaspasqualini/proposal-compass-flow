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
          .select("*, proposals(proposal_number, title, empresa, tipo_projeto, payment_type), clients(name, cnpj, contact_name, email)")
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
      cofins?: number | null;
      csll?: number | null;
      irpj?: number | null;
      pis?: number | null;
    }) => {
      const { data, error } = await supabase
        .from("receivables")
        .update(updates)
        .eq("id", id)
        .select("*, proposals(proposal_number, title, empresa, tipo_projeto, payment_type), clients(name, cnpj, contact_name, email)")
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
