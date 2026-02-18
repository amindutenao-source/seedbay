import { NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { LoginSchema, logAudit, badRequestResponse, serverErrorResponse, successResponse, unauthorizedResponse } from '@/lib/auth'
import { buildRateLimitHeaders, checkRateLimit, getClientIp } from '@/lib/rate-limit'

// ============================================================================
// POST /api/auth/login
// Connexion d'un utilisateur existant
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const clientIp = getClientIp(request)
    const rate = checkRateLimit(`login:${clientIp}`, 10, 5 * 60 * 1000)
    if (!rate.allowed) {
      await logAudit(
        null,
        'rate_limited',
        'auth',
        null,
        null,
        { route: '/api/auth/login', ip: clientIp },
        request
      )
      return new Response(
        JSON.stringify({ error: 'Too many requests, please try again later.' }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            ...buildRateLimitHeaders(rate),
          },
        }
      )
    }
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

    const authConfirmedAt = (() => {
      const maybeUser = data.user as { email_confirmed_at?: string | null; confirmed_at?: string | null }
      return maybeUser.email_confirmed_at || maybeUser.confirmed_at || null
    })()

    if (profile && !profile.email_verified_at && authConfirmedAt) {
      await supabase
        .from('users')
        .update({ email_verified_at: authConfirmedAt })
        .eq('id', data.user.id)
        .is('email_verified_at', null)
    }

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
        emailVerified: (profile?.email_verified_at !== null) || !!authConfirmedAt,
        avatarUrl: profile?.avatar_url,
      },
    })

  } catch (error) {
    console.error('Login error:', error)
    return serverErrorResponse('Erreur serveur')
  }
}
