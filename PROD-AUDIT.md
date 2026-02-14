# Seedbay Production Audit (RLS + Webhook + Storage)

This is the concrete audit checklist to run against **production** Supabase.

## 1) Run the SQL checks
Use `/Users/admin/Desktop/Amin/seedbay/scripts/prod-audit.sql` in the Supabase SQL Editor.

Expected outcomes:
- RLS enabled = `true` for: `users`, `projects`, `orders`, `purchases`, `deliverables`, `downloads`, `stripe_events`, `audit_logs`.
- Policies exist for reads/writes on `orders`, `purchases`, `deliverables`, `downloads`, `audit_logs`.
- `stripe_events.event_id` has a **unique** index.
- `orders` has **unique** index on `stripe_payment_intent_id`.
- Storage bucket `project-files` is `public = false`.

## 2) Storage lockdown
Apply `/Users/admin/Desktop/Amin/seedbay/scripts/storage-policies.sql`.

This enforces:
- Bucket is private.
- Only **vendors/admins** can upload/read their own `deliverables/<project_id>/...` objects.
- Buyers never access storage directly (signed URLs only).

## 3) Webhook idempotence verification
Run these checks:

- Confirm `stripe_events` unique index exists (from SQL audit).
- Send the **same** webhook twice (test in `tests/security.test.ts` -> `3.6b`).
- Verify only **one** row in `purchases` for the same `(user_id, project_id)`.

## 4) Download access verification
Run tests:
- `4.2b` Download without purchase => **403**
- `4.2c` Paid order without purchase => **403**

These tests ensure **purchases is the only source of truth**.
