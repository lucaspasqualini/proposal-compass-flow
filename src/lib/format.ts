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
  planejamento: "Planejamento",
  em_andamento: "Em Andamento",
  pausado: "Pausado",
  concluido: "Concluído",
  cancelado: "Cancelado",
};

export const proposalStatusColors: Record<string, string> = {
  rascunho: "bg-muted text-muted-foreground",
  enviada: "bg-info/10 text-info",
  em_analise: "bg-warning/10 text-warning",
  em_negociacao: "bg-warning/10 text-warning",
  aprovada: "bg-success/10 text-success",
  ganha: "bg-success/10 text-success",
  rejeitada: "bg-destructive/10 text-destructive",
  perdida: "bg-destructive/10 text-destructive",
};

export const projectStatusColors: Record<string, string> = {
  planejamento: "bg-muted text-muted-foreground",
  em_andamento: "bg-info/10 text-info",
  pausado: "bg-warning/10 text-warning",
  concluido: "bg-success/10 text-success",
  cancelado: "bg-destructive/10 text-destructive",
};
