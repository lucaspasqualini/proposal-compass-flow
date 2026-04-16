import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type TeamMember = Database["public"]["Tables"]["team_members"]["Row"];
type TeamMemberInsert = Database["public"]["Tables"]["team_members"]["Insert"];
type ProjectAllocation = Database["public"]["Tables"]["project_allocations"]["Row"];
type ProjectAllocationInsert = Database["public"]["Tables"]["project_allocations"]["Insert"];

export function useTeamMembers() {
  return useQuery({
    queryKey: ["team_members"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("team_members")
        .select("*")
        .order("name");
      if (error) throw error;
      return data as TeamMember[];
    },
  });
}

export function useCreateTeamMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (member: TeamMemberInsert) => {
      const { data, error } = await supabase.from("team_members").insert(member).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["team_members"] }),
  });
}

export function useUpdateTeamMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<TeamMember> & { id: string }) => {
      const { data, error } = await supabase.from("team_members").update(updates).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["team_members"] }),
  });
}

export function useDeleteTeamMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("team_members").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["team_members"] }),
  });
}

export function useProjectAllocations(projectId?: string) {
  return useQuery({
    queryKey: ["project_allocations", projectId],
    queryFn: async () => {
      let query = supabase
        .from("project_allocations")
        .select("*, team_members(name, role), projects(title)");
      if (projectId) query = query.eq("project_id", projectId);
      const { data, error } = await query.order("created_at");
      if (error) throw error;
      return data;
    },
  });
}

/**
 * Invalida todas as queries que embarcam project_allocations.
 * Usado após criar/remover alocações para garantir que UI fique sincronizada
 * em todas as abas (Projetos, Alocação, ProjectDetailDialog).
 */
function invalidateAllocationQueries(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ["project_allocations"] });
  qc.invalidateQueries({ queryKey: ["projects"] });
  qc.invalidateQueries({ queryKey: ["alocacao-projects"] });
}

export function useCreateAllocation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (allocation: ProjectAllocationInsert) => {
      const { data, error } = await supabase.from("project_allocations").insert(allocation).select().single();
      if (error) throw error;
      return data;
    },
    // Optimistic update: adiciona a alocação imediatamente nas listas de projetos
    onMutate: async (allocation) => {
      await Promise.all([
        qc.cancelQueries({ queryKey: ["projects"] }),
        qc.cancelQueries({ queryKey: ["alocacao-projects"] }),
      ]);

      const member = qc.getQueryData<TeamMember[]>(["team_members"])?.find(
        (m) => m.id === allocation.team_member_id
      );

      const tempAllocation = {
        id: `temp-${Date.now()}`,
        team_member_id: allocation.team_member_id,
        team_members: member
          ? { id: member.id, name: member.name, role: member.role }
          : null,
      };

      const snapshots: Array<[readonly unknown[], unknown]> = [];

      // Atualiza todas as queries que tenham project_allocations embarcadas
      qc.getQueriesData<any>({ queryKey: ["projects"] }).forEach(([key, data]) => {
        snapshots.push([key, data]);
        if (Array.isArray(data)) {
          qc.setQueryData(key, data.map((p: any) =>
            p.id === allocation.project_id
              ? { ...p, project_allocations: [...(p.project_allocations || []), tempAllocation] }
              : p
          ));
        } else if (data && data.id === allocation.project_id) {
          qc.setQueryData(key, {
            ...data,
            project_allocations: [...(data.project_allocations || []), tempAllocation],
          });
        }
      });

      qc.getQueriesData<any>({ queryKey: ["alocacao-projects"] }).forEach(([key, data]) => {
        snapshots.push([key, data]);
        if (Array.isArray(data)) {
          qc.setQueryData(key, data.map((p: any) =>
            p.id === allocation.project_id
              ? { ...p, project_allocations: [...(p.project_allocations || []), tempAllocation] }
              : p
          ));
        }
      });

      return { snapshots };
    },
    onError: (_err, _vars, ctx) => {
      ctx?.snapshots.forEach(([key, data]) => qc.setQueryData(key, data));
    },
    onSettled: () => invalidateAllocationQueries(qc),
  });
}

export function useDeleteAllocation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("project_allocations").delete().eq("id", id);
      if (error) throw error;
      return id;
    },
    // Optimistic remove: tira a alocação imediatamente das listas
    onMutate: async (allocationId) => {
      await Promise.all([
        qc.cancelQueries({ queryKey: ["projects"] }),
        qc.cancelQueries({ queryKey: ["alocacao-projects"] }),
      ]);

      const snapshots: Array<[readonly unknown[], unknown]> = [];

      qc.getQueriesData<any>({ queryKey: ["projects"] }).forEach(([key, data]) => {
        snapshots.push([key, data]);
        if (Array.isArray(data)) {
          qc.setQueryData(key, data.map((p: any) => ({
            ...p,
            project_allocations: (p.project_allocations || []).filter(
              (a: any) => a.id !== allocationId
            ),
          })));
        } else if (data && Array.isArray(data.project_allocations)) {
          qc.setQueryData(key, {
            ...data,
            project_allocations: data.project_allocations.filter(
              (a: any) => a.id !== allocationId
            ),
          });
        }
      });

      qc.getQueriesData<any>({ queryKey: ["alocacao-projects"] }).forEach(([key, data]) => {
        snapshots.push([key, data]);
        if (Array.isArray(data)) {
          qc.setQueryData(key, data.map((p: any) => ({
            ...p,
            project_allocations: (p.project_allocations || []).filter(
              (a: any) => a.id !== allocationId
            ),
          })));
        }
      });

      return { snapshots };
    },
    onError: (_err, _vars, ctx) => {
      ctx?.snapshots.forEach(([key, data]) => qc.setQueryData(key, data));
    },
    onSettled: () => invalidateAllocationQueries(qc),
  });
}
