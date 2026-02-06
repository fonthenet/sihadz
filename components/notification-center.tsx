'use client'

import { useCallback, useEffect } from 'react'
import Link from 'next/link'
import {
  Bell,
  Calendar,
  FileText,
  CreditCard,
  MessageSquare,
  Clock,
  Info,
  AlertCircle,
  FlaskConical,
  ChevronRight,
  CheckCheck,
  ShoppingCart,
} from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/page-loading'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useLanguage } from '@/lib/i18n/language-context'
import { useNotifications, type NotificationItem, type NotificationType } from '@/hooks/use-notifications'
import { useChatUnreadCount } from '@/hooks/use-chat-unread-count'
import { cn } from '@/lib/utils'

function getIcon(type: NotificationType) {
  switch (type) {
    case 'appointment':
    case 'appointment_rescheduled':
      return <Calendar className="h-4 w-4 text-primary shrink-0" />
    case 'appointment_cancelled':
      return <Calendar className="h-4 w-4 text-red-600 shrink-0" />
    case 'prescription':
    case 'new_prescription':
    case 'prescription_sent':
    case 'prescription_ready':
    case 'prescription_collected':
    case 'prescription_dispensed':
    case 'prescription_partial':
    case 'prescription_unavailable':
    case 'prescription_declined':
    case 'prescription_fulfilled':
      return <FileText className="h-4 w-4 text-green-600 shrink-0" />
    case 'payment':
      return <CreditCard className="h-4 w-4 text-blue-600 shrink-0" />
    case 'message':
    case 'chat':
      return <MessageSquare className="h-4 w-4 text-teal-600 shrink-0" />
    case 'review':
      return <MessageSquare className="h-4 w-4 text-amber-600 shrink-0" />
    case 'reminder':
      return <Clock className="h-4 w-4 text-orange-600 shrink-0" />
    case 'new_lab_request':
    case 'lab_request_created':
      return <FlaskConical className="h-4 w-4 text-violet-600 shrink-0" />
    case 'lab_results_ready':
      return <FlaskConical className="h-4 w-4 text-emerald-600 shrink-0" />
    case 'lab_request_denied':
      return <FlaskConical className="h-4 w-4 text-red-600 shrink-0" />
    case 'document_added':
    case 'file_added':
      return <FileText className="h-4 w-4 text-sky-600 shrink-0" />
    case 'supplier_order':
    case 'supplier_invoice':
      return <ShoppingCart className="h-4 w-4 text-amber-600 shrink-0" />
    case 'alert':
      return <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
    case 'system':
    default:
      return <Info className="h-4 w-4 text-muted-foreground shrink-0" />
  }
}

function getTitle(n: NotificationItem, language: string) {
  if (language === 'ar' && n.title_ar) return n.title_ar
  if (language === 'fr' && n.title_fr) return n.title_fr
  return n.title
}

function getMessage(n: NotificationItem, language: string) {
  if (language === 'ar' && n.message_ar) return n.message_ar
  if (language === 'fr' && n.message_fr) return n.message_fr
  return n.message
}

function formatTime(dateStr: string, language: string) {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return language === 'ar' ? 'الآن' : language === 'fr' ? "À l'instant" : 'Just now'
  if (diffMins < 60) return language === 'ar' ? `منذ ${diffMins} د` : language === 'fr' ? `Il y a ${diffMins} min` : `${diffMins}m ago`
  if (diffHours < 24) return language === 'ar' ? `منذ ${diffHours} س` : language === 'fr' ? `Il y a ${diffHours}h` : `${diffHours}h ago`
  return language === 'ar' ? `منذ ${diffDays} ي` : language === 'fr' ? `Il y a ${diffDays}j` : `${diffDays}d ago`
}

export interface NotificationCenterProps {
  userId: string | null
  userType?: string
  /** Override chat unread (e.g. from dashboard context) */
  chatUnreadCount?: number
  /** Extra alerts for professionals (low stock, lab requests, etc.) */
  extraAlertsCount?: number
  className?: string
  /** Use compact trigger (icon only, no text) */
  compact?: boolean
}

export function NotificationCenter({
  userId,
  userType,
  chatUnreadCount: chatUnreadOverride,
  extraAlertsCount = 0,
  className,
  compact = true,
}: NotificationCenterProps) {
  const { language, dir } = useLanguage()
  const { count: chatUnreadFromApi } = useChatUnreadCount(userId)
  const chatUnread = chatUnreadOverride ?? chatUnreadFromApi

  const {
    items,
    loading,
    unreadCount,
    markAsRead,
    markAllAsRead,
    refresh,
  } = useNotifications({
    userId,
    userType,
    chatUnreadCount: chatUnread,
    extraAlertsCount,
  })

  const totalBadge = unreadCount
  const messagesHref = userType && ['doctor', 'nurse', 'pharmacy', 'laboratory', 'clinic', 'ambulance', 'professional', 'pharma_supplier', 'equipment_supplier'].includes(userType)
    ? '/professional/dashboard/messages'
    : '/dashboard/messages'

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className={cn('relative bg-transparent', compact && 'size-9', className)}
          title={language === 'ar' ? 'الإشعارات' : language === 'fr' ? 'Notifications' : 'Notifications'}
        >
          <Bell className="h-5 w-5" />
          {totalBadge > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 min-w-5 bg-red-500 rounded-full text-[10px] text-white flex items-center justify-center font-medium px-1">
              {totalBadge > 99 ? '99+' : totalBadge}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align={dir === 'rtl' ? 'end' : 'start'}
        className={cn('w-[360px] sm:w-[400px] p-0', dir === 'rtl' && 'text-right')}
      >
        <div className="border-b px-4 py-3 flex items-center justify-between">
          <h3 className="font-semibold text-sm">
            {language === 'ar' ? 'الإشعارات' : language === 'fr' ? 'Notifications' : 'Notifications'}
          </h3>
          {totalBadge > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs"
              onClick={() => markAllAsRead()}
            >
              <CheckCheck className="h-3.5 w-3.5 me-1" />
              {language === 'ar' ? 'قراءة الكل' : language === 'fr' ? 'Tout lire' : 'Mark all read'}
            </Button>
          )}
        </div>

        <ScrollArea className="h-[320px]">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <LoadingSpinner size="lg" className="text-muted-foreground" />
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <Bell className="h-10 w-10 text-muted-foreground mb-3" />
              <p className="text-sm font-medium text-foreground">
                {language === 'ar' ? 'لا توجد إشعارات' : language === 'fr' ? 'Aucune notification' : 'No notifications'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {language === 'ar' ? 'ستظهر الإشعارات الجديدة هنا' : language === 'fr' ? 'Les nouvelles notifications apparaîtront ici' : 'New notifications will appear here'}
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {items.map((n) => (
                <NotificationRow
                  key={n.id}
                  item={n}
                  language={language}
                  dir={dir}
                  getIcon={getIcon}
                  getTitle={getTitle}
                  getMessage={getMessage}
                  formatTime={formatTime}
                  onMarkRead={() => markAsRead(n.id)}
                  messagesHref={messagesHref}
                />
              ))}
            </div>
          )}
        </ScrollArea>

        <div className="border-t px-4 py-2">
          <Link href="/notifications">
            <Button variant="ghost" size="sm" className="w-full justify-center text-xs h-8">
              {language === 'ar' ? 'عرض الكل' : language === 'fr' ? 'Voir tout' : 'View all'}
              <ChevronRight className={cn('h-3.5 w-3.5', dir === 'rtl' ? 'rotate-180 me-2' : 'ms-2')} />
            </Button>
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  )
}

function NotificationRow({
  item,
  language,
  dir,
  getIcon,
  getTitle,
  getMessage,
  formatTime,
  onMarkRead,
  messagesHref,
}: {
  item: NotificationItem
  language: string
  dir: string
  getIcon: (t: NotificationType) => React.ReactNode
  getTitle: (n: NotificationItem, l: string) => string
  getMessage: (n: NotificationItem, l: string) => string
  formatTime: (d: string, l: string) => string
  onMarkRead: () => void
  messagesHref: string
}) {
  const href = item.action_url || (item.type === 'chat' ? messagesHref : undefined)

  return (
    <Link
      href={href || '#'}
      onClick={() => !item.is_read && onMarkRead()}
      className={cn(
        'flex gap-3 px-4 py-3 transition-colors hover:bg-muted/50',
        !item.is_read && 'bg-primary/5',
        dir === 'rtl' && 'flex-row-reverse text-right'
      )}
    >
      <div className="flex-shrink-0 mt-0.5">{getIcon(item.type)}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{getTitle(item, language)}</p>
        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{getMessage(item, language)}</p>
        <p className="text-[10px] text-muted-foreground mt-1">{formatTime(item.created_at, language)}</p>
      </div>
    </Link>
  )
}
