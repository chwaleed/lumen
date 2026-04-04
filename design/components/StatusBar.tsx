function StatusBar() {
  return (
    <footer className="flex items-center justify-between px-4 py-1 border-t bg-card text-xs text-muted-foreground">
      <div className="flex items-center space-x-4">
        <span className="flex items-center"><div className="w-2 h-2 rounded-full bg-green-500 mr-2"></div> Ready</span>
        <span className="hidden sm:inline">UTF-8</span>
        <span className="hidden sm:inline">LaTeX</span>
      </div>
      <div className="flex items-center space-x-4">
        <span>Ln 14, Col 23</span>
        <span className="hidden sm:inline">Words: 42</span>
      </div>
    </footer>
  );
}

export default StatusBar;