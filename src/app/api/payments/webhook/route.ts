import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase-server'
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

    // ÉTAPE 3.5: Idempotence webhook (éviter double traitement)
    const { error: eventInsertError } = await supabase
      .from('stripe_events')
      .insert({
        event_id: event.id,
        event_type: event.type,
        payload: event as unknown as Record<string, unknown>,
        status: 'received',
      })

    if (eventInsertError) {
      // 23505 = duplicate key
      if ((eventInsertError as { code?: string }).code === '23505') {
        console.log(`Webhook duplicate ignored: ${event.id}`)
        return NextResponse.json({ received: true })
      }
      console.error('Webhook event log error:', eventInsertError)
      return NextResponse.json(
        { error: 'Webhook event log failed' },
        { status: 500 }
      )
    }

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
    await supabase
      .from('stripe_events')
      .update({ status: 'processed', processed_at: new Date().toISOString() })
      .eq('event_id', event.id)

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
  if (!orderId) {
    console.error('Payment success: Missing order_id in metadata')
    return
  }

  // Récupérer la commande
  const { data: order, error: fetchError } = await supabase
    .from('orders')
    .select('id, status, amount, user_id, project_id, stripe_payment_intent_id, currency')
    .eq('id', orderId)
    .single()

  if (fetchError || !order) {
    console.error('Payment success: Order not found', orderId)
    return
  }

  // ⚠️ IDEMPOTENCY: Si déjà complété, ne rien faire
  if (order.status === 'paid') {
    console.log('Payment success: Order already paid', orderId)
    return
  }

  if (order.stripe_payment_intent_id !== paymentIntent.id) {
    console.error(
      'Payment success: PaymentIntent mismatch',
      orderId,
      paymentIntent.id
    )
    await supabase.from('audit_logs').insert({
      user_id: null,
      action: 'payment_intent_mismatch',
      resource_type: 'orders',
      resource_id: orderId,
      old_values: { payment_intent: order.stripe_payment_intent_id },
      new_values: { received: paymentIntent.id },
    })
    return
  }

  if (
    order.currency &&
    paymentIntent.currency &&
    order.currency.toLowerCase() !== paymentIntent.currency.toLowerCase()
  ) {
    console.error(
      'Payment success: Currency mismatch',
      orderId,
      order.currency,
      paymentIntent.currency
    )
    await supabase.from('audit_logs').insert({
      user_id: null,
      action: 'payment_currency_mismatch',
      resource_type: 'orders',
      resource_id: orderId,
      old_values: { currency: order.currency },
      new_values: { received: paymentIntent.currency },
    })
    return
  }

  // ⚠️ CRITICAL: Vérifier que le montant correspond
  const expectedAmount = Math.round(order.amount * 100)
  const receivedAmount = paymentIntent.amount_received ?? paymentIntent.amount
  if (receivedAmount !== expectedAmount) {
    console.error(
      `Payment success: Amount mismatch. Expected ${expectedAmount}, got ${receivedAmount}`,
      orderId
    )
    // Logger l'anomalie mais ne pas bloquer (pourrait être un problème de devise)
    await supabase.from('audit_logs').insert({
      user_id: null,
      action: 'payment_amount_mismatch',
      resource_type: 'orders',
      resource_id: orderId,
      old_values: { expected: expectedAmount },
      new_values: { received: receivedAmount },
    })
  }

  // Mettre à jour le statut de la commande
  const { error: updateError } = await supabase
    .from('orders')
    .update({
      status: 'paid',
      stripe_charge_id: paymentIntent.latest_charge as string,
      updated_at: new Date().toISOString(),
    })
    .eq('id', orderId)

  if (updateError) {
    console.error('Payment success: Failed to update order', updateError)
    return
  }

  // Créer l'accès achat (source de vérité)
  const { error: purchaseError } = await supabase
    .from('purchases')
    .upsert(
      {
        user_id: order.user_id,
        project_id: order.project_id,
        order_id: order.id,
      },
      {
        onConflict: 'user_id,project_id',
      }
    )

  if (purchaseError) {
    console.error('Payment success: Failed to create purchase', purchaseError)
  }

  // Logger l'action d'audit
  await supabase.from('audit_logs').insert({
    user_id: null, // Webhook, pas d'utilisateur direct
    action: 'payment_completed',
    resource_type: 'orders',
    resource_id: orderId,
    old_values: { status: order.status },
    new_values: {
      status: 'paid',
      payment_intent: paymentIntent.id,
      event_id: eventId,
    },
  })

  console.log('Payment success: Order paid', orderId)
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
    .update({ status: 'failed', updated_at: new Date().toISOString() })
    .eq('id', orderId)
    .neq('status', 'paid') // Ne pas écraser un paiement réussi

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
  const paymentIntentId = typeof charge.payment_intent === 'string'
    ? charge.payment_intent
    : charge.payment_intent?.id

  if (!paymentIntentId) {
    console.error('Refund: Missing payment_intent on charge', charge.id)
    return
  }

  // Trouver la commande par payment_intent
  const { data: order, error: fetchError } = await supabase
    .from('orders')
    .select('id, status, user_id, project_id')
    .eq('stripe_payment_intent_id', paymentIntentId)
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
      updated_at: new Date().toISOString(),
    })
    .eq('id', order.id)

  if (updateError) {
    console.error('Refund: Failed to update order', updateError)
    return
  }

  // Retirer l'accès achat (source de vérité)
  const { error: revokeError } = await supabase
    .from('purchases')
    .delete()
    .eq('order_id', order.id)

  if (revokeError) {
    console.error('Refund: Failed to revoke purchase', revokeError)
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
      payment_intent: paymentIntentId,
      event_id: eventId,
    },
  })

  console.log('Refund: Order refunded', order.id)
}
