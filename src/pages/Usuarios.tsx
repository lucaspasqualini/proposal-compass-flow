import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowUpDown, ChevronDown, Plus, MoreHorizontal, KeyRound, Trash2 } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ROLE_LABELS, type AppRole, useUserRole } from "@/hooks/useUserRole";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { toast } from "sonner";
import { useState, useMemo, useRef } from "react";
import { RoleBadge } from "@/components/RoleBadge";
import { cn } from "@/lib/utils";

interface ProfileRow {
  user_id: string;
  full_name: string;
  email: string | null;
}

interface UserRoleRow {
  id: string;
  user_id: string;
  role: AppRole;
}

type SortKey = "name" | "email" | "role";

const PERMISSION_MATRIX: { module: string; roles: Record<AppRole, string> }[] = [
  { module: "Dashboard", roles: { socio: "✅", gerente_projetos: "—", consultor_projetos: "—", estagiario: "—", administrativo: "—" } },
  { module: "Propostas", roles: { socio: "✅ CRUD", gerente_projetos: "✅ CRUD", consultor_projetos: "✅ (sem totalizadores)", estagiario: "—", administrativo: "—" } },
  { module: "Projetos", roles: { socio: "✅ CRUD", gerente_projetos: "✅ CRUD", consultor_projetos: "✅ (sem totalizadores)", estagiario: "—", administrativo: "—" } },
  { module: "Templates", roles: { socio: "✅", gerente_projetos: "✅", consultor_projetos: "✅", estagiario: "—", administrativo: "—" } },
  { module: "Alocação", roles: { socio: "✅ CRUD", gerente_projetos: "✅ CRUD", consultor_projetos: "✅ CRUD", estagiario: "👁️ leitura", administrativo: "👁️ leitura" } },
  { module: "Clientes", roles: { socio: "✅ CRUD", gerente_projetos: "✅ CRUD", consultor_projetos: "👁️ leitura", estagiario: "—", administrativo: "✅ CRUD" } },
  { module: "Equipe", roles: { socio: "✅ CRUD (c/ salário)", gerente_projetos: "—", consultor_projetos: "—", estagiario: "—", administrativo: "👁️ leitura (c/ salário)" } },
  { module: "Contas a Receber", roles: { socio: "✅ CRUD", gerente_projetos: "✅ CRUD", consultor_projetos: "—", estagiario: "—", administrativo: "✅ CRUD" } },
  { module: "Usuários", roles: { socio: "✅", gerente_projetos: "—", consultor_projetos: "—", estagiario: "—", administrativo: "—" } },
];

async function callManageUsers(action: string, body: Record<string, unknown>) {
  const { data: { session } } = await supabase.auth.getSession();
  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
  const res = await fetch(
    `https://${projectId}.supabase.co/functions/v1/manage-users/${action}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session?.access_token}`,
      },
      body: JSON.stringify(body),
    }
  );
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Erro na operação");
  return data;
}

export default function Usuarios() {
  const { isSocio, isLoading } = useUserRole();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<AppRole | "all" | "none">("all");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [matrixOpen, setMatrixOpen] = useState(false);

  // Invite dialog
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<AppRole>("consultor_projetos");
  const [inviteLoading, setInviteLoading] = useState(false);

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<ProfileRow | null>(null);

  const { data: profiles = [], isLoading: loadingProfiles } = useQuery({
    queryKey: ["all_profiles"],
    enabled: isSocio,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, full_name, email")
        .order("full_name");
      if (error) throw error;
      return data as ProfileRow[];
    },
  });

  const { data: roles = [], isLoading: loadingRoles } = useQuery({
    queryKey: ["all_user_roles"],
    enabled: isSocio,
    queryFn: async () => {
      const { data, error } = await supabase.from("user_roles").select("id, user_id, role");
      if (error) throw error;
      return data as UserRoleRow[];
    },
  });

  const rolesByUser = useMemo(() => {
    const m = new Map<string, AppRole>();
    roles.forEach((r) => m.set(r.user_id, r.role));
    return m;
  }, [roles]);

  // Inline edit mutations
  const updateProfile = useMutation({
    mutationFn: async ({ userId, field, value }: { userId: string; field: "full_name" | "email"; value: string }) => {
      const updateData = field === "full_name"
        ? { full_name: value.trim() }
        : { email: value.trim() };
      const { error } = await supabase
        .from("profiles")
        .update(updateData)
        .eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["all_profiles"] });
      qc.invalidateQueries({ queryKey: ["my_profile"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const setRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AppRole }) => {
      await supabase.from("user_roles").delete().eq("user_id", userId);
      const { error } = await supabase.from("user_roles").insert({ user_id: userId, role });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["all_user_roles"] });
      toast.success("Papel atualizado");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleInvite = async () => {
    if (!inviteEmail) { toast.error("Informe o email"); return; }
    setInviteLoading(true);
    try {
      await callManageUsers("invite", { email: inviteEmail, full_name: inviteName, role: inviteRole });
      toast.success(`Usuário ${inviteEmail} criado com senha padrão Meden001`);
      setInviteOpen(false);
      setInviteName("");
      setInviteEmail("");
      setInviteRole("consultor_projetos");
      qc.invalidateQueries({ queryKey: ["all_profiles"] });
      qc.invalidateQueries({ queryKey: ["all_user_roles"] });
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setInviteLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await callManageUsers("delete", { user_id: deleteTarget.user_id });
      toast.success("Usuário excluído");
      qc.invalidateQueries({ queryKey: ["all_profiles"] });
      qc.invalidateQueries({ queryKey: ["all_user_roles"] });
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setDeleteTarget(null);
    }
  };

  const handleResetPassword = async (userId: string) => {
    try {
      await callManageUsers("reset-password", { user_id: userId });
      toast.success("Senha redefinida para Meden001");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    let list = profiles.filter((p) => {
      const matchesText =
        !q ||
        (p.full_name || "").toLowerCase().includes(q) ||
        (p.email || "").toLowerCase().includes(q);
      const r = rolesByUser.get(p.user_id);
      const matchesRole =
        roleFilter === "all" ||
        (roleFilter === "none" && !r) ||
        r === roleFilter;
      return matchesText && matchesRole;
    });
    list = [...list].sort((a, b) => {
      let cmp = 0;
      if (sortKey === "name") cmp = (a.full_name || "").localeCompare(b.full_name || "");
      else if (sortKey === "email") cmp = (a.email || "").localeCompare(b.email || "");
      else {
        const ra = rolesByUser.get(a.user_id) || "";
        const rb = rolesByUser.get(b.user_id) || "";
        cmp = ra.localeCompare(rb);
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return list;
  }, [profiles, search, roleFilter, sortKey, sortDir, rolesByUser]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  };

  if (isLoading) return null;
  if (!isSocio) return <Navigate to="/" replace />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Usuários</h1>
          <p className="text-muted-foreground mt-1 max-w-3xl text-sm">
            Gerencie quem tem acesso ao sistema e o nível de permissão de cada pessoa.
          </p>
        </div>
        <Button onClick={() => setInviteOpen(true)}>
          <Plus className="h-4 w-4 mr-2" /> Adicionar usuário
        </Button>
      </div>

      {/* Matriz de permissões */}
      <Collapsible open={matrixOpen} onOpenChange={setMatrixOpen}>
        <Card>
          <CollapsibleTrigger asChild>
            <button className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/50 transition-colors rounded-t-lg">
              <span className="font-medium">Ver matriz de permissões</span>
              <ChevronDown className={cn("h-4 w-4 transition-transform", matrixOpen && "rotate-180")} />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="border-t overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Módulo</TableHead>
                    {(Object.keys(ROLE_LABELS) as AppRole[]).map((r) => (
                      <TableHead key={r}>{ROLE_LABELS[r]}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {PERMISSION_MATRIX.map((row) => (
                    <TableRow key={row.module}>
                      <TableCell className="font-medium">{row.module}</TableCell>
                      {(Object.keys(ROLE_LABELS) as AppRole[]).map((r) => (
                        <TableCell key={r} className="text-sm text-muted-foreground">
                          {row.roles[r]}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Input
          placeholder="Buscar por nome ou email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <Select value={roleFilter} onValueChange={(v) => setRoleFilter(v as typeof roleFilter)}>
          <SelectTrigger className="w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os papéis</SelectItem>
            <SelectItem value="none">Sem acesso</SelectItem>
            {(Object.keys(ROLE_LABELS) as AppRole[]).map((r) => (
              <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Tabela */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <button onClick={() => toggleSort("name")} className="flex items-center gap-1 hover:text-foreground">
                  Nome <ArrowUpDown className="h-3 w-3" />
                </button>
              </TableHead>
              <TableHead>
                <button onClick={() => toggleSort("email")} className="flex items-center gap-1 hover:text-foreground">
                  Email <ArrowUpDown className="h-3 w-3" />
                </button>
              </TableHead>
              <TableHead>
                <button onClick={() => toggleSort("role")} className="flex items-center gap-1 hover:text-foreground">
                  Papel <ArrowUpDown className="h-3 w-3" />
                </button>
              </TableHead>
              <TableHead className="w-16"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loadingProfiles || loadingRoles ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground">Carregando...</TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground">Nenhum usuário encontrado</TableCell>
              </TableRow>
            ) : (
              filtered.map((p) => {
                const currentRole = rolesByUser.get(p.user_id);
                const isMe = p.user_id === user?.id;
                return (
                  <TableRow key={p.user_id} className={cn(isMe && "bg-primary/5")}>
                    <TableCell>
                      <InlineEdit
                        value={p.full_name || ""}
                        placeholder="Nome completo"
                        onSave={(v) => updateProfile.mutate({ userId: p.user_id, field: "full_name", value: v })}
                      />
                      {isMe && <span className="text-xs text-primary ml-2">(você)</span>}
                    </TableCell>
                    <TableCell>
                      <InlineEdit
                        value={p.email || ""}
                        placeholder="email@exemplo.com"
                        onSave={(v) => updateProfile.mutate({ userId: p.user_id, field: "email", value: v })}
                      />
                    </TableCell>
                    <TableCell>
                      <Select
                        value={currentRole ?? ""}
                        onValueChange={(v) => setRole.mutate({ userId: p.user_id, role: v as AppRole })}
                        disabled={isMe}
                      >
                        <SelectTrigger className="w-44 h-8 text-xs">
                          <SelectValue placeholder="Atribuir..." />
                        </SelectTrigger>
                        <SelectContent>
                          {(Object.keys(ROLE_LABELS) as AppRole[]).map((r) => (
                            <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      {!isMe && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleResetPassword(p.user_id)}>
                              <KeyRound className="h-4 w-4 mr-2" /> Redefinir senha
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => setDeleteTarget(p)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" /> Excluir usuário
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Invite Dialog */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar usuário</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome completo</Label>
              <Input value={inviteName} onChange={(e) => setInviteName(e.target.value)} placeholder="Nome do usuário" />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="email@exemplo.com" />
            </div>
            <div className="space-y-2">
              <Label>Papel</Label>
              <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as AppRole)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(ROLE_LABELS) as AppRole[]).map((r) => (
                    <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteOpen(false)}>Cancelar</Button>
            <Button onClick={handleInvite} disabled={inviteLoading}>
              {inviteLoading ? "Enviando..." : "Enviar convite"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir usuário</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir <strong>{deleteTarget?.full_name || deleteTarget?.email}</strong>? Esta ação é irreversível e remove todo o acesso à plataforma.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Inline editable cell
function InlineEdit({ value, placeholder, onSave }: { value: string; placeholder: string; onSave: (v: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  const commit = () => {
    setEditing(false);
    if (draft.trim() !== value) {
      onSave(draft);
    }
  };

  if (!editing) {
    return (
      <button
        className="text-left w-full px-2 py-1 rounded hover:bg-muted/50 transition-colors text-sm truncate"
        onClick={() => { setDraft(value); setEditing(true); setTimeout(() => inputRef.current?.focus(), 0); }}
      >
        {value || <span className="text-muted-foreground italic">{placeholder}</span>}
      </button>
    );
  }

  return (
    <Input
      ref={inputRef}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => { if (e.key === "Enter") commit(); if (e.key === "Escape") { setDraft(value); setEditing(false); } }}
      className="h-8 text-sm"
      autoFocus
    />
  );
}
