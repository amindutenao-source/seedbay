import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase-server'

/**
 * Health Check Endpoint
 * GET /api/health
 * Returns system status
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const deep = url.searchParams.get('deep') === '1'

  if (!deep) {
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

  try {
    const supabaseAdmin = createSupabaseAdminClient()
    const { error } = await supabaseAdmin
      .from('projects')
      .select('id', { count: 'exact', head: true })
      .limit(1)

    if (error) {
      return NextResponse.json(
        {
          status: 'degraded',
          db: 'error',
          message: error.message,
          timestamp: new Date().toISOString(),
        },
        { status: 503 }
      )
    }

    return NextResponse.json(
      {
        status: 'ok',
        db: 'ok',
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    )
  } catch (err) {
    return NextResponse.json(
      {
        status: 'degraded',
        db: 'error',
        message: 'Health check failed',
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    )
  }
}
