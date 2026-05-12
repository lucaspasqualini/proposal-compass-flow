import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useReceivables() {
  return useQuery({
    queryKey: ["receivables"],
    queryFn: async () => {
      const PAGE = 1000;
      let offset = 0;
      const all: any[] = [];
      while (true) {
        const { data, error } = await supabase
          .from("receivables")
          .select("*, proposals(proposal_number, title, empresa, tipo_projeto, payment_type, projects(etapa, status)), clients(name, cnpj, contact_name, email)")
          .order("due_date", { ascending: true, nullsFirst: false })
          .order("id", { ascending: true })
          .range(offset, offset + PAGE - 1);
        if (error) throw error;
        if (!data || data.length === 0) break;
        all.push(...data);
        if (data.length < PAGE) break;
        offset += PAGE;
      }
      return all;
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
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["receivables"] }),
  });
}
