import { useMemo, useState } from "react";
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
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
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
  ComposedChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Plus,
  FileText,
  DollarSign,
  Target,
  AlertTriangle,
  CheckCircle2,
  Circle,
  FileSignature,
  ArrowRight,
  Clock,
  Receipt,
  CalendarRange,
  CalendarIcon,
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
import {
  PeriodKey,
  getPeriodRange,
  inRange,
  pctDelta,
  buildYearOptions,
  passesMonthFilter,
  monthKey,
  monthLabel,
  MONTHS_PT_FULL,
} from "@/lib/dashboardFilters";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

// Valor especial para "todos" nos selects de mês/ano
const ALL = "all";

// Paleta para o donut de tipo de projeto (todas semanticas)
const PIE_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--info))",
  "hsl(var(--success))",
  "hsl(var(--warning))",
  "hsl(var(--destructive))",
  "hsl(var(--accent-foreground))",
  "hsl(var(--muted-foreground))",
];

// ─────────────────────────── KPI Card ───────────────────────────
function KpiCard({
  label,
  value,
  delta,
  icon: Icon,
  accent,
  onClick,
  hint,
  deltaSuffix = "%",
}: {
  label: string;
  value: string;
  delta: number | null;
  icon: React.ComponentType<{ className?: string }>;
  accent: string;
  onClick?: () => void;
  hint?: string;
  deltaSuffix?: string;
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
              : `${delta > 0 ? "+" : ""}${delta.toFixed(1)}${deltaSuffix}`}
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
  const [period, setPeriod] = usePersistedState<PeriodKey>("dashboard:period", "mes_atual");
  const range = useMemo(() => getPeriodRange(period), [period]);

  const { data: proposals } = useProposals();
  const { data: projects } = useProjects();
  const { data: clients } = useClients();
  const { data: receivables } = useReceivables();

  const monthOptions = useMemo(
    () =>
      buildMonthOptions([
        ...(proposals ?? []).map((p) => p.created_at),
        ...(proposals ?? []).map((p) => p.data_aprovacao),
      ]),
    [proposals]
  );

  // Valor selecionado no segundo dropdown (mês específico)
  const selectedMonthKey = period.startsWith("mes:") ? period.slice(4) : "";

  const inCurrent = (d?: string | null) => inRange(d, range.start, range.end);
  const inPrev = (d?: string | null) =>
    range.prevStart && range.prevEnd ? inRange(d, range.prevStart, range.prevEnd) : false;

  // ─── KPIs ───
  const kpis = useMemo(() => {
    const ps = proposals ?? [];
    const rs = receivables ?? [];

    const sumGanha = (predicate: (p: typeof ps[number]) => boolean) =>
      ps
        .filter((p) => p.status === "ganha" && predicate(p))
        .reduce((s, p) => s + (Number(p.value) || 0), 0);

    const ganhasCurrentList = ps.filter(
      (p) => p.status === "ganha" && inCurrent(p.data_aprovacao ?? p.created_at)
    );
    const ganhasPrevList = ps.filter(
      (p) => p.status === "ganha" && inPrev(p.data_aprovacao ?? p.created_at)
    );

    const receitaAtual = ganhasCurrentList.reduce((s, p) => s + (Number(p.value) || 0), 0);
    const receitaPrev = ganhasPrevList.reduce((s, p) => s + (Number(p.value) || 0), 0);

    const pipelineAtivo = ps
      .filter((p) => p.status === "em_elaboracao" || p.status === "em_negociacao")
      .reduce((s, p) => s + (Number(p.value) || 0), 0);

    const decididasCurrent = ps.filter(
      (p) =>
        (p.status === "ganha" || p.status === "perdida") &&
        inCurrent(p.data_aprovacao ?? p.updated_at ?? p.created_at)
    );
    const conversaoAtual = decididasCurrent.length
      ? (ganhasCurrentList.length / decididasCurrent.length) * 100
      : 0;

    const decididasPrev = ps.filter(
      (p) =>
        (p.status === "ganha" || p.status === "perdida") &&
        inPrev(p.data_aprovacao ?? p.updated_at ?? p.created_at)
    );
    const conversaoPrev = decididasPrev.length
      ? (ganhasPrevList.length / decididasPrev.length) * 100
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

    // Ticket médio (das ganhas no período)
    const ticketAtual = ganhasCurrentList.length ? receitaAtual / ganhasCurrentList.length : 0;
    const ticketPrev = ganhasPrevList.length ? receitaPrev / ganhasPrevList.length : 0;

    // Tempo médio de ciclo de venda (created_at → data_aprovacao)
    const cicloDays = (list: typeof ps) => {
      const diffs: number[] = [];
      for (const p of list) {
        if (!p.data_aprovacao || !p.created_at) continue;
        const a = new Date(p.created_at);
        const b = new Date(p.data_aprovacao);
        const d = (+b - +a) / (1000 * 60 * 60 * 24);
        if (d >= 0 && d < 365 * 3) diffs.push(d);
      }
      return diffs.length ? diffs.reduce((s, d) => s + d, 0) / diffs.length : 0;
    };
    const cicloAtual = cicloDays(ganhasCurrentList);
    const cicloPrev = cicloDays(ganhasPrevList);

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
      ticket: { value: ticketAtual, delta: pctDelta(ticketAtual, ticketPrev) },
      ciclo: {
        value: cicloAtual,
        delta:
          range.prevStart && ganhasPrevList.length
            ? cicloAtual - cicloPrev // em dias (diferença direta)
            : null,
      },
      ganhasCount: ganhasCurrentList.length,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [proposals, receivables, range]);

  // ─── Comparativo MoM / YoY ───
  const comparativo = useMemo(() => {
    const ps = proposals ?? [];
    const now = new Date();
    const sumIn = (year: number, month: number) =>
      ps
        .filter(
          (p) =>
            p.status === "ganha" &&
            p.data_aprovacao &&
            (() => {
              const d = new Date(p.data_aprovacao);
              return d.getFullYear() === year && d.getMonth() === month;
            })()
        )
        .reduce((s, p) => s + (Number(p.value) || 0), 0);

    const atual = sumIn(now.getFullYear(), now.getMonth());
    const anterior = sumIn(
      now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear(),
      now.getMonth() === 0 ? 11 : now.getMonth() - 1
    );
    const yoy = sumIn(now.getFullYear() - 1, now.getMonth());
    return { atual, anterior, yoy };
  }, [proposals]);

  // ─── Pipeline de propostas (filtrado) ───
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
      // Para abertas, usa created_at; para decididas, prefere data_aprovacao/updated_at
      const dateRef =
        p.status === "ganha" || p.status === "perdida"
          ? p.data_aprovacao ?? p.updated_at ?? p.created_at
          : p.created_at;
      if (!inCurrent(dateRef)) continue;
      buckets[p.status].qtd += 1;
      buckets[p.status].valor += Number(p.value) || 0;
    }
    return Object.entries(buckets).map(([status, v]) => ({
      status,
      label: proposalStatusLabels[status] ?? status,
      qtd: v.qtd,
      valor: v.valor,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [proposals, range]);

  // ─── Funil de projetos (filtrado) ───
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
      const dateRef = e === "assinado" ? p.etapa_assinado_at ?? p.created_at : p.created_at;
      if (!inCurrent(dateRef)) continue;
      etapas[e].qtd += 1;
      etapas[e].valor += Number(p.budget) || 0;
    }
    return etapas;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projects, range]);

  // ─── Fluxo de caixa próximos 6 meses (snapshot, independente do filtro) ───
  const cashflow = useMemo(() => {
    const rs = receivables ?? [];
    const months: { key: string; label: string; previsto: number; recebido: number }[] = [];
    const now = new Date();
    for (let i = -1; i < 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      months.push({ key: monthKey(d), label: monthLabel(d), previsto: 0, recebido: 0 });
    }
    const idx = new Map(months.map((m, i) => [m.key, i]));
    for (const r of rs) {
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

  // ─── Tendência mensal de receita (12 meses, independente do filtro) ───
  const tendencia12m = useMemo(() => {
    const ps = proposals ?? [];
    const now = new Date();
    const months: { key: string; label: string; receita: number; mediaMovel: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({ key: monthKey(d), label: monthLabel(d), receita: 0, mediaMovel: 0 });
    }
    const idx = new Map(months.map((m, i) => [m.key, i]));
    for (const p of ps) {
      if (p.status !== "ganha" || !p.data_aprovacao) continue;
      const d = new Date(p.data_aprovacao);
      const i = idx.get(monthKey(d));
      if (i != null) months[i].receita += Number(p.value) || 0;
    }
    // Média móvel 3 meses
    for (let i = 0; i < months.length; i++) {
      const start = Math.max(0, i - 2);
      const slice = months.slice(start, i + 1);
      months[i].mediaMovel = slice.reduce((s, m) => s + m.receita, 0) / slice.length;
    }
    return months;
  }, [proposals]);

  // ─── Top 5 clientes (filtrado) ───
  const topClientes = useMemo(() => {
    const ps = proposals ?? [];
    const cs = clients ?? [];
    const map = new Map<string, { receita: number; projetos: Set<string> }>();
    for (const p of ps) {
      if (p.status !== "ganha" || !p.client_id) continue;
      if (!inCurrent(p.data_aprovacao ?? p.created_at)) continue;
      if (!map.has(p.client_id)) map.set(p.client_id, { receita: 0, projetos: new Set() });
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [proposals, clients, range]);

  // ─── Distribuição por tipo de projeto (filtrado) ───
  const tipoProjetoData = useMemo(() => {
    const ps = proposals ?? [];
    const map = new Map<string, number>();
    for (const p of ps) {
      if (p.status !== "ganha") continue;
      if (!inCurrent(p.data_aprovacao ?? p.created_at)) continue;
      const tipo = p.tipo_projeto ?? "Sem categoria";
      map.set(tipo, (map.get(tipo) ?? 0) + (Number(p.value) || 0));
    }
    const arr = Array.from(map.entries()).map(([tipo, valor]) => ({ tipo, valor }));
    arr.sort((a, b) => b.valor - a.valor);
    return arr;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [proposals, range]);

  // ─── Heatmap de criação de propostas (filtrado) ───
  const heatmap = useMemo(() => {
    const ps = proposals ?? [];
    // 7 dias da semana × até 12 semanas dentro do período (ou últimos 84 dias se "tudo")
    const end = range.end ?? new Date();
    const start =
      range.start ??
      (() => {
        const s = new Date(end);
        s.setDate(s.getDate() - 84);
        return s;
      })();
    // Limita a no máximo 12 semanas para não explodir o grid
    const days = Math.min(84, Math.ceil((+end - +start) / (1000 * 60 * 60 * 24)) + 1);
    const realStart = new Date(end);
    realStart.setDate(realStart.getDate() - (days - 1));
    realStart.setHours(0, 0, 0, 0);

    const buckets = new Map<string, number>();
    for (const p of ps) {
      if (!p.created_at) continue;
      const d = new Date(p.created_at);
      if (d < realStart || d > end) continue;
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      buckets.set(k, (buckets.get(k) ?? 0) + 1);
    }

    // Constrói grid: cada coluna é uma semana, cada linha um dia da semana (dom→sáb)
    const cells: { date: Date; count: number; key: string }[] = [];
    for (let i = 0; i < days; i++) {
      const d = new Date(realStart);
      d.setDate(realStart.getDate() + i);
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      cells.push({ date: d, count: buckets.get(k) ?? 0, key: k });
    }
    const max = Math.max(1, ...cells.map((c) => c.count));
    return { cells, max, start: realStart, end };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [proposals, range]);

  // ─── Alertas (snapshot atual, sem filtro) ───
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
      (p) =>
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

  // ─── Atividade recente (filtrada) ───
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
    for (const pj of projects ?? []) {
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
    for (const r of receivables ?? []) {
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
    return items.slice(0, 10);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [proposals, projects, receivables, navigate, range]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">Visão executiva do negócio</p>
          <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
            <CalendarRange className="h-3.5 w-3.5" />
            <span>Período aplicado: <strong className="text-foreground">{range.label}</strong></span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={period.startsWith("mes:") ? "mes_especifico" : period}
            onValueChange={(v) => {
              if (v === "mes_especifico") {
                // aplica o primeiro mês disponível
                const first = monthOptions[0]?.key;
                if (first) setPeriod(`mes:${first}` as PeriodKey);
              } else {
                setPeriod(v as PeriodKey);
              }
            }}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Períodos</SelectLabel>
                {PERIOD_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectGroup>
              <SelectSeparator />
              <SelectItem value="mes_especifico">Mês específico…</SelectItem>
            </SelectContent>
          </Select>

          {period.startsWith("mes:") && (
            <Select
              value={selectedMonthKey}
              onValueChange={(v) => setPeriod(`mes:${v}` as PeriodKey)}
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {monthOptions.map((m) => (
                  <SelectItem key={m.key} value={m.key}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <Button size="sm" onClick={() => navigate("/propostas")}>
            <Plus className="h-4 w-4 mr-1" /> Proposta
          </Button>
        </div>
      </div>

      {/* KPIs principais */}
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
          hint="snapshot atual"
        />
        <KpiCard
          label="Taxa de conversão"
          value={`${kpis.conversao.value.toFixed(1)}%`}
          delta={kpis.conversao.delta}
          icon={Target}
          accent="bg-primary/10 text-primary"
          onClick={() => navigate("/propostas")}
          hint="vs. período anterior (pp)"
          deltaSuffix="pp"
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

      {/* KPIs secundários */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <KpiCard
          label="Ticket médio"
          value={formatCurrency(kpis.ticket.value)}
          delta={kpis.ticket.delta}
          icon={Receipt}
          accent="bg-primary/10 text-primary"
          hint={`${kpis.ganhasCount} proposta(s) ganha(s)`}
        />
        <KpiCard
          label="Ciclo de venda médio"
          value={`${kpis.ciclo.value.toFixed(0)} dias`}
          delta={kpis.ciclo.delta}
          icon={Clock}
          accent="bg-info/10 text-info"
          hint="criação → aprovação"
          deltaSuffix=" dias"
        />
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Comparativo do mês corrente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <div className="text-xs text-muted-foreground">Atual</div>
                <div className="text-sm font-bold">
                  {formatCurrency(comparativo.atual)}
                </div>
              </div>
              <div className="border-x">
                <div className="text-xs text-muted-foreground">Mês ant.</div>
                <div className="text-sm font-bold">
                  {formatCurrency(comparativo.anterior)}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">YoY</div>
                <div className="text-sm font-bold">{formatCurrency(comparativo.yoy)}</div>
              </div>
            </div>
            <div className="mt-2 text-[10px] text-muted-foreground text-center">
              Receita ganha · sempre referente ao mês corrente
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tendência mensal (12m) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Tendência de receita — últimos 12 meses
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Clique em uma barra para focar o dashboard naquele mês.
          </p>
        </CardHeader>
        <CardContent>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={tendencia12m}
                margin={{ left: 10, right: 20, top: 10, bottom: 0 }}
                onClick={(e: any) => {
                  const k = e?.activePayload?.[0]?.payload?.key;
                  if (k) setPeriod(`mes:${k}` as PeriodKey);
                }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : `${v}`)}
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
                <Bar
                  dataKey="receita"
                  name="Receita ganha"
                  fill="hsl(var(--primary))"
                  radius={[4, 4, 0, 0]}
                  cursor="pointer"
                />
                <Line
                  type="monotone"
                  dataKey="mediaMovel"
                  name="Média móvel 3m"
                  stroke="hsl(var(--info))"
                  strokeWidth={2}
                  dot={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Pipeline + Funil */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pipeline de propostas</CardTitle>
            <p className="text-xs text-muted-foreground">No período selecionado</p>
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
            <p className="text-xs text-muted-foreground">No período selecionado</p>
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
            {projetosFunil.iniciado.qtd +
              projetosFunil.minuta.qtd +
              projetosFunil.assinado.qtd ===
              0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhum projeto no período selecionado.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Distribuição por tipo + Top clientes */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Receita por tipo de projeto</CardTitle>
            <p className="text-xs text-muted-foreground">Propostas ganhas no período</p>
          </CardHeader>
          <CardContent>
            {tipoProjetoData.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                Sem dados no período.
              </p>
            ) : (
              <div className="h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={tipoProjetoData}
                      dataKey="valor"
                      nameKey="tipo"
                      innerRadius={50}
                      outerRadius={90}
                      paddingAngle={2}
                    >
                      {tipoProjetoData.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                      formatter={(v: number) => formatCurrency(v)}
                    />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top 5 clientes por receita</CardTitle>
            <p className="text-xs text-muted-foreground">No período selecionado</p>
          </CardHeader>
          <CardContent>
            {topClientes.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Sem propostas ganhas no período.
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
      </div>

      {/* Cashflow */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Fluxo de caixa — próximos 6 meses</CardTitle>
          <p className="text-xs text-muted-foreground">
            Snapshot atual (independe do filtro)
          </p>
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

      {/* Heatmap de atividade comercial */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Atividade comercial — propostas criadas</CardTitle>
          <p className="text-xs text-muted-foreground">
            Volume diário de novas propostas no período (limite de 12 semanas)
          </p>
        </CardHeader>
        <CardContent>
          <Heatmap cells={heatmap.cells} max={heatmap.max} />
        </CardContent>
      </Card>

      {/* Alertas */}
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

      {/* Atividade recente */}
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
    </div>
  );
}

// ─────────────────────────── Heatmap ───────────────────────────
function Heatmap({
  cells,
  max,
}: {
  cells: { date: Date; count: number; key: string }[];
  max: number;
}) {
  const [hover, setHover] = useState<{ date: Date; count: number } | null>(null);
  if (cells.length === 0)
    return <p className="text-sm text-muted-foreground">Sem dados.</p>;

  // Agrupa por semanas (colunas), começando no domingo
  const weeks: ({ date: Date; count: number; key: string } | null)[][] = [];
  let currentWeek: ({ date: Date; count: number; key: string } | null)[] = new Array(7).fill(null);
  for (const c of cells) {
    const dow = c.date.getDay();
    currentWeek[dow] = c;
    if (dow === 6) {
      weeks.push(currentWeek);
      currentWeek = new Array(7).fill(null);
    }
  }
  if (currentWeek.some((c) => c !== null)) weeks.push(currentWeek);

  const intensity = (count: number) => {
    if (count === 0) return "bg-muted";
    const ratio = count / max;
    if (ratio < 0.25) return "bg-primary/20";
    if (ratio < 0.5) return "bg-primary/40";
    if (ratio < 0.75) return "bg-primary/65";
    return "bg-primary";
  };

  const dayLabels = ["D", "S", "T", "Q", "Q", "S", "S"];

  return (
    <div className="space-y-2">
      <div className="flex gap-1 overflow-x-auto">
        <div className="flex flex-col gap-1 pr-1 text-[10px] text-muted-foreground">
          {dayLabels.map((d, i) => (
            <div key={i} className="h-3.5 flex items-center">
              {d}
            </div>
          ))}
        </div>
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-1">
            {week.map((cell, di) => (
              <div
                key={di}
                onMouseEnter={() =>
                  cell && setHover({ date: cell.date, count: cell.count })
                }
                onMouseLeave={() => setHover(null)}
                className={cn(
                  "h-3.5 w-3.5 rounded-sm transition-all",
                  cell ? intensity(cell.count) : "bg-transparent",
                  cell && "hover:ring-2 hover:ring-primary/50"
                )}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <div>
          {hover
            ? `${hover.date.toLocaleDateString("pt-BR")}: ${hover.count} proposta(s)`
            : "Passe o mouse sobre um dia"}
        </div>
        <div className="flex items-center gap-1">
          <span>Menos</span>
          <div className="h-3 w-3 rounded-sm bg-muted" />
          <div className="h-3 w-3 rounded-sm bg-primary/20" />
          <div className="h-3 w-3 rounded-sm bg-primary/40" />
          <div className="h-3 w-3 rounded-sm bg-primary/65" />
          <div className="h-3 w-3 rounded-sm bg-primary" />
          <span>Mais</span>
        </div>
      </div>
    </div>
  );
}
