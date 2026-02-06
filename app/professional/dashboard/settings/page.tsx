'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useLanguage } from '@/lib/i18n/language-context'
import { createBrowserClient } from '@/lib/supabase/client'
import { useUrlTab } from '@/hooks/use-url-tab'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SectionLoading } from '@/components/ui/page-loading'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

import GeneralSettings from '@/app/professional/settings/components/general-settings'
import DocumentTemplatesSettings from '@/app/professional/settings/components/document-templates-settings'
import PracticeScheduleSettings from '@/app/professional/settings/components/practice-schedule-settings'
import DoctorSettings from '@/app/professional/settings/components/doctor-settings'
import PharmacySettings from '@/app/professional/settings/components/pharmacy-settings'
import LaboratorySettings from '@/app/professional/settings/components/laboratory-settings'
import ClinicSettings from '@/app/professional/settings/components/clinic-settings'
import ScannerSettings from '@/app/professional/settings/components/scanner-settings'
import { EmployeeManagement } from '@/app/professional/settings/components/employee-management'
import { RoleEditor } from '@/app/professional/settings/components/role-editor'
import DemoModeCard from '@/app/professional/settings/components/demo-mode-card'
import { BackupSettings } from '@/components/backup'
import { PrivacySecuritySettings } from '@/components/settings/privacy-security-settings'
import TimeOffManagement from '@/app/professional/settings/components/time-off-management'
import { ProfessionalServicesManager } from '@/app/professional/settings/components/professional-services-manager'
import ProfessionalPOSSettings from '@/app/professional/settings/components/professional-pos-settings'

const SETTINGS_TABS = ['general', 'templates', 'practice', 'scanner', 'pos', 'team', 'services', 'security', 'backup'] as const

export default function DashboardSettingsPage() {
  const router = useRouter()
  const { language } = useLanguage()
  const [activeTab, setActiveTab] = useUrlTab('tab', SETTINGS_TABS, 'general')
  const [isLoading, setIsLoading] = useState(true)
  const [professional, setProfessional] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [providerData, setProviderData] = useState<any>(null)

  useEffect(() => {
    loadSettings()
  }, [])

  // Nurses don't have Scanner tab - redirect if they land on it
  useEffect(() => {
    if (professional?.type === 'nurse' && activeTab === 'scanner') {
      setActiveTab('general')
    }
  }, [professional?.type, activeTab, setActiveTab])

  const loadSettings = async () => {
    try {
      // 1. Check employee session first (PIN-based staff login)
      const empRes = await fetch('/api/employee-auth/dashboard-session', { credentials: 'include' })
      if (empRes.ok) {
        const empData = await empRes.json()
        if (empData.valid && empData.professional) {
          setProfessional(empData.professional)
          setProfile(null)
          setProviderData(empData.professional)
          return
        }
      }

      // 2. Fall back to Supabase auth (owner login)
      const supabase = createBrowserClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/professional/auth/login')
        return
      }

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

      const { data: profileData } = await supabase
        .from('professional_profiles')
        .select('*')
        .eq('professional_id', profData.id)
        .single()

      setProfile(profileData)
      setProviderData(profData)
    } catch (err) {
      console.error('Settings load error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <SectionLoading minHeight="min-h-[40vh]" />
    )
  }

  if (!professional) {
    return null
  }

  return (
    <div className="py-4 sm:py-6 px-0 w-full max-w-[1400px] mx-auto">
      <div className="flex items-start gap-4 mb-6">
        <Button variant="ghost" size="icon" onClick={() => router.push('/professional/dashboard')} aria-label="Back">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="text-muted-foreground">Manage your account, templates, and availability</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6 w-full">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-1 h-auto flex-wrap shrink-0 overflow-x-auto">
          <TabsTrigger value="general">Profile</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="practice">Schedule</TabsTrigger>
          {professional.type !== 'nurse' && <TabsTrigger value="scanner">Scanner</TabsTrigger>}
          {professional.type !== 'pharmacy' && <TabsTrigger value="pos">POS</TabsTrigger>}
          <TabsTrigger value="team">Team</TabsTrigger>
          <TabsTrigger value="services">Services</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="backup">Backup</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6">
          <GeneralSettings professional={professional} profile={profile} onUpdate={loadSettings} />
        </TabsContent>

        <TabsContent value="templates" className="space-y-6">
          <DocumentTemplatesSettings professional={professional} onUpdate={loadSettings} />
        </TabsContent>

        <TabsContent value="practice" className="space-y-6">
          <PracticeScheduleSettings professional={professional} onUpdate={loadSettings} />
          <TimeOffManagement professional={professional} onUpdate={loadSettings} />
        </TabsContent>

        {professional.type !== 'nurse' && (
          <TabsContent value="scanner" className="space-y-6">
            <ScannerSettings professional={professional} onUpdate={loadSettings} />
          </TabsContent>
        )}

        {professional.type !== 'pharmacy' && (
          <TabsContent value="pos" className="space-y-6">
            <ProfessionalPOSSettings professionalId={professional.id} onUpdate={loadSettings} />
          </TabsContent>
        )}

        <TabsContent value="team" className="space-y-6">
          <EmployeeManagement professional={professional} />
          <RoleEditor professional={professional} />
        </TabsContent>

        <TabsContent value="services" className="space-y-6">
          {/* Unified services list (all pro types) */}
          <ProfessionalServicesManager professionalId={professional.id} onUpdate={loadSettings} />

          {professional.type === 'doctor' && providerData && (
            <DoctorSettings doctor={providerData} professional={professional} onUpdate={loadSettings} hideAccountStatus />
          )}
          {professional.type === 'pharmacy' && (
            <>
              <DemoModeCard onToggle={loadSettings} />
              {providerData && (
                <PharmacySettings pharmacy={providerData} professional={professional} onUpdate={loadSettings} />
              )}
            </>
          )}
          {professional.type === 'laboratory' && providerData && (
            <LaboratorySettings laboratory={providerData} professional={professional} onUpdate={loadSettings} />
          )}
          {professional.type === 'clinic' && providerData && (
            <ClinicSettings clinic={providerData} professional={professional} onUpdate={loadSettings} />
          )}
          {professional.type === 'ambulance' && providerData && (
            <ClinicSettings clinic={providerData} professional={professional} onUpdate={loadSettings} variant="ambulance" />
          )}
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <PrivacySecuritySettings language={language as 'en' | 'fr' | 'ar'} compact />
        </TabsContent>

        <TabsContent value="backup" className="space-y-6">
          <BackupSettings professionalId={professional.id} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
