import { createClient } from '@supabase/supabase-js'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

// ============================================================================
// SEEDBAY: SUPABASE CLIENT CONFIGURATION
// ============================================================================

// Types pour la base de données (à générer avec Supabase CLI)
export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          username: string
          full_name: string | null
          avatar_url: string | null
          bio: string | null
          role: 'buyer' | 'vendor' | 'admin'
          seller_verified: boolean
          seller_badge: 'bronze' | 'silver' | 'gold' | null
          seller_bio: string | null
          seller_website: string | null
          stripe_account_id: string | null
          avg_rating: number
          total_sales: number
          total_projects_sold: number
          created_at: string
          updated_at: string
          email_verified_at: string | null
        }
        Insert: Omit<Database['public']['Tables']['users']['Row'], 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['users']['Insert']>
      }
      projects: {
        Row: {
          id: string
          seller_id: string
          title: string
          slug: string
          description: string
          problem: string
          solution: string
          maturity_level: 'idea' | 'roadmap' | 'mvp' | 'production'
          tech_stack: string[]
          license_type: 'exclusive' | 'non-exclusive'
          category: string
          tags: string[] | null
          price: number
          currency: string
          thumbnail_url: string | null
          status: 'draft' | 'pending_review' | 'published' | 'rejected' | 'archived'
          rejection_reason: string | null
          is_featured: boolean
          featured_until: string | null
          view_count: number
          purchase_count: number
          avg_rating: number
          review_count: number
          created_at: string
          updated_at: string
          published_at: string | null
        }
        Insert: Omit<Database['public']['Tables']['projects']['Row'], 'id' | 'created_at' | 'updated_at' | 'view_count' | 'purchase_count' | 'avg_rating' | 'review_count'>
        Update: Partial<Database['public']['Tables']['projects']['Insert']>
      }
      orders: {
        Row: {
          id: string
          project_id: string
          buyer_id: string
          seller_id: string
          amount_gross: number
          platform_fee: number
          seller_payout: number
          currency: string
          stripe_payment_intent_id: string
          stripe_charge_id: string | null
          stripe_customer_id: string | null
          status: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded'
          status_updated_at: string
          payout_id: string | null
          payout_date: string | null
          created_at: string
          completed_at: string | null
          refunded_at: string | null
        }
        Insert: Omit<Database['public']['Tables']['orders']['Row'], 'id' | 'created_at' | 'status_updated_at'>
        Update: Partial<Database['public']['Tables']['orders']['Insert']>
      }
      deliverables: {
        Row: {
          id: string
          project_id: string
          title: string
          description: string | null
          file_key: string
          file_type: 'code' | 'document' | 'design' | 'data' | 'other'
          file_size: number
          file_mime_type: string | null
          version: number
          is_latest: boolean
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['deliverables']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['deliverables']['Insert']>
      }
      reviews: {
        Row: {
          id: string
          order_id: string
          reviewer_id: string
          project_id: string
          rating: number
          comment: string | null
          helpful_count: number
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['reviews']['Row'], 'id' | 'created_at' | 'updated_at' | 'helpful_count'>
        Update: Partial<Database['public']['Tables']['reviews']['Insert']>
      }
      favorites: {
        Row: {
          id: string
          user_id: string
          project_id: string
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['favorites']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['favorites']['Insert']>
      }
      messages: {
        Row: {
          id: string
          order_id: string | null
          sender_id: string
          recipient_id: string
          subject: string
          body: string
          is_read: boolean
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['messages']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['messages']['Insert']>
      }
      audit_logs: {
        Row: {
          id: string
          user_id: string | null
          action: string
          resource_type: string | null
          resource_id: string | null
          old_values: Record<string, unknown> | null
          new_values: Record<string, unknown> | null
          ip_address: string | null
          user_agent: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['audit_logs']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['audit_logs']['Insert']>
      }
      downloads: {
        Row: {
          id: string
          order_id: string
          deliverable_id: string
          downloaded_at: string
          download_ip: string | null
          download_user_agent: string | null
        }
        Insert: Omit<Database['public']['Tables']['downloads']['Row'], 'id' | 'downloaded_at'>
        Update: Partial<Database['public']['Tables']['downloads']['Insert']>
      }
    }
  }
}

// ============================================================================
// CLIENT BROWSER (pour composants client)
// ============================================================================
export function createBrowserClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// ============================================================================
// CLIENT SERVER (pour Server Components et API Routes)
// ============================================================================
export async function createSupabaseServerClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )
}

// ============================================================================
// CLIENT ADMIN (pour opérations privilégiées - webhook, etc.)
// ⚠️ ATTENTION: Ne jamais exposer côté client
// ============================================================================
export function createSupabaseAdminClient() {
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
