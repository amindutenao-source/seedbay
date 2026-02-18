import Link from 'next/link'

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-slate-900 text-white px-4 py-16">
      <div className="max-w-3xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold">À propos de SeedBay</h1>
        <p className="text-gray-300">
          SeedBay est une marketplace SaaS permettant d&apos;acheter et vendre des projets digitaux prêts à lancer,
          avec une approche priorisant la sécurité des paiements et l&apos;accès contrôlé aux livrables.
        </p>
        <p className="text-gray-300">
          Notre objectif est de réduire le temps entre idée et exécution, pour les fondateurs, agences et développeurs.
        </p>
        <div className="text-sm text-gray-400">
          Besoin d&apos;informations supplémentaires ? <Link href="/contact" className="text-blue-400 hover:text-blue-300">Contactez-nous</Link>.
        </div>
      </div>
    </main>
  )
}
