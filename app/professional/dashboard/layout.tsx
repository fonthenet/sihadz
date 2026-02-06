'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { Home } from 'lucide-react'
import { FullPageLoading } from '@/components/ui/page-loading'
import { createBrowserClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/auth-provider'
import { ScannerProvider } from '@/lib/scanner'
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import { OfflineSyncUserIdProvider } from '@/contexts/offline-sync-user-context'
import { NotificationCenter } from '@/components/notification-center'
import { LiveNotificationToast } from '@/components/live-notification-toast'
import { ProDashboardSidebar } from './components/pro-dashboard-sidebar'

export default function ProfessionalDashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { user, profile, refreshProfile, loading: authLoading } = useAuth()
  const [professional, setProfessional] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [isEmployeeSession, setIsEmployeeSession] = useState(false)
  const [employeePermissions, setEmployeePermissions] = useState<Record<string, Record<string, boolean>> | null>(null)
  const [employeeUsername, setEmployeeUsername] = useState<string | null>(null)

  useEffect(() => {
    if (authLoading) return
    loadProfessional()
  }, [authLoading, user])

  // Realtime + manual: refresh professional when address/settings change
  useEffect(() => {
    if (!professional?.id) return
    const supabase = createBrowserClient()
    const channel = supabase
      .channel('professional-updates')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'professionals',
        filter: `id=eq.${professional.id}`,
      }, () => {
        loadProfessional()
      })
      .subscribe()
    const onProfessionalUpdated = (e: Event) => {
      // Immediately merge event detail for instant UI update (weather widget)
      const detail = (e as CustomEvent).detail as { wilaya?: string; commune?: string; address_line1?: string } | undefined
      if (detail && professional) {
        setProfessional((prev: any) => prev ? { ...prev, ...detail } : prev)
      }
      // Also refetch full data for consistency
      loadProfessional()
    }
    window.addEventListener('professional-updated', onProfessionalUpdated)
    return () => {
      supabase.removeChannel(channel)
      window.removeEventListener('professional-updated', onProfessionalUpdated)
    }
  }, [professional?.id])

  const loadProfessional = async () => {
    try {
      // 1. Check employee session first (PIN-based staff login)
      const empRes = await fetch('/api/employee-auth/dashboard-session', { credentials: 'include' })
      if (empRes.ok) {
        const empData = await empRes.json()
        if (empData.valid && empData.professional) {
          setProfessional(empData.professional)
          setIsEmployeeSession(true)
          setEmployeePermissions(empData.permissions ? { dashboard: empData.permissions.dashboard } : null)
          setEmployeeUsername(empData.employee?.username || empData.employee?.displayName || null)
          return
        }
      }
      setEmployeePermissions(null)
      setEmployeeUsername(null)

      // 2. Fall back to Supabase auth (owner login) - use AuthProvider's user (avoids race on refresh)
      if (!user) {
        router.push('/professional/auth/login')
        return
      }
      const supabase = createBrowserClient()
      const { data: profData, error } = await supabase
        .from('professionals')
        .select('*')
        .eq('auth_user_id', user.id)
        .maybeSingle()
      if (error || !profData) {
        router.push('/professional/auth/signup')
        return
      }
      if (!profData.onboarding_completed && !profData.profile_completed) {
        router.push('/professional/onboarding')
        return
      }
      setProfessional(profData)
    } catch (err) {
      console.error('Dashboard layout load error:', err)
    } finally {
      setLoading(false)
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

  if (authLoading || loading) {
    return <FullPageLoading />
  }

  const businessName = professional?.business_name || 'Dashboard'
  const proType = professional?.type || 'doctor'
  const typeLabels: Record<string, string> = {
    pharmacy: 'Pharmacy',
    doctor: 'General Medicine',
    nurse: 'Nurse',
    laboratory: 'Laboratory',
    clinic: 'Clinic',
    ambulance: 'Ambulance',
    radiology: 'Radiology',
    dental: 'Dental',
    pharma_supplier: 'Pharmaceutical Supplier',
    equipment_supplier: 'Medical Equipment Supplier',
    other: 'Healthcare',
  }
  const subtitle = professional?.specialty || professional?.city || typeLabels[proType] || 'Dashboard'
  
  // Pages that render their own styled content (no wrapper needed)
  // - Main dashboard page: dashboard components have their own bg-slate-50 wrapper
  // - Messages: has its own full-height chat layout
  const isMainDashboard = pathname === '/professional/dashboard' || pathname === '/professional/dashboard/'
  const isMessagesPage = searchParams.get('section') === 'messages' || pathname?.includes('/messages')
  const skipWrapper = isMainDashboard || isMessagesPage

  const offlineUserId = isEmployeeSession ? professional?.auth_user_id ?? null : user?.id ?? null

  return (
    <OfflineSyncUserIdProvider userId={offlineUserId}>
    <SidebarProvider defaultOpen={true}>
      <>
        <div className="flex min-h-screen bg-background">
          <ProDashboardSidebar
            professional={professional}
            avatarUrl={profile?.avatar_url ?? professional?.avatar_url}
            authUserId={isEmployeeSession ? undefined : user?.id}
            onAvatarUpdate={refreshProfile}
            onSignOut={handleSignOut}
            employeePermissions={isEmployeeSession ? employeePermissions : null}
            employeeUsername={isEmployeeSession ? employeeUsername : null}
          />
        </div>
        <main className="flex-1 w-full min-w-0 max-w-none px-2 py-4 sm:px-4 sm:py-6 md:px-4 lg:px-6 xl:px-6">
          {/* Top bar: notifications on far right upper corner (mobile + desktop) */}
          <div className="sticky top-0 z-40 flex h-14 shrink-0 items-center justify-between gap-2 border-b bg-background/95 backdrop-blur px-4 -mx-2 sm:-mx-4 md:-mx-4 lg:-mx-6 xl:-mx-6 sm:px-4 md:px-4 lg:px-6 xl:px-6">
            <div className="md:hidden flex items-center gap-2 min-w-0 flex-1">
              <SidebarTrigger className="h-9 w-9 shrink-0" aria-label="Open menu" />
              <Link href="/professional/dashboard" className="flex items-center gap-2 min-w-0 flex-1">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-500 via-teal-500 to-cyan-600 text-white text-sm font-semibold">
                  {businessName.charAt(0).toUpperCase()}
                </span>
                <div className="min-w-0">
                  <span className="text-sm font-bold truncate block">{businessName}</span>
                  <span className="text-sm font-medium text-muted-foreground truncate block">{subtitle}</span>
                </div>
              </Link>
            </div>
            <div className="flex items-center justify-end min-w-0 ms-auto">
              <NotificationCenter
                userId={isEmployeeSession ? professional?.auth_user_id ?? null : user?.id ?? null}
                userType={professional?.type}
                compact
              />
            </div>
          </div>
          <LiveNotificationToast
            userId={isEmployeeSession ? professional?.auth_user_id ?? null : user?.id ?? null}
            userType={professional?.type}
          />
          <ScannerProvider>
            {skipWrapper ? (
              children
            ) : (
              <div className="min-h-full bg-slate-50 dark:bg-slate-950 rounded-lg py-4 sm:py-6 px-0">
                {children}
              </div>
            )}
          </ScannerProvider>
        </main>
      </>
    </SidebarProvider>
    </OfflineSyncUserIdProvider>
  )
}
