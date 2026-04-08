import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import ProjectDetailDialog from "@/components/ProjectDetailDialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  projectStatusLabels,
  projectStatusColors,
  projectEtapaLabels,
  projectEtapaColors,
} from "@/lib/format";

const STATUS_HIERARCHY: { value: string; label: string; statuses: string[] }[] = [
  { value: "em_andamento", label: "Ativo", statuses: ["em_andamento"] },
  { value: "aguardando_retorno", label: "Aguardando Retorno", statuses: ["em_andamento", "aguardando_retorno"] },
  { value: "em_pausa", label: "Em Pausa", statuses: ["em_andamento", "aguardando_retorno", "em_pausa"] },
  { value: "finalizado", label: "Finalizado", statuses: ["em_andamento", "aguardando_retorno", "em_pausa", "finalizado"] },
];

export default function Alocacao() {
  const [selectedMember, setSelectedMember] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("em_andamento");

  const { data: projects, isLoading } = useQuery({
    queryKey: ["alocacao-projects"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select(
          "id, title, status, etapa, clients(name), proposals(proposal_number), project_allocations(team_member_id, team_members(id, name))"
        )
        .order("title");
      if (error) throw error;
      return data;
    },
  });

  const { data: teamMembers } = useQuery({
    queryKey: ["alocacao-team"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("team_members")
        .select("id, name")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const allowedStatuses = useMemo(
    () => STATUS_HIERARCHY.find((h) => h.value === selectedStatus)?.statuses ?? ["em_andamento"],
    [selectedStatus]
  );

  const filtered = useMemo(() => {
    if (!projects) return [];
    return projects.filter((p) => {
      if (!allowedStatuses.includes(p.status)) return false;
      if (selectedMember !== "all") {
        const hasMatch = p.project_allocations?.some(
          (a: any) => a.team_member_id === selectedMember
        );
        if (!hasMatch) return false;
      }
      return true;
    });
  }, [projects, allowedStatuses, selectedMember]);

  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((w) => w[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();

  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Alocação</h1>

      <div className="flex flex-wrap gap-4">
        <div className="w-64">
          <label className="mb-1.5 block text-sm font-medium text-muted-foreground">
            Colaborador
          </label>
          <Select value={selectedMember} onValueChange={setSelectedMember}>
            <SelectTrigger>
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {teamMembers?.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="w-64">
          <label className="mb-1.5 block text-sm font-medium text-muted-foreground">
            Status
          </label>
          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_HIERARCHY.map((h) => (
                <SelectItem key={h.value} value={h.value}>
                  {h.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Proposta</TableHead>
              <TableHead>Projeto</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Etapa</TableHead>
              <TableHead>Equipe</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  Carregando...
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  Nenhum projeto encontrado
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((p) => {
                const members = (p.project_allocations ?? [])
                  .map((a: any) => a.team_members)
                  .filter(Boolean);

                return (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono text-xs">
                      {(p.proposals as any)?.proposal_number ?? "—"}
                    </TableCell>
                    <TableCell
                      className="font-medium max-w-[250px] truncate cursor-pointer hover:text-primary transition-colors"
                      onClick={() => setSelectedProjectId(p.id)}
                    >
                      {p.title}
                    </TableCell>
                    <TableCell>{(p.clients as any)?.name ?? "—"}</TableCell>
                    <TableCell>
                      <Badge className={projectStatusColors[p.status] ?? ""} variant="outline">
                        {projectStatusLabels[p.status] ?? p.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {p.etapa ? (
                        <Badge className={projectEtapaColors[p.etapa] ?? ""} variant="outline">
                          {projectEtapaLabels[p.etapa] ?? p.etapa}
                        </Badge>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex -space-x-2">
                        {members.map((m: any) => (
                          <Tooltip key={m.id}>
                            <TooltipTrigger asChild>
                              <Avatar className="h-7 w-7 border-2 border-card">
                                <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                                  {getInitials(m.name)}
                                </AvatarFallback>
                              </Avatar>
                            </TooltipTrigger>
                            <TooltipContent>{m.name}</TooltipContent>
                          </Tooltip>
                        ))}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
