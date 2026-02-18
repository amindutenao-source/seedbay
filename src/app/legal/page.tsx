import Link from 'next/link'

export default function LegalIndexPage() {
  return (
    <main className="min-h-screen bg-slate-900 text-white px-4 py-16">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Informations légales</h1>
        <p className="text-gray-300 mb-8">
          Retrouvez l&apos;ensemble des documents légaux et réglementaires de SeedBay.
        </p>
        <ul className="space-y-3">
          <li>
            <Link href="/legal/mentions-legales" className="text-blue-400 hover:text-blue-300">
              Mentions légales
            </Link>
          </li>
          <li>
            <Link href="/legal/cgu" className="text-blue-400 hover:text-blue-300">
              Conditions Générales d&apos;Utilisation (CGU)
            </Link>
          </li>
          <li>
            <Link href="/legal/cgv" className="text-blue-400 hover:text-blue-300">
              Conditions Générales de Vente (CGV)
            </Link>
          </li>
          <li>
            <Link href="/legal/privacy" className="text-blue-400 hover:text-blue-300">
              Politique de confidentialité
            </Link>
          </li>
          <li>
            <Link href="/contact" className="text-blue-400 hover:text-blue-300">
              Contact
            </Link>
          </li>
        </ul>
      </div>
    </main>
  )
}
