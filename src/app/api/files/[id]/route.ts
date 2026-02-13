/**
 * Files API
 * GET /api/files/[id] - Télécharger un fichier (signed URL)
 *
 * SÉCURITÉ CRITIQUE:
 * - Vérifier que l'utilisateur a acheté le projet
 * - Générer une signed URL avec expiration courte
 * - Logger tous les téléchargements acheteurs
 */

import { NextRequest, NextResponse } from 'next/server'
import { resolveDownload } from '@/lib/downloads'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const fileId = params.id
    const result = await resolveDownload(request, fileId)
    return NextResponse.json(result.body, { status: result.status })
  } catch (error) {
    console.error('Files GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
