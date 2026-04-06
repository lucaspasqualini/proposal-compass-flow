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
  em_elaboracao: "bg-muted text-muted-foreground",
  em_negociacao: "bg-warning/10 text-warning",
  ganha: "bg-success/10 text-success",
  perdida: "bg-destructive/10 text-destructive",
};

export const projectStatusColors: Record<string, string> = {
  planejamento: "bg-muted text-muted-foreground",
  em_andamento: "bg-info/10 text-info",
  pausado: "bg-warning/10 text-warning",
  concluido: "bg-success/10 text-success",
  cancelado: "bg-destructive/10 text-destructive",
};
