'use client'

import { useEffect } from 'react'
import * as Sentry from '@sentry/nextjs'

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string }
}) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <html>
      <body>
        <main className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
          <div className="max-w-md rounded-lg bg-white p-6 shadow">
            <h1 className="mb-2 text-xl font-semibold text-gray-900">Something went wrong</h1>
            <p className="text-sm text-gray-600">
              The issue has been reported. Please refresh the page or try again later.
            </p>
          </div>
        </main>
      </body>
    </html>
  )
}
