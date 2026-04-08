import { useState, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useProjects, useDeleteProject, useUpdateProject } from "@/hooks/useProjects";
import { useTeamMembers } from "@/hooks/useTeam";
import { useCreateAllocation, useDeleteAllocation } from "@/hooks/useTeam";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { projectStatusLabels, projectStatusColors, projectEtapaLabels, projectEtapaColors, formatCurrency } from "@/lib/format";
import { Plus, Trash2, Users, ArrowUpDown, ArrowUp, ArrowDown, Filter, Search } from "lucide-react";
import ProjectDetailDialog from "@/components/ProjectDetailDialog";

type SortKey = "number" | "title" | "client" | "type" | "status" | "etapa" | "collaborators";
type SortDir = "asc" | "desc";

function getFieldValue(p: any, key: SortKey): string {
  switch (key) {
    case "number": return (p.proposals as any)?.proposal_number || "";
    case "title": return p.title || "";
    case "client": return (p.clients as any)?.name || "";
    case "type": return (p.proposals as any)?.tipo_projeto || "";
    case "status": return projectStatusLabels[p.status] || "";
    case "etapa": return projectEtapaLabels[(p as any).etapa || "iniciado"] || "";
    case "collaborators": {
      const allocs = p.project_allocations || [];
      return allocs.map((a: any) => a.team_members?.name || "").join(", ");
    }
    default: return "";
  }
}

// For collaborators, return individual names so each can be filtered independently
function getFieldValues(p: any, key: SortKey): string[] {
  if (key === "collaborators") {
    const allocs = p.project_allocations || [];
    const names = allocs.map((a: any) => a.team_members?.name?.split(" ")[0] || "").filter(Boolean);
    return names.length > 0 ? names : ["(vazio)"];
  }
  const v = getFieldValue(p, key);
  return [v || "(vazio)"];
}

export default function Projetos() {
  const { data: projects, isLoading } = useProjects();
  const { data: teamMembers } = useTeamMembers();
  const deleteProject = useDeleteProject();
  const updateProject = useUpdateProject();
  const createAllocation = useCreateAllocation();
  const deleteAllocation = useDeleteAllocation();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  // Each column filter is a Set of selected values (empty = all selected = no filter)
  const [columnFilters, setColumnFilters] = useState<Partial<Record<SortKey, Set<string>>>>({});
  const [filterSearch, setFilterSearch] = useState<Partial<Record<SortKey, string>>>({});
  const [activeFilter, setActiveFilter] = useState<SortKey | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [hideFinalizado, setHideFinalizado] = useState(false);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => d === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  // Get all unique values for a column
  const getUniqueValues = (key: SortKey): string[] => {
    if (!projects) return [];
    const vals = new Set<string>();
    projects.forEach(p => {
      getFieldValues(p, key).forEach(v => vals.add(v));
    });
    return Array.from(vals).sort((a, b) => a.localeCompare(b, "pt-BR", { numeric: true }));
  };

  const toggleFilterValue = (key: SortKey, value: string) => {
    setColumnFilters(prev => {
      const allValues = getUniqueValues(key);
      const current = prev[key];
      let newSet: Set<string>;

      if (!current || current.size === 0) {
        // No filter active = all selected. Clicking one = deselect all others
        newSet = new Set([value]);
      } else if (current.has(value)) {
        newSet = new Set(current);
        newSet.delete(value);
        // If nothing selected, clear filter (show all)
        if (newSet.size === 0) {
          const next = { ...prev };
          delete next[key];
          return next;
        }
      } else {
        newSet = new Set(current);
        newSet.add(value);
        // If all selected, clear filter
        if (newSet.size === allValues.length) {
          const next = { ...prev };
          delete next[key];
          return next;
        }
      }
      return { ...prev, [key]: newSet };
    });
  };

  const selectAll = (key: SortKey) => {
    setColumnFilters(prev => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const isFilterActive = (key: SortKey) => {
    const f = columnFilters[key];
    return f && f.size > 0;
  };

  const isValueSelected = (key: SortKey, value: string) => {
    const f = columnFilters[key];
    if (!f || f.size === 0) return true; // no filter = all selected
    return f.has(value);
  };

  const filtered = useMemo(() => {
    if (!projects) return [];
    return projects
      .filter((p) => {
        // Global search
        if (search) {
          const s = search.toLowerCase();
          const matchSearch =
            p.title.toLowerCase().includes(s) ||
            ((p.proposals as any)?.proposal_number ?? "").toLowerCase().includes(s) ||
            ((p.clients as any)?.name ?? "").toLowerCase().includes(s) ||
            ((p.proposals as any)?.tipo_projeto ?? "").toLowerCase().includes(s);
          if (!matchSearch) return false;
        }
        // Status dropdown filter
        if (statusFilter !== "all" && p.status !== statusFilter) return false;
        // Hide finalizado
        if (hideFinalizado && p.status === "finalizado") return false;
        // Column checkbox filters
        return (Object.entries(columnFilters) as [SortKey, Set<string>][]).every(([key, selectedSet]) => {
          if (!selectedSet || selectedSet.size === 0) return true;
          const values = getFieldValues(p, key);
          return values.some(v => selectedSet.has(v));
        });
      })
      .sort((a, b) => {
        if (!sortKey) return 0;
        const va = getFieldValue(a, sortKey).toLowerCase();
        const vb = getFieldValue(b, sortKey).toLowerCase();
        const cmp = va.localeCompare(vb, "pt-BR", { numeric: true });
        return sortDir === "asc" ? cmp : -cmp;
      });
  }, [projects, search, statusFilter, hideFinalizado, columnFilters, sortKey, sortDir]);

  const stats = useMemo(() => {
    const ativos = filtered.filter((p) => p.status === "em_andamento");
    const pausa = filtered.filter((p) => p.status === "em_pausa");
    const aguardando = filtered.filter((p) => p.status === "aguardando_retorno");
    const finalizados = filtered.filter((p) => p.status === "finalizado");
    const sumBudget = (arr: typeof filtered) => arr.reduce((s, p) => s + (Number(p.budget) || 0), 0);
    return {
      ativos: { count: ativos.length, value: sumBudget(ativos) },
      pausa: { count: pausa.length, value: sumBudget(pausa) },
      aguardando: { count: aguardando.length, value: sumBudget(aguardando) },
      finalizados: { count: finalizados.length, value: sumBudget(finalizados) },
    };
  }, [filtered]);

  const handleDelete = async (id: string) => {
    try {
      await deleteProject.mutateAsync(id);
      toast({ title: "Projeto removido" });
    } catch {
      toast({ title: "Erro ao remover", variant: "destructive" });
    }
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      await updateProject.mutateAsync({ id, status: newStatus as any });
    } catch {
      toast({ title: "Erro ao atualizar status", variant: "destructive" });
    }
  };

  const handleEtapaChange = async (id: string, newEtapa: string) => {
    try {
      await updateProject.mutateAsync({ id, etapa: newEtapa } as any);
    } catch {
      toast({ title: "Erro ao atualizar etapa", variant: "destructive" });
    }
  };

  const getProjectAllocatedMembers = (project: any) => {
    const allocations = project.project_allocations || [];
    return allocations.map((a: any) => a.team_members).filter(Boolean);
  };

  const handleToggleMember = async (projectId: string, memberId: string, allocations: any[]) => {
    const existing = allocations.find((a: any) => a.team_member_id === memberId);
    try {
      if (existing) {
        await deleteAllocation.mutateAsync(existing.id);
      } else {
        await createAllocation.mutateAsync({ project_id: projectId, team_member_id: memberId });
      }
    } catch {
      toast({ title: "Erro ao atualizar colaboradores", variant: "destructive" });
    }
  };

  const columns: { key: SortKey; label: string; className?: string }[] = [
    { key: "number", label: "Nº do Projeto", className: "whitespace-nowrap" },
    { key: "title", label: "Nome do Projeto" },
    { key: "client", label: "Cliente", className: "hidden sm:table-cell" },
    { key: "type", label: "Tipo", className: "hidden md:table-cell" },
    { key: "status", label: "Status" },
    { key: "etapa", label: "Etapa" },
    { key: "collaborators", label: "Colaboradores", className: "hidden md:table-cell" },
  ];

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-40" />;
    return sortDir === "asc"
      ? <ArrowUp className="h-3 w-3 ml-1" />
      : <ArrowDown className="h-3 w-3 ml-1" />;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Projetos</h1>
          <p className="text-muted-foreground">Gerencie seus projetos</p>
        </div>
        <Button onClick={() => navigate("/projetos/novo")}>
          <Plus className="h-4 w-4 mr-1" /> Novo Projeto
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Buscar..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os Status</SelectItem>
            {Object.entries(projectStatusLabels).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2">
          <Checkbox id="hide-finalizado" checked={hideFinalizado} onCheckedChange={(v) => setHideFinalizado(!!v)} />
          <label htmlFor="hide-finalizado" className="text-sm text-muted-foreground cursor-pointer select-none">Ocultar finalizados</label>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Ativos</p>
            <p className="text-lg font-bold">{stats.ativos.count} <span className="text-sm font-normal text-muted-foreground">• {formatCurrency(stats.ativos.value)}</span></p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Em Pausa</p>
            <p className="text-lg font-bold">{stats.pausa.count} <span className="text-sm font-normal text-muted-foreground">• {formatCurrency(stats.pausa.value)}</span></p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Aguardando Retorno</p>
            <p className="text-lg font-bold">{stats.aguardando.count} <span className="text-sm font-normal text-muted-foreground">• {formatCurrency(stats.aguardando.value)}</span></p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Finalizados</p>
            <p className="text-lg font-bold">{stats.finalizados.count} <span className="text-sm font-normal text-muted-foreground">• {formatCurrency(stats.finalizados.value)}</span></p>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Carregando...</div>
          ) : (
            <div className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {columns.map(col => {
                      const uniqueValues = getUniqueValues(col.key);
                      const search = filterSearch[col.key] || "";
                      const filteredValues = uniqueValues.filter(v =>
                        v.toLowerCase().includes(search.toLowerCase())
                      );

                      return (
                        <TableHead key={col.key} className={col.className}>
                          <div className="flex items-center gap-0.5">
                            <button
                              className="flex items-center hover:text-foreground transition-colors text-xs uppercase tracking-wider font-medium"
                              onClick={() => handleSort(col.key)}
                            >
                              {col.label}
                              <SortIcon col={col.key} />
                            </button>
                            <Popover
                              open={activeFilter === col.key}
                              onOpenChange={(open) => {
                                setActiveFilter(open ? col.key : null);
                                if (!open) setFilterSearch(prev => ({ ...prev, [col.key]: "" }));
                              }}
                            >
                              <PopoverTrigger asChild>
                                <button className={`p-0.5 rounded hover:bg-accent ${isFilterActive(col.key) ? "text-primary" : "text-muted-foreground opacity-50 hover:opacity-100"}`}>
                                  <Filter className="h-3 w-3" />
                                </button>
                              </PopoverTrigger>
                              <PopoverContent className="w-56 p-0" align="start">
                                <div className="p-2 border-b">
                                  <Input
                                    placeholder="Buscar..."
                                    value={search}
                                    onChange={(e) => setFilterSearch(prev => ({ ...prev, [col.key]: e.target.value }))}
                                    className="h-8 text-sm"
                                    autoFocus
                                  />
                                </div>
                                <div className="p-1 border-b">
                                  <button
                                    className="text-xs text-primary hover:underline px-2 py-1"
                                    onClick={() => selectAll(col.key)}
                                  >
                                    Selecionar todos
                                  </button>
                                </div>
                                <ScrollArea className="max-h-[200px]">
                                  <div className="p-1">
                                    {filteredValues.map(value => (
                                      <label
                                        key={value}
                                        className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-accent cursor-pointer"
                                      >
                                        <Checkbox
                                          checked={isValueSelected(col.key, value)}
                                          onCheckedChange={() => toggleFilterValue(col.key, value)}
                                        />
                                        <span className="text-sm truncate">{value}</span>
                                      </label>
                                    ))}
                                    {filteredValues.length === 0 && (
                                      <p className="text-xs text-muted-foreground px-2 py-2">Nenhum resultado</p>
                                    )}
                                  </div>
                                </ScrollArea>
                              </PopoverContent>
                            </Popover>
                          </div>
                        </TableHead>
                      );
                    })}
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                        Nenhum projeto encontrado
                      </TableCell>
                    </TableRow>
                  )}
                  {filtered.map((p) => {
                    const allocatedMembers = getProjectAllocatedMembers(p);
                    const allocations = (p as any).project_allocations || [];

                    return (
                      <TableRow key={p.id} className="cursor-pointer" onClick={() => setSelectedProjectId(p.id)}>
                        <TableCell className="text-xs text-muted-foreground font-mono whitespace-nowrap">
                          {(p.proposals as any)?.proposal_number || "—"}
                        </TableCell>
                        <TableCell className="font-medium">{p.title}</TableCell>
                        <TableCell className="hidden sm:table-cell" onClick={(e) => e.stopPropagation()}>
                          {(p.clients as any)?.name ? (
                            <Link to={`/clientes/${p.client_id}`} className="text-primary hover:underline">
                              {(p.clients as any).name}
                            </Link>
                          ) : "—"}
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-sm">
                          {(p.proposals as any)?.tipo_projeto || "—"}
                        </TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <Select value={p.status} onValueChange={(v) => handleStatusChange(p.id, v)}>
                            <SelectTrigger className="h-7 w-auto min-w-[130px] border-none shadow-none p-0 focus:ring-0">
                              <Badge variant="secondary" className={projectStatusColors[p.status]}>
                                {projectStatusLabels[p.status]}
                              </Badge>
                            </SelectTrigger>
                            <SelectContent>
                              {Object.entries(projectStatusLabels).map(([k, v]) => (
                                <SelectItem key={k} value={k}>{v}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <Select value={(p as any).etapa || "iniciado"} onValueChange={(v) => handleEtapaChange(p.id, v)}>
                            <SelectTrigger className="h-7 w-auto min-w-[100px] border-none shadow-none p-0 focus:ring-0">
                              <Badge variant="secondary" className={projectEtapaColors[(p as any).etapa || "iniciado"]}>
                                {projectEtapaLabels[(p as any).etapa || "iniciado"]}
                              </Badge>
                            </SelectTrigger>
                            <SelectContent>
                              {Object.entries(projectEtapaLabels).map(([k, v]) => (
                                <SelectItem key={k} value={k}>{v}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="hidden md:table-cell" onClick={(e) => e.stopPropagation()}>
                          <Popover>
                            <PopoverTrigger asChild>
                              <button className="flex items-center gap-1 text-sm hover:underline">
                                <Users className="h-3.5 w-3.5" />
                                {allocatedMembers.length > 0 ? (
                                  <span>{allocatedMembers.map((m: any) => m.name.split(" ")[0]).join(", ")}</span>
                                ) : (
                                  <span className="text-muted-foreground">Definir</span>
                                )}
                              </button>
                            </PopoverTrigger>
                            <PopoverContent className="w-56 p-2" align="start">
                              <p className="text-sm font-medium mb-2">Colaboradores</p>
                              {teamMembers?.filter(m => m.is_active).map((member) => {
                                const isAllocated = allocations.some((a: any) => a.team_member_id === member.id);
                                return (
                                  <label key={member.id} className="flex items-center gap-2 py-1 px-1 rounded hover:bg-accent cursor-pointer">
                                    <Checkbox
                                      checked={isAllocated}
                                      onCheckedChange={() => handleToggleMember(p.id, member.id, allocations)}
                                    />
                                    <span className="text-sm">{member.name.split(" ")[0]}</span>
                                  </label>
                                );
                              })}
                              {(!teamMembers || teamMembers.filter(m => m.is_active).length === 0) && (
                                <p className="text-xs text-muted-foreground">Cadastre membros na aba Equipe</p>
                              )}
                            </PopoverContent>
                          </Popover>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Remover projeto?</AlertDialogTitle>
                                  <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDelete(p.id)}>Remover</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <ProjectDetailDialog
        projectId={selectedProjectId}
        open={!!selectedProjectId}
        onOpenChange={(open) => { if (!open) setSelectedProjectId(null); }}
      />
    </div>
  );
}
