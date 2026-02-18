'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

function resolveRedirect(path: string | null): string {
  if (!path) return '/marketplace'
  if (!path.startsWith('/')) return '/marketplace'
  if (path.startsWith('//')) return '/marketplace'
  return path
}

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      const data = await response.json()
      if (!response.ok) {
        setError(data.error || 'Email ou mot de passe incorrect')
        return
      }

      const redirectParam = typeof window !== 'undefined'
        ? new URLSearchParams(window.location.search).get('redirect')
        : null
      const redirectTo = resolveRedirect(redirectParam)
      router.push(redirectTo)
      router.refresh()
    } catch {
      setError('Erreur de connexion au serveur')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <Link href="/" className="block text-center mb-8 text-3xl font-bold text-white">
          SeedBay
        </Link>

        <div className="bg-white/5 rounded-xl p-8 border border-white/10">
          <h1 className="text-2xl font-bold text-white mb-6">Connexion</h1>

          {error && (
            <div className="bg-red-500/20 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg mb-6">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm text-gray-400 mb-2">
                Email
              </label>
              <input
                type="email"
                id="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-white/5 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                placeholder="vous@exemple.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm text-gray-400 mb-2">
                Mot de passe
              </label>
              <input
                type="password"
                id="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-white/5 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                placeholder="••••••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white py-3 rounded-lg font-semibold transition"
            >
              {loading ? 'Connexion...' : 'Se connecter'}
            </button>

            <p className="text-xs text-gray-500">
              En vous connectant, vous acceptez nos <Link href="/legal/cgu" className="text-blue-400 hover:text-blue-300">CGU</Link>,
              nos <Link href="/legal/cgv" className="text-blue-400 hover:text-blue-300">CGV</Link> et notre <Link href="/legal/privacy" className="text-blue-400 hover:text-blue-300">politique de confidentialité</Link>.
            </p>
          </form>

          <p className="text-center text-gray-400 mt-6">
            Pas encore de compte ?{' '}
            <Link href="/auth/signup" className="text-blue-400 hover:text-blue-300">
              Créer un compte
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
