import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ClientWithStats {
  id: string;
  name: string;
  cnpj: string | null;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  notes: string | null;
  created_at: string;
  proposal_count: number;
  project_count: number;
  total_value: number;
  won_value: number;
  last_proposal_date: string | null;
  is_active: boolean;
}

export function useClientsWithStats() {
  return useQuery({
    queryKey: ["clients-with-stats"],
    queryFn: async () => {
      const { data: clients, error: cErr } = await supabase
        .from("clients")
        .select("*")
        .order("name");
      if (cErr) throw cErr;

      const { data: proposals } = await supabase
        .from("proposals")
        .select("client_id, status, value, created_at");

      const { data: projects } = await supabase
        .from("projects")
        .select("client_id, etapa, etapa_assinado_at");

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

      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

      return (clients ?? []).map((c): ClientWithStats => {
        const cp = proposalsByClient.get(c.id) ?? [];
        const cProjects = projectsByClient.get(c.id) ?? [];
        const wonValues = cp
          .filter((p) => p.status === "ganha")
          .reduce((sum, p) => sum + (Number(p.value) || 0), 0);
        const totalValue = cp.reduce((sum, p) => sum + (Number(p.value) || 0), 0);
        const dates = cp.map((p) => p.created_at).sort();

        const hasActiveProposal = cp.some((p) => p.status === "em_elaboracao" || p.status === "em_negociacao");
        const hasActiveProject = cProjects.some((p) => p.etapa === "iniciado" || p.etapa === "minuta");
        const hasRecentSigned = cProjects.some((p) => {
          if (p.etapa !== "assinado" || !(p as any).etapa_assinado_at) return false;
          return new Date((p as any).etapa_assinado_at) >= threeMonthsAgo;
        });

        return {
          ...c,
          proposal_count: cp.length,
          project_count: cProjects.length,
          total_value: totalValue,
          won_value: wonValues,
          last_proposal_date: dates.length ? dates[dates.length - 1] : null,
          is_active: hasActiveProposal || hasActiveProject || hasRecentSigned,
        };
      });
    },
  });
}
