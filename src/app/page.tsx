import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-900 text-white">


      {/* Navigation */}
      <nav className="relative z-50 border-b border-white/5 backdrop-blur-xl bg-black/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-blue-500 rounded-xl flex items-center justify-center">
                <span className="text-xl">🌱</span>
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">SeedBay</span>
            </div>
            <div className="hidden md:flex items-center space-x-8">
              <Link href="/marketplace" className="text-gray-400 hover:text-white transition-colors duration-300 text-sm font-medium">Marketplace</Link>
              <Link href="#features" className="text-gray-400 hover:text-white transition-colors duration-300 text-sm font-medium">Fonctionnalités</Link>
              <Link href="#how-it-works" className="text-gray-400 hover:text-white transition-colors duration-300 text-sm font-medium">Comment ça marche</Link>
            </div>
            <div className="flex items-center space-x-4">
              <Link href="/auth/login" className="text-gray-300 hover:text-white transition-colors duration-300 text-sm font-medium">Connexion</Link>
              <Link href="/auth/signup" className="group relative px-6 py-2.5 rounded-full text-sm font-semibold overflow-hidden bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 transition-all duration-300">
                Commencer
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative z-10 pt-20 pb-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-violet-500/10 to-blue-500/10 border border-violet-500/20 mb-8">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              <span className="text-sm text-gray-300">+2,500 projets vendus ce mois</span>
            </div>
            
            <h1 className="text-5xl md:text-7xl font-bold leading-tight mb-8">
              <span className="bg-gradient-to-r from-white via-white to-gray-500 bg-clip-text text-transparent">La marketplace</span>
              <br />
              <span className="bg-gradient-to-r from-violet-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent">des projets SaaS</span>
            </h1>
            
            <p className="text-xl text-gray-400 mb-12 max-w-2xl mx-auto leading-relaxed">
              Achetez des applications prêtes à l&apos;emploi ou vendez vos créations. 
              Rejoignez la communauté de développeurs et entrepreneurs qui façonnent le futur du digital.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
              <Link href="/marketplace" className="px-8 py-4 rounded-2xl text-lg font-semibold bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 transition-all duration-300 text-center">
                Explorer le Marketplace →
              </Link>
              <Link href="/auth/signup?role=vendor" className="px-8 py-4 rounded-2xl text-lg font-semibold border border-gray-600 hover:border-gray-400 bg-gray-800 hover:bg-gray-700 transition-all duration-300 text-center">
                + Vendre un projet
              </Link>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-8 text-gray-400 text-sm">
              <div className="flex items-center gap-2">
                <span>✅</span>
                <span>Paiement sécurisé</span>
              </div>
              <div className="flex items-center gap-2">
                <span>✅</span>
                <span>Support 24/7</span>
              </div>
              <div className="flex items-center gap-2">
                <span>✅</span>
                <span>Garantie 30 jours</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="relative z-10 py-20 border-y border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-violet-400 to-blue-400 bg-clip-text text-transparent mb-2">12K+</div>
              <div className="text-gray-500 text-sm">Projets disponibles</div>
            </div>
            <div className="text-center">
              <div className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-violet-400 to-blue-400 bg-clip-text text-transparent mb-2">45K+</div>
              <div className="text-gray-500 text-sm">Développeurs actifs</div>
            </div>
            <div className="text-center">
              <div className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-violet-400 to-blue-400 bg-clip-text text-transparent mb-2">€2.5M+</div>
              <div className="text-gray-500 text-sm">Revenus générés</div>
            </div>
            <div className="text-center">
              <div className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-violet-400 to-blue-400 bg-clip-text text-transparent mb-2">98%</div>
              <div className="text-gray-500 text-sm">Satisfaction client</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="relative z-10 py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              <span className="bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">Pourquoi choisir </span>
              <span className="bg-gradient-to-r from-violet-400 to-blue-400 bg-clip-text text-transparent">SeedBay ?</span>
            </h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              Une plateforme conçue pour maximiser votre succès, que vous soyez acheteur ou vendeur.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="group relative p-8 rounded-3xl bg-gradient-to-br from-violet-500/10 to-violet-600/10 border border-violet-500/20 backdrop-blur-sm hover:scale-105 transition-all duration-500">
              <div className="text-5xl mb-6">🔐</div>
              <h3 className="text-xl font-semibold text-white mb-3">Sécurité maximale</h3>
              <p className="text-gray-400 leading-relaxed">Transactions sécurisées via Stripe. Code source protégé jusqu&apos;à la validation du paiement.</p>
            </div>
            <div className="group relative p-8 rounded-3xl bg-gradient-to-br from-blue-500/10 to-blue-600/10 border border-blue-500/20 backdrop-blur-sm hover:scale-105 transition-all duration-500">
              <div className="text-5xl mb-6">⚡</div>
              <h3 className="text-xl font-semibold text-white mb-3">Livraison instantanée</h3>
              <p className="text-gray-400 leading-relaxed">Accès immédiat après achat. Téléchargement direct du code source. Documentation incluse.</p>
            </div>
            <div className="group relative p-8 rounded-3xl bg-gradient-to-br from-cyan-500/10 to-cyan-600/10 border border-cyan-500/20 backdrop-blur-sm hover:scale-105 transition-all duration-500">
              <div className="text-5xl mb-6">💎</div>
              <h3 className="text-xl font-semibold text-white mb-3">Qualité vérifiée</h3>
              <p className="text-gray-400 leading-relaxed">Chaque projet est reviewé par notre équipe. Standards de code stricts.</p>
            </div>
            <div className="group relative p-8 rounded-3xl bg-gradient-to-br from-green-500/10 to-green-600/10 border border-green-500/20 backdrop-blur-sm hover:scale-105 transition-all duration-500">
              <div className="text-5xl mb-6">🚀</div>
              <h3 className="text-xl font-semibold text-white mb-3">Prêt à déployer</h3>
              <p className="text-gray-400 leading-relaxed">Projets configurés pour un déploiement rapide. Compatible Vercel, AWS, et plus.</p>
            </div>
            <div className="group relative p-8 rounded-3xl bg-gradient-to-br from-yellow-500/10 to-yellow-600/10 border border-yellow-500/20 backdrop-blur-sm hover:scale-105 transition-all duration-500">
              <div className="text-5xl mb-6">💰</div>
              <h3 className="text-xl font-semibold text-white mb-3">85% pour les vendeurs</h3>
              <p className="text-gray-400 leading-relaxed">La commission la plus basse du marché. Paiements rapides. Dashboard analytics.</p>
            </div>
            <div className="group relative p-8 rounded-3xl bg-gradient-to-br from-pink-500/10 to-pink-600/10 border border-pink-500/20 backdrop-blur-sm hover:scale-105 transition-all duration-500">
              <div className="text-5xl mb-6">🤝</div>
              <h3 className="text-xl font-semibold text-white mb-3">Support dédié</h3>
              <p className="text-gray-400 leading-relaxed">Équipe support disponible 24/7. Communauté Discord active.</p>
            </div>
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section id="how-it-works" className="relative z-10 py-32 bg-gradient-to-b from-transparent via-violet-950/20 to-transparent">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              <span className="bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">Comment ça </span>
              <span className="bg-gradient-to-r from-violet-400 to-blue-400 bg-clip-text text-transparent">marche ?</span>
            </h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              Trois étapes simples pour lancer votre prochain projet.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-12">
            <div className="relative">
              <div className="text-8xl font-bold text-white/5 absolute -top-8 -left-4">01</div>
              <div className="relative pt-8">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center text-2xl font-bold mb-6">01</div>
                <h3 className="text-2xl font-semibold text-white mb-4">Explorez</h3>
                <p className="text-gray-400 leading-relaxed">Parcourez notre catalogue de projets SaaS. Filtrez par technologie, prix, ou catégorie.</p>
              </div>
            </div>
            <div className="relative">
              <div className="text-8xl font-bold text-white/5 absolute -top-8 -left-4">02</div>
              <div className="relative pt-8">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center text-2xl font-bold mb-6">02</div>
                <h3 className="text-2xl font-semibold text-white mb-4">Achetez</h3>
                <p className="text-gray-400 leading-relaxed">Paiement sécurisé en un clic. Accès instantané au code source et à la documentation.</p>
              </div>
            </div>
            <div className="relative">
              <div className="text-8xl font-bold text-white/5 absolute -top-8 -left-4">03</div>
              <div className="relative pt-8">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center text-2xl font-bold mb-6">03</div>
                <h3 className="text-2xl font-semibold text-white mb-4">Lancez</h3>
                <p className="text-gray-400 leading-relaxed">Déployez votre projet en quelques minutes. Support inclus pour vous accompagner.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative z-10 py-32">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative rounded-3xl overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-violet-600 to-blue-600" />
            <div className="relative p-12 md:p-20 text-center">
              <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">
                Prêt à lancer votre prochain projet ?
              </h2>
              <p className="text-xl text-white/80 mb-10 max-w-2xl mx-auto">
                Rejoignez des milliers de développeurs et entrepreneurs qui utilisent SeedBay.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/auth/signup" className="px-8 py-4 rounded-2xl bg-white text-violet-600 font-semibold text-lg hover:bg-gray-100 transition-colors">
                  Créer un compte gratuit
                </Link>
                <Link href="/marketplace" className="px-8 py-4 rounded-2xl border-2 border-white/30 text-white font-semibold text-lg hover:bg-white/10 transition-colors">
                  Voir les projets
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/5 bg-black/40 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid md:grid-cols-4 gap-12">
            <div>
              <div className="flex items-center gap-2 mb-6">
                <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-blue-500 rounded-xl flex items-center justify-center">
                  <span className="text-xl">🌱</span>
                </div>
                <span className="text-2xl font-bold">SeedBay</span>
              </div>
              <p className="text-gray-400 mb-6">La marketplace de référence pour acheter et vendre des projets SaaS.</p>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Produit</h4>
              <ul className="space-y-3">
                <li><Link href="/marketplace" className="text-gray-400 hover:text-white transition-colors text-sm">Marketplace</Link></li>
                <li><Link href="#features" className="text-gray-400 hover:text-white transition-colors text-sm">Fonctionnalités</Link></li>
                <li><Link href="/tarifs" className="text-gray-400 hover:text-white transition-colors text-sm">Tarifs</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Entreprise</h4>
              <ul className="space-y-3">
                <li><Link href="/a-propos" className="text-gray-400 hover:text-white transition-colors text-sm">À propos</Link></li>
                <li><Link href="/blog" className="text-gray-400 hover:text-white transition-colors text-sm">Blog</Link></li>
                <li><Link href="/contact" className="text-gray-400 hover:text-white transition-colors text-sm">Contact</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Légal</h4>
              <ul className="space-y-3">
                <li><Link href="/legal/privacy" className="text-gray-400 hover:text-white transition-colors text-sm">Confidentialité</Link></li>
                <li><Link href="/legal/cgu" className="text-gray-400 hover:text-white transition-colors text-sm">CGU</Link></li>
                <li><Link href="/legal/cgv" className="text-gray-400 hover:text-white transition-colors text-sm">CGV</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-white/5 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-gray-500 text-sm">© 2026 SeedBay. Tous droits réservés.</p>
            <div className="flex items-center gap-2 text-gray-500 text-sm">
              <span>Fait avec</span><span className="text-red-500">❤️</span><span>en France</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
