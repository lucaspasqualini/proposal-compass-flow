import { Navigate, useLocation } from "react-router-dom";
import { useUserRole, getDefaultRouteForRole, canAccessRoute, type AppRole } from "@/hooks/useUserRole";
import type { ReactNode } from "react";

interface RoleProtectedRouteProps {
  children: ReactNode;
  /** Optional explicit allow-list; if omitted, falls back to ROLE_ROUTES mapping */
  allowed?: AppRole[];
}

export function RoleProtectedRoute({ children, allowed }: RoleProtectedRouteProps) {
  const { role, isLoading } = useUserRole();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!role) {
    return <Navigate to="/aguardando-acesso" replace />;
  }

  const allowedHere = allowed ? allowed.includes(role) : canAccessRoute(role, location.pathname);
  if (!allowedHere) {
    return <Navigate to={getDefaultRouteForRole(role)} replace />;
  }

  return <>{children}</>;
}
