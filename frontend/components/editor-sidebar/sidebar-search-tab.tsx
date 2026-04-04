import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SidebarHeader } from "./sidebar-header";

type SidebarSearchTabProps = {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  replaceQuery: string;
  setReplaceQuery: (query: string) => void;
  handleFindNext: () => void;
  handleReplaceAll: () => void;
  onCloseSidebar: () => void;
};

export function SidebarSearchTab({
  searchQuery,
  setSearchQuery,
  replaceQuery,
  setReplaceQuery,
  handleFindNext,
  handleReplaceAll,
  onCloseSidebar,
}: SidebarSearchTabProps) {
  return (
    <div className="flex flex-col h-full">
      <SidebarHeader
        title={<h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Search</h2>}
        onClose={onCloseSidebar}
      />
      <div className="p-4 space-y-4">
        <Input
          placeholder="Search"
          className="h-8 text-sm"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
        />
        <Input
          placeholder="Replace"
          className="h-8 text-sm"
          value={replaceQuery}
          onChange={(event) => setReplaceQuery(event.target.value)}
        />
        <Button variant="secondary" className="w-full h-8 text-sm" onClick={handleFindNext}>
          Find Next
        </Button>
        <Button variant="secondary" className="w-full h-8 text-sm" onClick={handleReplaceAll}>
          Replace All
        </Button>
      </div>
    </div>
  );
}
