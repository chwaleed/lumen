import {
  Clock3,
  FolderOpen,
  LayoutTemplate,
  LogOut,
  Plus,
  Settings,
  Sparkles,
  X,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type DashboardTab = "recent" | "all" | "templates";

type DashboardSidebarProps = {
  isMobile: boolean;
  sidebarOpen: boolean;
  activeTab: DashboardTab;
  setSidebarOpen: (open: boolean) => void;
  onSelectTab: (tab: DashboardTab) => void;
  onOpenProject: (projectId: string) => void;
  onLogout: () => void;
  user: {
    name: string;
    email: string;
    avatar?: string;
  };
};

export function DashboardSidebar({
  isMobile,
  sidebarOpen,
  activeTab,
  setSidebarOpen,
  onSelectTab,
  onOpenProject,
  onLogout,
  user,
}: DashboardSidebarProps) {
  const containerVisibility = isMobile
    ? sidebarOpen
      ? "absolute left-0 top-0 z-30 flex"
      : "hidden"
    : "relative flex";

  return (
    <aside className={`${containerVisibility} h-full w-64 flex-col border-r bg-card/30`}>
      <div className="flex items-center gap-2 border-b px-6 py-5 text-primary">
        <Sparkles className="size-5" />
        <span className="text-xl font-semibold tracking-tight">TexAI</span>
        {isMobile ? (
          <Button variant="ghost" size="icon" className="ml-auto" onClick={() => setSidebarOpen(false)}>
            <X className="size-4" />
          </Button>
        ) : null}
      </div>

      <div className="px-4 py-4">
        <Button className="w-full justify-start" size="lg" onClick={() => onOpenProject("new")}>
          <Plus data-icon="inline-start" />
          New Project
        </Button>
      </div>

      <nav className="flex flex-1 flex-col gap-1 px-3">
        <Button
          variant={activeTab === "recent" ? "secondary" : "ghost"}
          className="h-11 justify-start"
          onClick={() => onSelectTab("recent")}
        >
          <Clock3 data-icon="inline-start" />
          Recent
        </Button>
        <Button
          variant={activeTab === "all" ? "secondary" : "ghost"}
          className="h-11 justify-start"
          onClick={() => onSelectTab("all")}
        >
          <FolderOpen data-icon="inline-start" />
          All Projects
        </Button>
        <Button
          variant={activeTab === "templates" ? "secondary" : "ghost"}
          className="h-11 justify-start"
          onClick={() => onSelectTab("templates")}
        >
          <LayoutTemplate data-icon="inline-start" />
          Templates
        </Button>
      </nav>

      <div className="border-t p-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-12 w-full justify-start px-2">
              <Avatar className="mr-3 size-8">
                <AvatarImage src={user.avatar} />
                <AvatarFallback>{user.name[0] ?? "U"}</AvatarFallback>
              </Avatar>
              <div className="flex min-w-0 flex-col items-start gap-0.5">
                <span className="truncate text-sm font-medium">{user.name}</span>
                <span className="truncate text-xs text-muted-foreground">{user.email}</span>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuGroup>
              <DropdownMenuLabel>Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <Settings data-icon="inline-start" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onLogout} className="text-destructive focus:text-destructive">
                <LogOut data-icon="inline-start" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  );
}
