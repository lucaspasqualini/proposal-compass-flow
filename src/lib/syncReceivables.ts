import { supabase } from "@/integrations/supabase/client";

interface ParcelaItem {
  descricao?: string;
  valor?: number;
  vencimento?: string;
}

export async function generateReceivables(proposal: {
  id: string;
  client_id: string | null;
  value: number | null;
  parcelas: any;
  payment_type: string | null;
}) {
  const parcelas: ParcelaItem[] = Array.isArray(proposal.parcelas) ? proposal.parcelas : [];
  const totalValue = proposal.value || 0;

  const records: {
    proposal_id: string;
    client_id: string | null;
    parcela_index: number;
    description: string;
    amount: number;
    due_date: string | null;
    status: string;
  }[] = [];

  if (parcelas.length === 0) {
    records.push({
      proposal_id: proposal.id,
      client_id: proposal.client_id,
      parcela_index: 0,
      description: "Parcela Única",
      amount: totalValue,
      due_date: null,
      status: "pendente",
    });
  } else {
    parcelas.forEach((p, i) => {
      const pct = p.valor || 0;
      const amount = Math.round((pct / 100) * totalValue * 100) / 100;
      records.push({
        proposal_id: proposal.id,
        client_id: proposal.client_id,
        parcela_index: i,
        description: p.descricao || `Parcela ${i + 1}`,
        amount,
        due_date: p.vencimento || null,
        status: "pendente",
      });
    });
  }

  if (records.length > 0) {
    const { error } = await supabase.from("receivables").insert(records);
    if (error) throw error;
  }
}

export async function deleteReceivables(proposalId: string) {
  const { error } = await supabase
    .from("receivables")
    .delete()
    .eq("proposal_id", proposalId);
  if (error) throw error;
}
