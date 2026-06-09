import { supabase } from "@/integrations/supabase/client";

interface ParcelaItem {
  descricao?: string;
  valor?: number;
  vencimento?: string;
}

// Para propostas por etapas (inicio/minuta/assinatura), previsão de NF é
// calculada a partir da data de aprovação:
//   inicio     -> data_aprovacao
//   minuta     -> data_aprovacao + 30 dias corridos
//   assinatura -> data_aprovacao + 60 dias corridos
// Se data_aprovacao não estiver preenchida, retorna null.
export function computeEtapaPrevisaoNf(
  descricao: string | undefined,
  dataAprovacao: string | null | undefined
): string | null {
  if (!dataAprovacao || !descricao) return null;
  const base = new Date(`${dataAprovacao}T00:00:00`);
  if (isNaN(base.getTime())) return null;
  let addDays = 0;
  switch (descricao) {
    case "inicio":
      addDays = 0;
      break;
    case "minuta":
      addDays = 30;
      break;
    case "assinatura":
      addDays = 60;
      break;
    default:
      return null;
  }
  const d = new Date(base);
  d.setDate(d.getDate() + addDays);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export async function generateReceivables(proposal: {
  id: string;
  client_id: string | null;
  value: number | null;
  parcelas: any;
  payment_type: string | null;
  data_aprovacao?: string | null;
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
    previsao_nf: string | null;
    status: string;
  }[] = [];

  const isEtapas = proposal.payment_type === "etapas";

  if (parcelas.length === 0) {
    records.push({
      proposal_id: proposal.id,
      client_id: proposal.client_id,
      parcela_index: 0,
      description: "Parcela Única",
      amount: totalValue,
      due_date: null,
      previsao_nf: null,
      status: "pendente",
    });
  } else {
    parcelas.forEach((p, i) => {
      const pct = p.valor || 0;
      const amount = Math.round((pct / 100) * totalValue * 100) / 100;
      const venc = p.vencimento || null;
      const descricao = p.descricao || `Parcela ${i + 1}`;
      // Para propostas por etapas, previsão de NF é derivada da data de aprovação.
      // Para propostas por prazo, o vencimento informado é a previsão de emissão da NF.
      const previsaoNf = isEtapas
        ? computeEtapaPrevisaoNf(p.descricao, proposal.data_aprovacao ?? null)
        : venc;
      records.push({
        proposal_id: proposal.id,
        client_id: proposal.client_id,
        parcela_index: i,
        description: descricao,
        amount,
        due_date: null,
        previsao_nf: previsaoNf,
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
