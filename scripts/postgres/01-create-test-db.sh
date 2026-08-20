#!/bin/sh
# Creates the dedicated testing database referenced by TEST_DATABASE_URL
# (12_DEPLOY.md §5, entorno `testing`).
# Runs only once, when the postgres_data volume is initialised.
set -eu

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    CREATE DATABASE ${POSTGRES_DB}_test OWNER $POSTGRES_USER;
EOSQL
