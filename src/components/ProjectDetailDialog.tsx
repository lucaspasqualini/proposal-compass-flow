import { Link } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useProject } from "@/hooks/useProjects";
import { formatCurrency, formatDate, projectStatusLabels, projectStatusColors, projectEtapaLabels, projectEtapaColors } from "@/lib/format";
import { Building2, Calendar, FileText, Users, DollarSign, ClipboardList, Briefcase } from "lucide-react";

interface ProjectDetailDialogProps {
  projectId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ProjectDetailDialog({ projectId, open, onOpenChange }: ProjectDetailDialogProps) {
  const { data: project, isLoading } = useProject(projectId ?? undefined);

  const proposal = project?.proposals as any;
  const client = project?.clients as any;
  const allocations = (project?.project_allocations as any[]) || [];
  const parcelas = (proposal?.parcelas as any[]) || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        {isLoading ? (
          <div className="py-12 text-center text-muted-foreground">Carregando...</div>
        ) : !project ? (
          <div className="py-12 text-center text-muted-foreground">Projeto não encontrado</div>
        ) : (
          <>
            <DialogHeader>
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <p className="text-xs font-mono text-muted-foreground">{proposal?.proposal_number || "—"}</p>
                  <DialogTitle className="text-xl">{project.title}</DialogTitle>
                </div>
                <div className="flex gap-2 shrink-0 pt-1">
                  <Badge variant="secondary" className={projectStatusColors[project.status]}>
                    {projectStatusLabels[project.status]}
                  </Badge>
                  <Badge variant="secondary" className={projectEtapaColors[(project as any).etapa || "iniciado"]}>
                    {projectEtapaLabels[(project as any).etapa || "iniciado"]}
                  </Badge>
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-5 mt-2">
              {/* Cliente & Tipo */}
              <div className="grid grid-cols-2 gap-4">
                <InfoBlock icon={<Building2 className="h-4 w-4" />} label="Cliente">
                  {client?.name ? (
                    <Link to={`/clientes/${client.id}`} className="text-primary hover:underline font-medium" onClick={() => onOpenChange(false)}>
                      {client.name}
                    </Link>
                  ) : "—"}
                  {client?.cnpj && <p className="text-xs text-muted-foreground">{client.cnpj}</p>}
                </InfoBlock>
                <InfoBlock icon={<Briefcase className="h-4 w-4" />} label="Tipo de Projeto">
                  <span className="font-medium">{proposal?.tipo_projeto || "—"}</span>
                </InfoBlock>
              </div>

              {/* Datas & Orçamento */}
              <div className="grid grid-cols-3 gap-4">
                <InfoBlock icon={<Calendar className="h-4 w-4" />} label="Início">
                  <span className="font-medium">{formatDate(project.start_date)}</span>
                </InfoBlock>
                <InfoBlock icon={<Calendar className="h-4 w-4" />} label="Fim">
                  <span className="font-medium">{formatDate(project.end_date)}</span>
                </InfoBlock>
                <InfoBlock icon={<DollarSign className="h-4 w-4" />} label="Valor">
                  <span className="font-medium">{formatCurrency(project.budget ?? proposal?.value)}</span>
                </InfoBlock>
              </div>

              {/* Descrição / Escopo */}
              {(proposal?.description || project.description) && (
                <>
                  <Separator />
                  <InfoBlock icon={<FileText className="h-4 w-4" />} label="Entendimento da Situação">
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">{proposal?.description || project.description || "—"}</p>
                  </InfoBlock>
                </>
              )}

              {proposal?.scope && (
                <InfoBlock icon={<ClipboardList className="h-4 w-4" />} label="Escopo do Trabalho">
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">{proposal.scope}</p>
                </InfoBlock>
              )}

              {/* Forma de pagamento */}
              {(proposal?.payment_type || parcelas.length > 0) && (
                <>
                  <Separator />
                  <InfoBlock icon={<DollarSign className="h-4 w-4" />} label="Forma de Pagamento">
                    <p className="text-sm font-medium mb-1">
                      {proposal?.payment_type === "etapas" ? "Por Etapas" : proposal?.payment_type === "prazo" ? "Por Prazo" : proposal?.payment_type || "—"}
                    </p>
                    {parcelas.length > 0 && (
                      <div className="space-y-1">
                        {parcelas.map((p: any, i: number) => (
                          <div key={i} className="flex justify-between text-sm text-muted-foreground border-b border-border/50 pb-1 last:border-0">
                            <span>{p.descricao || `Parcela ${i + 1}`}</span>
                            <span className="font-medium text-foreground">{formatCurrency(p.valor)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </InfoBlock>
                </>
              )}

              {/* Colaboradores */}
              <Separator />
              <InfoBlock icon={<Users className="h-4 w-4" />} label="Colaboradores">
                {allocations.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {allocations.map((a: any) => (
                      <Badge key={a.id} variant="outline" className="text-sm py-1">
                        {a.team_members?.name || "—"}
                        {a.team_members?.role && (
                          <span className="ml-1 text-muted-foreground font-normal">· {a.team_members.role}</span>
                        )}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Nenhum colaborador alocado</p>
                )}
              </InfoBlock>
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
