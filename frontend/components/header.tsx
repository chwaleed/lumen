import { Menu, Moon, Search, Sun, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface ProjectsHeaderProps {
  isMobile: boolean;
  isDarkMode: boolean;
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  setSidebarOpen: (isOpen: boolean) => void;
  toggleTheme?: () => void;
}

export function ProjectsHeader({
  isMobile,
  isDarkMode,
  searchQuery,
  setSearchQuery,
  setSidebarOpen,
  toggleTheme,
}: ProjectsHeaderProps) {
  return (
    <header className="h-20 flex items-center justify-between px-5 md:px-8 border-b bg-background">
      <div className="flex items-center flex-1">
        {isMobile && (
          <Button variant="ghost" size="icon" className="mr-2" onClick={() => setSidebarOpen(true)}>
            <Menu className="h-5 w-5" />
          </Button>
        )}
        <div className="relative w-full max-w-[560px]">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search..."
            className="pl-11 bg-muted/40 border-transparent focus-visible:ring-1 focus-visible:ring-primary rounded-full h-12 w-full text-base"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>
      <div className="flex items-center space-x-2 md:space-x-4 ml-4">
        {toggleTheme && (
          <Button variant="ghost" size="icon" className="rounded-full h-10 w-10" onClick={toggleTheme}>
            {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
        )}
        <Button variant="outline" className="rounded-full hidden sm:flex h-10 px-5 text-base">
          <Upload className="mr-2 h-4 w-4" />
          Import .tex
        </Button>
        <Button variant="outline" size="icon" className="rounded-full sm:hidden h-10 w-10">
          <Upload className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
