import { SITE_INFO } from '@/lib/site-info'

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-slate-900 text-white px-4 py-16">
      <article className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold">Politique de confidentialité</h1>
        <p className="text-sm text-gray-400">Dernière mise à jour: {SITE_INFO.lastUpdated}</p>

        <section>
          <h2 className="text-xl font-semibold mb-2">1. Responsable du traitement</h2>
          <p className="text-gray-300">
            Responsable: {SITE_INFO.legalEntity}<br />
            Contact DPO / RGPD: {SITE_INFO.legalEmail}
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">2. Données collectées</h2>
          <ul className="list-disc list-inside text-gray-300 space-y-1">
            <li>Données de compte: email, identifiant, rôle, informations de profil.</li>
            <li>Données transactionnelles: commandes, achats, historiques de paiement.</li>
            <li>Données techniques: adresse IP, user-agent, logs de sécurité et d&apos;audit.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">3. Finalités</h2>
          <ul className="list-disc list-inside text-gray-300 space-y-1">
            <li>Fourniture du service et gestion des transactions.</li>
            <li>Sécurisation de la plateforme, prévention de la fraude et conformité.</li>
            <li>Support client et traitement des demandes légales.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">4. Base légale</h2>
          <p className="text-gray-300">
            Exécution contractuelle, respect des obligations légales, intérêt légitime de sécurité,
            et consentement lorsque requis.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">5. Durée de conservation</h2>
          <p className="text-gray-300">
            Les données sont conservées pendant la durée nécessaire aux finalités ci-dessus,
            puis archivées/supprimées selon les obligations légales et fiscales applicables.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">6. Vos droits</h2>
          <p className="text-gray-300">
            Vous disposez des droits d&apos;accès, rectification, effacement, opposition, limitation et portabilité,
            dans les conditions prévues par le RGPD.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">7. Exercice des droits</h2>
          <p className="text-gray-300">
            Toute demande peut être adressée à {SITE_INFO.legalEmail}. Une réponse est fournie dans les délais légaux.
          </p>
        </section>
      </article>
    </main>
  )
}
