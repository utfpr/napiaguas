#!/bin/bash
set -euo pipefail

declare -a DATABASES

# Always include the main database defined by POSTGRES_DB (defaults to napi_aguas_dev)
DATABASES+=("${POSTGRES_DB:-napi_aguas_dev}")

# Include test database when available (defaults to napi_aguas_test)
DATABASES+=("${POSTGRES_TEST_DB:-napi_aguas_test}")

create_database_if_missing() {
  local database_name="$1"

  local database_exists
  database_exists=$(psql --username "$POSTGRES_USER" --dbname "$POSTGRES_USER" -tAc "SELECT 1 FROM pg_database WHERE datname = '${database_name}'" | tr -d '[:space:]')

  if [[ -z "$database_exists" ]]; then
    createdb --username "$POSTGRES_USER" "$database_name"
  fi
}

enable_extensions() {
  local database_name="$1"

  psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$database_name" <<'EOSQL'
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
EOSQL
}

for database in "${DATABASES[@]}"; do
  # Skip empty values if any (defensive guard)
  if [[ -z "$database" ]]; then
    continue
  fi

  create_database_if_missing "$database"
  enable_extensions "$database"
done
