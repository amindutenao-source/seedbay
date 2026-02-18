import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase-server'

interface EditProjectPageProps {
  params: {
    id: string
  }
}

export const dynamic = 'force-dynamic'

export default async function EditProjectPage({ params }: EditProjectPageProps) {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/auth/login?redirect=/vendor/projects/${params.id}/edit`)
  }

  const { data: project } = await supabase
    .from('projects')
    .select('id, title, seller_id')
    .eq('id', params.id)
    .single()

  if (!project || project.seller_id !== user.id) {
    return (
      <main className="min-h-screen bg-slate-900 text-white px-4 py-12">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-2xl font-bold mb-4">Projet introuvable ou accès refusé</h1>
          <Link href="/vendor/dashboard" className="text-blue-400 hover:text-blue-300">Retour dashboard vendeur</Link>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-slate-900 text-white px-4 py-12">
      <div className="max-w-3xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold">Édition du projet</h1>
        <p className="text-gray-300">Projet: {project.title}</p>
        <p className="text-gray-300">ID: {project.id}</p>
        <p className="text-gray-300">
          Route d&apos;édition active. Vous pouvez brancher ici un formulaire relié à l&apos;API ou à une Server Action.
        </p>
        <Link href="/vendor/dashboard" className="text-blue-400 hover:text-blue-300">Retour dashboard vendeur</Link>
      </div>
    </main>
  )
}
