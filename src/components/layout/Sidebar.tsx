import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  FolderKanban,
  LayoutDashboard,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  ShipWheel,
} from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";

import { NotificationBell } from "@/components/notifications/NotificationBell";
import api from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

type ProjectSummary = {
  id: string;
  name: string;
  type: string;
};

function getInitials(name?: string | null) {
  if (!name) return "GS";
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function SidebarNavLink({
  to,
  icon: Icon,
  label,
  collapsed,
}: {
  to: string;
  icon: typeof LayoutDashboard;
  label: string;
  collapsed: boolean;
}) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          "flex h-9 items-center gap-2 rounded-lg px-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
          isActive && "bg-muted text-foreground",
          collapsed && "justify-center px-0",
        )
      }
    >
      <Icon data-icon="inline-start" />
      <span className={cn(collapsed && "sr-only")}>{label}</span>
    </NavLink>
  );
}

function ProjectLink({
  project,
  collapsed,
}: {
  project: ProjectSummary;
  collapsed: boolean;
}) {
  return (
    <NavLink
      to={`/projects/${project.id}`}
      className={({ isActive }) =>
        cn(
          "flex min-h-10 items-center gap-2 rounded-lg px-2 py-2 text-left text-sm transition-colors hover:bg-muted",
          isActive && "bg-muted",
          collapsed && "justify-center px-0",
        )
      }
    >
      <FolderKanban data-icon="inline-start" />
      <span className={cn("min-w-0 flex-1", collapsed && "sr-only")}>
        <span className="block truncate font-medium">{project.name}</span>
        <Badge variant="secondary" className="mt-1">
          {project.type}
        </Badge>
      </span>
    </NavLink>
  );
}

function UserMenu({ collapsed }: { collapsed: boolean }) {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const clearAuth = useAuthStore((state) => state.clearAuth);

  async function handleLogout() {
    await api.post("/auth/logout");
    clearAuth();
    navigate("/login", { replace: true });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className={cn(
            "h-auto w-full justify-start gap-2 px-2 py-2",
            collapsed && "justify-center px-0",
          )}
        >
          <Avatar className="size-8">
            <AvatarImage src={user?.avatarUrl ?? undefined} alt="" />
            <AvatarFallback>{getInitials(user?.name)}</AvatarFallback>
          </Avatar>
          <span className={cn("min-w-0 text-left", collapsed && "sr-only")}>
            <span className="block truncate text-sm font-medium">
              {user?.name ?? "Builder"}
            </span>
            <span className="block truncate text-xs text-muted-foreground">
              {user?.email}
            </span>
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" side="top" className="w-56">
        <DropdownMenuLabel>{user?.name ?? "Account"}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => navigate("/settings")}>
          <Settings data-icon="inline-start" />
          Settings
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={handleLogout}>
          <LogOut data-icon="inline-start" />
          Logout
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function SidebarContent({
  collapsed,
  onCollapseToggle,
}: {
  collapsed: boolean;
  onCollapseToggle?: () => void;
}) {
  const projectsQuery = useQuery({
    queryKey: ["projects", "sidebar"],
    queryFn: async () => {
      const response = await api.get<ProjectSummary[]>("/projects");
      return response.data;
    },
  });

  const projects = projectsQuery.data ?? [];

  return (
    <div className="flex h-full flex-col gap-3 p-3">
      <div className="flex items-center justify-between gap-2">
        <NavLink
          to="/dashboard"
          className={cn(
            "flex h-10 min-w-0 items-center gap-2 rounded-lg px-2 font-semibold",
            collapsed && "justify-center px-0",
          )}
        >
          <ShipWheel data-icon="inline-start" />
          <span className={cn("truncate", collapsed && "sr-only")}>
            GitShipDone
          </span>
        </NavLink>
        {onCollapseToggle ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            onClick={onCollapseToggle}
            className="hidden md:inline-flex"
          >
            {collapsed ? <PanelLeftOpen /> : <PanelLeftClose />}
          </Button>
        ) : null}
      </div>

      <nav aria-label="Primary navigation" className="flex flex-col gap-1">
        <SidebarNavLink
          to="/dashboard"
          icon={LayoutDashboard}
          label="Dashboard"
          collapsed={collapsed}
        />
        <SidebarNavLink
          to="/settings"
          icon={Settings}
          label="Settings"
          collapsed={collapsed}
        />
      </nav>

      <div className={cn("text-xs font-medium text-muted-foreground", collapsed && "sr-only")}>
        Projects
      </div>
      <ScrollArea className="min-h-0 flex-1">
        <nav aria-label="Project navigation" className="flex flex-col gap-1 pr-1">
          {projects.map((project) => (
            <ProjectLink
              key={project.id}
              project={project}
              collapsed={collapsed}
            />
          ))}
          {!projectsQuery.isLoading && projects.length === 0 ? (
            <p className={cn("px-2 py-3 text-sm text-muted-foreground", collapsed && "sr-only")}>
              No projects yet.
            </p>
          ) : null}
        </nav>
      </ScrollArea>

      <NotificationBell collapsed={collapsed} />
      <UserMenu collapsed={collapsed} />
    </div>
  );
}

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <>
      <div className="fixed left-3 top-3 z-10 md:hidden">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" aria-label="Open navigation">
              <Menu />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 p-0">
            <SheetTitle className="sr-only">Navigation</SheetTitle>
            <SidebarContent collapsed={false} />
          </SheetContent>
        </Sheet>
      </div>
      <aside
        data-testid="app-sidebar"
        data-collapsed={collapsed}
        className={cn(
          "hidden h-screen shrink-0 border-r bg-card transition-[width] duration-200 md:block",
          collapsed ? "w-[60px]" : "w-60",
        )}
      >
        <SidebarContent
          collapsed={collapsed}
          onCollapseToggle={() => setCollapsed((value) => !value)}
        />
      </aside>
    </>
  );
}
