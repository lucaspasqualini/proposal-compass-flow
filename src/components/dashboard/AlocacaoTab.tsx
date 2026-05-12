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
} from "recharts";
import { useProjects } from "@/hooks/useProjects";
import { useTeamMembers } from "@/hooks/useTeam";
import { Users, Briefcase } from "lucide-react";
import { projectEtapaLabels, projectEtapaColors } from "@/lib/format";

export default function AlocacaoTab() {
  const { data: projects } = useProjects();
  const { data: members } = useTeamMembers();
  const navigate = useNavigate();

  const ativos = useMemo(
    () =>
      (projects ?? []).filter(
        (p: any) => p.status === "em_andamento" && p.etapa !== "cancelado"
      ),
    [projects]
  );

  const cargaPorMembro = useMemo(() => {
    const counts = new Map<string, { id: string; name: string; count: number }>();
    for (const m of members ?? []) {
      if (!m.is_active) continue;
      counts.set(m.id, { id: m.id, name: m.name, count: 0 });
    }
    for (const p of ativos) {
      for (const a of (p as any).project_allocations ?? []) {
        const m = a.team_members;
        if (!m) continue;
        const cur = counts.get(m.id) ?? { id: m.id, name: m.name, count: 0 };
        cur.count++;
        counts.set(m.id, cur);
      }
    }
    return Array.from(counts.values()).sort((a, b) => b.count - a.count);
  }, [ativos, members]);

  const semProjeto = useMemo(
    () => cargaPorMembro.filter((m) => m.count === 0),
    [cargaPorMembro]
  );

  const semResponsavel = useMemo(
    () => ativos.filter((p: any) => !p.project_allocations || p.project_allocations.length === 0),
    [ativos]
  );

  const totalAtivos = ativos.length;
  const totalAlocacoes = cargaPorMembro.reduce((s, m) => s + m.count, 0);
  const ocupacaoMedia = cargaPorMembro.length
    ? totalAlocacoes / cargaPorMembro.length
    : 0;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground font-medium">Projetos ativos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalAtivos}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground font-medium">Colaboradores ativos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{cargaPorMembro.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground font-medium">Projetos / colaborador</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{ocupacaoMedia.toFixed(1)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground font-medium">Projetos sem responsável</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">{semResponsavel.length}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Carga por colaborador (projetos ativos)</CardTitle>
        </CardHeader>
        <CardContent>
          {cargaPorMembro.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sem colaboradores cadastrados.</p>
          ) : (
            <ResponsiveContainer width="100%" height={Math.max(220, cargaPorMembro.length * 28)}>
              <BarChart data={cargaPorMembro} layout="vertical" margin={{ left: 10, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={11} allowDecimals={false} />
                <YAxis dataKey="name" type="category" stroke="hsl(var(--muted-foreground))" fontSize={11} width={140} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", fontSize: 12 }} />
                <Bar dataKey="count" name="Projetos" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4 text-warning" /> Colaboradores sem projeto
            </CardTitle>
          </CardHeader>
          <CardContent>
            {semProjeto.length === 0 ? (
              <p className="text-sm text-muted-foreground">Todos os colaboradores ativos têm projeto.</p>
            ) : (
              <ul className="divide-y">
                {semProjeto.map((m) => (
                  <li key={m.id} className="py-2 text-sm">
                    {m.name}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-warning" /> Projetos sem responsável
            </CardTitle>
          </CardHeader>
          <CardContent>
            {semResponsavel.length === 0 ? (
              <p className="text-sm text-muted-foreground">Todos os projetos ativos têm equipe.</p>
            ) : (
              <ul className="divide-y">
                {semResponsavel.slice(0, 10).map((p: any) => (
                  <li
                    key={p.id}
                    className="py-2 flex items-center justify-between gap-2 hover:bg-muted/50 cursor-pointer px-2 -mx-2 rounded"
                    onClick={() => navigate("/alocacao")}
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">{p.title}</div>
                      <div className="text-xs text-muted-foreground truncate">{p.clients?.name ?? "—"}</div>
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
    </div>
  );
}
