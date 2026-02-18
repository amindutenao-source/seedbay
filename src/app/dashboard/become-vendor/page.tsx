import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { SITE_INFO } from '@/lib/site-info'

export const dynamic = 'force-dynamic'

export default async function BecomeVendorPage() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login?redirect=/dashboard/become-vendor')
  }

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role === 'vendor' || profile?.role === 'admin') {
    redirect('/vendor/dashboard')
  }

  return (
    <main className="min-h-screen bg-slate-900 text-white px-4 py-12">
      <div className="max-w-3xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold">Devenir vendeur</h1>
        <p className="text-gray-300">
          Pour activer le rôle vendeur, envoyez une demande à notre équipe avec votre email de compte,
          votre type de projets et votre expérience.
        </p>
        <div className="rounded-xl border border-white/10 bg-white/5 p-6">
          <p className="text-gray-300">Contact onboarding vendeurs: {SITE_INFO.supportEmail}</p>
          <p className="text-gray-300">Objet recommandé: Activation vendeur - {user.email}</p>
        </div>
        <div className="flex gap-4">
          <Link href="/contact" className="text-blue-400 hover:text-blue-300">Page contact</Link>
          <Link href="/dashboard" className="text-blue-400 hover:text-blue-300">Retour dashboard</Link>
        </div>
      </div>
    </main>
  )
}
