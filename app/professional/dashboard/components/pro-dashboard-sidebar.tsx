'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { EditableAvatar } from '@/components/editable-avatar'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
  useSidebar,
} from '@/components/ui/sidebar'
import { SignOutButton } from '@/components/sign-out-button'
import { useLanguage } from '@/lib/i18n/language-context'
import { useFontSize } from '@/contexts/font-size-context'
import {
  Scan,
  LayoutDashboard,
  X,
  Calendar,
  CalendarDays,
  Users,
  Inbox,
  Pill,
  FlaskConical,
  BarChart2,
  BarChart3,
  Banknote,
  FileText,
  Cog,
  Plus,
  Home,
  Receipt,
  ShoppingCart,
  Package,
  Layers,
  Clipboard,
  ClipboardCheck,
  Stethoscope,
  Truck,
  Beaker,
  Microscope,
  Store,
  Type,
} from 'lucide-react'
import { WeatherWidget } from '@/components/weather-widget'
import { cn } from '@/lib/utils'
import { createBrowserClient } from '@/lib/supabase/client'
import { getWilayaByCode, getWilayaName } from '@/lib/data/algeria-locations'

type ProType = 'pharmacy' | 'doctor' | 'laboratory' | 'clinic' | 'ambulance'

interface ProDashboardSidebarProps {
  professional: { id?: string; business_name?: string; specialty?: string; avatar_url?: string; type?: string; city?: string; address_line1?: string; wilaya?: string; commune?: string } | null
  avatarUrl?: string | null
  authUserId?: string | null
  onAvatarUpdate?: () => void
  onSignOut: () => void
  employeePermissions?: Record<string, Record<string, boolean>> | null
  employeeUsername?: string | null
}

/** Section id -> permission keys; any true grants access. Used to filter sidebar by role. */
const PHARMACY_SECTION_KEYS: Record<string, string[]> = {
  overview: ['overview'], pos: ['pos'], prescriptions: ['prescriptions'], orders: ['orders'],
  messages: ['messages'], inventory: ['inventory'], warehouses: ['inventory'], 'purchase-orders': ['orders', 'inventory'],
  chifa: ['chifa'], accounting: ['finances'], delivery: ['delivery'], analytics: ['analytics'],
  finances: ['finances'], documents: ['documents'], suppliers: ['orders', 'inventory'], settings: ['settings'],
}
const DOCTOR_SECTION_KEYS: Record<string, string[]> = {
  overview: ['overview'], appointments: ['appointments'], patients: ['patients'], messages: ['messages'],
  prescriptions: ['prescriptions'], 'lab-requests': ['lab_requests'], pos: ['pos'], analytics: ['analytics'],
  finances: ['finances'], documents: ['documents'], suppliers: ['orders', 'inventory'], settings: ['settings'],
}
const NURSE_SECTION_KEYS: Record<string, string[]> = {
  ...DOCTOR_SECTION_KEYS,
  schedule: ['appointments', 'overview'],
}
const LAB_SECTION_KEYS: Record<string, string[]> = {
  overview: ['overview'], requests: ['requests', 'lab_requests'], patients: ['patients'], samples: ['samples'],
  results: ['results'], equipment: ['equipment'], pos: ['pos'], analytics: ['analytics'], finances: ['finances'], documents: ['documents'], suppliers: ['orders', 'inventory'], messages: ['messages'], settings: ['settings'],
}
const CLINIC_SECTION_KEYS: Record<string, string[]> = {
  overview: ['overview'], appointments: ['appointments'], patients: ['patients'], messages: ['messages'],
  pos: ['pos'], analytics: ['analytics'], finances: ['finances'], documents: ['documents'], suppliers: ['orders', 'inventory'], settings: ['settings'],
}

function canAccessSection(proType: ProType, sectionId: string | null, perms: Record<string, boolean> | null | undefined): boolean {
  if (!perms || !sectionId) return true
  const map = proType === 'pharmacy' ? PHARMACY_SECTION_KEYS : proType === 'doctor' ? DOCTOR_SECTION_KEYS : proType === 'laboratory' ? LAB_SECTION_KEYS : proType === 'clinic' ? CLINIC_SECTION_KEYS : null
  if (!map || !map[sectionId]) return true
  return map[sectionId].some(k => perms[k] === true)
}

const PHARMACY_NAV = [
  { href: '/professional/dashboard', label: 'Overview', icon: LayoutDashboard, section: 'overview' as string | null },
  { href: '/professional/dashboard?section=pos', label: 'Point of Sale', icon: Receipt, section: 'pos' },
  { href: '/professional/dashboard?section=prescriptions', label: 'Prescriptions', icon: Pill, section: 'prescriptions' },
  { href: '/professional/dashboard?section=orders', label: 'Orders', icon: ShoppingCart, section: 'orders' },
  { href: '/professional/dashboard/messages', label: 'Messages', icon: Inbox, section: 'messages' as string | null },
  { href: '/professional/dashboard?section=inventory', label: 'Inventory', icon: Package, section: 'inventory' },
  { href: '/professional/dashboard?section=warehouses', label: 'Warehouses', icon: Layers, section: 'warehouses' },
  { href: '/professional/dashboard?section=purchase-orders', label: 'Purchase Orders', icon: Clipboard, section: 'purchase-orders' },
  { href: '/professional/dashboard?section=chifa', label: 'Chifa / CNAS', icon: Stethoscope, section: 'chifa' },
  { href: '/professional/dashboard?section=accounting', label: 'Accounting', icon: BarChart2, section: 'accounting' },
  { href: '/professional/dashboard?section=delivery', label: 'Delivery', icon: Truck, section: 'delivery' },
  { href: '/professional/dashboard?section=analytics', label: 'Analytics', icon: BarChart2, section: 'analytics' },
  { href: '/professional/dashboard?section=finances', label: 'Finances', icon: Banknote, section: 'finances' },
  { href: '/professional/dashboard?section=documents', label: 'Documents', icon: FileText, section: 'documents' },
  { href: '/professional/dashboard?section=suppliers', label: 'Suppliers', icon: Truck, section: 'suppliers' },
  { href: '/professional/dashboard/storefront', label: 'Online Store', icon: Store, section: 'storefront' },
  { href: '/professional/dashboard/settings', label: 'Settings', icon: Cog, section: 'settings' },
]

const DOCTOR_NAV = [
  { href: '/professional/dashboard', label: 'Overview', icon: LayoutDashboard, section: 'overview' as string | null },
  { href: '/professional/dashboard/appointments', label: 'Appointments', icon: CalendarDays, section: 'appointments' as string | null },
  { href: '/professional/dashboard?section=patients', label: 'Patients', icon: Users, section: 'patients' },
  { href: '/professional/dashboard/messages', label: 'Messages', icon: Inbox, section: 'messages' as string | null },
  { href: '/professional/dashboard?section=pos', label: 'Point of Sale', icon: Receipt, section: 'pos' },
  { href: '/professional/dashboard?section=prescriptions', label: 'Prescriptions', icon: Pill, section: 'prescriptions' },
  { href: '/professional/dashboard?section=lab-requests', label: 'Lab Requests', icon: FlaskConical, section: 'lab-requests' },
  { href: '/professional/dashboard?section=analytics', label: 'Analytics', icon: BarChart2, section: 'analytics' },
  { href: '/professional/dashboard?section=finances', label: 'Finances', icon: Banknote, section: 'finances' },
  { href: '/professional/dashboard?section=documents', label: 'Documents', icon: FileText, section: 'documents' },
  { href: '/professional/dashboard?section=suppliers', label: 'Suppliers', icon: Truck, section: 'suppliers' },
  { href: '/professional/dashboard/storefront', label: 'Online Store', icon: Store, section: 'storefront' },
  { href: '/professional/dashboard/settings', label: 'Settings', icon: Cog, section: 'settings' },
]

const LABORATORY_NAV = [
  { href: '/professional/dashboard', label: 'Overview', icon: LayoutDashboard, section: 'overview' as string | null },
  { href: '/professional/dashboard?section=requests', label: 'Test Requests', icon: ClipboardCheck, section: 'requests' },
  { href: '/professional/dashboard?section=patients', label: 'Patients', icon: Users, section: 'patients' },
  { href: '/professional/dashboard?section=samples', label: 'Samples', icon: Beaker, section: 'samples' },
  { href: '/professional/dashboard?section=results', label: 'Results', icon: FileText, section: 'results' },
  { href: '/professional/dashboard?section=equipment', label: 'Equipment', icon: Microscope, section: 'equipment' },
  { href: '/professional/dashboard?section=pos', label: 'Point of Sale', icon: Receipt, section: 'pos' },
  { href: '/professional/dashboard?section=analytics', label: 'Analytics', icon: BarChart2, section: 'analytics' },
  { href: '/professional/dashboard?section=finances', label: 'Finances', icon: Banknote, section: 'finances' },
  { href: '/professional/dashboard?section=documents', label: 'Documents', icon: FileText, section: 'documents' },
  { href: '/professional/dashboard?section=suppliers', label: 'Suppliers', icon: Truck, section: 'suppliers' },
  { href: '/professional/dashboard/messages', label: 'Messages', icon: Inbox, section: 'messages' as string | null },
  { href: '/professional/dashboard/storefront', label: 'Online Store', icon: Store, section: 'storefront' },
  { href: '/professional/dashboard/settings', label: 'Settings', icon: Cog, section: 'settings' },
]

const CLINIC_NAV = [
  { href: '/professional/dashboard', label: 'Overview', icon: LayoutDashboard, section: 'overview' as string | null },
  { href: '/professional/dashboard/appointments', label: 'Appointments', icon: CalendarDays, section: 'appointments' as string | null },
  { href: '/professional/dashboard?section=patients', label: 'Patients', icon: Users, section: 'patients' },
  { href: '/professional/dashboard/messages', label: 'Messages', icon: Inbox, section: 'messages' as string | null },
  { href: '/professional/dashboard?section=pos', label: 'Point of Sale', icon: Receipt, section: 'pos' },
  { href: '/professional/dashboard?section=analytics', label: 'Analytics', icon: BarChart2, section: 'analytics' },
  { href: '/professional/dashboard?section=finances', label: 'Finances', icon: Banknote, section: 'finances' },
  { href: '/professional/dashboard?section=documents', label: 'Documents', icon: FileText, section: 'documents' },
  { href: '/professional/dashboard?section=suppliers', label: 'Suppliers', icon: Truck, section: 'suppliers' },
  { href: '/professional/dashboard/storefront', label: 'Online Store', icon: Store, section: 'storefront' },
  { href: '/professional/dashboard/settings', label: 'Settings', icon: Cog, section: 'settings' },
]

const AMBULANCE_NAV = [
  { href: '/professional/dashboard', label: 'Overview', icon: LayoutDashboard, section: 'overview' as string | null },
  { href: '/professional/dashboard?section=pos', label: 'Point of Sale', icon: Receipt, section: 'pos' },
  { href: '/professional/dashboard?section=messages', label: 'Messages', icon: Inbox, section: 'messages' },
  { href: '/professional/dashboard?section=documents', label: 'Documents', icon: FileText, section: 'documents' },
  { href: '/professional/dashboard/storefront', label: 'Online Store', icon: Store, section: 'storefront' },
  { href: '/professional/dashboard/settings', label: 'Settings', icon: Cog, section: 'settings' },
]

const NURSE_NAV = [
  { href: '/professional/dashboard', label: 'Overview', icon: LayoutDashboard, section: 'overview' as string | null },
  { href: '/professional/dashboard/appointments', label: 'Appointments', icon: CalendarDays, section: 'appointments' as string | null },
  { href: '/professional/dashboard?section=patients', label: 'Patients', icon: Users, section: 'patients' },
  { href: '/professional/dashboard/messages', label: 'Messages', icon: Inbox, section: 'messages' as string | null },
  { href: '/professional/dashboard?section=pos', label: 'Point of Sale', icon: Receipt, section: 'pos' },
  { href: '/professional/dashboard?section=schedule', label: 'Schedule', icon: Calendar, section: 'schedule' },
  { href: '/professional/dashboard?section=documents', label: 'Documents', icon: FileText, section: 'documents' },
  { href: '/professional/dashboard/settings', label: 'Settings', icon: Cog, section: 'settings' },
]

const SUPPLIER_NAV = [
  { href: '/professional/dashboard', label: 'Command Center', icon: LayoutDashboard, section: 'overview' as string | null },
  { href: '/professional/dashboard?section=inventory', label: 'Inventory', icon: Package, section: 'inventory' },
  { href: '/professional/dashboard?section=orders', label: 'Orders', icon: ShoppingCart, section: 'orders' },
  { href: '/professional/dashboard?section=buyers', label: 'Buyers', icon: Users, section: 'buyers' },
  { href: '/professional/dashboard?section=analytics', label: 'Analytics', icon: BarChart3, section: 'analytics' },
  { href: '/professional/dashboard?section=audit', label: 'Audit Trail', icon: ClipboardCheck, section: 'audit' },
  { href: '/professional/dashboard/messages', label: 'Messages', icon: Inbox, section: 'messages' as string | null },
  { href: '/professional/dashboard?section=settings', label: 'Settings', icon: Cog, section: 'settings' },
]

const NAV_BY_TYPE: Record<string, typeof PHARMACY_NAV> = {
  pharmacy: PHARMACY_NAV,
  doctor: DOCTOR_NAV,
  nurse: NURSE_NAV,
  laboratory: LABORATORY_NAV,
  clinic: CLINIC_NAV,
  ambulance: AMBULANCE_NAV,
  radiology: DOCTOR_NAV,
  dental: DOCTOR_NAV,
  other: DOCTOR_NAV,
  pharma_supplier: SUPPLIER_NAV,
  equipment_supplier: SUPPLIER_NAV,
}

const ACCENT_CLASSES: Record<string, string> = {
  pharmacy: 'data-[active=true]:bg-emerald-500/10 data-[active=true]:text-emerald-700 dark:data-[active=true]:text-emerald-300',
  doctor: 'data-[active=true]:bg-cyan-500/10 data-[active=true]:text-cyan-700 dark:data-[active=true]:text-cyan-300',
  nurse: 'data-[active=true]:bg-teal-500/10 data-[active=true]:text-teal-700 dark:data-[active=true]:text-teal-300',
  laboratory: 'data-[active=true]:bg-violet-500/10 data-[active=true]:text-violet-700 dark:data-[active=true]:text-violet-300',
  clinic: 'data-[active=true]:bg-blue-500/10 data-[active=true]:text-blue-700 dark:data-[active=true]:text-blue-300',
  ambulance: 'data-[active=true]:bg-amber-500/10 data-[active=true]:text-amber-700 dark:data-[active=true]:text-amber-300',
  radiology: 'data-[active=true]:bg-cyan-500/10 data-[active=true]:text-cyan-700 dark:data-[active=true]:text-cyan-300',
  dental: 'data-[active=true]:bg-cyan-500/10 data-[active=true]:text-cyan-700 dark:data-[active=true]:text-cyan-300',
  other: 'data-[active=true]:bg-cyan-500/10 data-[active=true]:text-cyan-700 dark:data-[active=true]:text-cyan-300',
  pharma_supplier: 'data-[active=true]:bg-indigo-500/10 data-[active=true]:text-indigo-700 dark:data-[active=true]:text-indigo-300',
  equipment_supplier: 'data-[active=true]:bg-rose-500/10 data-[active=true]:text-rose-700 dark:data-[active=true]:text-rose-300',
}

const CTA_BY_TYPE: Record<string, { href: string; label: string; gradient: string; icon?: typeof Plus } | null> = {
  pharmacy: { href: '/professional/dashboard/scan', label: 'Scan Prescription', gradient: 'from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 shadow-emerald-500/25', icon: Scan },
  doctor: null,
  laboratory: { href: '/professional/dashboard?section=requests', label: 'Test Requests', gradient: 'from-violet-500 to-violet-600 hover:from-violet-600 hover:to-violet-700 shadow-violet-500/25' },
  clinic: null,
  ambulance: { href: '/professional/dashboard', label: 'Dashboard', gradient: 'from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 shadow-amber-500/25' },
}

const PRO_TYPE_LABELS: Record<string, { type: string; subtitle: string }> = {
  pharmacy: { type: 'pharmacy', subtitle: 'Pharmacy' },
  doctor: { type: 'doctor', subtitle: 'General Medicine' },
  nurse: { type: 'nurse', subtitle: 'Nurse' },
  laboratory: { type: 'laboratory', subtitle: 'Laboratory' },
  clinic: { type: 'clinic', subtitle: 'Clinic' },
  ambulance: { type: 'ambulance', subtitle: 'Ambulance' },
  radiology: { type: 'doctor', subtitle: 'Radiology' },
  dental: { type: 'doctor', subtitle: 'Dental' },
  other: { type: 'doctor', subtitle: 'Healthcare' },
  pharma_supplier: { type: 'pharma_supplier', subtitle: 'Pharmaceutical Supplier' },
  equipment_supplier: { type: 'equipment_supplier', subtitle: 'Medical Equipment Supplier' },
}

function getFallbackAddress(professional: ProDashboardSidebarProps['professional']): string | null {
  if (!professional) return null
  if (professional.address_line1?.trim()) return professional.address_line1.trim()
  const w = professional.wilaya
  const wilayaObj = w ? getWilayaByCode(String(w).padStart(2, '0')) : null
  const wilayaName = wilayaObj ? getWilayaName(wilayaObj, 'en') : null
  const commune = professional.commune?.trim()
  const parts = [commune, wilayaName].filter(Boolean)
  return parts.length ? parts.join(', ') : professional.city?.trim() || null
}

export function ProDashboardSidebar({ professional, avatarUrl, authUserId, onAvatarUpdate, onSignOut, employeePermissions, employeeUsername }: ProDashboardSidebarProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { language } = useLanguage()
  const { isMobile, setOpenMobile } = useSidebar()
  const { level, cycleLevel } = useFontSize()
  const [appointmentCount, setAppointmentCount] = useState<number | null>(null)
  const [orderCount, setOrderCount] = useState<number | null>(null)
  const currentSection = pathname === '/professional/dashboard' ? searchParams.get('section') : pathname.includes('appointments') ? 'appointments' : null
  const proType = (professional?.type || 'doctor') as ProType
  const allNavItems = NAV_BY_TYPE[proType] || DOCTOR_NAV
  const dashPerms = employeePermissions?.dashboard
  const navItems = dashPerms
    ? allNavItems.filter(item => canAccessSection(proType, item.section ?? null, dashPerms))
    : allNavItems
  const accent = ACCENT_CLASSES[proType] || ACCENT_CLASSES.doctor
  const cta = CTA_BY_TYPE[proType]
  const CtaIcon = cta?.icon ?? Plus
  const labels = PRO_TYPE_LABELS[proType] || PRO_TYPE_LABELS.doctor

  const closeMobile = () => isMobile && setOpenMobile(false)

  useEffect(() => {
    if (!professional?.id || (proType !== 'doctor' && proType !== 'nurse' && proType !== 'clinic')) return
    const today = new Date().toISOString().split('T')[0]
    const supabase = createBrowserClient()
    const loadCount = async () => {
      if (proType === 'clinic') {
        const { data: team } = await supabase.from('professional_team').select('doctor_id').eq('clinic_id', professional.id)
        const doctorIds = (team || []).map((r: { doctor_id: string }) => r.doctor_id).filter(Boolean)
        if (doctorIds.length === 0) {
          setAppointmentCount(0)
          return
        }
        const { count } = await supabase
          .from('appointments')
          .select('id', { count: 'exact', head: true })
          .in('doctor_id', doctorIds)
          .gte('appointment_date', today)
          .limit(1)
        setAppointmentCount(count ?? 0)
      } else {
        const { count } = await supabase
          .from('appointments')
          .select('id', { count: 'exact', head: true })
          .eq('doctor_id', professional.id)
          .gte('appointment_date', today)
          .limit(1)
        setAppointmentCount(count ?? 0)
      }
    }
    loadCount()
  }, [professional?.id, proType])

  // Supplier: fetch order count for Orders menu badge
  useEffect(() => {
    if (proType !== 'pharma_supplier' && proType !== 'equipment_supplier') return
    const loadOrderCount = async () => {
      try {
        const res = await fetch('/api/supplier/orders?limit=1&status=submitted')
        if (res.ok) {
          const json = await res.json()
          setOrderCount(json.total ?? 0)
        }
      } catch {
        setOrderCount(null)
      }
    }
    loadOrderCount()
  }, [proType])

  // Nurse: same appointment count logic as doctor (doctor_id stores professional id)

  const isActive = (href: string, section: string | null) => {
    if (pathname.startsWith('/professional/dashboard/')) {
      return pathname === href || (href !== '/professional/dashboard' && pathname.startsWith(href + '/'))
    }
    if (pathname === '/professional/dashboard') {
      if (section) return currentSection === section
      return href === '/professional/dashboard' && !currentSection
    }
    return pathname === href
  }

  return (
    <Sidebar
      variant="inset"
      collapsible="offcanvas"
      glass
      className={cn(
        'sticky top-0 h-svh min-h-svh flex-shrink-0 w-16 md:w-[19rem] lg:w-[21rem]',
        'bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60',
        'border border-border/50 shadow-xl rounded-2xl overflow-hidden'
      )}
    >
      <SidebarHeader className={cn('p-3 md:p-4 gap-2 md:gap-3 min-w-0', isMobile ? 'pb-1' : 'pb-2 md:pb-3')}>
        <div className="flex items-center justify-between gap-2 min-w-0">
          <Link href="/professional/dashboard" onClick={closeMobile} className="flex items-center gap-3 min-w-0 group shrink-0 flex-1">
            <EditableAvatar
              userId={authUserId ?? undefined}
              src={avatarUrl ?? professional?.avatar_url}
              fallback={professional?.business_name?.charAt(0) || labels.subtitle.charAt(0)}
              professionalType={labels.type}
              size="sm"
              onUpdate={onAvatarUpdate}
              className="shrink-0"
            />
            <div className="min-w-0 hidden md:block">
              <p className="font-bold text-sm truncate">{professional?.business_name || labels.subtitle}</p>
              <p className="text-sm font-medium text-muted-foreground truncate">{professional?.specialty || professional?.city || labels.subtitle}</p>
              {employeeUsername && (
                <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400 truncate mt-0.5">As {employeeUsername}</p>
              )}
            </div>
          </Link>
          {isMobile && (
            <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0 -me-1" onClick={() => setOpenMobile(false)} aria-label="Close menu">
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        <div className="min-w-0 overflow-hidden shrink-0">
          <WeatherWidget className="w-full text-sm font-medium min-w-0 max-w-full truncate" fallbackAddress={getFallbackAddress(professional)} variant={isMobile ? 'compact' : 'minimal'} />
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2 gap-1">
        <SidebarGroup className="py-1">
          <SidebarGroupContent>
            <SidebarMenu className="gap-0.5">
              {navItems.map((item) => {
                const active = isActive(item.href, item.section ?? null)
                const showAppointmentBadge = (proType === 'doctor' || proType === 'nurse' || proType === 'clinic') && item.label === 'Appointments' && appointmentCount !== null
                const showOrderBadge = (proType === 'pharma_supplier' || proType === 'equipment_supplier') && item.section === 'orders' && orderCount !== null
                return (
                  <SidebarMenuItem key={item.href + item.label}>
                    <SidebarMenuButton asChild isActive={active} className={cn('rounded-xl h-10 px-3 hover:bg-muted/70', accent)}>
                      <Link href={item.href} onClick={closeMobile} className="flex items-center justify-start gap-3 w-full">
                        <item.icon className="h-4 w-4 shrink-0" />
                        <span className="truncate">{item.label}</span>
                        {showAppointmentBadge && (
                          <Badge className="ml-auto bg-cyan-500 text-white text-xs px-2 py-0.5 min-w-[1.25rem] justify-center flex-shrink-0">
                            {appointmentCount}
                          </Badge>
                        )}
                        {showOrderBadge && (
                          <Badge className={cn(
                            'ml-auto text-white text-xs px-2 py-0.5 min-w-[1.25rem] justify-center flex-shrink-0',
                            proType === 'pharma_supplier' ? 'bg-indigo-500' : 'bg-rose-500'
                          )}>
                            {orderCount}
                          </Badge>
                        )}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className={cn('p-3 space-y-1.5 border-t border-border/50', isMobile && 'pt-4 mt-2')}>
        {cta && (
          <Button className={cn('w-full h-9 rounded-xl bg-gradient-to-r text-white shadow-sm font-semibold text-sm', cta.gradient)} asChild>
            <Link href={cta.href} onClick={closeMobile}>
              <CtaIcon className="h-4 w-4 shrink-0 me-2" />
              <span>{cta.label}</span>
            </Link>
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="w-full h-8 rounded-xl justify-center gap-2 text-sm font-medium"
          onClick={cycleLevel}
          title={language === 'ar' ? `حجم الخط: ${level === 1 ? 'عادي' : level === 2 ? 'كبير' : 'أكبر'}` : language === 'fr' ? `Taille du texte: ${level === 1 ? 'Normal' : level === 2 ? 'Grand' : 'Très grand'}` : `Font size: ${level === 1 ? 'Normal' : level === 2 ? 'Large' : 'Larger'}`}
          aria-label={language === 'ar' ? 'تكبير النص' : language === 'fr' ? 'Agrandir le texte' : 'Increase font size'}
        >
          <Type className="h-4 w-4 shrink-0" />
          <span className="truncate">
            {language === 'ar' ? (level === 1 ? 'عادي' : level === 2 ? 'كبير' : 'أكبر') : language === 'fr' ? (level === 1 ? 'Normal' : level === 2 ? 'Grand' : 'Très grand') : (level === 1 ? 'Normal' : level === 2 ? 'Large' : 'Larger')}
          </span>
        </Button>
        <div className="flex gap-1.5">
          <Button
            variant="ghost"
            className="flex-1 h-8 rounded-xl justify-center gap-1.5 text-sm font-medium bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/40"
            asChild
          >
            <Link href="/" onClick={closeMobile}>
              <Home className="h-4 w-4 shrink-0" />
              <span>Home</span>
            </Link>
          </Button>
          <SignOutButton
            onClick={() => { closeMobile(); onSignOut() }}
            label="Sign Out"
            className="flex-1"
          />
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
