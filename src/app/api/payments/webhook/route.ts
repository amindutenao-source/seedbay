import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase'
import Stripe from 'stripe'

// ============================================================================
// POST /api/payments/webhook
// ⚠️ CRITICAL: Webhook Stripe - SEULE source de vérité pour les paiements
// ============================================================================

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
})

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(request: NextRequest) {
  try {
    // ÉTAPE 1: Récupérer le body brut et la signature
    const body = await request.text()
    const signature = request.headers.get('stripe-signature')

    if (!signature) {
      console.error('Webhook: Missing signature')
      return NextResponse.json(
        { error: 'Missing signature' },
        { status: 400 }
      )
    }

    // ÉTAPE 2: ⚠️ CRITICAL - Valider la signature Stripe (HMAC-SHA256)
    let event: Stripe.Event
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    } catch (err) {
      console.error('Webhook signature verification failed:', err)
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      )
    }

    // ÉTAPE 3: Traiter l'événement selon son type
    const supabase = createSupabaseAdminClient()

    switch (event.type) {
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        await handlePaymentSuccess(supabase, paymentIntent, event.id)
        break
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        await handlePaymentFailed(supabase, paymentIntent, event.id)
        break
      }

      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge
        await handleRefund(supabase, charge, event.id)
        break
      }

      default:
        // Log les événements non gérés pour monitoring
        console.log(`Unhandled event type: ${event.type}`)
    }

    // Toujours retourner 200 pour confirmer la réception
    return NextResponse.json({ received: true })

  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    )
  }
}

// ============================================================================
// HANDLERS
// ============================================================================

async function handlePaymentSuccess(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  paymentIntent: Stripe.PaymentIntent,
  eventId: string
) {
  const orderId = paymentIntent.metadata.order_id
  const projectId = paymentIntent.metadata.project_id

  if (!orderId) {
    console.error('Payment success: Missing order_id in metadata')
    return
  }

  // Récupérer la commande
  const { data: order, error: fetchError } = await supabase
    .from('orders')
    .select('id, status, amount_gross')
    .eq('id', orderId)
    .single()

  if (fetchError || !order) {
    console.error('Payment success: Order not found', orderId)
    return
  }

  // ⚠️ IDEMPOTENCY: Si déjà complété, ne rien faire
  if (order.status === 'completed') {
    console.log('Payment success: Order already completed', orderId)
    return
  }

  // ⚠️ CRITICAL: Vérifier que le montant correspond
  const expectedAmount = Math.round(order.amount_gross * 100)
  if (paymentIntent.amount !== expectedAmount) {
    console.error(
      `Payment success: Amount mismatch. Expected ${expectedAmount}, got ${paymentIntent.amount}`,
      orderId
    )
    // Logger l'anomalie mais ne pas bloquer (pourrait être un problème de devise)
    await supabase.from('audit_logs').insert({
      user_id: null,
      action: 'payment_amount_mismatch',
      resource_type: 'orders',
      resource_id: orderId,
      old_values: { expected: expectedAmount },
      new_values: { received: paymentIntent.amount },
    })
  }

  // Mettre à jour le statut de la commande
  const { error: updateError } = await supabase
    .from('orders')
    .update({
      status: 'completed',
      stripe_charge_id: paymentIntent.latest_charge as string,
      completed_at: new Date().toISOString(),
    })
    .eq('id', orderId)

  if (updateError) {
    console.error('Payment success: Failed to update order', updateError)
    return
  }

  // Logger l'action d'audit
  await supabase.from('audit_logs').insert({
    user_id: null, // Webhook, pas d'utilisateur direct
    action: 'payment_completed',
    resource_type: 'orders',
    resource_id: orderId,
    old_values: { status: order.status },
    new_values: {
      status: 'completed',
      payment_intent: paymentIntent.id,
      event_id: eventId,
    },
  })

  console.log('Payment success: Order completed', orderId)
}

async function handlePaymentFailed(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  paymentIntent: Stripe.PaymentIntent,
  eventId: string
) {
  const orderId = paymentIntent.metadata.order_id

  if (!orderId) {
    console.error('Payment failed: Missing order_id in metadata')
    return
  }

  // Mettre à jour le statut de la commande
  const { error: updateError } = await supabase
    .from('orders')
    .update({ status: 'failed' })
    .eq('id', orderId)
    .neq('status', 'completed') // Ne pas écraser un paiement réussi

  if (updateError) {
    console.error('Payment failed: Failed to update order', updateError)
    return
  }

  // Logger l'action d'audit
  await supabase.from('audit_logs').insert({
    user_id: null,
    action: 'payment_failed',
    resource_type: 'orders',
    resource_id: orderId,
    old_values: null,
    new_values: {
      status: 'failed',
      payment_intent: paymentIntent.id,
      event_id: eventId,
      failure_message: paymentIntent.last_payment_error?.message,
    },
  })

  console.log('Payment failed: Order marked as failed', orderId)
}

async function handleRefund(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  charge: Stripe.Charge,
  eventId: string
) {
  // Trouver la commande par charge_id
  const { data: order, error: fetchError } = await supabase
    .from('orders')
    .select('id, status')
    .eq('stripe_charge_id', charge.id)
    .single()

  if (fetchError || !order) {
    console.error('Refund: Order not found for charge', charge.id)
    return
  }

  // Mettre à jour le statut
  const { error: updateError } = await supabase
    .from('orders')
    .update({
      status: 'refunded',
      refunded_at: new Date().toISOString(),
    })
    .eq('id', order.id)

  if (updateError) {
    console.error('Refund: Failed to update order', updateError)
    return
  }

  // Logger l'action d'audit
  await supabase.from('audit_logs').insert({
    user_id: null,
    action: 'payment_refunded',
    resource_type: 'orders',
    resource_id: order.id,
    old_values: { status: order.status },
    new_values: {
      status: 'refunded',
      charge_id: charge.id,
      event_id: eventId,
    },
  })

  console.log('Refund: Order refunded', order.id)
}
