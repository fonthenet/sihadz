'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@/lib/supabase/client'
import { ArrowLeft, Save, Check } from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/page-loading'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import Link from 'next/link'

// Import type-specific settings components
import DoctorSettings from './components/doctor-settings'
import PharmacySettings from './components/pharmacy-settings'
import LaboratorySettings from './components/laboratory-settings'
import ClinicSettings from './components/clinic-settings'
import GeneralSettings from './components/general-settings'

export default function ProfessionalSettingsPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [professional, setProfessional] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [providerData, setProviderData] = useState<any>(null)

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      const supabase = createBrowserClient()
      
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/professional/auth/login')
        return
      }

      // Load professional data
      const { data: profData, error: profError } = await supabase
        .from('professionals')
        .select('*')
        .eq('auth_user_id', user.id)
        .single()

      if (profError || !profData) {
        router.push('/professional/auth/signup')
        return
      }

      setProfessional(profData)

      // Load professional profile
      const { data: profileData } = await supabase
        .from('professional_profiles')
        .select('*')
        .eq('professional_id', profData.id)
        .single()

      setProfile(profileData)

      // Load provider-specific data based on type
      if (profData.type === 'doctor') {
        const { data } = await supabase
          .from('doctors')
          .select('*')
          .eq('user_id', user.id)
          .single()
        setProviderData(data)
      } else if (profData.type === 'pharmacy') {
        const { data } = await supabase
          .from('pharmacies')
          .select('*')
          .eq('user_id', user.id)
          .single()
        setProviderData(data)
      } else if (profData.type === 'laboratory') {
        const { data } = await supabase
          .from('laboratories')
          .select('*')
          .eq('user_id', user.id)
          .single()
        setProviderData(data)
      } else if (profData.type === 'clinic') {
        const { data } = await supabase
          .from('clinics')
          .select('*')
          .eq('user_id', user.id)
          .single()
        setProviderData(data)
      }

    } catch (err) {
      console.error('Settings load error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" className="text-primary" />
      </div>
    )
  }

  if (!professional) {
    return null
  }

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <div className="bg-background border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/professional/dashboard">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Dashboard
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold">Settings</h1>
                <p className="text-sm text-muted-foreground">
                  Manage your professional account and services
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <Tabs defaultValue="general" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 lg:w-auto lg:inline-grid">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="services">Services & Availability</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-6">
            <GeneralSettings 
              professional={professional}
              profile={profile}
              onUpdate={loadSettings}
            />
          </TabsContent>

          <TabsContent value="services" className="space-y-6">
            {professional.type === 'doctor' && providerData && (
              <DoctorSettings 
                doctor={providerData}
                professional={professional}
                onUpdate={loadSettings}
              />
            )}
            {professional.type === 'pharmacy' && providerData && (
              <PharmacySettings 
                pharmacy={providerData}
                professional={professional}
                onUpdate={loadSettings}
              />
            )}
            {professional.type === 'laboratory' && providerData && (
              <LaboratorySettings 
                laboratory={providerData}
                professional={professional}
                onUpdate={loadSettings}
              />
            )}
            {professional.type === 'clinic' && providerData && (
              <ClinicSettings 
                clinic={providerData}
                professional={professional}
                onUpdate={loadSettings}
              />
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
