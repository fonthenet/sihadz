"use client"

import { useState, useEffect } from "react"
import { useTheme } from "next-themes"
import { useLanguage } from "@/lib/i18n/language-context"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Bell, Shield, User, Globe, Smartphone, Mail, Lock, Check, Sun, Moon, Monitor } from "lucide-react"

export default function SettingsPage() {
  const { t, language, setLanguage, dir } = useLanguage()
  const { theme, setTheme } = useTheme()
  const [saved, setSaved] = useState(false)
  const [mounted, setMounted] = useState(false)

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true)
  }, [])

  const handleSave = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
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
      french: "الفرançais",
      english: "English",
      timezone: "المنطقة الزمنية",
      timezoneDesc: "ضبط المنطقة الزمنية لمواعيدك",
      theme: "المظهر",
      themeDesc: "اختر مظهر التطبيق المفضل",
      themeLight: "فاتح",
      themeDark: "داكن",
      themeSystem: "تلقائي",
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
    },
  }

  const l = labels[language]

  return (
    <div className="min-h-screen bg-background flex flex-col" dir={dir}>
      <Header />

      <main className="flex-1 container mx-auto px-4 py-8 max-w-4xl">
        <h1 className="text-3xl font-bold mb-8">{l.settings}</h1>

        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">{l.profile}</span>
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              <span className="hidden sm:inline">{l.notifications}</span>
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              <span className="hidden sm:inline">{l.security}</span>
            </TabsTrigger>
            <TabsTrigger value="preferences" className="flex items-center gap-2">
              <Globe className="h-4 w-4" />
              <span className="hidden sm:inline">{l.preferences}</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  {l.profile}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="fullName">{l.fullName}</Label>
                    <Input id="fullName" placeholder="Ahmed Benali" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">{l.email}</Label>
                    <Input id="email" type="email" placeholder="ahmed@example.com" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">{l.phone}</Label>
                    <Input id="phone" type="tel" placeholder="0554128522" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dob">{l.dateOfBirth}</Label>
                    <Input id="dob" type="date" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="gender">{l.gender}</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder={l.gender} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">{l.male}</SelectItem>
                        <SelectItem value="female">{l.female}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="city">{l.city}</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder={l.city} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="algiers">Alger</SelectItem>
                        <SelectItem value="oran">Oran</SelectItem>
                        <SelectItem value="constantine">Constantine</SelectItem>
                        <SelectItem value="annaba">Annaba</SelectItem>
                        <SelectItem value="blida">Blida</SelectItem>
                        <SelectItem value="setif">Sétif</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address">{l.address}</Label>
                  <Input id="address" placeholder="123 Rue Didouche Mourad" />
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

          <TabsContent value="notifications">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  {l.notifications}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <Label>{l.emailNotifications}</Label>
                    </div>
                    <p className="text-sm text-muted-foreground">{l.emailNotificationsDesc}</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <Smartphone className="h-4 w-4 text-muted-foreground" />
                      <Label>{l.smsNotifications}</Label>
                    </div>
                    <p className="text-sm text-muted-foreground">{l.smsNotificationsDesc}</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <Bell className="h-4 w-4 text-muted-foreground" />
                      <Label>{l.pushNotifications}</Label>
                    </div>
                    <p className="text-sm text-muted-foreground">{l.pushNotificationsDesc}</p>
                  </div>
                  <Switch />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <Label>{l.marketingEmails}</Label>
                    </div>
                    <p className="text-sm text-muted-foreground">{l.marketingEmailsDesc}</p>
                  </div>
                  <Switch />
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
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  {l.security}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="currentPassword">{l.currentPassword}</Label>
                    <Input id="currentPassword" type="password" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">{l.newPassword}</Label>
                    <Input id="newPassword" type="password" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">{l.confirmPassword}</Label>
                    <Input id="confirmPassword" type="password" />
                  </div>
                  <Button className="w-full sm:w-auto">{l.updatePassword}</Button>
                </div>
                <div className="border-t pt-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <Lock className="h-4 w-4 text-muted-foreground" />
                        <Label>{l.twoFactor}</Label>
                      </div>
                      <p className="text-sm text-muted-foreground">{l.twoFactorDesc}</p>
                    </div>
                    <Button variant="outline">{l.enable}</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="preferences">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  {l.preferences}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  {/* Theme Setting */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      {theme === 'dark' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                      {l.theme}
                    </Label>
                    <p className="text-sm text-muted-foreground">{l.themeDesc}</p>
                    {mounted && (
                      <div className="flex gap-2">
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
                    <Select defaultValue="africa-algiers">
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

      <Footer />
    </div>
  )
}
