-- ============================================================================
-- SEEDBAY: Harden audit_logs RLS
-- Purpose: Restrict audit logs to admins only
-- ============================================================================

-- 1) Enable RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 2) Drop existing read policies if any
DROP POLICY IF EXISTS "admin_read_audit_logs" ON public.audit_logs;
DROP POLICY IF EXISTS "admin_see_audit_logs" ON public.audit_logs;

-- 3) Allow only admins to read audit logs
CREATE POLICY "admin_read_audit_logs" ON public.audit_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.id = auth.uid()
        AND u.role = 'admin'
    )
  );

-- Optional: No INSERT/UPDATE/DELETE policies on audit_logs.
-- Service role bypasses RLS for system logging.
