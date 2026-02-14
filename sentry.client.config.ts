import * as Sentry from '@sentry/nextjs'

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN || ''
const tracesSampleRate = Number(process.env.SENTRY_TRACES_SAMPLE_RATE || 0.1)

Sentry.init({
  dsn,
  environment: process.env.NEXT_PUBLIC_APP_ENV || process.env.NODE_ENV,
  tracesSampleRate,
  enabled: Boolean(dsn) && process.env.NODE_ENV === 'production',
})
