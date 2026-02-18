import Image from 'next/image'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import DownloadFilesButton from '@/components/download-files-button'
import { createSupabaseServerClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

interface PurchaseRow {
  id: string
  order_id: string
  created_at: string
  order: {
    amount: number
    status: string
  } | null
  project: {
    id: string
    slug: string
    title: string
    description: string
    thumbnail_url: string | null
  } | null
}

export default async function PurchasesPage() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login?redirect=/purchases')
  }

  const { data, error } = await supabase
    .from('purchases')
    .select(`
      id,
      order_id,
      created_at,
      order:orders!order_id (
        amount,
        status
      ),
      project:projects!project_id (
        id,
        slug,
        title,
        description,
        thumbnail_url
      )
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">Failed to load purchases</p>
          <Link href="/marketplace" className="text-green-600 hover:underline">
            Browse marketplace
          </Link>
        </div>
      </div>
    )
  }

  const purchases = (data || []) as PurchaseRow[]
  const orderIds = purchases.map((purchase) => purchase.order_id)

  let deliverablesByOrder = new Map<string, string[]>()
  if (orderIds.length > 0) {
    const { data: deliverables } = await supabase
      .from('deliverables')
      .select('id, order_id')
      .in('order_id', orderIds)

    for (const row of deliverables || []) {
      const list = deliverablesByOrder.get(row.order_id) || []
      list.push(row.id)
      deliverablesByOrder.set(row.order_id, list)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <h1 className="text-2xl font-bold text-gray-900">My Purchases</h1>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {purchases.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-500 mb-4">You haven&apos;t made any purchases yet.</p>
            <Link href="/marketplace" className="text-green-600 hover:underline">
              Browse the marketplace
            </Link>
          </div>
        ) : (
          <div className="grid gap-6">
            {purchases.map((purchase) => {
              if (!purchase.project) {
                return null
              }

              const deliverableIds = deliverablesByOrder.get(purchase.order_id) || []

              return (
                <div
                  key={purchase.id}
                  className="bg-white rounded-lg shadow overflow-hidden"
                >
                  <div className="p-6 flex items-start gap-6">
                    <div className="w-32 h-24 bg-gray-200 rounded-lg flex-shrink-0 overflow-hidden">
                      {purchase.project.thumbnail_url ? (
                        <Image
                          src={purchase.project.thumbnail_url}
                          alt={purchase.project.title}
                          width={128}
                          height={96}
                          className="w-full h-full object-cover"
                          sizes="128px"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                          📦
                        </div>
                      )}
                    </div>

                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {purchase.project.title}
                      </h3>
                      <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                        {purchase.project.description}
                      </p>
                      <div className="mt-2 flex items-center gap-4 text-sm text-gray-500">
                        <span>Purchased {new Date(purchase.created_at).toLocaleDateString()}</span>
                        <span>•</span>
                        <span>${(purchase.order?.amount || 0).toFixed(2)}</span>
                      </div>
                    </div>

                    <div className="flex-shrink-0 flex gap-3">
                      <Link
                        href={`/projects/${purchase.project.slug}`}
                        className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
                      >
                        View Project
                      </Link>
                      <DownloadFilesButton
                        orderId={purchase.order_id}
                        deliverableIds={deliverableIds}
                      />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
