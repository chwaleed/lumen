#!/usr/bin/env bash
#
# The whole stack, in one command. Containers, compile worker, frontend.
#
#   ./dev.sh          start everything, stream the logs, Ctrl-C to stop
#
# Three things have to run, and only one of them is a container. The compile
# worker shells out to `docker run` for every build, so it needs the Docker
# daemon and a work directory whose path means the same thing to the daemon as
# it does to the worker -- running it on the host is what keeps both true. The
# frontend runs on the host so edits reload. This script supervises both and
# shuts them down together, which is the part that was easy to forget: a queue
# with no worker behind it just spins, and the UI blames the build service.

set -euo pipefail
cd "$(dirname "$0")"

LOGS=.dev-logs
WORKER_LOG="$LOGS/worker.log"
WEB_LOG="$LOGS/web.log"
worker_pid="" web_pid="" tail_pid=""

say()  { printf '\033[36m==>\033[0m %s\n' "$1"; }
fail() { printf '\033[31mdev.sh:\033[0m %s\n' "$1" >&2; exit 1; }

# Each child gets its own process group so stopping it also stops what it
# spawned. `bun dev` in particular forks a next-server that outlives a plain
# kill, and an orphan holding port 3000 with a stale route table is a genuinely
# confusing thing to debug.
start_in_group() {
  local log=$1; shift
  setsid "$@" >"$log" 2>&1 </dev/null &
  echo $!
}

stop_group() {
  local pid=$1
  [ -n "$pid" ] || return 0
  kill -TERM -"$pid" 2>/dev/null || kill -TERM "$pid" 2>/dev/null || true
}

cleanup() {
  trap - INT TERM EXIT
  echo
  say "stopping"
  [ -n "$tail_pid" ] && kill "$tail_pid" 2>/dev/null || true
  stop_group "$web_pid"
  stop_group "$worker_pid"
  wait 2>/dev/null || true
  say "frontend and worker stopped. Containers are still up:  docker compose down"
}
trap cleanup INT TERM EXIT

# ---------------------------------------------------------------- preflight
[ -f .env ] || fail "no .env -- copy it first:  cp .env.example .env   (then set JWT_SECRET_KEY and POSTGRES_PASSWORD)"
command -v docker >/dev/null || fail "docker is not installed"
command -v bun >/dev/null || fail "bun is not installed -- this project does not use npm"

mkdir -p "$LOGS"

# ------------------------------------------------------- reclaim what is stale
# Processes are found BY PORT, never by matching command lines: a pattern broad
# enough to catch `bun run dev` also matches the shell running this script, and
# killing that takes the whole run down with it.
#
# docker's own proxies are skipped -- compose owns those, and recreating a
# container is its job, not ours.
reclaim_port() {
  local port=$1 label=$2 pid comm
  for pid in $(ss -ltnpH "sport = :$port" 2>/dev/null | grep -oP 'pid=\K[0-9]+' | sort -u); do
    comm=$(ps -o comm= -p "$pid" 2>/dev/null || true)
    case "$comm" in
      docker-proxy|dockerd|containerd*|rootlesskit*) continue ;;
    esac
    say "port $port ($label) held by ${comm:-unknown} pid $pid -- stopping it"
    kill -TERM -"$pid" 2>/dev/null || kill -TERM "$pid" 2>/dev/null || true
    for _ in $(seq 20); do
      ss -ltnH "sport = :$port" 2>/dev/null | grep -q . || break
      sleep 0.25
    done
    ss -ltnH "sport = :$port" 2>/dev/null | grep -q . && kill -KILL "$pid" 2>/dev/null || true
  done
}

# A worker left from a previous run has no port to find it by, so this reads
# /proc directly -- still not a command-line pattern match against ps output,
# and this shell plus its parent are excluded either way.
reclaim_worker() {
  local pid cmdline
  for dir in /proc/[0-9]*; do
    pid=${dir#/proc/}
    [ "$pid" = "$$" ] && continue
    [ "$pid" = "${PPID:-0}" ] && continue
    # Redirection inside the braces, so a process that exits between globbing
    # /proc and reading it is silent rather than a scary-looking shell error.
    cmdline=$({ tr '\0' ' ' <"$dir/cmdline"; } 2>/dev/null || true)
    case "$cmdline" in
      *python*src.compiles.worker*)
        say "a compile worker is already running (pid $pid) -- stopping it"
        kill -TERM -"$pid" 2>/dev/null || kill -TERM "$pid" 2>/dev/null || true
        ;;
    esac
  done
}

reclaim_port 3000 frontend
reclaim_port 9000 API
reclaim_port 9100 storage
reclaim_worker

# ---------------------------------------------------------------- containers
say "starting containers"
docker compose up -d

# The worker talks to Postgres directly, so it has to wait for the database
# rather than for the API.
say "waiting for postgres"
for _ in $(seq 60); do
  state=$(docker inspect -f '{{.State.Health.Status}}' lumen-postgres 2>/dev/null || echo missing)
  [ "$state" = healthy ] && break
  sleep 1
done
[ "${state:-}" = healthy ] || fail "postgres did not become healthy. Look at:  docker compose logs postgres"

# ---------------------------------------------------------------- frontend deps
if [ ! -d frontend/node_modules ]; then
  say "installing frontend dependencies (first run)"
  (cd frontend && bun install)
fi

# ---------------------------------------------------------------- the two hosts
say "starting compile worker"
worker_pid=$(start_in_group "$WORKER_LOG" ./dev-worker.sh)
sleep 4
kill -0 "$worker_pid" 2>/dev/null || { cat "$WORKER_LOG"; fail "the worker exited at startup -- see above"; }

# Turbopack keeps its dev state under .next/dev and reuses it across restarts.
# Started cold against an existing one, the router has come up with only part of
# the route tree: everything at five path segments or fewer resolved and anything
# deeper -- compile/<job>/pdf, files/<id>/raw -- fell through to the app's
# not-found page. A 404 in HTML from a route whose file is right there, which
# reads as a broken feature rather than a stale cache. Touching any route file
# makes the server rescan and they all reappear, so the tree is recoverable; it
# just is not rebuilt on its own.
#
# Only .next/dev goes: a production build in .next/build is left alone.
if [ -d frontend/.next/dev ]; then
  say "clearing the Turbopack dev cache (keeps route discovery honest)"
  rm -rf frontend/.next/dev
fi

say "starting frontend"
web_pid=$(start_in_group "$WEB_LOG" bash -c 'cd frontend && exec bun dev')

echo
say "API      http://localhost:9000/docs"
say "app      http://localhost:3000"
say "adminer  http://localhost:8080   (server: postgres)"
say "storage  http://localhost:9100"
echo
say "logs in $LOGS/ -- Ctrl-C stops the worker and frontend"
echo

# One stream, labelled, so a failing compile is visible next to the request
# that caused it instead of in another terminal.
tail -n +1 -F "$WORKER_LOG" "$WEB_LOG" 2>/dev/null |
  sed -u -e "s/^==> .*worker\.log.*$/--- worker ---/" -e "s/^==> .*web\.log.*$/--- frontend ---/" &
tail_pid=$!

wait "$tail_pid" 2>/dev/null || true
wait
