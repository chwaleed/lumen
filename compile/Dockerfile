# The compile image: pinned TeX Live, hardened texmf.cnf, caches baked in.
#
# Pinned by DIGEST, not tag. The registry publishes no immutable dated tag for the
# current TeX Live release -- it carries TL2013..TL2025, all -historic, and the
# current release only through mutable `latest*` tags, which are rebuilt weekly.
# See docs/decisions/0008-latex-compiler-stack.md.
#
# This digest is the multi-arch index for texlive/texlive:latest as of 2026-10-06
# (TeX Live 2026: pdfTeX 1.40.29, XeTeX 0.999998, LuaHBTeX 1.24.0, latexmk 4.88,
# biber 2.22). Upgrading TeX Live means changing this line deliberately and
# re-running ./verify.sh.
FROM texlive/texlive@sha256:a7ae4dfa9d521b5db14446872fa488b839021d1f604d0a3c74461784895f2a67

# --- Hardening. See docs/decisions/0009-use-restricted-shell-escape.md.
#
# openin_any ships as 'a' -- read ANY file -- which is an arbitrary-file-read
# primitive enabled by default. Setting it is a real change, not a formality.
#
# shell_escape stays at 'p' (restricted): arbitrary \write18 is blocked, but the
# TeX Live security team's allowlist is permitted, which is what makes `minted`
# work. It is the shipped default; set explicitly so a base-image change cannot
# silently widen it. NEVER pass -shell-escape at runtime -- that means unrestricted.
RUN printf '\n%s\n%s\n%s\n' \
      'shell_escape = p' 'openin_any = p' 'openout_any = p' \
      >> "$(kpsewhich -var-value=SELFAUTOPARENT)/texmf.cnf" \
 && test "$(kpsewhich -var-value=shell_escape)" = p \
 && test "$(kpsewhich -var-value=openin_any)"   = p \
 && test "$(kpsewhich -var-value=openout_any)"  = p

# --- Bake every cache a first compile would otherwise build at runtime.
#
# Without this, luaotfload rebuilds its font database on every compile because
# HOME is a throwaway tmpfs: measured at 11.2s for a TWO-PAGE article, against
# 1.1s with the cache available. XeLaTeX showed the same effect, 5.4s -> 1.7s.
RUN mktexlsr \
 && (luaotfload-tool --update --force || true) \
 && (fc-cache -f >/dev/null 2>&1 || true) \
 && mktexlsr

# Warm the format files and font maps by compiling once with each engine.
RUN mkdir -p /warm && cd /warm \
 && printf '%s\n' '\documentclass{article}' '\begin{document}x\end{document}' > w.tex \
 && (pdflatex -interaction=nonstopmode -draftmode w.tex >/dev/null 2>&1 || true) \
 && (xelatex  -interaction=nonstopmode -no-pdf    w.tex >/dev/null 2>&1 || true) \
 && (lualatex -interaction=nonstopmode -draftmode w.tex >/dev/null 2>&1 || true) \
 && cd / && rm -rf /warm

# Where the baked caches live. compile.sh seeds a writable copy from here:
# a READ-ONLY cache makes LuaLaTeX fail fatally inside luaotfload-init when it
# needs to write an entry, so the runtime cache must be writable and pre-seeded.
ENV LUMEN_BAKED_CACHE=/usr/local/texlive/2026/texmf-var
