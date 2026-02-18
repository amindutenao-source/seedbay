import { NextRequest } from 'next/server'
import { randomUUID } from 'crypto'
import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase-server'
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
import { buildRateLimitHeaders, checkRateLimit, getClientIp } from '@/lib/rate-limit'

// ============================================================================
// POST /api/orders/create-intent
// Créer une commande et un PaymentIntent Stripe
// ============================================================================

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
})

interface OrdersColumnSupport {
  user_id: boolean
  buyer_id: boolean
  seller_id: boolean
  amount_gross: boolean
  platform_fee: boolean
  seller_payout: boolean
  currency: boolean
  updated_at: boolean
  status_updated_at: boolean
}

const ORDER_COLUMN_CACHE_MS = 5 * 60 * 1000
let cachedOrdersColumns: OrdersColumnSupport | null = null
let cachedOrdersColumnsUntil = 0

function isMissingColumnError(error: { code?: string; message?: string; details?: string; hint?: string }, column: string): boolean {
  const text = `${error.message ?? ''} ${error.details ?? ''} ${error.hint ?? ''}`.toLowerCase()
  return (
    error.code === '42703' ||
    text.includes('does not exist') ||
    text.includes('schema cache') ||
    (text.includes(column.toLowerCase()) && text.includes('could not find'))
  )
}

async function hasOrdersColumn(supabaseAdmin: any, column: keyof OrdersColumnSupport): Promise<boolean> {
  const { error } = await supabaseAdmin.from('orders').select(column).limit(1)

  if (!error) {
    return true
  }

  if (isMissingColumnError(error, column)) {
    return false
  }

  console.error('Orders column probe failed:', column, error)
  return false
}

async function getOrdersColumns(supabaseAdmin: any): Promise<OrdersColumnSupport> {
  const now = Date.now()
  if (cachedOrdersColumns && now < cachedOrdersColumnsUntil) {
    return cachedOrdersColumns
  }

  const columns: OrdersColumnSupport = {
    user_id: await hasOrdersColumn(supabaseAdmin, 'user_id'),
    buyer_id: await hasOrdersColumn(supabaseAdmin, 'buyer_id'),
    seller_id: await hasOrdersColumn(supabaseAdmin, 'seller_id'),
    amount_gross: await hasOrdersColumn(supabaseAdmin, 'amount_gross'),
    platform_fee: await hasOrdersColumn(supabaseAdmin, 'platform_fee'),
    seller_payout: await hasOrdersColumn(supabaseAdmin, 'seller_payout'),
    currency: await hasOrdersColumn(supabaseAdmin, 'currency'),
    updated_at: await hasOrdersColumn(supabaseAdmin, 'updated_at'),
    status_updated_at: await hasOrdersColumn(supabaseAdmin, 'status_updated_at'),
  }

  cachedOrdersColumns = columns
  cachedOrdersColumnsUntil = now + ORDER_COLUMN_CACHE_MS
  return columns
}

export async function POST(request: NextRequest) {
  try {
    const clientIp = getClientIp(request)
    const ipRate = checkRateLimit(`order:ip:${clientIp}`, 30, 10 * 60 * 1000)
    if (!ipRate.allowed) {
      await logAudit(
        null,
        'rate_limited',
        'orders',
        null,
        null,
        { route: '/api/orders/create-intent', ip: clientIp },
        request
      )
      return new Response(
        JSON.stringify({ error: 'Too many requests, please try again later.' }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            ...buildRateLimitHeaders(ipRate),
          },
        }
      )
    }

    const authResult = await requireAuth(request)
    if (!authResult.success) {
      return unauthorizedResponse(authResult.error!)
    }
    const userId = authResult.user!.id

    const userRate = checkRateLimit(`order:user:${userId}`, 8, 10 * 60 * 1000)
    if (!userRate.allowed) {
      await logAudit(
        userId,
        'rate_limited',
        'orders',
        null,
        null,
        { route: '/api/orders/create-intent', ip: clientIp },
        request
      )
      return new Response(
        JSON.stringify({ error: 'Too many requests, please try again later.' }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            ...buildRateLimitHeaders(userRate),
          },
        }
      )
    }

    const emailResult = await requireEmailVerified(request)
    if (!emailResult.success) {
      return forbiddenResponse(emailResult.error!)
    }

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

    const supabase = await createSupabaseServerClient()
    const supabaseAdmin = createSupabaseAdminClient() as any
    const ordersColumns = await getOrdersColumns(supabaseAdmin)

    const buyerColumn = ordersColumns.user_id ? 'user_id' : ordersColumns.buyer_id ? 'buyer_id' : null
    if (!buyerColumn) {
      console.error('Orders table is missing both user_id and buyer_id columns')
      return serverErrorResponse('Configuration des commandes invalide')
    }

    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, slug, seller_id, price, title, status, currency')
      .eq('id', project_id)
      .eq('status', 'published')
      .single()

    if (projectError || !project) {
      return notFoundResponse('Projet non trouvé ou non disponible')
    }

    if (project.price <= 0) {
      return badRequestResponse('Projet invalide: prix incorrect')
    }

    const { data: existingPurchase, error: existingPurchaseError } = await supabaseAdmin
      .from('purchases')
      .select('id')
      .eq('project_id', project_id)
      .eq('user_id', userId)
      .maybeSingle()

    if (existingPurchaseError && existingPurchaseError.code !== 'PGRST116') {
      console.error('Purchase check error:', existingPurchaseError)
      return serverErrorResponse('Erreur lors de la vérification de l\'achat')
    }

    if (existingPurchase) {
      return badRequestResponse('Vous avez déjà acheté ce projet')
    }

    const existingOrderQuery = supabaseAdmin
      .from('orders')
      .select('id, status')
      .eq('project_id', project_id)
      .in('status', ['pending', 'paid'])

    const { data: existingOrder, error: existingOrderError } = await (
      buyerColumn === 'user_id'
        ? existingOrderQuery.eq('user_id', userId).maybeSingle()
        : existingOrderQuery.eq('buyer_id', userId).maybeSingle()
    )

    if (existingOrderError && existingOrderError.code !== 'PGRST116') {
      console.error('Existing order check error:', existingOrderError)
      return serverErrorResponse('Erreur lors de la vérification de la commande')
    }

    if (existingOrder) {
      return badRequestResponse('Une commande est déjà en cours pour ce projet')
    }

    if (project.seller_id === userId) {
      return badRequestResponse('Vous ne pouvez pas acheter votre propre projet')
    }

    const amount = Number(project.price.toFixed(2))
    const platformFee = Number((amount * 0.15).toFixed(2))
    const sellerPayout = Number((amount - platformFee).toFixed(2))
    const currency = project.currency || 'USD'
    const nowIso = new Date().toISOString()

    const pendingPaymentIntentId = `pending_${randomUUID()}`

    const orderInsert: Record<string, string | number> = {
      project_id,
      amount,
      stripe_payment_intent_id: pendingPaymentIntentId,
      status: 'pending',
    }

    if (ordersColumns.user_id) orderInsert.user_id = userId
    if (ordersColumns.buyer_id) orderInsert.buyer_id = userId
    if (ordersColumns.seller_id) orderInsert.seller_id = project.seller_id
    if (ordersColumns.currency) orderInsert.currency = currency
    if (ordersColumns.amount_gross) orderInsert.amount_gross = amount
    if (ordersColumns.platform_fee) orderInsert.platform_fee = platformFee
    if (ordersColumns.seller_payout) orderInsert.seller_payout = sellerPayout
    if (ordersColumns.updated_at) orderInsert.updated_at = nowIso
    if (ordersColumns.status_updated_at) orderInsert.status_updated_at = nowIso

    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .insert(orderInsert)
      .select('id')
      .single()

    if (orderError || !order) {
      console.error('Order creation error:', { orderError, orderInsert, ordersColumns })

      if ((orderError as { code?: string })?.code === '23505') {
        return badRequestResponse('Une commande existe déjà pour ce projet')
      }

      if ((orderError as { code?: string })?.code === '42501') {
        return forbiddenResponse('Action non autorisée')
      }

      return serverErrorResponse('Erreur lors de la création de la commande')
    }

    let paymentIntent: Stripe.PaymentIntent
    try {
      paymentIntent = await stripe.paymentIntents.create(
        {
          amount: Math.round(amount * 100),
          currency: currency.toLowerCase(),
          description: `SeedBay: ${project.title}`,
          metadata: {
            order_id: order.id,
            project_id,
            user_id: userId,
          },
        } as Stripe.PaymentIntentCreateParams,
        {
          idempotencyKey: `order-${order.id}`,
        }
      )
    } catch (stripeError) {
      console.error('Stripe error:', stripeError)
      await supabaseAdmin.from('orders').delete().eq('id', order.id)
      return serverErrorResponse('Erreur lors de la création du paiement')
    }

    const orderUpdate: Record<string, string> = {
      stripe_payment_intent_id: paymentIntent.id,
    }
    if (ordersColumns.updated_at) {
      orderUpdate.updated_at = new Date().toISOString()
    }

    const { error: updateError } = await supabaseAdmin
      .from('orders')
      .update(orderUpdate)
      .eq('id', order.id)

    if (updateError) {
      console.error('Order update error:', updateError)
      await stripe.paymentIntents.cancel(paymentIntent.id)
      await supabaseAdmin.from('orders').delete().eq('id', order.id)
      return serverErrorResponse('Erreur lors de la mise à jour de la commande')
    }

    await logAudit(
      userId,
      'create_order',
      'orders',
      order.id,
      null,
      {
        project_id,
        amount,
        payment_intent: paymentIntent.id,
      },
      request
    )

    return successResponse(
      {
        order_id: order.id,
        project_id,
        project_slug: project.slug,
        project_title: project.title,
        amount,
        currency,
        client_secret: paymentIntent.client_secret,
      },
      201
    )
  } catch (error) {
    console.error('Create order error:', error)
    return serverErrorResponse('Erreur serveur')
  }
}
