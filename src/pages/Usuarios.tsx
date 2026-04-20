import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trash2, ArrowUpDown, ChevronDown } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ROLE_LABELS, type AppRole, useUserRole } from "@/hooks/useUserRole";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { toast } from "sonner";
import { useState, useMemo, useEffect } from "react";
import { UserAvatar } from "@/components/UserAvatar";
import { RoleBadge } from "@/components/RoleBadge";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ProfileRow {
  user_id: string;
  full_name: string;
  email: string | null;
  created_at: string;
}

interface UserRoleRow {
  id: string;
  user_id: string;
  role: AppRole;
}

type SortKey = "name" | "email" | "created_at";

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

export default function Usuarios() {
  const { isSocio, isLoading } = useUserRole();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<AppRole | "all" | "none">("all");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [matrixOpen, setMatrixOpen] = useState(false);

  const { data: profiles = [], isLoading: loadingProfiles } = useQuery({
    queryKey: ["all_profiles"],
    enabled: isSocio,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, full_name, email, created_at")
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

  const myProfile = useMemo(
    () => profiles.find((p) => p.user_id === user?.id),
    [profiles, user?.id],
  );
  const [myName, setMyName] = useState("");
  useEffect(() => {
    if (myProfile) setMyName(myProfile.full_name || "");
  }, [myProfile]);

  const saveMyName = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Sem usuário");
      const { error } = await supabase
        .from("profiles")
        .update({ full_name: myName.trim() })
        .eq("user_id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["all_profiles"] });
      qc.invalidateQueries({ queryKey: ["my_profile"] });
      toast.success("Nome atualizado");
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

  const removeRole = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase.from("user_roles").delete().eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["all_user_roles"] });
      toast.success("Acesso revogado");
    },
  });

  const rolesByUser = useMemo(() => {
    const m = new Map<string, AppRole>();
    roles.forEach((r) => m.set(r.user_id, r.role));
    return m;
  }, [roles]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    let list = profiles.filter((p) => {
      const matchesText =
        !q ||
        p.full_name.toLowerCase().includes(q) ||
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
      else cmp = a.created_at.localeCompare(b.created_at);
      return sortDir === "asc" ? cmp : -cmp;
    });
    return list;
  }, [profiles, search, roleFilter, sortKey, sortDir, rolesByUser]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  if (isLoading) return null;
  if (!isSocio) return <Navigate to="/" replace />;

  const myRole = user ? rolesByUser.get(user.id) : undefined;

  return (
    <TooltipProvider>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Usuários</h1>
          <p className="text-muted-foreground mt-1 max-w-3xl">
            Gerencie quem tem acesso ao sistema e o nível de permissão de cada pessoa. Cada papel libera um conjunto específico de abas — veja a matriz de permissões abaixo.
          </p>
        </div>

        {/* Meu perfil */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Meu perfil</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-start gap-4">
              <UserAvatar name={myName} email={myProfile?.email} className="h-14 w-14" />
              <div className="flex-1 grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor="my-name">Nome completo</Label>
                  <Input
                    id="my-name"
                    value={myName}
                    onChange={(e) => setMyName(e.target.value)}
                    placeholder="Seu nome completo"
                  />
                </div>
                <div className="space-y-1">
                  <Label>Email</Label>
                  <Input value={myProfile?.email || ""} readOnly disabled />
                </div>
                <div className="space-y-1">
                  <Label>Papel</Label>
                  <div className="pt-2"><RoleBadge role={myRole ?? null} /></div>
                </div>
                <div className="flex items-end">
                  <Button
                    onClick={() => saveMyName.mutate()}
                    disabled={saveMyName.isPending || myName.trim() === (myProfile?.full_name || "")}
                  >
                    Salvar nome
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

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

        {/* Tabela de usuários */}
        <Card className="p-4">
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
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

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <button onClick={() => toggleSort("name")} className="flex items-center gap-1 hover:text-foreground">
                    Usuário <ArrowUpDown className="h-3 w-3" />
                  </button>
                </TableHead>
                <TableHead>
                  <button onClick={() => toggleSort("email")} className="flex items-center gap-1 hover:text-foreground">
                    Email <ArrowUpDown className="h-3 w-3" />
                  </button>
                </TableHead>
                <TableHead>Papel</TableHead>
                <TableHead>
                  <button onClick={() => toggleSort("created_at")} className="flex items-center gap-1 hover:text-foreground">
                    Cadastro <ArrowUpDown className="h-3 w-3" />
                  </button>
                </TableHead>
                <TableHead className="w-20"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadingProfiles || loadingRoles ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    Nenhum usuário encontrado
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((p) => {
                  const currentRole = rolesByUser.get(p.user_id);
                  const isMe = p.user_id === user?.id;
                  return (
                    <TableRow key={p.user_id} className={cn(isMe && "bg-primary/5")}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <UserAvatar name={p.full_name} email={p.email} />
                          <div>
                            <div className="font-medium flex items-center gap-2">
                              {p.full_name || <span className="text-muted-foreground italic">Sem nome</span>}
                              {isMe && <span className="text-xs text-primary font-normal">(você)</span>}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{p.email || "—"}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <RoleBadge role={currentRole ?? null} />
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span>
                                <Select
                                  value={currentRole ?? ""}
                                  onValueChange={(v) =>
                                    setRole.mutate({ userId: p.user_id, role: v as AppRole })
                                  }
                                  disabled={isMe}
                                >
                                  <SelectTrigger className="w-44 h-8 text-xs">
                                    <SelectValue placeholder="Atribuir..." />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {(Object.keys(ROLE_LABELS) as AppRole[]).map((r) => (
                                      <SelectItem key={r} value={r}>
                                        {ROLE_LABELS[r]}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </span>
                            </TooltipTrigger>
                            {isMe && (
                              <TooltipContent>
                                Você não pode alterar seu próprio papel
                              </TooltipContent>
                            )}
                          </Tooltip>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {format(new Date(p.created_at), "dd/MM/yyyy", { locale: ptBR })}
                      </TableCell>
                      <TableCell>
                        {currentRole && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => removeRole.mutate(p.user_id)}
                                  disabled={isMe}
                                  title={isMe ? "Você não pode revogar seu próprio acesso" : "Revogar acesso"}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </span>
                            </TooltipTrigger>
                            {isMe && (
                              <TooltipContent>
                                Você não pode revogar seu próprio acesso
                              </TooltipContent>
                            )}
                          </Tooltip>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </Card>
      </div>
    </TooltipProvider>
  );
}
