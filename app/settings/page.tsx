"use client"

import { useState, useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import { useTheme } from "next-themes"
import { useLanguage } from "@/lib/i18n/language-context"
import { createBrowserClient } from "@/lib/supabase/client"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { WILAYAS, getWilayaName, getCityName, getWilayaByCode } from "@/lib/data/algeria-locations"
import { Bell, Shield, User, Globe, Smartphone, Mail, Lock, Check, Sun, Moon, Monitor, MapPin, ChevronDown, Copy, Eye, EyeOff, Heart, Scale, Ruler, Pill, AlertTriangle } from "lucide-react"
import { FullPageLoading, LoadingSpinner } from "@/components/ui/page-loading"
import { useAuth } from "@/components/auth-provider"
import { cn } from "@/lib/utils"
import { EditableAvatar } from "@/components/editable-avatar"
import { useUrlTab } from "@/hooks/use-url-tab"

// SQL to add all profile columns (run in Supabase SQL Editor if save fails)
const PROFILES_MIGRATION_SQL = `-- Paste only this code block in Supabase SQL Editor (do not copy the page title above)
-- Add all columns needed for Settings -> Profile
-- Use public.profiles so it works even if your project uses a different schema.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS date_of_birth date,
  ADD COLUMN IF NOT EXISTS gender text,
  ADD COLUMN IF NOT EXISTS address text;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS default_wilaya_code text,
  ADD COLUMN IF NOT EXISTS default_city_id text;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email_notifications boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS sms_notifications boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS push_notifications boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS marketing_emails boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS timezone text DEFAULT 'africa-algiers',
  ADD COLUMN IF NOT EXISTS preferred_language text CHECK (preferred_language IS NULL OR preferred_language IN ('ar', 'fr', 'en'));

COMMENT ON COLUMN public.profiles.default_wilaya_code IS 'Wilaya code (01-58) for default doctor search location';
COMMENT ON COLUMN public.profiles.preferred_language IS 'User preferred display language. Overrides platform when set.';
COMMENT ON COLUMN public.profiles.default_city_id IS 'City id for default doctor search location';`

export default function SettingsPage() {
  const router = useRouter()
  const pathname = usePathname()
  const { t, language, setLanguage, dir } = useLanguage()
  const { theme, setTheme } = useTheme()
  const { user, profile: authProfile, refreshProfile } = useAuth()
  const [saved, setSaved] = useState(false)

  // Keep patient settings under dashboard so the sidebar stays visible; redirect /settings → /dashboard/settings (preserve query)
  useEffect(() => {
    if (pathname === '/settings') {
      const q = typeof window !== 'undefined' ? window.location.search : ''
      router.replace('/dashboard/settings' + q)
    }
  }, [pathname, router])
  const [mounted, setMounted] = useState(false)
  const [profileError, setProfileError] = useState<string | null>(null)
  const [profilePartialSuccess, setProfilePartialSuccess] = useState<string | null>(null)
  const [profileLastFullError, setProfileLastFullError] = useState<string | null>(null)
  const [profileLoading, setProfileLoading] = useState(true)
  // Profile tab – all fields persisted to profiles table
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [dateOfBirth, setDateOfBirth] = useState('')
  const [gender, setGender] = useState('')
  const [address, setAddress] = useState('')
  const [defaultWilayaCode, setDefaultWilayaCode] = useState<string>('')
  const [defaultCityId, setDefaultCityId] = useState<string>('')
  const [wilayaOpen, setWilayaOpen] = useState(false)
  // Vital info
  const [bloodType, setBloodType] = useState('')
  const [heightCm, setHeightCm] = useState('')
  const [weightKg, setWeightKg] = useState('')
  const [allergies, setAllergies] = useState('')
  const [chronicConditions, setChronicConditions] = useState('')
  const [currentMedications, setCurrentMedications] = useState('')
  const [cityOpen, setCityOpen] = useState(false)
  const [timezone, setTimezone] = useState('africa-algiers')
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [smsNotifications, setSmsNotifications] = useState(true)
  const [pushNotifications, setPushNotifications] = useState(false)
  const [marketingEmails, setMarketingEmails] = useState(false)
  const locLang = language === 'ar' ? 'ar' : language === 'fr' ? 'fr' : 'en'
  // Password change (security tab)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrentPw, setShowCurrentPw] = useState(false)
  const [showNewPw, setShowNewPw] = useState(false)
  const [showConfirmPw, setShowConfirmPw] = useState(false)
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [passwordSuccess, setPasswordSuccess] = useState(false)
  // Change email (security tab)
  const [newEmail, setNewEmail] = useState('')
  const [emailPassword, setEmailPassword] = useState('')
  const [showEmailPw, setShowEmailPw] = useState(false)
  const [emailLoading, setEmailLoading] = useState(false)
  const [emailSuccess, setEmailSuccess] = useState(false)

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true)
  }, [])

  // Load full profile (all fields we persist)
  useEffect(() => {
    const load = async () => {
      setProfileLoading(true)
      setProfileError(null)
      const supabase = createBrowserClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setProfileLoading(false)
        return
      }
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      setProfileLoading(false)
      if (error) {
        setProfileError(error.message)
        return
      }
      if (data) {
        setFullName(data.full_name ?? '')
        setEmail(data.email ?? '')
        setPhone(data.phone ?? '')
        setDateOfBirth(data.date_of_birth ? String(data.date_of_birth).slice(0, 10) : '')
        setGender(data.gender ?? '')
        setAddress(data.address ?? '')
        if (data.default_wilaya_code) setDefaultWilayaCode(data.default_wilaya_code)
        if (data.default_city_id) setDefaultCityId(data.default_city_id)
        if (data.timezone) setTimezone(data.timezone)
        if (typeof data.email_notifications === 'boolean') setEmailNotifications(data.email_notifications)
        if (typeof data.sms_notifications === 'boolean') setSmsNotifications(data.sms_notifications)
        if (typeof data.push_notifications === 'boolean') setPushNotifications(data.push_notifications)
        if (typeof data.marketing_emails === 'boolean') setMarketingEmails(data.marketing_emails)
        setBloodType(data.blood_type ?? '')
        setHeightCm(data.height_cm != null ? String(data.height_cm) : '')
        setWeightKg(data.weight_kg != null ? String(data.weight_kg) : '')
        setAllergies(data.allergies ?? '')
        setChronicConditions(data.chronic_conditions ?? '')
        setCurrentMedications(data.current_medications ?? '')
      }
    }
    load()
  }, [])

  // Keep defaultCityId in sync with defaultWilayaCode
  useEffect(() => {
    const cities = getWilayaByCode(defaultWilayaCode)?.cities ?? []
    if (defaultCityId && !cities.some((c) => c.id === defaultCityId)) setDefaultCityId('')
  }, [defaultWilayaCode, defaultCityId])

  const handleSave = async () => {
    setProfileError(null)
    setProfilePartialSuccess(null)
    setProfileLastFullError(null)
    const supabase = createBrowserClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setProfileError(language === 'ar' ? 'يجب تسجيل الدخول' : language === 'fr' ? 'Vous devez être connecté' : 'You must be signed in')
      return
    }
    const fullPayload: Record<string, unknown> = {
      full_name: fullName.trim() || null,
      email: email.trim() || null,
      phone: phone.trim() || null,
      date_of_birth: dateOfBirth || null,
      gender: gender || null,
      address: address.trim() || null,
      default_wilaya_code: defaultWilayaCode || null,
      default_city_id: defaultCityId || null,
      blood_type: bloodType || null,
      height_cm: heightCm ? parseFloat(heightCm) : null,
      weight_kg: weightKg ? parseFloat(weightKg) : null,
      allergies: allergies.trim() || null,
      chronic_conditions: chronicConditions.trim() || null,
      current_medications: currentMedications.trim() || null,
      timezone: timezone || 'africa-algiers',
      email_notifications: emailNotifications,
      sms_notifications: smsNotifications,
      push_notifications: pushNotifications,
      marketing_emails: marketingEmails,
      preferred_language: language,
    }
    const { error } = await supabase
      .from('profiles')
      .update(fullPayload)
      .eq('id', user.id)
    if (error) {
      const msg = error.message || ''
      const missingColumn = msg.includes('does not exist') || msg.includes('column')
      setProfileLastFullError(error.message)
      if (missingColumn) {
        const minimalPayload = {
          full_name: fullName.trim() || null,
          email: email.trim() || null,
          phone: phone.trim() || null,
        }
        const { error: minimalError } = await supabase
          .from('profiles')
          .update(minimalPayload)
          .eq('id', user.id)
        if (!minimalError) {
          setSaved(true)
          setTimeout(() => setSaved(false), 3000)
          setProfilePartialSuccess(
            language === 'ar'
              ? 'تم حفظ الاسم والبريد والهاتف. لتفعيل حفظ الولاية والمدينة وباقي الحقول، نفّذ الـ SQL أدناه في Supabase.'
              : language === 'fr'
                ? 'Nom, email et téléphone enregistrés. Pour enregistrer la wilaya, la ville et les autres champs, exécutez le SQL ci-dessous dans Supabase.'
                : 'Name, email and phone saved. To save wilaya, city and other fields, run the SQL below in Supabase.'
          )
          return
        }
        setProfileError(
          language === 'ar'
            ? 'قاعدة البيانات تحتاج تحديثاً. نفّذ الـ SQL أدناه في محرر SQL في Supabase.'
            : language === 'fr'
              ? 'La base de données doit être mise à jour. Exécutez le script scripts/013-profiles-default-location.sql dans l’éditeur SQL Supabase.'
              : 'Database may be missing columns. Run the SQL below in Supabase SQL Editor, then try again.'
        )
      } else {
        setProfileError(error.message)
      }
      return
    }
    setProfileLastFullError(null)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
    // Notify dashboard layout to refresh profile (weather widget)
    window.dispatchEvent(new CustomEvent('profile-updated', { detail: fullPayload }))
  }

  const handleUpdatePassword = async () => {
    setPasswordError(null)
    setPasswordSuccess(false)
    if (!currentPassword.trim()) {
      setPasswordError(language === 'ar' ? 'أدخل كلمة المرور الحالية' : language === 'fr' ? 'Entrez le mot de passe actuel' : 'Enter current password')
      return
    }
    if (newPassword.length < 6) {
      setPasswordError(language === 'ar' ? 'كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل' : language === 'fr' ? 'Le nouveau mot de passe doit contenir au moins 6 caractères' : 'New password must be at least 6 characters')
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordError(language === 'ar' ? 'كلمات المرور غير متطابقة' : language === 'fr' ? 'Les mots de passe ne correspondent pas' : 'Passwords do not match')
      return
    }
    setPasswordLoading(true)
    try {
      const supabase = createBrowserClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user?.email) {
        setPasswordError(language === 'ar' ? 'لم يتم العثور على الجلسة' : language === 'fr' ? 'Session introuvable' : 'Session not found')
        return
      }
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      })
      if (signInError) {
        setPasswordError(language === 'ar' ? 'كلمة المرور الحالية غير صحيحة' : language === 'fr' ? 'Mot de passe actuel incorrect' : 'Current password is incorrect')
        return
      }
      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword })
      if (updateError) throw updateError
      setPasswordSuccess(true)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setTimeout(() => setPasswordSuccess(false), 4000)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : (language === 'ar' ? 'فشل تحديث كلمة المرور' : language === 'fr' ? 'Échec de la mise à jour du mot de passe' : 'Failed to update password')
      setPasswordError(msg)
    } finally {
      setPasswordLoading(false)
    }
  }

  const handleUpdateEmail = async () => {
    setPasswordError(null)
    setEmailSuccess(false)
    const trimmed = newEmail.trim()
    if (!trimmed) {
      setPasswordError(language === 'ar' ? 'أدخل البريد الجديد' : language === 'fr' ? 'Entrez le nouvel email' : 'Enter new email')
      return
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(trimmed)) {
      setPasswordError(language === 'ar' ? 'أدخل بريداً إلكترونياً صالحاً' : language === 'fr' ? 'Entrez un email valide' : 'Enter a valid email')
      return
    }
    if (!emailPassword.trim()) {
      setPasswordError(language === 'ar' ? 'أدخل كلمة المرور للتأكيد' : language === 'fr' ? 'Entrez le mot de passe pour confirmer' : 'Enter password to confirm')
      return
    }
    setEmailLoading(true)
    try {
      const supabase = createBrowserClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user?.email) {
        setPasswordError(language === 'ar' ? 'الجلسة غير موجودة' : language === 'fr' ? 'Session introuvable' : 'Session not found')
        return
      }
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: emailPassword,
      })
      if (signInError) {
        setPasswordError(language === 'ar' ? 'كلمة المرور غير صحيحة' : language === 'fr' ? 'Mot de passe incorrect' : 'Password is incorrect')
        return
      }
      const { error: updateError } = await supabase.auth.updateUser({ email: trimmed })
      if (updateError) throw updateError
      setEmailSuccess(true)
      setNewEmail('')
      setEmailPassword('')
      setTimeout(() => setEmailSuccess(false), 6000)
    } catch (err: unknown) {
      setPasswordError(err instanceof Error ? err.message : 'Failed to update email')
    } finally {
      setEmailLoading(false)
    }
  }

  const labels = {
    ar: {
      settings: "الإعدادات",
      profile: "الملف الشخصي",
      notifications: "الإشعارات",
      security: "الأمان",
      preferences: "التفضيلات",
      fullName: "الاسم الكامل",
      email: "البريد الإلكتروني",
      phone: "رقم الهاتف",
      dateOfBirth: "تاريخ الميلاد",
      gender: "الجنس",
      male: "ذكر",
      female: "أنثى",
      address: "العنوان",
      city: "المدينة",
      saveChanges: "حفظ التغييرات",
      saved: "تم الحفظ",
      emailNotifications: "إشعارات البريد الإلكتروني",
      emailNotificationsDesc: "استلام تأكيدات المواعيد عبر البريد الإلكتروني",
      smsNotifications: "إشعارات الرسائل النصية",
      smsNotificationsDesc: "استلام تذكيرات المواعيد عبر الرسائل النصية",
      pushNotifications: "الإشعارات الفورية",
      pushNotificationsDesc: "استلام الإشعارات على جهازك",
      marketingEmails: "رسائل التسويق",
      marketingEmailsDesc: "استلام العروض والأخبار",
      changeEmail: "تغيير البريد الإلكتروني",
      changeEmailDesc: "تحديث بريدك الإلكتروني للدخول. سيتم إرسال رابط تأكيد إلى العنوان الجديد.",
      currentEmail: "البريد الحالي",
      newEmailLabel: "البريد الجديد",
      emailPasswordConfirm: "تأكيد بكلمة المرور",
      updateEmail: "تحديث البريد",
      emailUpdateSent: "تم إرسال بريد التأكيد. تحقق من صندوق الوارد الجديد.",
      changePassword: "تغيير كلمة المرور",
      currentPassword: "كلمة المرور الحالية",
      newPassword: "كلمة المرور الجديدة",
      confirmPassword: "تأكيد كلمة المرور",
      updatePassword: "تحديث كلمة المرور",
      twoFactor: "المصادقة الثنائية",
      twoFactorDesc: "إضافة طبقة أمان إضافية لحسابك",
      enable: "تفعيل",
      language: "اللغة",
      languageDesc: "اختر لغة العرض المفضلة",
      arabic: "العربية",
      french: "الفرنسية",
      english: "English",
      timezone: "المنطقة الزمنية",
      timezoneDesc: "ضبط المنطقة الزمنية لمواعيدك",
      theme: "المظهر",
      themeDesc: "اختر مظهر التطبيق المفضل",
      themeLight: "فاتح",
      themeDark: "داكن",
      themeSystem: "تلقائي",
      defaultLocation: "الموقع الافتراضي للبحث عن أطباء قريبين",
      defaultLocationDesc: "يُستخدم عند البحث التلقائي عن أطباء قريبين منك",
      wilaya: "الولاية",
      selectWilaya: "اختر الولاية",
      searchWilaya: "بحث الولاية...",
      city: "المدينة",
      selectCity: "اختر المدينة",
      searchCity: "بحث المدينة...",
      vitalInfo: "المعلومات الحيوية",
      vitalInfoDesc: "معلومات صحية أساسية تظهر للطبيب أثناء المواعيد",
      bloodType: "فصيلة الدم",
      height: "الطول (سم)",
      weight: "الوزن (كغ)",
      allergies: "الحساسية",
      allergiesPlaceholder: "مثال: البنسلين، الفول السوداني...",
      chronicConditions: "أمراض مزمنة",
      chronicPlaceholder: "مثال: السكري، ضغط الدم...",
      currentMedications: "الأدوية الحالية",
      medicationsPlaceholder: "مثال: دواء، جرعة، تكرار...",
    },
    fr: {
      settings: "Paramètres",
      profile: "Profil",
      notifications: "Notifications",
      security: "Sécurité",
      preferences: "Préférences",
      fullName: "Nom complet",
      email: "Email",
      phone: "Téléphone",
      dateOfBirth: "Date de naissance",
      gender: "Genre",
      male: "Homme",
      female: "Femme",
      address: "Adresse",
      city: "Ville",
      saveChanges: "Enregistrer",
      saved: "Enregistré",
      emailNotifications: "Notifications par email",
      emailNotificationsDesc: "Recevoir les confirmations de rendez-vous par email",
      smsNotifications: "Notifications SMS",
      smsNotificationsDesc: "Recevoir les rappels de rendez-vous par SMS",
      pushNotifications: "Notifications push",
      pushNotificationsDesc: "Recevoir des notifications sur votre appareil",
      marketingEmails: "Emails marketing",
      marketingEmailsDesc: "Recevoir des offres et actualités",
      changeEmail: "Changer l'email",
      changeEmailDesc: "Mettez à jour votre email de connexion. Un lien de confirmation sera envoyé.",
      currentEmail: "Email actuel",
      newEmailLabel: "Nouvel email",
      emailPasswordConfirm: "Confirmer avec le mot de passe",
      updateEmail: "Mettre à jour l'email",
      emailUpdateSent: "Email de confirmation envoyé. Vérifiez votre nouvelle boîte mail.",
      changePassword: "Changer le mot de passe",
      currentPassword: "Mot de passe actuel",
      newPassword: "Nouveau mot de passe",
      confirmPassword: "Confirmer le mot de passe",
      updatePassword: "Mettre à jour",
      twoFactor: "Authentification à deux facteurs",
      twoFactorDesc: "Ajouter une couche de sécurité supplémentaire",
      enable: "Activer",
      language: "Langue",
      languageDesc: "Choisir votre langue préférée",
      arabic: "العربية",
      french: "Français",
      english: "English",
      timezone: "Fuseau horaire",
      timezoneDesc: "Définir le fuseau horaire pour vos rendez-vous",
      theme: "Thème",
      themeDesc: "Choisir l'apparence de l'application",
      themeLight: "Clair",
      themeDark: "Sombre",
      themeSystem: "Système",
      defaultLocation: "Emplacement par défaut pour trouver des médecins à proximité",
      defaultLocationDesc: "Utilisé lors de la recherche automatique de médecins à proximité",
      wilaya: "Wilaya",
      selectWilaya: "Choisir la wilaya",
      searchWilaya: "Rechercher wilaya...",
      city: "Ville",
      selectCity: "Choisir la ville",
      searchCity: "Rechercher ville...",
      vitalInfo: "Informations vitales",
      vitalInfoDesc: "Informations de santé de base visibles par le médecin lors des rendez-vous",
      bloodType: "Groupe sanguin",
      height: "Taille (cm)",
      weight: "Poids (kg)",
      allergies: "Allergies",
      allergiesPlaceholder: "Ex: Pénicilline, arachides...",
      chronicConditions: "Affections chroniques",
      chronicPlaceholder: "Ex: Diabète, hypertension...",
      currentMedications: "Médicaments actuels",
      medicationsPlaceholder: "Ex: Médicament, dosage, fréquence...",
    },
    en: {
      settings: "Settings",
      profile: "Profile",
      notifications: "Notifications",
      security: "Security",
      preferences: "Preferences",
      fullName: "Full Name",
      email: "Email",
      phone: "Phone Number",
      dateOfBirth: "Date of Birth",
      gender: "Gender",
      male: "Male",
      female: "Female",
      address: "Address",
      city: "City",
      saveChanges: "Save Changes",
      saved: "Saved",
      emailNotifications: "Email Notifications",
      emailNotificationsDesc: "Receive appointment confirmations via email",
      smsNotifications: "SMS Notifications",
      smsNotificationsDesc: "Receive appointment reminders via SMS",
      pushNotifications: "Push Notifications",
      pushNotificationsDesc: "Receive notifications on your device",
      marketingEmails: "Marketing Emails",
      marketingEmailsDesc: "Receive offers and news",
      changeEmail: "Change Email",
      changeEmailDesc: "Update your login email. A confirmation link will be sent to the new address.",
      currentEmail: "Current email",
      newEmailLabel: "New email",
      emailPasswordConfirm: "Confirm with password",
      updateEmail: "Update email",
      emailUpdateSent: "Confirmation email sent. Check your new inbox to complete the change.",
      changePassword: "Change Password",
      currentPassword: "Current Password",
      newPassword: "New Password",
      confirmPassword: "Confirm Password",
      updatePassword: "Update Password",
      twoFactor: "Two-Factor Authentication",
      twoFactorDesc: "Add an extra layer of security to your account",
      enable: "Enable",
      language: "Language",
      languageDesc: "Choose your preferred display language",
      arabic: "العربية",
      french: "Français",
      english: "English",
      timezone: "Timezone",
      timezoneDesc: "Set the timezone for your appointments",
      theme: "Theme",
      themeDesc: "Choose your preferred app appearance",
      themeLight: "Light",
      themeDark: "Dark",
      themeSystem: "System",
      defaultLocation: "Default location for finding doctors nearby",
      defaultLocationDesc: "Used when auto-looking for doctors nearby",
      wilaya: "Wilaya",
      selectWilaya: "Select wilaya",
      searchWilaya: "Search wilaya...",
      city: "City",
      selectCity: "Select city",
      searchCity: "Search city...",
      vitalInfo: "Vital Information",
      vitalInfoDesc: "Basic health info visible to your doctor during appointments",
      bloodType: "Blood Type",
      height: "Height (cm)",
      weight: "Weight (kg)",
      allergies: "Allergies",
      allergiesPlaceholder: "e.g. Penicillin, peanuts...",
      chronicConditions: "Chronic Conditions",
      chronicPlaceholder: "e.g. Diabetes, hypertension...",
      currentMedications: "Current Medications",
      medicationsPlaceholder: "e.g. Medication, dosage, frequency...",
    },
  }

  const l = labels[language]

  const SETTINGS_TABS = ['profile', 'notifications', 'security', 'preferences'] as const
  const [activeTab, setActiveTab] = useUrlTab('tab', SETTINGS_TABS, 'profile')

  if (pathname === '/settings') {
    return <FullPageLoading />
  }

  const isDashboard = pathname?.startsWith('/dashboard')

  return (
    <div className="min-h-screen bg-background flex flex-col w-full max-w-full" dir={dir}>
      {!isDashboard && <Header />}

      <main className={cn(
        "flex-1 w-full min-w-0 overflow-x-hidden pb-6 sm:pb-8",
        isDashboard ? "px-0 pt-0" : "container px-4 py-6 sm:py-8",
        "max-w-none sm:max-w-4xl",
        dir === "rtl" ? "me-auto" : "mx-auto"
      )}>
        <h1 className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4">{l.settings}</h1>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-3 sm:space-y-4 w-full">
          <div className="overflow-x-auto overflow-y-hidden -mx-1 px-1 sm:mx-0 sm:px-0 [scrollbar-width:thin] pb-1">
            <TabsList className="inline-flex w-max min-w-full sm:w-full sm:min-w-0 h-auto gap-1 p-1.5 bg-muted/80 dark:bg-muted/60 flex-nowrap sm:flex-wrap border border-border/50">
              <TabsTrigger value="profile" className="flex items-center gap-1.5 shrink-0 px-3 py-2.5 text-xs sm:text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm">
                <User className="h-4 w-4 shrink-0" />
                <span className="whitespace-nowrap">{l.profile}</span>
              </TabsTrigger>
              <TabsTrigger value="notifications" className="flex items-center gap-1.5 shrink-0 px-3 py-2.5 text-xs sm:text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm">
                <Bell className="h-4 w-4 shrink-0" />
                <span className="whitespace-nowrap">{l.notifications}</span>
              </TabsTrigger>
              <TabsTrigger value="security" className="flex items-center gap-1.5 shrink-0 px-3 py-2.5 text-xs sm:text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm">
                <Shield className="h-4 w-4 shrink-0" />
                <span className="whitespace-nowrap">{l.security}</span>
              </TabsTrigger>
              <TabsTrigger value="preferences" className="flex items-center gap-1.5 shrink-0 px-3 py-2.5 text-xs sm:text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm">
                <Globe className="h-4 w-4 shrink-0" />
                <span className="whitespace-nowrap">{l.preferences}</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="profile">
            <Card className="rounded-none sm:rounded-xl overflow-hidden">
              <CardHeader className="px-3 sm:px-4">
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  {l.profile}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 px-3 sm:px-4">
                {user && (
                  <div className="profile-avatar-section flex flex-row items-center gap-4 min-w-0">
                    <EditableAvatar
                      userId={user.id}
                      src={authProfile?.avatar_url}
                      fallback={(authProfile?.full_name || fullName)?.charAt(0) || user.email?.charAt(0) || 'U'}
                      size="lg"
                      onUpdate={refreshProfile}
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-medium">
                        {language === 'ar' ? 'صورة الملف الشخصي' : language === 'fr' ? 'Photo de profil' : 'Profile picture'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {language === 'ar' ? 'انقر لتغيير الصورة' : language === 'fr' ? 'Cliquez pour changer la photo' : 'Click to change'}
                      </p>
                    </div>
                  </div>
                )}
                {profileLoading && (
                  <div className="text-sm text-muted-foreground flex items-center gap-2">
                    <LoadingSpinner size="sm" />
                    {language === 'ar' ? 'جاري تحميل الملف...' : language === 'fr' ? 'Chargement du profil...' : 'Loading profile...'}
                  </div>
                )}
                {profilePartialSuccess && (
                  <div className="space-y-2 rounded-lg border border-green-200 bg-green-50 p-3 dark:border-green-800 dark:bg-green-950/30" role="status">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium text-green-800 dark:text-green-200 flex items-center gap-2">
                        <Check className="h-4 w-4 shrink-0" />
                        {profilePartialSuccess}
                      </p>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="shrink-0 text-green-700 hover:text-green-800 dark:text-green-300 dark:hover:text-green-200"
                        onClick={() => { setProfilePartialSuccess(null); setProfileLastFullError(null) }}
                      >
                        {language === 'ar' ? 'إغلاق' : language === 'fr' ? 'Fermer' : 'Dismiss'}
                      </Button>
                    </div>
                    <p className="text-xs text-green-700 dark:text-green-300">
                      {language === 'ar' ? 'بعد تنفيذ الـ SQL، اضغط «حفظ التغييرات» مرة أخرى لحفظ الولاية والمدينة.' : language === 'fr' ? 'Après avoir exécuté le SQL, cliquez à nouveau sur « Enregistrer » pour sauvegarder la wilaya et la ville.' : 'After running the SQL, click Save Changes again to save wilaya and city.'}
                    </p>
                    {profileLastFullError && (
                      <p className="text-xs text-amber-800 dark:text-amber-200 bg-amber-100 dark:bg-amber-900/30 rounded px-2 py-1 font-mono break-all">
                        {language === 'ar' ? 'سبب فشل الحفظ الكامل: ' : language === 'fr' ? 'Raison du échec de la sauvegarde complète : ' : 'Why full save failed: '}
                        {profileLastFullError}
                      </p>
                    )}
                    <ol className="text-xs text-green-800 dark:text-green-200 list-decimal list-inside space-y-1 mt-2">
                      {language === 'ar' ? (
                        <>
                          <li>افتح لوحة Supabase (نفس مشروع هذا التطبيق)</li>
                          <li>SQL Editor → New query</li>
                          <li>الصق الـ SQL أدناه واضغط Run</li>
                          <li>ارجع هنا واضغط «حفظ التغييرات» مرة أخرى</li>
                          <li className="text-amber-700 dark:text-amber-300 mt-1">إن كنت نفّذت الـ SQL وما زال الحفظ يفشل: افتح Supabase → Table Editor → profiles وتأكد من وجود default_wilaya_code و default_city_id. حدّث الصفحة ثم جرّب الحفظ مرة أخرى.</li>
                        </>
                      ) : language === 'fr' ? (
                        <>
                          <li>Ouvrez le tableau de bord Supabase (même projet que cette app)</li>
                          <li>SQL Editor → New query</li>
                          <li>Collez le SQL ci-dessous et cliquez Run</li>
                          <li>Revenez ici et cliquez « Enregistrer » à nouveau</li>
                          <li className="text-amber-700 dark:text-amber-300 mt-1">Si vous avez déjà exécuté ce SQL et l’enregistrement échoue encore : Supabase → Table Editor → profiles, vérifiez que default_wilaya_code et default_city_id existent. Actualisez cette page puis réessayez.</li>
                        </>
                      ) : (
                        <>
                          <li>Open Supabase Dashboard (same project as this app)</li>
                          <li>SQL Editor → New query</li>
                          <li>Paste the SQL below and click Run</li>
                          <li>Come back here and click Save Changes again</li>
                          <li className="text-amber-700 dark:text-amber-300 mt-1">If you already ran this and save still fails: open Supabase → Table Editor → profiles and confirm default_wilaya_code and default_city_id exist. Refresh this page and try Save again.</li>
                        </>
                      )}
                    </ol>
                    <div className="rounded-lg border border-border bg-muted/50 p-3 text-sm mt-2">
                      <p className="mb-2 font-medium text-foreground">
                        {language === 'ar' ? 'نفّذ هذا SQL في Supabase' : language === 'fr' ? 'Exécutez ce SQL dans Supabase' : 'Run this SQL in Supabase'}
                      </p>
                      <p className="mb-2 text-muted-foreground text-xs">
                        {language === 'ar' ? 'Dashboard → SQL Editor → New query → Coller puis Run' : language === 'fr' ? 'Dashboard → SQL Editor → New query → Coller puis Run' : 'Dashboard → SQL Editor → New query → Paste and Run'}
                      </p>
                      <pre className="overflow-x-auto rounded bg-muted p-3 text-xs font-mono whitespace-pre max-w-full">{PROFILES_MIGRATION_SQL}</pre>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="mt-2 gap-2"
                        onClick={() => {
                          navigator.clipboard.writeText(PROFILES_MIGRATION_SQL)
                        }}
                      >
                        <Copy className="h-4 w-4" />
                        {language === 'ar' ? 'نسخ' : language === 'fr' ? 'Copier' : 'Copy SQL'}
                      </Button>
                    </div>
                  </div>
                )}
                {profileError && (
                  <div className="space-y-2" role="alert">
                    <p className="text-sm text-destructive">{profileError}</p>
                    {(profileError.includes('013') || profileError.includes('missing columns') || profileError.includes('does not exist') || profileError.includes('SQL below')) && (
                      <div className="rounded-lg border border-border bg-muted/50 p-3 text-sm">
                        <p className="mb-2 font-medium text-foreground">
                          {language === 'ar' ? 'نفّذ هذا SQL في Supabase' : language === 'fr' ? 'Exécutez ce SQL dans Supabase' : 'Run this SQL in Supabase'}
                        </p>
                        <p className="mb-2 text-muted-foreground text-xs">
                          {language === 'ar' ? 'Dashboard → SQL Editor → New query → Coller puis Run' : language === 'fr' ? 'Dashboard → SQL Editor → New query → Coller puis Run' : 'Dashboard → SQL Editor → New query → Paste and Run'}
                        </p>
                        <pre className="overflow-x-auto rounded bg-muted p-3 text-xs font-mono whitespace-pre max-w-full">{PROFILES_MIGRATION_SQL}</pre>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="mt-2 gap-2"
                          onClick={() => {
                            navigator.clipboard.writeText(PROFILES_MIGRATION_SQL)
                          }}
                        >
                          <Copy className="h-4 w-4" />
                          {language === 'ar' ? 'نسخ' : language === 'fr' ? 'Copier' : 'Copy SQL'}
                        </Button>
                      </div>
                    )}
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 min-w-0">
                  <div className="space-y-2 min-w-0">
                    <Label htmlFor="fullName">{l.fullName}</Label>
                    <Input
                      id="fullName"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Ahmed Benali"
                      disabled={profileLoading}
                      className="w-full min-w-0"
                    />
                  </div>
                  <div className="space-y-2 min-w-0">
                    <Label htmlFor="email">{l.email}</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="ahmed@example.com"
                      disabled={profileLoading}
                      className="w-full min-w-0"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4 md:col-span-2 min-w-0">
                    <div className="space-y-2 min-w-0">
                      <Label htmlFor="phone">{l.phone}</Label>
                      <Input
                        id="phone"
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="0554128522"
                        disabled={profileLoading}
                        className="w-full min-w-0"
                      />
                    </div>
                    <div className="space-y-2 min-w-0 overflow-hidden">
                      <Label htmlFor="dob">{l.dateOfBirth}</Label>
                      <Input
                        id="dob"
                        type="date"
                        value={dateOfBirth}
                        onChange={(e) => setDateOfBirth(e.target.value)}
                        disabled={profileLoading}
                        className="w-full min-w-0 max-w-full [&::-webkit-calendar-picker-indicator]:opacity-100"
                      />
                    </div>
                  </div>
                </div>
                {/* Default location - separate section above Vital Info */}
                <div className="space-y-4 pt-4 border-t">
                  <div className="flex w-full items-center gap-2 text-muted-foreground rtl:flex-row-reverse rtl:justify-start">
                    <MapPin className="h-4 w-4 shrink-0" />
                    <span className="font-medium text-foreground">{l.defaultLocation}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{l.defaultLocationDesc}</p>
                  <div className="space-y-2 min-w-0">
                    <Label htmlFor="address">{l.address}</Label>
                    <Input
                      id="address"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="123 Rue Didouche Mourad"
                      disabled={profileLoading}
                      className="w-full min-w-0"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4 min-w-0">
                    <div className="space-y-2 min-w-0">
                      <Label>{l.wilaya}</Label>
                      <Popover open={wilayaOpen} onOpenChange={setWilayaOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={wilayaOpen}
                            className="w-full justify-between font-normal h-10"
                            disabled={profileLoading}
                          >
                            <span className="truncate">
                              {defaultWilayaCode
                                ? getWilayaName(getWilayaByCode(defaultWilayaCode)!, locLang)
                                : l.selectWilaya}
                            </span>
                            <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[min(calc(100vw-2rem),var(--radix-popover-trigger-width))] sm:w-[var(--radix-popover-trigger-width)] p-0" align="start" sideOffset={4} side="bottom" avoidCollisions={false}>
                          <Command>
                            <CommandInput placeholder={l.searchWilaya} />
                            <CommandList className="max-h-[min(60vh,20rem)]">
                              <CommandEmpty>
                                {language === 'ar' ? 'لا توجد نتائج' : language === 'fr' ? 'Aucun résultat' : 'No results'}
                              </CommandEmpty>
                              <CommandGroup heading={`${WILAYAS.length} ${language === 'ar' ? 'ولاية' : language === 'fr' ? 'wilayas' : 'wilayas'}`}>
                                {WILAYAS.map((w) => (
                                  <CommandItem
                                    key={w.code}
                                    value={`${w.code} ${getWilayaName(w, locLang)} ${w.nameAr}`}
                                    onSelect={() => {
                                      setDefaultWilayaCode(w.code)
                                      setDefaultCityId('')
                                      setWilayaOpen(false)
                                      setCityOpen(false)
                                    }}
                                    className="gap-2"
                                  >
                                    <span className="text-muted-foreground text-xs w-6 shrink-0">{w.code}</span>
                                    <span className="truncate">{getWilayaName(w, locLang)}</span>
                                    {defaultWilayaCode === w.code && <Check className="h-4 w-4 ms-auto shrink-0" />}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div className="space-y-2 min-w-0">
                      <Label>{l.city}</Label>
                      <Popover open={cityOpen} onOpenChange={setCityOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={cityOpen}
                            className="w-full justify-between font-normal h-10"
                            disabled={!defaultWilayaCode || profileLoading}
                          >
                            <span className="truncate">
                              {defaultCityId
                                ? (() => {
                                    const c = getWilayaByCode(defaultWilayaCode)?.cities.find((x) => x.id === defaultCityId)
                                    return c ? getCityName(c, locLang) : defaultCityId
                                  })()
                                : l.selectCity}
                            </span>
                            <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[min(calc(100vw-2rem),var(--radix-popover-trigger-width))] sm:w-[var(--radix-popover-trigger-width)] p-0" align="start" sideOffset={4} side="bottom" avoidCollisions={false}>
                          <Command>
                            <CommandInput placeholder={l.searchCity} />
                            <CommandList className="max-h-[min(60vh,20rem)]">
                              <CommandEmpty>
                                {language === 'ar' ? 'لا توجد نتائج' : language === 'fr' ? 'Aucun résultat' : 'No results'}
                              </CommandEmpty>
                              <CommandGroup>
                                {(getWilayaByCode(defaultWilayaCode)?.cities ?? []).map((c) => (
                                  <CommandItem
                                    key={c.id}
                                    value={`${c.id} ${getCityName(c, locLang)} ${c.nameAr}`}
                                    onSelect={() => {
                                      setDefaultCityId(c.id)
                                      setCityOpen(false)
                                    }}
                                    className="gap-2"
                                  >
                                    <span className="truncate">{getCityName(c, locLang)}</span>
                                    {defaultCityId === c.id && <Check className="h-4 w-4 ms-auto shrink-0" />}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                </div>

                {/* Vital Info */}
                <div className="space-y-4 pt-4 border-t rounded-lg bg-primary/5 dark:bg-primary/10 p-3 sm:p-4">
                  <div className="flex items-center gap-2 text-foreground">
                    <Heart className="h-4 w-4 shrink-0 text-primary" />
                    <span className="font-medium">{l.vitalInfo}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{l.vitalInfoDesc}</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-2 gap-y-3 sm:gap-1 sm:gap-y-0">
                    <div className="space-y-1.5 sm:space-y-2 min-w-0">
                      <Label htmlFor="gender" className="text-xs sm:text-sm">{l.gender}</Label>
                      <Select value={gender || undefined} onValueChange={setGender} disabled={profileLoading}>
                        <SelectTrigger id="gender" className="w-full min-w-0 h-8 py-0 px-[5px] text-sm [&_[data-slot=select-value]]:flex-1 [&_[data-slot=select-value]]:text-center">
                          <SelectValue placeholder={l.gender} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="male">{l.male}</SelectItem>
                          <SelectItem value="female">{l.female}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5 sm:space-y-2 min-w-0">
                      <Label htmlFor="bloodType" className="text-xs sm:text-sm">{l.bloodType}</Label>
                      <Select value={bloodType || undefined} onValueChange={setBloodType} disabled={profileLoading}>
                        <SelectTrigger id="bloodType" className="w-full min-w-0 h-8 py-0 px-2 text-sm [&_[data-slot=select-value]]:flex-1 [&_[data-slot=select-value]]:text-center">
                          <SelectValue placeholder={l.bloodType} />
                        </SelectTrigger>
                        <SelectContent>
                          {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((t) => (
                            <SelectItem key={t} value={t}>{t}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5 sm:space-y-2 min-w-0">
                      <Label htmlFor="heightCm" className="text-xs sm:text-sm">{l.height}</Label>
                      <Input
                        id="heightCm"
                        type="number"
                        min={50}
                        max={250}
                        step={0.1}
                        placeholder="170"
                        value={heightCm}
                        onChange={(e) => setHeightCm(e.target.value)}
                        disabled={profileLoading}
                        className="w-full max-w-[70px] sm:max-w-[60px] min-w-0 h-8 py-0 ps-[2px] pe-[1px] text-sm text-center"
                      />
                    </div>
                    <div className="space-y-1.5 sm:space-y-2 min-w-0">
                      <Label htmlFor="weightKg" className="text-xs sm:text-sm">{l.weight}</Label>
                      <Input
                        id="weightKg"
                        type="number"
                        min={20}
                        max={300}
                        step={0.1}
                        placeholder="70"
                        value={weightKg}
                        onChange={(e) => setWeightKg(e.target.value)}
                        disabled={profileLoading}
                        className="w-full max-w-[70px] sm:max-w-[50px] min-w-0 h-12 py-0 px-2 text-sm text-center"
                      />
                    </div>
                  </div>
                  <div className="space-y-2 min-w-0">
                    <Label htmlFor="allergies" className="flex items-center gap-1.5">
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                      {l.allergies}
                    </Label>
                    <Input
                      id="allergies"
                      value={allergies}
                      onChange={(e) => setAllergies(e.target.value)}
                      placeholder={l.allergiesPlaceholder}
                      disabled={profileLoading}
                      className="w-full min-w-0"
                    />
                  </div>
                  <div className="space-y-2 min-w-0">
                    <Label htmlFor="chronicConditions">{l.chronicConditions}</Label>
                    <Input
                      id="chronicConditions"
                      value={chronicConditions}
                      onChange={(e) => setChronicConditions(e.target.value)}
                      placeholder={l.chronicPlaceholder}
                      disabled={profileLoading}
                      className="w-full min-w-0"
                    />
                  </div>
                  <div className="space-y-2 min-w-0">
                    <Label htmlFor="currentMedications" className="flex items-center gap-1.5">
                      <Pill className="h-3.5 w-3.5 text-primary" />
                      {l.currentMedications}
                    </Label>
                    <Input
                      id="currentMedications"
                      value={currentMedications}
                      onChange={(e) => setCurrentMedications(e.target.value)}
                      placeholder={l.medicationsPlaceholder}
                      disabled={profileLoading}
                      className="w-full min-w-0"
                    />
                  </div>
                </div>
                <Button onClick={handleSave} className="w-full sm:w-auto" disabled={profileLoading}>
                  {saved ? (
                    <>
                      <Check className="h-4 w-4 me-2" />
                      {l.saved}
                    </>
                  ) : (
                    l.saveChanges
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications">
            <Card className="rounded-none sm:rounded-xl overflow-hidden">
              <CardHeader className="px-3 sm:px-4">
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  {l.notifications}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 px-3 sm:px-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 min-w-0">
                  <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <Label>{l.emailNotifications}</Label>
                    </div>
                    <p className="text-sm text-muted-foreground">{l.emailNotificationsDesc}</p>
                  </div>
                  <Switch checked={emailNotifications} onCheckedChange={setEmailNotifications} className="shrink-0" />
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 min-w-0">
                  <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center gap-2">
                      <Smartphone className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <Label>{l.smsNotifications}</Label>
                    </div>
                    <p className="text-sm text-muted-foreground">{l.smsNotificationsDesc}</p>
                  </div>
                  <Switch checked={smsNotifications} onCheckedChange={setSmsNotifications} className="shrink-0" />
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 min-w-0">
                  <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center gap-2">
                      <Bell className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <Label>{l.pushNotifications}</Label>
                    </div>
                    <p className="text-sm text-muted-foreground">{l.pushNotificationsDesc}</p>
                  </div>
                  <Switch checked={pushNotifications} onCheckedChange={setPushNotifications} className="shrink-0" />
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 min-w-0">
                  <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <Label>{l.marketingEmails}</Label>
                    </div>
                    <p className="text-sm text-muted-foreground">{l.marketingEmailsDesc}</p>
                  </div>
                  <Switch checked={marketingEmails} onCheckedChange={setMarketingEmails} className="shrink-0" />
                </div>
                <Button onClick={handleSave} className="w-full sm:w-auto">
                  {saved ? (
                    <>
                      <Check className="h-4 w-4 me-2" />
                      {l.saved}
                    </>
                  ) : (
                    l.saveChanges
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security">
            <Card className="rounded-none sm:rounded-xl overflow-hidden">
              <CardHeader className="px-3 sm:px-4">
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  {l.security}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 px-3 sm:px-4">
                {/* Change Email */}
                <div className="space-y-4 pb-6 border-b">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    <span className="font-medium">{l.changeEmail}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{l.changeEmailDesc}</p>
                  <div className="grid gap-4 w-full min-w-0 max-w-full sm:max-w-md">
                    <div className="space-y-2">
                      <Label>{l.currentEmail}</Label>
                      <Input type="email" value={user?.email ?? ''} disabled className="bg-muted" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="newEmail">{l.newEmailLabel}</Label>
                      <Input
                        id="newEmail"
                        type="email"
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                        placeholder="new@email.com"
                        disabled={emailLoading}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{l.emailPasswordConfirm}</Label>
                      <div className="relative">
                        <Input
                          type={showEmailPw ? 'text' : 'password'}
                          value={emailPassword}
                          onChange={(e) => setEmailPassword(e.target.value)}
                          placeholder="••••••••"
                          disabled={emailLoading}
                          className="pe-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowEmailPw(!showEmailPw)}
                          className="absolute end-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          tabIndex={-1}
                        >
                          {showEmailPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                    {emailSuccess && (
                      <p className="text-sm text-green-600 dark:text-green-400 flex items-center gap-2">
                        <Check className="h-4 w-4" />
                        {l.emailUpdateSent}
                      </p>
                    )}
                    <Button onClick={handleUpdateEmail} disabled={emailLoading} variant="outline">
                      {emailLoading ? <LoadingSpinner size="sm" className="me-2" /> : null}
                      {l.updateEmail}
                    </Button>
                  </div>
                </div>

                {/* Change Password */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Lock className="h-4 w-4" />
                    <span className="font-medium">{l.changePassword}</span>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="currentPassword">{l.currentPassword}</Label>
                    <div className="relative">
                      <Input
                        id="currentPassword"
                        type={showCurrentPw ? 'text' : 'password'}
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="••••••••"
                        autoComplete="current-password"
                        disabled={passwordLoading}
                        className="pe-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPw(!showCurrentPw)}
                        className="absolute end-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        tabIndex={-1}
                      >
                        {showCurrentPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">{l.newPassword}</Label>
                    <div className="relative">
                      <Input
                        id="newPassword"
                        type={showNewPw ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="••••••••"
                        autoComplete="new-password"
                        disabled={passwordLoading}
                        className="pe-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPw(!showNewPw)}
                        className="absolute end-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        tabIndex={-1}
                      >
                        {showNewPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">{l.confirmPassword}</Label>
                    <div className="relative">
                      <Input
                        id="confirmPassword"
                        type={showConfirmPw ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        autoComplete="new-password"
                        disabled={passwordLoading}
                        className="pe-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPw(!showConfirmPw)}
                        className="absolute end-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        tabIndex={-1}
                      >
                        {showConfirmPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  {passwordError && (
                    <p className="text-sm text-destructive" role="alert">{passwordError}</p>
                  )}
                  {passwordSuccess && (
                    <p className="text-sm text-green-600 dark:text-green-400 flex items-center gap-2" role="status">
                      <Check className="h-4 w-4" />
                      {language === 'ar' ? 'تم تحديث كلمة المرور' : language === 'fr' ? 'Mot de passe mis à jour' : 'Password updated successfully'}
                    </p>
                  )}
                  <Button
                    className="w-full sm:w-auto"
                    onClick={handleUpdatePassword}
                    disabled={passwordLoading}
                  >
                    {passwordLoading ? (
                      <>
                        <LoadingSpinner size="sm" />
                        {language === 'ar' ? 'جاري التحديث...' : language === 'fr' ? 'Mise à jour...' : 'Updating...'}
                      </>
                    ) : (
                      l.updatePassword
                    )}
                  </Button>
                </div>
                <div className="border-t pt-6">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 min-w-0">
                    <div className="space-y-0.5 min-w-0">
                      <div className="flex items-center gap-2">
                        <Lock className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <Label>{l.twoFactor}</Label>
                      </div>
                      <p className="text-sm text-muted-foreground">{l.twoFactorDesc}</p>
                    </div>
                    <Button variant="outline" className="shrink-0 w-fit">{l.enable}</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="preferences">
            <Card className="rounded-none sm:rounded-xl overflow-hidden">
              <CardHeader className="px-3 sm:px-4">
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  {l.preferences}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 px-3 sm:px-4">
                <div className="space-y-4">
                  {/* Theme Setting */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      {theme === 'dark' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                      {l.theme}
                    </Label>
                    <p className="text-sm text-muted-foreground">{l.themeDesc}</p>
                    {mounted && (
                      <div className="flex flex-wrap gap-2 min-w-0">
                        <Button
                          variant={theme === 'light' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setTheme('light')}
                          className="flex items-center gap-2"
                        >
                          <Sun className="h-4 w-4" />
                          {l.themeLight}
                        </Button>
                        <Button
                          variant={theme === 'dark' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setTheme('dark')}
                          className="flex items-center gap-2"
                        >
                          <Moon className="h-4 w-4" />
                          {l.themeDark}
                        </Button>
                        <Button
                          variant={theme === 'system' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setTheme('system')}
                          className="flex items-center gap-2"
                        >
                          <Monitor className="h-4 w-4" />
                          {l.themeSystem}
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Language Setting */}
                  <div className="space-y-2">
                    <Label>{l.language}</Label>
                    <p className="text-sm text-muted-foreground">{l.languageDesc}</p>
                    <Select value={language} onValueChange={(value: "ar" | "fr" | "en") => setLanguage(value)}>
                      <SelectTrigger className="w-full sm:w-[200px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ar">{l.arabic}</SelectItem>
                        <SelectItem value="fr">{l.french}</SelectItem>
                        <SelectItem value="en">{l.english}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>{l.timezone}</Label>
                    <p className="text-sm text-muted-foreground">{l.timezoneDesc}</p>
                    <Select value={timezone} onValueChange={setTimezone}>
                      <SelectTrigger className="w-full sm:w-[300px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="africa-algiers">Africa/Algiers (UTC+1)</SelectItem>
                        <SelectItem value="europe-paris">Europe/Paris (UTC+1)</SelectItem>
                        <SelectItem value="europe-london">Europe/London (UTC+0)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button onClick={handleSave} className="w-full sm:w-auto">
                  {saved ? (
                    <>
                      <Check className="h-4 w-4 me-2" />
                      {l.saved}
                    </>
                  ) : (
                    l.saveChanges
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {!isDashboard && <Footer />}
    </div>
  )
}
