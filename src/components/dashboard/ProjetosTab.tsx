import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { useProjects } from "@/hooks/useProjects";
import { formatCurrency, projectStatusLabels, projectStatusColors, projectEtapaLabels, projectEtapaColors } from "@/lib/format";
import { Briefcase, Clock, Circle } from "lucide-react";
import { useDashboardPeriod } from "./_shared";

const ETAPA_FILL: Record<string, string> = {
  iniciado: "hsl(var(--info))",
  minuta: "hsl(var(--warning))",
  assinado: "hsl(var(--success))",
  cancelado: "hsl(var(--destructive))",
};

const STATUS_FILL: Record<string, string> = {
  em_andamento: "hsl(var(--info))",
  em_pausa: "hsl(var(--warning))",
  aguardando_retorno: "hsl(var(--muted-foreground))",
  finalizado: "hsl(var(--success))",
};

export default function ProjetosTab() {
  const { data: projects } = useProjects();
  const navigate = useNavigate();
  const { range, inCurrent } = useDashboardPeriod();

  // Funil de projetos do período (vindo da Visão Geral)
  const projetosFunil = useMemo(() => {
    const pj = projects ?? [];
    const etapas: Record<string, { qtd: number; valor: number }> = {
      iniciado: { qtd: 0, valor: 0 },
      minuta: { qtd: 0, valor: 0 },
      assinado: { qtd: 0, valor: 0 },
    };
    for (const p of pj as any[]) {
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

  const porEtapa = useMemo(() => {
    const ps = projects ?? [];
    const map = new Map<string, number>();
    for (const p of ps) {
      const k = (p as any).etapa || "iniciado";
      map.set(k, (map.get(k) ?? 0) + 1);
    }
    return Array.from(map.entries()).map(([k, count]) => ({
      key: k,
      name: projectEtapaLabels[k] ?? k,
      count,
    }));
  }, [projects]);

  const porStatus = useMemo(() => {
    const ps = projects ?? [];
    const map = new Map<string, number>();
    for (const p of ps) {
      const k = (p as any).status || "em_andamento";
      map.set(k, (map.get(k) ?? 0) + 1);
    }
    return Array.from(map.entries()).map(([k, count]) => ({
      key: k,
      name: projectStatusLabels[k] ?? k,
      count,
      fill: STATUS_FILL[k] ?? "hsl(var(--primary))",
    }));
  }, [projects]);

  const cicloMedio = useMemo(() => {
    const ps = projects ?? [];
    const diffs: number[] = [];
    for (const p of ps) {
      const start = (p as any).start_date ?? (p as any).created_at;
      const sign = (p as any).etapa_assinado_at;
      if (!start || !sign) continue;
      const d = (+new Date(sign) - +new Date(start)) / (1000 * 60 * 60 * 24);
      if (d >= 0 && d < 365 * 2) diffs.push(d);
    }
    if (diffs.length === 0) return null;
    return diffs.reduce((s, d) => s + d, 0) / diffs.length;
  }, [projects]);

  const semAlocacao = useMemo(() => {
    const ps = projects ?? [];
    return ps.filter((p: any) => {
      if (p.status === "finalizado" || p.etapa === "cancelado") return false;
      return !p.project_allocations || p.project_allocations.length === 0;
    });
  }, [projects]);

  const ativos = useMemo(
    () => (projects ?? []).filter((p: any) => p.status === "em_andamento").length,
    [projects]
  );

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground font-medium">Projetos ativos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{ativos}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground font-medium">Total cadastrados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(projects ?? []).length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground font-medium flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" /> Ciclo médio iniciado→assinado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {cicloMedio == null ? "—" : `${cicloMedio.toFixed(0)} dias`}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground font-medium">Sem alocação</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">{semAlocacao.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Funil de projetos (período) — vindo da Visão Geral */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Funil de projetos — período selecionado</CardTitle>
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
                    <span className="font-medium text-sm">{projectEtapaLabels[etapa]}</span>
                  </div>
                  <Badge variant="secondary">{v.qtd}</Badge>
                </div>
                <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                  <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                </div>
                <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                  <span>{pct.toFixed(0)}% do total</span>
                  <span>{formatCurrency(v.valor)}</span>
                </div>
              </button>
            );
          })}
          {projetosFunil.iniciado.qtd + projetosFunil.minuta.qtd + projetosFunil.assinado.qtd === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhum projeto no período selecionado.
            </p>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Projetos por etapa</CardTitle>
          </CardHeader>
          <CardContent>
            {porEtapa.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem dados.</p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={porEtapa} dataKey="count" nameKey="name" outerRadius={90} label>
                    {porEtapa.map((d) => (
                      <Cell key={d.key} fill={ETAPA_FILL[d.key] ?? "hsl(var(--primary))"} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
            <div className="flex flex-wrap gap-2 mt-2">
              {porEtapa.map((d) => (
                <Badge key={d.key} variant="outline" className={projectEtapaColors[d.key] ?? ""}>
                  {d.name}: {d.count}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Projetos por status</CardTitle>
          </CardHeader>
          <CardContent>
            {porStatus.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem dados.</p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={porStatus}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} allowDecimals={false} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", fontSize: 12 }} />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {porStatus.map((d) => (
                      <Cell key={d.key} fill={d.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
            <div className="flex flex-wrap gap-2 mt-2">
              {porStatus.map((d) => (
                <Badge key={d.key} variant="outline" className={projectStatusColors[d.key] ?? ""}>
                  {d.name}: {d.count}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Projetos sem alocação</CardTitle>
        </CardHeader>
        <CardContent>
          {semAlocacao.length === 0 ? (
            <p className="text-sm text-muted-foreground">Todos os projetos ativos têm equipe alocada.</p>
          ) : (
            <ul className="divide-y">
              {semAlocacao.slice(0, 10).map((p: any) => (
                <li
                  key={p.id}
                  className="py-2 flex items-center justify-between gap-2 hover:bg-muted/50 cursor-pointer px-2 -mx-2 rounded"
                  onClick={() => navigate("/alocacao")}
                >
                  <div className="min-w-0 flex items-center gap-2">
                    <Briefcase className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">{p.title}</div>
                      <div className="text-xs text-muted-foreground truncate">{p.clients?.name ?? "—"}</div>
                    </div>
                  </div>
                  <Badge variant="outline" className={projectEtapaColors[p.etapa] ?? ""}>
                    {projectEtapaLabels[p.etapa] ?? p.etapa}
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
