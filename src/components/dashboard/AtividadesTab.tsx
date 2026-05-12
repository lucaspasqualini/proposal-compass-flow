import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, FileText, FileSignature, DollarSign } from "lucide-react";
import { useProposals } from "@/hooks/useProposals";
import { useProjects } from "@/hooks/useProjects";
import { useReceivables } from "@/hooks/useReceivables";
import { formatCurrency, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useDashboardPeriod } from "./_shared";

export default function AtividadesTab() {
  const navigate = useNavigate();
  const { data: proposals } = useProposals();
  const { data: projects } = useProjects();
  const { data: receivables } = useReceivables();
  const { range, inCurrent } = useDashboardPeriod();

  const atividade = useMemo(() => {
    type Item = {
      key: string;
      date: string;
      icon: React.ComponentType<{ className?: string }>;
      text: string;
      onClick: () => void;
      color: string;
    };
    const items: Item[] = [];
    for (const p of (proposals ?? []) as any[]) {
      if (p.status === "ganha" && p.data_aprovacao && inCurrent(p.data_aprovacao)) {
        items.push({
          key: `prop-ganha-${p.id}`,
          date: p.data_aprovacao,
          icon: CheckCircle2,
          color: "text-success",
          text: `Proposta ganha: ${p.title} — ${formatCurrency(Number(p.value) || 0)}`,
          onClick: () => navigate("/propostas"),
        });
      }
      if (inCurrent(p.created_at)) {
        items.push({
          key: `prop-new-${p.id}`,
          date: p.created_at,
          icon: FileText,
          color: "text-info",
          text: `Nova proposta: ${p.title}`,
          onClick: () => navigate("/propostas"),
        });
      }
    }
    for (const pj of (projects ?? []) as any[]) {
      if (pj.etapa === "assinado" && pj.etapa_assinado_at && inCurrent(pj.etapa_assinado_at)) {
        items.push({
          key: `proj-ass-${pj.id}`,
          date: pj.etapa_assinado_at,
          icon: FileSignature,
          color: "text-primary",
          text: `Projeto assinado: ${pj.title}`,
          onClick: () => navigate("/projetos"),
        });
      }
    }
    for (const r of (receivables ?? []) as any[]) {
      if (r.status === "pago" && r.paid_at && inCurrent(r.paid_at)) {
        items.push({
          key: `rec-pago-${r.id}`,
          date: r.paid_at,
          icon: DollarSign,
          color: "text-success",
          text: `Recebimento: ${formatCurrency(Number(r.amount) || 0)}`,
          onClick: () => navigate("/contas-a-receber"),
        });
      }
    }
    items.sort((a, b) => +new Date(b.date) - +new Date(a.date));
    return items.slice(0, 30);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [proposals, projects, receivables, navigate, range]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Atividade recente</CardTitle>
        <p className="text-xs text-muted-foreground">No período selecionado</p>
      </CardHeader>
      <CardContent>
        {atividade.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Sem atividade registrada no período.
          </p>
        ) : (
          <ol className="relative border-l border-border ml-2 space-y-4">
            {atividade.map((a) => (
              <li key={a.key} className="ml-4">
                <div className="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full bg-card border-2 border-primary" />
                <button
                  onClick={a.onClick}
                  className="text-left w-full hover:bg-accent/50 rounded p-2 -mx-2 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <a.icon className={cn("h-4 w-4", a.color)} />
                    <span className="text-sm">{a.text}</span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5 ml-6">
                    {formatDate(a.date)}
                  </div>
                </button>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
