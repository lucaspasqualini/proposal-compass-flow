import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type Proposal = Database["public"]["Tables"]["proposals"]["Row"];
type ProjectStatus = Database["public"]["Enums"]["project_status"];

type ProjectSyncAction = "created" | "reactivated" | "cancelled" | null;

type ProposalForSync = Pick<Proposal, "id" | "status" | "title" | "client_id" | "description" | "value">;

export async function syncProposalProjectStatus({
  proposal,
  previousStatus,
}: {
  proposal: ProposalForSync;
  previousStatus?: Proposal["status"] | null;
}): Promise<ProjectSyncAction> {
  if (!proposal.id || previousStatus === proposal.status) return null;

  if (proposal.status === "ganha" && previousStatus !== "ganha") {
    const { data: existingProjects, error: fetchError } = await supabase
      .from("projects")
      .select("id")
      .eq("proposal_id", proposal.id)
      .order("created_at", { ascending: true });

    if (fetchError) throw fetchError;

    if (existingProjects.length > 0) {
      const { error: updateError } = await supabase
        .from("projects")
        .update({ status: "em_andamento" satisfies ProjectStatus })
        .eq("proposal_id", proposal.id);

      if (updateError) throw updateError;
      return "reactivated";
    }

    const { error: createError } = await supabase.from("projects").insert({
      title: proposal.title,
      client_id: proposal.client_id,
      proposal_id: proposal.id,
      description: proposal.description,
      budget: proposal.value,
      status: "em_andamento",
    });

    if (createError) throw createError;
    return "created";
  }

  if (previousStatus === "ganha" && proposal.status !== "ganha") {
    const { error: deleteError } = await supabase
      .from("projects")
      .delete()
      .eq("proposal_id", proposal.id);

    if (deleteError) throw deleteError;
    return "cancelled";
  }

  return null;
}