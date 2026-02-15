/**
 * Vendor Dashboard Page
 * /vendor/dashboard
 * 
 * Tableau de bord pour les vendeurs:
 * - Liste de leurs projets
 * - Statistiques de ventes
 * - Gestion des projets
 */

'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createBrowserClient } from '@/lib/supabase-browser'

export const dynamic = 'force-dynamic'

interface Project {
  id: string;
  title: string;
  price: number;
  status: 'draft' | 'pending_review' | 'published' | 'rejected' | 'archived';
  created_at: string;
  sales_count?: number;
  revenue?: number;
}

interface Stats {
  total_projects: number;
  published_projects: number;
  total_sales: number;
  total_revenue: number;
}

export default function VendorDashboard() {
  const [projects, setProjects] = useState<Project[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadDashboard() {
      try {
        const supabase = createBrowserClient()
        // Vérifier l'authentification
        const { data: { user } } = await supabase.auth.getUser()
        
        if (!user) {
          setError('Please log in to access your dashboard')
          setLoading(false)
          return
        }

        // Charger les projets du vendor
        const { data: projectsData, error: projectsError } = await supabase
          .from('projects')
          .select('id, title, price, status, created_at')
          .eq('seller_id', user.id)
          .order('created_at', { ascending: false })

        if (projectsError) throw projectsError

        // Charger les statistiques
        const projects = (projectsData ?? []) as Project[]
        const projectIds = projects.map(p => p.id)
        const { data: purchasesData } = await supabase
          .from('purchases')
          .select('project_id, order:orders!order_id ( amount )')
          .in('project_id', projectIds)

        // Calculer les stats
        const salesByProject = new Map<string, { count: number; revenue: number }>()
        const purchases = (purchasesData ?? []) as Array<{
          project_id: string
          order: { amount: number } | null
        }>
        purchases.forEach(purchase => {
          const existing = salesByProject.get(purchase.project_id) || { count: 0, revenue: 0 }
          salesByProject.set(purchase.project_id, {
            count: existing.count + 1,
            revenue: existing.revenue + (purchase.order?.amount || 0),
          })
        })

        // Enrichir les projets avec les stats de ventes
        const enrichedProjects = projects.map(project => ({
          ...project,
          sales_count: salesByProject.get(project.id)?.count || 0,
          revenue: salesByProject.get(project.id)?.revenue || 0,
        })) as Project[]

        setProjects(enrichedProjects)
        setStats({
          total_projects: enrichedProjects.length,
          published_projects: enrichedProjects.filter(p => p.status === 'published').length,
          total_sales: purchases.length,
          total_revenue: purchases.reduce((sum, p) => sum + (p.order?.amount || 0), 0),
        })
      } catch (err) {
        console.error('Dashboard error:', err)
        setError('Failed to load dashboard')
      } finally {
        setLoading(false)
      }
    }

    loadDashboard()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <Link href="/auth/login" className="text-green-600 hover:underline">
            Go to Login
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
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
        {/* Stats Cards */}
        {stats && (
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
              <p className="text-3xl font-bold text-purple-600">
                ${stats.total_revenue.toFixed(2)}
              </p>
            </div>
          </div>
        )}

        {/* Projects Table */}
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Project
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Price
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Sales
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Revenue
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {projects.map((project) => (
                  <tr key={project.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{project.title}</div>
                      <div className="text-sm text-gray-500">
                        Created {new Date(project.created_at).toLocaleDateString()}
                      </div>
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
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ${(project.price / 100).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {project.sales_count || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ${((project.revenue || 0) / 100).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Link
                        href={`/vendor/projects/${project.id}/edit`}
                        className="text-green-600 hover:text-green-900 mr-4"
                      >
                        Edit
                      </Link>
                      <Link
                        href={`/projects/${project.id}`}
                        className="text-gray-600 hover:text-gray-900"
                      >
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
