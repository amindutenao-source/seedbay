import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase-server'

interface OrdersPageProps {
  searchParams?: {
    success?: string
  }
}

export const dynamic = 'force-dynamic'

export default async function OrdersPage({ searchParams }: OrdersPageProps) {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login?redirect=/orders')
  }

  const { data: orders } = await supabase
    .from('orders')
    .select(`
      id,
      status,
      amount,
      currency,
      created_at,
      project:projects!project_id (
        id,
        slug,
        title
      )
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  return (
    <main className="min-h-screen bg-slate-900 text-white px-4 py-12">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Mes commandes</h1>

        {searchParams?.success === 'true' && (
          <div className="mb-6 rounded-lg border border-green-500/40 bg-green-500/10 px-4 py-3 text-green-300">
            Paiement confirmé. Votre accès sera visible dans <Link href="/purchases" className="underline">Mes achats</Link> dès traitement du webhook.
          </div>
        )}

        {!orders || orders.length === 0 ? (
          <div className="rounded-xl border border-white/10 bg-white/5 p-6 text-gray-300">
            Aucune commande pour le moment. <Link href="/marketplace" className="text-blue-400 hover:text-blue-300">Explorer le marketplace</Link>
          </div>
        ) : (
          <div className="rounded-xl border border-white/10 overflow-hidden">
            <table className="min-w-full divide-y divide-white/10 text-sm">
              <thead className="bg-white/5">
                <tr>
                  <th className="px-4 py-3 text-left">Commande</th>
                  <th className="px-4 py-3 text-left">Projet</th>
                  <th className="px-4 py-3 text-left">Statut</th>
                  <th className="px-4 py-3 text-left">Montant</th>
                  <th className="px-4 py-3 text-left">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10 bg-slate-800/60">
                {orders.map((order) => (
                  <tr key={order.id}>
                    <td className="px-4 py-3 font-mono text-xs">{order.id.slice(0, 8)}...</td>
                    <td className="px-4 py-3">
                      {order.project?.slug ? (
                        <Link href={`/projects/${order.project.slug}`} className="text-blue-400 hover:text-blue-300">
                          {order.project.title}
                        </Link>
                      ) : (
                        order.project?.title || 'Projet'
                      )}
                    </td>
                    <td className="px-4 py-3">{order.status}</td>
                    <td className="px-4 py-3">{order.amount} {order.currency || 'USD'}</td>
                    <td className="px-4 py-3">{new Date(order.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  )
}
