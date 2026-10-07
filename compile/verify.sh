#!/usr/bin/env bash
#
# Sandbox regression suite. Run after building the image and after every
# TeX Live upgrade. Each check corresponds to a measured M0 finding in
# docs/plans/latex-compilation.md -- including the ones that FAIL by design.

set -uo pipefail
cd "$(dirname "$0")"
IMAGE="${LUMEN_TEX_IMAGE:-lumen-tex:latest}"
# mktemp honours TMPDIR. Snap-installed Docker mounts /tmp binds EMPTY, so on
# such a host run this with TMPDIR under $HOME. The preflight below catches it
# rather than letting every check pass against a document that never compiled.
TMP=$(mktemp -d); trap 'rm -rf "$TMP"' EXIT
PASS=0; FAIL=0

ok()   { printf '  \033[32mPASS\033[0m  %s\n' "$1"; PASS=$((PASS+1)); }
bad()  { printf '  \033[31mFAIL\033[0m  %s\n' "$1"; FAIL=$((FAIL+1)); }
note() { printf '  \033[33mNOTE\033[0m  %s\n' "$1"; }

doc() { mkdir -p "$TMP/$1"; cat > "$TMP/$1/t.tex"; }
run() { ./compile.sh --work "$TMP/$1" --root t.tex "${@:2}" >/dev/null 2>&1; }

# A check that concludes "blocked" because the compile never ran is worse than
# no check at all, so prove the bind mount works before trusting anything below.
preflight() {
  mkdir -p "$TMP/pre"; echo sentinel > "$TMP/pre/marker"
  got=$(docker run --rm --network=none -v "$TMP/pre:/m" "$IMAGE" cat /m/marker 2>/dev/null)
  if [ "$got" != sentinel ]; then
    echo "verify.sh: the work directory is not visible inside the container." >&2
    echo "  tried: $TMP" >&2
    echo "  Snap-installed Docker mounts /tmp binds empty. Re-run with a TMPDIR" >&2
    echo "  under \$HOME, e.g.  TMPDIR=\"\$HOME\" ./verify.sh" >&2
    exit 2
  fi
}

echo "verifying $IMAGE"
preflight
echo
echo "config as built:"
for v in shell_escape openin_any openout_any; do
  got=$(docker run --rm --network=none "$IMAGE" kpsewhich -var-value=$v 2>/dev/null)
  if [ "$got" = p ]; then ok "$v = p"; else bad "$v = '$got', expected p"; fi
done

echo
echo "attacks that must be blocked:"
doc shell <<'TEX'
\documentclass{article}\begin{document}
\immediate\write18{id > /compile/pwned.txt}
x\end{document}
TEX
run shell
if [ ! -f "$TMP/shell/t.log" ]; then bad "\\write18 check inconclusive: no log produced"
elif [ -f "$TMP/shell/pwned.txt" ]; then bad "arbitrary \\write18 EXECUTED"
else ok "arbitrary \\write18 refused"; fi

doc openin <<'TEX'
\documentclass{article}\begin{document}
\newread\r \openin\r=/etc/passwd \read\r to\l \closein\r \l
\end{document}
TEX
run openin
if [ ! -f "$TMP/openin/t.log" ]; then bad "\\openin check inconclusive: no log produced"
elif grep -qa "root:x:" "$TMP/openin/t.log"; then bad "\\openin of /etc/passwd LEAKED"
else ok "\\openin of /etc/passwd blocked"; fi

echo
echo "known-unblocked, by design -- the container is the only barrier:"
doc inp <<'TEX'
\documentclass{article}\begin{document}
\input{/etc/passwd}
\end{document}
TEX
run inp
if [ ! -f "$TMP/inp/t.log" ]; then bad "\\input check inconclusive: no log produced"
elif grep -qa "root:x:" "$TMP/inp/t.log"; then
  note "\\input{/etc/passwd} succeeds -- expected: openin_any governs \\openin only"
else
  note "\\input{/etc/passwd} now blocked -- upstream changed; revisit ADR 0008"
fi

echo
echo "secrets must not be reachable:"
doc env <<'TEX'
\documentclass{article}\begin{document}
\input{/proc/self/environ}
\end{document}
TEX
run env
if [ ! -f "$TMP/env/t.log" ]; then bad "environ check inconclusive: no log produced"
elif grep -qaiE "SECRET|PASSWORD|TOKEN|AWS_|JWT|DATABASE_URL" "$TMP/env/t.log"; then
  bad "a credential-shaped variable reached the compile log"
else
  ok "no credential-shaped variable in the container environment"
fi

echo
echo "resource limits:"
doc bomb <<'TEX'
\documentclass{article}\begin{document}
\count0=0 \loop\advance\count0 by1 \message{paddingpaddingpadding}\ifnum\count0<100000000 \repeat
\end{document}
TEX
S=$(date +%s); run bomb --deadline 15; RC=$?; E=$(date +%s)
if [ $((E-S)) -le 25 ]; then ok "runaway killed by deadline after $((E-S))s (rc=$RC)"
else bad "runaway ran $((E-S))s, deadline was 15s"; fi
SZ=$(stat -c%s "$TMP/bomb/t.log" 2>/dev/null || echo 0)
if [ "$SZ" -eq 0 ]; then bad "fsize check inconclusive: no log produced"
elif [ "$SZ" -le 110000000 ]; then ok "log capped at $((SZ/1024/1024)) MB by ulimit fsize"
else bad "log grew to $((SZ/1024/1024)) MB -- fsize limit not applied"; fi
if [ -z "$(docker ps -q --filter "name=lumen-compile-" 2>/dev/null)" ]; then
  ok "no container survived the kill"
else bad "a compile container is still running"; fi

echo
echo "capability that must work (ADR 0009):"
doc mint <<'TEX'
\documentclass{article}\usepackage{minted}\begin{document}
\begin{minted}{python}
def f(x): return x
\end{minted}
\end{document}
TEX
run mint
if [ -f "$TMP/mint/t.pdf" ] && ! grep -qa "minted executable is unavailable" "$TMP/mint/t.log" 2>/dev/null; then
  ok "minted highlights under restricted shell escape"
else
  bad "minted failed -- restricted shell escape or latexminted is unavailable"
fi

echo
echo "a real document must build:"
doc real <<'TEX'
\documentclass{article}
\usepackage{amsmath,graphicx,booktabs,hyperref,tikz}
\begin{document}
\section{One}\label{s1}
Cross-reference to \autoref{s1} and equation \eqref{e1}.
\begin{equation}\label{e1} \int_0^1 x^2\,dx = \tfrac13. \end{equation}
\begin{tikzpicture}\draw (0,0) -- (1,1);\end{tikzpicture}
\end{document}
TEX
run real
if [ -f "$TMP/real/t.pdf" ]; then ok "pdflatex produced a PDF"; else bad "pdflatex produced no PDF"; fi
if [ -f "$TMP/real/t.synctex.gz" ]; then ok "synctex written"; else bad "no synctex.gz"; fi

echo
printf 'passed %d, failed %d\n' "$PASS" "$FAIL"
[ "$FAIL" -eq 0 ]
