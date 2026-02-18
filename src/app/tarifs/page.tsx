export default function PricingPage() {
  return (
    <main className="min-h-screen bg-slate-900 text-white px-4 py-16">
      <div className="max-w-3xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold">Tarifs</h1>
        <section className="bg-white/5 border border-white/10 rounded-xl p-6">
          <h2 className="text-xl font-semibold mb-2">Vendeurs</h2>
          <p className="text-gray-300">Commission plateforme: 15% par vente.</p>
          <p className="text-gray-300">Reversement vendeur: 85% du montant hors frais Stripe.</p>
        </section>
        <section className="bg-white/5 border border-white/10 rounded-xl p-6">
          <h2 className="text-xl font-semibold mb-2">Acheteurs</h2>
          <p className="text-gray-300">Paiement sécurisé via Stripe.</p>
          <p className="text-gray-300">Accès aux fichiers uniquement après paiement confirmé.</p>
        </section>
      </div>
    </main>
  )
}
