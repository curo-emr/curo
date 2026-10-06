#!/usr/bin/env bash
#
# docker-rebuild.sh — rebuild the stack's images ONE AT A TIME, then start it.
#
# Why: `docker compose up -d --build` builds every image in parallel. With seven
# Next.js frontends, the parallel `next build`s exhaust Docker Desktop's VM memory
# (8 GB here) and fail with "cannot allocate memory". Building sequentially gives
# each build the whole VM; layer caching keeps unchanged images fast.
#
# Usage:
#   bash scripts/docker-rebuild.sh                     # rebuild everything, then `up -d`
#   bash scripts/docker-rebuild.sh curo-nurse curo-doctor   # rebuild just these, then `up -d` them
#   bash scripts/docker-rebuild.sh --no-up [services…]  # build only, don't start anything
#
# Requires: docker compose v2, jq.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

START_STACK=1
if [[ "${1:-}" == "--no-up" ]]; then
  START_STACK=0
  shift
fi

if [[ "$#" -gt 0 ]]; then
  SERVICES=("$@")
else
  command -v jq >/dev/null || { echo "jq is required (brew install jq)" >&2; exit 1; }
  # Every service with a `build:` section, straight from docker-compose.yml.
  SERVICES=()
  while IFS= read -r svc; do SERVICES+=("$svc"); done < <(
    docker compose config --format json | jq -r '.services | to_entries[] | select(.value.build) | .key'
  )
fi

echo "Building ${#SERVICES[@]} image(s) one at a time…"
total_start=$SECONDS
for i in "${!SERVICES[@]}"; do
  svc="${SERVICES[$i]}"
  printf '\n[%d/%d] %s\n' "$((i + 1))" "${#SERVICES[@]}" "$svc"
  svc_start=$SECONDS
  if ! docker compose build "$svc"; then
    echo >&2
    echo "✗ Build failed: $svc — nothing was started. Fix it and re-run (built images are cached)." >&2
    exit 1
  fi
  echo "✓ $svc ($((SECONDS - svc_start))s)"
done
echo
echo "All ${#SERVICES[@]} image(s) built in $((SECONDS - total_start))s."

if [[ "$START_STACK" == "1" ]]; then
  echo
  if [[ "$#" -gt 0 ]]; then
    docker compose up -d "${SERVICES[@]}"
  else
    docker compose up -d
  fi
  echo
  docker compose ps -a --format 'table {{.Name}}\t{{.Status}}'
fi
