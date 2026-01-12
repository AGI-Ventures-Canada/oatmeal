#!/bin/bash

ENV_FILE=".env.local"
PROD_BACKUP=".env.local.production"
TYPES_FILE="lib/db/types.ts"

if ! docker info &>/dev/null 2>&1; then
  echo "Docker is not running. Please start Docker Desktop first."
  exit 1
fi

# Stop all Supabase projects and start fresh for this one
echo "Stopping all Supabase projects..."
docker ps -a --filter "name=supabase_" --format "{{.Names}}" | xargs -r docker stop 2>/dev/null || true
docker ps -a --filter "name=supabase_" --format "{{.Names}}" | xargs -r docker rm 2>/dev/null || true

echo "Starting local Supabase..."
supabase start --ignore-health-check

echo "Getting Supabase credentials..."
STATUS_JSON=$(supabase status --output json 2>/dev/null)
API_URL=$(echo "$STATUS_JSON" | grep '"API_URL"' | cut -d'"' -f4)
ANON_KEY=$(echo "$STATUS_JSON" | grep '"ANON_KEY"' | cut -d'"' -f4)
SERVICE_KEY=$(echo "$STATUS_JSON" | grep '"SERVICE_ROLE_KEY"' | cut -d'"' -f4)

if [ -z "$API_URL" ] || [ -z "$ANON_KEY" ] || [ -z "$SERVICE_KEY" ]; then
  echo "Failed to get local Supabase credentials"
  exit 1
fi

if [ -f "$ENV_FILE" ] && [ ! -f "$PROD_BACKUP" ]; then
  if grep -q "supabase.co" "$ENV_FILE"; then
    echo "Backing up production credentials to $PROD_BACKUP"
    cp "$ENV_FILE" "$PROD_BACKUP"
  fi
fi

set_env_var() {
  local key="$1"
  local value="$2"

  if [ -f "$ENV_FILE" ]; then
    grep -v "^${key}=" "$ENV_FILE" > "${ENV_FILE}.tmp" || true
    mv "${ENV_FILE}.tmp" "$ENV_FILE"
  fi

  echo "${key}=\"${value}\"" >> "$ENV_FILE"
}

touch "$ENV_FILE"

echo "Updating .env.local with local Supabase credentials..."
set_env_var "NEXT_PUBLIC_SUPABASE_URL" "$API_URL"
set_env_var "NEXT_PUBLIC_SUPABASE_ANON_KEY" "$ANON_KEY"
set_env_var "SUPABASE_SERVICE_ROLE_KEY" "$SERVICE_KEY"

if ! grep -q "^API_KEY_SECRET=" "$ENV_FILE" 2>/dev/null; then
  echo "Generating API_KEY_SECRET..."
  set_env_var "API_KEY_SECRET" "$(openssl rand -hex 32)"
fi

echo "Using local Supabase ($API_URL)"
echo "   Studio: http://127.0.0.1:54423"

echo "Generating Supabase TypeScript types..."
if supabase gen types typescript --local > "$TYPES_FILE" 2>/dev/null; then
  echo "Types generated at $TYPES_FILE"
else
  echo "Type generation skipped (run 'bun run update-types' manually if needed)"
fi
