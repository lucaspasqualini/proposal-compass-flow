import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ROLE_LABELS, type AppRole } from "@/hooks/useUserRole";

interface RoleBadgeProps {
  role: AppRole | null | undefined;
  className?: string;
}

const ROLE_STYLES: Record<AppRole, string> = {
  socio: "bg-purple-100 text-purple-800 hover:bg-purple-100 dark:bg-purple-950 dark:text-purple-200",
  gerente_projetos: "bg-blue-100 text-blue-800 hover:bg-blue-100 dark:bg-blue-950 dark:text-blue-200",
  consultor_projetos: "bg-emerald-100 text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-200",
  estagiario: "bg-amber-100 text-amber-800 hover:bg-amber-100 dark:bg-amber-950 dark:text-amber-200",
  administrativo: "bg-orange-100 text-orange-800 hover:bg-orange-100 dark:bg-orange-950 dark:text-orange-200",
};

export function RoleBadge({ role, className }: RoleBadgeProps) {
  if (!role) {
    return (
      <Badge variant="outline" className={cn("text-muted-foreground border-dashed", className)}>
        Sem acesso
      </Badge>
    );
  }
  return (
    <Badge variant="secondary" className={cn("border-transparent", ROLE_STYLES[role], className)}>
      {ROLE_LABELS[role]}
    </Badge>
  );
}
