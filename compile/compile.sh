#!/usr/bin/env bash
#
# The exact command the compile supervisor shells out to. Nothing else should
# construct a `docker run` for LaTeX -- change it here or not at all.
#
# Every flag below exists because of a measured finding in
# docs/plans/latex-compilation.md (M0). Read that before removing any of them.
#
#   ./compile.sh --work DIR --root main.tex [--engine pdflatex]
#                [--deadline 300] [--cpus 1] [--mem 1g] [--cache DIR]
#
# Exit codes: the engine's own, or 124 if the deadline killed it.

set -uo pipefail

IMAGE="${LUMEN_TEX_IMAGE:-lumen-tex:latest}"
WORK="" ROOT="main.tex" ENGINE="pdflatex"
DEADLINE=300 CPUS=1 MEM=1g CACHE="" HALT=0 NAME=""

while [ $# -gt 0 ]; do
  case "$1" in
    --work)     WORK="$2"; shift 2 ;;
    --root)     ROOT="$2"; shift 2 ;;
    --engine)   ENGINE="$2"; shift 2 ;;
    --deadline) DEADLINE="$2"; shift 2 ;;
    --cpus)     CPUS="$2"; shift 2 ;;
    --mem)      MEM="$2"; shift 2 ;;
    --cache)    CACHE="$2"; shift 2 ;;
    --halt-on-error) HALT=1; shift ;;   # agent wants the first error only
    # The supervisor supplies a name so it can kill this container later: a
    # running compile cannot be cancelled if only the child knows its name.
    --name)     NAME="$2"; shift 2 ;;
    *) echo "compile.sh: unknown argument '$1'" >&2; exit 2 ;;
  esac
done
[ -n "$WORK" ] || { echo "compile.sh: --work is required" >&2; exit 2; }
[ -d "$WORK" ] || { echo "compile.sh: '$WORK' is not a directory" >&2; exit 2; }

# latexmk drives every engine; it decides the pass count and whether to run
# biber or bibtex. One profile, not two -- a warm rebuild is as fast as a
# single -draftmode pass. See docs/decisions/0010-one-compile-profile.md.
case "$ENGINE" in
  pdflatex) ENGINE_FLAG=-pdf ;;
  xelatex)  ENGINE_FLAG=-pdfxe ;;
  lualatex) ENGINE_FLAG=-pdflua ;;
  *) echo "compile.sh: unknown engine '$ENGINE'" >&2; exit 2 ;;
esac

ARGS=(latexmk "$ENGINE_FLAG"
      -interaction=nonstopmode   # never block on stdin: a prompt is a held core
      -file-line-error           # 'file:line: message' -- the log parser needs it
      -synctex=1)                # source <-> PDF sync; cheap now, awkward later
[ "$HALT" = 1 ] && ARGS+=(-halt-on-error)
ARGS+=("$ROOT")

# A writable, PRE-SEEDED font cache. Not a tmpfs (luaotfload rebuilds its font
# database every run: 11.2s vs 1.1s on a two-page article) and not read-only
# (LuaLaTeX then fails fatally inside luaotfload-init when it writes an entry).
CACHE_MOUNT=()
if [ -n "$CACHE" ]; then
  mkdir -p "$CACHE"
  if [ -z "$(ls -A "$CACHE" 2>/dev/null)" ]; then
    cid=$(docker create "$IMAGE" 2>/dev/null) || { echo "compile.sh: cannot create seed container" >&2; exit 1; }
    docker cp "$cid:/usr/local/texlive/2026/texmf-var/." "$CACHE/" >/dev/null 2>&1
    docker rm "$cid" >/dev/null 2>&1
  fi
  CACHE_MOUNT=(-v "$CACHE:/texcache" -e TEXMFCACHE=/texcache -e TEXMFVAR=/texcache)
fi

# no-new-privileges is correct and REQUIRED on a production host, but it breaks
# exec on Snap-installed Docker -- reproduced on alpine too, so it is the host,
# not the image. Snap Docker cannot run this service anyway (it also mounts /tmp
# binds empty). Set LUMEN_SECOPT= to drop the flag for local work on such a host.
SECOPT="${LUMEN_SECOPT---security-opt=no-new-privileges}"
SECOPT_ARGS=(); [ -n "$SECOPT" ] && SECOPT_ARGS=("$SECOPT")

[ -n "$NAME" ] || NAME="lumen-compile-$$-${RANDOM}"

# Host-side wall-clock kill, BY CONTAINER NAME. Killing the `docker run` client
# does NOT stop the container: one left running wrote a 186 MB log before it was
# killed by name.
( sleep "$DEADLINE"; docker kill "$NAME" >/dev/null 2>&1 ) >/dev/null 2>&1 <&- &
WATCHDOG=$!

# NOTE ON SECRETS: only the variables named below reach the container. Never add
# one carrying a credential -- a document can \input{/proc/self/environ} and the
# value lands in the compile log, which is returned to the user.
docker run --rm --name "$NAME" \
  --network=none \
  --user "$(id -u):$(id -g)" \
  --read-only \
  --tmpfs /tmp:size=512m,exec \
  --tmpfs /texhome:size=256m,exec \
  -e HOME=/texhome -e TEXMFCONFIG=/texhome/tconf -e TEXMFHOME=/texhome/texmf \
  "${CACHE_MOUNT[@]}" \
  -v "$WORK:/compile" \
  -w /compile \
  --cpus="$CPUS" --memory="$MEM" --memory-swap="$MEM" \
  --pids-limit=256 \
  --ulimit fsize=104857600 \
  --cap-drop=ALL \
  "${SECOPT_ARGS[@]}" \
  "$IMAGE" "${ARGS[@]}"
RC=$?

kill "$WATCHDOG" 2>/dev/null; wait "$WATCHDOG" 2>/dev/null
# 137 = SIGKILL, i.e. the watchdog fired
[ "$RC" = 137 ] && RC=124
exit $RC
