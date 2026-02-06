'use client'

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { Save } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface ClinicSettingsProps {
  clinic: any
  professional: any
  onUpdate: () => void
  /** Override title/description when reused for other types (e.g. ambulance) */
  variant?: 'clinic' | 'ambulance'
}

export default function ClinicSettings({ clinic, professional, onUpdate, variant = 'clinic' }: ClinicSettingsProps) {
  const isAmbulance = variant === 'ambulance'
  const title = isAmbulance ? 'Ambulance Service Status' : 'Clinic Status'
  const desc = isAmbulance ? 'Control your ambulance service availability' : 'Control your clinic availability'
  const toastDesc = isAmbulance ? 'Your ambulance settings have been updated successfully.' : 'Your clinic settings have been updated successfully.'
  const { toast } = useToast()
  const [saving, setSaving] = useState(false)
  
  const [isActive, setIsActive] = useState(clinic.is_active ?? true)
  const [is24h, setIs24h] = useState(clinic.is_24h ?? false)

  useEffect(() => {
    if (clinic) {
      setIsActive(clinic.is_active ?? true)
      setIs24h(clinic.is_24h ?? false)
    }
  }, [clinic])

  const handleSave = async () => {
    setSaving(true)
    try {
      const supabase = createBrowserClient()
      
      // SINGLE SOURCE OF TRUTH: Update professionals table only
      const { error } = await supabase
        .from('professionals')
        .update({
          is_active: isActive,
          is_24h: is24h,
          updated_at: new Date().toISOString(),
        })
        .eq('id', professional?.id || clinic.id)

      if (error) throw error

      toast({
        title: 'Settings saved',
        description: toastDesc,
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
          <CardTitle>{title}</CardTitle>
          <CardDescription>
            {desc}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="active">Active Profile</Label>
              <p className="text-sm text-muted-foreground">
                When disabled, your clinic will not appear in searches
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
                Your clinic is available 24/7
              </p>
            </div>
            <Switch
              id="24h"
              checked={is24h}
              onCheckedChange={setIs24h}
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
