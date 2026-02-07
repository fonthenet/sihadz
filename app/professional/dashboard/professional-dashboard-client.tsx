'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { useRouter, useSearchParams } from 'next/navigation'
import { FullPageLoading } from '@/components/ui/page-loading'
import { createBrowserClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/auth-provider'
import { useToast } from '@/hooks/use-toast'

// Dynamic imports for all dashboards - reduces initial bundle size significantly
const DoctorProDashboard = dynamic(() => import('./components/doctor-pro-dashboard'), { 
  ssr: false,
  loading: () => <FullPageLoading />
})
const PharmacyProDashboard = dynamic(() => import('./components/pharmacy-pro-dashboard').then(m => ({ default: m.PharmacyProDashboard })), { 
  ssr: false,
  loading: () => <FullPageLoading />
})
const LaboratoryProDashboard = dynamic(() => import('./components/laboratory-pro-dashboard').then(m => ({ default: m.LaboratoryProDashboard })), { 
  ssr: false,
  loading: () => <FullPageLoading />
})
const ClinicProDashboard = dynamic(() => import('./components/clinic-pro-dashboard').then(m => ({ default: m.ClinicProDashboard })), { 
  ssr: false,
  loading: () => <FullPageLoading />
})
const AmbulanceDashboard = dynamic(() => import('./components/ambulance-dashboard'), { 
  ssr: false,
  loading: () => <FullPageLoading />
})
const NurseProDashboard = dynamic(() => import('./components/nurse-pro-dashboard'), { 
  ssr: false,
  loading: () => <FullPageLoading />
})
const SupplierDashboard = dynamic(() => import('./components/supplier-dashboard'), { 
  ssr: false,
  loading: () => <FullPageLoading />
})

export interface ProfessionalDashboardClientProps {
  searchParams?: Record<string, string | string[] | undefined>
}

const VALID_SECTIONS: Record<string, string[]> = {
  doctor: ['overview', 'patients', 'messages', 'pos', 'prescriptions', 'lab-requests', 'analytics', 'finances', 'documents', 'suppliers'],
  nurse: ['overview', 'schedule', 'appointments', 'patients', 'messages', 'pos', 'documents', 'settings'],
  pharmacy: ['overview', 'pos', 'prescriptions', 'orders', 'messages', 'inventory', 'warehouses', 'purchase-orders', 'chifa', 'accounting', 'delivery', 'analytics', 'finances', 'documents', 'suppliers'],
  laboratory: ['overview', 'requests', 'patients', 'samples', 'results', 'equipment', 'pos', 'analytics', 'finances', 'messages', 'documents', 'schedule', 'settings', 'suppliers', 'b2b'],
  clinic: ['overview', 'appointments', 'patients', 'doctors', 'departments', 'billing', 'pos', 'analytics', 'messages', 'documents', 'suppliers'],
  ambulance: ['overview', 'pos', 'messages', 'documents', 'settings'],
  pharma_supplier: ['overview', 'inventory', 'products', 'orders', 'buyers', 'analytics', 'messages', 'settings', 'b2b'],
  equipment_supplier: ['overview', 'inventory', 'products', 'orders', 'buyers', 'analytics', 'messages', 'settings', 'b2b'],
}

export default function ProfessionalDashboardClient({ searchParams: resolvedSearchParams }: ProfessionalDashboardClientProps) {
  const sectionParam = resolvedSearchParams?.section
  const rawSection = typeof sectionParam === 'string' ? sectionParam : null
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const { user, profile: authProfile, refreshProfile, loading: authLoading } = useAuth()
  const [isLoading, setIsLoading] = useState(true)
  const [professional, setProfessional] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [isEmployeeSession, setIsEmployeeSession] = useState(false)
  const [employeeInfo, setEmployeeInfo] = useState<{ displayName: string; username: string; avatarUrl?: string | null } | null>(null)
  const [employeePermissions, setEmployeePermissions] = useState<Record<string, Record<string, boolean>> | null>(null)

  useEffect(() => {
    if (authLoading) return
    loadDashboardData()
  }, [authLoading, user])

  // Toast when redirected from patient login (professional used wrong login)
  useEffect(() => {
    const from = searchParams.get('from')
    if (from === 'patient-login') {
      toast({
        title: 'You were redirected to your professional dashboard. Use the professional login next time.',
      })
      router.replace('/professional/dashboard', { scroll: false })
    }
  }, [searchParams, router, toast])

  const loadDashboardData = async (opts?: { silent?: boolean }) => {
    const silent = opts?.silent ?? false
    try {
      if (!silent) setIsLoading(true)
      // 1. Check employee session first (PIN-based staff login)
      const empRes = await fetch('/api/employee-auth/dashboard-session', { credentials: 'include' })
      if (empRes.ok) {
        const empData = await empRes.json()
        if (empData.valid && empData.professional) {
          setProfessional(empData.professional)
          setProfile(null)
          setIsEmployeeSession(true)
          setEmployeeInfo(empData.employee ? { displayName: empData.employee.displayName, username: empData.employee.username, avatarUrl: empData.employee.avatarUrl } : null)
          setEmployeePermissions(empData.permissions?.dashboard ? { dashboard: empData.permissions.dashboard } : null)
          return
        }
      }

      // 2. Fall back to Supabase auth (owner login) - use AuthProvider's user (avoids race on refresh)
      if (!user) {
        router.push('/professional/auth/login')
        return
      }
      const supabase = createBrowserClient()

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
      if (!silent) setIsLoading(false)
    }
  }

  const handleSignOut = async () => {
    if (isEmployeeSession) {
      await fetch('/api/employee-auth/logout', { method: 'POST', credentials: 'include' })
      router.replace('/professional/staff-login')
      return
    }
    const supabase = createBrowserClient()
    await supabase.auth.signOut()
    router.replace('/professional/auth/login')
  }

  if (authLoading || isLoading) {
    return <FullPageLoading />
  }

  const type = professional?.type || 'doctor'
  const valid = VALID_SECTIONS[type] || VALID_SECTIONS.doctor
  const sectionMap: Record<string, string> = { 'lab-requests': 'requests', 'cash-management': 'pos' }
  const mappedSection = rawSection ? (sectionMap[rawSection] || rawSection) : null
  const initialSection = mappedSection && valid.includes(mappedSection) ? mappedSection : 'overview'

  const dashboardProps = {
    professional,
    profile,
    authUserId: isEmployeeSession ? professional?.auth_user_id : user?.id,
    avatarUrl: isEmployeeSession ? employeeInfo?.avatarUrl : (authProfile?.avatar_url ?? professional?.avatar_url),
    onAvatarUpdate: refreshProfile,
    onSignOut: handleSignOut,
    onProfessionalUpdate: loadDashboardData,
    initialSection,
    employeePermissions: isEmployeeSession ? employeePermissions : null,
    employeeUsername: isEmployeeSession ? employeeInfo?.username : null,
  }

  switch (type) {
    case 'doctor':
      return <DoctorProDashboard {...dashboardProps} />
    case 'nurse':
      return <NurseProDashboard {...dashboardProps} />
    case 'pharmacy':
      return <PharmacyProDashboard {...dashboardProps} />
    case 'laboratory':
      return <LaboratoryProDashboard {...dashboardProps} />
    case 'clinic':
      return <ClinicProDashboard {...dashboardProps} />
    case 'ambulance':
      return <AmbulanceDashboard {...dashboardProps} />
    case 'pharma_supplier':
    case 'equipment_supplier':
      return <SupplierDashboard {...dashboardProps} />
    default:
      return <DoctorProDashboard {...dashboardProps} />
  }
}
