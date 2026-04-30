#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")"/.. && pwd)"
COMPOSE_FILE_REL="${COMPOSE_FILE:-infrastructure/docker/docker-compose.dev.yml}"
COMPOSE_FILE_PATH="${ROOT_DIR}/${COMPOSE_FILE_REL}"

if [[ ! -f "${COMPOSE_FILE_PATH}" ]]; then
  echo "Arquivo compose não encontrado em ${COMPOSE_FILE_PATH}" >&2
  exit 1
fi

command_exists() {
  command -v "$1" >/dev/null 2>&1
}

if command_exists docker && docker compose version >/dev/null 2>&1; then
  COMPOSE_CMD=(docker compose)
elif command_exists docker-compose; then
  COMPOSE_CMD=(docker-compose)
else
  echo "Docker Compose (plugin ou standalone) não encontrado" >&2
  exit 1
fi

ENV_FILE=""
if [[ -f "${ROOT_DIR}/.env.local" ]]; then
  ENV_FILE="${ROOT_DIR}/.env.local"
elif [[ -f "${ROOT_DIR}/.env" ]]; then
  ENV_FILE="${ROOT_DIR}/.env"
fi

run_compose() {
  if [[ -n "${ENV_FILE}" ]]; then
    "${COMPOSE_CMD[@]}" --env-file "${ENV_FILE}" -f "${COMPOSE_FILE_PATH}" "$@"
  else
    "${COMPOSE_CMD[@]}" -f "${COMPOSE_FILE_PATH}" "$@"
  fi
}

ACTION="${1:-up}"
shift || true

case "${ACTION}" in
  up)
    run_compose up "$@"
    ;;
  down)
    run_compose down "$@"
    ;;
  logs)
    run_compose logs "$@"
    ;;
  *)
    run_compose "${ACTION}" "$@"
    ;;
esac
