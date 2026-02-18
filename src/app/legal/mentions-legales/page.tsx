import Link from 'next/link'
import { SITE_INFO } from '@/lib/site-info'

export default function MentionsLegalesPage() {
  return (
    <main className="min-h-screen bg-slate-900 text-white px-4 py-16">
      <article className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold">Mentions légales</h1>
        <p className="text-sm text-gray-400">Dernière mise à jour: {SITE_INFO.lastUpdated}</p>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold">Éditeur du site</h2>
          <p className="text-gray-300">Raison sociale: {SITE_INFO.legalEntity}</p>
          <p className="text-gray-300">Forme juridique: {SITE_INFO.legalForm}</p>
          <p className="text-gray-300">Capital social: {SITE_INFO.legalCapital}</p>
          <p className="text-gray-300">Adresse: {SITE_INFO.legalAddress}</p>
          <p className="text-gray-300">SIRET: {SITE_INFO.legalSiret}</p>
          <p className="text-gray-300">TVA intracommunautaire: {SITE_INFO.legalVat}</p>
          <p className="text-gray-300">Directeur de la publication: {SITE_INFO.publicationDirector}</p>
          <p className="text-gray-300">Email: {SITE_INFO.legalEmail}</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold">Hébergement</h2>
          <p className="text-gray-300">Hébergeur: {SITE_INFO.hostName}</p>
          <p className="text-gray-300">Adresse: {SITE_INFO.hostAddress}</p>
          <p className="text-gray-300">Site: <a href={SITE_INFO.hostWebsite} className="text-blue-400 hover:text-blue-300" target="_blank" rel="noreferrer">{SITE_INFO.hostWebsite}</a></p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold">Contact</h2>
          <p className="text-gray-300">Support client: {SITE_INFO.supportEmail}</p>
          <p className="text-gray-300">Contact général: {SITE_INFO.contactEmail}</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold">Propriété intellectuelle</h2>
          <p className="text-gray-300">
            Les contenus du site {SITE_INFO.name} (structure, textes, logos, éléments graphiques) sont protégés par le droit d&apos;auteur.
            Toute reproduction totale ou partielle non autorisée est interdite.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold">Liens utiles</h2>
          <ul className="list-disc list-inside text-gray-300 space-y-1">
            <li><Link href="/legal/cgu" className="text-blue-400 hover:text-blue-300">CGU</Link></li>
            <li><Link href="/legal/cgv" className="text-blue-400 hover:text-blue-300">CGV</Link></li>
            <li><Link href="/legal/privacy" className="text-blue-400 hover:text-blue-300">Politique de confidentialité</Link></li>
          </ul>
        </section>
      </article>
    </main>
  )
}
