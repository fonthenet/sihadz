/**
 * Shared appointment/ticket status display for patient dashboard.
 * Use everywhere we show visit/apt status: same labels, pharmacy name, "Doctor visit complete", accent colors.
 */

export type StatusLanguage = 'ar' | 'fr' | 'en'

/** Item shape: has status (appointment), ticket_status or rawData?.status (ticket), pharmacy_name or rawData?.metadata?.pharmacy_name */
export interface AppointmentStatusItem {
  status?: string
  ticket_status?: string
  pharmacy_name?: string | null
  rawData?: { status?: string; metadata?: { pharmacy_name?: string } }
}

/**
 * Human-readable status label. Includes pharmacy name for prescription states.
 */
export function getAppointmentStatusLabel(
  status: string | undefined,
  pharmacyName: string | null | undefined,
  language: StatusLanguage = 'en'
): string {
  if (!status) return '—'
  const name = pharmacyName || ''
  const ar = (s: string) => (language === 'ar' ? s : undefined)
  const fr = (s: string) => (language === 'fr' ? s : undefined)
  if (status === 'cancelled') return ar('ملغى') || fr('Annulé') || 'Cancelled'
  if (status === 'visit_completed') return ar('مكتمل') || fr('Terminé') || 'Complete'
  if (status === 'completed') return ar('مكتمل') || fr('Terminé') || 'Complete'
  if (status === 'prescription_sent' || status === 'sent')
    return name
      ? (ar(`وصفة أُرسلت إلى الصيدلية ${name}`) || fr(`Ordonnance envoyée à la pharmacie ${name}`) || `Prescription sent to pharmacy ${name}`)
      : (ar('وصفة أُرسلت للصيدلية') || fr('Ordonnance envoyée à la pharmacie') || 'Prescription sent to pharmacy')
  if (status === 'processing')
    return name
      ? (ar(`الوصفة قيد التحضير عند الصيدلية ${name}`) || fr(`Ordonnance en préparation à la pharmacie ${name}`) || `Prescription processing by pharmacy ${name}`)
      : (ar('الوصفة قيد التحضير عند الصيدلية') || fr('Ordonnance en préparation à la pharmacie') || 'Prescription processing by pharmacy')
  if (status === 'ready_for_pickup')
    return name
      ? (ar(`الوصفة جاهزة للاستلام عند الصيدلية ${name}`) || fr(`Ordonnance prête à retirer à la pharmacie ${name}`) || `Prescription ready to pick up at pharmacy ${name}`)
      : (ar('الوصفة جاهزة للاستلام') || fr('Ordonnance prête à retirer') || 'Prescription ready to pick up at pharmacy')
  const map: Record<string, string> = {
    created: ar('تم الإنشاء') || fr('Créé') || 'Created',
    pending: ar('قيد الانتظار') || fr('En attente') || 'Pending',
    confirmed: ar('مؤكد') || fr('Confirmé') || 'Confirmed',
    in_progress: ar('قيد المعالجة') || fr('En cours') || 'In progress',
  }
  return map[status] ?? status.replace(/_/g, ' ')
}

/**
 * Which status to show: appointment cancelled wins; else ticket status, else appointment status.
 */
export function getDisplayStatus(item: AppointmentStatusItem): string {
  const aptStatus = item.status
  const ticketStatus = item.ticket_status ?? item.rawData?.status
  if (aptStatus === 'cancelled') return 'cancelled'
  return ticketStatus || aptStatus || ''
}

/**
 * Resolve pharmacy name from item (appointment with ticket metadata or standalone ticket).
 */
export function getPharmacyName(item: AppointmentStatusItem): string | null | undefined {
  return item.pharmacy_name ?? item.rawData?.metadata?.pharmacy_name
}

/**
 * Show "Doctor visit complete" above the main badge when status is prescription-related or visit completed.
 */
export function showVisitCompleteAbove(item: AppointmentStatusItem, displayStatus: string): boolean {
  return ['prescription_sent', 'sent', 'processing', 'ready_for_pickup', 'completed', 'visit_completed'].includes(displayStatus)
}

/**
 * Tailwind classes for status badge. Delegates to platform-wide status colors.
 * Use getStatusBadgeClassName(displayStatus) or getStatusBadgeClassName(displayStatus, 'outline').
 */
export { getStatusBadgeClassName } from '@/lib/status-colors'
