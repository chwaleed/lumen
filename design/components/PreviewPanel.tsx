import React from 'react';
import { Button } from '@/components/ui/button';

interface PreviewPanelProps {
  sidebarOpen: boolean;
  setPreviewOpen: (open: boolean) => void;
  editorOpen: boolean;
  setEditorOpen: (open: boolean) => void;
}

export function PreviewPanel({ sidebarOpen, setPreviewOpen, editorOpen, setEditorOpen }: PreviewPanelProps) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-1 border-b bg-muted/20">
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium">Preview</span>
        </div>
        <div className="flex items-center space-x-2 text-xs text-muted-foreground">
          <span>Auto-compile: On</span>
        </div>
      </div>
      <div className="flex-1 p-2 md:p-8 overflow-auto flex justify-center bg-[#525659] dark:bg-zinc-900">
        {/* PDF Page Placeholder */}
        <div className="bg-white text-black w-full max-w-[800px] min-h-[1000px] shadow-2xl p-4 sm:p-8 md:p-16 font-serif scale-[0.8] sm:scale-100 origin-top">
          <div className="text-center mb-12">
            <h1 className="text-3xl font-bold mb-4">AI-Powered LaTeX Editor</h1>
            <p className="text-lg">User</p>
            <p className="text-md mt-2">March 29, 2026</p>
          </div>
          
          <div className="space-y-6">
            <section>
              <h2 className="text-2xl font-bold mb-3 border-b pb-1">1 Introduction</h2>
              <p className="leading-relaxed">
                Welcome to your new AI-powered LaTeX editor. Start typing your document here.
              </p>
            </section>
            
            <section>
              <h3 className="text-xl font-bold mb-2 mt-6">1.1 Mathematics</h3>
              <p className="leading-relaxed mb-4">
                You can easily write complex equations:
              </p>
              <div className="flex justify-center my-6 text-xl">
                <i>E = mc<sup>2</sup></i>
                <span className="ml-auto text-sm">(1)</span>
              </div>
            </section>
            
            <section>
              <h2 className="text-2xl font-bold mb-3 border-b pb-1 mt-8">2 Conclusion</h2>
              <p className="leading-relaxed">
                This is a placeholder for the live preview.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
