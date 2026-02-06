'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { LoadingSpinner } from '@/components/ui/page-loading'
import { createBrowserClient } from '@/lib/supabase/client'

// Import type-specific Pro dashboards
import DoctorProDashboard from './components/doctor-pro-dashboard'
import { PharmacyProDashboard } from './components/pharmacy-pro-dashboard'
import { LaboratoryProDashboard } from './components/laboratory-pro-dashboard'
import { ClinicProDashboard } from './components/clinic-pro-dashboard'
import AmbulanceDashboard from './components/ambulance-dashboard'

export default function ProfessionalDashboard() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [professional, setProfessional] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      const supabase = createBrowserClient()
      
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/professional/auth/login')
        return
      }

      // Load professional data - use maybeSingle to avoid 406 errors
      const { data: profData, error: profError } = await supabase
        .from('professionals')
        .select('*')
        .eq('auth_user_id', user.id)
        .maybeSingle()

      if (profError || !profData) {
        router.push('/professional/auth/signup')
        return
      }

      // Check if onboarding is completed
      if (!profData.onboarding_completed && !profData.profile_completed) {
        router.push('/professional/onboarding')
        return
      }

      setProfessional(profData)

      // Load profile - use maybeSingle to handle missing profiles gracefully
      const { data: profileData } = await supabase
        .from('professional_profiles')
        .select('*')
        .eq('professional_id', profData.id)
        .maybeSingle()

      setProfile(profileData)

    } catch (err) {
      console.error('Dashboard load error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSignOut = async () => {
    const supabase = createBrowserClient()
    await supabase.auth.signOut()
    router.push('/professional/auth/login')
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" className="text-primary" />
      </div>
    )
  }

  // Render type-specific dashboard
  const dashboardProps = {
    professional,
    profile,
    onSignOut: handleSignOut,
  }

  switch (professional?.type) {
    case 'doctor':
      return <DoctorProDashboard professional={professional} />
    case 'pharmacy':
      return <PharmacyProDashboard professional={professional} />
    case 'laboratory':
      return <LaboratoryProDashboard professional={professional} />
    case 'clinic':
      return <ClinicProDashboard professional={professional} />
    case 'ambulance':
      return <AmbulanceDashboard {...dashboardProps} />
    default:
      return <DoctorProDashboard professional={professional} />
  }
}
