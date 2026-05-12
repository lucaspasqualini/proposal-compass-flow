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
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { useClientsWithStats } from "@/hooks/useClientStats";
import { useProposals } from "@/hooks/useProposals";
import { formatCurrency } from "@/lib/format";
import { useDashboardPeriod } from "./_shared";

const PIE_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--info))",
  "hsl(var(--success))",
  "hsl(var(--warning))",
  "hsl(var(--destructive))",
  "hsl(var(--muted-foreground))",
];

export default function ClientesTab() {
  const { data: clients } = useClientsWithStats();
  const { data: proposals } = useProposals();
  const navigate = useNavigate();
  const { range, inCurrent } = useDashboardPeriod();

  // Top 5 clientes do período (vindo da Visão Geral)
  const topPeriodo = useMemo(() => {
    const ps = proposals ?? [];
    const cs = clients ?? [];
    const map = new Map<string, { receita: number; projetos: Set<string> }>();
    for (const p of ps as any[]) {
      if (p.status !== "ganha" || !p.client_id) continue;
      if (!inCurrent(p.data_aprovacao ?? p.created_at)) continue;
      if (!map.has(p.client_id)) map.set(p.client_id, { receita: 0, projetos: new Set() });
      const item = map.get(p.client_id)!;
      item.receita += Number(p.value) || 0;
      item.projetos.add(p.id);
    }
    const arr = Array.from(map.entries()).map(([clientId, v]) => ({
      clientId,
      name: cs.find((c: any) => c.id === clientId)?.name ?? "—",
      receita: v.receita,
      projetos: v.projetos.size,
    }));
    arr.sort((a, b) => b.receita - a.receita);
    return arr.slice(0, 5);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [proposals, clients, range]);


  const top10 = useMemo(() => {
    const cs = clients ?? [];
    return [...cs]
      .filter((c) => c.won_value > 0)
      .sort((a, b) => b.won_value - a.won_value)
      .slice(0, 10)
      .map((c) => ({ id: c.id, name: c.name, valor: c.won_value }));
  }, [clients]);

  const novosPorMes = useMemo(() => {
    const cs = clients ?? [];
    const now = new Date();
    const months: { label: string; novos: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "");
      const novos = cs.filter((c: any) => c.created_at?.startsWith(key)).length;
      months.push({ label, novos });
    }
    return months;
  }, [clients]);

  const concentracao = useMemo(() => {
    const cs = clients ?? [];
    const sorted = [...cs].filter((c) => c.won_value > 0).sort((a, b) => b.won_value - a.won_value);
    const top5 = sorted.slice(0, 5).reduce((s, c) => s + c.won_value, 0);
    const resto = sorted.slice(5).reduce((s, c) => s + c.won_value, 0);
    if (top5 + resto === 0) return [];
    return [
      { name: "Top 5", value: top5 },
      { name: "Demais", value: resto },
    ];
  }, [clients]);

  const ativos = useMemo(() => (clients ?? []).filter((c) => c.is_active).length, [clients]);
  const inativos = useMemo(() => (clients ?? []).filter((c) => !c.is_active).length, [clients]);
  const totalReceita = useMemo(
    () => (clients ?? []).reduce((s, c) => s + c.won_value, 0),
    [clients]
  );

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground font-medium">Clientes ativos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{ativos}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground font-medium">Inativos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-muted-foreground">{inativos}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground font-medium">Receita total ganha</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalReceita)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground font-medium">Total cadastrados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(clients ?? []).length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Top 5 clientes do período (vindo da Visão Geral) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Top 5 clientes por receita — período selecionado</CardTitle>
        </CardHeader>
        <CardContent>
          {topPeriodo.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sem propostas ganhas no período.</p>
          ) : (
            <div className="divide-y">
              {topPeriodo.map((c, i) => (
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

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top 10 clientes (receita ganha)</CardTitle>
          </CardHeader>
          <CardContent>
            {top10.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem propostas ganhas ainda.</p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={top10} layout="vertical" margin={{ left: 10, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={10} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <YAxis dataKey="name" type="category" stroke="hsl(var(--muted-foreground))" fontSize={10} width={120} />
                  <Tooltip
                    contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", fontSize: 12 }}
                    formatter={(v: any) => formatCurrency(v)}
                  />
                  <Bar dataKey="valor" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Concentração de receita</CardTitle>
          </CardHeader>
          <CardContent>
            {concentracao.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem dados.</p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={concentracao} dataKey="value" nameKey="name" outerRadius={100} label={(e: any) => `${e.name}: ${((e.value / (concentracao[0].value + concentracao[1].value)) * 100).toFixed(0)}%`}>
                    {concentracao.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", fontSize: 12 }}
                    formatter={(v: any) => formatCurrency(v)}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Novos clientes (últimos 6 meses)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={novosPorMes}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={11} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} allowDecimals={false} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", fontSize: 12 }} />
              <Bar dataKey="novos" name="Novos clientes" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
