import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type AppRole =
  | "socio"
  | "gerente_projetos"
  | "consultor_projetos"
  | "estagiario"
  | "administrativo";

export const ROLE_LABELS: Record<AppRole, string> = {
  socio: "Sócio",
  gerente_projetos: "Gerente de Projetos",
  consultor_projetos: "Consultor de Projetos",
  estagiario: "Estagiário",
  administrativo: "Administrativo",
};

export function useUserRole() {
  const { user, loading: authLoading } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["user_role", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return (data?.role ?? null) as AppRole | null;
    },
  });

  const role = data ?? null;

  return {
    role,
    isLoading: authLoading || (!!user && isLoading),
    isSocio: role === "socio",
    isGerente: role === "gerente_projetos",
    isConsultor: role === "consultor_projetos",
    isEstagiario: role === "estagiario",
    isAdministrativo: role === "administrativo",
  };
}

/** Default landing route for each role */
export function getDefaultRouteForRole(role: AppRole | null): string {
  switch (role) {
    case "socio":
      return "/";
    case "gerente_projetos":
      return "/propostas";
    case "consultor_projetos":
      return "/propostas";
    case "estagiario":
      return "/alocacao";
    case "administrativo":
      return "/contas-a-receber";
    default:
      return "/aguardando-acesso";
  }
}

/** Which routes each role may access */
export const ROLE_ROUTES: Record<AppRole, string[]> = {
  socio: [
    "/",
    "/propostas",
    "/projetos",
    "/equipe",
    "/clientes",
    "/alocacao",
    "/contas-a-receber",
    "/templates",
    "/usuarios",
  ],
  gerente_projetos: [
    "/propostas",
    "/projetos",
    "/clientes",
    "/alocacao",
    "/contas-a-receber",
    "/templates",
  ],
  consultor_projetos: [
    "/propostas",
    "/projetos",
    "/clientes",
    "/alocacao",
    "/templates",
  ],
  estagiario: ["/alocacao"],
  administrativo: ["/clientes", "/equipe", "/alocacao", "/contas-a-receber"],
};

export function canAccessRoute(role: AppRole | null, path: string): boolean {
  if (!role) return false;
  const allowed = ROLE_ROUTES[role];
  // Match exact or prefix (for /clientes/:id etc)
  return allowed.some((r) => (r === "/" ? path === "/" : path === r || path.startsWith(r + "/")));
}
