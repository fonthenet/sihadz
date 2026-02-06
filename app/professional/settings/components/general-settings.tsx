'use client'

import { useState, useEffect, useMemo } from 'react'
import { createBrowserClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Save, User, Mail, Phone, MapPin, Globe } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useLanguage } from '@/lib/i18n/language-context'
import { WilayaCitySelector } from '@/components/wilaya-city-selector'
import { WILAYAS, getWilayaByCode, getWilayaName, getCityName } from '@/lib/data/algeria-locations'

interface GeneralSettingsProps {
  professional: any
  profile: any
  onUpdate: () => void
}

const LANG_LABELS = {
  en: { language: 'Language', languageDesc: 'Platform display language. Overrides website language when set.', ar: 'العربية', fr: 'Français', en: 'English' },
  fr: { language: 'Langue', languageDesc: 'Langue d\'affichage de la plateforme. Remplace la langue du site quand définie.', ar: 'العربية', fr: 'Français', en: 'English' },
  ar: { language: 'اللغة', languageDesc: 'لغة عرض المنصة. تستبدل لغة الموقع عند تعيينها.', ar: 'العربية', fr: 'Français', en: 'English' },
}

export default function GeneralSettings({ professional, profile, onUpdate }: GeneralSettingsProps) {
  const { toast } = useToast()
  const { language, setLanguage } = useLanguage()
  const locLang = language === 'ar' ? 'ar' : language === 'fr' ? 'fr' : 'en'
  const [saving, setSaving] = useState(false)
  
  const [businessName, setBusinessName] = useState(professional.business_name || '')
  const [phone, setPhone] = useState(professional.phone || '')
  const [email, setEmail] = useState(professional.email || '')
  const [addressLine1, setAddressLine1] = useState(professional.address_line1 || '')
  const [addressLine2, setAddressLine2] = useState(professional.address_line2 || '')

  const resolveInitialWilayaCode = useMemo(() => {
    const w = professional?.wilaya || ''
    if (!w) return ''
    const codeMatch = /^\d{1,2}$/.test(w.trim())
    if (codeMatch) return w.trim().padStart(2, '0')
    const lower = w.toLowerCase()
    const found = WILAYAS.find(
      (x) =>
        getWilayaName(x, 'fr').toLowerCase() === lower ||
        getWilayaName(x, 'en').toLowerCase() === lower ||
        x.nameAr === w ||
        x.nameFr.toLowerCase() === lower ||
        x.nameEn.toLowerCase() === lower
    )
    return found?.code ?? ''
  }, [professional?.wilaya])

  const resolveInitialCity = useMemo(() => {
    const c = professional?.commune || ''
    if (!c || !resolveInitialWilayaCode) return { cityId: null as string | null, customName: '' }
    const wilaya = getWilayaByCode(resolveInitialWilayaCode)
    if (!wilaya) return { cityId: null, customName: c }
    const lower = c.toLowerCase()
    const byId = wilaya.cities.find((x) => x.id === lower || x.id.replace(/-/g, ' ') === lower.replace(/\s+/g, '-'))
    if (byId) return { cityId: byId.id, customName: '' }
    const byName = wilaya.cities.find(
      (x) =>
        getCityName(x, 'fr').toLowerCase() === lower ||
        getCityName(x, 'en').toLowerCase() === lower ||
        x.nameAr === c
    )
    if (byName) return { cityId: byName.id, customName: '' }
    return { cityId: null, customName: c }
  }, [professional?.commune, resolveInitialWilayaCode])

  const [wilayaCode, setWilayaCode] = useState(resolveInitialWilayaCode)
  const [cityId, setCityId] = useState<string | null>(resolveInitialCity.cityId)
  const [customCityName, setCustomCityName] = useState(resolveInitialCity.customName)

  useEffect(() => {
    if (professional) {
      setBusinessName(professional.business_name || '')
      setPhone(professional.phone || '')
      setEmail(professional.email || '')
      setAddressLine1(professional.address_line1 || '')
      setAddressLine2(professional.address_line2 || '')
      setWilayaCode(resolveInitialWilayaCode)
      setCityId(resolveInitialCity.cityId)
      setCustomCityName(resolveInitialCity.customName)
    }
  }, [professional?.id, resolveInitialWilayaCode, resolveInitialCity])

  const handleSave = async () => {
    setSaving(true)
    try {
      const supabase = createBrowserClient()
      
      const wilayaObj = getWilayaByCode(wilayaCode)
      const wilayaToSave = wilayaObj ? wilayaCode : ''
      const communeToSave = customCityName.trim()
        ? customCityName.trim()
        : cityId && wilayaObj
          ? (wilayaObj.cities.find((c) => c.id === cityId)
            ? getCityName(wilayaObj.cities.find((c) => c.id === cityId)!, 'fr')
            : '')
          : ''

      const { error } = await supabase
        .from('professionals')
        .update({
          business_name: businessName,
          phone,
          email,
          address_line1: addressLine1,
          address_line2: addressLine2,
          wilaya: wilayaToSave || null,
          commune: communeToSave || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', professional.id)

      if (error) throw error

      toast({
        title: 'Settings saved',
        description: 'Your general settings have been updated successfully.',
      })
      // Notify layout to refresh professional (weather widget, sidebar)
      window.dispatchEvent(new CustomEvent('professional-updated', { 
        detail: { 
          wilaya: wilayaToSave, 
          commune: communeToSave,
          address_line1: addressLine1,
        } 
      }))
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

          <WilayaCitySelector
            wilayaCode={wilayaCode}
            cityId={cityId}
            customCityName={customCityName}
            onWilayaChange={setWilayaCode}
            onCityChange={(id, name, isCustom) => {
              setCityId(id)
              setCustomCityName(isCustom ? name : '')
            }}
            language={locLang}
            wilayaLabel={language === 'ar' ? 'الولاية' : language === 'fr' ? 'Wilaya' : 'Wilaya'}
            cityLabel={language === 'ar' ? 'البلدية / المدينة' : language === 'fr' ? 'Commune / Ville' : 'Commune / City'}
          />
        </CardContent>
      </Card>

      {/* Language & Preferences */}
      {professional.auth_user_id && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              {LANG_LABELS[language]?.language ?? LANG_LABELS.en.language}
            </CardTitle>
            <CardDescription>
              {LANG_LABELS[language]?.languageDesc ?? LANG_LABELS.en.languageDesc}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>{LANG_LABELS[language]?.language ?? LANG_LABELS.en.language}</Label>
              <Select value={language} onValueChange={(v: 'ar' | 'fr' | 'en') => setLanguage(v)}>
                <SelectTrigger className="w-full sm:w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ar">{LANG_LABELS[language]?.ar ?? 'العربية'}</SelectItem>
                  <SelectItem value="fr">{LANG_LABELS[language]?.fr ?? 'Français'}</SelectItem>
                  <SelectItem value="en">{LANG_LABELS[language]?.en ?? 'English'}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      )}

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
