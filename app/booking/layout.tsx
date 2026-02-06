'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useLanguage } from '@/lib/i18n/language-context'
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInset,
  SidebarSeparator,
  SidebarTrigger,
} from '@/components/ui/sidebar'
import {
  Home,
  Calendar,
  LayoutDashboard,
} from 'lucide-react'
function BookingSidebar() {
  const pathname = usePathname()
  const { language } = useLanguage()

  const t = (en: string, fr: string, ar: string) =>
    language === 'ar' ? ar : language === 'fr' ? fr : en

  const isActive = (href: string) => {
    return pathname === href || pathname.startsWith(`${href}/`)
  }

  const isRtl = language === 'ar'

  return (
    <Sidebar
      variant="inset"
      collapsible="icon"
      side={isRtl ? 'right' : 'left'}
      className="border-r border-sidebar-border/60"
    >
      <SidebarHeader>
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Home className="h-4 w-4" />
            </span>
            <span className="text-xs font-semibold">
              {t('Home', 'Accueil', 'الرئيسية')}
            </span>
          </Link>
          <SidebarTrigger className="md:hidden" />
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={isActive('/dashboard')}
                >
                  <Link href="/dashboard">
                    <LayoutDashboard className="h-4 w-4" />
                    <span>{t('Dashboard', 'Tableau de bord', 'لوحة التحكم')}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={isActive('/booking/new')}
                >
                  <Link href="/booking/new">
                    <Calendar className="h-4 w-4" />
                    <span>{t('New Booking', 'Nouveau rendez-vous', 'حجز موعد')}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter />
    </Sidebar>
  )
}

export default function BookingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen bg-background">
        <BookingSidebar />
        <SidebarInset>
          <main className="w-full px-6 py-6 md:px-8">{children}</main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  )
}

