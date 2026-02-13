export const PROJECT_STATUSES = [
  'draft',
  'pending_review',
  'published',
  'rejected',
  'archived',
] as const

export type ProjectStatus = (typeof PROJECT_STATUSES)[number]

export const ORDER_STATUSES = ['pending', 'paid', 'failed', 'refunded'] as const
export type OrderStatus = (typeof ORDER_STATUSES)[number]

export const isProjectStatus = (value: string | null): value is ProjectStatus =>
  !!value && PROJECT_STATUSES.includes(value as ProjectStatus)

export const isOrderStatus = (value: string | null): value is OrderStatus =>
  !!value && ORDER_STATUSES.includes(value as OrderStatus)
