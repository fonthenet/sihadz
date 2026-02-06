'use client'

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { Save, FileText } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import type { LabReportTemplate } from '@/lib/print-prescription-lab'

interface LaboratorySettingsProps {
  laboratory: any
  professional: any
  onUpdate: () => void
}

export default function LaboratorySettings({ laboratory, professional, onUpdate }: LaboratorySettingsProps) {
  const { toast } = useToast()
  const [saving, setSaving] = useState(false)
  
  const [isActive, setIsActive] = useState(laboratory.is_active ?? true)
  const [is24h, setIs24h] = useState(laboratory.is_24h ?? false)

  // Lab report form template (website-wide printed results)
  const [labName, setLabName] = useState('')
  const [logoUrl, setLogoUrl] = useState('')
  const [slogan, setSlogan] = useState('')
  const [address, setAddress] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [website, setWebsite] = useState('')
  const [showQrCode, setShowQrCode] = useState(true)
  const [showInterpretation, setShowInterpretation] = useState(true)
  const [showLabNotes, setShowLabNotes] = useState(true)
  const [signatureTechnician, setSignatureTechnician] = useState('')
  const [signaturePathologist, setSignaturePathologist] = useState('')
  const [primaryColor, setPrimaryColor] = useState('#1e40af')
  const [fontFamily, setFontFamily] = useState<'default' | 'serif' | 'modern'>('default')

  useEffect(() => {
    if (laboratory) {
      setIsActive(laboratory.is_active ?? true)
      setIs24h(laboratory.is_24h ?? false)
    }
  }, [laboratory])

  const labTemplate = (professional?.lab_report_template as LabReportTemplate) || {}
  useEffect(() => {
    setLabName(labTemplate.labName ?? professional?.business_name ?? '')
    setLogoUrl(labTemplate.logoUrl ?? '')
    setSlogan(labTemplate.slogan ?? '')
    setAddress(labTemplate.address ?? professional?.address ?? '')
    setPhone(labTemplate.phone ?? professional?.phone ?? '')
    setEmail(labTemplate.email ?? professional?.email ?? '')
    setWebsite(labTemplate.website ?? '')
    setShowQrCode(labTemplate.showQrCode !== false)
    setShowInterpretation(labTemplate.showInterpretation !== false)
    setShowLabNotes(labTemplate.showLabNotes !== false)
    setSignatureTechnician(labTemplate.signatureTechnician ?? '')
    setSignaturePathologist(labTemplate.signaturePathologist ?? '')
    setPrimaryColor(labTemplate.primaryColor ?? '#1e40af')
    setFontFamily((labTemplate.fontFamily as 'default' | 'serif' | 'modern') ?? 'default')
  }, [professional?.lab_report_template, professional?.business_name, professional?.address, professional?.phone, professional?.email])

  const handleSave = async () => {
    setSaving(true)
    try {
      const supabase = createBrowserClient()
      const labReportTemplate: LabReportTemplate = {
        labName: labName.trim() || professional?.business_name,
        logoUrl: logoUrl.trim(),
        slogan: slogan.trim(),
        address: address.trim(),
        phone: phone.trim(),
        email: email.trim(),
        website: website.trim(),
        showQrCode,
        showInterpretation,
        showLabNotes,
        signatureTechnician: signatureTechnician.trim(),
        signaturePathologist: signaturePathologist.trim(),
        primaryColor: primaryColor.trim() || '#1e40af',
        fontFamily,
      }

      const { error } = await supabase
        .from('professionals')
        .update({
          is_active: isActive,
          is_24h: is24h,
          lab_report_template: labReportTemplate,
          updated_at: new Date().toISOString(),
        })
        .eq('id', professional?.id || laboratory.id)

      if (error) throw error

      toast({
        title: 'Settings saved',
        description: 'Your laboratory settings and report template have been updated.',
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
          <CardTitle>Laboratory Status</CardTitle>
          <CardDescription>
            Control your laboratory availability
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="active">Active Profile</Label>
              <p className="text-sm text-muted-foreground">
                When disabled, your laboratory will not appear in searches
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
                Your laboratory is available 24/7
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

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Lab Report Template
          </CardTitle>
          <CardDescription>
            Customize how printed lab results appear (website-wide). Include QR code, interpretation, and lab notes sections.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="labName">Lab name</Label>
              <Input
                id="labName"
                value={labName}
                onChange={(e) => setLabName(e.target.value)}
                placeholder="e.g. Central Medical Lab"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="logoUrl">Logo URL</Label>
              <Input
                id="logoUrl"
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                placeholder="https://..."
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="slogan">Slogan / tagline</Label>
            <Input
              id="slogan"
              value={slogan}
              onChange={(e) => setSlogan(e.target.value)}
              placeholder="e.g. Accurate | Caring | Instant"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Input
              id="address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Full address"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="0123456789"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="lab@example.com"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="website">Website</Label>
            <Input
              id="website"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="www.example.com"
            />
          </div>
          <div className="flex flex-wrap gap-6 pt-2">
            <div className="flex items-center space-x-2">
              <Switch id="showQr" checked={showQrCode} onCheckedChange={setShowQrCode} />
              <Label htmlFor="showQr">Show QR code on report</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch id="showInterp" checked={showInterpretation} onCheckedChange={setShowInterpretation} />
              <Label htmlFor="showInterp">Show interpretation section</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch id="showNotes" checked={showLabNotes} onCheckedChange={setShowLabNotes} />
              <Label htmlFor="showNotes">Show lab notes section</Label>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 pt-2">
            <div className="space-y-2">
              <Label htmlFor="sigTech">Medical Lab Technician (name)</Label>
              <Input
                id="sigTech"
                value={signatureTechnician}
                onChange={(e) => setSignatureTechnician(e.target.value)}
                placeholder="e.g. DMLT, BMLT"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sigPath">Pathologist (name)</Label>
              <Input
                id="sigPath"
                value={signaturePathologist}
                onChange={(e) => setSignaturePathologist(e.target.value)}
                placeholder="e.g. Dr. Payal Shah (MD, Pathologist)"
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 pt-2">
            <div className="space-y-2">
              <Label htmlFor="primaryColor">Primary color</Label>
              <div className="flex gap-2">
                <Input
                  id="primaryColor"
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="h-10 w-14 p-1 cursor-pointer"
                />
                <Input
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="flex-1"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Font</Label>
              <select
                value={fontFamily}
                onChange={(e) => setFontFamily(e.target.value as 'default' | 'serif' | 'modern')}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="default">Default</option>
                <option value="serif">Serif</option>
                <option value="modern">Modern</option>
              </select>
            </div>
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
