'use client'

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Save, Video, Home, Building2, DollarSign } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface DoctorSettingsProps {
  doctor: any
  professional: any
  onUpdate: () => void
  /** When true, hide Account Status (Accept patients) - it's in Practice & Schedule */
  hideAccountStatus?: boolean
}

export default function DoctorSettings({ doctor, professional, onUpdate, hideAccountStatus }: DoctorSettingsProps) {
  const { toast } = useToast()
  const [saving, setSaving] = useState(false)
  
  // Service toggles
  const [supportsInPerson, setSupportsInPerson] = useState(doctor.supports_in_person ?? true)
  const [supportsEVisit, setSupportsEVisit] = useState(doctor.supports_e_visit ?? false)
  const [supportsHomeVisit, setSupportsHomeVisit] = useState(doctor.supports_home_visit ?? false)
  
  // Fees
  const [consultationFee, setConsultationFee] = useState(doctor.consultation_fee || 2000)
  const [eVisitFee, setEVisitFee] = useState(doctor.e_visit_fee || 1500)
  const [homeVisitFee, setHomeVisitFee] = useState(doctor.home_visit_fee || 5000)
  const [homeVisitRadius, setHomeVisitRadius] = useState(doctor.home_visit_radius || 10)
  
  // Active status
  const [isActive, setIsActive] = useState(doctor.is_active ?? true)

  useEffect(() => {
    if (doctor) {
      setSupportsInPerson(doctor.supports_in_person ?? true)
      setSupportsEVisit(doctor.supports_e_visit ?? false)
      setSupportsHomeVisit(doctor.supports_home_visit ?? false)
      setConsultationFee(doctor.consultation_fee || 2000)
      setEVisitFee(doctor.e_visit_fee || 1500)
      setHomeVisitFee(doctor.home_visit_fee || 5000)
      setHomeVisitRadius(doctor.home_visit_radius || 10)
      setIsActive(doctor.is_active ?? true)
    }
  }, [doctor])

  const handleSave = async () => {
    setSaving(true)
    try {
      const supabase = createBrowserClient()
      
      // SINGLE SOURCE OF TRUTH: Update professionals table only
      const updates: Record<string, unknown> = {
        supports_in_person: supportsInPerson,
        supports_e_visit: supportsEVisit,
        supports_home_visit: supportsHomeVisit,
        consultation_fee: consultationFee,
        e_visit_fee: eVisitFee,
        home_visit_fee: homeVisitFee,
        home_visit_radius: homeVisitRadius,
        updated_at: new Date().toISOString(),
      }
      if (!hideAccountStatus) updates.is_active = isActive
      const { error } = await supabase
        .from('professionals')
        .update(updates)
        .eq('id', professional?.id || doctor.id)

      if (error) throw error

      toast({
        title: 'Settings saved',
        description: 'Your service settings have been updated successfully.',
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
      {!hideAccountStatus && (
        <Card>
          <CardHeader>
            <CardTitle>Account Status</CardTitle>
            <CardDescription>
              Control whether your profile is visible to patients
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="active">Active Profile</Label>
                <p className="text-sm text-muted-foreground">
                  When disabled, patients cannot see or book with you
                </p>
              </div>
              <Switch
                id="active"
                checked={isActive}
                onCheckedChange={setIsActive}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Services Offered */}
      <Card>
        <CardHeader>
          <CardTitle>Services Offered</CardTitle>
          <CardDescription>
            Enable or disable different consultation types
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* In-Person Visits */}
          <div className="flex items-start gap-4">
            <Building2 className="h-5 w-5 text-primary mt-1" />
            <div className="flex-1 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="in-person">In-Person Consultations</Label>
                  <p className="text-sm text-muted-foreground">
                    Patients visit your clinic
                  </p>
                </div>
                <Switch
                  id="in-person"
                  checked={supportsInPerson}
                  onCheckedChange={setSupportsInPerson}
                />
              </div>
              {supportsInPerson && (
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <Input
                    type="number"
                    value={consultationFee}
                    onChange={(e) => setConsultationFee(Number(e.target.value))}
                    className="w-32"
                  />
                  <span className="text-sm text-muted-foreground">DZD</span>
                </div>
              )}
            </div>
          </div>

          {/* Video Consultations */}
          <div className="flex items-start gap-4">
            <Video className="h-5 w-5 text-primary mt-1" />
            <div className="flex-1 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="e-visit">Video Consultations</Label>
                  <p className="text-sm text-muted-foreground">
                    Remote consultations via video call
                  </p>
                </div>
                <Switch
                  id="e-visit"
                  checked={supportsEVisit}
                  onCheckedChange={setSupportsEVisit}
                />
              </div>
              {supportsEVisit && (
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <Input
                    type="number"
                    value={eVisitFee}
                    onChange={(e) => setEVisitFee(Number(e.target.value))}
                    className="w-32"
                  />
                  <span className="text-sm text-muted-foreground">DZD</span>
                </div>
              )}
            </div>
          </div>

          {/* Home Visits */}
          <div className="flex items-start gap-4">
            <Home className="h-5 w-5 text-primary mt-1" />
            <div className="flex-1 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="home-visit">Home Visits</Label>
                  <p className="text-sm text-muted-foreground">
                    Visit patients at their home (requires approval)
                  </p>
                </div>
                <Switch
                  id="home-visit"
                  checked={supportsHomeVisit}
                  onCheckedChange={setSupportsHomeVisit}
                />
              </div>
              {supportsHomeVisit && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <Input
                      type="number"
                      value={homeVisitFee}
                      onChange={(e) => setHomeVisitFee(Number(e.target.value))}
                      className="w-32"
                    />
                    <span className="text-sm text-muted-foreground">DZD</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label className="text-sm">Coverage radius:</Label>
                    <Input
                      type="number"
                      value={homeVisitRadius}
                      onChange={(e) => setHomeVisitRadius(Number(e.target.value))}
                      className="w-24"
                    />
                    <span className="text-sm text-muted-foreground">km</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
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
