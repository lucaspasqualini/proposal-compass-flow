import { useState, useMemo } from "react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/format";
import { maskCPF, isValidCPF, maskPhone, tenureFromHireDate } from "@/lib/masks";
import { Plus, Pencil, Trash2, ArrowUpDown, Search } from "lucide-react";
import TeamMemberDetailDialog from "@/components/TeamMemberDetailDialog";
import { useUserRole } from "@/hooks/useUserRole";
import type { Database } from "@/integrations/supabase/types";

type TeamMember = Database["public"]["Tables"]["team_members"]["Row"];
type TeamMemberInsert = Database["public"]["Tables"]["team_members"]["Insert"];

const emptyMember: TeamMemberInsert = {
  name: "", role: "", area: "", salary: null, is_active: true,
  cpf: "", birth_date: null, hire_date: null, termination_date: null,
  corporate_email: "", phone: "", address: "",
};

type SortKey = "name" | "role" | "area" | "hire_date";

export default function Equipe() {
  const { isSocio, isAdministrativo } = useUserRole();
  const canEdit = isSocio;
  const canSeeSensitive = isSocio || isAdministrativo;
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

  // Filtros e ordenação
  const [search, setSearch] = useState("");
  const [areaFilter, setAreaFilter] = useState<string>("todas");
  const [statusFilter, setStatusFilter] = useState<string>("ativos");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const areas = useMemo(() => {
    const set = new Set<string>();
    members?.forEach(m => m.area && set.add(m.area));
    return Array.from(set).sort();
  }, [members]);

  const filtered = useMemo(() => {
    let list = members ?? [];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(m =>
        m.name.toLowerCase().includes(q) ||
        (m.role ?? "").toLowerCase().includes(q) ||
        (m.area ?? "").toLowerCase().includes(q)
      );
    }
    if (areaFilter !== "todas") list = list.filter(m => m.area === areaFilter);
    if (statusFilter === "ativos") list = list.filter(m => m.is_active && !m.termination_date);
    else if (statusFilter === "desligados") list = list.filter(m => !!m.termination_date);
    else if (statusFilter === "inativos") list = list.filter(m => !m.is_active);

    const sorted = [...list].sort((a, b) => {
      const av = (a[sortKey] ?? "") as string;
      const bv = (b[sortKey] ?? "") as string;
      return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
    });
    return sorted;
  }, [members, search, areaFilter, statusFilter, sortKey, sortDir]);

  const handleOpen = (member?: TeamMember) => {
    if (member) {
      setEditing(member);
      setForm({ ...emptyMember, ...member });
    } else {
      setEditing(null);
      setForm(emptyMember);
    }
    setOpen(true);
  };

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  };

  const handleSave = async () => {
    if (!form.name?.trim()) {
      toast({ title: "Nome é obrigatório", variant: "destructive" });
      return;
    }
    if (form.cpf && !isValidCPF(form.cpf)) {
      toast({ title: "CPF inválido", variant: "destructive" });
      return;
    }
    if (form.corporate_email && !/^\S+@\S+\.\S+$/.test(form.corporate_email)) {
      toast({ title: "E-mail corporativo inválido", variant: "destructive" });
      return;
    }
    const payload: TeamMemberInsert = {
      ...form,
      // Se houver desligamento, desativa automaticamente
      is_active: form.termination_date ? false : form.is_active,
      // Normaliza strings vazias para null em campos opcionais
      cpf: form.cpf || null,
      corporate_email: form.corporate_email || null,
      phone: form.phone || null,
      address: form.address || null,
      birth_date: form.birth_date || null,
      hire_date: form.hire_date || null,
      termination_date: form.termination_date || null,
    };
    try {
      if (editing) {
        await updateMember.mutateAsync({ id: editing.id, ...payload });
        toast({ title: "Membro atualizado" });
      } else {
        await createMember.mutateAsync(payload);
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
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editing ? "Editar Membro" : "Novo Membro"}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-5 py-2">
              {/* Identificação */}
              <section className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Identificação</h3>
                <div className="grid gap-2">
                  <Label>Nome *</Label>
                  <Input value={form.name ?? ""} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>CPF</Label>
                    <Input
                      value={form.cpf ?? ""}
                      onChange={(e) => setForm({ ...form, cpf: maskCPF(e.target.value) })}
                      placeholder="000.000.000-00"
                      maxLength={14}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Data de Nascimento</Label>
                    <Input
                      type="date"
                      value={form.birth_date ?? ""}
                      onChange={(e) => setForm({ ...form, birth_date: e.target.value || null })}
                    />
                  </div>
                </div>
              </section>

              <Separator />

              {/* Contato */}
              <section className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Contato</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>E-mail corporativo</Label>
                    <Input
                      type="email"
                      value={form.corporate_email ?? ""}
                      onChange={(e) => setForm({ ...form, corporate_email: e.target.value })}
                      placeholder="nome@empresa.com"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Telefone</Label>
                    <Input
                      value={form.phone ?? ""}
                      onChange={(e) => setForm({ ...form, phone: maskPhone(e.target.value) })}
                      placeholder="(00) 00000-0000"
                      maxLength={15}
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label>Endereço</Label>
                  <Textarea
                    value={form.address ?? ""}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                    rows={2}
                  />
                </div>
              </section>

              <Separator />

              {/* Cargo & Compensação */}
              <section className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Cargo & Compensação</h3>
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
                <div className="grid gap-2">
                  <Label>Salário (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={form.salary ?? ""}
                    onChange={(e) => setForm({ ...form, salary: e.target.value ? Number(e.target.value) : null })}
                  />
                </div>
              </section>

              <Separator />

              {/* Vínculo */}
              <section className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Vínculo</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Data de Admissão</Label>
                    <Input
                      type="date"
                      value={form.hire_date ?? ""}
                      onChange={(e) => setForm({ ...form, hire_date: e.target.value || null })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Data de Desligamento</Label>
                    <Input
                      type="date"
                      value={form.termination_date ?? ""}
                      onChange={(e) => setForm({ ...form, termination_date: e.target.value || null })}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={form.is_active ?? true}
                    onCheckedChange={(v) => setForm({ ...form, is_active: v })}
                    disabled={!!form.termination_date}
                  />
                  <Label>Ativo</Label>
                  {form.termination_date && (
                    <span className="text-xs text-muted-foreground">(desativado por desligamento)</span>
                  )}
                </div>
              </section>
            </div>
            <Button onClick={handleSave} disabled={createMember.isPending || updateMember.isPending}>
              {editing ? "Salvar" : "Adicionar"}
            </Button>
          </DialogContent>
        </Dialog>
        )}
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="p-4 grid gap-3 sm:grid-cols-[1fr_180px_180px]">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, cargo ou área..."
              className="pl-8"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={areaFilter} onValueChange={setAreaFilter}>
            <SelectTrigger><SelectValue placeholder="Área" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas as áreas</SelectItem>
              {areas.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ativos">Ativos</SelectItem>
              <SelectItem value="desligados">Desligados</SelectItem>
              <SelectItem value="inativos">Inativos</SelectItem>
              <SelectItem value="todos">Todos</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Carregando...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <button className="flex items-center gap-1 hover:text-foreground" onClick={() => toggleSort("name")}>
                      Nome <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </TableHead>
                  <TableHead className="hidden sm:table-cell">
                    <button className="flex items-center gap-1 hover:text-foreground" onClick={() => toggleSort("role")}>
                      Cargo <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </TableHead>
                  <TableHead className="hidden md:table-cell">
                    <button className="flex items-center gap-1 hover:text-foreground" onClick={() => toggleSort("area")}>
                      Área <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </TableHead>
                  <TableHead className="hidden lg:table-cell">
                    <button className="flex items-center gap-1 hover:text-foreground" onClick={() => toggleSort("hire_date")}>
                      Tempo de Casa <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </TableHead>
                  {canSeeSensitive && <TableHead className="hidden md:table-cell">Salário</TableHead>}
                  <TableHead>Status</TableHead>
                  <TableHead className="w-24">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      Nenhum membro encontrado
                    </TableCell>
                  </TableRow>
                )}
                {filtered.map((m) => {
                  const tenure = tenureFromHireDate(m.hire_date, m.termination_date);
                  return (
                  <TableRow key={m.id} className="cursor-pointer" onClick={() => handleRowClick(m)}>
                    <TableCell className="font-medium">{m.name}</TableCell>
                    <TableCell className="hidden sm:table-cell">{m.role || "—"}</TableCell>
                    <TableCell className="hidden md:table-cell">{m.area || "—"}</TableCell>
                    <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">{tenure ?? "—"}</TableCell>
                    {canSeeSensitive && (
                      <TableCell className="hidden md:table-cell">{formatCurrency(Number(m.salary))}</TableCell>
                    )}
                    <TableCell>
                      {m.termination_date ? (
                        <Badge variant="destructive">Desligado</Badge>
                      ) : (
                        <Badge variant={m.is_active ? "default" : "secondary"}>
                          {m.is_active ? "Ativo" : "Inativo"}
                        </Badge>
                      )}
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
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <TeamMemberDetailDialog member={selectedMember} open={detailOpen} onOpenChange={setDetailOpen} />
    </div>
  );
}
