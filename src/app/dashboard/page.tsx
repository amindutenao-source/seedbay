import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getCurrentUserProfile } from '@/lib/supabase'

// ============================================================================
// PAGE: /dashboard
// Tableau de bord utilisateur
// ============================================================================

export default async function DashboardPage() {
  const profile = await getCurrentUserProfile()

  if (!profile) {
    redirect('/auth/login?redirect=/dashboard')
  }

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Navigation */}
      <nav className="border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="text-2xl font-bold text-white">
              🚀 SeedBay
            </Link>
            <div className="flex items-center space-x-4">
              <Link href="/marketplace" className="text-gray-300 hover:text-white">
                Marketplace
              </Link>
              <span className="text-gray-400">|</span>
              <span className="text-white">{profile.username}</span>
              <form action="/api/auth/logout" method="POST">
                <button 
                  type="submit"
                  className="text-gray-400 hover:text-white text-sm"
                >
                  Déconnexion
                </button>
              </form>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">
            Bienvenue, {profile.full_name || profile.username} 👋
          </h1>
          <p className="text-gray-400 mt-2">
            Rôle: <span className="text-blue-400 capitalize">{profile.role}</span>
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white/5 rounded-xl p-6 border border-white/10">
            <div className="text-3xl mb-2">📊</div>
            <h3 className="text-gray-400 text-sm">Mes achats</h3>
            <p className="text-2xl font-bold text-white">0</p>
          </div>
          {profile.role === 'vendor' && (
            <>
              <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                <div className="text-3xl mb-2">📦</div>
                <h3 className="text-gray-400 text-sm">Mes projets</h3>
                <p className="text-2xl font-bold text-white">0</p>
              </div>
              <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                <div className="text-3xl mb-2">💰</div>
                <h3 className="text-gray-400 text-sm">Revenus</h3>
                <p className="text-2xl font-bold text-white">$0</p>
              </div>
            </>
          )}
        </div>

        {/* Actions */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Buyer Actions */}
          <div className="bg-white/5 rounded-xl p-6 border border-white/10">
            <h2 className="text-xl font-semibold text-white mb-4">Acheteur</h2>
            <div className="space-y-3">
              <Link 
                href="/marketplace"
                className="block bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg text-center transition"
              >
                Explorer le Marketplace
              </Link>
              <Link 
                href="/orders"
                className="block border border-white/20 hover:border-white/40 text-white px-4 py-3 rounded-lg text-center transition"
              >
                Mes commandes
              </Link>
            </div>
          </div>

          {/* Vendor Actions */}
          {profile.role === 'vendor' && (
            <div className="bg-white/5 rounded-xl p-6 border border-white/10">
              <h2 className="text-xl font-semibold text-white mb-4">Vendeur</h2>
              <div className="space-y-3">
                <Link 
                  href="/dashboard/projects/new"
                  className="block bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded-lg text-center transition"
                >
                  Créer un projet
                </Link>
                <Link 
                  href="/dashboard/projects"
                  className="block border border-white/20 hover:border-white/40 text-white px-4 py-3 rounded-lg text-center transition"
                >
                  Gérer mes projets
                </Link>
                <Link 
                  href="/dashboard/sales"
                  className="block border border-white/20 hover:border-white/40 text-white px-4 py-3 rounded-lg text-center transition"
                >
                  Mes ventes
                </Link>
              </div>
            </div>
          )}

          {/* Become Vendor */}
          {profile.role === 'buyer' && (
            <div className="bg-gradient-to-br from-green-900/50 to-blue-900/50 rounded-xl p-6 border border-green-500/30">
              <h2 className="text-xl font-semibold text-white mb-2">Devenir vendeur</h2>
              <p className="text-gray-400 mb-4">
                Vendez vos projets SaaS et gagnez 85% sur chaque vente.
              </p>
              <Link 
                href="/dashboard/become-vendor"
                className="inline-block bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition"
              >
                Commencer à vendre
              </Link>
            </div>
          )}
        </div>

        {/* Settings */}
        <div className="mt-8">
          <Link 
            href="/settings"
            className="text-gray-400 hover:text-white text-sm"
          >
            ⚙️ Paramètres du compte
          </Link>
        </div>
      </main>
    </div>
  )
}
