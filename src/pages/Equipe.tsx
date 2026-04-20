import { useState } from "react";
import { useTeamMembers, useCreateTeamMember, useUpdateTeamMember, useDeleteTeamMember } from "@/hooks/useTeam";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/format";
import { Plus, Pencil, Trash2 } from "lucide-react";
import TeamMemberDetailDialog from "@/components/TeamMemberDetailDialog";
import { useUserRole } from "@/hooks/useUserRole";
import type { Database } from "@/integrations/supabase/types";

type TeamMember = Database["public"]["Tables"]["team_members"]["Row"];
type TeamMemberInsert = Database["public"]["Tables"]["team_members"]["Insert"];

const emptyMember: TeamMemberInsert = { name: "", role: "", area: "", salary: null, is_active: true };

export default function Equipe() {
  const { isSocio } = useUserRole();
  const canEdit = isSocio;
  const { data: members, isLoading } = useTeamMembers();
  const createMember = useCreateTeamMember();
  const updateMember = useUpdateTeamMember();
  const deleteMember = useDeleteTeamMember();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<TeamMember | null>(null);
  const [form, setForm] = useState<TeamMemberInsert>(emptyMember);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const handleOpen = (member?: TeamMember) => {
    if (member) {
      setEditing(member);
      setForm(member);
    } else {
      setEditing(null);
      setForm(emptyMember);
    }
    setOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast({ title: "Nome é obrigatório", variant: "destructive" });
      return;
    }
    try {
      if (editing) {
        await updateMember.mutateAsync({ id: editing.id, ...form });
        toast({ title: "Membro atualizado" });
      } else {
        await createMember.mutateAsync(form);
        toast({ title: "Membro adicionado" });
      }
      setOpen(false);
    } catch {
      toast({ title: "Erro ao salvar", variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteMember.mutateAsync(id);
      toast({ title: "Membro removido" });
    } catch {
      toast({ title: "Erro ao remover", variant: "destructive" });
    }
  };

  const handleRowClick = (member: TeamMember) => {
    setSelectedMember(member);
    setDetailOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Equipe</h1>
          <p className="text-muted-foreground">Gerencie membros da equipe</p>
        </div>
        {canEdit && (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpen()}>
              <Plus className="h-4 w-4 mr-1" /> Novo Membro
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? "Editar Membro" : "Novo Membro"}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Nome *</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Cargo</Label>
                  <Input value={form.role ?? ""} onChange={(e) => setForm({ ...form, role: e.target.value })} />
                </div>
                <div className="grid gap-2">
                  <Label>Área</Label>
                  <Input value={form.area ?? ""} onChange={(e) => setForm({ ...form, area: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Salário (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={form.salary ?? ""}
                    onChange={(e) => setForm({ ...form, salary: e.target.value ? Number(e.target.value) : null })}
                  />
                </div>
                <div className="flex items-center gap-2 pt-6">
                  <Switch
                    checked={form.is_active ?? true}
                    onCheckedChange={(v) => setForm({ ...form, is_active: v })}
                  />
                  <Label>Ativo</Label>
                </div>
              </div>
            </div>
            <Button onClick={handleSave} disabled={createMember.isPending || updateMember.isPending}>
              {editing ? "Salvar" : "Adicionar"}
            </Button>
          </DialogContent>
        </Dialog>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Carregando...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead className="hidden sm:table-cell">Cargo</TableHead>
                  <TableHead className="hidden md:table-cell">Área</TableHead>
                  <TableHead className="hidden md:table-cell">Salário</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-24">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      Nenhum membro cadastrado
                    </TableCell>
                  </TableRow>
                )}
                {members?.map((m) => (
                  <TableRow key={m.id} className="cursor-pointer" onClick={() => handleRowClick(m)}>
                    <TableCell className="font-medium">{m.name}</TableCell>
                    <TableCell className="hidden sm:table-cell">{m.role || "—"}</TableCell>
                    <TableCell className="hidden md:table-cell">{m.area || "—"}</TableCell>
                    <TableCell className="hidden md:table-cell">{formatCurrency(Number(m.salary))}</TableCell>
                    <TableCell>
                      <Badge variant={m.is_active ? "default" : "secondary"}>
                        {m.is_active ? "Ativo" : "Inativo"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {canEdit && (
                        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" onClick={() => handleOpen(m)}>
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
                                <AlertDialogTitle>Remover membro?</AlertDialogTitle>
                                <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(m.id)}>Remover</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <TeamMemberDetailDialog member={selectedMember} open={detailOpen} onOpenChange={setDetailOpen} />
    </div>
  );
}
