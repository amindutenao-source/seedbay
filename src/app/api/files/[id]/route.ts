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
import { createSupabaseServerClient } from '@/lib/supabase'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createSupabaseServerClient()
    const fileId = params.id

    // Vérifier l'authentification
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Récupérer les infos du deliverable
    const { data: deliverable, error: fileError } = await supabase
      .from('deliverables')
      .select(`
        id,
        project_id,
        file_key,
        file_size,
        title,
        project:projects!project_id (
          id,
          seller_id,
          title
        )
      `)
      .eq('id', fileId)
      .single()

    if (fileError || !deliverable) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      )
    }

    // Vérifier les droits d'accès
    // 1. Le vendeur propriétaire peut toujours accéder
    // 2. Un acheteur avec une commande complétée peut accéder
    const isSeller = deliverable.project?.seller_id === user.id
    let orderId: string | null = null

    if (!isSeller) {
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select('id, status')
        .eq('buyer_id', user.id)
        .eq('project_id', deliverable.project_id)
        .eq('status', 'completed')
        .single()

      if (orderError || !order) {
        return NextResponse.json(
          { error: 'Access denied. You must purchase this project first.' },
          { status: 403 }
        )
      }

      orderId = order.id
    }

    // Générer une signed URL (expire dans 5 minutes)
    const { data: signedUrl, error: signError } = await supabase
      .storage
      .from('project-files')
      .createSignedUrl(deliverable.file_key, 300)

    if (signError || !signedUrl) {
      console.error('Error creating signed URL:', signError)
      return NextResponse.json(
        { error: 'Failed to generate download URL' },
        { status: 500 }
      )
    }

    // Logger le téléchargement (uniquement côté acheteur)
    if (orderId) {
      await supabase
        .from('downloads')
        .insert({
          order_id: orderId,
          deliverable_id: deliverable.id,
          download_ip: request.headers.get('x-forwarded-for') || null,
          download_user_agent: request.headers.get('user-agent') || null,
        })
    }

    const fallbackName = deliverable.file_key?.split('/').pop() || deliverable.title

    return NextResponse.json({
      download_url: signedUrl.signedUrl,
      file_name: fallbackName,
      file_size: deliverable.file_size,
      expires_in: 300,
    })
  } catch (error) {
    console.error('Files GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
