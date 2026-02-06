'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { Progress } from '@/components/ui/progress'
import { 
  Calendar, Clock, MapPin, User, Stethoscope, Pill, FlaskConical,
  Building2, Phone, MessageSquare, ChevronRight, CheckCircle, XCircle,
  AlertCircle, QrCode, Download, Share2, Eye, Edit, MoreHorizontal,
  ArrowRight, CreditCard, Banknote, Truck, Package
} from 'lucide-react'
import { 
  HealthcareTicket, 
  TicketType, 
  TicketStatus,
  STATUS_LABELS,
  TICKET_STATUS_FLOWS 
} from '@/lib/services/ticket-service'
import { QRCodeDisplay } from '@/components/qr-code-display'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface TicketCardProps {
  ticket: HealthcareTicket
  viewerRole: 'patient' | 'doctor' | 'pharmacy' | 'laboratory' | 'admin'
  language?: 'ar' | 'fr' | 'en'
  compact?: boolean
  onViewDetails?: (ticket: HealthcareTicket) => void
  onStatusUpdate?: (ticketId: string, newStatus: TicketStatus) => void
  onMessage?: (ticket: HealthcareTicket) => void
  onCall?: (phone: string) => void
}

export function TicketCard({
  ticket,
  viewerRole,
  language = 'ar',
  compact = false,
  onViewDetails,
  onStatusUpdate,
  onMessage,
  onCall,
}: TicketCardProps) {
  
  // Get ticket type icon
  const getTypeIcon = (type: TicketType) => {
    switch (type) {
      case 'appointment': return <Calendar className="h-5 w-5" />
      case 'prescription': return <Pill className="h-5 w-5" />
      case 'lab_request': return <FlaskConical className="h-5 w-5" />
      case 'referral': return <Share2 className="h-5 w-5" />
      case 'follow_up': return <ArrowRight className="h-5 w-5" />
      case 'emergency': return <AlertCircle className="h-5 w-5" />
      default: return <Calendar className="h-5 w-5" />
    }
  }

  // Get ticket type label
  const getTypeLabel = (type: TicketType): string => {
    const labels: Record<TicketType, Record<string, string>> = {
      appointment: { ar: 'موعد', fr: 'Rendez-vous', en: 'Appointment' },
      prescription: { ar: 'وصفة طبية', fr: 'Ordonnance', en: 'Prescription' },
      lab_request: { ar: 'تحليل مخبري', fr: 'Analyse', en: 'Lab Request' },
      referral: { ar: 'إحالة', fr: 'Référence', en: 'Referral' },
      follow_up: { ar: 'متابعة', fr: 'Suivi', en: 'Follow-up' },
      emergency: { ar: 'طوارئ', fr: 'Urgence', en: 'Emergency' },
    }
    return labels[type]?.[language] || type
  }

  // Get status badge
  const getStatusBadge = (status: TicketStatus, type: TicketType) => {
    const statusConfig = STATUS_LABELS[type]?.[status] || {
      en: status,
      ar: status,
      fr: status,
      color: 'gray',
    }

    const colorClasses: Record<string, string> = {
      gray: 'bg-gray-100 text-gray-700 border-gray-300',
      yellow: 'bg-yellow-100 text-yellow-700 border-yellow-300',
      green: 'bg-green-100 text-green-700 border-green-300',
      blue: 'bg-blue-100 text-blue-700 border-blue-300',
      orange: 'bg-orange-100 text-orange-700 border-orange-300',
      purple: 'bg-purple-100 text-purple-700 border-purple-300',
      red: 'bg-red-100 text-red-700 border-red-300',
    }

    return (
      <Badge variant="outline" className={colorClasses[statusConfig.color]}>
        {language === 'ar' ? statusConfig.ar : language === 'fr' ? statusConfig.fr : statusConfig.en}
      </Badge>
    )
  }

  // Get priority badge
  const getPriorityBadge = (priority: string) => {
    if (priority === 'normal') return null
    
    const config = {
      urgent: { label: { ar: 'عاجل', fr: 'Urgent', en: 'Urgent' }, class: 'bg-orange-500 text-white' },
      emergency: { label: { ar: 'طارئ', fr: 'Urgence', en: 'Emergency' }, class: 'bg-red-500 text-white' },
    }

    const c = config[priority as keyof typeof config]
    if (!c) return null

    return <Badge className={c.class}>{c.label[language]}</Badge>
  }

  // Calculate progress based on status flow
  const getProgress = () => {
    const flow = TICKET_STATUS_FLOWS[ticket.ticket_type]
    const currentIndex = flow.indexOf(ticket.status)
    if (currentIndex === -1) return 0
    return Math.round(((currentIndex + 1) / flow.length) * 100)
  }

  // Get next available actions based on viewer role and current status
  const getAvailableActions = (): { label: string; status: TicketStatus; variant: 'default' | 'outline' | 'destructive' }[] => {
    const actions: { label: string; status: TicketStatus; variant: 'default' | 'outline' | 'destructive' }[] = []

    if (ticket.ticket_type === 'prescription') {
      if (viewerRole === 'pharmacy') {
        if (ticket.status === 'pending' || ticket.status === 'confirmed') {
          actions.push({ label: language === 'ar' ? 'قبول' : 'Accept', status: 'processing', variant: 'default' })
          actions.push({ label: language === 'ar' ? 'رفض' : 'Reject', status: 'cancelled', variant: 'destructive' })
        }
        if (ticket.status === 'processing') {
          actions.push({ label: language === 'ar' ? 'جاهز للاستلام' : 'Ready for Pickup', status: 'ready', variant: 'default' })
        }
        if (ticket.status === 'ready') {
          actions.push({ label: language === 'ar' ? 'تم الاستلام' : 'Collected', status: 'completed', variant: 'default' })
        }
      }
    }

    if (ticket.ticket_type === 'lab_request') {
      if (viewerRole === 'laboratory') {
        if (ticket.status === 'pending' || ticket.status === 'confirmed') {
          actions.push({ label: language === 'ar' ? 'قبول' : 'Accept', status: 'in_progress', variant: 'default' })
          actions.push({ label: language === 'ar' ? 'رفض' : 'Reject', status: 'cancelled', variant: 'destructive' })
        }
        if (ticket.status === 'in_progress') {
          actions.push({ label: language === 'ar' ? 'قيد التحليل' : 'Processing', status: 'processing', variant: 'default' })
        }
        if (ticket.status === 'processing') {
          actions.push({ label: language === 'ar' ? 'النتائج جاهزة' : 'Results Ready', status: 'ready', variant: 'default' })
        }
      }
      if (viewerRole === 'doctor' && ticket.status === 'ready') {
        actions.push({ label: language === 'ar' ? 'تمت المراجعة' : 'Mark Reviewed', status: 'completed', variant: 'default' })
      }
    }

    if (ticket.ticket_type === 'appointment') {
      if (viewerRole === 'doctor') {
        if (ticket.status === 'pending') {
          actions.push({ label: language === 'ar' ? 'تأكيد' : 'Confirm', status: 'confirmed', variant: 'default' })
          actions.push({ label: language === 'ar' ? 'رفض' : 'Decline', status: 'cancelled', variant: 'destructive' })
        }
        if (ticket.status === 'confirmed') {
          actions.push({ label: language === 'ar' ? 'بدء الفحص' : 'Start Consultation', status: 'in_progress', variant: 'default' })
        }
        if (ticket.status === 'in_progress') {
          actions.push({ label: language === 'ar' ? 'إنهاء' : 'Complete', status: 'completed', variant: 'default' })
        }
      }
    }

    return actions
  }

  // Format date
  const formatDate = (date: string) => {
    const d = new Date(date)
    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    if (d.toDateString() === today.toDateString()) {
      return language === 'ar' ? 'اليوم' : language === 'fr' ? "Aujourd'hui" : 'Today'
    }
    if (d.toDateString() === tomorrow.toDateString()) {
      return language === 'ar' ? 'غداً' : language === 'fr' ? 'Demain' : 'Tomorrow'
    }

    return d.toLocaleDateString(language === 'ar' ? 'ar-DZ' : language === 'fr' ? 'fr-FR' : 'en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    })
  }

  const availableActions = getAvailableActions()

  // Compact view
  if (compact) {
    return (
      <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => onViewDetails?.(ticket)}>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-lg ${
              ticket.ticket_type === 'prescription' ? 'bg-green-100' :
              ticket.ticket_type === 'lab_request' ? 'bg-purple-100' :
              ticket.ticket_type === 'appointment' ? 'bg-blue-100' :
              'bg-gray-100'
            }`}>
              {getTypeIcon(ticket.ticket_type)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">{ticket.ticket_number}</span>
                {getStatusBadge(ticket.status, ticket.ticket_type)}
                {getPriorityBadge(ticket.priority)}
              </div>
              <p className="text-sm text-muted-foreground truncate">
                {getTypeLabel(ticket.ticket_type)} • {formatDate(ticket.created_at)}
              </p>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    )
  }

  // Full view
  return (
    <Card className={`
      ${ticket.priority === 'emergency' ? 'border-red-500 border-2' : ''}
      ${ticket.priority === 'urgent' ? 'border-orange-400' : ''}
    `}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-lg ${
              ticket.ticket_type === 'prescription' ? 'bg-green-100' :
              ticket.ticket_type === 'lab_request' ? 'bg-purple-100' :
              ticket.ticket_type === 'appointment' ? 'bg-blue-100' :
              'bg-gray-100'
            }`}>
              {getTypeIcon(ticket.ticket_type)}
            </div>
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                {ticket.ticket_number}
                {getPriorityBadge(ticket.priority)}
              </CardTitle>
              <CardDescription>
                {getTypeLabel(ticket.ticket_type)} • {new Date(ticket.created_at).toLocaleDateString()}
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {getStatusBadge(ticket.status, ticket.ticket_type)}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onViewDetails?.(ticket)}>
                  <Eye className="h-4 w-4 me-2" />
                  {language === 'ar' ? 'عرض التفاصيل' : 'View Details'}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onMessage?.(ticket)}>
                  <MessageSquare className="h-4 w-4 me-2" />
                  {language === 'ar' ? 'مراسلة' : 'Message'}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <QrCode className="h-4 w-4 me-2" />
                  {language === 'ar' ? 'رمز QR' : 'QR Code'}
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Download className="h-4 w-4 me-2" />
                  {language === 'ar' ? 'تحميل PDF' : 'Download PDF'}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Progress bar */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{language === 'ar' ? 'التقدم' : 'Progress'}</span>
            <span>{getProgress()}%</span>
          </div>
          <Progress value={getProgress()} className="h-2" />
        </div>

        {/* Patient info (for professionals) */}
        {viewerRole !== 'patient' && ticket.patient && (
          <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
            <Avatar>
              <AvatarImage src={ticket.patient.avatar_url} />
              <AvatarFallback><User className="h-4 w-4" /></AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <p className="font-medium">{ticket.patient.full_name}</p>
              <p className="text-sm text-muted-foreground">{ticket.patient.phone}</p>
            </div>
            {ticket.patient.phone && (
              <Button variant="ghost" size="icon" onClick={() => onCall?.(ticket.patient.phone)}>
                <Phone className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}

        {/* Doctor info (for patients and other providers) */}
        {viewerRole !== 'doctor' && ticket.doctor && (
          <div className="flex items-center gap-3">
            <Stethoscope className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">{ticket.doctor.business_name || ticket.doctor.profile?.full_name}</p>
              <p className="text-xs text-muted-foreground">{ticket.doctor.specialty || 'Doctor'}</p>
            </div>
          </div>
        )}

        {/* Pharmacy info (for prescriptions) */}
        {ticket.pharmacy && (
          <div className="flex items-center gap-3">
            <Building2 className="h-5 w-5 text-green-600" />
            <div className="flex-1">
              <p className="text-sm font-medium">{ticket.pharmacy.business_name}</p>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {ticket.pharmacy.commune}, {ticket.pharmacy.wilaya}
              </p>
            </div>
            {ticket.pharmacy.phone && (
              <Button variant="ghost" size="icon" onClick={() => onCall?.(ticket.pharmacy.phone)}>
                <Phone className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}

        {/* Laboratory info (for lab requests) */}
        {ticket.laboratory && (
          <div className="flex items-center gap-3">
            <FlaskConical className="h-5 w-5 text-purple-600" />
            <div className="flex-1">
              <p className="text-sm font-medium">{ticket.laboratory.business_name}</p>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {ticket.laboratory.commune}, {ticket.laboratory.wilaya}
              </p>
            </div>
            {ticket.laboratory.phone && (
              <Button variant="ghost" size="icon" onClick={() => onCall?.(ticket.laboratory.phone)}>
                <Phone className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}

        {/* Scheduled date/time (for appointments) */}
        {ticket.scheduled_date && (
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>{formatDate(ticket.scheduled_date)}</span>
            </div>
            {ticket.scheduled_time && (
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span>{ticket.scheduled_time.slice(0, 5)}</span>
              </div>
            )}
          </div>
        )}

        {/* Payment info */}
        {ticket.amount && ticket.amount > 0 && (
          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <div className="flex items-center gap-2">
              {ticket.payment_status === 'paid' ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <CreditCard className="h-4 w-4 text-muted-foreground" />
              )}
              <span className="text-sm">
                {ticket.payment_status === 'paid' 
                  ? (language === 'ar' ? 'مدفوع' : 'Paid')
                  : (language === 'ar' ? 'في انتظار الدفع' : 'Payment pending')
                }
              </span>
            </div>
            <span className="font-bold">{ticket.amount} DZD</span>
          </div>
        )}

        {/* Chifa badge */}
        {ticket.chifa_eligible && (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300">
            {language === 'ar' ? 'مغطى بالشفاء' : 'Chifa Covered'}
            {ticket.chifa_number && ` - ${ticket.chifa_number}`}
          </Badge>
        )}

        <Separator />

        {/* Actions */}
        <div className="flex flex-wrap gap-2">
          {availableActions.map((action, idx) => (
            <Button
              key={idx}
              size="sm"
              variant={action.variant}
              onClick={() => onStatusUpdate?.(ticket.id, action.status)}
            >
              {action.label}
            </Button>
          ))}
          
          <Button size="sm" variant="outline" onClick={() => onViewDetails?.(ticket)}>
            <Eye className="h-4 w-4 me-2" />
            {language === 'ar' ? 'التفاصيل' : 'Details'}
          </Button>
          
          <Button size="sm" variant="ghost" onClick={() => onMessage?.(ticket)}>
            <MessageSquare className="h-4 w-4 me-2" />
            {language === 'ar' ? 'مراسلة' : 'Message'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export default TicketCard
