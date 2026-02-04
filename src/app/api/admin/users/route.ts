import { NextRequest } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase'
import {
  requireAdmin,
  unauthorizedResponse,
  forbiddenResponse,
  serverErrorResponse,
  successResponse,
} from '@/lib/auth'

// ============================================================================
// GET /api/admin/users
// Liste des utilisateurs (admin only)
// ============================================================================

export async function GET(request: NextRequest) {
  const authResult = await requireAdmin(request)

  if (!authResult.success) {
    if (!authResult.user) {
      return unauthorizedResponse(authResult.error || 'Non autorisé')
    }
    return forbiddenResponse(authResult.error || 'Accès interdit')
  }

  try {
    const supabaseAdmin = createSupabaseAdminClient()
    const { data: users, error } = await supabaseAdmin
      .from('users')
      .select('id, email, username, role, created_at')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Admin users fetch error:', error)
      return serverErrorResponse('Erreur lors du chargement des utilisateurs')
    }

    return successResponse({ users: users || [] })
  } catch (error) {
    console.error('Admin users GET error:', error)
    return serverErrorResponse('Erreur serveur')
  }
}
