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
import { Plus, Pencil, Trash2, Search, Users } from "lucide-react";

export default function Projetos() {
  const { data: projects, isLoading } = useProjects();
  const { data: teamMembers } = useTeamMembers();
  const deleteProject = useDeleteProject();
  const updateProject = useUpdateProject();
  const createAllocation = useCreateAllocation();
  const deleteAllocation = useDeleteAllocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const filtered = useMemo(() => {
    if (!projects) return [];
    return projects.filter((p) => {
      const s = search.toLowerCase();
      const matchSearch =
        p.title.toLowerCase().includes(s) ||
        ((p.clients as any)?.name ?? "").toLowerCase().includes(s) ||
        ((p.proposals as any)?.proposal_number ?? "").toLowerCase().includes(s);
      const matchStatus = statusFilter === "all" || p.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [projects, search, statusFilter]);

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
      toast({ title: "Status atualizado" });
    } catch {
      toast({ title: "Erro ao atualizar status", variant: "destructive" });
    }
  };

  const handleEtapaChange = async (id: string, newEtapa: string) => {
    try {
      await updateProject.mutateAsync({ id, etapa: newEtapa } as any);
      toast({ title: "Etapa atualizada" });
    } catch {
      toast({ title: "Erro ao atualizar etapa", variant: "destructive" });
    }
  };

  const getProjectAllocatedMembers = (project: any) => {
    const allocations = project.project_allocations || [];
    return allocations
      .map((a: any) => a.team_members)
      .filter(Boolean);
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
          <SelectTrigger className="w-52">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os Status</SelectItem>
            {Object.entries(projectStatusLabels).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
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
                    <TableHead className="whitespace-nowrap">Nº do Projeto</TableHead>
                    <TableHead>Nome do Projeto</TableHead>
                    <TableHead className="hidden sm:table-cell">Cliente</TableHead>
                    <TableHead className="hidden md:table-cell">Tipo</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Etapa</TableHead>
                    <TableHead className="hidden md:table-cell">Colaboradores</TableHead>
                    <TableHead className="w-24">Ações</TableHead>
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
                      <TableRow key={p.id} className="cursor-pointer" onClick={() => navigate(`/projetos/${p.id}`)}>
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
                                    <span className="text-sm">{member.name}</span>
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
                            <Button variant="ghost" size="icon" onClick={() => navigate(`/projetos/${p.id}`)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
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
    </div>
  );
}
