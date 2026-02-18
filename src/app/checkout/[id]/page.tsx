'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'

// ============================================================================
// PAGE: /checkout/[id]
// Page de paiement pour un projet
// ============================================================================

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

interface Props {
  params: { id: string }
}

export default function CheckoutPage({ params }: Props) {
  const [clientSecret, setClientSecret] = useState('')
  const [orderData, setOrderData] = useState<{
    order_id: string
    project_title: string
    project_slug: string
    amount: number
  } | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const normalizedError = error.toLowerCase()
  const isEmailVerificationError = normalizedError.includes('verifier votre email') || normalizedError.includes('vérifier votre email')

  useEffect(() => {
    // Créer le PaymentIntent
    const createOrder = async () => {
      try {
        const response = await fetch('/api/orders/create-intent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ project_id: params.id }),
        })

        const data = await response.json()

        if (!response.ok) {
          setError(data.error || 'Erreur lors de la création de la commande')
          return
        }

        setClientSecret(data.client_secret)
        setOrderData({
          order_id: data.order_id,
          project_title: data.project_title,
          project_slug: data.project_slug,
          amount: data.amount,
        })
      } catch (err) {
        setError('Erreur de connexion au serveur')
      } finally {
        setLoading(false)
      }
    }

    createOrder()
  }, [params.id])

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Préparation du paiement...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white/5 rounded-xl p-8 border border-white/10 text-center">
          <div className="text-5xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-white mb-4">Erreur</h2>
          <p className="text-gray-400 mb-3">{error}</p>

          {isEmailVerificationError && (
            <div className="text-sm text-gray-300 mb-6">
              <p className="mb-3">Confirmez votre email via le lien reçu, puis reconnectez-vous pour continuer l&apos;achat.</p>
              <Link
                href={`/auth/login?redirect=/checkout/${params.id}`}
                className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white"
              >
                Se reconnecter
              </Link>
            </div>
          )}

          <Link 
            href={orderData?.project_slug ? `/projects/${orderData.project_slug}` : `/marketplace`}
            className="text-blue-400 hover:text-blue-300"
          >
            Retour au projet
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Navigation */}
      <nav className="border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="text-2xl font-bold text-white">
              🚀 SeedBay
            </Link>
          </div>
        </div>
      </nav>

      {/* Checkout Form */}
      <main className="max-w-lg mx-auto px-4 py-12">
        <div className="bg-white/5 rounded-xl p-8 border border-white/10">
          <h1 className="text-2xl font-bold text-white mb-2">Finaliser l&apos;achat</h1>
          <p className="text-gray-400 mb-6">{orderData?.project_title}</p>

          {/* Order Summary */}
          <div className="bg-white/5 rounded-lg p-4 mb-6">
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Total</span>
              <span className="text-2xl font-bold text-white">
                ${orderData?.amount}
              </span>
            </div>
          </div>

          {/* Stripe Elements */}
          {clientSecret && (
            <Elements 
              stripe={stripePromise} 
              options={{ 
                clientSecret,
                appearance: {
                  theme: 'night',
                  variables: {
                    colorPrimary: '#3b82f6',
                  },
                },
              }}
            >
              <CheckoutForm projectId={params.id} />
            </Elements>
          )}
        </div>

        {/* Security + Legal Notice */}
        <div className="text-center text-gray-500 text-sm mt-6 space-y-2">
          <p>🔒 Paiement sécurisé par Stripe. Vos données sont chiffrées.</p>
          <p>
            En poursuivant, vous acceptez les <Link href="/legal/cgv" className="text-blue-400 hover:text-blue-300">CGV</Link>
            {' '}et la <Link href="/legal/privacy" className="text-blue-400 hover:text-blue-300">politique de confidentialité</Link>.
          </p>
        </div>
      </main>
    </div>
  )
}

// Composant de formulaire de paiement
function CheckoutForm({ projectId }: { projectId: string }) {
  const stripe = useStripe()
  const elements = useElements()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!stripe || !elements) {
      return
    }

    setLoading(true)
    setError('')

    const { error: submitError } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/orders?success=true&project=${projectId}`,
      },
    })

    if (submitError) {
      setError(submitError.message || 'Erreur lors du paiement')
      setLoading(false)
    }
    // Si succès, Stripe redirige automatiquement
  }

  return (
    <form onSubmit={handleSubmit}>
      <PaymentElement className="mb-6" />

      {error && (
        <div className="bg-red-500/20 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={!stripe || loading}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white py-3 rounded-lg font-semibold transition"
      >
        {loading ? 'Traitement...' : 'Payer maintenant'}
      </button>
    </form>
  )
}
