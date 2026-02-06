'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { createBrowserClient } from '@/lib/supabase/client'
import { 
  Bell, Calendar, FileText, Pill, CreditCard, MessageSquare, 
  CheckCircle, AlertCircle, Info, X, Settings, Filter,
  Clock, User, Stethoscope, Building, Video, ChevronLeft, ChevronRight
} from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/page-loading'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import { useLanguage } from '@/lib/i18n/language-context'

type NotificationType = 'appointment' | 'prescription' | 'payment' | 'message' | 'review' | 'system' | 'reminder'

interface Notification {
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
  created_at: string
}

// Sample notifications for when database is empty
const sampleNotifications: Notification[] = [
  {
    id: 'sample-1',
    type: 'system',
    title: 'Welcome to DZDoc!',
    title_ar: 'مرحبًا بك في DZDoc!',
    title_fr: 'Bienvenue sur DZDoc!',
    message: 'Your account is ready. Start by booking your first appointment.',
    message_ar: 'حسابك جاهز. ابدأ بحجز موعدك الأول.',
    message_fr: 'Votre compte est prêt. Commencez par prendre votre premier rendez-vous.',
    is_read: false,
    action_url: '/booking/new',
    created_at: new Date().toISOString()
  },
  {
    id: 'sample-2',
    type: 'reminder',
    title: 'Complete Your Profile',
    title_ar: 'أكمل ملفك الشخصي',
    title_fr: 'Complétez votre profil',
    message: 'Add your medical history for better healthcare.',
    message_ar: 'أضف تاريخك الطبي للحصول على رعاية صحية أفضل.',
    message_fr: 'Ajoutez vos antécédents médicaux pour de meilleurs soins.',
    is_read: false,
    action_url: '/settings',
    created_at: new Date(Date.now() - 3600000).toISOString()
  }
]

export default function NotificationsPage() {
  const { language, t, dir } = useLanguage()
  const supabase = createBrowserClient()
  
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'unread'>('all')
  const [showSettings, setShowSettings] = useState(false)
  
  const [notificationSettings, setNotificationSettings] = useState({
    appointments: true,
    prescriptions: true,
    payments: true,
    reviews: true,
    reminders: true,
    marketing: false,
    sms: true,
    email: true,
    push: true,
    whatsapp: false
  })

  // Fetch notifications from database
  useEffect(() => {
    const fetchNotifications = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setNotifications(sampleNotifications)
        setLoading(false)
        return
      }

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50)

      if (data && data.length > 0) {
        setNotifications(data)
      } else {
        setNotifications(sampleNotifications)
      }
      setLoading(false)
    }

    fetchNotifications()
  }, [supabase])

  const unreadCount = notifications.filter(n => !n.is_read).length
  const filteredNotifications = filter === 'unread' 
    ? notifications.filter(n => !n.is_read)
    : notifications

  const markAsRead = async (id: string) => {
    if (id.startsWith('sample-')) {
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
      return
    }

    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id)
    
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
  }

  const markAllAsRead = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (user) {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
    }
    
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
  }

  const deleteNotification = async (id: string) => {
    if (!id.startsWith('sample-')) {
      await supabase
        .from('notifications')
        .delete()
        .eq('id', id)
    }
    
    setNotifications(prev => prev.filter(n => n.id !== id))
  }

  const getIcon = (type: NotificationType) => {
    switch (type) {
      case 'appointment': return <Calendar className="h-5 w-5 text-primary" />
      case 'prescription': return <Pill className="h-5 w-5 text-green-600" />
      case 'payment': return <CreditCard className="h-5 w-5 text-blue-600" />
      case 'message': return <MessageSquare className="h-5 w-5 text-teal-600" />
      case 'review': return <MessageSquare className="h-5 w-5 text-yellow-600" />
      case 'reminder': return <Clock className="h-5 w-5 text-orange-600" />
      case 'system': return <Info className="h-5 w-5 text-purple-600" />
      default: return <Bell className="h-5 w-5" />
    }
  }

  const getTypeLabel = (type: NotificationType) => {
    const labels: Record<NotificationType, { ar: string; fr: string; en: string }> = {
      appointment: { ar: 'موعد', fr: 'Rendez-vous', en: 'Appointment' },
      prescription: { ar: 'وصفة', fr: 'Ordonnance', en: 'Prescription' },
      payment: { ar: 'دفع', fr: 'Paiement', en: 'Payment' },
      message: { ar: 'رسالة', fr: 'Message', en: 'Message' },
      review: { ar: 'تقييم', fr: 'Avis', en: 'Review' },
      reminder: { ar: 'تذكير', fr: 'Rappel', en: 'Reminder' },
      system: { ar: 'نظام', fr: 'Système', en: 'System' }
    }
    return labels[type]?.[language] || type
  }

  const getTitle = (n: Notification) => {
    if (language === 'ar' && n.title_ar) return n.title_ar
    if (language === 'fr' && n.title_fr) return n.title_fr
    return n.title
  }

  const getMessage = (n: Notification) => {
    if (language === 'ar' && n.message_ar) return n.message_ar
    if (language === 'fr' && n.message_fr) return n.message_fr
    return n.message
  }

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return language === 'ar' ? 'الآن' : language === 'fr' ? 'À l\'instant' : 'Just now'
    if (diffMins < 60) return language === 'ar' ? `منذ ${diffMins} دقيقة` : language === 'fr' ? `Il y a ${diffMins} min` : `${diffMins} min ago`
    if (diffHours < 24) return language === 'ar' ? `منذ ${diffHours} ساعة` : language === 'fr' ? `Il y a ${diffHours}h` : `${diffHours}h ago`
    return language === 'ar' ? `منذ ${diffDays} يوم` : language === 'fr' ? `Il y a ${diffDays}j` : `${diffDays}d ago`
  }

  const ArrowBack = dir === 'rtl' ? ChevronRight : ChevronLeft

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center py-20">
          <LoadingSpinner size="lg" className="text-primary" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Back Button */}
        <Link href="/dashboard">
          <Button variant="ghost" className={`mb-6 gap-2 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
            <ArrowBack className="h-4 w-4" />
            {language === 'ar' ? 'العودة للوحة التحكم' : language === 'fr' ? 'Retour au tableau de bord' : 'Back to Dashboard'}
          </Button>
        </Link>

        {/* Header */}
        <div className={`flex items-center justify-between mb-8 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
          <div className={dir === 'rtl' ? 'text-right' : 'text-left'}>
            <h1 className="text-3xl font-bold text-foreground">
              {language === 'ar' ? 'الإشعارات' : language === 'fr' ? 'Notifications' : 'Notifications'}
            </h1>
            <p className="text-muted-foreground mt-1">
              {language === 'ar' ? `${unreadCount} إشعارات غير مقروءة` : 
               language === 'fr' ? `${unreadCount} notifications non lues` : 
               `${unreadCount} unread notifications`}
            </p>
          </div>
          <div className={`flex items-center gap-2 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
            {unreadCount > 0 && (
              <Button variant="outline" size="sm" onClick={markAllAsRead}>
                <CheckCircle className="h-4 w-4 me-2" />
                {language === 'ar' ? 'قراءة الكل' : language === 'fr' ? 'Tout lire' : 'Mark all read'}
              </Button>
            )}
            <Button variant="outline" size="icon" onClick={() => setShowSettings(!showSettings)}>
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Settings Panel */}
        {showSettings && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">
                {language === 'ar' ? 'إعدادات الإشعارات' : language === 'fr' ? 'Paramètres des notifications' : 'Notification Settings'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="appointments">{language === 'ar' ? 'المواعيد' : language === 'fr' ? 'Rendez-vous' : 'Appointments'}</Label>
                  <Switch
                    id="appointments"
                    checked={notificationSettings.appointments}
                    onCheckedChange={(checked) => setNotificationSettings(prev => ({ ...prev, appointments: checked }))}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="prescriptions">{language === 'ar' ? 'الوصفات' : language === 'fr' ? 'Ordonnances' : 'Prescriptions'}</Label>
                  <Switch
                    id="prescriptions"
                    checked={notificationSettings.prescriptions}
                    onCheckedChange={(checked) => setNotificationSettings(prev => ({ ...prev, prescriptions: checked }))}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="email">{language === 'ar' ? 'البريد الإلكتروني' : language === 'fr' ? 'Email' : 'Email'}</Label>
                  <Switch
                    id="email"
                    checked={notificationSettings.email}
                    onCheckedChange={(checked) => setNotificationSettings(prev => ({ ...prev, email: checked }))}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="sms">{language === 'ar' ? 'رسائل SMS' : language === 'fr' ? 'SMS' : 'SMS'}</Label>
                  <Switch
                    id="sms"
                    checked={notificationSettings.sms}
                    onCheckedChange={(checked) => setNotificationSettings(prev => ({ ...prev, sms: checked }))}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Filter Tabs */}
        <Tabs value={filter} onValueChange={(v) => setFilter(v as 'all' | 'unread')} className="mb-6">
          <TabsList>
            <TabsTrigger value="all">
              {language === 'ar' ? 'الكل' : language === 'fr' ? 'Tous' : 'All'}
            </TabsTrigger>
            <TabsTrigger value="unread">
              {language === 'ar' ? 'غير مقروء' : language === 'fr' ? 'Non lu' : 'Unread'}
              {unreadCount > 0 && (
                <Badge variant="destructive" className="ms-2">{unreadCount}</Badge>
              )}
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Notifications List */}
        <div className="space-y-4">
          {filteredNotifications.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Bell className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  {language === 'ar' ? 'لا توجد إشعارات' : language === 'fr' ? 'Aucune notification' : 'No notifications'}
                </h3>
                <p className="text-muted-foreground">
                  {language === 'ar' ? 'ستظهر الإشعارات الجديدة هنا' : language === 'fr' ? 'Les nouvelles notifications apparaîtront ici' : 'New notifications will appear here'}
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredNotifications.map((notification) => (
              <Card 
                key={notification.id} 
                className={`transition-all ${!notification.is_read ? 'border-primary/50 bg-primary/5' : ''}`}
              >
                <CardContent className="p-4">
                  <div className={`flex gap-4 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
                    <div className="flex-shrink-0 mt-1">
                      {getIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={`flex items-start justify-between gap-2 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
                        <div className={dir === 'rtl' ? 'text-right' : ''}>
                          <h4 className="font-semibold text-foreground">
                            {getTitle(notification)}
                          </h4>
                          <p className="text-sm text-muted-foreground mt-1">
                            {getMessage(notification)}
                          </p>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="flex-shrink-0 h-8 w-8"
                          onClick={() => deleteNotification(notification.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className={`flex items-center gap-3 mt-3 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
                        <Badge variant="secondary" className="text-xs">
                          {getTypeLabel(notification.type)}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatTime(notification.created_at)}
                        </span>
                        {!notification.is_read && (
                          <Button 
                            variant="link" 
                            size="sm" 
                            className="h-auto p-0 text-xs"
                            onClick={() => markAsRead(notification.id)}
                          >
                            {language === 'ar' ? 'تعيين كمقروء' : language === 'fr' ? 'Marquer comme lu' : 'Mark as read'}
                          </Button>
                        )}
                        {notification.action_url && (
                          <Link href={notification.action_url}>
                            <Button variant="link" size="sm" className="h-auto p-0 text-xs">
                              {language === 'ar' ? 'عرض' : language === 'fr' ? 'Voir' : 'View'}
                            </Button>
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </main>

      <Footer />
    </div>
  )
}
