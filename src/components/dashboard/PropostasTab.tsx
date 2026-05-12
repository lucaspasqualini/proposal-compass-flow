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
} from "recharts";
import { useProposals } from "@/hooks/useProposals";
import { formatCurrency, formatDate, proposalStatusLabels, proposalStatusColors } from "@/lib/format";
import { FileText, AlertTriangle } from "lucide-react";

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

  const topTipos = useMemo(() => {
    const ps = proposals ?? [];
    const map = new Map<string, { tipo: string; count: number; valor: number }>();
    for (const p of ps) {
      const tipo = (p as any).tipo_projeto || "Sem tipo";
      const cur = map.get(tipo) ?? { tipo, count: 0, valor: 0 };
      cur.count++;
      cur.valor += Number((p as any).value) || 0;
      map.set(tipo, cur);
    }
    return Array.from(map.values()).sort((a, b) => b.valor - a.valor).slice(0, 6);
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
        const d = new Date(p.validity_date);
        return d <= em30;
      })
      .sort((a: any, b: any) => +new Date(a.validity_date) - +new Date(b.validity_date))
      .slice(0, 8);
  }, [proposals]);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Funil de Propostas</CardTitle>
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
                    <Bar key={d.key} dataKey="count" fill={STATUS_FILL[d.key]} />
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

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top tipos de projeto (por valor)</CardTitle>
          </CardHeader>
          <CardContent>
            {topTipos.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem dados.</p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={topTipos} margin={{ left: 0, right: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="tipo" stroke="hsl(var(--muted-foreground))" fontSize={10} interval={0} angle={-15} textAnchor="end" height={60} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip
                    contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", fontSize: 12 }}
                    formatter={(v: any) => formatCurrency(v)}
                  />
                  <Bar dataKey="valor" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

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
    </div>
  );
}
