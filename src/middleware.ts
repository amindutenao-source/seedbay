import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'

// ============================================================================
// SEEDBAY: MIDDLEWARE GLOBAL
// Gère l'authentification et le rafraîchissement des sessions
// ============================================================================

// Routes publiques (pas d'authentification requise)
const publicRoutes = [
  '/api/health',
  '/api/auth/signup',
  '/api/auth/login',
  '/api/auth/callback',
  '/api/projects/public',
  '/api/payments/webhook', // Webhook Stripe - authentification via signature
]

// Routes protégées (authentification requise)
const protectedApiRoutes = [
  '/api/orders',
  '/api/dashboard',
  '/api/projects/create',
  '/api/projects/update',
  '/api/projects/delete',
]

// Pages protégées (redirection vers login si non authentifié)
const protectedPages = [
  '/dashboard',
  '/checkout',
  '/orders',
  '/settings',
]

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // Créer le client Supabase pour le middleware
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value)
            response = NextResponse.next({
              request: {
                headers: request.headers,
              },
            })
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  // Rafraîchir la session (important pour maintenir l'authentification)
  const { data: { user }, error } = await supabase.auth.getUser()

  // Vérifier si la route est publique
  if (publicRoutes.some(route => pathname.startsWith(route))) {
    return response
  }

  // Vérifier les routes API protégées
  if (protectedApiRoutes.some(route => pathname.startsWith(route))) {
    if (error || !user) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      )
    }
    return response
  }

  // Vérifier les pages protégées
  if (protectedPages.some(route => pathname.startsWith(route))) {
    if (error || !user) {
      const loginUrl = new URL('/auth/login', request.url)
      loginUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(loginUrl)
    }
    return response
  }

  // Rediriger les utilisateurs connectés depuis les pages d'auth
  if (pathname.startsWith('/auth/') && user) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return response
}

export const config = {
  matcher: [
    // Matcher pour toutes les routes sauf les fichiers statiques
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
