-- Row-Level Security: tenant isolation enforced by PostgreSQL itself.
--
-- Every table with an `organization_id` column only exposes the rows of the
-- establishment set in `app.current_org_id` for the current transaction (see
-- src/server/db/context.ts → withTenant). `app.bypass_rls = 'on'` is reserved
-- for system work (authentication, webhook routing, cron, platform admin) and
-- is only ever set through withSystem().
--
-- RLS is FORCED so it also applies to the table owner. It never applies to a
-- superuser or a role with BYPASSRLS: the application role must have neither
-- (checked at startup and by /api/health).

CREATE OR REPLACE FUNCTION app_current_org_id() RETURNS uuid
LANGUAGE sql STABLE PARALLEL SAFE AS $$
  SELECT nullif(current_setting('app.current_org_id', true), '')::uuid
$$;
--> statement-breakpoint

CREATE OR REPLACE FUNCTION app_bypass_rls() RETURNS boolean
LANGUAGE sql STABLE PARALLEL SAFE AS $$
  SELECT coalesce(current_setting('app.bypass_rls', true), '') = 'on'
$$;
--> statement-breakpoint

-- Idempotent: protects every tenant table, including tables added by future
-- migrations. scripts/migrate.ts calls it after each migration run.
CREATE OR REPLACE FUNCTION app_ensure_tenant_rls() RETURNS integer
LANGUAGE plpgsql AS $$
DECLARE
  target record;
  protected_count integer := 0;
BEGIN
  FOR target IN
    SELECT c.oid::regclass AS qualified_name, c.relname AS table_name
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind IN ('r', 'p')
      AND EXISTS (
        SELECT 1 FROM pg_attribute a
        WHERE a.attrelid = c.oid AND a.attname = 'organization_id' AND NOT a.attisdropped
      )
  LOOP
    EXECUTE format('ALTER TABLE %s ENABLE ROW LEVEL SECURITY', target.qualified_name);
    EXECUTE format('ALTER TABLE %s FORCE ROW LEVEL SECURITY', target.qualified_name);
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies p
      WHERE p.schemaname = 'public' AND p.tablename = target.table_name AND p.policyname = 'tenant_isolation'
    ) THEN
      EXECUTE format(
        'CREATE POLICY tenant_isolation ON %s AS PERMISSIVE FOR ALL TO PUBLIC '
          || 'USING ((SELECT app_bypass_rls()) OR organization_id = (SELECT app_current_org_id())) '
          || 'WITH CHECK ((SELECT app_bypass_rls()) OR organization_id = (SELECT app_current_org_id()))',
        target.qualified_name
      );
    END IF;
    protected_count := protected_count + 1;
  END LOOP;

  -- The tenant root table is keyed by its own id.
  ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
  ALTER TABLE organizations FORCE ROW LEVEL SECURITY;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies p
    WHERE p.schemaname = 'public' AND p.tablename = 'organizations' AND p.policyname = 'tenant_isolation'
  ) THEN
    CREATE POLICY tenant_isolation ON organizations AS PERMISSIVE FOR ALL TO PUBLIC
      USING ((SELECT app_bypass_rls()) OR id = (SELECT app_current_org_id()))
      WITH CHECK ((SELECT app_bypass_rls()) OR id = (SELECT app_current_org_id()));
  END IF;

  RETURN protected_count + 1;
END;
$$;
--> statement-breakpoint

-- Tenant tables missing RLS, FORCE or the isolation policy. Must stay empty:
-- asserted by the integration tests and reported by /api/health.
CREATE OR REPLACE FUNCTION app_unprotected_tenant_tables() RETURNS TABLE (table_name text)
LANGUAGE sql STABLE AS $$
  SELECT c.relname::text
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relkind IN ('r', 'p')
    AND (
      c.relname = 'organizations'
      OR EXISTS (
        SELECT 1 FROM pg_attribute a
        WHERE a.attrelid = c.oid AND a.attname = 'organization_id' AND NOT a.attisdropped
      )
    )
    AND (
      NOT c.relrowsecurity
      OR NOT c.relforcerowsecurity
      OR NOT EXISTS (
        SELECT 1 FROM pg_policies p
        WHERE p.schemaname = 'public' AND p.tablename = c.relname AND p.policyname = 'tenant_isolation'
      )
    )
  ORDER BY 1
$$;
--> statement-breakpoint

SELECT app_ensure_tenant_rls();
