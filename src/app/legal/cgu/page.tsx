import Link from 'next/link'
import { SITE_INFO } from '@/lib/site-info'

export default function CguPage() {
  return (
    <main className="min-h-screen bg-slate-900 text-white px-4 py-16">
      <article className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold">Conditions Générales d&apos;Utilisation (CGU)</h1>
        <p className="text-sm text-gray-400">Dernière mise à jour: {SITE_INFO.lastUpdated}</p>

        <section>
          <h2 className="text-xl font-semibold mb-2">1. Objet</h2>
          <p className="text-gray-300">
            Les présentes CGU encadrent l&apos;utilisation de la plateforme {SITE_INFO.name}, accessible à l&apos;adresse {SITE_INFO.appUrl},
            permettant la mise en relation entre vendeurs et acheteurs de projets digitaux.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">2. Création de compte</h2>
          <p className="text-gray-300">
            L&apos;utilisateur s&apos;engage à fournir des informations exactes, à préserver la confidentialité de ses identifiants,
            et à signaler immédiatement toute utilisation non autorisée de son compte.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">3. Rôles et responsabilités</h2>
          <p className="text-gray-300">
            Les vendeurs garantissent disposer des droits nécessaires sur les projets vendus. Les acheteurs s&apos;engagent à utiliser
            les livrables conformément aux licences accordées.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">4. Comportements interdits</h2>
          <ul className="list-disc list-inside text-gray-300 space-y-1">
            <li>Fraude, tentative d&apos;intrusion, détournement de paiements.</li>
            <li>Contenu illicite, contrefait, ou portant atteinte aux droits de tiers.</li>
            <li>Contournement des mécanismes techniques de sécurité de la plateforme.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">5. Suspension / résiliation</h2>
          <p className="text-gray-300">
            {SITE_INFO.name} peut suspendre ou fermer un compte en cas de violation des présentes CGU, fraude,
            ou risque de sécurité pour la plateforme et ses utilisateurs.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">6. Données personnelles</h2>
          <p className="text-gray-300">
            Le traitement des données est détaillé dans la <Link href="/legal/privacy" className="text-blue-400 hover:text-blue-300">politique de confidentialité</Link>.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">7. Droit applicable</h2>
          <p className="text-gray-300">
            Les présentes CGU sont soumises au droit français. En cas de litige, une solution amiable sera recherchée
            avant toute action contentieuse.
          </p>
        </section>
      </article>
    </main>
  )
}
