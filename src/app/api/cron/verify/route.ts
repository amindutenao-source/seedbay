import { NextRequest, NextResponse } from 'next/server'
import * as Sentry from '@sentry/nextjs'
import { createSupabaseAdminClient } from '@/lib/supabase-server'

function normalizeSecret(value: string | null | undefined) {
  if (!value) return ''
  const trimmed = value.trim()
  const unquoted = (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) ? trimmed.slice(1, -1) : trimmed

  return unquoted
    .replace(/\\n/g, '')
    .replace(/\r?\n/g, '')
    .trim()
}

const CRON_SECRET = normalizeSecret(process.env.CRON_SECRET)

function isAuthorized(request: NextRequest) {
  const authHeader = request.headers.get('authorization') || ''
  const token = authHeader.startsWith('Bearer ')
    ? normalizeSecret(authHeader.replace('Bearer ', ''))
    : null
  const headerSecret = normalizeSecret(request.headers.get('x-cron-secret'))
  const url = new URL(request.url)
  const querySecret = normalizeSecret(url.searchParams.get('secret'))
  const provided = token || headerSecret || querySecret
  return Boolean(CRON_SECRET && provided && provided === CRON_SECRET)
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const lookbackDays = Number(process.env.CRON_LOOKBACK_DAYS || 7)
  const lookbackIso = new Date(Date.now() - lookbackDays * 86400000).toISOString()
  const supabase = createSupabaseAdminClient()

  try {
    const { data: paidOrders, error: paidOrdersError } = await supabase
      .from('orders')
      .select('id, user_id, project_id')
      .eq('status', 'paid')
      .gte('created_at', lookbackIso)

    if (paidOrdersError) {
      throw paidOrdersError
    }

    const paidOrderIds = (paidOrders || []).map((order) => order.id)

    let missingPurchases = [] as string[]
    if (paidOrderIds.length > 0) {
      const { data: purchases, error: purchasesError } = await supabase
        .from('purchases')
        .select('order_id')
        .in('order_id', paidOrderIds)

      if (purchasesError) {
        throw purchasesError
      }

      const purchaseOrderIds = new Set((purchases || []).map((p) => p.order_id))
      missingPurchases = paidOrderIds.filter((id) => !purchaseOrderIds.has(id))
    }

    const { data: purchasesWithOrders, error: purchaseOrderError } = await supabase
      .from('purchases')
      .select('id, order_id, order:orders(status)')
      .gte('created_at', lookbackIso)

    if (purchaseOrderError) {
      throw purchaseOrderError
    }

    const purchasesNotPaid = (purchasesWithOrders || [])
      .filter((row) => row.order && row.order.status !== 'paid')
      .map((row) => row.id)

    const { data: deliverables, error: deliverablesError } = await supabase
      .from('deliverables')
      .select('id, order_id, order:orders(status)')
      .gte('delivered_at', lookbackIso)

    if (deliverablesError) {
      throw deliverablesError
    }

    const deliverablesNotPaid = (deliverables || [])
      .filter((row) => row.order && row.order.status !== 'paid')
      .map((row) => row.id)

    const { data: pendingEvents, error: pendingEventsError } = await supabase
      .from('stripe_events')
      .select('event_id, created_at')
      .eq('status', 'received')
      .lt('created_at', new Date(Date.now() - 15 * 60 * 1000).toISOString())
      .limit(200)

    if (pendingEventsError) {
      throw pendingEventsError
    }

    const result = {
      lookback_days: lookbackDays,
      paid_orders_missing_purchases: missingPurchases,
      purchases_without_paid_order: purchasesNotPaid,
      deliverables_without_paid_order: deliverablesNotPaid,
      pending_stripe_events: (pendingEvents || []).map((row) => row.event_id),
      counts: {
        paid_orders_missing_purchases: missingPurchases.length,
        purchases_without_paid_order: purchasesNotPaid.length,
        deliverables_without_paid_order: deliverablesNotPaid.length,
        pending_stripe_events: pendingEvents?.length || 0,
      },
    }

    await supabase.from('audit_logs').insert({
      user_id: null,
      action: 'cron_integrity_check',
      resource_type: 'system',
      resource_id: null,
      old_values: null,
      new_values: result,
    })

    if (
      result.counts.paid_orders_missing_purchases > 0 ||
      result.counts.purchases_without_paid_order > 0 ||
      result.counts.deliverables_without_paid_order > 0 ||
      result.counts.pending_stripe_events > 0
    ) {
      Sentry.captureMessage('Seedbay integrity check detected issues', {
        level: 'warning',
        extra: result,
      })
    }

    return NextResponse.json({ status: 'ok', ...result })
  } catch (error) {
    Sentry.captureException(error)
    return NextResponse.json({ status: 'error', message: 'Cron failed' }, { status: 500 })
  }
}
