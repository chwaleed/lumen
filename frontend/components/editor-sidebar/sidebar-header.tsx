import { PanelLeftClose, X } from "lucide-react";
import { Button } from "@/components/ui/button";

type SidebarHeaderProps = {
  title: React.ReactNode;
  rightContent?: React.ReactNode;
  onClose: () => void;
};

export function SidebarHeader({ title, rightContent, onClose }: SidebarHeaderProps) {
  return (
    <div className="px-4 py-2 border-b bg-muted/20 flex items-center justify-between">
      <div className="min-w-0">{title}</div>
      <div className="flex items-center">
        {rightContent}
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 hidden md:flex"
          onClick={onClose}
          aria-label="Close sidebar"
        >
          <PanelLeftClose className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 md:hidden ml-1"
          onClick={onClose}
          aria-label="Close sidebar"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
