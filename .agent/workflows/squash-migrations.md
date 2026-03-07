---
description: Squash all local Supabase migrations into a single file and repair cloud migration history
---

# Squash Supabase Migrations

When your `supabase/migrations/` directory gets too large or contains too many incremental schema changes, you can squash them all into a single file. This workflow will back up your data, dump the clean final schema, reset your local dev environment, and optionally repair the migration tracking history on your cloud instances so they stay in sync.

> [!WARNING]
> This is a destructive operation that replaces all your migration files. You should commit everything to Git before running this command, just in case.

// turbo-all

## Phase 1: Preparation & Backup

### 1. Start Local Supabase

Make sure your local Docker container is running so we can dump the schema from it.

```bash
npx supabase start
```

### 2. Backup Local Data

Create a gitignored directory and dump the data for safety.

```bash
mkdir -p backups
npx supabase db dump --data-only --local > backups/local_data_backup.sql
```

## Phase 2: Schema Squash

### 3. Dump the Final Schema

Capture the exact, clean definition of all tables and policies as they exist right now.

```bash
npx supabase db dump --local > backups/local_schema_dump.sql
```

### 4. Delete Old Migrations

Remove all existing migration files.

```bash
rm -f supabase/migrations/*.sql
```

### 5. Create Clean Migration File

Clean the schema dump (remove headers and blank lines) and place it as the new initial migration. The filename uses today's timestamp.

```bash
export SQUASH_FILE="supabase/migrations/$(date -u +%Y%m%d%H%M%S)_squashed_schema.sql"
sed '1d' backups/local_schema_dump.sql | sed -e :a -e '/^\n*$/{$d;N;ba}' > "$SQUASH_FILE"
```

## Phase 3: Local Reset

### 6. Reset Local DB & Load Data

Apply the new single migration and load the data back in. We disable triggers during import to prevent foreign key errors if the pg_dump had constraint ordering issues.

```bash
npx supabase db reset --local --no-seed
docker exec -i supabase_db_Interview-Preparation-App psql -U postgres -c "SET session_replication_role = replica;" -f - < backups/local_data_backup.sql
```

## Phase 4: Cloud Migration Repair

> [!CAUTION]
> If your cloud instances (staging/prod) already have the old migrations applied, `supabase db push` will break because it won't recognize the squashed migration. The next steps will use the Supabase Management API to delete the old migration tracking and insert the new squashed file so everything stays in sync. Only run these if you manage a cloud DB.

### 7. Find Env Variables

Extract the tokens from the environment files.

```bash
export SUPABASE_ACCESS_TOKEN=$(grep SUPABASE_ACCESS_TOKEN .env.local | cut -d= -f2 | tr -d '\r')
export DEV_PROJECT_REF=$(grep SUPABASE_PROJECT_REF .env.stage | cut -d= -f2 | tr -d '\r' | tr -d "'\"")
export PROD_PROJECT_REF=$(grep SUPABASE_PROJECT_REF .env.production | cut -d= -f2 | tr -d '\r' | tr -d "'\"")
export SQUASH_VERSION=$(basename "$SQUASH_FILE" | cut -d_ -f1)
export SQUASH_NAME=$(basename "$SQUASH_FILE" | cut -d_ -f2- | sed 's/\.sql//')
```

### 8. Repair Dev Cloud (Staging)

```bash
curl -s -X POST "https://api.supabase.com/v1/projects/${DEV_PROJECT_REF}/database/query" \
  -H "Authorization: Bearer ${SUPABASE_ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"query": "DELETE FROM supabase_migrations.schema_migrations; INSERT INTO supabase_migrations.schema_migrations (version, statements, name) VALUES ('\''"'${SQUASH_VERSION}'"'\', NULL, '\'"${SQUASH_NAME}"'\');"}'
```

### 9. Repair Prod Cloud

```bash
curl -s -X POST "https://api.supabase.com/v1/projects/${PROD_PROJECT_REF}/database/query" \
  -H "Authorization: Bearer ${SUPABASE_ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"query": "DELETE FROM supabase_migrations.schema_migrations; INSERT INTO supabase_migrations.schema_migrations (version, statements, name) VALUES ('\''"'${SQUASH_VERSION}'"'\', NULL, '\'"${SQUASH_NAME}"'\');"}'
```

🎉 **Squash Complete!** Check `git status` to verify and commit your new single migration file.
