'use client'

import React, { useState, useEffect } from 'react'
import { useLanguage } from '@/lib/i18n/language-context'
import { useUrlTab } from '@/hooks/use-url-tab'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import {
  Settings,
  Globe,
  Bell,
  Shield,
  CreditCard,
  Mail,
  Smartphone,
  Database,
  Palette,
  Languages,
  Save,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Server,
  Lock,
  Users,
  FileText,
  Zap,
  HardDrive,
  Download,
  Trash2,
  Search,
  Clock,
  Cloud,
  User,
  MessageCircle
} from 'lucide-react'
import { PrivacySecuritySettings } from '@/components/settings/privacy-security-settings'
import { toast } from 'sonner'

const ADMIN_TABS = ['account', 'general', 'features', 'chat', 'notifications', 'payments', 'security', 'providers', 'backups'] as const

export default function PlatformSettingsPage() {
  const { language, dir } = useLanguage()
  const [isSaving, setIsSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useUrlTab('tab', ADMIN_TABS, 'general')
  
  // Platform settings state
  const [settings, setSettings] = useState({
    // General
    platformName: 'SihaDZ',
    platformNameAr: 'صحة دز',
    contactEmail: 'support@sihadz.com',
    contactPhone: '+213 555 123 456',
    defaultLanguage: 'ar',
    maintenanceMode: false,
    
    // Features
    enableGuestBooking: true,
    enableEVisit: true,
    enableHomeVisit: true,
    enablePrescriptions: true,
    enableLabRequests: true,
    enableAIAnalysis: true,
    enableRatings: true,
    
    // Chat
    enablePatientToDoctorChat: true,
    enablePatientToPharmacyChat: true,
    enablePatientToLabChat: true,
    enableDoctorToDoctorChat: true,
    enableProviderToProviderChat: true,
    
    // Notifications
    emailNotifications: true,
    smsNotifications: false,
    pushNotifications: true,
    
    // Payments
    enableOnlinePayments: true,
    enableCashPayments: true,
    defaultCurrency: 'DZD',
    platformFeePercentage: 5,
    
    // Security
    requireEmailVerification: true,
    requirePhoneVerification: false,
    sessionTimeout: 30,
    maxLoginAttempts: 5,
    
    // Doctor Settings
    autoApproveVerifiedDoctors: false,
    requireLicenseVerification: true,
    minConsultationFee: 1000,
    maxConsultationFee: 10000,
  })

  // Load settings from database on mount
  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      const res = await fetch('/api/admin/platform-settings')
      if (res.ok) {
        const data = await res.json()
        const dbSettings = data.settings || {}
        
        // Merge chat settings from database
        if (dbSettings.chat) {
          setSettings(prev => ({
            ...prev,
            enablePatientToDoctorChat: dbSettings.chat.enable_patient_to_doctor_chat ?? true,
            enablePatientToPharmacyChat: dbSettings.chat.enable_patient_to_pharmacy_chat ?? true,
            enablePatientToLabChat: dbSettings.chat.enable_patient_to_lab_chat ?? true,
            enableDoctorToDoctorChat: dbSettings.chat.enable_doctor_to_doctor_chat ?? true,
            enableProviderToProviderChat: dbSettings.chat.enable_provider_to_provider_chat ?? true,
          }))
        }
        
        // Merge features settings from database
        if (dbSettings.features) {
          setSettings(prev => ({
            ...prev,
            enableGuestBooking: dbSettings.features.enable_guest_booking ?? true,
            enableEVisit: dbSettings.features.enable_e_visit ?? true,
            enableHomeVisit: dbSettings.features.enable_home_visit ?? true,
            enablePrescriptions: dbSettings.features.enable_prescriptions ?? true,
            enableLabRequests: dbSettings.features.enable_lab_requests ?? true,
            enableAIAnalysis: dbSettings.features.enable_ai_analysis ?? true,
            enableRatings: dbSettings.features.enable_ratings ?? true,
          }))
        }
      }
    } catch (error) {
      console.error('Failed to load settings:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const texts = {
    en: {
      title: 'Platform Settings',
      description: 'Configure global platform settings and preferences',
      general: 'General',
      features: 'Features',
      notifications: 'Notifications',
      payments: 'Payments',
      security: 'Security',
      providers: 'Providers',
      save: 'Save Changes',
      saving: 'Saving...',
      reset: 'Reset',
      platformName: 'Platform Name',
      platformNameAr: 'Platform Name (Arabic)',
      contactEmail: 'Contact Email',
      contactPhone: 'Contact Phone',
      defaultLanguage: 'Default Language',
      maintenanceMode: 'Maintenance Mode',
      maintenanceModeDesc: 'Enable to show maintenance page to users',
      enableGuestBooking: 'Guest Booking',
      enableGuestBookingDesc: 'Allow users to book without registration',
      enableEVisit: 'Video Consultations',
      enableEVisitDesc: 'Enable video/e-visit appointments',
      enableHomeVisit: 'Home Visits',
      enableHomeVisitDesc: 'Enable doctors to offer home visits',
      enablePrescriptions: 'Digital Prescriptions',
      enablePrescriptionsDesc: 'Enable digital prescription system',
      enableLabRequests: 'Lab Requests',
      enableLabRequestsDesc: 'Enable lab test requests',
      enableAIAnalysis: 'AI Analysis',
      enableAIAnalysisDesc: 'Enable AI-powered health analysis',
      enableRatings: 'Reviews & Ratings',
      enableRatingsDesc: 'Allow patients to rate doctors',
      emailNotifications: 'Email Notifications',
      emailNotificationsDesc: 'Send notifications via email',
      smsNotifications: 'SMS Notifications',
      smsNotificationsDesc: 'Send notifications via SMS',
      pushNotifications: 'Push Notifications',
      pushNotificationsDesc: 'Send push notifications to mobile apps',
      enableOnlinePayments: 'Online Payments',
      enableOnlinePaymentsDesc: 'Accept online payments',
      enableCashPayments: 'Cash Payments',
      enableCashPaymentsDesc: 'Accept cash payments at clinic',
      defaultCurrency: 'Default Currency',
      platformFee: 'Platform Fee (%)',
      platformFeeDesc: 'Percentage fee charged on each transaction',
      requireEmailVerification: 'Require Email Verification',
      requireEmailVerificationDesc: 'Users must verify email to use platform',
      requirePhoneVerification: 'Require Phone Verification',
      requirePhoneVerificationDesc: 'Users must verify phone number',
      sessionTimeout: 'Session Timeout (minutes)',
      maxLoginAttempts: 'Max Login Attempts',
      autoApproveVerifiedDoctors: 'Auto-Approve Doctors',
      autoApproveVerifiedDoctorsDesc: 'Automatically approve doctors with valid licenses',
      requireLicenseVerification: 'Require License Verification',
      requireLicenseVerificationDesc: 'Doctors must upload valid medical license',
      minConsultationFee: 'Minimum Consultation Fee',
      maxConsultationFee: 'Maximum Consultation Fee',
      dzd: 'DZD',
      arabic: 'Arabic',
      french: 'French',
      english: 'English',
      enabled: 'Enabled',
      disabled: 'Disabled',
      warning: 'Warning',
      maintenanceWarning: 'Enabling maintenance mode will prevent all users from accessing the platform.'
    },
    fr: {
      title: 'Paramètres de la Plateforme',
      description: 'Configurer les paramètres globaux de la plateforme',
      general: 'Général',
      features: 'Fonctionnalités',
      notifications: 'Notifications',
      payments: 'Paiements',
      security: 'Sécurité',
      providers: 'Fournisseurs',
      save: 'Enregistrer',
      saving: 'Enregistrement...',
      reset: 'Réinitialiser',
      platformName: 'Nom de la plateforme',
      platformNameAr: 'Nom de la plateforme (Arabe)',
      contactEmail: 'Email de contact',
      contactPhone: 'Téléphone de contact',
      defaultLanguage: 'Langue par défaut',
      maintenanceMode: 'Mode maintenance',
      maintenanceModeDesc: 'Activer pour afficher la page de maintenance',
      enableGuestBooking: 'Réservation invité',
      enableGuestBookingDesc: 'Permettre les réservations sans inscription',
      enableEVisit: 'Téléconsultations',
      enableEVisitDesc: 'Activer les consultations vidéo',
      enableHomeVisit: 'Visites à domicile',
      enableHomeVisitDesc: 'Permettre aux médecins d\'offrir des visites à domicile',
      enablePrescriptions: 'Ordonnances numériques',
      enablePrescriptionsDesc: 'Activer le système d\'ordonnances numériques',
      enableLabRequests: 'Demandes de laboratoire',
      enableLabRequestsDesc: 'Activer les demandes de tests de laboratoire',
      enableAIAnalysis: 'Analyse IA',
      enableAIAnalysisDesc: 'Activer l\'analyse de santé par IA',
      enableRatings: 'Avis et notes',
      enableRatingsDesc: 'Permettre aux patients de noter les médecins',
      emailNotifications: 'Notifications par email',
      emailNotificationsDesc: 'Envoyer des notifications par email',
      smsNotifications: 'Notifications SMS',
      smsNotificationsDesc: 'Envoyer des notifications par SMS',
      pushNotifications: 'Notifications push',
      pushNotificationsDesc: 'Envoyer des notifications push',
      enableOnlinePayments: 'Paiements en ligne',
      enableOnlinePaymentsDesc: 'Accepter les paiements en ligne',
      enableCashPayments: 'Paiements en espèces',
      enableCashPaymentsDesc: 'Accepter les paiements en espèces',
      defaultCurrency: 'Devise par défaut',
      platformFee: 'Frais de plateforme (%)',
      platformFeeDesc: 'Pourcentage prélevé sur chaque transaction',
      requireEmailVerification: 'Vérification email requise',
      requireEmailVerificationDesc: 'Les utilisateurs doivent vérifier leur email',
      requirePhoneVerification: 'Vérification téléphone requise',
      requirePhoneVerificationDesc: 'Les utilisateurs doivent vérifier leur numéro',
      sessionTimeout: 'Expiration de session (minutes)',
      maxLoginAttempts: 'Tentatives de connexion max',
      autoApproveVerifiedDoctors: 'Approbation auto des médecins',
      autoApproveVerifiedDoctorsDesc: 'Approuver automatiquement les médecins avec licence valide',
      requireLicenseVerification: 'Vérification de licence requise',
      requireLicenseVerificationDesc: 'Les médecins doivent télécharger une licence médicale valide',
      minConsultationFee: 'Tarif de consultation minimum',
      maxConsultationFee: 'Tarif de consultation maximum',
      dzd: 'DZD',
      arabic: 'Arabe',
      french: 'Français',
      english: 'Anglais',
      enabled: 'Activé',
      disabled: 'Désactivé',
      warning: 'Attention',
      maintenanceWarning: 'L\'activation du mode maintenance empêchera tous les utilisateurs d\'accéder à la plateforme.'
    },
    ar: {
      title: 'إعدادات المنصة',
      description: 'تكوين إعدادات المنصة العامة',
      general: 'عام',
      features: 'الميزات',
      notifications: 'الإشعارات',
      payments: 'المدفوعات',
      security: 'الأمان',
      providers: 'مقدمي الخدمات',
      save: 'حفظ التغييرات',
      saving: 'جاري الحفظ...',
      reset: 'إعادة تعيين',
      platformName: 'اسم المنصة',
      platformNameAr: 'اسم المنصة (عربي)',
      contactEmail: 'البريد الإلكتروني للتواصل',
      contactPhone: 'هاتف التواصل',
      defaultLanguage: 'اللغة الافتراضية',
      maintenanceMode: 'وضع الصيانة',
      maintenanceModeDesc: 'تفعيل لعرض صفحة الصيانة للمستخدمين',
      enableGuestBooking: 'حجز الضيوف',
      enableGuestBookingDesc: 'السماح بالحجز بدون تسجيل',
      enableEVisit: 'الاستشارات المرئية',
      enableEVisitDesc: 'تفعيل المواعيد عبر الفيديو',
      enableHomeVisit: 'الزيارات المنزلية',
      enableHomeVisitDesc: 'تمكين الأطباء من تقديم زيارات منزلية',
      enablePrescriptions: 'الوصفات الرقمية',
      enablePrescriptionsDesc: 'تفعيل نظام الوصفات الرقمية',
      enableLabRequests: 'طلبات المخبر',
      enableLabRequestsDesc: 'تفعيل طلبات الفحوصات المخبرية',
      enableAIAnalysis: 'تحليل الذكاء الاصطناعي',
      enableAIAnalysisDesc: 'تفعيل التحليل الصحي بالذكاء الاصطناعي',
      enableRatings: 'التقييمات والمراجعات',
      enableRatingsDesc: 'السماح للمرضى بتقييم الأطباء',
      emailNotifications: 'إشعارات البريد الإلكتروني',
      emailNotificationsDesc: 'إرسال الإشعارات عبر البريد الإلكتروني',
      smsNotifications: 'إشعارات الرسائل القصيرة',
      smsNotificationsDesc: 'إرسال الإشعارات عبر الرسائل القصيرة',
      pushNotifications: 'الإشعارات الفورية',
      pushNotificationsDesc: 'إرسال إشعارات فورية للتطبيقات',
      enableOnlinePayments: 'الدفع الإلكتروني',
      enableOnlinePaymentsDesc: 'قبول المدفوعات الإلكترونية',
      enableCashPayments: 'الدفع النقدي',
      enableCashPaymentsDesc: 'قبول الدفع النقدي في العيادة',
      defaultCurrency: 'العملة الافتراضية',
      platformFee: 'رسوم المنصة (%)',
      platformFeeDesc: 'النسبة المئوية المخصومة من كل معاملة',
      requireEmailVerification: 'التحقق من البريد الإلكتروني مطلوب',
      requireEmailVerificationDesc: 'يجب على المستخدمين التحقق من بريدهم الإلكتروني',
      requirePhoneVerification: 'التحقق من الهاتف مطلوب',
      requirePhoneVerificationDesc: 'يجب على المستخدمين التحقق من رقم هاتفهم',
      sessionTimeout: 'مهلة الجلسة (دقائق)',
      maxLoginAttempts: 'الحد الأقصى لمحاولات تسجيل الدخول',
      autoApproveVerifiedDoctors: 'الموافقة التلقائية على الأطباء',
      autoApproveVerifiedDoctorsDesc: 'الموافقة تلقائياً على الأطباء ذوي التراخيص الصالحة',
      requireLicenseVerification: 'التحقق من الترخيص مطلوب',
      requireLicenseVerificationDesc: 'يجب على الأطباء تحميل ترخيص طبي صالح',
      minConsultationFee: 'الحد الأدنى لرسوم الاستشارة',
      maxConsultationFee: 'الحد الأقصى لرسوم الاستشارة',
      dzd: 'د.ج',
      arabic: 'العربية',
      french: 'الفرنسية',
      english: 'الإنجليزية',
      enabled: 'مفعل',
      disabled: 'معطل',
      warning: 'تحذير',
      maintenanceWarning: 'تفعيل وضع الصيانة سيمنع جميع المستخدمين من الوصول إلى المنصة.'
    }
  }

  const t = texts[language]

  const handleSave = async () => {
    setIsSaving(true)
    try {
      // Save chat settings
      const chatRes = await fetch('/api/admin/platform-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: 'chat',
          value: {
            enable_patient_to_doctor_chat: settings.enablePatientToDoctorChat,
            enable_patient_to_pharmacy_chat: settings.enablePatientToPharmacyChat,
            enable_patient_to_lab_chat: settings.enablePatientToLabChat,
            enable_doctor_to_doctor_chat: settings.enableDoctorToDoctorChat,
            enable_provider_to_provider_chat: settings.enableProviderToProviderChat,
          }
        })
      })
      
      // Save features settings
      const featuresRes = await fetch('/api/admin/platform-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: 'features',
          value: {
            enable_guest_booking: settings.enableGuestBooking,
            enable_e_visit: settings.enableEVisit,
            enable_home_visit: settings.enableHomeVisit,
            enable_prescriptions: settings.enablePrescriptions,
            enable_lab_requests: settings.enableLabRequests,
            enable_ai_analysis: settings.enableAIAnalysis,
            enable_ratings: settings.enableRatings,
          }
        })
      })

      if (chatRes.ok && featuresRes.ok) {
        toast.success('Settings saved successfully')
      } else {
        throw new Error('Failed to save settings')
      }
    } catch (error: any) {
      toast.error('Failed to save settings: ' + error.message)
    } finally {
      setIsSaving(false)
    }
  }

  const SettingToggle = ({ 
    label, 
    description, 
    checked, 
    onChange,
    icon: Icon 
  }: { 
    label: string
    description: string
    checked: boolean
    onChange: (checked: boolean) => void
    icon?: React.ElementType
  }) => (
    <div className={`flex items-center justify-between py-4 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
      <div className={`flex items-start gap-3 ${dir === 'rtl' ? 'flex-row-reverse text-right' : ''}`}>
        {Icon && (
          <div className="p-2 bg-muted rounded-lg mt-0.5">
            <Icon className="h-4 w-4 text-muted-foreground" />
          </div>
        )}
        <div>
          <Label className="font-medium">{label}</Label>
          <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
        </div>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${dir === 'rtl' ? 'sm:flex-row-reverse' : ''}`}>
        <div className={dir === 'rtl' ? 'text-right' : ''}>
          <h1 className="text-3xl font-bold">{t.title}</h1>
          <p className="text-muted-foreground">{t.description}</p>
        </div>
        <div className={`flex items-center gap-2 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
          <Button variant="outline" className="bg-transparent">
            <RefreshCw className="h-4 w-4 mr-2" />
            {t.reset}
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? t.saving : t.save}
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className={`grid w-full grid-cols-5 lg:grid-cols-9 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
          <TabsTrigger value="account" className="gap-2">
            <User className="h-4 w-4" />
            <span className="hidden sm:inline">Account</span>
          </TabsTrigger>
          <TabsTrigger value="general" className="gap-2">
            <Globe className="h-4 w-4" />
            <span className="hidden sm:inline">{t.general}</span>
          </TabsTrigger>
          <TabsTrigger value="features" className="gap-2">
            <Zap className="h-4 w-4" />
            <span className="hidden sm:inline">{t.features}</span>
          </TabsTrigger>
          <TabsTrigger value="chat" className="gap-2">
            <MessageCircle className="h-4 w-4" />
            <span className="hidden sm:inline">{language === 'ar' ? 'المحادثات' : language === 'fr' ? 'Chat' : 'Chat'}</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2">
            <Bell className="h-4 w-4" />
            <span className="hidden sm:inline">{t.notifications}</span>
          </TabsTrigger>
          <TabsTrigger value="payments" className="gap-2">
            <CreditCard className="h-4 w-4" />
            <span className="hidden sm:inline">{t.payments}</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-2">
            <Shield className="h-4 w-4" />
            <span className="hidden sm:inline">{t.security}</span>
          </TabsTrigger>
          <TabsTrigger value="providers" className="gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">{t.providers}</span>
          </TabsTrigger>
          <TabsTrigger value="backups" className="gap-2">
            <HardDrive className="h-4 w-4" />
            <span className="hidden sm:inline">Backups</span>
          </TabsTrigger>
        </TabsList>

        {/* Account - Privacy & Security */}
        <TabsContent value="account">
          <PrivacySecuritySettings language={language as 'en' | 'fr' | 'ar'} compact settingsTab="account" />
        </TabsContent>

        {/* General Settings */}
        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle className={`flex items-center gap-2 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
                <Globe className="h-5 w-5" />
                {t.general}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>{t.platformName}</Label>
                  <Input 
                    value={settings.platformName}
                    onChange={(e) => setSettings({ ...settings, platformName: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t.platformNameAr}</Label>
                  <Input 
                    value={settings.platformNameAr}
                    onChange={(e) => setSettings({ ...settings, platformNameAr: e.target.value })}
                    dir="rtl"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>{t.contactEmail}</Label>
                  <Input 
                    type="email"
                    value={settings.contactEmail}
                    onChange={(e) => setSettings({ ...settings, contactEmail: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t.contactPhone}</Label>
                  <Input 
                    value={settings.contactPhone}
                    onChange={(e) => setSettings({ ...settings, contactPhone: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>{t.defaultLanguage}</Label>
                <Select 
                  value={settings.defaultLanguage} 
                  onValueChange={(v) => setSettings({ ...settings, defaultLanguage: v })}
                >
                  <SelectTrigger className="w-full sm:w-64">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ar">{t.arabic}</SelectItem>
                    <SelectItem value="fr">{t.french}</SelectItem>
                    <SelectItem value="en">{t.english}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              {/* Maintenance Mode Warning */}
              {settings.maintenanceMode && (
                <div className="rounded-lg bg-yellow-50 border border-yellow-200 p-4">
                  <div className={`flex gap-3 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
                    <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0" />
                    <div className={dir === 'rtl' ? 'text-right' : ''}>
                      <p className="font-medium text-yellow-800">{t.warning}</p>
                      <p className="text-sm text-yellow-700">{t.maintenanceWarning}</p>
                    </div>
                  </div>
                </div>
              )}

              <SettingToggle
                label={t.maintenanceMode}
                description={t.maintenanceModeDesc}
                checked={settings.maintenanceMode}
                onChange={(checked) => setSettings({ ...settings, maintenanceMode: checked })}
                icon={Server}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Features Settings */}
        <TabsContent value="features">
          <Card>
            <CardHeader>
              <CardTitle className={`flex items-center gap-2 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
                <Zap className="h-5 w-5" />
                {t.features}
              </CardTitle>
            </CardHeader>
            <CardContent className="divide-y">
              <SettingToggle
                label={t.enableGuestBooking}
                description={t.enableGuestBookingDesc}
                checked={settings.enableGuestBooking}
                onChange={(checked) => setSettings({ ...settings, enableGuestBooking: checked })}
              />
              <SettingToggle
                label={t.enableEVisit}
                description={t.enableEVisitDesc}
                checked={settings.enableEVisit}
                onChange={(checked) => setSettings({ ...settings, enableEVisit: checked })}
              />
              <SettingToggle
                label={t.enableHomeVisit}
                description={t.enableHomeVisitDesc}
                checked={settings.enableHomeVisit}
                onChange={(checked) => setSettings({ ...settings, enableHomeVisit: checked })}
              />
              <SettingToggle
                label={t.enablePrescriptions}
                description={t.enablePrescriptionsDesc}
                checked={settings.enablePrescriptions}
                onChange={(checked) => setSettings({ ...settings, enablePrescriptions: checked })}
              />
              <SettingToggle
                label={t.enableLabRequests}
                description={t.enableLabRequestsDesc}
                checked={settings.enableLabRequests}
                onChange={(checked) => setSettings({ ...settings, enableLabRequests: checked })}
              />
              <SettingToggle
                label={t.enableAIAnalysis}
                description={t.enableAIAnalysisDesc}
                checked={settings.enableAIAnalysis}
                onChange={(checked) => setSettings({ ...settings, enableAIAnalysis: checked })}
              />
              <SettingToggle
                label={t.enableRatings}
                description={t.enableRatingsDesc}
                checked={settings.enableRatings}
                onChange={(checked) => setSettings({ ...settings, enableRatings: checked })}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Chat Settings */}
        <TabsContent value="chat">
          <Card>
            <CardHeader>
              <CardTitle className={`flex items-center gap-2 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
                <MessageCircle className="h-5 w-5" />
                {language === 'ar' ? 'إعدادات المحادثات' : language === 'fr' ? 'Paramètres de Chat' : 'Chat Settings'}
              </CardTitle>
              <CardDescription>
                {language === 'ar' 
                  ? 'التحكم في من يمكنه التواصل مع من عبر المنصة'
                  : language === 'fr'
                  ? 'Contrôlez qui peut communiquer avec qui sur la plateforme'
                  : 'Control who can communicate with whom across the platform'}
              </CardDescription>
            </CardHeader>
            <CardContent className="divide-y">
              <SettingToggle
                label={language === 'ar' ? 'محادثة المريض مع الطبيب' : language === 'fr' ? 'Chat Patient-Médecin' : 'Patient to Doctor Chat'}
                description={language === 'ar' 
                  ? 'السماح للمرضى ببدء محادثات مع الأطباء'
                  : language === 'fr'
                  ? 'Permettre aux patients de démarrer des conversations avec les médecins'
                  : 'Allow patients to start conversations with doctors'}
                checked={settings.enablePatientToDoctorChat}
                onChange={(checked) => setSettings({ ...settings, enablePatientToDoctorChat: checked })}
                icon={Users}
              />
              <SettingToggle
                label={language === 'ar' ? 'محادثة المريض مع الصيدلية' : language === 'fr' ? 'Chat Patient-Pharmacie' : 'Patient to Pharmacy Chat'}
                description={language === 'ar' 
                  ? 'السماح للمرضى ببدء محادثات مع الصيدليات'
                  : language === 'fr'
                  ? 'Permettre aux patients de démarrer des conversations avec les pharmacies'
                  : 'Allow patients to start conversations with pharmacies'}
                checked={settings.enablePatientToPharmacyChat}
                onChange={(checked) => setSettings({ ...settings, enablePatientToPharmacyChat: checked })}
                icon={Users}
              />
              <SettingToggle
                label={language === 'ar' ? 'محادثة المريض مع المختبر' : language === 'fr' ? 'Chat Patient-Laboratoire' : 'Patient to Lab Chat'}
                description={language === 'ar' 
                  ? 'السماح للمرضى ببدء محادثات مع المختبرات'
                  : language === 'fr'
                  ? 'Permettre aux patients de démarrer des conversations avec les laboratoires'
                  : 'Allow patients to start conversations with laboratories'}
                checked={settings.enablePatientToLabChat}
                onChange={(checked) => setSettings({ ...settings, enablePatientToLabChat: checked })}
                icon={Users}
              />
              <SettingToggle
                label={language === 'ar' ? 'محادثة الطبيب مع الطبيب' : language === 'fr' ? 'Chat Médecin-Médecin' : 'Doctor to Doctor Chat'}
                description={language === 'ar' 
                  ? 'السماح للأطباء بالتواصل فيما بينهم'
                  : language === 'fr'
                  ? 'Permettre aux médecins de communiquer entre eux'
                  : 'Allow doctors to communicate with each other'}
                checked={settings.enableDoctorToDoctorChat}
                onChange={(checked) => setSettings({ ...settings, enableDoctorToDoctorChat: checked })}
                icon={Users}
              />
              <SettingToggle
                label={language === 'ar' ? 'محادثة مقدمي الخدمات' : language === 'fr' ? 'Chat entre Professionnels' : 'Provider to Provider Chat'}
                description={language === 'ar' 
                  ? 'السماح لجميع مقدمي الخدمات بالتواصل فيما بينهم'
                  : language === 'fr'
                  ? 'Permettre à tous les professionnels de communiquer entre eux'
                  : 'Allow all providers to communicate with each other'}
                checked={settings.enableProviderToProviderChat}
                onChange={(checked) => setSettings({ ...settings, enableProviderToProviderChat: checked })}
                icon={Users}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Settings */}
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle className={`flex items-center gap-2 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
                <Bell className="h-5 w-5" />
                {t.notifications}
              </CardTitle>
            </CardHeader>
            <CardContent className="divide-y">
              <SettingToggle
                label={t.emailNotifications}
                description={t.emailNotificationsDesc}
                checked={settings.emailNotifications}
                onChange={(checked) => setSettings({ ...settings, emailNotifications: checked })}
                icon={Mail}
              />
              <SettingToggle
                label={t.smsNotifications}
                description={t.smsNotificationsDesc}
                checked={settings.smsNotifications}
                onChange={(checked) => setSettings({ ...settings, smsNotifications: checked })}
                icon={Smartphone}
              />
              <SettingToggle
                label={t.pushNotifications}
                description={t.pushNotificationsDesc}
                checked={settings.pushNotifications}
                onChange={(checked) => setSettings({ ...settings, pushNotifications: checked })}
                icon={Bell}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payments Settings */}
        <TabsContent value="payments">
          <Card>
            <CardHeader>
              <CardTitle className={`flex items-center gap-2 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
                <CreditCard className="h-5 w-5" />
                {t.payments}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="divide-y">
                <SettingToggle
                  label={t.enableOnlinePayments}
                  description={t.enableOnlinePaymentsDesc}
                  checked={settings.enableOnlinePayments}
                  onChange={(checked) => setSettings({ ...settings, enableOnlinePayments: checked })}
                />
                <SettingToggle
                  label={t.enableCashPayments}
                  description={t.enableCashPaymentsDesc}
                  checked={settings.enableCashPayments}
                  onChange={(checked) => setSettings({ ...settings, enableCashPayments: checked })}
                />
              </div>

              <Separator />

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>{t.defaultCurrency}</Label>
                  <Select 
                    value={settings.defaultCurrency} 
                    onValueChange={(v) => setSettings({ ...settings, defaultCurrency: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DZD">DZD - Algerian Dinar</SelectItem>
                      <SelectItem value="EUR">EUR - Euro</SelectItem>
                      <SelectItem value="USD">USD - US Dollar</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t.platformFee}</Label>
                  <Input 
                    type="number"
                    min="0"
                    max="100"
                    value={settings.platformFeePercentage}
                    onChange={(e) => setSettings({ ...settings, platformFeePercentage: Number(e.target.value) })}
                  />
                  <p className="text-xs text-muted-foreground">{t.platformFeeDesc}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Settings */}
        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle className={`flex items-center gap-2 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
                <Shield className="h-5 w-5" />
                {t.security}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="divide-y">
                <SettingToggle
                  label={t.requireEmailVerification}
                  description={t.requireEmailVerificationDesc}
                  checked={settings.requireEmailVerification}
                  onChange={(checked) => setSettings({ ...settings, requireEmailVerification: checked })}
                  icon={Mail}
                />
                <SettingToggle
                  label={t.requirePhoneVerification}
                  description={t.requirePhoneVerificationDesc}
                  checked={settings.requirePhoneVerification}
                  onChange={(checked) => setSettings({ ...settings, requirePhoneVerification: checked })}
                  icon={Smartphone}
                />
              </div>

              <Separator />

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>{t.sessionTimeout}</Label>
                  <Input 
                    type="number"
                    min="5"
                    max="1440"
                    value={settings.sessionTimeout}
                    onChange={(e) => setSettings({ ...settings, sessionTimeout: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t.maxLoginAttempts}</Label>
                  <Input 
                    type="number"
                    min="1"
                    max="10"
                    value={settings.maxLoginAttempts}
                    onChange={(e) => setSettings({ ...settings, maxLoginAttempts: Number(e.target.value) })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Providers Settings */}
        <TabsContent value="providers">
          <Card>
            <CardHeader>
              <CardTitle className={`flex items-center gap-2 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
                <Users className="h-5 w-5" />
                {t.providers}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="divide-y">
                <SettingToggle
                  label={t.autoApproveVerifiedDoctors}
                  description={t.autoApproveVerifiedDoctorsDesc}
                  checked={settings.autoApproveVerifiedDoctors}
                  onChange={(checked) => setSettings({ ...settings, autoApproveVerifiedDoctors: checked })}
                />
                <SettingToggle
                  label={t.requireLicenseVerification}
                  description={t.requireLicenseVerificationDesc}
                  checked={settings.requireLicenseVerification}
                  onChange={(checked) => setSettings({ ...settings, requireLicenseVerification: checked })}
                  icon={FileText}
                />
              </div>

              <Separator />

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>{t.minConsultationFee} ({t.dzd})</Label>
                  <Input 
                    type="number"
                    min="0"
                    value={settings.minConsultationFee}
                    onChange={(e) => setSettings({ ...settings, minConsultationFee: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t.maxConsultationFee} ({t.dzd})</Label>
                  <Input 
                    type="number"
                    min="0"
                    value={settings.maxConsultationFee}
                    onChange={(e) => setSettings({ ...settings, maxConsultationFee: Number(e.target.value) })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Backup Management */}
        <TabsContent value="backups">
          <AdminBackupManagement />
        </TabsContent>
      </Tabs>
    </div>
  )
}

// Admin Backup Management Component
function AdminBackupManagement() {
  const [backups, setBackups] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedBackup, setSelectedBackup] = useState<any>(null)
  const [previewData, setPreviewData] = useState<any>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [stats, setStats] = useState({
    totalBackups: 0,
    totalSize: 0,
    activeSchedules: 0,
    googleConnections: 0
  })

  React.useEffect(() => {
    loadBackups()
    loadStats()
  }, [])

  const loadBackups = async () => {
    try {
      const res = await fetch('/api/admin/backups?limit=50')
      if (res.ok) {
        const data = await res.json()
        setBackups(data.backups || [])
      }
    } catch (error) {
      console.error('Failed to load backups:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadStats = async () => {
    try {
      const res = await fetch('/api/admin/backups/stats')
      if (res.ok) {
        const data = await res.json()
        setStats(data)
      }
    } catch (error) {
      console.error('Failed to load stats:', error)
    }
  }

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const previewBackup = async (backup: any) => {
    setActionLoading(backup.id)
    setSelectedBackup(backup)
    try {
      const res = await fetch(`/api/admin/backups/${backup.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dry_run: true })
      })
      if (res.ok) {
        const data = await res.json()
        setPreviewData(data.preview)
      } else {
        const err = await res.json()
        alert(`Preview failed: ${err.error}`)
      }
    } catch (error: any) {
      alert(`Preview failed: ${error.message}`)
    } finally {
      setActionLoading(null)
    }
  }

  const deleteBackup = async (backup: any) => {
    if (!confirm(`Are you sure you want to delete this backup?\n\n${backup.filename}\n\nThis action cannot be undone.`)) {
      return
    }
    
    setActionLoading(backup.id)
    try {
      const res = await fetch(`/api/admin/backups/${backup.id}`, {
        method: 'DELETE'
      })
      if (res.ok) {
        await loadBackups()
        await loadStats()
      } else {
        const err = await res.json()
        alert(`Delete failed: ${err.error}`)
      }
    } catch (error: any) {
      alert(`Delete failed: ${error.message}`)
    } finally {
      setActionLoading(null)
    }
  }

  const filteredBackups = backups.filter(b => 
    b.filename?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.professional_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.user_email?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <HardDrive className="h-8 w-8 mx-auto text-primary mb-2" />
              <div className="text-2xl font-bold">{stats.totalBackups}</div>
              <div className="text-sm text-muted-foreground">Total Backups</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <Database className="h-8 w-8 mx-auto text-blue-500 mb-2" />
              <div className="text-2xl font-bold">{formatBytes(stats.totalSize)}</div>
              <div className="text-sm text-muted-foreground">Storage Used</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <Clock className="h-8 w-8 mx-auto text-green-500 mb-2" />
              <div className="text-2xl font-bold">{stats.activeSchedules}</div>
              <div className="text-sm text-muted-foreground">Active Schedules</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <Cloud className="h-8 w-8 mx-auto text-purple-500 mb-2" />
              <div className="text-2xl font-bold">{stats.googleConnections}</div>
              <div className="text-sm text-muted-foreground">Google Connections</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Backup List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <HardDrive className="h-5 w-5" />
              All Platform Backups
            </CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search backups..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 w-64"
                />
              </div>
              <Button variant="outline" onClick={loadBackups}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <CardDescription>
            View and manage all backup files across the platform
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredBackups.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchQuery ? 'No backups match your search' : 'No backups found'}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredBackups.map((backup) => (
                <div
                  key={backup.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded">
                      <HardDrive className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <div className="font-medium text-sm">{backup.filename}</div>
                      <div className="text-xs text-muted-foreground">
                        {backup.professional_name || backup.user_email || 'Unknown'} • {formatBytes(backup.file_size_bytes)} • {new Date(backup.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={backup.status === 'active' ? 'default' : 'secondary'}>
                      {backup.status}
                    </Badge>
                    {backup.google_file_id && (
                      <Badge variant="outline" className="gap-1">
                        <Cloud className="h-3 w-3" />
                        Synced
                      </Badge>
                    )}
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => previewBackup(backup)}
                      disabled={actionLoading === backup.id}
                      title="Preview backup contents"
                    >
                      {actionLoading === backup.id ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <Search className="h-4 w-4" />
                      )}
                    </Button>
                    <Button variant="ghost" size="icon" asChild title="Download backup">
                      <a href={`/api/backup/${backup.id}?download=true`} target="_blank">
                        <Download className="h-4 w-4" />
                      </a>
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => deleteBackup(backup)}
                      disabled={actionLoading === backup.id}
                      className="text-destructive hover:text-destructive"
                      title="Delete backup"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Preview Dialog */}
      {selectedBackup && previewData && (
        <Card className="border-primary">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Backup Preview: {selectedBackup.filename}
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => { setSelectedBackup(null); setPreviewData(null); }}>
                Close
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="p-3 bg-muted rounded-lg">
                <div className="text-xs text-muted-foreground">Type</div>
                <div className="font-medium">{previewData.backup_type}</div>
              </div>
              <div className="p-3 bg-muted rounded-lg">
                <div className="text-xs text-muted-foreground">Created</div>
                <div className="font-medium">{new Date(previewData.created_at).toLocaleString()}</div>
              </div>
              <div className="p-3 bg-muted rounded-lg">
                <div className="text-xs text-muted-foreground">Verified</div>
                <div className="font-medium flex items-center gap-1">
                  {previewData.verified ? (
                    <><CheckCircle className="h-4 w-4 text-green-500" /> Yes</>
                  ) : (
                    <><AlertTriangle className="h-4 w-4 text-yellow-500" /> No</>
                  )}
                </div>
              </div>
              <div className="p-3 bg-muted rounded-lg">
                <div className="text-xs text-muted-foreground">Owner</div>
                <div className="font-medium">{selectedBackup.professional_name || selectedBackup.user_email}</div>
              </div>
            </div>
            
            <Separator className="my-4" />
            
            <div className="space-y-2">
              <div className="text-sm font-medium">Data Summary</div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                {previewData.data_summary?.products_count > 0 && (
                  <div className="p-2 bg-blue-50 dark:bg-blue-950 rounded">
                    Products: {previewData.data_summary.products_count}
                  </div>
                )}
                {previewData.data_summary?.appointments_count > 0 && (
                  <div className="p-2 bg-green-50 dark:bg-green-950 rounded">
                    Appointments: {previewData.data_summary.appointments_count}
                  </div>
                )}
                {previewData.data_summary?.prescriptions_count > 0 && (
                  <div className="p-2 bg-purple-50 dark:bg-purple-950 rounded">
                    Prescriptions: {previewData.data_summary.prescriptions_count}
                  </div>
                )}
                {previewData.data_summary?.has_professional && (
                  <div className="p-2 bg-muted rounded">Professional Data</div>
                )}
                {previewData.data_summary?.has_pharmacy && (
                  <div className="p-2 bg-muted rounded">Pharmacy Data</div>
                )}
                {previewData.data_summary?.has_settings && (
                  <div className="p-2 bg-muted rounded">Settings</div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
