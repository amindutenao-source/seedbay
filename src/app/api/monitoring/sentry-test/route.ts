import { NextRequest, NextResponse } from 'next/server'
import * as Sentry from '@sentry/nextjs'

function normalizeSecret(value: string | null | undefined) {
  if (!value) return ''
  const trimmed = value.trim()
  const unquoted = (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) ? trimmed.slice(1, -1) : trimmed

  return unquoted
    .replace(/\\n/g, '')
    .replace(/\r?\n/g, '')
    .trim()
}

const SECRET = normalizeSecret(process.env.MONITORING_SECRET)

function isAuthorized(request: NextRequest) {
  if (!SECRET) return false
  const authHeader = request.headers.get('authorization') || ''
  if (!authHeader.startsWith('Bearer ')) return false
  const token = normalizeSecret(authHeader.replace('Bearer ', ''))
  return Boolean(token && token === SECRET)
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  Sentry.captureMessage('Seedbay prod test', { level: 'info' })

  return NextResponse.json({
    status: 'ok',
    message: 'Sentry test event sent',
  })
}
