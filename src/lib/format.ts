export function formatCurrency(value: number | null | undefined): string {
  if (value == null) return "—";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export function formatDate(date: string | null | undefined): string {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("pt-BR");
}

export const proposalStatusLabels: Record<string, string> = {
  em_elaboracao: "Em Elaboração",
  em_negociacao: "Em Negociação",
  ganha: "Ganha",
  perdida: "Perdida",
};
export const projectStatusLabels: Record<string, string> = {
  em_andamento: "Em Andamento",
  em_pausa: "Em Pausa",
  aguardando_retorno: "Aguardando Retorno",
  finalizado: "Finalizado",
};

export const projectEtapaLabels: Record<string, string> = {
  iniciado: "Iniciado",
  minuta: "Minuta",
  assinado: "Assinado",
};

export const proposalStatusColors: Record<string, string> = {
  em_elaboracao: "bg-muted text-muted-foreground",
  em_negociacao: "bg-warning/10 text-warning",
  ganha: "bg-success/10 text-success",
  perdida: "bg-destructive/10 text-destructive",
};

export const projectStatusColors: Record<string, string> = {
  em_andamento: "bg-info/10 text-info",
  em_pausa: "bg-warning/10 text-warning",
  aguardando_retorno: "bg-muted text-muted-foreground",
  finalizado: "bg-success/10 text-success",
};

export const projectEtapaColors: Record<string, string> = {
  iniciado: "bg-info/10 text-info",
  minuta: "bg-warning/10 text-warning",
  assinado: "bg-success/10 text-success",
};
