import { NextRequest } from 'next/server'
import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase'
import { SignupSchema, logAudit, badRequestResponse, serverErrorResponse, successResponse } from '@/lib/auth'

// ============================================================================
// POST /api/auth/signup
// Inscription d'un nouvel utilisateur
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
    const validationResult = SignupSchema.safeParse(body)

    if (!validationResult.success) {
      return badRequestResponse(validationResult.error.errors[0].message)
    }

    const { email, password, username, role, full_name } = validationResult.data

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

    if (authError) {
      console.error('Auth signup error:', authError)
      
      // Gérer les erreurs spécifiques
      if (authError.message.includes('already registered')) {
        return badRequestResponse('Cet email est déjà utilisé')
      }
      
      return badRequestResponse(authError.message)
    }

    if (!authData.user) {
      return serverErrorResponse('Erreur lors de la création du compte')
    }

    // 4. Créer le profil utilisateur dans la table public.users
    const { error: profileError } = await supabaseAdmin
      .from('users')
      .insert({
        id: authData.user.id,
        email: email,
        username: username,
        full_name: full_name || null,
        role: role,
        // email_verified_at sera mis à jour après vérification de l'email
      })

    if (profileError) {
      console.error('Profile creation error:', profileError)
      
      // Rollback: supprimer l'utilisateur auth si le profil n'a pas pu être créé
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      
      if (profileError.code === '23505') { // Unique violation
        return badRequestResponse('Ce nom d\'utilisateur ou email est déjà utilisé')
      }
      
      return serverErrorResponse('Erreur lors de la création du profil')
    }

    // 5. Logger l'action d'audit
    await logAudit(
      authData.user.id,
      'signup',
      'users',
      authData.user.id,
      null,
      { email, username, role },
      request
    )

    // 6. Retourner la réponse de succès
    return successResponse({
      message: 'Compte créé avec succès. Veuillez vérifier votre email.',
      user: {
        id: authData.user.id,
        email: authData.user.email,
        username: username,
        role: role,
      },
      // Indiquer si une confirmation d'email est requise
      emailConfirmationRequired: !authData.session,
    }, 201)

  } catch (error) {
    console.error('Signup error:', error)
    return serverErrorResponse('Erreur serveur')
  }
}
