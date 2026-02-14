import { NextRequest } from 'next/server'
import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase-server'
import { SignupSchema, logAudit, badRequestResponse, serverErrorResponse, successResponse } from '@/lib/auth'
import { buildRateLimitHeaders, checkRateLimit, getClientIp } from '@/lib/rate-limit'

// ============================================================================
// POST /api/auth/signup
// Inscription d'un nouvel utilisateur
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const clientIp = getClientIp(request)
    const rate = checkRateLimit(`signup:${clientIp}`, 6, 10 * 60 * 1000)
    if (!rate.allowed) {
      await logAudit(
        null,
        'rate_limited',
        'auth',
        null,
        null,
        { route: '/api/auth/signup', ip: clientIp },
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
    const validationResult = SignupSchema.safeParse(body)

    if (!validationResult.success) {
      return badRequestResponse(validationResult.error.errors[0].message)
    }

    const { email, password, username, role, full_name } = validationResult.data
    const isTestEmail = email.toLowerCase().endsWith('.test')

    // 2. Vérifier que le username n'est pas déjà pris
    const supabaseAdmin = createSupabaseAdminClient()
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('username', username)
      .single()

    if (existingUser) {
      return badRequestResponse('Ce nom d\'utilisateur est déjà pris')
    }

    // 3. Créer l'utilisateur avec Supabase Auth
    const supabase = await createSupabaseServerClient()
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username,
          role,
          full_name: full_name || null,
        },
        emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
      },
    })

    let authUser = authData.user ?? null
    let authSession = authData.session ?? null

    if (authError) {
      console.error('Auth signup error:', authError)

      // Gérer les erreurs spécifiques
      if (authError.message.includes('already registered')) {
        return badRequestResponse('Cet email est déjà utilisé')
      }

      // Autoriser les emails .test (GoTrue peut les refuser par défaut)
      if (isTestEmail && authError.message.toLowerCase().includes('email address') && authError.message.toLowerCase().includes('invalid')) {
        const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: {
            username,
            role,
            full_name: full_name || null,
          },
        })

        if (createErr) {
          console.error('Auth admin create user error:', createErr)
          if (createErr.message.includes('already registered')) {
            return badRequestResponse('Cet email est déjà utilisé')
          }
          return badRequestResponse(createErr.message)
        }

        authUser = created.user
        authSession = null
      } else {
        return badRequestResponse(authError.message)
      }
    }

    if (!authUser) {
      return serverErrorResponse('Erreur lors de la création du compte')
    }

    // 4. Créer le profil utilisateur dans la table public.users
    const { error: profileError } = await supabaseAdmin
      .from('users')
      .insert({
        id: authUser.id,
        email: email,
        username: username,
        full_name: full_name || null,
        role: role,
        email_verified_at: isTestEmail ? new Date().toISOString() : null,
      })

    if (profileError) {
      console.error('Profile creation error:', profileError)
      
      // Rollback: supprimer l'utilisateur auth si le profil n'a pas pu être créé
      await supabaseAdmin.auth.admin.deleteUser(authUser.id)
      
      if (profileError.code === '23505') { // Unique violation
        return badRequestResponse('Ce nom d\'utilisateur ou email est déjà utilisé')
      }
      
      return serverErrorResponse('Erreur lors de la création du profil')
    }

    // 5. Logger l'action d'audit
    await logAudit(
      authUser.id,
      'signup',
      'users',
      authUser.id,
      null,
      { email, username, role },
      request
    )

    // 6. Retourner la réponse de succès
    return successResponse({
      message: 'Compte créé avec succès. Veuillez vérifier votre email.',
      user: {
        id: authUser.id,
        email: authUser.email,
        username: username,
        role: role,
      },
      // Indiquer si une confirmation d'email est requise
      emailConfirmationRequired: !authSession,
    }, 201)

  } catch (error) {
    console.error('Signup error:', error)
    return serverErrorResponse('Erreur serveur')
  }
}
