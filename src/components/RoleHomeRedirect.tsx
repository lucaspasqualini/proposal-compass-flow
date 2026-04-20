import { Navigate } from "react-router-dom";
import { useUserRole, getDefaultRouteForRole } from "@/hooks/useUserRole";
import type { ReactNode } from "react";

/**
 * Used on "/" — sócios see Dashboard; everyone else is redirected to their default route.
 */
export function RoleHomeRedirect({ children }: { children: ReactNode }) {
  const { role, isSocio, isLoading } = useUserRole();

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!role) return <Navigate to="/aguardando-acesso" replace />;
  if (isSocio) return <>{children}</>;
  return <Navigate to={getDefaultRouteForRole(role)} replace />;
}
