#!/bin/sh
set -eu

# Next.js start: bind to 0.0.0.0, use PORT from env or default 8000
HOSTNAME=0.0.0.0
PORT="${PORT:-8000}"

# Set Next.js cache dir to writable temp location (platform /opt is read-only)
NEXT_CACHE_DIR="${TMPDIR:-/tmp}/next-cache"
mkdir -p "$NEXT_CACHE_DIR"
export NEXT_CACHE_DIR

echo "Starting Next.js on $HOSTNAME:$PORT (cache at $NEXT_CACHE_DIR)"

exec npx next start --hostname "$HOSTNAME" --port "$PORT"
