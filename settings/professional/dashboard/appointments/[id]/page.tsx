'use client'

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  ArrowLeft, 
  User, 
  Calendar, 
  Clock, 
  MapPin, 
  Phone, 
  Mail,
  Activity,
  AlertCircle,
  CheckCircle,
  XCircle
} from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/page-loading'

interface AppointmentDetailsProps {
  params: Promise<{
    id: string
  }>
}

export default function DoctorAppointmentDetails(props: AppointmentDetailsProps) {
  const params = use(props.params);
  const router = useRouter()
  const [appointment, setAppointment] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    loadAppointment()
  }, [params.id])

  const loadAppointment = async () => {
    const supabase = createBrowserClient()
    
    // First get the appointment
    const { data, error } = await supabase
      .from('appointments')
      .select('*')
      .eq('id', params.id)
      .maybeSingle()

    if (error || !data) {
      setLoading(false)
      return
    }

    // Then try to get patient profile if patient_id exists
    let patientData = null
    if (data.patient_id) {
      const { data: patient } = await supabase
        .from('profiles')
        .select('id, full_name, email, phone, date_of_birth, gender')
        .eq('id', data.patient_id)
        .maybeSingle()
      patientData = patient
    }

    // Combine data - use guest info as fallback
    setAppointment({
      ...data,
      patient: patientData,
      // Provide fallback patient info from guest fields
      patient_display_name: patientData?.full_name || data.guest_name || data.patient_name || 'Patient',
      patient_display_email: patientData?.email || data.guest_email || data.patient_email,
      patient_display_phone: patientData?.phone || data.guest_phone || data.patient_phone
    })
    setLoading(false)
  }

  const handleStatusUpdate = async (newStatus: string) => {
    setActionLoading(true)
    const supabase = createBrowserClient()
    
    const { error } = await supabase
      .from('appointments')
      .update({ status: newStatus })
      .eq('id', params.id)

    if (!error) {
      setAppointment({ ...appointment, status: newStatus })
    } else {
      alert('Failed to update appointment status')
    }
    setActionLoading(false)
  }

  const getStatusBadge = (status: string) => {
    const statusConfig: any = {
      pending: { variant: 'secondary', label: 'Pending' },
      confirmed: { variant: 'default', label: 'Confirmed' },
      completed: { variant: 'default', label: 'Completed' },
      cancelled: { variant: 'destructive', label: 'Cancelled' },
    }
    const config = statusConfig[status] || statusConfig.pending
    return <Badge variant={config.variant as any}>{config.label}</Badge>
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" className="text-primary" />
      </div>
    )
  }

  if (!appointment) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Appointment not found</AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" onClick={() => router.push('/professional/dashboard')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Appointment Details</h1>
          <p className="text-muted-foreground text-sm">
            {new Date(appointment.appointment_date).toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </p>
        </div>
        {getStatusBadge(appointment.status)}
      </div>

      {/* Patient Information */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Patient Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Full Name</p>
              <p className="font-medium">{appointment.patient?.full_name || appointment.guest_name || appointment.patient_name || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Gender</p>
              <p className="font-medium capitalize">{appointment.patient?.gender || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Email</p>
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <p className="font-medium">{appointment.patient?.email || appointment.guest_email || appointment.patient_email || 'N/A'}</p>
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Phone</p>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <p className="font-medium">{appointment.patient?.phone || appointment.guest_phone || appointment.patient_phone || 'N/A'}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Appointment Details */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Appointment Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Date</p>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <p className="font-medium">
                  {new Date(appointment.appointment_date).toLocaleDateString()}
                </p>
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Time</p>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <p className="font-medium">{appointment.appointment_time}</p>
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Visit Type</p>
              <p className="font-medium capitalize">{appointment.visit_type}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Consultation Fee</p>
              <p className="font-medium">{appointment.consultation_fee} DZD</p>
            </div>
          </div>

          {appointment.symptoms && (
            <div>
              <p className="text-sm text-muted-foreground mb-1">Symptoms</p>
              <p className="font-medium">{appointment.symptoms}</p>
            </div>
          )}

          {appointment.notes && (
            <div>
              <p className="text-sm text-muted-foreground mb-1">Notes</p>
              <p className="font-medium">{appointment.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Manage Appointment</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {appointment.status === 'pending' && (
            <Button 
              className="w-full" 
              onClick={() => handleStatusUpdate('confirmed')}
              disabled={actionLoading}
            >
              {actionLoading ? <LoadingSpinner size="sm" className="me-2" /> : <CheckCircle className="me-2 h-4 w-4" />}
              Confirm Appointment
            </Button>
          )}

          {appointment.status === 'confirmed' && (
            <Button 
              className="w-full" 
              onClick={() => handleStatusUpdate('completed')}
              disabled={actionLoading}
            >
              {actionLoading ? <LoadingSpinner size="sm" className="me-2" /> : <CheckCircle className="me-2 h-4 w-4" />}
              Mark as Completed
            </Button>
          )}

          {appointment.status !== 'cancelled' && appointment.status !== 'completed' && (
            <Button 
              variant="destructive" 
              className="w-full"
              onClick={() => {
                if (confirm('Are you sure you want to cancel this appointment?')) {
                  handleStatusUpdate('cancelled')
                }
              }}
              disabled={actionLoading}
            >
              {actionLoading ? <LoadingSpinner size="sm" className="me-2" /> : <XCircle className="me-2 h-4 w-4" />}
              Cancel Appointment
            </Button>
          )}

          <Button 
            variant="outline" 
            className="w-full bg-transparent"
            onClick={() => router.push('/professional/dashboard')}
          >
            Back to Dashboard
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
