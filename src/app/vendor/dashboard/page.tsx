import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

interface Project {
  id: string
  slug: string
  title: string
  price: number
  status: 'draft' | 'pending_review' | 'published' | 'rejected' | 'archived'
  created_at: string
  sales_count: number
  revenue: number
}

export default async function VendorDashboard() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login?redirect=/vendor/dashboard')
  }

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || (profile.role !== 'vendor' && profile.role !== 'admin')) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">Vendor access required</p>
          <Link href="/dashboard" className="text-green-600 hover:underline">
            Go to Dashboard
          </Link>
        </div>
      </div>
    )
  }

  const { data: projectsData, error } = await supabase
    .from('projects')
    .select('id, slug, title, price, status, created_at')
    .eq('seller_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">Failed to load dashboard</p>
          <Link href="/dashboard" className="text-green-600 hover:underline">
            Back to Dashboard
          </Link>
        </div>
      </div>
    )
  }

  const projectsBase = (projectsData || []) as Array<Omit<Project, 'sales_count' | 'revenue'>>
  const projectIds = projectsBase.map((project) => project.id)

  let purchases: Array<{ project_id: string; order: { amount: number } | null }> = []
  if (projectIds.length > 0) {
    const { data: purchasesData } = await supabase
      .from('purchases')
      .select('project_id, order:orders!order_id ( amount )')
      .in('project_id', projectIds)

    purchases = (purchasesData || []) as Array<{ project_id: string; order: { amount: number } | null }>
  }

  const salesByProject = new Map<string, { count: number; revenue: number }>()
  for (const purchase of purchases) {
    const current = salesByProject.get(purchase.project_id) || { count: 0, revenue: 0 }
    salesByProject.set(purchase.project_id, {
      count: current.count + 1,
      revenue: current.revenue + (purchase.order?.amount || 0),
    })
  }

  const projects: Project[] = projectsBase.map((project) => ({
    ...project,
    sales_count: salesByProject.get(project.id)?.count || 0,
    revenue: salesByProject.get(project.id)?.revenue || 0,
  }))

  const stats = {
    total_projects: projects.length,
    published_projects: projects.filter((project) => project.status === 'published').length,
    total_sales: purchases.length,
    total_revenue: purchases.reduce((sum, purchase) => sum + (purchase.order?.amount || 0), 0),
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">Vendor Dashboard</h1>
            <Link
              href="/vendor/projects/new"
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition"
            >
              + New Project
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm text-gray-500">Total Projects</p>
            <p className="text-3xl font-bold text-gray-900">{stats.total_projects}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm text-gray-500">Published</p>
            <p className="text-3xl font-bold text-green-600">{stats.published_projects}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm text-gray-500">Total Sales</p>
            <p className="text-3xl font-bold text-blue-600">{stats.total_sales}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm text-gray-500">Total Revenue</p>
            <p className="text-3xl font-bold text-purple-600">${stats.total_revenue.toFixed(2)}</p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Your Projects</h2>
          </div>

          {projects.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <p>You haven&apos;t created any projects yet.</p>
              <Link
                href="/vendor/projects/new"
                className="text-green-600 hover:underline mt-2 inline-block"
              >
                Create your first project
              </Link>
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Project</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sales</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Revenue</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {projects.map((project) => (
                  <tr key={project.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{project.title}</div>
                      <div className="text-sm text-gray-500">Created {new Date(project.created_at).toLocaleDateString()}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          project.status === 'published'
                            ? 'bg-green-100 text-green-800'
                            : project.status === 'draft'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {project.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${project.price.toFixed(2)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{project.sales_count}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${project.revenue.toFixed(2)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Link href={`/vendor/projects/${project.id}/edit`} className="text-green-600 hover:text-green-900 mr-4">
                        Edit
                      </Link>
                      <Link href={`/projects/${project.slug}`} className="text-gray-600 hover:text-gray-900">
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  )
}
