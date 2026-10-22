#!/usr/bin/env bash
#
# Starts the compile worker against the running compose stack.
#
# The worker is not a compose service: it shells out to `docker run` for every
# build, so it needs the Docker daemon and a work directory whose path means the
# same thing to the daemon as it does to the worker. Running it on the host is
# what keeps both true -- see "Compiling locally" in CLAUDE.md.
#
# Everything it needs is derived here rather than written down, because two
# values drift on their own:
#
#   * Postgres is not published, and its container IP changes whenever the
#     container is recreated. A connection string pasted into a shell profile is
#     correct until the next `docker compose down`.
#   * Object storage answers to `s3` inside the compose network and only to
#     localhost:9100 outside it. The worker is outside.
#
# Usage: ./dev-worker.sh     (leave it running; Ctrl-C to stop)

set -euo pipefail
cd "$(dirname "$0")"

fail() { echo "dev-worker: $1" >&2; exit 1; }

[ -f .env ] || fail "no .env -- copy .env.example to .env first (SETUP.md stage 1)"

# Only the keys needed to reach Postgres, so a syntax oddity elsewhere in .env
# cannot take the worker down with it.
pg_user=$(sed -n 's/^POSTGRES_USER=//p' .env | tail -1)
pg_pass=$(sed -n 's/^POSTGRES_PASSWORD=//p' .env | tail -1)
pg_db=$(sed -n 's/^POSTGRES_DB=//p' .env | tail -1)
: "${pg_user:=postgres}" "${pg_db:=lumen}"
[ -n "$pg_pass" ] || fail "POSTGRES_PASSWORD is empty in .env"

pg_ip=$(docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' lumen-postgres 2>/dev/null) \
  || fail "lumen-postgres is not running -- start the stack with 'docker compose up -d'"
[ -n "$pg_ip" ] || fail "lumen-postgres has no IP address yet; give it a moment and retry"

docker image inspect "${TEX_IMAGE:-lumen-tex:latest}" >/dev/null 2>&1 \
  || fail "the TeX image is missing. Build it once (~8GB):
    cd compile && docker build -t lumen-tex:latest . && ./verify.sh"

# Snap's Docker cannot exec a container with no-new-privileges set: the build
# dies at "exec /usr/bin/latexmk: operation not permitted" with exit 255, which
# reads like a broken image rather than a host setting. Checked rather than
# silently dropped -- the flag is required in production.
if [ "$(command -v docker)" = /snap/bin/docker ] && ! grep -q '^COMPILE_SECURITY_OPT=$' .env; then
  fail "docker here is the Snap build, which cannot exec a container with
    no-new-privileges set. Add this line to .env, value empty (local only --
    the flag is required in production):
        COMPILE_SECURITY_OPT="
fi

python=./backend/.venv/bin/python
[ -x "$python" ] || fail "no backend/.venv -- see SETUP.md stage 3b:
    cd backend && python3 -m venv .venv && .venv/bin/pip install -r requirements-dev.txt"

# The API reaches object storage over the compose network; from out here only
# the published port resolves.
export S3_ENDPOINT_URL="${S3_ENDPOINT_URL:-http://localhost:9100}"
export POSTGRES_CONNECTION_STRING="postgresql://${pg_user}:${pg_pass}@${pg_ip}:5432/${pg_db}"

echo "dev-worker: postgres ${pg_ip}:5432/${pg_db}, storage ${S3_ENDPOINT_URL}"
echo "dev-worker: leave this running; Ctrl-C to stop"
cd backend
exec ../"${python#./}" -m src.compiles.worker
