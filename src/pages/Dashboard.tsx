import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  AreaChart,
  Area,
  Legend,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Plus,
  FileText,
  FolderKanban,
  DollarSign,
  Target,
  AlertTriangle,
  CheckCircle2,
  Circle,
  FileSignature,
  ArrowRight,
} from "lucide-react";
import { useProposals } from "@/hooks/useProposals";
import { useProjects } from "@/hooks/useProjects";
import { useClients } from "@/hooks/useClients";
import { useReceivables } from "@/hooks/useReceivables";
import { usePersistedState } from "@/hooks/usePersistedState";
import {
  formatCurrency,
  formatDate,
  proposalStatusLabels,
  projectEtapaLabels,
} from "@/lib/format";
import { cn } from "@/lib/utils";

type PeriodKey = "mes" | "trimestre" | "ano" | "tudo";

const PERIOD_OPTIONS: { value: PeriodKey; label: string }[] = [
  { value: "mes", label: "Este mês" },
  { value: "trimestre", label: "Últimos 3 meses" },
  { value: "ano", label: "Este ano" },
  { value: "tudo", label: "Tudo" },
];

function getPeriodRange(period: PeriodKey): {
  start: Date | null;
  end: Date;
  prevStart: Date | null;
  prevEnd: Date | null;
} {
  const now = new Date();
  const end = new Date();
  if (period === "tudo") {
    return { start: null, end, prevStart: null, prevEnd: null };
  }
  if (period === "mes") {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
    return { start, end, prevStart, prevEnd };
  }
  if (period === "trimestre") {
    const start = new Date(now);
    start.setMonth(start.getMonth() - 3);
    const prevEnd = new Date(start);
    const prevStart = new Date(start);
    prevStart.setMonth(prevStart.getMonth() - 3);
    return { start, end, prevStart, prevEnd };
  }
  // ano
  const start = new Date(now.getFullYear(), 0, 1);
  const prevStart = new Date(now.getFullYear() - 1, 0, 1);
  const prevEnd = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59);
  return { start, end, prevStart, prevEnd };
}

function inRange(dateStr: string | null | undefined, start: Date | null, end: Date | null): boolean {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  if (start && d < start) return false;
  if (end && d > end) return false;
  return true;
}

function pctDelta(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return ((current - previous) / previous) * 100;
}

// ─────────────────────────── KPI Card ───────────────────────────
function KpiCard({
  label,
  value,
  delta,
  icon: Icon,
  accent,
  onClick,
  hint,
}: {
  label: string;
  value: string;
  delta: number | null;
  icon: React.ComponentType<{ className?: string }>;
  accent: string;
  onClick?: () => void;
  hint?: string;
}) {
  const deltaColor =
    delta == null
      ? "text-muted-foreground"
      : delta > 0
      ? "text-success"
      : delta < 0
      ? "text-destructive"
      : "text-muted-foreground";
  const DeltaIcon =
    delta == null ? Minus : delta > 0 ? TrendingUp : delta < 0 ? TrendingDown : Minus;

  return (
    <Card
      onClick={onClick}
      className={cn(
        "cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5",
        !onClick && "cursor-default"
      )}
    >
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {label}
        </CardTitle>
        <div className={cn("h-8 w-8 rounded-md flex items-center justify-center", accent)}>
          <Icon className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <div className="flex items-center gap-1 mt-1">
          <DeltaIcon className={cn("h-3 w-3", deltaColor)} />
          <span className={cn("text-xs font-medium", deltaColor)}>
            {delta == null
              ? "—"
              : `${delta > 0 ? "+" : ""}${delta.toFixed(1)}%`}
          </span>
          <span className="text-xs text-muted-foreground">
            {hint ?? "vs. período anterior"}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

// ─────────────────────────── Página ───────────────────────────
export default function Dashboard() {
  const navigate = useNavigate();
  const [period, setPeriod] = usePersistedState<PeriodKey>("dashboard:period", "ano");
  const range = useMemo(() => getPeriodRange(period), [period]);

  const { data: proposals } = useProposals();
  const { data: projects } = useProjects();
  const { data: clients } = useClients();
  const { data: receivables } = useReceivables();

  // ─── KPIs ───
  const kpis = useMemo(() => {
    const ps = proposals ?? [];
    const rs = receivables ?? [];

    const inCurrent = (d?: string | null) => inRange(d, range.start, range.end);
    const inPrev = (d?: string | null) =>
      range.prevStart && range.prevEnd
        ? inRange(d, range.prevStart, range.prevEnd)
        : false;

    const sumGanha = (predicate: (p: typeof ps[number]) => boolean) =>
      ps
        .filter((p) => p.status === "ganha" && predicate(p))
        .reduce((s, p) => s + (Number(p.value) || 0), 0);

    const receitaAtual = sumGanha((p) => inCurrent(p.data_aprovacao ?? p.created_at));
    const receitaPrev = sumGanha((p) => inPrev(p.data_aprovacao ?? p.created_at));

    const pipelineAtivo = ps
      .filter((p) => p.status === "em_elaboracao" || p.status === "em_negociacao")
      .reduce((s, p) => s + (Number(p.value) || 0), 0);

    const decididasCurrent = ps.filter(
      (p) =>
        (p.status === "ganha" || p.status === "perdida") &&
        inCurrent(p.data_aprovacao ?? p.updated_at ?? p.created_at)
    );
    const ganhasCurrent = decididasCurrent.filter((p) => p.status === "ganha").length;
    const conversaoAtual = decididasCurrent.length
      ? (ganhasCurrent / decididasCurrent.length) * 100
      : 0;

    const decididasPrev = ps.filter(
      (p) =>
        (p.status === "ganha" || p.status === "perdida") &&
        inPrev(p.data_aprovacao ?? p.updated_at ?? p.created_at)
    );
    const ganhasPrev = decididasPrev.filter((p) => p.status === "ganha").length;
    const conversaoPrev = decididasPrev.length
      ? (ganhasPrev / decididasPrev.length) * 100
      : 0;

    const hoje = new Date();
    const em30 = new Date();
    em30.setDate(hoje.getDate() + 30);
    const aReceber30 = rs
      .filter(
        (r) =>
          r.status === "pendente" &&
          r.due_date &&
          new Date(r.due_date) <= em30 &&
          new Date(r.due_date) >= new Date(hoje.toDateString())
      )
      .reduce((s, r) => s + (Number(r.amount) || 0), 0);

    return {
      receita: { value: receitaAtual, delta: pctDelta(receitaAtual, receitaPrev) },
      pipeline: { value: pipelineAtivo },
      conversao: {
        value: conversaoAtual,
        delta:
          range.prevStart && decididasPrev.length
            ? conversaoAtual - conversaoPrev
            : null,
      },
      aReceber: { value: aReceber30 },
    };
  }, [proposals, receivables, range]);

  // ─── Pipeline de propostas ───
  const pipelineData = useMemo(() => {
    const ps = proposals ?? [];
    const buckets: Record<string, { qtd: number; valor: number }> = {
      em_elaboracao: { qtd: 0, valor: 0 },
      em_negociacao: { qtd: 0, valor: 0 },
      ganha: { qtd: 0, valor: 0 },
      perdida: { qtd: 0, valor: 0 },
    };
    for (const p of ps) {
      if (!buckets[p.status]) continue;
      buckets[p.status].qtd += 1;
      buckets[p.status].valor += Number(p.value) || 0;
    }
    return Object.entries(buckets).map(([status, v]) => ({
      status,
      label: proposalStatusLabels[status] ?? status,
      qtd: v.qtd,
      valor: v.valor,
    }));
  }, [proposals]);

  // ─── Funil de projetos ───
  const projetosFunil = useMemo(() => {
    const pj = projects ?? [];
    const etapas: Record<string, { qtd: number; valor: number }> = {
      iniciado: { qtd: 0, valor: 0 },
      minuta: { qtd: 0, valor: 0 },
      assinado: { qtd: 0, valor: 0 },
    };
    for (const p of pj) {
      const e = (p.etapa ?? "iniciado") as keyof typeof etapas;
      if (!etapas[e]) continue;
      etapas[e].qtd += 1;
      etapas[e].valor += Number(p.budget) || 0;
    }
    return etapas;
  }, [projects]);

  // ─── Fluxo de caixa próximos 6 meses ───
  const cashflow = useMemo(() => {
    const rs = receivables ?? [];
    const months: { key: string; label: string; previsto: number; recebido: number }[] = [];
    const now = new Date();
    for (let i = -1; i < 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = d.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });
      months.push({ key, label, previsto: 0, recebido: 0 });
    }
    const idx = new Map(months.map((m, i) => [m.key, i]));
    for (const r of rs) {
      const amount = Number(r.amount) || 0;
      if (r.status === "pendente" && r.due_date) {
        const d = new Date(r.due_date);
        const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        const i = idx.get(k);
        if (i != null) months[i].previsto += amount;
      }
      if (r.status === "pago" && r.paid_at) {
        const d = new Date(r.paid_at);
        const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        const i = idx.get(k);
        if (i != null) months[i].recebido += amount;
      }
    }
    return months;
  }, [receivables]);

  // ─── Top 5 clientes por receita ───
  const topClientes = useMemo(() => {
    const ps = proposals ?? [];
    const cs = clients ?? [];
    const map = new Map<string, { receita: number; projetos: Set<string> }>();
    for (const p of ps) {
      if (p.status !== "ganha" || !p.client_id) continue;
      if (!map.has(p.client_id))
        map.set(p.client_id, { receita: 0, projetos: new Set() });
      const item = map.get(p.client_id)!;
      item.receita += Number(p.value) || 0;
      item.projetos.add(p.id);
    }
    const arr = Array.from(map.entries()).map(([clientId, v]) => ({
      clientId,
      name: cs.find((c) => c.id === clientId)?.name ?? "—",
      receita: v.receita,
      projetos: v.projetos.size,
    }));
    arr.sort((a, b) => b.receita - a.receita);
    return arr.slice(0, 5);
  }, [proposals, clients]);

  // ─── Alertas ───
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
      (p) => p.data_fup && new Date(p.data_fup) < hoje && p.status !== "ganha" && p.status !== "perdida"
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
      (r) => r.status === "pendente" && r.due_date && new Date(r.due_date) < hoje
    );
    if (recVencidos.length) {
      const total = recVencidos.reduce((s, r) => s + (Number(r.amount) || 0), 0);
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
      (p) =>
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
      (p) =>
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

  // ─── Atividade recente ───
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
    for (const p of proposals ?? []) {
      if (p.status === "ganha" && p.data_aprovacao) {
        items.push({
          key: `prop-ganha-${p.id}`,
          date: p.data_aprovacao,
          icon: CheckCircle2,
          color: "text-success",
          text: `Proposta ganha: ${p.title} — ${formatCurrency(Number(p.value) || 0)}`,
          onClick: () => navigate("/propostas"),
        });
      }
      items.push({
        key: `prop-new-${p.id}`,
        date: p.created_at,
        icon: FileText,
        color: "text-info",
        text: `Nova proposta: ${p.title}`,
        onClick: () => navigate("/propostas"),
      });
    }
    for (const pj of projects ?? []) {
      if (pj.etapa === "assinado" && pj.etapa_assinado_at) {
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
    for (const r of receivables ?? []) {
      if (r.status === "pago" && r.paid_at) {
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
    return items.slice(0, 8);
  }, [proposals, projects, receivables, navigate]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">Visão executiva do negócio</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={period} onValueChange={(v) => setPeriod(v as PeriodKey)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PERIOD_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" onClick={() => navigate("/propostas")}>
            <Plus className="h-4 w-4 mr-1" /> Proposta
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Receita aprovada"
          value={formatCurrency(kpis.receita.value)}
          delta={kpis.receita.delta}
          icon={DollarSign}
          accent="bg-success/10 text-success"
          onClick={() => navigate("/propostas")}
        />
        <KpiCard
          label="Pipeline ativo"
          value={formatCurrency(kpis.pipeline.value)}
          delta={null}
          icon={FileText}
          accent="bg-info/10 text-info"
          onClick={() => navigate("/propostas")}
          hint="em elaboração + negociação"
        />
        <KpiCard
          label="Taxa de conversão"
          value={`${kpis.conversao.value.toFixed(1)}%`}
          delta={kpis.conversao.delta}
          icon={Target}
          accent="bg-primary/10 text-primary"
          onClick={() => navigate("/propostas")}
          hint="vs. período anterior (pp)"
        />
        <KpiCard
          label="A receber (30 dias)"
          value={formatCurrency(kpis.aReceber.value)}
          delta={null}
          icon={DollarSign}
          accent="bg-warning/10 text-warning"
          onClick={() => navigate("/contas-a-receber")}
          hint="pendentes até 30 dias"
        />
      </div>

      {/* Pipeline + Funil */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pipeline de propostas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={pipelineData}
                  layout="vertical"
                  margin={{ left: 10, right: 30, top: 5, bottom: 5 }}
                  onClick={(e: any) => {
                    if (e?.activeLabel) navigate("/propostas");
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis
                    dataKey="label"
                    type="category"
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    width={110}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    formatter={(value: number, name: string) =>
                      name === "valor" ? formatCurrency(value) : value
                    }
                  />
                  <Bar
                    dataKey="qtd"
                    name="Qtd"
                    fill="hsl(var(--primary))"
                    radius={[0, 4, 4, 0]}
                    cursor="pointer"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              {pipelineData.map((p) => (
                <button
                  key={p.status}
                  onClick={() => navigate("/propostas")}
                  className="text-left p-2 rounded hover:bg-accent transition-colors"
                >
                  <div className="text-muted-foreground">{p.label}</div>
                  <div className="font-semibold">{formatCurrency(p.valor)}</div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Funil de projetos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(["iniciado", "minuta", "assinado"] as const).map((etapa) => {
              const v = projetosFunil[etapa];
              const total =
                projetosFunil.iniciado.qtd +
                projetosFunil.minuta.qtd +
                projetosFunil.assinado.qtd;
              const pct = total ? (v.qtd / total) * 100 : 0;
              return (
                <button
                  key={etapa}
                  onClick={() => navigate("/projetos")}
                  className="w-full text-left p-3 rounded-lg border bg-card hover:bg-accent transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Circle className="h-3 w-3 text-primary" />
                      <span className="font-medium text-sm">
                        {projectEtapaLabels[etapa]}
                      </span>
                    </div>
                    <Badge variant="secondary">{v.qtd}</Badge>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                    <span>{pct.toFixed(0)}% do total</span>
                    <span>{formatCurrency(v.valor)}</span>
                  </div>
                </button>
              );
            })}
          </CardContent>
        </Card>
      </div>

      {/* Cashflow */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Fluxo de caixa — próximos 6 meses</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={cashflow} margin={{ left: 10, right: 20, top: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id="grad-prev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="grad-rec" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--success))" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="hsl(var(--success))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickFormatter={(v) =>
                    v >= 1000 ? `${(v / 1000).toFixed(0)}k` : `${v}`
                  }
                />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  formatter={(v: number) => formatCurrency(v)}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Area
                  type="monotone"
                  dataKey="previsto"
                  name="Previsto"
                  stroke="hsl(var(--primary))"
                  fill="url(#grad-prev)"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="recebido"
                  name="Recebido"
                  stroke="hsl(var(--success))"
                  fill="url(#grad-rec)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Top clientes + Alertas */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top 5 clientes por receita</CardTitle>
          </CardHeader>
          <CardContent>
            {topClientes.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Sem propostas ganhas ainda.
              </p>
            ) : (
              <div className="divide-y">
                {topClientes.map((c, i) => (
                  <button
                    key={c.clientId}
                    onClick={() => navigate(`/clientes/${c.clientId}`)}
                    className="w-full flex items-center justify-between py-3 hover:bg-accent/50 px-2 -mx-2 rounded transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-7 w-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold flex-shrink-0">
                        {i + 1}
                      </div>
                      <div className="min-w-0 text-left">
                        <div className="font-medium text-sm truncate">{c.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {c.projetos} proposta(s) ganha(s)
                        </div>
                      </div>
                    </div>
                    <div className="font-semibold text-sm flex-shrink-0">
                      {formatCurrency(c.receita)}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              Alertas
              {alertas.length > 0 && (
                <Badge variant="destructive">{alertas.length}</Badge>
              )}
            </CardTitle>
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
      </div>

      {/* Atividade recente */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Atividade recente</CardTitle>
        </CardHeader>
        <CardContent>
          {atividade.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sem atividade registrada.</p>
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
    </div>
  );
}
