import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle2, ArrowRight } from "lucide-react";
import { useProposals } from "@/hooks/useProposals";
import { useProjects } from "@/hooks/useProjects";
import { useReceivables } from "@/hooks/useReceivables";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

export default function AlertasTab() {
  const navigate = useNavigate();
  const { data: proposals } = useProposals();
  const { data: projects } = useProjects();
  const { data: receivables } = useReceivables();

  const alertas = useMemo(() => {
    const ps = proposals ?? [];
    const pj = projects ?? [];
    const rs = receivables ?? [];
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const items: {
      key: string;
      severity: "warn" | "danger";
      icon: React.ComponentType<{ className?: string }>;
      text: string;
      onClick: () => void;
    }[] = [];

    const fupVencidos = ps.filter(
      (p: any) =>
        p.data_fup &&
        new Date(p.data_fup) < hoje &&
        p.status !== "ganha" &&
        p.status !== "perdida"
    );
    if (fupVencidos.length)
      items.push({
        key: "fup",
        severity: "warn",
        icon: AlertTriangle,
        text: `${fupVencidos.length} proposta(s) com follow-up vencido`,
        onClick: () => navigate("/propostas"),
      });

    const recVencidos = rs.filter(
      (r: any) => r.status === "pendente" && r.due_date && new Date(r.due_date) < hoje
    );
    if (recVencidos.length) {
      const total = recVencidos.reduce((s: number, r: any) => s + (Number(r.amount) || 0), 0);
      items.push({
        key: "rec",
        severity: "danger",
        icon: AlertTriangle,
        text: `${recVencidos.length} recebível(is) vencido(s) — ${formatCurrency(total)}`,
        onClick: () => navigate("/contas-a-receber"),
      });
    }

    const trintaDias = new Date(hoje);
    trintaDias.setDate(trintaDias.getDate() - 30);
    const negociacaoParada = ps.filter(
      (p: any) =>
        p.status === "em_negociacao" &&
        p.updated_at &&
        new Date(p.updated_at) < trintaDias
    );
    if (negociacaoParada.length)
      items.push({
        key: "neg",
        severity: "warn",
        icon: AlertTriangle,
        text: `${negociacaoParada.length} proposta(s) em negociação há +30 dias sem atualização`,
        onClick: () => navigate("/propostas"),
      });

    const quatorzeDias = new Date(hoje);
    quatorzeDias.setDate(quatorzeDias.getDate() - 14);
    const projParado = pj.filter(
      (p: any) =>
        p.etapa === "iniciado" &&
        p.created_at &&
        new Date(p.created_at) < quatorzeDias
    );
    if (projParado.length)
      items.push({
        key: "proj",
        severity: "warn",
        icon: AlertTriangle,
        text: `${projParado.length} projeto(s) "iniciado" há +14 dias sem virar minuta`,
        onClick: () => navigate("/projetos"),
      });

    return items;
  }, [proposals, projects, receivables, navigate]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          Alertas
          {alertas.length > 0 && <Badge variant="destructive">{alertas.length}</Badge>}
        </CardTitle>
        <p className="text-xs text-muted-foreground">Sempre baseado em "agora"</p>
      </CardHeader>
      <CardContent>
        {alertas.length === 0 ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CheckCircle2 className="h-4 w-4 text-success" />
            Nada urgente. Tudo em dia.
          </div>
        ) : (
          <div className="space-y-2">
            {alertas.map((a) => (
              <button
                key={a.key}
                onClick={a.onClick}
                className={cn(
                  "w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-colors hover:bg-accent",
                  a.severity === "danger"
                    ? "border-destructive/30 bg-destructive/5"
                    : "border-warning/30 bg-warning/5"
                )}
              >
                <a.icon
                  className={cn(
                    "h-4 w-4 flex-shrink-0",
                    a.severity === "danger" ? "text-destructive" : "text-warning"
                  )}
                />
                <span className="text-sm flex-1">{a.text}</span>
                <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              </button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
