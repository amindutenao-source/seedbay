import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { SITE_INFO } from '@/lib/site-info'

export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login?redirect=/settings')
  }

  return (
    <main className="min-h-screen bg-slate-900 text-white px-4 py-12">
      <div className="max-w-3xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold">Paramètres du compte</h1>

        <section className="rounded-xl border border-white/10 bg-white/5 p-6">
          <h2 className="text-xl font-semibold mb-2">Compte connecté</h2>
          <p className="text-gray-300">Email: {user.email}</p>
          <p className="text-gray-300">ID utilisateur: {user.id}</p>
        </section>

        <section className="rounded-xl border border-white/10 bg-white/5 p-6">
          <h2 className="text-xl font-semibold mb-2">Légal & conformité</h2>
          <ul className="list-disc list-inside text-gray-300 space-y-1">
            <li><Link href="/legal/mentions-legales" className="text-blue-400 hover:text-blue-300">Mentions légales</Link></li>
            <li><Link href="/legal/cgu" className="text-blue-400 hover:text-blue-300">CGU</Link></li>
            <li><Link href="/legal/cgv" className="text-blue-400 hover:text-blue-300">CGV</Link></li>
            <li><Link href="/legal/privacy" className="text-blue-400 hover:text-blue-300">Politique de confidentialité</Link></li>
          </ul>
        </section>

        <section className="rounded-xl border border-white/10 bg-white/5 p-6">
          <h2 className="text-xl font-semibold mb-2">Contact</h2>
          <p className="text-gray-300">Support: {SITE_INFO.supportEmail}</p>
          <p className="text-gray-300">Légal: {SITE_INFO.legalEmail}</p>
        </section>
      </div>
    </main>
  )
}
