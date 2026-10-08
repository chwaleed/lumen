import { describe, expect, it } from "bun:test";
import { countWords } from "@/app/project/[id]/components/status-bar";

describe("countWords", () => {
  it("counts prose", () => {
    expect(countWords("the quick brown fox")).toBe(4);
  });

  it("does not count markup as words", () => {
    // A naive split on whitespace calls this 7 words, which makes the counter
    // useless for the one document type this editor is for.
    expect(countWords("\\section{Intro}\nHello there, reader.")).toBe(4);
  });

  it("ignores a preamble command's options and its name argument", () => {
    // "article" is a class name, not something the reader ever sees.
    expect(countWords("\\documentclass[12pt]{article} words here")).toBe(2);
    expect(countWords("\\usepackage[utf8]{inputenc} words here")).toBe(2);
  });

  it("does not count maths", () => {
    // texcount does the same. Splitting $x^2$ into "x" and "2" inflates the
    // number, and someone checking a word limit is asking about prose.
    expect(countWords("Let $x^2 + y_1$ be")).toBe(2);
    expect(countWords("Before \\[ \\int_0^1 x \\] after")).toBe(2);
  });

  it("ignores comments", () => {
    expect(countWords("real words % and a note about them")).toBe(2);
  });

  it("is zero for an empty file", () => {
    expect(countWords("")).toBe(0);
    expect(countWords("   \n\t ")).toBe(0);
  });

  it("is zero for a file that is only markup", () => {
    expect(countWords("\\begin{document}\n\\end{document}")).toBe(0);
  });
});
