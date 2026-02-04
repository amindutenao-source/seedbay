/**
 * Purchases Page
 * /purchases
 * 
 * Liste des achats de l'utilisateur avec accès aux téléchargements
 */

'use client'

import { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { createBrowserClient } from '@/lib/supabase'

interface Purchase {
  id: string;
  amount_gross: number;
  status: string;
  created_at: string;
  project: {
    id: string;
    title: string;
    description: string;
    thumbnail_url?: string;
  };
}

export default function PurchasesPage() {
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)

  const supabase = useMemo(() => createBrowserClient(), [])

  useEffect(() => {
    async function loadPurchases() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        
        if (!user) {
          setError('Please log in to view your purchases')
          setLoading(false)
          return
        }

        const { data, error: fetchError } = await supabase
          .from('orders')
          .select(`
            id,
            amount_gross,
            status,
            created_at,
            project:projects!project_id (
              id,
              title,
              description,
              thumbnail_url
            )
          `)
          .eq('buyer_id', user.id)
          .eq('status', 'completed')
          .order('created_at', { ascending: false })

        if (fetchError) throw fetchError
        setPurchases(data || [])
      } catch (err) {
        console.error('Error loading purchases:', err)
        setError('Failed to load purchases')
      } finally {
        setLoading(false)
      }
    }

    loadPurchases()
  }, [supabase])

  async function handleDownload(projectId: string) {
    setDownloadingId(projectId)
    try {
      // Récupérer les fichiers du projet
      const { data: files, error: filesError } = await supabase
        .from('deliverables')
        .select('id')
        .eq('project_id', projectId)

      if (filesError) throw filesError

      if (!files || files.length === 0) {
        alert('No files available for download')
        return
      }

      // Télécharger chaque fichier
      for (const file of files) {
        const response = await fetch(`/api/files/${file.id}`)
        const data = await response.json()

        if (data.download_url) {
          // Ouvrir le lien de téléchargement
          window.open(data.download_url, '_blank')
        }
      }
    } catch (err) {
      console.error('Download error:', err)
      alert('Failed to download files')
    } finally {
      setDownloadingId(null)
    }
  }

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
          <h1 className="text-2xl font-bold text-gray-900">My Purchases</h1>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {purchases.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-500 mb-4">You haven&apos;t made any purchases yet.</p>
            <Link
              href="/marketplace"
              className="text-green-600 hover:underline"
            >
              Browse the marketplace
            </Link>
          </div>
        ) : (
          <div className="grid gap-6">
            {purchases.map((purchase) => (
              <div
                key={purchase.id}
                className="bg-white rounded-lg shadow overflow-hidden"
              >
                <div className="p-6 flex items-start gap-6">
                  {/* Thumbnail */}
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

                  {/* Info */}
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
                      <span>${purchase.amount_gross.toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex-shrink-0 flex gap-3">
                    <Link
                      href={`/projects/${purchase.project.id}`}
                      className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
                    >
                      View Project
                    </Link>
                    <button
                      onClick={() => handleDownload(purchase.project.id)}
                      disabled={downloadingId === purchase.project.id}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50"
                    >
                      {downloadingId === purchase.project.id ? (
                        <span className="flex items-center gap-2">
                          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                              fill="none"
                            />
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            />
                          </svg>
                          Downloading...
                        </span>
                      ) : (
                        '⬇ Download Files'
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
