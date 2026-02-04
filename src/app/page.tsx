import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      {/* Navigation */}
      <nav className="border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <span className="text-2xl font-bold text-white">🚀 SeedBay</span>
            </div>
            <div className="flex items-center space-x-4">
              <Link 
                href="/marketplace" 
                className="text-gray-300 hover:text-white transition"
              >
                Marketplace
              </Link>
              <Link 
                href="/auth/login" 
                className="text-gray-300 hover:text-white transition"
              >
                Connexion
              </Link>
              <Link 
                href="/auth/signup" 
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition"
              >
                S&apos;inscrire
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
            Achetez des projets SaaS
            <span className="block text-blue-400">prêts à lancer</span>
          </h1>
          <p className="text-xl text-gray-300 mb-10 max-w-2xl mx-auto">
            Découvrez des projets digitaux clés en main : applications web, APIs, 
            templates et plus encore. Lancés par des développeurs, pour des entrepreneurs.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              href="/marketplace" 
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-lg text-lg font-semibold transition"
            >
              Explorer le Marketplace
            </Link>
            <Link 
              href="/auth/signup?role=vendor" 
              className="border border-white/30 hover:border-white/50 text-white px-8 py-4 rounded-lg text-lg font-semibold transition"
            >
              Vendre un projet
            </Link>
          </div>
        </div>

        {/* Features */}
        <div className="mt-32 grid md:grid-cols-3 gap-8">
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-8 border border-white/10">
            <div className="text-4xl mb-4">🔒</div>
            <h3 className="text-xl font-semibold text-white mb-2">Sécurisé</h3>
            <p className="text-gray-400">
              Paiements sécurisés via Stripe. Fichiers protégés jusqu&apos;à l&apos;achat.
            </p>
          </div>
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-8 border border-white/10">
            <div className="text-4xl mb-4">⚡</div>
            <h3 className="text-xl font-semibold text-white mb-2">Rapide</h3>
            <p className="text-gray-400">
              Téléchargez immédiatement après l&apos;achat. Pas d&apos;attente.
            </p>
          </div>
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-8 border border-white/10">
            <div className="text-4xl mb-4">💰</div>
            <h3 className="text-xl font-semibold text-white mb-2">Rentable</h3>
            <p className="text-gray-400">
              85% des ventes pour les vendeurs. Commission transparente de 15%.
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="mt-20 text-center">
          <div className="inline-flex items-center gap-2 bg-green-500/20 text-green-400 px-4 py-2 rounded-full text-sm">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
            Production Ready
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <p className="text-center text-gray-500">
            © 2026 SeedBay. Marketplace SaaS sécurisé.
          </p>
        </div>
      </footer>
    </div>
  )
}
