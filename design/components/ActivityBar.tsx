import { 
  Folder, 
  Search, 
  Sparkles 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface ActivityBarProps {
  activeSidebarTab: string;
  setActiveSidebarTab: (tab: string) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

export function ActivityBar({ activeSidebarTab, setActiveSidebarTab, sidebarOpen, setSidebarOpen }: ActivityBarProps) {
  const handleTabClick = (tab: string) => {
    setActiveSidebarTab(tab);
    if (!sidebarOpen) setSidebarOpen(true);
  };

  return (
    <div className="hidden md:flex w-14 flex-shrink-0 border-r bg-muted/30 flex-col items-center py-4 space-y-4 z-10">
      <Tooltip>
        <TooltipTrigger render={<Button 
            variant={activeSidebarTab === 'files' && sidebarOpen ? 'secondary' : 'ghost'} 
            size="icon" 
            className={`rounded-xl ${activeSidebarTab === 'files' && sidebarOpen ? 'bg-primary/10 text-primary' : 'text-muted-foreground'}`}
            onClick={() => handleTabClick('files')}
          />}>
          <Folder className="h-5 w-5" />
        </TooltipTrigger>
        <TooltipContent side="right">Explorer</TooltipContent>
      </Tooltip>
      
      <Tooltip>
        <TooltipTrigger render={<Button 
            variant={activeSidebarTab === 'search' && sidebarOpen ? 'secondary' : 'ghost'} 
            size="icon" 
            className={`rounded-xl ${activeSidebarTab === 'search' && sidebarOpen ? 'bg-primary/10 text-primary' : 'text-muted-foreground'}`}
            onClick={() => handleTabClick('search')}
          />}>
          <Search className="h-5 w-5" />
        </TooltipTrigger>
        <TooltipContent side="right">Search</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger render={<Button 
            variant={activeSidebarTab === 'ai' && sidebarOpen ? 'secondary' : 'ghost'} 
            size="icon" 
            className={`rounded-xl ${activeSidebarTab === 'ai' && sidebarOpen ? 'bg-primary/10 text-primary' : 'text-muted-foreground'}`}
            onClick={() => handleTabClick('ai')}
          />}>
          <Sparkles className="h-5 w-5" />
        </TooltipTrigger>
        <TooltipContent side="right">AI Assistant</TooltipContent>
      </Tooltip>
    </div>
  );
}
