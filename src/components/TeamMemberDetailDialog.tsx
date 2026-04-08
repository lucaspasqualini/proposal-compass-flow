import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { usePromotionHistory, useCreatePromotion, useDeletePromotion, useBonusHistory, useCreateBonus, useDeleteBonus } from "@/hooks/useTeamHistory";
import { formatCurrency, formatDate } from "@/lib/format";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, TrendingUp, Award, User } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type TeamMember = Database["public"]["Tables"]["team_members"]["Row"];

interface Props {
  member: TeamMember | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function TeamMemberDetailDialog({ member, open, onOpenChange }: Props) {
  const { toast } = useToast();
  const { data: promotions } = usePromotionHistory(member?.id);
  const { data: bonuses } = useBonusHistory(member?.id);
  const createPromotion = useCreatePromotion();
  const deletePromotion = useDeletePromotion();
  const createBonus = useCreateBonus();
  const deleteBonus = useDeleteBonus();

  const [showPromoForm, setShowPromoForm] = useState(false);
  const [showBonusForm, setShowBonusForm] = useState(false);
  const [promoForm, setPromoForm] = useState({ new_role: "", new_salary: "", effective_date: "", notes: "" });
  const [bonusForm, setBonusForm] = useState({ reference_year: new Date().getFullYear().toString(), amount: "", payment_date: "", notes: "" });

  if (!member) return null;

  const initials = member.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();

  const handleAddPromotion = async () => {
    if (!promoForm.new_role.trim()) {
      toast({ title: "Novo cargo é obrigatório", variant: "destructive" });
      return;
    }
    try {
      await createPromotion.mutateAsync({
        team_member_id: member.id,
        previous_role: member.role,
        new_role: promoForm.new_role,
        previous_salary: member.salary,
        new_salary: promoForm.new_salary ? Number(promoForm.new_salary) : null,
        effective_date: promoForm.effective_date || new Date().toISOString().split("T")[0],
        notes: promoForm.notes || null,
      });
      toast({ title: "Promoção registrada" });
      setShowPromoForm(false);
      setPromoForm({ new_role: "", new_salary: "", effective_date: "", notes: "" });
    } catch {
      toast({ title: "Erro ao registrar promoção", variant: "destructive" });
    }
  };

  const handleAddBonus = async () => {
    if (!bonusForm.amount) {
      toast({ title: "Valor do bônus é obrigatório", variant: "destructive" });
      return;
    }
    try {
      await createBonus.mutateAsync({
        team_member_id: member.id,
        reference_year: Number(bonusForm.reference_year),
        amount: Number(bonusForm.amount),
        payment_date: bonusForm.payment_date || null,
        notes: bonusForm.notes || null,
      });
      toast({ title: "Bônus registrado" });
      setShowBonusForm(false);
      setBonusForm({ reference_year: new Date().getFullYear().toString(), amount: "", payment_date: "", notes: "" });
    } catch {
      toast({ title: "Erro ao registrar bônus", variant: "destructive" });
    }
  };

  const totalBonuses = bonuses?.reduce((sum, b) => sum + Number(b.amount), 0) ?? 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="sr-only">Detalhes do Colaborador</DialogTitle>
        </DialogHeader>

        {/* Header */}
        <div className="flex items-start gap-4">
          <Avatar className="h-16 w-16">
            <AvatarFallback className="text-lg font-semibold bg-primary/10 text-primary">{initials}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold truncate">{member.name}</h2>
            <p className="text-muted-foreground">{member.role || "Sem cargo"}</p>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant={member.is_active ? "default" : "secondary"}>
                {member.is_active ? "Ativo" : "Inativo"}
              </Badge>
              {member.area && <Badge variant="outline">{member.area}</Badge>}
            </div>
          </div>
        </div>

        <Separator />

        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-lg border p-3 text-center">
            <User className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">Salário Atual</p>
            <p className="font-semibold text-sm">{formatCurrency(member.salary)}</p>
          </div>
          <div className="rounded-lg border p-3 text-center">
            <TrendingUp className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">Promoções</p>
            <p className="font-semibold text-sm">{promotions?.length ?? 0}</p>
          </div>
          <div className="rounded-lg border p-3 text-center">
            <Award className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">Total Bônus</p>
            <p className="font-semibold text-sm">{formatCurrency(totalBonuses)}</p>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="promotions">
          <TabsList className="w-full">
            <TabsTrigger value="promotions" className="flex-1">Promoções</TabsTrigger>
            <TabsTrigger value="bonuses" className="flex-1">Bônus</TabsTrigger>
          </TabsList>

          <TabsContent value="promotions" className="space-y-3">
            <div className="flex justify-end">
              <Button size="sm" variant="outline" onClick={() => setShowPromoForm(!showPromoForm)}>
                <Plus className="h-3 w-3 mr-1" /> Nova Promoção
              </Button>
            </div>

            {showPromoForm && (
              <div className="rounded-lg border p-4 space-y-3 bg-muted/30">
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-1">
                    <Label className="text-xs">Novo Cargo *</Label>
                    <Input value={promoForm.new_role} onChange={e => setPromoForm({ ...promoForm, new_role: e.target.value })} />
                  </div>
                  <div className="grid gap-1">
                    <Label className="text-xs">Novo Salário (R$)</Label>
                    <Input type="number" value={promoForm.new_salary} onChange={e => setPromoForm({ ...promoForm, new_salary: e.target.value })} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-1">
                    <Label className="text-xs">Data Efetiva</Label>
                    <Input type="date" value={promoForm.effective_date} onChange={e => setPromoForm({ ...promoForm, effective_date: e.target.value })} />
                  </div>
                  <div className="grid gap-1">
                    <Label className="text-xs">Observações</Label>
                    <Input value={promoForm.notes} onChange={e => setPromoForm({ ...promoForm, notes: e.target.value })} />
                  </div>
                </div>
                <Button size="sm" onClick={handleAddPromotion} disabled={createPromotion.isPending}>Salvar</Button>
              </div>
            )}

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Cargo Anterior</TableHead>
                  <TableHead>Novo Cargo</TableHead>
                  <TableHead>Salário Anterior</TableHead>
                  <TableHead>Novo Salário</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(!promotions || promotions.length === 0) && (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">Nenhuma promoção registrada</TableCell></TableRow>
                )}
                {promotions?.map(p => (
                  <TableRow key={p.id}>
                    <TableCell className="text-sm">{formatDate(p.effective_date)}</TableCell>
                    <TableCell className="text-sm">{p.previous_role || "—"}</TableCell>
                    <TableCell className="text-sm font-medium">{p.new_role}</TableCell>
                    <TableCell className="text-sm">{formatCurrency(p.previous_salary)}</TableCell>
                    <TableCell className="text-sm font-medium">{formatCurrency(p.new_salary)}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deletePromotion.mutate({ id: p.id, memberId: member.id })}>
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TabsContent>

          <TabsContent value="bonuses" className="space-y-3">
            <div className="flex justify-end">
              <Button size="sm" variant="outline" onClick={() => setShowBonusForm(!showBonusForm)}>
                <Plus className="h-3 w-3 mr-1" /> Novo Bônus
              </Button>
            </div>

            {showBonusForm && (
              <div className="rounded-lg border p-4 space-y-3 bg-muted/30">
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-1">
                    <Label className="text-xs">Ano Referência *</Label>
                    <Input type="number" value={bonusForm.reference_year} onChange={e => setBonusForm({ ...bonusForm, reference_year: e.target.value })} />
                  </div>
                  <div className="grid gap-1">
                    <Label className="text-xs">Valor (R$) *</Label>
                    <Input type="number" value={bonusForm.amount} onChange={e => setBonusForm({ ...bonusForm, amount: e.target.value })} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-1">
                    <Label className="text-xs">Data de Pagamento</Label>
                    <Input type="date" value={bonusForm.payment_date} onChange={e => setBonusForm({ ...bonusForm, payment_date: e.target.value })} />
                  </div>
                  <div className="grid gap-1">
                    <Label className="text-xs">Observações</Label>
                    <Input value={bonusForm.notes} onChange={e => setBonusForm({ ...bonusForm, notes: e.target.value })} />
                  </div>
                </div>
                <Button size="sm" onClick={handleAddBonus} disabled={createBonus.isPending}>Salvar</Button>
              </div>
            )}

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ano</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Data Pagamento</TableHead>
                  <TableHead>Observações</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(!bonuses || bonuses.length === 0) && (
                  <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6">Nenhum bônus registrado</TableCell></TableRow>
                )}
                {bonuses?.map(b => (
                  <TableRow key={b.id}>
                    <TableCell className="text-sm font-medium">{b.reference_year}</TableCell>
                    <TableCell className="text-sm">{formatCurrency(Number(b.amount))}</TableCell>
                    <TableCell className="text-sm">{formatDate(b.payment_date)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{b.notes || "—"}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteBonus.mutate({ id: b.id, memberId: member.id })}>
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
