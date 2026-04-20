import { useUserRole, type AppRole } from "@/hooks/useUserRole";
import type { ReactNode } from "react";

interface RoleGuardProps {
  allowed: AppRole[];
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * Renders children only if the current user's role is in `allowed`.
 * While loading, renders nothing.
 */
export function RoleGuard({ allowed, children, fallback = null }: RoleGuardProps) {
  const { role, isLoading } = useUserRole();
  if (isLoading) return null;
  if (!role || !allowed.includes(role)) return <>{fallback}</>;
  return <>{children}</>;
}
