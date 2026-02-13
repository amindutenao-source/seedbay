import { NextRequest, NextResponse } from 'next/server'

// Middleware simplifié pour le développement
export async function middleware(_request: NextRequest) {
  const response = NextResponse.next()
  
  // Headers de sécurité
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  
  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
