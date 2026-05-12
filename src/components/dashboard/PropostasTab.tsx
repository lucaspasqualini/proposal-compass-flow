import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  LineChart,
  Line,
  Legend,
  ComposedChart,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { useProposals } from "@/hooks/useProposals";
import {
  formatCurrency,
  formatDate,
  proposalStatusLabels,
  proposalStatusColors,
} from "@/lib/format";
import { FileText, AlertTriangle, DollarSign, Target, Receipt, Clock } from "lucide-react";
import { KpiCard, Heatmap, PIE_COLORS, useDashboardPeriod } from "./_shared";
import { monthKey, monthLabel, pctDelta, PeriodKey } from "@/lib/dashboardFilters";

const STATUS_ORDER = ["em_elaboracao", "em_negociacao", "ganha", "perdida"] as const;
const STATUS_FILL: Record<string, string> = {
  em_elaboracao: "hsl(var(--muted-foreground))",
  em_negociacao: "hsl(var(--warning))",
  ganha: "hsl(var(--success))",
  perdida: "hsl(var(--destructive))",
};

export default function PropostasTab() {
  const { data: proposals } = useProposals();
  const navigate = useNavigate();
  const { period, setPeriod, range, inCurrent, inPrev } = useDashboardPeriod();

  // ── KPIs (filtrados pelo período) ──
  const kpis = useMemo(() => {
    const ps = proposals ?? [];
    const ganhasCur = ps.filter(
      (p: any) => p.status === "ganha" && inCurrent(p.data_aprovacao ?? p.created_at)
    );
    const ganhasPrev = ps.filter(
      (p: any) => p.status === "ganha" && inPrev(p.data_aprovacao ?? p.created_at)
    );
    const receitaCur = ganhasCur.reduce((s, p: any) => s + (Number(p.value) || 0), 0);
    const receitaPrev = ganhasPrev.reduce((s, p: any) => s + (Number(p.value) || 0), 0);

    const pipelineAtivo = ps
      .filter((p: any) => p.status === "em_elaboracao" || p.status === "em_negociacao")
      .reduce((s, p: any) => s + (Number(p.value) || 0), 0);

    const decididasCur = ps.filter(
      (p: any) =>
        (p.status === "ganha" || p.status === "perdida") &&
        inCurrent(p.data_aprovacao ?? p.updated_at ?? p.created_at)
    );
    const decididasPrev = ps.filter(
      (p: any) =>
        (p.status === "ganha" || p.status === "perdida") &&
        inPrev(p.data_aprovacao ?? p.updated_at ?? p.created_at)
    );
    const conversaoCur = decididasCur.length
      ? (ganhasCur.length / decididasCur.length) * 100
      : 0;
    const conversaoPrev = decididasPrev.length
      ? (ganhasPrev.length / decididasPrev.length) * 100
      : 0;

    const ticketCur = ganhasCur.length ? receitaCur / ganhasCur.length : 0;
    const ticketPrev = ganhasPrev.length ? receitaPrev / ganhasPrev.length : 0;

    const cicloDays = (list: any[]) => {
      const diffs: number[] = [];
      for (const p of list) {
        if (!p.data_aprovacao || !p.created_at) continue;
        const d = (+new Date(p.data_aprovacao) - +new Date(p.created_at)) / 86400000;
        if (d >= 0 && d < 365 * 3) diffs.push(d);
      }
      return diffs.length ? diffs.reduce((s, d) => s + d, 0) / diffs.length : 0;
    };
    const cicloCur = cicloDays(ganhasCur);
    const cicloPrev = cicloDays(ganhasPrev);

    return {
      receita: { value: receitaCur, delta: pctDelta(receitaCur, receitaPrev) },
      pipeline: { value: pipelineAtivo },
      conversao: {
        value: conversaoCur,
        delta:
          range.prevStart && decididasPrev.length ? conversaoCur - conversaoPrev : null,
      },
      ticket: { value: ticketCur, delta: pctDelta(ticketCur, ticketPrev) },
      ciclo: {
        value: cicloCur,
        delta:
          range.prevStart && ganhasPrev.length ? cicloCur - cicloPrev : null,
      },
      ganhasCount: ganhasCur.length,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [proposals, range]);

  // ── Comparativo MoM / YoY ──
  const comparativo = useMemo(() => {
    const ps = proposals ?? [];
    const now = new Date();
    const sumIn = (year: number, month: number) =>
      ps
        .filter(
          (p: any) =>
            p.status === "ganha" &&
            p.data_aprovacao &&
            (() => {
              const d = new Date(p.data_aprovacao);
              return d.getFullYear() === year && d.getMonth() === month;
            })()
        )
        .reduce((s, p: any) => s + (Number(p.value) || 0), 0);
    const atual = sumIn(now.getFullYear(), now.getMonth());
    const anterior = sumIn(
      now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear(),
      now.getMonth() === 0 ? 11 : now.getMonth() - 1
    );
    const yoy = sumIn(now.getFullYear() - 1, now.getMonth());
    return { atual, anterior, yoy };
  }, [proposals]);

  // ── Tendência 12m ──
  const tendencia12m = useMemo(() => {
    const ps = proposals ?? [];
    const now = new Date();
    const months: { key: string; label: string; receita: number; mediaMovel: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({ key: monthKey(d), label: monthLabel(d), receita: 0, mediaMovel: 0 });
    }
    const idx = new Map(months.map((m, i) => [m.key, i]));
    for (const p of ps as any[]) {
      if (p.status !== "ganha" || !p.data_aprovacao) continue;
      const d = new Date(p.data_aprovacao);
      const i = idx.get(monthKey(d));
      if (i != null) months[i].receita += Number(p.value) || 0;
    }
    for (let i = 0; i < months.length; i++) {
      const start = Math.max(0, i - 2);
      const slice = months.slice(start, i + 1);
      months[i].mediaMovel = slice.reduce((s, m) => s + m.receita, 0) / slice.length;
    }
    return months;
  }, [proposals]);

  // ── Pipeline filtrado ──
  const pipelineData = useMemo(() => {
    const ps = proposals ?? [];
    const buckets: Record<string, { qtd: number; valor: number }> = {
      em_elaboracao: { qtd: 0, valor: 0 },
      em_negociacao: { qtd: 0, valor: 0 },
      ganha: { qtd: 0, valor: 0 },
      perdida: { qtd: 0, valor: 0 },
    };
    for (const p of ps as any[]) {
      if (!buckets[p.status]) continue;
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

  // ── Receita por tipo ──
  const tipoProjetoData = useMemo(() => {
    const ps = proposals ?? [];
    const map = new Map<string, number>();
    for (const p of ps as any[]) {
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

  // ── Heatmap ──
  const heatmap = useMemo(() => {
    const ps = proposals ?? [];
    const end = range.end ?? new Date();
    const start =
      range.start ??
      (() => {
        const s = new Date(end);
        s.setDate(s.getDate() - 84);
        return s;
      })();
    const days = Math.min(84, Math.ceil((+end - +start) / 86400000) + 1);
    const realStart = new Date(end);
    realStart.setDate(realStart.getDate() - (days - 1));
    realStart.setHours(0, 0, 0, 0);

    const buckets = new Map<string, number>();
    for (const p of ps as any[]) {
      if (!p.created_at) continue;
      const d = new Date(p.created_at);
      if (d < realStart || d > end) continue;
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      buckets.set(k, (buckets.get(k) ?? 0) + 1);
    }
    const cells: { date: Date; count: number; key: string }[] = [];
    for (let i = 0; i < days; i++) {
      const d = new Date(realStart);
      d.setDate(realStart.getDate() + i);
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      cells.push({ date: d, count: buckets.get(k) ?? 0, key: k });
    }
    const max = Math.max(1, ...cells.map((c) => c.count));
    return { cells, max };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [proposals, range]);

  // ── Funil all-time (já existia) ──
  const funnel = useMemo(() => {
    const ps = proposals ?? [];
    return STATUS_ORDER.map((s) => {
      const list = ps.filter((p: any) => p.status === s);
      return {
        status: proposalStatusLabels[s],
        key: s,
        count: list.length,
        value: list.reduce((acc, p: any) => acc + (Number(p.value) || 0), 0),
      };
    });
  }, [proposals]);

  // ── Conversão 6m ──
  const conversion6m = useMemo(() => {
    const ps = proposals ?? [];
    const now = new Date();
    const months: { key: string; label: string; ganhas: number; perdidas: number; taxa: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "");
      const inMonth = ps.filter((p: any) => {
        const ref = p.data_aprovacao ?? p.updated_at ?? p.created_at;
        if (!ref) return false;
        return ref.startsWith(key);
      });
      const ganhas = inMonth.filter((p: any) => p.status === "ganha").length;
      const perdidas = inMonth.filter((p: any) => p.status === "perdida").length;
      const total = ganhas + perdidas;
      months.push({ key, label, ganhas, perdidas, taxa: total ? (ganhas / total) * 100 : 0 });
    }
    return months;
  }, [proposals]);

  const vencendo = useMemo(() => {
    const ps = proposals ?? [];
    const hoje = new Date();
    const em30 = new Date();
    em30.setDate(hoje.getDate() + 30);
    return ps
      .filter((p: any) => {
        if (p.status !== "em_elaboracao" && p.status !== "em_negociacao") return false;
        if (!p.validity_date) return false;
        return new Date(p.validity_date) <= em30;
      })
      .sort((a: any, b: any) => +new Date(a.validity_date) - +new Date(b.validity_date))
      .slice(0, 8);
  }, [proposals]);

  return (
    <div className="space-y-6">
      {/* KPIs principais (período) */}
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
          label="Ticket médio"
          value={formatCurrency(kpis.ticket.value)}
          delta={kpis.ticket.delta}
          icon={Receipt}
          accent="bg-primary/10 text-primary"
          hint={`${kpis.ganhasCount} proposta(s) ganha(s)`}
        />
      </div>

      {/* KPIs secundários */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <KpiCard
          label="Ciclo de venda médio"
          value={`${kpis.ciclo.value.toFixed(0)} dias`}
          delta={kpis.ciclo.delta}
          icon={Clock}
          accent="bg-info/10 text-info"
          hint="criação → aprovação"
          deltaSuffix=" dias"
        />
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Comparativo do mês corrente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <div className="text-xs text-muted-foreground">Atual</div>
                <div className="text-sm font-bold">{formatCurrency(comparativo.atual)}</div>
              </div>
              <div className="border-x">
                <div className="text-xs text-muted-foreground">Mês ant.</div>
                <div className="text-sm font-bold">{formatCurrency(comparativo.anterior)}</div>
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

      {/* Tendência 12m */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tendência de receita — últimos 12 meses</CardTitle>
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
                  if (k) setPeriod(`mes_ano:${k}` as PeriodKey);
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

      {/* Pipeline (período) + Funil all-time */}
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
                  onClick={() => navigate("/propostas")}
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
            <CardTitle className="text-base">Funil de Propostas (total)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={funnel} layout="vertical" margin={{ left: 10, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <YAxis dataKey="status" type="category" stroke="hsl(var(--muted-foreground))" fontSize={11} width={110} />
                <Tooltip
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", fontSize: 12 }}
                  formatter={(v: any, k: any) => (k === "value" ? formatCurrency(v) : v)}
                />
                <Bar dataKey="count" name="Quantidade" radius={[0, 4, 4, 0]}>
                  {funnel.map((d) => (
                    <Cell key={d.key} fill={STATUS_FILL[d.key]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3">
              {funnel.map((f) => (
                <div key={f.key} className="text-xs">
                  <Badge variant="outline" className={proposalStatusColors[f.key]}>
                    {f.status}
                  </Badge>
                  <div className="mt-1 font-semibold">{f.count}</div>
                  <div className="text-muted-foreground">{formatCurrency(f.value)}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Receita por tipo + Conversão 6m */}
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
            <CardTitle className="text-base">Conversão (últimos 6 meses)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={conversion6m}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} unit="%" />
                <Tooltip
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", fontSize: 12 }}
                  formatter={(v: any) => `${Number(v).toFixed(1)}%`}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="taxa" name="Taxa de conversão" stroke="hsl(var(--primary))" strokeWidth={2} dot />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Heatmap */}
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

      {/* Vencendo */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-warning" />
            Propostas vencendo (30 dias)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {vencendo.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma proposta vencendo nos próximos 30 dias.</p>
          ) : (
            <ul className="divide-y">
              {vencendo.map((p: any) => (
                <li
                  key={p.id}
                  className="py-2 flex items-center justify-between gap-2 hover:bg-muted/50 cursor-pointer px-2 -mx-2 rounded"
                  onClick={() => navigate("/propostas")}
                >
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate flex items-center gap-2">
                      <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      {p.title}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {p.clients?.name ?? "—"} · {formatCurrency(Number(p.value) || 0)}
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs whitespace-nowrap">
                    {formatDate(p.validity_date)}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
