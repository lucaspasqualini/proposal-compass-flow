import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { fetchAllPaginated } from "@/lib/fetchAll";

export interface ClientWithStats {
  id: string;
  name: string;
  cnpj: string | null;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  notes: string | null;
  setor: string | null;
  subsetor: string | null;
  uf: string | null;
  created_at: string;
  proposal_count: number;
  project_count: number;
  total_value: number;
  won_value: number;
  last_proposal_date: string | null;
  last_proposal_id: string | null;
  last_project_id: string | null;
  last_project_title: string | null;
  last_project_number: string | null;
  is_active: boolean;
}

export function useClientsWithStats() {
  return useQuery({
    queryKey: ["clients-with-stats"],
    queryFn: async () => {
      const clients = await fetchAllPaginated<any>(() =>
        supabase.from("clients").select("*").order("name")
      );

      const proposals = await fetchAllPaginated<any>(() =>
        supabase.from("proposals").select("id, client_id, status, value, created_at")
      );

      const projects = await fetchAllPaginated<any>(() =>
        supabase.from("projects").select("id, title, project_number, client_id, etapa, etapa_assinado_at, created_at")
      );

      const proposalsByClient = new Map<string, typeof proposals>();
      for (const p of proposals ?? []) {
        if (!p.client_id) continue;
        if (!proposalsByClient.has(p.client_id)) proposalsByClient.set(p.client_id, []);
        proposalsByClient.get(p.client_id)!.push(p);
      }

      const projectsByClient = new Map<string, typeof projects>();
      for (const p of projects ?? []) {
        if (!p.client_id) continue;
        if (!projectsByClient.has(p.client_id)) projectsByClient.set(p.client_id, []);
        projectsByClient.get(p.client_id)!.push(p);
      }

      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      return (clients ?? []).map((c): ClientWithStats => {
        const cp = [...(proposalsByClient.get(c.id) ?? [])].sort((a, b) =>
          (b.created_at ?? "").localeCompare(a.created_at ?? "")
        );
        const cProjects = [...(projectsByClient.get(c.id) ?? [])].sort((a, b) =>
          (b.created_at ?? "").localeCompare(a.created_at ?? "")
        );
        const wonValues = cp
          .filter((p) => p.status === "ganha")
          .reduce((sum, p) => sum + (Number(p.value) || 0), 0);
        const totalValue = cp.reduce((sum, p) => sum + (Number(p.value) || 0), 0);

        const lastProposal = cp[0] ?? null;
        const lastProject = cProjects[0] ?? null;

        // Ativo = tem proposta ou projeto criado nos últimos 6 meses
        const hasRecent =
          cp.some((p) => p.created_at && new Date(p.created_at) >= sixMonthsAgo) ||
          cProjects.some((p) => p.created_at && new Date(p.created_at) >= sixMonthsAgo);

        return {
          ...c,
          proposal_count: cp.length,
          project_count: cProjects.length,
          total_value: totalValue,
          won_value: wonValues,
          last_proposal_date: lastProposal?.created_at ?? null,
          last_proposal_id: lastProposal?.id ?? null,
          last_project_id: lastProject?.id ?? null,
          last_project_title: lastProject?.title ?? null,
          is_active: hasRecent,
        };
      });
    },
  });
}
