import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useProposals } from "@/hooks/useProposals";
import { useProjects } from "@/hooks/useProjects";
import { useClients } from "@/hooks/useClients";
import { useTeamMembers } from "@/hooks/useTeam";
import { formatCurrency } from "@/lib/format";
import { FileText, FolderKanban, Building, Users, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function Dashboard() {
  const { data: proposals } = useProposals();
  const { data: projects } = useProjects();
  const { data: clients } = useClients();
  const { data: team } = useTeamMembers();
  const navigate = useNavigate();

  const activeProposals = proposals?.filter(
    (p) => !["aprovada", "rejeitada"].includes(p.status)
  ).length ?? 0;
  const activeProjects = projects?.filter(
    (p) => ["planejamento", "em_andamento"].includes(p.status)
  ).length ?? 0;
  const totalProposalValue = proposals
    ?.filter((p) => p.status === "ganha")
    .reduce((sum, p) => sum + (Number(p.value) || 0), 0) ?? 0;

  const stats = [
    { label: "Propostas Ativas", value: activeProposals, icon: FileText, color: "text-info" },
    { label: "Projetos Ativos", value: activeProjects, icon: FolderKanban, color: "text-primary" },
    { label: "Clientes", value: clients?.length ?? 0, icon: Building, color: "text-success" },
    { label: "Equipe", value: team?.filter((t) => t.is_active).length ?? 0, icon: Users, color: "text-warning" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">Visão geral do seu negócio</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" onClick={() => navigate("/propostas/nova")}>
            <Plus className="h-4 w-4 mr-1" /> Proposta
          </Button>
          <Button size="sm" variant="outline" onClick={() => navigate("/projetos/novo")}>
            <Plus className="h-4 w-4 mr-1" /> Projeto
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.label}
              </CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Valor Aprovado</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-primary">
            {formatCurrency(totalProposalValue)}
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Total de propostas aprovadas
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
