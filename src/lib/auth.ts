import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient, createSupabaseAdminClient } from './supabase-server'
import { z } from 'zod'

// ============================================================================
// SEEDBAY: AUTHENTICATION & AUTHORIZATION HELPERS
// ============================================================================

// Types
export type UserRole = 'buyer' | 'vendor' | 'admin'

export interface AuthResult {
  success: boolean
  user: {
    id: string
    email: string
    role: UserRole
    emailVerified: boolean
  } | null
  error: string | null
}

// ============================================================================
// VALIDATION SCHEMAS (Zod)
// ============================================================================

// Keep this aligned with Supabase/Gotrue accepted special characters.
const PASSWORD_SPECIAL_CHAR_REGEX = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/

export const SignupSchema = z.object({
  email: z.string().trim().email('Email invalide'),
  password: z
    .string()
    .min(12, 'Le mot de passe doit contenir au moins 12 caractères')
    .regex(/[A-Z]/, 'Le mot de passe doit contenir au moins une majuscule')
    .regex(/[a-z]/, 'Le mot de passe doit contenir au moins une minuscule')
    .regex(/[0-9]/, 'Le mot de passe doit contenir au moins un chiffre')
    .regex(
      PASSWORD_SPECIAL_CHAR_REGEX,
      'Le mot de passe doit contenir au moins un caractère spécial (ex: !@#$%^&*)'
    ),
  username: z
    .string()
    .trim()
    .min(3, 'Le nom d\'utilisateur doit contenir au moins 3 caractères')
    .max(30, 'Le nom d\'utilisateur ne peut pas dépasser 30 caractères')
    .regex(/^[a-zA-Z0-9_.-]+$/, 'Le nom d\'utilisateur ne peut contenir que des lettres, chiffres, underscores, points et tirets'),
  role: z.enum(['buyer', 'vendor']).default('buyer'),
  full_name: z.string().optional(),
})

export const LoginSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(1, 'Mot de passe requis'),
})

export const CreateOrderSchema = z.object({
  project_id: z.string().uuid('ID de projet invalide'),
})

// ============================================================================
// AUTHENTICATION MIDDLEWARE HELPERS
// ============================================================================

/**
 * Vérifie que l'utilisateur est authentifié
 * Retourne les informations de l'utilisateur ou une erreur
 */
export async function requireAuth(_request: NextRequest): Promise<AuthResult> {
  try {
    const supabase = await createSupabaseServerClient()
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error || !user) {
      return {
        success: false,
        user: null,
        error: 'Non authentifié'
      }
    }

    // Récupérer le profil utilisateur pour le rôle
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('role, email_verified_at')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return {
        success: false,
        user: null,
        error: 'Profil utilisateur non trouvé'
      }
    }

    return {
      success: true,
      user: {
        id: user.id,
        email: user.email!,
        role: profile.role as UserRole,
        emailVerified: profile.email_verified_at !== null
      },
      error: null
    }
  } catch (err) {
    console.error('Auth error:', err)
    return {
      success: false,
      user: null,
      error: 'Erreur d\'authentification'
    }
  }
}

/**
 * Vérifie que l'utilisateur est un vendeur (ou admin)
 */
export async function requireVendor(request: NextRequest): Promise<AuthResult> {
  const authResult = await requireAuth(request)
  
  if (!authResult.success) {
    return authResult
  }

  if (authResult.user!.role !== 'vendor' && authResult.user!.role !== 'admin') {
    return {
      success: false,
      user: authResult.user,
      error: 'Accès réservé aux vendeurs'
    }
  }

  return authResult
}

/**
 * Vérifie que l'utilisateur est un admin
 */
export async function requireAdmin(request: NextRequest): Promise<AuthResult> {
  const authResult = await requireAuth(request)
  
  if (!authResult.success) {
    return authResult
  }

  if (authResult.user!.role !== 'admin') {
    return {
      success: false,
      user: authResult.user,
      error: 'Accès réservé aux administrateurs'
    }
  }

  return authResult
}

/**
 * Vérifie que l'email de l'utilisateur est vérifié (requis pour les paiements)
 */
export async function requireEmailVerified(request: NextRequest): Promise<AuthResult> {
  const authResult = await requireAuth(request)
  
  if (!authResult.success) {
    return authResult
  }

  if (!authResult.user!.emailVerified) {
    return {
      success: false,
      user: authResult.user,
      error: 'Veuillez vérifier votre email avant de continuer'
    }
  }

  return authResult
}

// ============================================================================
// RESPONSE HELPERS
// ============================================================================

export function unauthorizedResponse(message: string = 'Non autorisé') {
  return NextResponse.json(
    { error: message },
    { status: 401 }
  )
}

export function forbiddenResponse(message: string = 'Accès interdit') {
  return NextResponse.json(
    { error: message },
    { status: 403 }
  )
}

export function badRequestResponse(message: string = 'Requête invalide') {
  return NextResponse.json(
    { error: message },
    { status: 400 }
  )
}

export function notFoundResponse(message: string = 'Ressource non trouvée') {
  return NextResponse.json(
    { error: message },
    { status: 404 }
  )
}

export function serverErrorResponse(message: string = 'Erreur serveur') {
  // ⚠️ JAMAIS exposer les détails de l'erreur en production
  return NextResponse.json(
    { error: message },
    { status: 500 }
  )
}

export function successResponse<T>(data: T, status: number = 200) {
  return NextResponse.json(data, { status })
}

// ============================================================================
// AUDIT LOGGING
// ============================================================================

export async function logAudit(
  userId: string | null,
  action: string,
  resourceType: string,
  resourceId: string | null,
  oldValues: Record<string, unknown> | null,
  newValues: Record<string, unknown> | null,
  request?: NextRequest
) {
  try {
    const supabase = createSupabaseAdminClient()
    
    await supabase.from('audit_logs').insert({
      user_id: userId,
      action,
      resource_type: resourceType,
      resource_id: resourceId,
      old_values: oldValues,
      new_values: newValues,
      ip_address: request?.headers.get('x-forwarded-for') || request?.headers.get('x-real-ip') || null,
      user_agent: request?.headers.get('user-agent') || null,
    })
  } catch (error) {
    // Log l'erreur mais ne pas bloquer l'opération principale
    console.error('Audit log error:', error)
  }
}

// ============================================================================
// SIGNED URLS FOR FILE DOWNLOADS
// ============================================================================

/**
 * Génère une URL signée pour télécharger un fichier
 * Expiration: 5 minutes (300 secondes)
 */
export async function generateSignedUrl(
  bucketName: string,
  filePath: string,
  expiresIn: number = 300
): Promise<{ url: string | null; error: string | null }> {
  try {
    const supabase = await createSupabaseServerClient()
    
    const { data, error } = await supabase.storage
      .from(bucketName)
      .createSignedUrl(filePath, expiresIn)

    if (error) {
      return { url: null, error: error.message }
    }

    return { url: data.signedUrl, error: null }
  } catch (err) {
    console.error('Signed URL error:', err)
    return { url: null, error: 'Erreur lors de la génération de l\'URL' }
  }
}
