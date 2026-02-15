# Seedbay Production Runbook

## 0) Quick Links
- Vercel dashboard: https://vercel.com/ami-projects/seedbay-3trfnhandevsm
- Production URL: https://seedbay.vercel.app

## 1) Environment Variables (Vercel)
Required in **Production** (and Preview if you deploy previews):
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY (server only)
- STRIPE_SECRET_KEY
- STRIPE_WEBHOOK_SECRET
- NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
- NEXT_PUBLIC_APP_URL
- CRON_SECRET
- SENTRY_DSN (server)
- NEXT_PUBLIC_SENTRY_DSN (client)
- SENTRY_TRACES_SAMPLE_RATE (e.g. 0.1)
- SENTRY_ORG / SENTRY_PROJECT / SENTRY_AUTH_TOKEN (optional but recommended for sourcemaps)

## 2) Health Checks
### Basic health check
```bash
curl -s https://seedbay.vercel.app/api/health | jq
```

### Deep health check (DB connectivity)
```bash
curl -s "https://seedbay.vercel.app/api/health?deep=1" | jq
```

## 3) Cron Integrity Check
The cron endpoint is protected by `CRON_SECRET`.

Manual run:
```bash
curl -s \
  -H "Authorization: Bearer <CRON_SECRET>" \
  "https://seedbay.vercel.app/api/cron/verify" | jq
```

Expected: `status=ok` and all counts = 0.
If counts > 0, investigate and reconcile.

## 4) Stripe Webhook Verification (Stripe CLI)
### Listen locally and forward
```bash
stripe listen --forward-to https://seedbay.vercel.app/api/payments/webhook
```

### Trigger test event
```bash
stripe trigger payment_intent.succeeded
```

Verify in Supabase:
- `orders.status` -> `paid`
- `purchases` row created
- `stripe_events` row created

## 5) Supabase Storage Lockdown
Run these SQL scripts in Supabase SQL editor:
- `/Users/admin/Desktop/Amin/seedbay/scripts/prod-audit.sql`
- `/Users/admin/Desktop/Amin/seedbay/scripts/storage-policies.sql`

Expected:
- Bucket `project-files` is private
- Only vendors/admins can upload/read their deliverables
- Buyers access files only via signed URL

## 6) Supabase DB Integrity Checks
Run in Supabase SQL editor:
```sql
-- Orders missing purchases
SELECT o.id
FROM public.orders o
LEFT JOIN public.purchases p ON p.order_id = o.id
WHERE o.status = 'paid' AND p.id IS NULL;

-- Purchases linked to non-paid orders
SELECT p.id
FROM public.purchases p
JOIN public.orders o ON o.id = p.order_id
WHERE o.status <> 'paid';
```

## 7) Monitoring (Sentry)
- Verify events are flowing in Sentry UI.
- Create a test error (optional):
```ts
import * as Sentry from '@sentry/nextjs'
Sentry.captureMessage('Seedbay prod test')
```

## 8) Incident Response
### Webhook failures
- Check `stripe_events` table for stuck `received` events
- Compare with Stripe dashboard events

### Download failures
- Check `audit_logs` for `download` or `rate_limited`
- Verify `purchases` row exists for the user+project

## 9) Rollback
- In Vercel dashboard: Deployments → select previous good deployment → Promote to Production.

## 10) Post-Deploy Verification Checklist
- [ ] Health check OK
- [ ] Cron verify OK
- [ ] Stripe webhook test OK
- [ ] Download test OK
- [ ] Sentry events visible
