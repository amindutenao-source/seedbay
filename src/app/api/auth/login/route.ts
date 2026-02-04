import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase'
import { LoginSchema, logAudit, badRequestResponse, serverErrorResponse, successResponse, unauthorizedResponse } from '@/lib/auth'

// ============================================================================
// POST /api/auth/login
// Connexion d'un utilisateur existant
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    // 1. Parser et valider le body
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return badRequestResponse('Corps JSON invalide')
    }
    const validationResult = LoginSchema.safeParse(body)

    if (!validationResult.success) {
      return badRequestResponse(validationResult.error.errors[0].message)
    }

    const { email, password } = validationResult.data

    // 2. Authentifier avec Supabase
    const supabase = await createSupabaseServerClient()
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      console.error('Login error:', error)
      
      // Logger la tentative échouée (sans révéler si l'email existe)
      await logAudit(
        null,
        'login_failed',
        'auth',
        null,
        null,
        { email, reason: 'invalid_credentials' },
        request
      )
      
      // Message générique pour éviter l'énumération d'utilisateurs
      return unauthorizedResponse('Email ou mot de passe incorrect')
    }

    if (!data.user || !data.session) {
      return serverErrorResponse('Erreur lors de la connexion')
    }

    // 3. Récupérer le profil utilisateur
    const { data: profile } = await supabase
      .from('users')
      .select('username, role, email_verified_at, avatar_url')
      .eq('id', data.user.id)
      .single()

    // 4. Logger la connexion réussie
    await logAudit(
      data.user.id,
      'login_success',
      'auth',
      data.user.id,
      null,
      { email },
      request
    )

    // 5. Retourner la réponse de succès
    // Note: Les cookies de session sont gérés automatiquement par Supabase SSR
    return successResponse({
      message: 'Connexion réussie',
      user: {
        id: data.user.id,
        email: data.user.email,
        username: profile?.username,
        role: profile?.role || 'buyer',
        emailVerified: profile?.email_verified_at !== null,
        avatarUrl: profile?.avatar_url,
      },
    })

  } catch (error) {
    console.error('Login error:', error)
    return serverErrorResponse('Erreur serveur')
  }
}
