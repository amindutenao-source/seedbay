import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient, createSupabaseServerClient } from '@/lib/supabase-server'

function resolveNextPath(nextParam: string | null): string {
  if (!nextParam || !nextParam.startsWith('/')) {
    return '/dashboard'
  }

  if (nextParam.startsWith('//')) {
    return '/dashboard'
  }

  return nextParam
}

function getConfirmedAt(user: unknown): string | null {
  if (!user || typeof user !== 'object') {
    return null
  }

  const maybeUser = user as {
    email_confirmed_at?: string | null
    confirmed_at?: string | null
  }

  return maybeUser.email_confirmed_at || maybeUser.confirmed_at || null
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const tokenHash = url.searchParams.get('token_hash')
  const type = url.searchParams.get('type')
  const nextPath = resolveNextPath(url.searchParams.get('next'))

  try {
    const supabase = await createSupabaseServerClient()

    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code)
      if (error) {
        throw error
      }
    } else if (tokenHash && type) {
      const { error } = await supabase.auth.verifyOtp({
        type: type as 'signup' | 'invite' | 'magiclink' | 'recovery' | 'email_change' | 'email',
        token_hash: tokenHash,
      })

      if (error) {
        throw error
      }
    }

    const {
      data: { user },
    } = await supabase.auth.getUser()

    const confirmedAt = getConfirmedAt(user)
    if (user && confirmedAt) {
      const admin = createSupabaseAdminClient()
      await admin
        .from('users')
        .update({ email_verified_at: confirmedAt })
        .eq('id', user.id)
        .is('email_verified_at', null)
    }

    return NextResponse.redirect(new URL(nextPath, url.origin))
  } catch (error) {
    console.error('Auth callback error:', error)
    return NextResponse.redirect(new URL('/auth/login?error=verification_failed', url.origin))
  }
}
