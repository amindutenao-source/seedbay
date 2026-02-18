import { SITE_INFO } from '@/lib/site-info'

export default function CgvPage() {
  return (
    <main className="min-h-screen bg-slate-900 text-white px-4 py-16">
      <article className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold">Conditions Générales de Vente (CGV)</h1>
        <p className="text-sm text-gray-400">Dernière mise à jour: {SITE_INFO.lastUpdated}</p>

        <section>
          <h2 className="text-xl font-semibold mb-2">1. Champ d&apos;application</h2>
          <p className="text-gray-300">
            Les présentes CGV régissent les achats de projets digitaux réalisés via la plateforme {SITE_INFO.name}.
            Les produits sont des contenus numériques livrés sous forme de fichiers téléchargeables.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">2. Prix et paiement</h2>
          <p className="text-gray-300">
            Les prix sont affichés sur la page projet avant validation de la commande. Le paiement est traité par Stripe.
            La commande est considérée comme payée uniquement après confirmation du paiement par webhook sécurisé.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">3. Livraison</h2>
          <p className="text-gray-300">
            L&apos;accès aux livrables est ouvert après validation du paiement et création d&apos;un enregistrement d&apos;achat.
            Le téléchargement se fait via URL signée à durée de vie courte.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">4. Droit de rétractation</h2>
          <p className="text-gray-300">
            Conformément à l&apos;article L221-28 du Code de la consommation, le droit de rétractation ne s&apos;applique pas
            aux contenus numériques fournis sur support immatériel dont l&apos;exécution a commencé après accord exprès
            de l&apos;acheteur et renoncement exprès à son droit de rétractation.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">5. Remboursements</h2>
          <p className="text-gray-300">
            Les remboursements sont étudiés au cas par cas en cas de défaut majeur avéré, fraude, ou obligation légale.
            En cas de remboursement validé, l&apos;accès aux livrables est révoqué.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">6. Obligations des vendeurs</h2>
          <p className="text-gray-300">
            Les vendeurs garantissent que les livrables fournis sont licites, exploitables et qu&apos;ils détiennent les droits
            nécessaires pour les commercialiser.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">7. Limitation de responsabilité</h2>
          <p className="text-gray-300">
            {SITE_INFO.name} agit en qualité d&apos;intermédiaire technique. La responsabilité éditoriale et juridique des contenus
            vendus incombe au vendeur, sauf faute prouvée de la plateforme.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">8. Service client</h2>
          <p className="text-gray-300">
            Contact support: {SITE_INFO.supportEmail}<br />
            Contact légal: {SITE_INFO.legalEmail}
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">9. Droit applicable et litiges</h2>
          <p className="text-gray-300">
            Les présentes CGV sont soumises au droit français. En cas de litige, une tentative de résolution amiable
            sera privilégiée avant saisine de la juridiction compétente.
          </p>
        </section>
      </article>
    </main>
  )
}
