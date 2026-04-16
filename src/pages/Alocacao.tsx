import { useState, useMemo } from "react";
import { usePersistedState } from "@/hooks/usePersistedState";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import ProjectDetailDialog from "@/components/ProjectDetailDialog";
import { Input } from "@/components/ui/input";
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
import { Search, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
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

type SortKey = "proposal" | "title" | "client" | "status" | "etapa";
type SortDir = "asc" | "desc";

export default function Alocacao() {
  const [search, setSearch] = usePersistedState("alocacao:search", "");
  const [selectedMember, setSelectedMember] = usePersistedState<string>("alocacao:member", "all");
  const [selectedStatus, setSelectedStatus] = usePersistedState<string>("alocacao:status", "em_andamento");
  const [selectedEtapa, setSelectedEtapa] = usePersistedState<string>("alocacao:etapa", "all");
  const [sortKey, setSortKey] = usePersistedState<SortKey | null>("alocacao:sortKey", null);
  const [sortDir, setSortDir] = usePersistedState<SortDir>("alocacao:sortDir", "asc");
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  const { data: projects, isLoading } = useQuery({
    // Compartilha namespace com ["projects"] para que invalidações de alocação propaguem
    queryKey: ["projects", "alocacao-light"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select(
          "id, title, status, etapa, clients(name), proposals(proposal_number), project_allocations(id, team_member_id, team_members(id, name))"
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

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const getFieldValue = (p: any, key: SortKey): string => {
    switch (key) {
      case "proposal": return p.proposals?.proposal_number || "";
      case "title": return p.title || "";
      case "client": return p.clients?.name || "";
      case "status": return projectStatusLabels[p.status] || "";
      case "etapa": return projectEtapaLabels[p.etapa] || "";
      default: return "";
    }
  };

  const filtered = useMemo(() => {
    if (!projects) return [];
    return projects
      .filter((p: any) => {
        if (!allowedStatuses.includes(p.status)) return false;
        if (selectedMember !== "all") {
          const hasMatch = p.project_allocations?.some(
            (a: any) => a.team_member_id === selectedMember
          );
          if (!hasMatch) return false;
        }
        if (selectedEtapa !== "all" && p.etapa !== selectedEtapa) return false;
        if (search) {
          const q = search.toLowerCase();
          const pn = p.proposals?.proposal_number || "";
          const title = p.title || "";
          const client = p.clients?.name || "";
          if (!pn.toLowerCase().includes(q) && !title.toLowerCase().includes(q) && !client.toLowerCase().includes(q)) return false;
        }
        return true;
      })
      .sort((a: any, b: any) => {
        if (!sortKey) return 0;
        const va = getFieldValue(a, sortKey).toLowerCase();
        const vb = getFieldValue(b, sortKey).toLowerCase();
        const cmp = va.localeCompare(vb, "pt-BR", { numeric: true });
        return sortDir === "asc" ? cmp : -cmp;
      });
  }, [projects, allowedStatuses, selectedMember, selectedEtapa, search, sortKey, sortDir]);

  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((w) => w[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-40" />;
    return sortDir === "asc"
      ? <ArrowUp className="h-3 w-3 ml-1" />
      : <ArrowDown className="h-3 w-3 ml-1" />;
  };

  const columns: { key: SortKey; label: string }[] = [
    { key: "proposal", label: "Proposta" },
    { key: "title", label: "Projeto" },
    { key: "client", label: "Cliente" },
    { key: "status", label: "Status" },
    { key: "etapa", label: "Etapa" },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Alocação</h1>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar projeto, cliente, proposta..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={selectedStatus} onValueChange={setSelectedStatus}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_HIERARCHY.map((h) => (
              <SelectItem key={h.value} value={h.value}>
                {h.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={selectedEtapa} onValueChange={setSelectedEtapa}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Etapa" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas Etapas</SelectItem>
            {Object.entries(projectEtapaLabels).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={selectedMember} onValueChange={setSelectedMember}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Colaborador" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos Colaboradores</SelectItem>
            {teamMembers?.map((m) => (
              <SelectItem key={m.id} value={m.id}>
                {m.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((col) => (
                <TableHead key={col.key}>
                  <button
                    className="flex items-center hover:text-foreground transition-colors text-xs uppercase tracking-wider font-medium"
                    onClick={() => handleSort(col.key)}
                  >
                    {col.label}
                    <SortIcon col={col.key} />
                  </button>
                </TableHead>
              ))}
              <TableHead className="text-xs uppercase tracking-wider font-medium">Equipe</TableHead>
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
              filtered.map((p: any) => {
                const members = (p.project_allocations ?? [])
                  .map((a: any) => a.team_members)
                  .filter(Boolean);

                return (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono text-xs">
                      {p.proposals?.proposal_number ?? "—"}
                    </TableCell>
                    <TableCell
                      className="font-medium max-w-[250px] truncate cursor-pointer hover:text-primary transition-colors"
                      onClick={() => setSelectedProjectId(p.id)}
                    >
                      {p.title}
                    </TableCell>
                    <TableCell>{p.clients?.name ?? "—"}</TableCell>
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

      <ProjectDetailDialog
        projectId={selectedProjectId}
        open={!!selectedProjectId}
        onOpenChange={(open) => { if (!open) setSelectedProjectId(null); }}
      />
    </div>
  );
}
