'use client'

import { useState } from 'react'
import { createBrowserClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { Save } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface PharmacySettingsProps {
  pharmacy: any
  professional: any
  onUpdate: () => void
}

export default function PharmacySettings({ pharmacy, professional, onUpdate }: PharmacySettingsProps) {
  const { toast } = useToast()
  const [saving, setSaving] = useState(false)
  
  const [isActive, setIsActive] = useState(pharmacy.is_active ?? true)
  const [is24h, setIs24h] = useState(pharmacy.is_24h ?? false)
  const [isOnDuty, setIsOnDuty] = useState(pharmacy.is_on_duty ?? false)
  const [hasDelivery, setHasDelivery] = useState(pharmacy.has_delivery ?? false)

  const handleSave = async () => {
    setSaving(true)
    try {
      const supabase = createBrowserClient()
      
      const { error } = await supabase
        .from('pharmacies')
        .update({
          is_active: isActive,
          is_24h: is24h,
          is_on_duty: isOnDuty,
          has_delivery: hasDelivery,
          updated_at: new Date().toISOString(),
        })
        .eq('id', pharmacy.id)

      if (error) throw error

      toast({
        title: 'Settings saved',
        description: 'Your pharmacy settings have been updated successfully.',
      })
      
      onUpdate()
    } catch (error) {
      console.error('Save error:', error)
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to save settings. Please try again.',
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Pharmacy Status</CardTitle>
          <CardDescription>
            Control your pharmacy availability and services
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="active">Active Profile</Label>
              <p className="text-sm text-muted-foreground">
                When disabled, your pharmacy will not appear in searches
              </p>
            </div>
            <Switch
              id="active"
              checked={isActive}
              onCheckedChange={setIsActive}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="24h">Open 24 Hours</Label>
              <p className="text-sm text-muted-foreground">
                Your pharmacy is available 24/7
              </p>
            </div>
            <Switch
              id="24h"
              checked={is24h}
              onCheckedChange={setIs24h}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="on-duty">On Duty</Label>
              <p className="text-sm text-muted-foreground">
                Currently serving as duty pharmacy
              </p>
            </div>
            <Switch
              id="on-duty"
              checked={isOnDuty}
              onCheckedChange={setIsOnDuty}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="delivery">Delivery Service</Label>
              <p className="text-sm text-muted-foreground">
                Offer medicine delivery to customers
              </p>
            </div>
            <Switch
              id="delivery"
              checked={hasDelivery}
              onCheckedChange={setHasDelivery}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <>
              <span className="animate-spin mr-2">⏳</span>
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
