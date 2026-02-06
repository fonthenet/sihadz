'use client'

import React, { useState, useEffect, Suspense } from 'react'
import { OfflineSyncUserIdProvider } from '@/contexts/offline-sync-user-context'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useLanguage } from '@/lib/i18n/language-context'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { LanguageSwitcher } from '@/components/language-switcher'
import { NotificationCenter } from '@/components/notification-center'
import { createBrowserClient } from '@/lib/supabase'
import { SignOutButton } from '@/components/sign-out-button'
import { FullPageLoading } from '@/components/ui/page-loading'
import {
  Shield,
  LayoutDashboard,
  Users,
  Stethoscope,
  Building2,
  FlaskConical,
  Pill,
  Ambulance,
  Calendar,
  CreditCard,
  Wallet,
  MessageSquare,
  FileText,
  Settings,
  Bell,
  Search,
  Menu,
  X,
  ChevronDown,
  Database,
  Activity,
  BarChart3
} from 'lucide-react'

const menuItems = [
  { 
    id: 'dashboard', 
    href: '/super-admin', 
    icon: LayoutDashboard, 
    label: { en: 'Dashboard', fr: 'Tableau de bord', ar: 'لوحة التحكم' } 
  },
  { 
    id: 'users', 
    href: '/super-admin/users', 
    icon: Users, 
    label: { en: 'Users', fr: 'Utilisateurs', ar: 'المستخدمون' },
    badge: 'new'
  },
  { 
    id: 'doctors', 
    href: '/super-admin/doctors', 
    icon: Stethoscope, 
    label: { en: 'Doctors', fr: 'Médecins', ar: 'الأطباء' } 
  },
  { 
    id: 'clinics', 
    href: '/super-admin/clinics', 
    icon: Building2, 
    label: { en: 'Clinics', fr: 'Cliniques', ar: 'العيادات' } 
  },
  { 
    id: 'laboratories', 
    href: '/super-admin/laboratories', 
    icon: FlaskConical, 
    label: { en: 'Laboratories', fr: 'Laboratoires', ar: 'المخابر' } 
  },
  { 
    id: 'pharmacies', 
    href: '/super-admin/pharmacies', 
    icon: Pill, 
    label: { en: 'Pharmacies', fr: 'Pharmacies', ar: 'الصيدليات' } 
  },
  { 
    id: 'ambulances', 
    href: '/super-admin/ambulances', 
    icon: Ambulance, 
    label: { en: 'Ambulances', fr: 'Ambulances', ar: 'سيارات الإسعاف' } 
  },
  { 
    id: 'appointments', 
    href: '/super-admin/appointments', 
    icon: Calendar, 
    label: { en: 'Appointments', fr: 'Rendez-vous', ar: 'المواعيد' } 
  },
  { 
    id: 'payments', 
    href: '/super-admin/payments', 
    icon: CreditCard, 
    label: { en: 'Payments', fr: 'Paiements', ar: 'المدفوعات' } 
  },
  { 
    id: 'wallet', 
    href: '/super-admin/wallet', 
    icon: Wallet, 
    label: { en: 'Wallet top-ups', fr: 'Rechargements', ar: 'طلبات الشحن' } 
  },
  { 
    id: 'prescriptions', 
    href: '/super-admin/prescriptions', 
    icon: FileText, 
    label: { en: 'Prescriptions', fr: 'Ordonnances', ar: 'الوصفات' } 
  },
  { 
    id: 'reviews', 
    href: '/super-admin/reviews', 
    icon: MessageSquare, 
    label: { en: 'Reviews', fr: 'Avis', ar: 'التقييمات' } 
  },
  { 
    id: 'analytics', 
    href: '/super-admin/analytics', 
    icon: BarChart3, 
    label: { en: 'Analytics', fr: 'Analytique', ar: 'التحليلات' } 
  },
  { 
    id: 'database', 
    href: '/super-admin/database', 
    icon: Database, 
    label: { en: 'Database', fr: 'Base de données', ar: 'قاعدة البيانات' } 
  },
  { 
    id: 'settings', 
    href: '/super-admin/settings', 
    icon: Settings, 
    label: { en: 'Settings', fr: 'Paramètres', ar: 'الإعدادات' } 
  },
]

export default function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { language, dir } = useLanguage()
  const pathname = usePathname()
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [adminUser, setAdminUser] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  // Super admin emails - add your admin emails here
  const SUPER_ADMIN_EMAILS = [
    'f.onthenet@gmail.com',
    'info@sihadz.com',
    // Add more admin emails as needed
  ]

  useEffect(() => {
    const checkAdmin = async () => {
      const supabase = createBrowserClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        router.push('/login')
        return
      }

      // Check if user is a super admin by email FIRST (bypass database)
      const isSuperAdmin = SUPER_ADMIN_EMAILS.includes(user.email || '')
      
      if (isSuperAdmin) {
        // User is super admin by email - allow access immediately
        setAdminUser({ 
          ...user, 
          profile: { 
            full_name: user.email?.split('@')[0] || 'Admin',
            user_type: 'super_admin' 
          } 
        })
        setIsLoading(false)
        
        // Try to update profile in background (don't block on errors)
        try {
          await supabase
            .from('profiles')
            .upsert({ 
              id: user.id,
              email: user.email,
              full_name: user.email?.split('@')[0] || 'Admin',
              user_type: 'super_admin',
              is_verified: true
            }, { onConflict: 'id' })
        } catch (e) {
          console.log('Could not update profile, but access granted by email')
        }
        return
      }

      // Not in email list - check database profile
      try {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle()
        
        if (error) {
          console.error('Profile query error:', error)
          router.push('/')
          return
        }
        
        if (profile?.user_type !== 'admin' && profile?.user_type !== 'super_admin') {
          router.push('/')
          return
        }
        
        setAdminUser({ ...user, profile })
      } catch (err) {
        console.error('Database error:', err)
        router.push('/')
        return
      }
      
      setIsLoading(false)
    }

    checkAdmin()
  }, [router])

  const handleLogout = async () => {
    const supabase = createBrowserClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (isLoading) {
    return <FullPageLoading />
  }

  return (
    <OfflineSyncUserIdProvider userId={adminUser?.id ?? null}>
    <Suspense fallback={<FullPageLoading />}>
      <div className={`min-h-screen bg-muted/30 ${dir === 'rtl' ? 'rtl' : 'ltr'}`} dir={dir}>
        {/* Mobile Menu Overlay */}
        {mobileMenuOpen && (
          <div 
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside className={`fixed top-0 ${dir === 'rtl' ? 'right-0' : 'left-0'} z-50 h-screen bg-slate-900 text-white transition-all duration-300 ${
          sidebarOpen ? 'w-64' : 'w-20'
        } ${mobileMenuOpen ? 'translate-x-0' : dir === 'rtl' ? 'translate-x-full lg:translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
          {/* Logo */}
          <div className="flex items-center justify-between h-16 px-4 border-b border-slate-700">
            <Link href="/super-admin" className={`flex items-center gap-3 ${!sidebarOpen && 'justify-center'}`}>
              <div className="p-2 bg-primary rounded-lg">
                <Shield className="h-5 w-5 text-white" />
              </div>
              {sidebarOpen && (
                <div>
                  <span className="font-bold text-lg">SihaDZ</span>
                  <span className="text-xs block text-slate-400">Super Admin</span>
                </div>
              )}
            </Link>
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-slate-400 hover:text-white hover:bg-slate-800 hidden lg:flex"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-slate-400 hover:text-white hover:bg-slate-800 lg:hidden"
              onClick={() => setMobileMenuOpen(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Navigation */}
          <nav className="p-4 space-y-1 overflow-y-auto h-[calc(100vh-8rem)]">
            {menuItems.map((item) => {
              const isActive = pathname === item.href || (item.href !== '/super-admin' && pathname.startsWith(item.href))
              const Icon = item.icon
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                    isActive 
                      ? 'bg-primary text-white' 
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  } ${!sidebarOpen && 'justify-center'}`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Icon className="h-5 w-5 flex-shrink-0" />
                  {sidebarOpen && (
                    <>
                      <span className="flex-1">{item.label[language]}</span>
                      {item.badge && (
                        <Badge className="bg-red-500 text-white text-xs">{item.badge}</Badge>
                      )}
                    </>
                  )}
                </Link>
              )
            })}
          </nav>

          {/* User Section */}
          <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-700">
            <div className={`flex items-center gap-3 ${!sidebarOpen && 'justify-center'}`}>
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-primary text-white">
                  {adminUser?.profile?.full_name?.charAt(0) || 'A'}
                </AvatarFallback>
              </Avatar>
              {sidebarOpen && (
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{adminUser?.profile?.full_name || 'Admin'}</p>
                  <p className="text-xs text-slate-400 truncate">{adminUser?.email}</p>
                </div>
              )}
              {sidebarOpen && (
                <SignOutButton variant="icon" onClick={handleLogout} label="Sign Out" />
              )}
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <div className={`transition-all duration-300 ${
          sidebarOpen 
            ? dir === 'rtl' ? 'lg:mr-64' : 'lg:ml-64'
            : dir === 'rtl' ? 'lg:mr-20' : 'lg:ml-20'
        }`}>
          {/* Top Header */}
          <header className="sticky top-0 z-30 bg-background border-b">
            <div className="flex items-center justify-between h-16 px-4 lg:px-6">
              <div className={`flex items-center gap-4 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="lg:hidden"
                  onClick={() => setMobileMenuOpen(true)}
                >
                  <Menu className="h-5 w-5" />
                </Button>
                <div className="relative hidden sm:block">
                  <Search className={`absolute top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground ${dir === 'rtl' ? 'right-3' : 'left-3'}`} />
                  <Input
                    placeholder={language === 'ar' ? 'بحث...' : language === 'fr' ? 'Rechercher...' : 'Search...'}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className={`w-64 lg:w-80 ${dir === 'rtl' ? 'pr-10 text-right' : 'pl-10'}`}
                  />
                </div>
              </div>
              <div className={`flex items-center gap-3 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
                <NotificationCenter userId={adminUser?.id ?? null} userType="super_admin" compact />
                <LanguageSwitcher />
                <Button variant="ghost" size="icon">
                  <Activity className="h-5 w-5 text-green-500" />
                </Button>
              </div>
            </div>
          </header>

          {/* Page Content */}
          <main className="py-4 lg:py-6 px-0">
            {children}
          </main>
        </div>
      </div>
    </Suspense>
    </OfflineSyncUserIdProvider>
  )
}
