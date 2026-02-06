'use client'

import React, { useState, useEffect } from 'react'
import { useLanguage } from '@/lib/i18n/language-context'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { createBrowserClient } from '@/lib/supabase'
import {
  Users,
  Stethoscope,
  Building2,
  FlaskConical,
  Pill,
  Calendar,
  CreditCard,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Activity,
  Eye
} from 'lucide-react'
import Link from 'next/link'
import { ProfessionalApprovals } from '@/app/super-admin/components/professional-approvals'

interface Stats {
  totalUsers: number
  totalDoctors: number
  totalClinics: number
  totalLabs: number
  totalPharmacies: number
  totalAppointments: number
  pendingAppointments: number
  todayAppointments: number
  totalRevenue: number
  pendingVerifications: number
}

interface RecentActivity {
  id: string
  type: string
  message: string
  timestamp: string
  status?: string
}

export default function SuperAdminDashboard() {
  const { language, dir } = useLanguage()
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    totalDoctors: 0,
    totalClinics: 0,
    totalLabs: 0,
    totalPharmacies: 0,
    totalAppointments: 0,
    pendingAppointments: 0,
    todayAppointments: 0,
    totalRevenue: 0,
    pendingVerifications: 0
  })
  const [recentAppointments, setRecentAppointments] = useState<any[]>([])
  const [pendingVerifications, setPendingVerifications] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const texts = {
    en: {
      dashboard: 'Super Admin Dashboard',
      welcome: 'Welcome back! Here\'s an overview of your platform.',
      totalUsers: 'Total Users',
      totalDoctors: 'Total Doctors',
      totalClinics: 'Total Clinics',
      totalLabs: 'Total Laboratories',
      totalPharmacies: 'Total Pharmacies',
      totalAppointments: 'Total Appointments',
      pendingAppointments: 'Pending Appointments',
      todayAppointments: 'Today\'s Appointments',
      pendingVerifications: 'Pending Verifications',
      totalRevenue: 'Total Revenue',
      recentAppointments: 'Recent Appointments',
      pendingApprovals: 'Pending Approvals',
      viewAll: 'View All',
      approve: 'Approve',
      reject: 'Reject',
      view: 'View',
      patient: 'Patient',
      doctor: 'Doctor',
      date: 'Date',
      status: 'Status',
      amount: 'Amount',
      dzd: 'DZD',
      confirmed: 'Confirmed',
      pending: 'Pending',
      cancelled: 'Cancelled',
      completed: 'Completed',
      quickStats: 'Quick Stats',
      systemHealth: 'System Health',
      operational: 'Operational',
      noData: 'No data available'
    },
    fr: {
      dashboard: 'Tableau de bord Super Admin',
      welcome: 'Bienvenue! Voici un aperçu de votre plateforme.',
      totalUsers: 'Total Utilisateurs',
      totalDoctors: 'Total Médecins',
      totalClinics: 'Total Cliniques',
      totalLabs: 'Total Laboratoires',
      totalPharmacies: 'Total Pharmacies',
      totalAppointments: 'Total Rendez-vous',
      pendingAppointments: 'Rendez-vous en attente',
      todayAppointments: 'Rendez-vous aujourd\'hui',
      pendingVerifications: 'Vérifications en attente',
      totalRevenue: 'Revenus Totaux',
      recentAppointments: 'Rendez-vous Récents',
      pendingApprovals: 'Approbations en attente',
      viewAll: 'Voir tout',
      approve: 'Approuver',
      reject: 'Rejeter',
      view: 'Voir',
      patient: 'Patient',
      doctor: 'Médecin',
      date: 'Date',
      status: 'Statut',
      amount: 'Montant',
      dzd: 'DZD',
      confirmed: 'Confirmé',
      pending: 'En attente',
      cancelled: 'Annulé',
      completed: 'Terminé',
      quickStats: 'Stats Rapides',
      systemHealth: 'Santé du Système',
      operational: 'Opérationnel',
      noData: 'Aucune donnée disponible'
    },
    ar: {
      dashboard: 'لوحة تحكم المدير العام',
      welcome: 'مرحباً بعودتك! إليك نظرة عامة على منصتك.',
      totalUsers: 'إجمالي المستخدمين',
      totalDoctors: 'إجمالي الأطباء',
      totalClinics: 'إجمالي العيادات',
      totalLabs: 'إجمالي المخابر',
      totalPharmacies: 'إجمالي الصيدليات',
      totalAppointments: 'إجمالي المواعيد',
      pendingAppointments: 'المواعيد المعلقة',
      todayAppointments: 'مواعيد اليوم',
      pendingVerifications: 'طلبات التحقق المعلقة',
      totalRevenue: 'إجمالي الإيرادات',
      recentAppointments: 'المواعيد الأخيرة',
      pendingApprovals: 'الموافقات المعلقة',
      viewAll: 'عرض الكل',
      approve: 'موافقة',
      reject: 'رفض',
      view: 'عرض',
      patient: 'المريض',
      doctor: 'الطبيب',
      date: 'التاريخ',
      status: 'الحالة',
      amount: 'المبلغ',
      dzd: 'د.ج',
      confirmed: 'مؤكد',
      pending: 'قيد الانتظار',
      cancelled: 'ملغي',
      completed: 'مكتمل',
      quickStats: 'إحصائيات سريعة',
      systemHealth: 'صحة النظام',
      operational: 'يعمل',
      noData: 'لا توجد بيانات'
    }
  }

  const t = texts[language]

  useEffect(() => {
    const fetchStats = async () => {
      const supabase = createBrowserClient()
      
      try {
        // Fetch all counts in parallel
        const [
          usersRes,
          doctorsRes,
          clinicsRes,
          labsRes,
          pharmaciesRes,
          appointmentsRes,
          pendingApptRes,
          todayApptRes,
          paymentsRes,
          pendingVerifRes,
          recentApptRes
        ] = await Promise.all([
          supabase.from('profiles').select('id', { count: 'exact', head: true }),
          supabase.from('doctors').select('id', { count: 'exact', head: true }),
          supabase.from('clinics').select('id', { count: 'exact', head: true }),
          supabase.from('laboratories').select('id', { count: 'exact', head: true }),
          supabase.from('pharmacies').select('id', { count: 'exact', head: true }),
          supabase.from('appointments').select('id', { count: 'exact', head: true }),
          supabase.from('appointments').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
          supabase.from('appointments').select('id', { count: 'exact', head: true }).eq('appointment_date', new Date().toISOString().split('T')[0]),
          supabase.from('payments').select('amount').eq('status', 'paid'),
          supabase.from('professionals').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
          supabase.from('appointments').select(`
            id,
            appointment_date,
            appointment_time,
            status,
            visit_type,
            consultation_fee,
            patient_id,
            doctor_id
          `).order('created_at', { ascending: false }).limit(5)
        ])

        const totalRevenue = paymentsRes.data?.reduce((sum, p) => sum + (Number(p.amount) || 0), 0) || 0

        setStats({
          totalUsers: usersRes.count || 0,
          totalDoctors: doctorsRes.count || 0,
          totalClinics: clinicsRes.count || 0,
          totalLabs: labsRes.count || 0,
          totalPharmacies: pharmaciesRes.count || 0,
          totalAppointments: appointmentsRes.count || 0,
          pendingAppointments: pendingApptRes.count || 0,
          todayAppointments: todayApptRes.count || 0,
          totalRevenue,
          pendingVerifications: pendingVerifRes.count || 0
        })

        setRecentAppointments(recentApptRes.data || [])

        // Fetch pending verifications (pending or waiting_approval status)
        const { data: pendingData } = await supabase
          .from('professionals')
          .select('id, type, business_name, created_at')
          .in('status', ['pending', 'waiting_approval'])
          .limit(5)

        setPendingVerifications(pendingData || [])

      } catch (error) {
        console.error('Error fetching stats:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchStats()
  }, [])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat(language === 'ar' ? 'ar-DZ' : language === 'fr' ? 'fr-DZ' : 'en-US').format(amount)
  }

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      confirmed: 'bg-green-100 text-green-800 border-green-200',
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      completed: 'bg-blue-100 text-blue-800 border-blue-200',
      cancelled: 'bg-red-100 text-red-800 border-red-200',
      pending_approval: 'bg-orange-100 text-orange-800 border-orange-200'
    }
    const labels: Record<string, string> = {
      confirmed: t.confirmed,
      pending: t.pending,
      completed: t.completed,
      cancelled: t.cancelled,
      pending_approval: t.pending
    }
    return <Badge className={styles[status] || styles.pending}>{labels[status] || status}</Badge>
  }

  const StatCard = ({ 
    title, 
    value, 
    icon: Icon, 
    color, 
    href,
    subValue 
  }: { 
    title: string
    value: number | string
    icon: React.ElementType
    color: string
    href?: string
    subValue?: string
  }) => (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="pt-6">
        <div className={`flex items-start justify-between ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
          <div className={dir === 'rtl' ? 'text-right' : ''}>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold mt-1">{value}</p>
            {subValue && (
              <p className="text-xs text-muted-foreground mt-1">{subValue}</p>
            )}
          </div>
          <div className={`p-3 rounded-xl ${color}`}>
            <Icon className="h-6 w-6 text-white" />
          </div>
        </div>
        {href && (
          <Link href={href} className="inline-flex items-center gap-1 text-sm text-primary mt-3 hover:underline">
            {t.viewAll}
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        )}
      </CardContent>
    </Card>
  )

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(8)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="pt-6">
                <div className="h-20 bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className={dir === 'rtl' ? 'text-right' : ''}>
        <h1 className="text-3xl font-bold">{t.dashboard}</h1>
        <p className="text-muted-foreground mt-1">{t.welcome}</p>
      </div>

      {/* System Health Banner */}
      <Card className="bg-gradient-to-r from-green-500 to-emerald-600 text-white">
        <CardContent className="py-4">
          <div className={`flex items-center gap-3 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
            <div className="p-2 bg-white/20 rounded-lg">
              <Activity className="h-5 w-5" />
            </div>
            <div>
              <p className="font-medium">{t.systemHealth}</p>
              <p className="text-sm text-white/80">{t.operational}</p>
            </div>
            <Badge className="bg-white/20 text-white border-0 ml-auto">Online</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard 
          title={t.totalUsers} 
          value={formatCurrency(stats.totalUsers)} 
          icon={Users} 
          color="bg-blue-500"
          href="/super-admin/users"
        />
        <StatCard 
          title={t.totalDoctors} 
          value={formatCurrency(stats.totalDoctors)} 
          icon={Stethoscope} 
          color="bg-green-500"
          href="/super-admin/doctors"
        />
        <StatCard 
          title={t.totalClinics} 
          value={formatCurrency(stats.totalClinics)} 
          icon={Building2} 
          color="bg-purple-500"
          href="/super-admin/clinics"
        />
        <StatCard 
          title={t.totalLabs} 
          value={formatCurrency(stats.totalLabs)} 
          icon={FlaskConical} 
          color="bg-orange-500"
          href="/super-admin/laboratories"
        />
        <StatCard 
          title={t.totalPharmacies} 
          value={formatCurrency(stats.totalPharmacies)} 
          icon={Pill} 
          color="bg-pink-500"
          href="/super-admin/pharmacies"
        />
        <StatCard 
          title={t.totalAppointments} 
          value={formatCurrency(stats.totalAppointments)} 
          icon={Calendar} 
          color="bg-cyan-500"
          href="/super-admin/appointments"
        />
        <StatCard 
          title={t.todayAppointments} 
          value={stats.todayAppointments} 
          icon={Clock} 
          color="bg-amber-500"
          subValue={`${stats.pendingAppointments} ${t.pending.toLowerCase()}`}
        />
        <StatCard 
          title={t.totalRevenue} 
          value={`${formatCurrency(stats.totalRevenue)} ${t.dzd}`} 
          icon={CreditCard} 
          color="bg-emerald-500"
          href="/super-admin/payments"
        />
      </div>

      {/* Bottom Section */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Appointments */}
        <Card>
          <CardHeader className={`flex flex-row items-center justify-between ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
            <div className={dir === 'rtl' ? 'text-right' : ''}>
              <CardTitle>{t.recentAppointments}</CardTitle>
              <CardDescription>{stats.totalAppointments} total</CardDescription>
            </div>
            <Link href="/super-admin/appointments">
              <Button variant="outline" size="sm" className="bg-transparent">{t.viewAll}</Button>
            </Link>
          </CardHeader>
          <CardContent>
            {recentAppointments.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">{t.noData}</p>
            ) : (
              <div className="space-y-4">
                {recentAppointments.map((apt) => (
                  <div 
                    key={apt.id} 
                    className={`flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}
                  >
                    <div className={`flex items-center gap-3 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
                      <div className={`p-2 rounded-lg ${apt.visit_type === 'e-visit' ? 'bg-purple-100' : apt.visit_type === 'home-visit' ? 'bg-green-100' : 'bg-blue-100'}`}>
                        <Calendar className={`h-4 w-4 ${apt.visit_type === 'e-visit' ? 'text-purple-600' : apt.visit_type === 'home-visit' ? 'text-green-600' : 'text-blue-600'}`} />
                      </div>
                      <div className={dir === 'rtl' ? 'text-right' : ''}>
                        <p className="font-medium text-sm">
                          {apt.appointment_date} {apt.appointment_time || ''}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {apt.visit_type === 'e-visit' ? 'Video' : apt.visit_type === 'home-visit' ? 'Home' : 'In-Person'} - {apt.consultation_fee} {t.dzd}
                        </p>
                      </div>
                    </div>
                    {getStatusBadge(apt.status)}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Professional Approvals Section - Full Width */}
        <div className="mb-6">
          <ProfessionalApprovals />
        </div>

        {/* Pending Verifications */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pending Approvals Summary */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg">{t.pendingApprovals}</CardTitle>
                <CardDescription>{language === 'en' ? 'New professionals waiting for approval' : language === 'fr' ? 'Nouveaux professionnels en attente d\'approbation' : 'متخصصون جدد ينتظرون الموافقة'}</CardDescription>
              </div>
              <Link href="/super-admin/verifications">
                <Button variant="outline" size="sm" className="bg-transparent">{t.viewAll}</Button>
              </Link>
            </CardHeader>
            <CardContent>
              {pendingVerifications.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
                  <p className="text-muted-foreground">{language === 'en' ? 'No pending verifications' : language === 'fr' ? 'Aucune vérification en attente' : 'لا توجد طلبات تحقق معلقة'}</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {pendingVerifications.map((item) => (
                    <div 
                      key={item.id} 
                      className={`flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}
                    >
                      <div className={`flex items-center gap-3 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
                        <div className="p-2 rounded-lg bg-amber-100">
                          <AlertTriangle className="h-4 w-4 text-amber-600" />
                        </div>
                        <div className={dir === 'rtl' ? 'text-right' : ''}>
                          <p className="font-medium text-sm">{item.business_name || 'Unknown'}</p>
                          <p className="text-xs text-muted-foreground capitalize">{item.type}</p>
                        </div>
                      </div>
                      <div className={`flex items-center gap-2 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
                        <Button size="sm" variant="outline" className="bg-transparent">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button size="sm" className="bg-green-500 hover:bg-green-600">
                          <CheckCircle className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="destructive">
                          <XCircle className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
