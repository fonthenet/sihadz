'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ArrowLeft, Network, Share2, MessageSquare, Users } from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/page-loading'
import ProviderNetwork from '@/components/provider-network'
import { MedicalReferralSystem } from '@/components/medical-referral-system'
import { useLanguage } from '@/lib/i18n/language-context'
import Link from 'next/link'

export default function NetworkPage() {
  const router = useRouter()
  const { language } = useLanguage()
  const supabase = createBrowserClient()
  
  const [isLoading, setIsLoading] = useState(true)
  const [professional, setProfessional] = useState<any>(null)
  const [activeTab, setActiveTab] = useState('network')

  // Load professional data
  useEffect(() => {
    const loadProfessional = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          router.push('/professional/auth/login')
          return
        }

        const { data, error } = await supabase
          .from('professionals')
          .select('*')
          .eq('auth_user_id', user.id)
          .single()

        if (error || !data) {
          router.push('/professional/auth/login')
          return
        }

        setProfessional(data)
      } catch (error) {
        console.error('Error loading professional:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadProfessional()
  }, [router, supabase])

  const labels = {
    ar: {
      network: 'شبكة مقدمي الخدمات',
      referrals: 'الإحالات الطبية',
      messages: 'الرسائل',
      myNetwork: 'شبكتي',
      backToDashboard: 'العودة للوحة التحكم',
      description: 'إدارة اتصالاتك مع الصيدليات والمختبرات والعيادات',
    },
    fr: {
      network: 'Réseau de prestataires',
      referrals: 'Références médicales',
      messages: 'Messages',
      myNetwork: 'Mon réseau',
      backToDashboard: 'Retour au tableau de bord',
      description: 'Gérez vos connexions avec les pharmacies, laboratoires et cliniques',
    },
    en: {
      network: 'Provider Network',
      referrals: 'Medical Referrals',
      messages: 'Messages',
      myNetwork: 'My Network',
      backToDashboard: 'Back to Dashboard',
      description: 'Manage your connections with pharmacies, laboratories, and clinics',
    },
  }

  const l = labels[language as keyof typeof labels] || labels.en

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" className="text-muted-foreground" />
      </div>
    )
  }

  if (!professional) {
    return null
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/professional/dashboard">
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-xl font-bold">{l.myNetwork}</h1>
                <p className="text-sm text-muted-foreground">{l.description}</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="network" className="gap-2">
              <Network className="h-4 w-4" />
              {l.network}
            </TabsTrigger>
            <TabsTrigger value="referrals" className="gap-2">
              <Share2 className="h-4 w-4" />
              {l.referrals}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="network">
            <ProviderNetwork
              professionalId={professional.id}
              professionalType={professional.professional_type}
              language={language as 'ar' | 'fr' | 'en'}
            />
          </TabsContent>

          <TabsContent value="referrals">
            <MedicalReferralSystem
              userRole={professional.professional_type === 'clinic' ? 'clinic' : 'doctor'}
              userId={professional.auth_user_id}
              professionalId={professional.id}
              language={language as 'ar' | 'fr' | 'en'}
            />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
