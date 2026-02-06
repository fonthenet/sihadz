'use client'

import { useCallback, useEffect, useState } from 'react'
import { createBrowserClient } from '@/lib/supabase/client'

export type NotificationType =
  | 'appointment'
  | 'appointment_cancelled'
  | 'appointment_rescheduled'
  | 'prescription'
  | 'new_prescription'
  | 'prescription_sent'
  | 'prescription_ready'
  | 'prescription_collected'
  | 'prescription_dispensed'
  | 'prescription_partial'
  | 'prescription_unavailable'
  | 'prescription_declined'
  | 'prescription_fulfilled'
  | 'payment'
  | 'message'
  | 'review'
  | 'system'
  | 'reminder'
  | 'new_lab_request'
  | 'lab_request'
  | 'lab_request_created'
  | 'lab_results_ready'
  | 'lab_request_denied'
  | 'alert'
  | 'chat'
  | 'document_added'
  | 'file_added'
  | 'supplier_order'
  | 'supplier_invoice'

export interface NotificationItem {
  id: string
  type: NotificationType
  title: string
  title_ar?: string
  title_fr?: string
  message: string
  message_ar?: string
  message_fr?: string
  is_read: boolean
  action_url?: string
  action_label?: string
  metadata?: Record<string, unknown>
  created_at: string
  source: 'db' | 'chat' | 'appointment' | 'alert'
}

export interface UseNotificationsOptions {
  userId: string | null
  userType?: string
  /** Extra unread count from chat (threads unread sum) */
  chatUnreadCount?: number
  /** Extra count for professionals (e.g. low stock, lab requests) */
  extraAlertsCount?: number
}

export function useNotifications({
  userId,
  userType,
  chatUnreadCount = 0,
  extraAlertsCount = 0,
}: UseNotificationsOptions) {
  const [items, setItems] = useState<NotificationItem[]>([])
  const [loading, setLoading] = useState(true)

  const fetchNotifications = useCallback(async () => {
    if (!userId) {
      setItems([])
      setLoading(false)
      return
    }

    const supabase = createBrowserClient()

    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(30)

    if (error) {
      setItems([])
      setLoading(false)
      return
    }

    const dbItems: NotificationItem[] = (data || []).map((row: any) => ({
      id: row.id,
      type: row.type as NotificationType,
      title: row.title || '',
      title_ar: row.title_ar,
      title_fr: row.title_fr,
      message: row.message || '',
      message_ar: row.message_ar,
      message_fr: row.message_fr,
      is_read: !!row.is_read,
      action_url: row.action_url,
      action_label: row.action_label,
      metadata: row.metadata,
      created_at: row.created_at,
      source: 'db' as const,
    }))

    // Prepend synthetic chat notification if unread (action_url omitted so NotificationRow uses messagesHref based on userType)
    const synthetic: NotificationItem[] = []
    if (chatUnreadCount > 0) {
      synthetic.push({
        id: 'chat-unread',
        type: 'chat',
        title: 'New messages',
        title_ar: 'رسائل جديدة',
        title_fr: 'Nouveaux messages',
        message: `${chatUnreadCount} unread message${chatUnreadCount > 1 ? 's' : ''}`,
        message_ar: `${chatUnreadCount} رسالة غير مقروءة`,
        message_fr: `${chatUnreadCount} message${chatUnreadCount > 1 ? 's' : ''} non lu${chatUnreadCount > 1 ? 's' : ''}`,
        is_read: false,
        action_url: (userType && ['doctor', 'nurse', 'pharmacy', 'laboratory', 'clinic', 'ambulance', 'professional', 'pharma_supplier', 'equipment_supplier'].includes(userType))
          ? '/professional/dashboard/messages'
          : '/dashboard/messages',
        action_label: 'View',
        created_at: new Date().toISOString(),
        source: 'chat',
      })
    }

    if (extraAlertsCount > 0 && ['pharmacy', 'laboratory'].includes(userType || '')) {
      synthetic.push({
        id: 'alerts-extra',
        type: 'alert',
        title: 'Alerts',
        title_ar: 'تنبيهات',
        title_fr: 'Alertes',
        message: `${extraAlertsCount} item${extraAlertsCount > 1 ? 's' : ''} need attention`,
        message_ar: `${extraAlertsCount} عنصر يحتاج انتباه`,
        message_fr: `${extraAlertsCount} élément${extraAlertsCount > 1 ? 's' : ''} à traiter`,
        is_read: false,
        action_url: '/professional/dashboard',
        action_label: 'View',
        created_at: new Date().toISOString(),
        source: 'alert',
      })
    }

    setItems([...synthetic, ...dbItems])
    setLoading(false)
  }, [userId, chatUnreadCount, extraAlertsCount, userType])

  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  // Realtime: refresh when new notifications arrive
  useEffect(() => {
    if (!userId) return
    const supabase = createBrowserClient()
    const ch = supabase
      .channel('notifications-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` }, () => {
        fetchNotifications()
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` }, () => {
        fetchNotifications()
      })
      .subscribe()
    return () => {
      supabase.removeChannel(ch)
    }
  }, [userId, fetchNotifications])

  const markAsRead = useCallback(async (id: string) => {
    if (id.startsWith('chat-unread') || id.startsWith('alerts-extra')) {
      setItems((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)))
      return
    }

    const supabase = createBrowserClient()
    await supabase.from('notifications').update({ is_read: true }).eq('id', id)
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)))
  }, [])

  const markAllAsRead = useCallback(async () => {
    if (!userId) return
    const supabase = createBrowserClient()
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', userId)
    setItems((prev) => prev.map((n) => ({ ...n, is_read: true })))
  }, [userId])

  const unreadCount = items.filter((n) => !n.is_read).length

  return {
    items,
    loading,
    unreadCount,
    markAsRead,
    markAllAsRead,
    refresh: fetchNotifications,
  }
}
