import { NextRequest } from 'next/server'
import { z } from 'zod'
import { createSupabaseAdminClient, createSupabaseServerClient } from '@/lib/supabase-server'

export const downloadRequestSchema = z.object({
  deliverable_id: z.string().uuid(),
  order_id: z.string().uuid().optional(),
})

type DownloadResult = {
  status: number
  body: Record<string, unknown>
}

export async function resolveDownload(
  request: NextRequest,
  deliverableId: string,
  orderId?: string
): Promise<DownloadResult> {
  const supabase = await createSupabaseServerClient()
  const supabaseAdmin = createSupabaseAdminClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return {
      status: 401,
      body: { error: 'Authentication required' },
    }
  }

  const { data: deliverable, error: deliverableError } = await supabase
    .from('deliverables')
    .select(`
      id,
      order_id,
      url,
      delivered_at
    `)
    .eq('id', deliverableId)
    .single()

  if (deliverableError || !deliverable) {
    return {
      status: 403,
      body: { error: 'Access denied' },
    }
  }

  if (orderId && deliverable.order_id !== orderId) {
    return {
      status: 400,
      body: { error: 'Order mismatch' },
    }
  }

  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select(`
      id,
      user_id,
      project:projects!project_id (
        id,
        status,
        seller_id
      )
    `)
    .eq('id', deliverable.order_id)
    .single()

  if (orderError || !order) {
    return {
      status: 404,
      body: { error: 'Order not found' },
    }
  }

  if (order.user_id !== user.id) {
    return {
      status: 403,
      body: { error: 'Access denied' },
    }
  }

  if (order.project?.status === 'archived') {
    return {
      status: 403,
      body: { error: 'Project archived' },
    }
  }

  if (order.project?.seller_id === user.id) {
    return {
      status: 403,
      body: { error: 'Owners cannot download their own deliverables.' },
    }
  }

  const { data: purchase } = await supabase
    .from('purchases')
    .select('id, order_id')
    .eq('user_id', user.id)
    .eq('order_id', deliverable.order_id)
    .single()

  if (!purchase) {
    return {
      status: 403,
      body: { error: 'Access denied. You must purchase this project first.' },
    }
  }

  const bucket = 'project-files'
  const objectPath = normalizeStoragePath(deliverable.url, bucket)
  if (!objectPath) {
    return {
      status: 500,
      body: { error: 'Invalid deliverable URL' },
    }
  }

  const { data: signedUrl, error: signError } = await supabaseAdmin
    .storage
    .from(bucket)
    .createSignedUrl(objectPath, 60)

  if (signError || !signedUrl) {
    console.error('Error creating signed URL:', signError)
    return {
      status: 500,
      body: { error: 'Failed to generate download URL' },
    }
  }

  await supabase
    .from('downloads')
    .insert({
      order_id: purchase.order_id,
      deliverable_id: deliverable.id,
      download_ip: request.headers.get('x-forwarded-for') || null,
      download_user_agent: request.headers.get('user-agent') || null,
    })

  const fallbackName = objectPath.split('/').pop() || 'download'

  return {
    status: 200,
    body: {
      download_url: signedUrl.signedUrl,
      file_name: fallbackName,
      file_size: null,
      expires_in: 60,
    },
  }
}

function normalizeStoragePath(urlOrPath: string, bucket: string): string | null {
  if (!urlOrPath) return null
  if (!urlOrPath.includes('://')) {
    return urlOrPath.replace(/^\/+/, '')
  }
  try {
    const u = new URL(urlOrPath)
    const parts = u.pathname.split('/').filter(Boolean)
    const objectIdx = parts.findIndex((p) => p === 'object')
    if (objectIdx === -1) return null
    const after = parts.slice(objectIdx + 1)
    // /object/public/<bucket>/<path> or /object/sign/<bucket>/<path>
    let bucketIdx = 0
    if (after[0] === bucket) {
      bucketIdx = 0
    } else if (after[1] === bucket) {
      bucketIdx = 1
    } else {
      return null
    }
    const path = after.slice(bucketIdx + 1).join('/')
    return path || null
  } catch {
    return null
  }
}
