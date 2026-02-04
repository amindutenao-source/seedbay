import { NextResponse } from 'next/server'

/**
 * Health Check Endpoint
 * GET /api/health
 * Returns system status
 */
export async function GET() {
  return NextResponse.json(
    {
      status: 'ok',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      version: '1.0.0',
    },
    { status: 200 }
  )
}
