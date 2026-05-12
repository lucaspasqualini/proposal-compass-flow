import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { fetchAllPaginated } from "@/lib/fetchAll";

type Project = Database["public"]["Tables"]["projects"]["Row"];
type ProjectInsert = Database["public"]["Tables"]["projects"]["Insert"];

// Lista enxuta — campos usados em listas e dashboard.
// Detalhes pesados (allocations + proposals scope/description) ficam em useProject(id).
const LIST_COLUMNS =
  "id, title, status, etapa, etapa_assinado_at, start_date, end_date, budget, created_at, updated_at, client_id, proposal_id, clients(name), proposals(proposal_number, tipo_projeto), project_allocations(team_member_id, team_members(id, name))";

export function useProjects() {
  return useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      return await fetchAllPaginated(() =>
        supabase
          .from("projects")
          .select(LIST_COLUMNS)
          .order("created_at", { ascending: false })
      );
    },
  });
}

export function useProject(id: string | undefined) {
  return useQuery({
    queryKey: ["projects", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("*, clients(id, name, cnpj), proposals(title, proposal_number, tipo_projeto, scope, description, value, payment_type, parcelas, data_aprovacao), project_allocations(id, team_member_id, team_members(id, name, role))")
        .eq("id", id!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (project: ProjectInsert) => {
      const { data, error } = await supabase.from("projects").insert(project).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["projects"] }),
  });
}

export function useUpdateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Project> & { id: string }) => {
      const { data, error } = await supabase.from("projects").update(updates).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      qc.setQueryData<any[]>(["projects"], (old) =>
        old ? old.map((p) => (p.id === data.id ? { ...p, ...data } : p)) : old
      );
      qc.invalidateQueries({ queryKey: ["projects", data.id] });
      // Etapa de projeto altera flags de receivables (precisaEmitir).
      if ("etapa" in (data as any)) {
        qc.invalidateQueries({ queryKey: ["receivables"] });
      }
    },
  });
}

export function useDeleteProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("projects").delete().eq("id", id);
      if (error) throw error;
      return id;
    },
    onSuccess: (id) => {
      qc.setQueryData<any[]>(["projects"], (old) => (old ? old.filter((p) => p.id !== id) : old));
    },
  });
}
