import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export default async function VendorNewProjectPage() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login?redirect=/vendor/projects/new')
  }

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || (profile.role !== 'vendor' && profile.role !== 'admin')) {
    redirect('/dashboard/become-vendor')
  }

  return (
    <main className="min-h-screen bg-slate-900 text-white px-4 py-12">
      <div className="max-w-3xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold">Créer un nouveau projet</h1>
        <p className="text-gray-300">
          Cette route est active. Vous pouvez créer vos projets via l&apos;API sécurisée <code>/api/projects</code>
          ou en intégrant un formulaire vendeur complet.
        </p>
        <div className="rounded-xl border border-white/10 bg-white/5 p-6 text-sm text-gray-300 space-y-2">
          <p>Méthode: POST</p>
          <p>Endpoint: /api/projects</p>
          <p>Accès: vendor/admin authentifié</p>
        </div>
        <Link href="/vendor/dashboard" className="text-blue-400 hover:text-blue-300">Retour dashboard vendeur</Link>
      </div>
    </main>
  )
}
