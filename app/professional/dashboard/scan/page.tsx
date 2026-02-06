'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createBrowserClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { CheckCircle, XCircle, Package, Pill, ArrowLeft, ScanLine } from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/page-loading'
import { useToast } from '@/hooks/use-toast'

interface PrescriptionSummary {
  id: string
  diagnosis?: string
  status: string
  medications: unknown[]
  patient?: { full_name?: string; phone?: string }
  doctor?: { business_name?: string }
}

export default function PharmacyScanPage() {
  const searchParams = useSearchParams()
  const prescriptionId = searchParams.get('id')
  const supabase = createBrowserClient()
  const { toast } = useToast()
  const [prescription, setPrescription] = useState<PrescriptionSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadPrescription = useCallback(async () => {
    if (!prescriptionId) {
      setError('No prescription ID provided. Scan the QR code on the prescription.')
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setError('You must be signed in to use the scan page.')
        setLoading(false)
        return
      }
      const res = await fetch(`/api/prescriptions/${prescriptionId}`, { credentials: 'include' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error || 'Prescription not found or not assigned to this pharmacy.')
        setPrescription(null)
        setLoading(false)
        return
      }
      const found = data.prescription
      if (!found) {
        setError('Prescription not found.')
        setPrescription(null)
        setLoading(false)
        return
      }
      setPrescription({
        id: found.id,
        diagnosis: found.diagnosis,
        status: found.status,
        medications: found.medications || [],
        patient: found.patient,
        doctor: found.doctor,
      })
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Failed to load prescription'
      setError(message)
      setPrescription(null)
    } finally {
      setLoading(false)
    }
  }, [prescriptionId, supabase])

  useEffect(() => {
    loadPrescription()
  }, [loadPrescription])

  const handleConfirmPickup = async () => {
    if (!prescription || prescription.status !== 'ready') return
    setConfirming(true)
    try {
      const res = await fetch(`/api/prescriptions/${prescription.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: 'picked_up' }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update status')
      }
      toast({ title: 'Success', description: 'Prescription marked as picked up.' })
      setPrescription((prev) => (prev ? { ...prev, status: 'picked_up' } : null))
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Failed to confirm pickup'
      toast({ title: 'Error', description: message, variant: 'destructive' })
    } finally {
      setConfirming(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 p-6">
        <LoadingSpinner size="xl" className="text-primary" />
        <p className="text-muted-foreground">Loading prescription...</p>
      </div>
    )
  }

  if (error && !prescription) {
    return (
      <div className="max-w-md mx-auto p-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ScanLine className="h-5 w-5" />
              Scan prescription
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">{error}</p>
            <p className="text-sm text-muted-foreground">
              Open this page by scanning the QR code on the prescription, or use a link that includes the prescription ID (e.g. <code className="text-xs bg-muted px-1 rounded">?id=...</code>).
            </p>
            <Button asChild variant="outline">
              <Link href="/professional/dashboard">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to dashboard
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!prescription) {
    return null
  }

  const canConfirmPickup = prescription.status === 'ready'
  const alreadyPickedUp = prescription.status === 'picked_up'

  return (
    <div className="max-w-md mx-auto p-6 space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/professional/dashboard">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-xl font-semibold">Prescription pickup</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Pill className="h-5 w-5" />
            Prescription summary
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant={alreadyPickedUp ? 'outline' : 'default'}>
              {alreadyPickedUp ? 'Picked up' : prescription.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Patient</Label>
            <p className="font-medium">{prescription.patient?.full_name || '—'}</p>
            {prescription.patient?.phone && (
              <p className="text-sm text-muted-foreground">{prescription.patient.phone}</p>
            )}
          </div>
          <div>
            <Label>Doctor</Label>
            <p className="font-medium">{prescription.doctor?.business_name || '—'}</p>
          </div>
          {prescription.diagnosis && (
            <div>
              <Label>Diagnosis</Label>
              <p>{prescription.diagnosis}</p>
            </div>
          )}
          <div>
            <Label>Medications</Label>
            <p>{prescription.medications.length} item(s)</p>
          </div>

          {alreadyPickedUp && (
            <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
              <CheckCircle className="h-5 w-5" />
              <span>This prescription was already marked as picked up.</span>
            </div>
          )}

          {canConfirmPickup && (
            <Button
              className="w-full gap-2"
              onClick={handleConfirmPickup}
              disabled={confirming}
            >
              {confirming ? (
                <LoadingSpinner size="sm" />
              ) : (
                <Package className="h-4 w-4" />
              )}
              Confirm pickup
            </Button>
          )}

          {!canConfirmPickup && !alreadyPickedUp && (
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 text-sm">
              <XCircle className="h-4 w-4 flex-shrink-0" />
              <span>Pickup can only be confirmed when the prescription is &quot;Ready for pickup&quot;.</span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
