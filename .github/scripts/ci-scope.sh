#!/usr/bin/env bash
# Decides what CI checks, from the files a pull request changes.
#
#   BASE=<sha> .github/scripts/ci-scope.sh   # what changed since BASE
#   .github/scripts/ci-scope.sh              # no BASE (a push): everything
#
# Prints, and appends to $GITHUB_OUTPUT when set:
#   backend=true|false             run the Backends job
#   frontend=["apps/admin", ...]   workspaces for the Frontend job (lint + build)
set -euo pipefail

# The Frontend job's workspaces: every portal, then @curo/web itself.
PORTALS=(apps/admin apps/doctor apps/lab apps/nurse apps/patient apps/pharmacy apps/receptionist)
WEB=packages/web

# A change here can affect everything: install, toolchain, CI itself.
EVERYTHING='^(package\.json|package-lock\.json|\.nvmrc|\.npmrc|\.github/workflows/ci\.yml|\.github/scripts/ci-scope\.sh)$'
# What the Backends job builds, lints, tests or type-checks (@curo/web included).
BACKEND='^(services/|packages/(shared|testing|web)/|database/|tsconfig\.base\.json$|eslint\.config\.mjs$|\.prettierrc\.json$)'

changed=$([[ -n "${BASE:-}" ]] && git diff --name-only "$BASE"...HEAD || true)
touches() { grep -qE "$1" <<<"$changed"; }

backend=false
frontend=()
if [[ -z "${BASE:-}" ]] || touches "$EVERYTHING"; then
  backend=true
  frontend=("${PORTALS[@]}" "$WEB")
else
  touches "$BACKEND" && backend=true
  # A portal imports @curo/web, so a change there rebuilds every portal.
  for portal in "${PORTALS[@]}"; do
    touches "^($portal|$WEB)/" && frontend+=("$portal")
  done
  touches "^$WEB/" && frontend+=("$WEB")
fi

json=$(printf '%s\n' ${frontend[@]+"${frontend[@]}"} | jq -Rnc '[inputs | select(length > 0)]')
printf 'backend=%s\nfrontend=%s\n' "$backend" "$json" | tee -a "${GITHUB_OUTPUT:-/dev/null}"
