'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/hooks/use-toast'
import { Receipt, Stethoscope, CreditCard } from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/page-loading'

interface ProfessionalPOSSettingsProps {
  professionalId: string
  onUpdate?: () => void
}

export default function ProfessionalPOSSettings({ professionalId, onUpdate }: ProfessionalPOSSettingsProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [chifaEnabled, setChifaEnabled] = useState(false)
  const [cardEnabled, setCardEnabled] = useState(true)

  useEffect(() => {
    fetch('/api/professional/pos/settings')
      .then((res) => (res.ok ? res.json() : Promise.resolve({})))
      .then((data: { settings?: { chifa_enabled?: boolean; card_enabled?: boolean } }) => {
        const s = (data?.settings ?? data) as { chifa_enabled?: boolean; card_enabled?: boolean } | undefined
        setChifaEnabled(s?.chifa_enabled ?? false)
        setCardEnabled(s?.card_enabled ?? true)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handleChifaChange = async (checked: boolean) => {
    setSaving(true)
    try {
      const res = await fetch('/api/professional/pos/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chifa_enabled: checked, card_enabled: cardEnabled }),
      })
      if (res.ok) {
        setChifaEnabled(checked)
        toast({ title: 'POS settings updated' })
        onUpdate?.()
      } else {
        const data = await res.json()
        throw new Error(data.error)
      }
    } catch (err: unknown) {
      toast({ title: 'Error', description: (err as Error).message, variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const handleCardChange = async (checked: boolean) => {
    setSaving(true)
    try {
      const res = await fetch('/api/professional/pos/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chifa_enabled: chifaEnabled, card_enabled: checked }),
      })
      if (res.ok) {
        setCardEnabled(checked)
        toast({ title: 'POS settings updated' })
        onUpdate?.()
      } else {
        const data = await res.json()
        throw new Error(data.error)
      }
    } catch (err: unknown) {
      toast({ title: 'Error', description: (err as Error).message, variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 flex justify-center">
          <LoadingSpinner size="lg" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Receipt className="h-5 w-5 text-muted-foreground" />
          <CardTitle>Point of Sale</CardTitle>
        </div>
        <CardDescription>
          Configure payment options for your POS. Cash is always available. Enable Chifa/CNAS or card payments as needed.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between rounded-lg border p-4">
          <div className="flex items-center gap-3">
            <Stethoscope className="h-5 w-5 text-muted-foreground" />
            <div>
              <Label htmlFor="chifa-toggle" className="text-base font-medium">Chifa / CNAS Integration</Label>
              <p className="text-sm text-muted-foreground">
                Allow items to be marked as CNAS-reimbursable. When enabled, you can add Chifa items with reimbursement rates.
              </p>
            </div>
          </div>
          <Switch
            id="chifa-toggle"
            checked={chifaEnabled}
            onCheckedChange={handleChifaChange}
            disabled={saving}
          />
        </div>

        <div className="flex items-center justify-between rounded-lg border p-4">
          <div className="flex items-center gap-3">
            <CreditCard className="h-5 w-5 text-muted-foreground" />
            <div>
              <Label htmlFor="card-toggle" className="text-base font-medium">Card Payments</Label>
              <p className="text-sm text-muted-foreground">
                Show card payment option in the POS. Cash remains the primary payment method.
              </p>
            </div>
          </div>
          <Switch
            id="card-toggle"
            checked={cardEnabled}
            onCheckedChange={handleCardChange}
            disabled={saving}
          />
        </div>
      </CardContent>
    </Card>
  )
}
