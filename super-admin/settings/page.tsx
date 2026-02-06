'use client'

import React, { useState } from 'react'
import { useLanguage } from '@/lib/i18n/language-context'
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
  Zap
} from 'lucide-react'

export default function PlatformSettingsPage() {
  const { language, dir } = useLanguage()
  const [isSaving, setIsSaving] = useState(false)
  
  // Platform settings state
  const [settings, setSettings] = useState({
    // General
    platformName: 'Siha DZ',
    platformNameAr: 'طبيب دزد',
    contactEmail: 'support@dzdoc.com',
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
    // In production, save to database
    await new Promise(resolve => setTimeout(resolve, 1000))
    setIsSaving(false)
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

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className={`grid w-full grid-cols-3 lg:grid-cols-6 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
          <TabsTrigger value="general" className="gap-2">
            <Globe className="h-4 w-4" />
            <span className="hidden sm:inline">{t.general}</span>
          </TabsTrigger>
          <TabsTrigger value="features" className="gap-2">
            <Zap className="h-4 w-4" />
            <span className="hidden sm:inline">{t.features}</span>
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
        </TabsList>

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
      </Tabs>
    </div>
  )
}
