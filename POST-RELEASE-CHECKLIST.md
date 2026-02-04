# Post-Release Checklist

Use this checklist after each release or deployment.

## Release Integrity
- [ ] Tag pushed (ex: `v1.0.0`)
- [ ] Release notes published
- [ ] `main` is protected and up to date
- [ ] `CHANGELOG.md` updated

## Deploy Health
- [ ] Staging deploy succeeded
- [ ] Prod deploy succeeded
- [ ] `/api/health` returns 200
- [ ] Smoke test: homepage, marketplace, project page, checkout
- [ ] Stripe webhook receives events (test mode)

## Data & Security
- [ ] Supabase schema matches expected tables/columns
- [ ] RLS policies enabled and verified
- [ ] Secrets stored in env, not in repo
- [ ] Audit logs and downloads tracking working

## Monitoring
- [ ] Error monitoring online (Sentry or equivalent)
- [ ] Logs checked for spikes/errors
- [ ] Latency baseline recorded

## Rollback Readiness
- [ ] Previous build still available
- [ ] Rollback instructions validated
- [ ] On-call contact noted
