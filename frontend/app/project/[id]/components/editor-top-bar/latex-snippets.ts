export type LatexSnippet = {
  label: string;
  body: string;
};

// Grouped the way they appear in the Insert menu; each group is separated in the UI.
export const LATEX_SNIPPET_GROUPS: LatexSnippet[][] = [
  [
    {
      label: "Equation",
      body: "\\begin{equation}\n  \n\\end{equation}",
    },
    {
      label: "Figure",
      body:
        "\\begin{figure}[h]\n" +
        "  \\centering\n" +
        "  \\includegraphics[width=0.5\\textwidth]{image.png}\n" +
        "  \\caption{Caption here}\n" +
        "  \\label{fig:label}\n" +
        "\\end{figure}",
    },
    {
      label: "Table",
      body:
        "\\begin{table}[h]\n" +
        "  \\centering\n" +
        "  \\begin{tabular}{|c|c|}\n" +
        "    \\hline\n" +
        "    Header 1 & Header 2 \\\\\n" +
        "    \\hline\n" +
        "    Data 1 & Data 2 \\\\\n" +
        "    \\hline\n" +
        "  \\end{tabular}\n" +
        "  \\caption{Caption here}\n" +
        "  \\label{tab:label}\n" +
        "\\end{table}",
    },
  ],
  [
    {
      label: "Itemize",
      body: "\\begin{itemize}\n  \\item \n\\end{itemize}",
    },
    {
      label: "Enumerate",
      body: "\\begin{enumerate}\n  \\item \n\\end{enumerate}",
    },
  ],
];
