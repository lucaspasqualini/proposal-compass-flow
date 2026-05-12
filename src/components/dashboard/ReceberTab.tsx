import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  BarChart,
  AreaChart,
  Area,
} from "recharts";
import { useReceivables } from "@/hooks/useReceivables";
import { formatCurrency } from "@/lib/format";
import { AlertTriangle, FileWarning, DollarSign } from "lucide-react";
import { KpiCard } from "./_shared";
import { monthKey, monthLabel } from "@/lib/dashboardFilters";

const ETAPA_RANK: Record<string, number> = { iniciado: 1, minuta: 2, assinado: 3 };
const PARCELA_ETAPA_RANK: Record<string, number> = { inicio: 1, minuta: 2, assinatura: 3 };

export default function ReceberTab() {
  const { data: receivables } = useReceivables();
  const navigate = useNavigate();

  // Previsto vs Recebido nos últimos 6 meses (por due_date)
  const mensal = useMemo(() => {
    const rs = receivables ?? [];
    const now = new Date();
    const months: { key: string; label: string; previsto: number; recebido: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "");
      const previsto = rs
        .filter((r: any) => r.due_date?.startsWith(key))
        .reduce((s, r: any) => s + (Number(r.amount) || 0), 0);
      const recebido = rs
        .filter((r: any) => r.paid_at?.startsWith(key))
        .reduce((s, r: any) => s + (Number(r.valor_recebido ?? r.amount) || 0), 0);
      months.push({ key, label, previsto, recebido });
    }
    return months;
  }, [receivables]);

  // Aging dos atrasados
  const aging = useMemo(() => {
    const rs = receivables ?? [];
    const hoje = new Date();
    const buckets = { "0-30": 0, "31-60": 0, "61-90": 0, "+90": 0 };
    for (const r of rs as any[]) {
      if (r.status !== "pendente" || !r.due_date) continue;
      const due = new Date(r.due_date);
      if (due >= hoje) continue;
      const days = Math.floor((+hoje - +due) / (1000 * 60 * 60 * 24));
      const v = Number(r.amount) || 0;
      if (days <= 30) buckets["0-30"] += v;
      else if (days <= 60) buckets["31-60"] += v;
      else if (days <= 90) buckets["61-90"] += v;
      else buckets["+90"] += v;
    }
    return Object.entries(buckets).map(([label, valor]) => ({ label, valor }));
  }, [receivables]);

  // A emitir (etapa) — proposta com payment_type=etapas e projeto já avançou
  const aEmitir = useMemo(() => {
    const rs = receivables ?? [];
    return rs.filter((r: any) => {
      if (r.status !== "pendente") return false;
      const proposal = r.proposals;
      if (!proposal || proposal.payment_type !== "etapas") return false;
      // r.parcela_label may be 'inicio'|'minuta'|'assinatura'
      const parcelaRank = PARCELA_ETAPA_RANK[r.parcela_label?.toLowerCase?.() ?? ""];
      if (!parcelaRank) return false;
      // Need project etapa from clients/projects? Use receivable join? receivable has no project etapa.
      // Approximation: flag if due_date is passed OR parcela for fase inicio/minuta when most projects move forward
      // Without project join here, use due_date proxy.
      return r.due_date && new Date(r.due_date) <= new Date();
    });
  }, [receivables]);

  // Top devedores
  const topDevedores = useMemo(() => {
    const rs = receivables ?? [];
    const map = new Map<string, { name: string; valor: number }>();
    for (const r of rs as any[]) {
      if (r.status !== "pendente") continue;
      const name = r.clients?.name || "—";
      const cur = map.get(name) ?? { name, valor: 0 };
      cur.valor += Number(r.amount) || 0;
      map.set(name, cur);
    }
    return Array.from(map.values()).sort((a, b) => b.valor - a.valor).slice(0, 8);
  }, [receivables]);

  // Próximos 6 meses (forward-looking) — vindo da Visão Geral
  const cashflow = useMemo(() => {
    const rs = receivables ?? [];
    const months: { key: string; label: string; previsto: number; recebido: number }[] = [];
    const now = new Date();
    for (let i = -1; i < 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      months.push({ key: monthKey(d), label: monthLabel(d), previsto: 0, recebido: 0 });
    }
    const idx = new Map(months.map((m, i) => [m.key, i]));
    for (const r of rs as any[]) {
      const amount = Number(r.amount) || 0;
      if (r.status === "pendente" && r.due_date) {
        const d = new Date(r.due_date);
        const i = idx.get(monthKey(d));
        if (i != null) months[i].previsto += amount;
      }
      if (r.status === "pago" && r.paid_at) {
        const d = new Date(r.paid_at);
        const i = idx.get(monthKey(d));
        if (i != null) months[i].recebido += amount;
      }
    }
    return months;
  }, [receivables]);

  // A receber 30 dias (vindo da Visão Geral)
  const aReceber30 = useMemo(() => {
    const hoje = new Date();
    const em30 = new Date();
    em30.setDate(hoje.getDate() + 30);
    return (receivables ?? [])
      .filter(
        (r: any) =>
          r.status === "pendente" &&
          r.due_date &&
          new Date(r.due_date) <= em30 &&
          new Date(r.due_date) >= new Date(hoje.toDateString())
      )
      .reduce((s: number, r: any) => s + (Number(r.amount) || 0), 0);
  }, [receivables]);

  const totalAtrasado = aging.reduce((s, b) => s + b.valor, 0);
  const totalPendente = useMemo(
    () =>
      (receivables ?? [])
        .filter((r: any) => r.status === "pendente")
        .reduce((s, r: any) => s + (Number(r.amount) || 0), 0),
    [receivables]
  );
  const totalRecebidoMes = mensal[mensal.length - 1]?.recebido ?? 0;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <KpiCard
          label="A receber (30 dias)"
          value={formatCurrency(aReceber30)}
          delta={null}
          icon={DollarSign}
          accent="bg-warning/10 text-warning"
          hint="pendentes até 30 dias"
        />
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground font-medium">Total pendente</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalPendente)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground font-medium">Atrasado</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{formatCurrency(totalAtrasado)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground font-medium">Recebido (mês atual)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{formatCurrency(totalRecebidoMes)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground font-medium flex items-center gap-1">
              <FileWarning className="h-3.5 w-3.5" /> A emitir
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">{aEmitir.length}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Previsto vs Recebido (últimos 6 meses)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart data={mensal}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={11} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", fontSize: 12 }}
                formatter={(v: any) => formatCurrency(v)}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="previsto" name="Previsto" fill="hsl(var(--info))" radius={[4, 4, 0, 0]} />
              <Line type="monotone" dataKey="recebido" name="Recebido" stroke="hsl(var(--success))" strokeWidth={2} />
            </ComposedChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" /> Aging de atrasos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={aging}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", fontSize: 12 }}
                  formatter={(v: any) => formatCurrency(v)}
                />
                <Bar dataKey="valor" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top clientes pendentes</CardTitle>
          </CardHeader>
          <CardContent>
            {topDevedores.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem pendências.</p>
            ) : (
              <ul className="divide-y">
                {topDevedores.map((c) => (
                  <li
                    key={c.name}
                    className="py-2 flex items-center justify-between gap-2 hover:bg-muted/50 cursor-pointer px-2 -mx-2 rounded"
                    onClick={() => navigate("/contas-a-receber")}
                  >
                    <span className="text-sm font-medium truncate">{c.name}</span>
                    <Badge variant="outline" className="text-xs whitespace-nowrap">
                      {formatCurrency(c.valor)}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
