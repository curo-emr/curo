#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REGISTRY_HOST="${NPM_REGISTRY_HOST:-127.0.0.1}"
REGISTRY_PORT="${NPM_REGISTRY_PORT:-4873}"
REGISTRY_URL="http://${REGISTRY_HOST}:${REGISTRY_PORT}"
DOCKER_REGISTRY_URL="${DOCKER_NPM_REGISTRY_URL:-http://host.docker.internal:${REGISTRY_PORT}}"
CACHE_DIR="${CURO_VERDACCIO_CACHE_DIR:-${HOME}/.cache/curo/verdaccio}"
CONFIG_FILE="${CACHE_DIR}/config.yaml"
LOG_FILE="${CACHE_DIR}/verdaccio.log"
PID_FILE="${CACHE_DIR}/verdaccio.pid"

DEFAULT_SERVICES=(
  curo-auth-service
  curo-patient-service
  curo-appointment-service
  curo-clinical-service
  curo-pharmacy-service
  curo-lab-service
  curo-document-service
  curo-notification-service
  curo-audit-service
  curo-api-gateway
)

if [[ "$#" -gt 0 ]]; then
  SERVICES=("$@")
else
  SERVICES=("${DEFAULT_SERVICES[@]}")
fi

STARTED_VERDACCIO=0

registry_ready() {
  curl -fsS --max-time 2 "${REGISTRY_URL}/-/ping" >/dev/null 2>&1
}

write_config() {
  mkdir -p "${CACHE_DIR}/storage"
  cat >"${CONFIG_FILE}" <<YAML
storage: ${CACHE_DIR}/storage
uplinks:
  npmjs:
    url: https://registry.npmjs.org/
    timeout: 120s
    maxage: 30m
packages:
  '@*/*':
    access: \$all
    proxy: npmjs
  '**':
    access: \$all
    proxy: npmjs
logs:
  - {type: stdout, format: pretty, level: http}
YAML
}

start_verdaccio() {
  if registry_ready; then
    echo "Using existing npm registry proxy at ${REGISTRY_URL}"
    return
  fi

  if ! command -v npx >/dev/null 2>&1; then
    echo "npx is required to start Verdaccio on the host" >&2
    exit 1
  fi

  write_config
  echo "Starting Verdaccio at ${REGISTRY_URL} (cache: ${CACHE_DIR}/storage)"
  nohup npx --yes verdaccio@6 --config "${CONFIG_FILE}" --listen "${REGISTRY_HOST}:${REGISTRY_PORT}" >"${LOG_FILE}" 2>&1 &
  echo $! >"${PID_FILE}"
  STARTED_VERDACCIO=1

  for _ in $(seq 1 60); do
    if registry_ready; then
      return
    fi
    sleep 1
  done

  echo "Verdaccio did not become ready. Log follows:" >&2
  sed -n '1,160p' "${LOG_FILE}" >&2 || true
  exit 1
}

cleanup() {
  if [[ "${STARTED_VERDACCIO}" == "1" && -f "${PID_FILE}" ]]; then
    local pid
    pid="$(cat "${PID_FILE}")"
    if [[ -n "${pid}" ]] && kill -0 "${pid}" >/dev/null 2>&1; then
      kill "${pid}" >/dev/null 2>&1 || true
    fi
    rm -f "${PID_FILE}"
  fi
}
trap cleanup EXIT

start_verdaccio

echo "Building services with npm registry ${DOCKER_REGISTRY_URL}"
for service in "${SERVICES[@]}"; do
  echo "==> docker compose build ${service}"
  docker compose -f "${ROOT_DIR}/docker-compose.yml" build \
    --build-arg NPM_REGISTRY="${DOCKER_REGISTRY_URL}" \
    "${service}"
done
