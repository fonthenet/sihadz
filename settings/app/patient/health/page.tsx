'use client'

import { useState } from 'react'
import { useLanguage } from '@/lib/i18n/language-context'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { HealthDashboard } from '@/components/patient/health-dashboard'
import { FamilyHealth } from '@/components/patient/family-health'
import { Activity, Users, FileText, Syringe } from 'lucide-react'

export default function PatientHealthPage() {
  const { language, dir } = useLanguage()
  const [activeTab, setActiveTab] = useState('overview')

  const t = (key: string) => {
    const translations: Record<string, Record<string, string>> = {
      ar: {
        'my_health': 'صحتي',
        'overview': 'نظرة عامة',
        'family': 'العائلة',
        'records': 'السجلات',
        'vaccines': 'التطعيمات',
      },
      fr: {
        'my_health': 'Ma Santé',
        'overview': 'Aperçu',
        'family': 'Famille',
        'records': 'Dossiers',
        'vaccines': 'Vaccins',
      },
      en: {
        'my_health': 'My Health',
        'overview': 'Overview',
        'family': 'Family',
        'records': 'Records',
        'vaccines': 'Vaccines',
      }
    }
    return translations[language]?.[key] || translations.en[key] || key
  }

  return (
    <div className={`min-h-screen bg-background ${dir === 'rtl' ? 'text-right' : ''}`} dir={dir}>
      <div className="container mx-auto py-8 px-4">
        <h1 className="text-3xl font-bold mb-6">{t('my_health')}</h1>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className={`grid w-full grid-cols-4 mb-6 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
            <TabsTrigger value="overview" className="gap-2">
              <Activity className="h-4 w-4" />
              <span className="hidden sm:inline">{t('overview')}</span>
            </TabsTrigger>
            <TabsTrigger value="family" className="gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">{t('family')}</span>
            </TabsTrigger>
            <TabsTrigger value="records" className="gap-2">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">{t('records')}</span>
            </TabsTrigger>
            <TabsTrigger value="vaccines" className="gap-2">
              <Syringe className="h-4 w-4" />
              <span className="hidden sm:inline">{t('vaccines')}</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <HealthDashboard />
          </TabsContent>

          <TabsContent value="family">
            <FamilyHealth />
          </TabsContent>

          <TabsContent value="records">
            <HealthDashboard />
          </TabsContent>

          <TabsContent value="vaccines">
            <FamilyHealth />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
