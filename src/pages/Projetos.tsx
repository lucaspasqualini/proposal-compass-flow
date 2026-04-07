import { useState, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useProjects, useDeleteProject, useUpdateProject } from "@/hooks/useProjects";
import { useTeamMembers } from "@/hooks/useTeam";
import { useProjectAllocations, useCreateAllocation, useDeleteAllocation } from "@/hooks/useTeam";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { projectStatusLabels, projectStatusColors, projectEtapaLabels, projectEtapaColors } from "@/lib/format";
import { Plus, Trash2, Users, ArrowUpDown, ArrowUp, ArrowDown, Filter } from "lucide-react";
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
  const [columnFilters, setColumnFilters] = useState<Partial<Record<SortKey, string>>>({});
  const [activeFilter, setActiveFilter] = useState<SortKey | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => d === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const setFilter = (key: SortKey, value: string) => {
    setColumnFilters(prev => ({ ...prev, [key]: value }));
  };

  const filtered = useMemo(() => {
    if (!projects) return [];
    return projects
      .filter((p) => {
        return (Object.entries(columnFilters) as [SortKey, string][]).every(([key, val]) => {
          if (!val) return true;
          return getFieldValue(p, key).toLowerCase().includes(val.toLowerCase());
        });
      })
      .sort((a, b) => {
        if (!sortKey) return 0;
        const va = getFieldValue(a, sortKey).toLowerCase();
        const vb = getFieldValue(b, sortKey).toLowerCase();
        const cmp = va.localeCompare(vb, "pt-BR", { numeric: true });
        return sortDir === "asc" ? cmp : -cmp;
      });
  }, [projects, columnFilters, sortKey, sortDir]);

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

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Carregando...</div>
          ) : (
            <div className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {columns.map(col => (
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
                            onOpenChange={(open) => setActiveFilter(open ? col.key : null)}
                          >
                            <PopoverTrigger asChild>
                              <button className={`p-0.5 rounded hover:bg-accent ${columnFilters[col.key] ? "text-primary" : "text-muted-foreground opacity-50 hover:opacity-100"}`}>
                                <Filter className="h-3 w-3" />
                              </button>
                            </PopoverTrigger>
                            <PopoverContent className="w-48 p-2" align="start">
                              <Input
                                placeholder={`Filtrar ${col.label.toLowerCase()}...`}
                                value={columnFilters[col.key] || ""}
                                onChange={(e) => setFilter(col.key, e.target.value)}
                                className="h-8 text-sm"
                                autoFocus
                              />
                              {columnFilters[col.key] && (
                                <button
                                  className="text-xs text-muted-foreground hover:text-foreground mt-1"
                                  onClick={() => setFilter(col.key, "")}
                                >
                                  Limpar
                                </button>
                              )}
                            </PopoverContent>
                          </Popover>
                        </div>
                      </TableHead>
                    ))}
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
