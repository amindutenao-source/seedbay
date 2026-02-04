# Migration Plan (Staging -> Production)

This plan assumes existing Supabase data should be preserved.

## Staging
1. Backup staging database.
2. Apply schema updates (add missing columns only).
3. Update staging env vars.
4. Deploy to staging.
5. Run smoke tests:
   - `/api/health`
   - `/marketplace`
   - `/projects/:id`
   - `/checkout/:id`
6. Run integration tests.

## Production
1. Announce maintenance window (if needed).
2. Backup production database.
3. Apply schema updates (add missing columns only).
4. Deploy to production.
5. Run smoke tests and monitor logs.
6. Verify Stripe webhook events.

## Schema Update Strategy (Non-Destructive)
Use `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` to add missing fields.
Do not drop tables in production.

## Rollback
1. Re-deploy previous build.
2. Revert env vars if changed.
3. Keep schema changes (non-destructive) unless a column caused a runtime error.

## Notes
- Keep `.env.local` uncommitted.
- Store secrets only in the platform (Vercel/Render/etc).
