import { Menu, Moon, Search, Sun, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type ProjectsHeaderProps = {
  isMobile: boolean;
  isDarkMode: boolean;
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  setSidebarOpen: (isOpen: boolean) => void;
  toggleTheme: () => void;
};

export function ProjectsHeader({
  isMobile,
  isDarkMode,
  searchQuery,
  setSearchQuery,
  setSidebarOpen,
  toggleTheme,
}: ProjectsHeaderProps) {
  return (
    <header className="flex h-20 items-center justify-between border-b bg-background px-5 md:px-8">
      <div className="flex flex-1 items-center">
        {isMobile ? (
          <Button variant="ghost" size="icon" className="mr-2" onClick={() => setSidebarOpen(true)}>
            <Menu className="size-5" />
          </Button>
        ) : null}

        <div className="relative w-full max-w-[560px]">
          <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search..."
            className="h-12 rounded-full border-transparent bg-muted/40 pl-11 text-base"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
          />
        </div>
      </div>

      <div className="ml-4 flex items-center gap-2 md:gap-4">
        <Button variant="ghost" size="icon" className="size-10 rounded-full" onClick={toggleTheme}>
          {isDarkMode ? <Sun className="size-4" /> : <Moon className="size-4" />}
        </Button>

        <Button variant="outline" className="hidden h-10 rounded-full px-5 sm:inline-flex">
          <Upload data-icon="inline-start" />
          Import .tex
        </Button>

        <Button variant="outline" size="icon" className="size-10 rounded-full sm:hidden">
          <Upload className="size-4" />
        </Button>
      </div>
    </header>
  );
}
