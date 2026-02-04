import { NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase'
import { logAudit, serverErrorResponse, successResponse } from '@/lib/auth'

// ============================================================================
// POST /api/auth/logout
// Déconnexion de l'utilisateur
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()
    
    // Récupérer l'utilisateur avant la déconnexion pour le log
    const { data: { user } } = await supabase.auth.getUser()
    
    // Déconnecter l'utilisateur
    const { error } = await supabase.auth.signOut()

    if (error) {
      console.error('Logout error:', error)
      return serverErrorResponse('Erreur lors de la déconnexion')
    }

    // Logger la déconnexion
    if (user) {
      await logAudit(
        user.id,
        'logout',
        'auth',
        user.id,
        null,
        null,
        request
      )
    }

    return successResponse({
      message: 'Déconnexion réussie'
    })

  } catch (error) {
    console.error('Logout error:', error)
    return serverErrorResponse('Erreur serveur')
  }
}
