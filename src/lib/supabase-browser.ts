import { createBrowserClient as createSsrBrowserClient, serialize } from '@supabase/ssr'
import type { Database } from '@/lib/supabase-types'

function getCookie(name: string) {
  if (typeof document === 'undefined') return undefined
  const match = document.cookie.match(new RegExp('(?:^|; )' + name.replace(/[-.*+?^${}()|[\]\\]/g, '\\$&') + '=([^;]*)'))
  return match ? decodeURIComponent(match[1]) : undefined
}

// ============================================================================
// CLIENT BROWSER (session basée sur cookies)
// ============================================================================
export function createBrowserClient() {
  return createSsrBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(key) {
          return getCookie(key)
        },
        set(key, value, options) {
          if (typeof document === 'undefined') return
          document.cookie = serialize(key, value, { path: '/', ...options })
        },
        remove(key, options) {
          if (typeof document === 'undefined') return
          document.cookie = serialize(key, '', { path: '/', ...options, maxAge: 0 })
        },
      },
      isSingleton: true,
    }
  )
}
