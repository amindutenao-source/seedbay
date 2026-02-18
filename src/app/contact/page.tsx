import Link from 'next/link'
import { SITE_INFO } from '@/lib/site-info'

export default function ContactPage() {
  return (
    <main className="min-h-screen bg-slate-900 text-white px-4 py-16">
      <div className="max-w-3xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold">Contact</h1>
        <p className="text-gray-300">
          Pour toute question commerciale, technique ou légale, utilisez les contacts ci-dessous.
        </p>

        <section className="bg-white/5 border border-white/10 rounded-xl p-6 space-y-2">
          <h2 className="text-xl font-semibold">Support client</h2>
          <p className="text-gray-300">Email: <a className="text-blue-400 hover:text-blue-300" href={`mailto:${SITE_INFO.supportEmail}`}>{SITE_INFO.supportEmail}</a></p>
          <p className="text-gray-300">Délai cible de réponse: 24h ouvrées</p>
        </section>

        <section className="bg-white/5 border border-white/10 rounded-xl p-6 space-y-2">
          <h2 className="text-xl font-semibold">Demandes légales / conformité</h2>
          <p className="text-gray-300">Email: <a className="text-blue-400 hover:text-blue-300" href={`mailto:${SITE_INFO.legalEmail}`}>{SITE_INFO.legalEmail}</a></p>
          <p className="text-gray-300">Objet recommandé: RGPD, Réclamation, Demande légale</p>
        </section>

        <section className="bg-white/5 border border-white/10 rounded-xl p-6 space-y-2">
          <h2 className="text-xl font-semibold">Informations entreprise</h2>
          <p className="text-gray-300">{SITE_INFO.legalEntity} ({SITE_INFO.legalForm})</p>
          <p className="text-gray-300">Adresse: {SITE_INFO.legalAddress}</p>
        </section>

        <div className="text-sm text-gray-400">
          Voir aussi: <Link href="/legal" className="text-blue-400 hover:text-blue-300">documents légaux</Link>
        </div>
      </div>
    </main>
  )
}
