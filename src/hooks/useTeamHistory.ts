import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type PromotionHistory = Database["public"]["Tables"]["promotion_history"]["Row"];
type PromotionInsert = Database["public"]["Tables"]["promotion_history"]["Insert"];
type BonusHistory = Database["public"]["Tables"]["bonus_history"]["Row"];
type BonusInsert = Database["public"]["Tables"]["bonus_history"]["Insert"];

export function usePromotionHistory(memberId?: string) {
  return useQuery({
    queryKey: ["promotion_history", memberId],
    enabled: !!memberId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("promotion_history")
        .select("*")
        .eq("team_member_id", memberId!)
        .order("effective_date", { ascending: false });
      if (error) throw error;
      return data as PromotionHistory[];
    },
  });
}

export function useCreatePromotion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (promo: PromotionInsert) => {
      const { data, error } = await supabase.from("promotion_history").insert(promo).select().single();
      if (error) throw error;

      // Update team member's current role and salary
      const updatePayload: Database["public"]["Tables"]["team_members"]["Update"] = { role: promo.new_role };
      if (promo.new_salary != null) updatePayload.salary = promo.new_salary;
      const { error: updateErr } = await supabase
        .from("team_members")
        .update(updatePayload)
        .eq("id", promo.team_member_id);
      if (updateErr) throw updateErr;

      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["promotion_history", vars.team_member_id] });
      qc.invalidateQueries({ queryKey: ["team_members"] });
    },
  });
}

export function useDeletePromotion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, memberId }: { id: string; memberId: string }) => {
      const { error } = await supabase.from("promotion_history").delete().eq("id", id);
      if (error) throw error;
      return memberId;
    },
    onSuccess: (memberId) => {
      qc.invalidateQueries({ queryKey: ["promotion_history", memberId] });
    },
  });
}

export function useBonusHistory(memberId?: string) {
  return useQuery({
    queryKey: ["bonus_history", memberId],
    enabled: !!memberId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bonus_history")
        .select("*")
        .eq("team_member_id", memberId!)
        .order("reference_year", { ascending: false });
      if (error) throw error;
      return data as BonusHistory[];
    },
  });
}

export function useCreateBonus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (bonus: BonusInsert) => {
      const { data, error } = await supabase.from("bonus_history").insert(bonus).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["bonus_history", vars.team_member_id] });
    },
  });
}

export function useDeleteBonus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, memberId }: { id: string; memberId: string }) => {
      const { error } = await supabase.from("bonus_history").delete().eq("id", id);
      if (error) throw error;
      return memberId;
    },
    onSuccess: (memberId) => {
      qc.invalidateQueries({ queryKey: ["bonus_history", memberId] });
    },
  });
}
