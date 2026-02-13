import { NextRequest, NextResponse } from 'next/server'
import { downloadRequestSchema, resolveDownload } from '@/lib/downloads'

// ============================================================================
// POST /api/files/download
// Téléchargement sécurisé (signed URL courte)
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON body' },
        { status: 400 }
      )
    }

    const validation = downloadRequestSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.errors },
        { status: 400 }
      )
    }

    const { deliverable_id, order_id } = validation.data
    const result = await resolveDownload(request, deliverable_id, order_id)

    return NextResponse.json(result.body, { status: result.status })
  } catch (error) {
    console.error('Files download error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
