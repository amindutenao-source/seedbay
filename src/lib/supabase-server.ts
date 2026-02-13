import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/lib/supabase-types'

// ============================================================================
// CLIENT SERVER (pour Server Components et API Routes)
// ============================================================================
export async function createSupabaseServerClient(): Promise<SupabaseClient<Database>> {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(key: string) {
          return cookieStore.get(key)?.value
        },
        set(key: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name: key, value, ...options })
          } catch {
            // The `set` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
        remove(key: string, options: CookieOptions) {
          try {
            cookieStore.set({ name: key, value: '', ...options, maxAge: 0 })
          } catch {
            // The `remove` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        }
      },
    }
  ) as unknown as SupabaseClient<Database>
}

// ============================================================================
// CLIENT ADMIN (pour opérations privilégiées - webhook, etc.)
// ⚠️ ATTENTION: Ne jamais exposer côté client
// ============================================================================
export function createSupabaseAdminClient(): SupabaseClient<Database> {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )
}

// ============================================================================
// HELPERS
// ============================================================================

// Récupérer l'utilisateur courant (server-side)
export async function getCurrentUser() {
  const supabase = await createSupabaseServerClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (error || !user) {
    return null
  }
  
  return user
}

// Récupérer le profil utilisateur complet
export async function getCurrentUserProfile() {
  const user = await getCurrentUser()
  
  if (!user) {
    return null
  }
  
  const supabase = await createSupabaseServerClient()
  const { data: profile, error } = await supabase
    .from('users')
    .select('id, email, username, full_name, avatar_url, role, seller_verified, avg_rating')
    .eq('id', user.id)
    .single()
  
  if (error) {
    console.error('Error fetching user profile:', error)
    return null
  }
  
  return profile
}
