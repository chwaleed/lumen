// Pulls Bun's type declarations (including the "bun:test" module) into the
// program explicitly, rather than relying on automatic @types discovery —
// which some editors' TS servers resolve differently from `tsc` on the CLI.
/// <reference types="bun" />
