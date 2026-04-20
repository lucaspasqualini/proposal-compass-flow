import {
  LayoutDashboard,
  FileText,
  FolderKanban,
  Users,
  Building,
  CalendarRange,
  LogOut,
  Receipt,
  LayoutTemplate,
  ShieldCheck,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole, canAccessRoute, ROLE_LABELS } from "@/hooks/useUserRole";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { UserAvatar } from "@/components/UserAvatar";
import { Building2 } from "lucide-react";

const allItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Propostas", url: "/propostas", icon: FileText },
  { title: "Projetos", url: "/projetos", icon: FolderKanban },
  { title: "Equipe", url: "/equipe", icon: Users },
  { title: "Clientes", url: "/clientes", icon: Building },
  { title: "Alocação", url: "/alocacao", icon: CalendarRange },
  { title: "Contas a Receber", url: "/contas-a-receber", icon: Receipt },
  { title: "Templates", url: "/templates", icon: LayoutTemplate },
  { title: "Usuários", url: "/usuarios", icon: ShieldCheck },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, user } = useAuth();
  const { role } = useUserRole();
  const currentPath = location.pathname;

  const { data: myProfile } = useQuery({
    queryKey: ["my_profile", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("full_name, email")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data as { full_name: string; email: string | null } | null;
    },
  });

  const isActive = (path: string) =>
    path === "/" ? currentPath === "/" : currentPath.startsWith(path);

  const mainItems = allItems.filter((item) => canAccessRoute(role, item.url));
  const displayName = myProfile?.full_name?.trim() || myProfile?.email || user?.email || "Usuário";
  const roleLabel = role ? ROLE_LABELS[role] : "Sem acesso";

  const userBlock = (
    <button
      onClick={() => navigate("/usuarios")}
      className="flex w-full items-center gap-3 rounded-md p-2 text-left hover:bg-sidebar-accent transition-colors"
    >
      <UserAvatar name={myProfile?.full_name} email={myProfile?.email || user?.email} className="h-8 w-8 shrink-0" />
      {!collapsed && (
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium text-sidebar-foreground">{displayName}</div>
          <div className="truncate text-xs text-sidebar-foreground/60">{roleLabel}</div>
        </div>
      )}
    </button>
  );

  return (
    <TooltipProvider>
      <Sidebar collapsible="icon">
        <SidebarContent>
          <SidebarGroup>
            <div className="flex items-center gap-3 px-3 py-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                <Building2 className="h-5 w-5" />
              </div>
              {!collapsed && (
                <span className="text-base font-semibold text-sidebar-foreground">
                  Gestão
                </span>
              )}
            </div>
          </SidebarGroup>

          <SidebarGroup>
            <SidebarGroupLabel>Menu</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {mainItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive(item.url)}
                    >
                      <NavLink
                        to={item.url}
                        end={item.url === "/"}
                        className="hover:bg-sidebar-accent"
                        activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                      >
                        <item.icon className="h-4 w-4" />
                        {!collapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter>
          <div className="border-t border-sidebar-border pt-2">
            {collapsed ? (
              <Tooltip>
                <TooltipTrigger asChild>{userBlock}</TooltipTrigger>
                <TooltipContent side="right">
                  <div className="text-sm font-medium">{displayName}</div>
                  <div className="text-xs text-muted-foreground">{roleLabel}</div>
                </TooltipContent>
              </Tooltip>
            ) : (
              userBlock
            )}
          </div>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                onClick={signOut}
                className="text-sidebar-foreground hover:bg-sidebar-accent"
              >
                <LogOut className="h-4 w-4" />
                {!collapsed && <span>Sair</span>}
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>
    </TooltipProvider>
  );
}
