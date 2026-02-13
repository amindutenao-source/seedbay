'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'

export default function SignupPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const defaultRole = searchParams.get('role') === 'vendor' ? 'vendor' : 'buyer'

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    username: '',
    full_name: '',
    role: defaultRole,
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    if (formData.password !== formData.confirmPassword) {
      setError('Les mots de passe ne correspondent pas')
      setLoading(false)
      return
    }

    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          username: formData.username,
          full_name: formData.full_name || undefined,
          role: formData.role,
        }),
      })

      const data = await response.json()
      if (!response.ok) {
        setError(data.error || "Erreur lors de l'inscription")
        return
      }

      setSuccess(true)
    } catch {
      setError('Erreur de connexion au serveur')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white/5 rounded-xl p-8 border border-white/10 text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Vérifiez votre email</h2>
          <p className="text-gray-400 mb-6">
            Un email de confirmation a été envoyé à{' '}
            <strong className="text-white">{formData.email}</strong>.
          </p>
          <button
            onClick={() => router.push('/auth/login')}
            className="text-blue-400 hover:text-blue-300"
          >
            Retour à la connexion
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <Link href="/" className="block text-center mb-8 text-3xl font-bold text-white">
          SeedBay
        </Link>

        <div className="bg-white/5 rounded-xl p-8 border border-white/10">
          <h1 className="text-2xl font-bold text-white mb-6">Créer un compte</h1>

          {error && (
            <div className="bg-red-500/20 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg mb-6">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2">Je veux</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, role: 'buyer' })}
                  className={`p-3 rounded-lg border text-center transition ${
                    formData.role === 'buyer'
                      ? 'border-blue-500 bg-blue-500/20 text-white'
                      : 'border-white/20 text-gray-400 hover:border-white/40'
                  }`}
                >
                  Acheter
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, role: 'vendor' })}
                  className={`p-3 rounded-lg border text-center transition ${
                    formData.role === 'vendor'
                      ? 'border-blue-500 bg-blue-500/20 text-white'
                      : 'border-white/20 text-gray-400 hover:border-white/40'
                  }`}
                >
                  Vendre
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm text-gray-400 mb-2">
                Email
              </label>
              <input
                type="email"
                id="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full bg-white/5 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                placeholder="vous@exemple.com"
              />
            </div>

            <div>
              <label htmlFor="username" className="block text-sm text-gray-400 mb-2">
                Nom d&apos;utilisateur
              </label>
              <input
                type="text"
                id="username"
                required
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                className="w-full bg-white/5 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                placeholder="mon_username"
              />
            </div>

            <div>
              <label htmlFor="full_name" className="block text-sm text-gray-400 mb-2">
                Nom complet (optionnel)
              </label>
              <input
                type="text"
                id="full_name"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                className="w-full bg-white/5 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                placeholder="Jean Dupont"
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
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full bg-white/5 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                placeholder="••••••••••••"
              />
              <p className="text-xs text-gray-500 mt-1">
                Min. 12 caractères, 1 majuscule, 1 minuscule, 1 chiffre, 1 spécial
              </p>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm text-gray-400 mb-2">
                Confirmer le mot de passe
              </label>
              <input
                type="password"
                id="confirmPassword"
                required
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                className="w-full bg-white/5 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                placeholder="••••••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white py-3 rounded-lg font-semibold transition"
            >
              {loading ? 'Création...' : 'Créer mon compte'}
            </button>
          </form>

          <p className="text-center text-gray-400 mt-6">
            Déjà un compte ?{' '}
            <Link href="/auth/login" className="text-blue-400 hover:text-blue-300">
              Se connecter
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
