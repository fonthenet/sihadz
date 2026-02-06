'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { 
  Bell, Calendar, FileText, Pill, CreditCard, MessageSquare, 
  CheckCircle, AlertCircle, Info, X, Settings, Filter,
  Clock, User, Stethoscope, Building, Video, ChevronLeft, ChevronRight
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import { useLanguage } from '@/lib/i18n/language-context'

type NotificationType = 'appointment' | 'prescription' | 'payment' | 'review' | 'system' | 'reminder'

interface Notification {
  id: string
  type: NotificationType
  title: { ar: string; fr: string; en: string }
  message: { ar: string; fr: string; en: string }
  time: string
  read: boolean
  actionUrl?: string
  actionLabel?: { ar: string; fr: string; en: string }
}

// Notifications will be fetched from database
const initialNotifications: Notification[] = [
  {
    id: '1',
    type: 'appointment',
    title: { ar: 'موعد جديد', fr: 'Nouveau rendez-vous', en: 'New Appointment' },
    message: { ar: 'لديك موعد جديد مع د. أحمد على الساعة 3 مساءً', fr: 'Vous avez un nouveau rendez-vous avec Dr. Ahmad à 15 heures', en: 'You have a new appointment with Dr. Ahmad at 3 PM' },
    time: '1 hour ago',
    read: false,
    actionUrl: '/dashboard/appointments/1',
    actionLabel: { ar: 'التفاصيل', fr: 'Détails', en: 'Details' }
  },
  {
    id: '2',
    type: 'prescription',
    title: { ar: 'وصفة جديدة', fr: 'Nouvelle ordonnance', en: 'New Prescription' },
    message: { ar: 'لديك وصفة طبية جديدة من د. محمد', fr: 'Vous avez une nouvelle ordonnance de Dr. Mohammed', en: 'You have a new prescription from Dr. Mohammed' },
    time: '2 hours ago',
    read: false,
    actionUrl: '/dashboard/prescriptions/2',
    actionLabel: { ar: 'الوصفة', fr: 'Ordonnance', en: 'Prescription' }
  },
  {
    id: '3',
    type: 'payment',
    title: { ar: 'دفع ناجح', fr: 'Paiement réussi', en: 'Successful Payment' },
    message: { ar: 'لقد تم دفع رسوم الكشف بنجاح', fr: 'Votre paiement pour le rendez-vous a été effectué avec succès', en: 'Your consultation fee has been paid successfully' },
    time: '3 hours ago',
    read: true
  },
  {
    id: '4',
    type: 'review',
    title: { ar: 'تقييم جديد', fr: 'Nouvel avis', en: 'New Review' },
    message: { ar: 'لديك تقييم جديد من مريض سابق', fr: 'Vous avez un nouvel avis d’un ancien patient', en: 'You have a new review from a previous patient' },
    time: '1 day ago',
    read: false,
    actionUrl: '/dashboard/reviews/4',
    actionLabel: { ar: 'التفاصيل', fr: 'Détails', en: 'Details' }
  },
  {
    id: '5',
    type: 'system',
    title: { ar: 'تحديث النظام', fr: 'Mise à jour du système', en: 'System Update' },
    message: { ar: 'لقد تم تحديث النظام، يرجى التحقق من التغييرات الجديدة', fr: 'Le système a été mis à jour, veuillez vérifier les nouvelles modifications', en: 'The system has been updated, please check the new changes' },
    time: '2 days ago',
    read: true
  },
  {
    id: '6',
    type: 'appointment',
    title: { ar: 'تم تأكيد الموعد', fr: 'Rendez-vous confirmé', en: 'Appointment Confirmed' },
    message: { ar: 'تم تأكيد موعدك مع د. سارة شريف ليوم 25 يناير', fr: 'Votre rendez-vous avec Dr. Sara Cherif est confirmé pour le 25 janvier', en: 'Your appointment with Dr. Sara Cherif is confirmed for January 25' },
    time: '4 days ago',
    read: true
  }
]

const mockNotifications = initialNotifications

export default function NotificationsPage() {
  const { language, t, dir } = useLanguage()
  const [notifications, setNotifications] = useState(mockNotifications)
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

  const unreadCount = notifications.filter(n => !n.read).length
  const filteredNotifications = filter === 'unread' 
    ? notifications.filter(n => !n.read)
    : notifications

  const markAsRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
  }

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }

  const deleteNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
  }

  const getIcon = (type: NotificationType) => {
    switch (type) {
      case 'appointment': return <Calendar className="h-5 w-5 text-primary" />
      case 'prescription': return <Pill className="h-5 w-5 text-green-600" />
      case 'payment': return <CreditCard className="h-5 w-5 text-blue-600" />
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
      review: { ar: 'تقييم', fr: 'Avis', en: 'Review' },
      reminder: { ar: 'تذكير', fr: 'Rappel', en: 'Reminder' },
      system: { ar: 'نظام', fr: 'Système', en: 'System' }
    }
    return labels[type][language]
  }

  const ArrowBack = dir === 'rtl' ? ChevronRight : ChevronLeft

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
            <Button variant="outline" onClick={() => setShowSettings(!showSettings)} className="gap-2">
              <Settings className="h-4 w-4" />
              {language === 'ar' ? 'الإعدادات' : language === 'fr' ? 'Paramètres' : 'Settings'}
            </Button>
            {unreadCount > 0 && (
              <Button variant="outline" onClick={markAllAsRead}>
                {language === 'ar' ? 'تحديد الكل كمقروء' : language === 'fr' ? 'Tout marquer comme lu' : 'Mark All Read'}
              </Button>
            )}
          </div>
        </div>

        {/* Settings Panel */}
        {showSettings && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className={dir === 'rtl' ? 'text-right' : 'text-left'}>
                {language === 'ar' ? 'إعدادات الإشعارات' : language === 'fr' ? 'Paramètres de notification' : 'Notification Settings'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-8">
                {/* Notification Types */}
                <div>
                  <h3 className={`font-semibold mb-4 ${dir === 'rtl' ? 'text-right' : 'text-left'}`}>
                    {language === 'ar' ? 'أنواع الإشعارات' : language === 'fr' ? 'Types de notifications' : 'Notification Types'}
                  </h3>
                  <div className="space-y-4">
                    {[
                      { key: 'appointments', label: { ar: 'المواعيد', fr: 'Rendez-vous', en: 'Appointments' } },
                      { key: 'prescriptions', label: { ar: 'الوصفات الطبية', fr: 'Ordonnances', en: 'Prescriptions' } },
                      { key: 'payments', label: { ar: 'المدفوعات', fr: 'Paiements', en: 'Payments' } },
                      { key: 'reviews', label: { ar: 'التقييمات', fr: 'Avis', en: 'Reviews' } },
                      { key: 'reminders', label: { ar: 'التذكيرات', fr: 'Rappels', en: 'Reminders' } },
                      { key: 'marketing', label: { ar: 'العروض والأخبار', fr: 'Offres et actualités', en: 'Offers & News' } },
                    ].map(item => (
                      <div key={item.key} className={`flex items-center justify-between ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
                        <Label htmlFor={item.key}>{item.label[language]}</Label>
                        <Switch
                          id={item.key}
                          checked={notificationSettings[item.key as keyof typeof notificationSettings] as boolean}
                          onCheckedChange={(checked) => setNotificationSettings(prev => ({ ...prev, [item.key]: checked }))}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Delivery Methods */}
                <div>
                  <h3 className={`font-semibold mb-4 ${dir === 'rtl' ? 'text-right' : 'text-left'}`}>
                    {language === 'ar' ? 'طرق التوصيل' : language === 'fr' ? 'Méthodes de livraison' : 'Delivery Methods'}
                  </h3>
                  <div className="space-y-4">
                    {[
                      { key: 'sms', label: { ar: 'الرسائل النصية', fr: 'SMS', en: 'SMS' } },
                      { key: 'email', label: { ar: 'البريد الإلكتروني', fr: 'Email', en: 'Email' } },
                      { key: 'push', label: { ar: 'إشعارات التطبيق', fr: 'Notifications push', en: 'Push Notifications' } },
                      { key: 'whatsapp', label: { ar: 'واتساب', fr: 'WhatsApp', en: 'WhatsApp' } },
                    ].map(item => (
                      <div key={item.key} className={`flex items-center justify-between ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
                        <Label htmlFor={item.key}>{item.label[language]}</Label>
                        <Switch
                          id={item.key}
                          checked={notificationSettings[item.key as keyof typeof notificationSettings] as boolean}
                          onCheckedChange={(checked) => setNotificationSettings(prev => ({ ...prev, [item.key]: checked }))}
                        />
                      </div>
                    ))}
                  </div>
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
            <TabsTrigger value="unread" className="gap-2">
              {language === 'ar' ? 'غير مقروء' : language === 'fr' ? 'Non lu' : 'Unread'}
              {unreadCount > 0 && (
                <Badge variant="destructive" className="text-xs px-1.5 py-0.5">
                  {unreadCount}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Notifications List */}
        <div className="space-y-3">
          {filteredNotifications.length === 0 ? (
            <Card className="p-12 text-center">
              <Bell className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {language === 'ar' ? 'لا توجد إشعارات' : language === 'fr' ? 'Aucune notification' : 'No notifications'}
              </p>
            </Card>
          ) : (
            filteredNotifications.map(notification => (
              <Card 
                key={notification.id}
                className={`transition-colors ${!notification.read ? 'bg-primary/5 border-primary/20' : ''}`}
              >
                <CardContent className="p-4">
                  <div className={`flex gap-4 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
                    {/* Icon */}
                    <div className="flex-shrink-0 mt-1">
                      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                        {getIcon(notification.type)}
                      </div>
                    </div>

                    {/* Content */}
                    <div className={`flex-1 min-w-0 ${dir === 'rtl' ? 'text-right' : 'text-left'}`}>
                      <div className={`flex items-start justify-between gap-2 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
                        <div>
                          <div className={`flex items-center gap-2 ${dir === 'rtl' ? 'flex-row-reverse justify-end' : ''}`}>
                            <h3 className={`font-semibold ${!notification.read ? 'text-foreground' : 'text-muted-foreground'}`}>
                              {notification.title[language]}
                            </h3>
                            {!notification.read && (
                              <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                            )}
                          </div>
                          <Badge variant="outline" className="text-xs mt-1">
                            {getTypeLabel(notification.type)}
                          </Badge>
                        </div>
                        <div className={`flex items-center gap-1 flex-shrink-0 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
                          <span className="text-xs text-muted-foreground">{notification.time}</span>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-6 w-6"
                            onClick={() => deleteNotification(notification.id)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      
                      <p className="text-sm text-muted-foreground mt-2">
                        {notification.message[language]}
                      </p>

                      {/* Actions */}
                      <div className={`flex items-center gap-2 mt-3 ${dir === 'rtl' ? 'flex-row-reverse justify-end' : ''}`}>
                        {notification.actionUrl && notification.actionLabel && (
                          <Link href={notification.actionUrl}>
                            <Button size="sm" variant="outline">
                              {notification.actionLabel[language]}
                            </Button>
                          </Link>
                        )}
                        {!notification.read && (
                          <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={() => markAsRead(notification.id)}
                          >
                            {language === 'ar' ? 'تحديد كمقروء' : language === 'fr' ? 'Marquer comme lu' : 'Mark as Read'}
                          </Button>
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
