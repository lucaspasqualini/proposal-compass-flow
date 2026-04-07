import { useState } from "react";
import { Link } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useProject, useUpdateProject } from "@/hooks/useProjects";
import { useTeamMembers, useCreateAllocation, useDeleteAllocation } from "@/hooks/useTeam";
import { useToast } from "@/hooks/use-toast";
import { formatDate, projectStatusLabels, projectStatusColors, projectEtapaLabels, projectEtapaColors } from "@/lib/format";
import { Building2, Calendar, FileText, Users, ClipboardList, Briefcase, Pencil, ChevronDown } from "lucide-react";

interface ProjectDetailDialogProps {
  projectId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ProjectDetailDialog({ projectId, open, onOpenChange }: ProjectDetailDialogProps) {
  const { data: project, isLoading } = useProject(projectId ?? undefined);
  const { data: teamMembers } = useTeamMembers();
  const updateProject = useUpdateProject();
  const createAllocation = useCreateAllocation();
  const deleteAllocation = useDeleteAllocation();
  const { toast } = useToast();
  const [editingEndDate, setEditingEndDate] = useState(false);
  const [teamOpen, setTeamOpen] = useState(false);

  const proposal = project?.proposals as any;
  const client = project?.clients as any;
  const allocations = (project?.project_allocations as any[]) || [];

  const startDate = proposal?.data_aprovacao || project?.start_date;

  const handleEndDateChange = async (value: string) => {
    if (!projectId) return;
    try {
      await updateProject.mutateAsync({ id: projectId, end_date: value || null });
      setEditingEndDate(false);
    } catch {
      toast({ title: "Erro ao atualizar data", variant: "destructive" });
    }
  };

  const handleStatusChange = async (value: string) => {
    if (!projectId) return;
    try {
      await updateProject.mutateAsync({ id: projectId, status: value as any });
    } catch {
      toast({ title: "Erro ao atualizar status", variant: "destructive" });
    }
  };

  const handleEtapaChange = async (value: string) => {
    if (!projectId) return;
    try {
      await updateProject.mutateAsync({ id: projectId, etapa: value } as any);
    } catch {
      toast({ title: "Erro ao atualizar etapa", variant: "destructive" });
    }
  };

  const handleToggleMember = async (memberId: string) => {
    if (!projectId) return;
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl h-[95vh] overflow-y-auto flex flex-col [&>div]:mt-0" style={{ alignItems: 'stretch', justifyContent: 'flex-start', paddingTop: '1.5rem' }}>
        {isLoading ? (
          <div className="py-12 text-center text-muted-foreground">Carregando...</div>
        ) : !project ? (
          <div className="py-12 text-center text-muted-foreground">Projeto não encontrado</div>
        ) : (
          <>
            <DialogHeader>
              <div className="space-y-1">
                <p className="text-xs font-mono text-muted-foreground">{proposal?.proposal_number || "—"}</p>
                <DialogTitle className="text-xl">{project.title}</DialogTitle>
              </div>
            </DialogHeader>

            <div className="space-y-5 mt-2">
              {/* Status & Etapa - editáveis */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Status</p>
                  <Select value={project.status} onValueChange={handleStatusChange}>
                    <SelectTrigger className="h-8 w-full">
                      <Badge variant="secondary" className={projectStatusColors[project.status]}>
                        {projectStatusLabels[project.status]}
                      </Badge>
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(projectStatusLabels).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Etapa</p>
                  <Select value={(project as any).etapa || "iniciado"} onValueChange={handleEtapaChange}>
                    <SelectTrigger className="h-8 w-full">
                      <Badge variant="secondary" className={projectEtapaColors[(project as any).etapa || "iniciado"]}>
                        {projectEtapaLabels[(project as any).etapa || "iniciado"]}
                      </Badge>
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(projectEtapaLabels).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Separator />

              {/* Cliente, Contato, Tipo, Datas */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                <InfoBlock icon={<Building2 className="h-4 w-4" />} label="Cliente">
                  {client?.name ? (
                    <Link to={`/clientes/${client.id}`} className="text-primary hover:underline font-medium" onClick={() => onOpenChange(false)}>
                      {client.name}
                    </Link>
                  ) : "—"}
                  {client?.cnpj && <p className="text-xs text-muted-foreground">{client.cnpj}</p>}
                </InfoBlock>
                <InfoBlock icon={<Users className="h-4 w-4" />} label="Contato">
                  <span className="font-medium">{client?.contact_name || "—"}</span>
                </InfoBlock>
                <InfoBlock icon={<Briefcase className="h-4 w-4" />} label="Tipo">
                  <span className="font-medium">{proposal?.tipo_projeto || "—"}</span>
                </InfoBlock>
                <InfoBlock icon={<Calendar className="h-4 w-4" />} label="Início">
                  <span className="font-medium">{formatDate(startDate)}</span>
                </InfoBlock>
                <InfoBlock icon={<Calendar className="h-4 w-4" />} label="Fim">
                  {editingEndDate ? (
                    <Input
                      type="date"
                      defaultValue={project.end_date ?? ""}
                      className="h-7 w-36 text-sm"
                      autoFocus
                      onBlur={(e) => handleEndDateChange(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleEndDateChange((e.target as HTMLInputElement).value);
                        if (e.key === "Escape") setEditingEndDate(false);
                      }}
                    />
                  ) : (
                    <button
                      className="font-medium flex items-center gap-1 hover:text-primary transition-colors"
                      onClick={() => setEditingEndDate(true)}
                    >
                      {formatDate(project.end_date)}
                      <Pencil className="h-3 w-3 text-muted-foreground" />
                    </button>
                  )}
                </InfoBlock>
              </div>

              {/* Descrição / Escopo */}
              {(proposal?.description || project.description) && (
                <>
                  <Separator />
                  <InfoBlock icon={<FileText className="h-4 w-4" />} label="Entendimento da Situação">
                    <ScrollArea className="h-[15rem]">
                      <p className="text-sm whitespace-pre-wrap leading-relaxed pr-3">{proposal?.description || project.description || "—"}</p>
                    </ScrollArea>
                  </InfoBlock>
                </>
              )}

              {proposal?.scope && (
                <InfoBlock icon={<ClipboardList className="h-4 w-4" />} label="Escopo do Trabalho">
                  <ScrollArea className="h-[15rem]">
                    <p className="text-sm whitespace-pre-wrap leading-relaxed pr-3">{proposal.scope}</p>
                  </ScrollArea>
                </InfoBlock>
              )}

              {/* Colaboradores - collapsible com scroll */}
              <Separator />
              <Collapsible open={teamOpen} onOpenChange={setTeamOpen}>
                <div className="space-y-2">
                  <CollapsibleTrigger className="flex items-center justify-between w-full group">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground uppercase tracking-wider font-medium">
                      <Users className="h-4 w-4" />
                      Colaboradores
                      {allocations.length > 0 && (
                        <span className="text-foreground ml-1">({allocations.length})</span>
                      )}
                    </div>
                    <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${teamOpen ? "rotate-180" : ""}`} />
                  </CollapsibleTrigger>

                  {/* Badges dos alocados - sempre visíveis */}
                  <div className="flex flex-wrap gap-2">
                    {allocations.length > 0 ? (
                      allocations.map((a: any) => (
                        <Badge key={a.id} variant="outline" className="text-sm py-1">
                          {a.team_members?.name || "—"}
                          {a.team_members?.role && (
                            <span className="ml-1 text-muted-foreground font-normal">· {a.team_members.role}</span>
                          )}
                        </Badge>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">Nenhum colaborador alocado</p>
                    )}
                  </div>

                  <CollapsibleContent>
                    <div className="mt-2 border rounded-md">
                      <ScrollArea className="h-[180px]">
                        <div className="p-2 space-y-0.5">
                          {teamMembers?.filter(m => m.is_active).map((member) => {
                            const isAllocated = allocations.some((a: any) => a.team_member_id === member.id);
                            return (
                              <label key={member.id} className="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-accent cursor-pointer">
                                <Checkbox
                                  checked={isAllocated}
                                  onCheckedChange={() => handleToggleMember(member.id)}
                                />
                                <span className="text-sm flex-1">{member.name}</span>
                                {member.role && <span className="text-xs text-muted-foreground">{member.role}</span>}
                              </label>
                            );
                          })}
                          {(!teamMembers || teamMembers.filter(m => m.is_active).length === 0) && (
                            <p className="text-xs text-muted-foreground p-2">Cadastre membros na aba Equipe</p>
                          )}
                        </div>
                      </ScrollArea>
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function InfoBlock({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground uppercase tracking-wider font-medium">
        {icon}
        {label}
      </div>
      <div>{children}</div>
    </div>
  );
}
