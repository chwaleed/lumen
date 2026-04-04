export function StatusBar() {
  return (
    <footer className="flex items-center justify-between border-t bg-card px-4 py-1 text-xs text-muted-foreground">
      <div className="flex items-center gap-4">
        <span className="inline-flex items-center gap-2">
          <span className="size-2 rounded-full bg-primary" />
          Ready
        </span>
        <span className="hidden sm:inline">UTF-8</span>
        <span className="hidden sm:inline">LaTeX</span>
      </div>

      <div className="flex items-center gap-4">
        <span>Ln 14, Col 23</span>
        <span className="hidden sm:inline">Words: 42</span>
      </div>
    </footer>
  );
}
