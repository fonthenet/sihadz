'use client'

import { useState } from 'react'
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
}

export default function ClinicSettings({ clinic, professional, onUpdate }: ClinicSettingsProps) {
  const { toast } = useToast()
  const [saving, setSaving] = useState(false)
  
  const [isActive, setIsActive] = useState(clinic.is_active ?? true)
  const [is24h, setIs24h] = useState(clinic.is_24h ?? false)

  const handleSave = async () => {
    setSaving(true)
    try {
      const supabase = createBrowserClient()
      
      const { error } = await supabase
        .from('clinics')
        .update({
          is_active: isActive,
          is_24h: is24h,
          updated_at: new Date().toISOString(),
        })
        .eq('id', clinic.id)

      if (error) throw error

      toast({
        title: 'Settings saved',
        description: 'Your clinic settings have been updated successfully.',
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
          <CardTitle>Clinic Status</CardTitle>
          <CardDescription>
            Control your clinic availability
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
