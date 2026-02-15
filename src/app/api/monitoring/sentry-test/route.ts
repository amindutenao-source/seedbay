import { NextRequest, NextResponse } from 'next/server'
import * as Sentry from '@sentry/nextjs'

const SECRET = process.env.MONITORING_SECRET

function isAuthorized(request: NextRequest) {
  if (!SECRET) return false
  const authHeader = request.headers.get('authorization') || ''
  if (!authHeader.startsWith('Bearer ')) return false
  const token = authHeader.replace('Bearer ', '').trim()
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
