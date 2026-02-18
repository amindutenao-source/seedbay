'use client'

import { useState } from 'react'

interface DownloadFilesButtonProps {
  orderId: string
  deliverableIds: string[]
}

export default function DownloadFilesButton({ orderId, deliverableIds }: DownloadFilesButtonProps) {
  const [loading, setLoading] = useState(false)

  async function handleDownload() {
    if (deliverableIds.length === 0) {
      window.alert('Aucun fichier disponible pour cette commande')
      return
    }

    setLoading(true)

    try {
      for (const deliverableId of deliverableIds) {
        const response = await fetch('/api/files/download', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ order_id: orderId, deliverable_id: deliverableId }),
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data?.error || 'Download failed')
        }

        if (data?.download_url) {
          window.open(data.download_url, '_blank', 'noopener,noreferrer')
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Impossible de télécharger les fichiers'
      window.alert(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleDownload}
      disabled={loading}
      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50"
    >
      {loading ? 'Downloading...' : '⬇ Download Files'}
    </button>
  )
}
