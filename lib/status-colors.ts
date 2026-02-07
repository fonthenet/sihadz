/**
 * Platform-wide status color map.
 * Use this for ALL status badges across the app — prescriptions, lab, tickets, orders, appointments, etc.
 * Applies to all users, all accounts, all dashboards (old, new, future).
 *
 * Semantic mapping (common practices):
 * - Created/Draft: slate (neutral, new)
 * - Pending/Waiting: amber (attention needed)
 * - Sent/Submitted: blue (transmitted)
 * - Processing: indigo (in progress)
 * - Accepted/Confirmed: teal (affirmed)
 * - Ready: cyan (almost done)
 * - Completed: emerald (success)
 * - Declined/Rejected: rose (negative)
 */

export type StatusColorVariant = 'solid' | 'outline'

/** Solid badges: bg-{color}-500 text-white. Use for prominent status. */
export const STATUS_COLOR_SOLID: Record<string, string> = {
  // Created / Draft
  created: 'bg-slate-500 text-white',
  draft: 'bg-slate-500 text-white',
  active: 'bg-slate-500 text-white',

  // Pending / Waiting
  pending: 'bg-amber-500 text-white',
  waiting: 'bg-amber-500 text-white',
  waiting_approval: 'bg-amber-500 text-white',
  pending_approval: 'bg-amber-500 text-white',
  pending_buyer_review: 'bg-amber-500 text-white',

  // Sent / Submitted
  sent: 'bg-blue-500 text-white',
  submitted: 'bg-blue-500 text-white',
  sent_to_pharmacy: 'bg-blue-500 text-white',
  sent_to_lab: 'bg-blue-500 text-white',
  received: 'bg-blue-500 text-white',

  // Processing / In progress
  processing: 'bg-indigo-500 text-white',
  in_progress: 'bg-indigo-500 text-white',
  sample_collected: 'bg-indigo-500 text-white',
  paid: 'bg-indigo-500 text-white',

  // Accepted / Confirmed
  accepted: 'bg-teal-500 text-white',
  confirmed: 'bg-teal-500 text-white',

  // Ready
  ready: 'bg-cyan-500 text-white',
  ready_for_pickup: 'bg-cyan-500 text-white',

  // Completed / Success
  completed: 'bg-emerald-500 text-white',
  fulfilled: 'bg-emerald-500 text-white',
  collected: 'bg-emerald-500 text-white',
  dispensed: 'bg-emerald-500 text-white',
  picked_up: 'bg-emerald-500 text-white',
  delivered: 'bg-emerald-500 text-white',
  shipped: 'bg-emerald-500 text-white',
  visit_completed: 'bg-emerald-500 text-white',
  prescription_sent: 'bg-emerald-500 text-white',

  // Declined / Rejected / Cancelled
  declined: 'bg-rose-500 text-white',
  rejected: 'bg-rose-500 text-white',
  cancelled: 'bg-rose-500 text-white',
  denied: 'bg-rose-500 text-white',
  no_show: 'bg-rose-500 text-white',

  // Supplier order item states
  substitution_offered: 'bg-amber-500 text-white',
  substitution_accepted: 'bg-teal-500 text-white',
  substitution_rejected: 'bg-rose-500 text-white',
  quantity_adjusted: 'bg-blue-500 text-white',
  price_adjusted: 'bg-blue-500 text-white',

  // Document states
  verified: 'bg-emerald-500 text-white',
  uploaded: 'bg-blue-500 text-white',
  expired: 'bg-rose-500 text-white',

  // Ticket states
  deposit_paid: 'bg-blue-500 text-white',

  // Store/order states
  preparing: 'bg-indigo-500 text-white',

  // Supplier/link states
  suspended: 'bg-amber-500 text-white',
  partial: 'bg-amber-500 text-white',
  overdue: 'bg-rose-500 text-white',
  offline: 'bg-slate-500 text-white',
  disputed: 'bg-amber-500 text-white',

  // Inventory/alert severities
  critical: 'bg-rose-500 text-white',
  low: 'bg-amber-500 text-white',
  ok: 'bg-emerald-500 text-white',
  excess: 'bg-blue-500 text-white',
  out_of_stock: 'bg-rose-500 text-white',
  warning: 'bg-amber-500 text-white',

  // Equipment states
  operational: 'bg-emerald-500 text-white',
  maintenance: 'bg-amber-500 text-white',
  repair: 'bg-rose-500 text-white',
  calibration: 'bg-blue-500 text-white',

  // AI / Generated
  ai: 'bg-violet-500 text-white',
}


/** Outline badges: bg-{color}-500/10 text-{color}-600 border-{color}-500/30. Use for subtle status. */
export const STATUS_COLOR_OUTLINE: Record<string, string> = {
  created: 'bg-slate-500/10 text-slate-600 border-slate-500/30 dark:bg-slate-500/20 dark:text-slate-400 dark:border-slate-500/40',
  draft: 'bg-slate-500/10 text-slate-600 border-slate-500/30',
  active: 'bg-slate-500/10 text-slate-600 border-slate-500/30',

  pending: 'bg-amber-500/10 text-amber-600 border-amber-500/30 dark:bg-amber-500/20 dark:text-amber-400 dark:border-amber-500/40',
  waiting: 'bg-amber-500/10 text-amber-600 border-amber-500/30',
  waiting_approval: 'bg-amber-500/10 text-amber-600 border-amber-500/30',
  pending_approval: 'bg-amber-500/10 text-amber-600 border-amber-500/30',

  sent: 'bg-blue-500/10 text-blue-600 border-blue-500/30 dark:bg-blue-500/20 dark:text-blue-400 dark:border-blue-500/40',
  submitted: 'bg-blue-500/10 text-blue-600 border-blue-500/30',
  sent_to_pharmacy: 'bg-blue-500/10 text-blue-600 border-blue-500/30',
  sent_to_lab: 'bg-blue-500/10 text-blue-600 border-blue-500/30',
  received: 'bg-blue-500/10 text-blue-600 border-blue-500/30',

  processing: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/30 dark:bg-indigo-500/20 dark:text-indigo-400 dark:border-indigo-500/40',
  in_progress: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/30',
  sample_collected: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/30',

  accepted: 'bg-teal-500/10 text-teal-600 border-teal-500/30',
  confirmed: 'bg-teal-500/10 text-teal-600 border-teal-500/30',

  ready: 'bg-cyan-500/10 text-cyan-600 border-cyan-500/30',
  ready_for_pickup: 'bg-cyan-500/10 text-cyan-600 border-cyan-500/30',

  completed: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30 dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/40',
  fulfilled: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30',
  collected: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30',
  dispensed: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30',
  picked_up: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30',
  delivered: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30',
  shipped: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30',
  visit_completed: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30',
  prescription_sent: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30',

  declined: 'bg-rose-500/10 text-rose-600 border-rose-500/30 dark:bg-rose-500/20 dark:text-rose-400 dark:border-rose-500/40',
  rejected: 'bg-rose-500/10 text-rose-600 border-rose-500/30',
  cancelled: 'bg-rose-500/10 text-rose-600 border-rose-500/30',
  denied: 'bg-rose-500/10 text-rose-600 border-rose-500/30',
  no_show: 'bg-rose-500/10 text-rose-600 border-rose-500/30',

  substitution_offered: 'bg-amber-500/10 text-amber-600 border-amber-500/30',
  substitution_accepted: 'bg-teal-500/10 text-teal-600 border-teal-500/30',
  substitution_rejected: 'bg-rose-500/10 text-rose-600 border-rose-500/30',
  quantity_adjusted: 'bg-blue-500/10 text-blue-600 border-blue-500/30',
  price_adjusted: 'bg-blue-500/10 text-blue-600 border-blue-500/30',

  verified: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30',
  uploaded: 'bg-blue-500/10 text-blue-600 border-blue-500/30',
  expired: 'bg-rose-500/10 text-rose-600 border-rose-500/30',

  deposit_paid: 'bg-blue-500/10 text-blue-600 border-blue-500/30',

  preparing: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/30',
  suspended: 'bg-amber-500/10 text-amber-600 border-amber-500/30',
  partial: 'bg-amber-500/10 text-amber-600 border-amber-500/30',
  overdue: 'bg-rose-500/10 text-rose-600 border-rose-500/30',
  offline: 'bg-slate-500/10 text-slate-600 border-slate-500/30',
  disputed: 'bg-amber-500/10 text-amber-600 border-amber-500/30',
  critical: 'bg-rose-500/10 text-rose-600 border-rose-500/30',
  low: 'bg-amber-500/10 text-amber-600 border-amber-500/30',
  ok: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30',
  excess: 'bg-blue-500/10 text-blue-600 border-blue-500/30',
  out_of_stock: 'bg-rose-500/10 text-rose-600 border-rose-500/30',
  warning: 'bg-amber-500/10 text-amber-600 border-amber-500/30',
  operational: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30',
  maintenance: 'bg-amber-500/10 text-amber-600 border-amber-500/30',
  repair: 'bg-rose-500/10 text-rose-600 border-rose-500/30',
  calibration: 'bg-blue-500/10 text-blue-600 border-blue-500/30',

  ai: 'bg-violet-500/10 text-violet-600 border-violet-500/30 dark:bg-violet-500/20 dark:text-violet-400 dark:border-violet-500/40',
}

/**
 * Get status badge className. Normalizes status to lowercase. Uses outline variant by default.
 */
export function getStatusBadgeClassName(
  status: string | undefined,
  variant: StatusColorVariant = 'solid'
): string {
  if (!status) return 'bg-slate-500 text-white'
  const key = status.toLowerCase().replace(/-/g, '_')
  const map = variant === 'outline' ? STATUS_COLOR_OUTLINE : STATUS_COLOR_SOLID
  return map[key] ?? 'bg-slate-500 text-white'
}
