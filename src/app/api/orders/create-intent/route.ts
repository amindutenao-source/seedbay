import { NextRequest } from 'next/server'
import { randomUUID } from 'crypto'
import { createSupabaseServerClient } from '@/lib/supabase'
import Stripe from 'stripe'
import {
  requireAuth,
  requireEmailVerified,
  CreateOrderSchema,
  logAudit,
  badRequestResponse,
  notFoundResponse,
  serverErrorResponse,
  successResponse,
  unauthorizedResponse,
  forbiddenResponse,
} from '@/lib/auth'

// ============================================================================
// POST /api/orders/create-intent
// Créer une commande et un PaymentIntent Stripe
// ⚠️ CRITICAL: Suivre les 12 étapes de validation
// ============================================================================

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
})

export async function POST(request: NextRequest) {
  try {
    // ÉTAPE 1: Vérifier l'authentification
    const authResult = await requireAuth(request)
    if (!authResult.success) {
      return unauthorizedResponse(authResult.error!)
    }
    const userId = authResult.user!.id

    // ÉTAPE 2: Vérifier que l'email est vérifié
    const emailResult = await requireEmailVerified(request)
    if (!emailResult.success) {
      return forbiddenResponse(emailResult.error!)
    }

    // ÉTAPE 3: Valider l'input
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return badRequestResponse('Corps JSON invalide')
    }
    const validationResult = CreateOrderSchema.safeParse(body)
    if (!validationResult.success) {
      return badRequestResponse(validationResult.error.errors[0].message)
    }
    const { project_id } = validationResult.data

    // ÉTAPE 4: Récupérer le projet (RLS applique automatiquement)
    const supabase = await createSupabaseServerClient()
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, slug, seller_id, price, title, status, currency')
      .eq('id', project_id)
      .eq('status', 'published') // ✓ Vérifier que le projet est publié
      .single()

    if (projectError || !project) {
      return notFoundResponse('Projet non trouvé ou non disponible')
    }

    // ÉTAPE 5: Vérifier qu'il n'y a pas d'achat précédent
    const { data: existingPurchase } = await supabase
      .from('purchases')
      .select('id')
      .eq('project_id', project_id)
      .eq('user_id', userId)
      .single()

    if (existingPurchase) {
      return badRequestResponse('Vous avez déjà acheté ce projet')
    }

    const { data: existingOrder } = await supabase
      .from('orders')
      .select('id, status')
      .eq('project_id', project_id)
      .eq('user_id', userId)
      .in('status', ['pending', 'paid'])
      .single()

    if (existingOrder) {
      return badRequestResponse('Une commande est déjà en cours pour ce projet')
    }

    // ÉTAPE 6: Vérifier que l'acheteur n'est pas le vendeur
    if (project.seller_id === userId) {
      return badRequestResponse('Vous ne pouvez pas acheter votre propre projet')
    }

    // ÉTAPE 7: Calculer les frais CÔTÉ SERVEUR (JAMAIS faire confiance au client)
    const amountCents = Math.round(project.price * 100) // Convertir en centimes
    const currency = project.currency || 'USD'

    // ÉTAPE 8: Créer la commande avec status 'pending'
    const pendingPaymentIntentId = `pending_${randomUUID()}`
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        project_id: project_id,
        user_id: userId,
        amount: project.price,
        currency,
        stripe_payment_intent_id: pendingPaymentIntentId, // Temporaire, unique, sera mis à jour
        status: 'pending',
      })
      .select('id')
      .single()

    if (orderError || !order) {
      console.error('Order creation error:', orderError)
      return serverErrorResponse('Erreur lors de la création de la commande')
    }

    // ÉTAPE 9: Créer le PaymentIntent Stripe
    let paymentIntent: Stripe.PaymentIntent
    try {
      paymentIntent = await stripe.paymentIntents.create(
        {
          amount: amountCents,
          currency: currency.toLowerCase(),
          description: `SeedBay: ${project.title}`,
          metadata: {
            order_id: order.id,
            project_id: project_id,
            user_id: userId,
          },
        } as Stripe.PaymentIntentCreateParams,
        {
          // Idempotency key pour éviter les doubles paiements
          idempotencyKey: `order-${order.id}`,
        }
      )
    } catch (stripeError) {
      console.error('Stripe error:', stripeError)
      // Rollback: supprimer la commande
      await supabase.from('orders').delete().eq('id', order.id)
      return serverErrorResponse('Erreur lors de la création du paiement')
    }

    // ÉTAPE 10: Mettre à jour la commande avec l'ID du PaymentIntent
    const { error: updateError } = await supabase
      .from('orders')
      .update({ stripe_payment_intent_id: paymentIntent.id, updated_at: new Date().toISOString() })
      .eq('id', order.id)

    if (updateError) {
      console.error('Order update error:', updateError)
      // Annuler le PaymentIntent
      await stripe.paymentIntents.cancel(paymentIntent.id)
      await supabase.from('orders').delete().eq('id', order.id)
      return serverErrorResponse('Erreur lors de la mise à jour de la commande')
    }

    // ÉTAPE 11: Logger l'action d'audit
    await logAudit(
      userId,
      'create_order',
      'orders',
      order.id,
      null,
      {
        project_id,
        amount: project.price,
        payment_intent: paymentIntent.id,
      },
      request
    )

    // ÉTAPE 12: Retourner la réponse (JAMAIS exposer le full PaymentIntent)
    return successResponse({
      order_id: order.id,
      project_id: project_id,
      project_slug: project.slug,
      project_title: project.title,
      amount: project.price,
      currency,
      // ✓ Seulement le client_secret pour Stripe Elements
      client_secret: paymentIntent.client_secret,
    }, 201)

  } catch (error) {
    console.error('Create order error:', error)
    return serverErrorResponse('Erreur serveur')
  }
}
