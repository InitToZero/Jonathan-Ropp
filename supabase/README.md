# Supabase database

Database structure and access-control changes belong in `supabase/migrations/` as ordered SQL migration files. Do not keep a second hand-maintained schema definition separate from the migrations.

## Capture the existing project schema

The Supabase project already contains the recipe table, so pull its current schema instead of writing a `CREATE TABLE` migration that would try to create it again.

From the repository root, with the Supabase CLI installed:

```powershell
supabase init
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase db pull
```

Find the project reference in the Supabase dashboard URL or Project Settings. The CLI may ask for the database password. `db pull` reads the linked remote schema and creates a timestamped migration under `supabase/migrations/`; inspect and commit that generated file.

Before relying on the migration, confirm it includes the `tbl_recipes` table, its constraints and defaults, RLS policies and grants, triggers, and any Storage policies you configured. Keep passwords, access tokens, and service-role/secret keys out of this repository.

## Future schema changes

Create a new migration for each database change, review the SQL, test it against a local Supabase database when possible, and only then push it to the linked project:

```powershell
supabase migration new describe_the_change
supabase start
supabase db reset
supabase db push
```

`supabase db reset` rebuilds the local development database from migrations. `supabase db push` applies pending migrations to the linked remote project, so inspect the migration list and SQL before running it.
