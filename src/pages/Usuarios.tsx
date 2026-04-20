import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trash2 } from "lucide-react";
import { ROLE_LABELS, type AppRole, useUserRole } from "@/hooks/useUserRole";
import { Navigate } from "react-router-dom";
import { toast } from "sonner";
import { useState, useMemo } from "react";

interface ProfileRow {
  user_id: string;
  full_name: string;
}

interface UserRoleRow {
  id: string;
  user_id: string;
  role: AppRole;
}

export default function Usuarios() {
  const { isSocio, isLoading } = useUserRole();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");

  const { data: profiles = [], isLoading: loadingProfiles } = useQuery({
    queryKey: ["all_profiles"],
    enabled: isSocio,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, full_name")
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

  const setRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AppRole }) => {
      // Remove existing roles for this user, then add the new one
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
    if (!q) return profiles;
    return profiles.filter((p) => p.full_name.toLowerCase().includes(q));
  }, [profiles, search]);

  if (isLoading) return null;
  if (!isSocio) return <Navigate to="/" replace />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Usuários</h1>
        <p className="text-muted-foreground">Gerencie os papéis de acesso dos usuários</p>
      </div>

      <Card className="p-4">
        <Input
          placeholder="Buscar por nome..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm mb-4"
        />

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Papel</TableHead>
              <TableHead className="w-20"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loadingProfiles || loadingRoles ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-muted-foreground">
                  Carregando...
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-muted-foreground">
                  Nenhum usuário encontrado
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((p) => {
                const currentRole = rolesByUser.get(p.user_id);
                return (
                  <TableRow key={p.user_id}>
                    <TableCell className="font-medium">
                      {p.full_name || <span className="text-muted-foreground italic">Sem nome</span>}
                    </TableCell>
                    <TableCell>
                      <Select
                        value={currentRole ?? ""}
                        onValueChange={(v) =>
                          setRole.mutate({ userId: p.user_id, role: v as AppRole })
                        }
                      >
                        <SelectTrigger className="w-64">
                          <SelectValue placeholder="Sem acesso" />
                        </SelectTrigger>
                        <SelectContent>
                          {(Object.keys(ROLE_LABELS) as AppRole[]).map((r) => (
                            <SelectItem key={r} value={r}>
                              {ROLE_LABELS[r]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      {currentRole && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeRole.mutate(p.user_id)}
                          title="Revogar acesso"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
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
  );
}
