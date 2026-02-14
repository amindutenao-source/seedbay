-- ============================================================================
-- SEEDBAY: PRODUCTION AUDIT (RLS + WEBHOOK + STORAGE)
-- Run in Supabase SQL editor (read-only checks)
-- ============================================================================

-- 1) RLS enabled for critical tables
SELECT
  n.nspname AS schema,
  c.relname AS table,
  c.relrowsecurity AS rls_enabled,
  c.relforcerowsecurity AS rls_forced
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind = 'r'
  AND c.relname IN (
    'users',
    'projects',
    'orders',
    'purchases',
    'deliverables',
    'downloads',
    'stripe_events',
    'audit_logs'
  )
ORDER BY c.relname;

-- 2) Policies coverage
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'users',
    'projects',
    'orders',
    'purchases',
    'deliverables',
    'downloads',
    'stripe_events',
    'audit_logs'
  )
ORDER BY tablename, policyname;

-- 3) Stripe webhook idempotence enforcement
SELECT indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('stripe_events', 'orders')
ORDER BY tablename, indexname;

-- 4) Storage bucket visibility (must be private)
SELECT id, name, public, created_at
FROM storage.buckets
WHERE id = 'project-files';

-- 5) Storage objects policies (no public read)
SELECT schemaname, tablename, policyname, roles, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects'
ORDER BY policyname;
