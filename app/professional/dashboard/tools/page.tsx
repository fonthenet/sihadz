'use client'

import { useState, useEffect } from 'react'
import { useLanguage } from '@/lib/i18n/language-context'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PrescriptionWriter } from '@/components/doctor/prescription-writer'
import { LabRequestForm } from '@/components/doctor/lab-request-form'
import { DigitalSignature } from '@/components/doctor/digital-signature'
import { FileText, FlaskConical, PenTool, MessageSquare } from 'lucide-react'
import { createBrowserClient } from '@/lib/supabase/client'

export default function ProfessionalToolsPage() {
  const { language, dir } = useLanguage()
  const [activeTab, setActiveTab] = useState('prescriptions')
  const [user, setUser] = useState<any>(null)
  const [professional, setProfessional] = useState<any>(null)

  useEffect(() => {
    async function loadUser() {
      const supabase = createBrowserClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUser(user)
        
        // Get professional profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, user_type')
          .eq('id', user.id)
          .single()
        
        // Get professional details
        const { data: prof } = await supabase
          .from('professionals')
          .select('type, business_name')
          .eq('auth_user_id', user.id)
          .single()
        
        setProfessional({ ...profile, ...prof })
      }
    }
    loadUser()
  }, [])

  const t = (key: string) => {
    const translations: Record<string, Record<string, string>> = {
      ar: {
        'professional_tools': 'أدوات المهنيين',
        'prescriptions': 'الوصفات',
        'lab_requests': 'طلبات المختبر',
        'signature': 'التوقيع الرقمي',
        'messages': 'الرسائل',
      },
      fr: {
        'professional_tools': 'Outils Professionnels',
        'prescriptions': 'Ordonnances',
        'lab_requests': 'Demandes Labo',
        'signature': 'Signature',
        'messages': 'Messages',
      },
      en: {
        'professional_tools': 'Professional Tools',
        'prescriptions': 'Prescriptions',
        'lab_requests': 'Lab Requests',
        'signature': 'Signature',
        'messages': 'Messages',
      }
    }
    return translations[language]?.[key] || translations.en[key] || key
  }

  return (
    <div className={`min-h-screen bg-background ${dir === 'rtl' ? 'text-right' : ''}`} dir={dir}>
      <div className="w-full py-8 px-4 sm:px-6">
        <h1 className="text-3xl font-bold mb-6">{t('professional_tools')}</h1>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className={`grid w-full grid-cols-3 mb-6 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
            <TabsTrigger value="prescriptions" className="gap-2">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">{t('prescriptions')}</span>
            </TabsTrigger>
            <TabsTrigger value="lab_requests" className="gap-2">
              <FlaskConical className="h-4 w-4" />
              <span className="hidden sm:inline">{t('lab_requests')}</span>
            </TabsTrigger>
            <TabsTrigger value="signature" className="gap-2">
              <PenTool className="h-4 w-4" />
              <span className="hidden sm:inline">{t('signature')}</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="prescriptions">
            <PrescriptionWriter />
          </TabsContent>

          <TabsContent value="lab_requests">
            <LabRequestForm />
          </TabsContent>

          <TabsContent value="signature">
            <DigitalSignature />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
