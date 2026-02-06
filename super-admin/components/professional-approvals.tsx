'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { CheckCircle, XCircle, Eye, Building2, Stethoscope, FlaskConical, Pill } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface Professional {
  id: string
  business_name: string
  type: string
  email: string
  phone: string
  status: string
  license_number: string
  wilaya: string
  commune: string
  created_at: string
  profile_completed: boolean
  onboarding_completed: boolean
}

export function ProfessionalApprovals() {
  const [professionals, setProfessionals] = useState<Professional[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedProfessional, setSelectedProfessional] = useState<Professional | null>(null)
  const [showRejectDialog, setShowRejectDialog] = useState(false)
  const [rejectionReason, setRejectionReason] = useState('')
  const [processing, setProcessing] = useState(false)
  const supabase = createBrowserClient()
  const { toast } = useToast()

  useEffect(() => {
    fetchPendingProfessionals()
  }, [])

  async function fetchPendingProfessionals() {
    setLoading(true)
    
    // Fetch professionals with 'pending' or 'waiting_approval' status
    // (both might exist depending on when records were created)
    const { data, error } = await supabase
      .from('professionals')
      .select('*')
      .in('status', ['pending', 'waiting_approval'])
      .order('created_at', { ascending: false })
    
    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to load pending approvals',
        variant: 'destructive'
      })
    } else {
      setProfessionals(data || [])
    }
    setLoading(false)
  }

  async function handleApprove(professionalId: string) {
    setProcessing(true)
    try {
      const response = await fetch('/api/super-admin/approve-professional', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ professionalId, action: 'approve' })
      })

      const result = await response.json()

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Professional approved successfully'
        })
        fetchPendingProfessionals()
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to approve professional',
          variant: 'destructive'
        })
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to approve professional',
        variant: 'destructive'
      })
    }
    setProcessing(false)
  }

  async function handleReject() {
    if (!selectedProfessional || !rejectionReason.trim()) {
      toast({
        title: 'Error',
        description: 'Please provide a rejection reason',
        variant: 'destructive'
      })
      return
    }

    setProcessing(true)
    try {
      const response = await fetch('/api/super-admin/approve-professional', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          professionalId: selectedProfessional.id, 
          action: 'reject',
          rejectionReason 
        })
      })

      const result = await response.json()

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Professional rejected'
        })
        setShowRejectDialog(false)
        setRejectionReason('')
        setSelectedProfessional(null)
        fetchPendingProfessionals()
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to reject professional',
          variant: 'destructive'
        })
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to reject professional',
        variant: 'destructive'
      })
    }
    setProcessing(false)
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'doctor':
        return <Stethoscope className="h-5 w-5 text-blue-600" />
      case 'pharmacy':
        return <Pill className="h-5 w-5 text-green-600" />
      case 'laboratory':
        return <FlaskConical className="h-5 w-5 text-purple-600" />
      case 'clinic':
        return <Building2 className="h-5 w-5 text-orange-600" />
      default:
        return <Building2 className="h-5 w-5 text-gray-600" />
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Professional Approvals</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Loading...</p>
        </CardContent>
      </Card>
    )
  }

  if (professionals.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Professional Approvals</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertDescription>
              No professionals waiting for approval
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Professional Approvals</CardTitle>
            <Badge variant="destructive">{professionals.length} pending</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {professionals.map((prof) => (
              <div key={prof.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {prof.business_name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex items-center gap-2">
                    {getTypeIcon(prof.type)}
                    <div>
                      <p className="font-semibold">{prof.business_name}</p>
                      <p className="text-sm text-muted-foreground capitalize">
                        {prof.type} • {prof.wilaya}, {prof.commune}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        License: {prof.license_number} • {new Date(prof.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-2 bg-transparent"
                    onClick={() => {
                      // TODO: Add view details dialog
                      toast({ title: 'View Details', description: 'Details view coming soon' })
                    }}
                  >
                    <Eye className="h-4 w-4" />
                    View
                  </Button>
                  <Button
                    size="sm"
                    variant="default"
                    className="gap-2 bg-green-600 hover:bg-green-700"
                    onClick={() => handleApprove(prof.id)}
                    disabled={processing}
                  >
                    <CheckCircle className="h-4 w-4" />
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    className="gap-2"
                    onClick={() => {
                      setSelectedProfessional(prof)
                      setShowRejectDialog(true)
                    }}
                    disabled={processing}
                  >
                    <XCircle className="h-4 w-4" />
                    Reject
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Professional</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting {selectedProfessional?.business_name}
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Enter rejection reason..."
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            rows={4}
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowRejectDialog(false)
                setRejectionReason('')
                setSelectedProfessional(null)
              }}
              disabled={processing}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={processing || !rejectionReason.trim()}
            >
              {processing ? 'Rejecting...' : 'Reject Professional'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
