#!/bin/bash
set -euo pipefail

STACK_FILE="infrastructure/docker/docker-compose.prod.yml"

echo "Pulling latest images..."
docker compose -f "${STACK_FILE}" pull

echo "Starting services..."
docker compose -f "${STACK_FILE}" up -d

echo "Running migrations..."
docker compose -f "${STACK_FILE}" exec -T api pnpm db:migrate

echo "Deployment completed!"
