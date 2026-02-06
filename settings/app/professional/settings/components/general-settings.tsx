'use client'

import { useState } from 'react'
import { createBrowserClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Save, User, Mail, Phone, MapPin } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface GeneralSettingsProps {
  professional: any
  profile: any
  onUpdate: () => void
}

export default function GeneralSettings({ professional, profile, onUpdate }: GeneralSettingsProps) {
  const { toast } = useToast()
  const [saving, setSaving] = useState(false)
  
  const [businessName, setBusinessName] = useState(professional.business_name || '')
  const [phone, setPhone] = useState(professional.phone || '')
  const [email, setEmail] = useState(professional.email || '')
  const [addressLine1, setAddressLine1] = useState(professional.address_line1 || '')
  const [addressLine2, setAddressLine2] = useState(professional.address_line2 || '')
  const [wilaya, setWilaya] = useState(professional.wilaya || '')
  const [commune, setCommune] = useState(professional.commune || '')

  const handleSave = async () => {
    setSaving(true)
    try {
      const supabase = createBrowserClient()
      
      const { error } = await supabase
        .from('professionals')
        .update({
          business_name: businessName,
          phone,
          email,
          address_line1: addressLine1,
          address_line2: addressLine2,
          wilaya,
          commune,
          updated_at: new Date().toISOString(),
        })
        .eq('id', professional.id)

      if (error) throw error

      toast({
        title: 'Settings saved',
        description: 'Your general settings have been updated successfully.',
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
      {/* Business Information */}
      <Card>
        <CardHeader>
          <CardTitle>Business Information</CardTitle>
          <CardDescription>
            Basic information about your professional practice
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="business-name">Business Name</Label>
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <Input
                id="business-name"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="Your clinic, pharmacy, or lab name"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="contact@example.com"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <Input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="0554128522"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Address */}
      <Card>
        <CardHeader>
          <CardTitle>Address</CardTitle>
          <CardDescription>
            Where patients can find you
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="address-1">Address Line 1</Label>
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <Input
                id="address-1"
                value={addressLine1}
                onChange={(e) => setAddressLine1(e.target.value)}
                placeholder="Street address, building number"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address-2">Address Line 2 (Optional)</Label>
            <Input
              id="address-2"
              value={addressLine2}
              onChange={(e) => setAddressLine2(e.target.value)}
              placeholder="Apartment, suite, unit, floor, etc."
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="wilaya">Wilaya</Label>
              <Input
                id="wilaya"
                value={wilaya}
                onChange={(e) => setWilaya(e.target.value)}
                placeholder="e.g., Algiers"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="commune">Commune</Label>
              <Input
                id="commune"
                value={commune}
                onChange={(e) => setCommune(e.target.value)}
                placeholder="e.g., Bir Mourad Rais"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* License Information */}
      <Card>
        <CardHeader>
          <CardTitle>License Information</CardTitle>
          <CardDescription>
            Your professional credentials
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>License Number</Label>
            <Input
              value={professional.license_number || ''}
              disabled
              className="bg-muted"
            />
            <p className="text-xs text-muted-foreground">
              Contact support to update your license number
            </p>
          </div>

          <div className="space-y-2">
            <Label>Verification Status</Label>
            <div className="flex items-center gap-2">
              {professional.status === 'verified' ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
                  ✓ Verified
                </span>
              ) : professional.status === 'pending' ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-3 py-1 text-xs font-medium text-yellow-700">
                  ⏱ Pending Review
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-700">
                  ✗ Not Verified
                </span>
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
