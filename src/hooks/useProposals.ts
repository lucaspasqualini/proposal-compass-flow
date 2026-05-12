import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { fetchAllPaginated } from "@/lib/fetchAll";

type Proposal = Database["public"]["Tables"]["proposals"]["Row"];
type ProposalInsert = Database["public"]["Tables"]["proposals"]["Insert"];

const LIST_COLUMNS =
  "id, proposal_number, title, status, value, created_at, updated_at, client_id, payment_type, parcelas, tipo_projeto, data_envio, data_aprovacao, data_fup, validity_date, empresa, cliente_contato, indicador, observacoes, clients(name)";

export function useProposals() {
  return useQuery({
    queryKey: ["proposals"],
    queryFn: async () => {
      return await fetchAllPaginated(() =>
        supabase
          .from("proposals")
          .select(LIST_COLUMNS)
          .order("created_at", { ascending: false })
      );
    },
  });
}

export function useProposal(id: string | undefined) {
  return useQuery({
    queryKey: ["proposals", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("proposals")
        .select("*, clients(name)")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateProposal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (proposal: ProposalInsert) => {
      const { data, error } = await supabase.from("proposals").insert(proposal).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["proposals"] }),
  });
}

export function useUpdateProposal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Proposal> & { id: string }) => {
      const { data, error } = await supabase.from("proposals").update(updates).eq("id", id).select("*, clients(name)").single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      qc.setQueryData<any[]>(["proposals"], (old) =>
        old ? old.map((p) => (p.id === data.id ? { ...p, ...data } : p)) : old
      );
      qc.setQueryData(["proposals", data.id], data);
    },
  });
}

export function useDeleteProposal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("proposals").delete().eq("id", id);
      if (error) throw error;
      return id;
    },
    onSuccess: (id) => {
      qc.setQueryData<any[]>(["proposals"], (old) => (old ? old.filter((p) => p.id !== id) : old));
    },
  });
}
