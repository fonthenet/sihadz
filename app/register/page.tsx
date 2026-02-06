'use client'

import React, { useState } from "react"
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { PhoneInput } from '@/components/ui/phone-input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useLanguage } from '@/lib/i18n/language-context'
import { LanguageSwitcher } from '@/components/language-switcher'
import { Stethoscope, Mail, Lock, ArrowRight, ArrowLeft, User, Phone, Calendar, CheckCircle } from 'lucide-react'
import { createBrowserClient } from '@/lib/supabase/client'

export default function RegisterPage() {
  const { t, language, dir } = useLanguage()
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirect')
  const supabase = createBrowserClient()
  
  const [fullName, setFullName] = useState('')
  const [fullNameAr, setFullNameAr] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [dateOfBirth, setDateOfBirth] = useState('')
  const [gender, setGender] = useState('')
  const [agreeToTerms, setAgreeToTerms] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  
  const ArrowIcon = dir === 'rtl' ? ArrowLeft : ArrowRight

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    
    if (password !== confirmPassword) {
      setError(language === 'ar' ? 'كلمات المرور غير متطابقة' : language === 'fr' ? 'Les mots de passe ne correspondent pas' : 'Passwords do not match')
      return
    }

    if (password.length < 8) {
      setError(language === 'ar' ? 'كلمة المرور يجب أن تكون 8 أحرف على الأقل' : language === 'fr' ? 'Le mot de passe doit contenir au moins 8 caractères' : 'Password must be at least 8 characters')
      return
    }

    const isValidAlgerianPhone = (p: string) => /^0[5-7]\d{8}$/.test(p) || /^0[2-4]\d{7}$/.test(p)
    if (!phone || !isValidAlgerianPhone(phone)) {
      setError(language === 'ar' ? 'رقم الهاتف غير صالح. استخدم الصيغة الجزائرية: 05X XX XX XX XX أو 0XX XX XX XX' : language === 'fr' ? 'Numéro invalide. Utilisez le format algérien : 05X XX XX XX XX ou 0XX XX XX XX' : 'Invalid phone. Use Algerian format: 05X XX XX XX XX (mobile) or 0XX XX XX XX (landline)')
      return
    }
    
    setIsLoading(true)

    try {
      // Sign up with Supabase Auth
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL || `${window.location.origin}/dashboard`,
          data: {
            full_name: fullName,
            full_name_ar: fullNameAr,
            phone: phone,
            user_type: 'patient',
          }
        }
      })

      if (signUpError) {
        if (signUpError.message.includes('already registered')) {
          setError(language === 'ar' ? 'البريد الإلكتروني مسجل مسبقاً' : language === 'fr' ? 'Cet email est déjà enregistré' : 'This email is already registered')
        } else {
          setError(signUpError.message)
        }
        setIsLoading(false)
        return
      }

      if (data.user) {
        // Update profile with additional info (non-blocking: trigger creates base profile)
        try {
          const { error: profileError } = await supabase
            .from('profiles')
            .update({
              full_name: fullName,
              full_name_ar: fullNameAr || fullName,
              phone: phone,
              date_of_birth: dateOfBirth || null,
              gender: gender || null,
              user_type: 'patient',
            })
            .eq('id', data.user.id)

          if (profileError) {
            console.error('Profile update error (non-fatal):', profileError)
          }
        } catch (profileErr) {
          console.error('Profile update failed (non-fatal):', profileErr)
        }

        // Always redirect or show success on auth success
        if (data.session) {
          // Keep loading visible until redirect completes
          const path = redirectTo && typeof redirectTo === 'string' && redirectTo.startsWith('/') && !redirectTo.startsWith('//') ? redirectTo : '/dashboard'
          router.push(path)
          router.refresh()
        } else {
          setSuccess(true)
          setIsLoading(false)
        }
      }
    } catch (err) {
      setError(language === 'ar' ? 'حدث خطأ. حاول مرة أخرى.' : language === 'fr' ? 'Une erreur est survenue. Réessayez.' : 'An error occurred. Please try again.')
      setIsLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-muted/30 flex flex-col" dir={dir}>
        <header className="border-b bg-card">
          <div className="container mx-auto flex h-14 sm:h-16 items-center justify-between px-3 sm:px-4 gap-2">
            <Link href="/" className="flex items-center gap-2 min-w-0">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
                <Stethoscope className="h-6 w-6 text-primary-foreground" />
              </div>
              <span className="text-xl font-semibold text-foreground">{t('appName')}</span>
            </Link>
            <LanguageSwitcher />
          </div>
        </header>

        <div className="flex-1 flex items-center justify-center p-4">
          <Card className="w-full max-w-md text-center">
            <CardHeader>
              <div className="flex justify-center mb-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
              </div>
              <CardTitle className="text-2xl">
                {language === 'ar' ? 'تم إنشاء الحساب!' : language === 'fr' ? 'Compte créé!' : 'Account Created!'}
              </CardTitle>
              <CardDescription className="text-base">
                {language === 'ar' ? 'تم إرسال رابط التأكيد إلى بريدك الإلكتروني. يرجى التحقق من صندوق الوارد.' : 
                 language === 'fr' ? 'Un lien de confirmation a été envoyé à votre email. Veuillez vérifier votre boîte de réception.' : 
                 'A confirmation link has been sent to your email. Please check your inbox.'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full">
                <Link href="/login">
                  {language === 'ar' ? 'الذهاب لتسجيل الدخول' : language === 'fr' ? 'Aller à la connexion' : 'Go to Login'}
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-muted/30 flex flex-col" dir={dir}>
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto flex h-14 sm:h-16 items-center justify-between px-3 sm:px-4 gap-2">
          <Link href="/" className="flex items-center gap-2 min-w-0">
            <div className="flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-lg bg-primary">
              <Stethoscope className="h-5 w-5 sm:h-6 sm:w-6 text-primary-foreground" />
            </div>
            <span className="text-base sm:text-xl font-semibold text-foreground truncate">{t('appName')}</span>
          </Link>
          <LanguageSwitcher />
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center p-4 py-6 sm:py-8 overflow-y-auto">
        <Card className="w-full max-w-md max-h-[calc(100vh-6rem)] overflow-y-auto relative">
          {/* Loading overlay - visible while processing/redirecting */}
          {isLoading && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 rounded-lg bg-background/80 backdrop-blur-sm">
              <LoadingSpinner size="xl" className="text-primary" />
              <p className="text-sm font-medium text-muted-foreground">
                {language === 'ar' ? 'جاري إنشاء الحساب...' : language === 'fr' ? 'Création du compte...' : 'Creating account...'}
              </p>
            </div>
          )}
          <CardHeader className="text-center">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
              <User className="h-4 w-4" />
              {language === 'ar' ? 'حساب مريض' : language === 'fr' ? 'Compte Patient' : 'Patient Account'}
            </div>
            <CardTitle className="text-2xl">{t('createAccount')}</CardTitle>
            <CardDescription>
              {language === 'ar' ? 'انضم إلى Siha DZ اليوم' : language === 'fr' ? 'Rejoignez Siha DZ aujourd\'hui' : 'Join Siha DZ today'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">{t('fullName')} <span className="text-destructive">*</span></Label>
                <div className="relative">
                  <User className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="fullName"
                    type="text"
                    placeholder={language === 'ar' ? 'أدخل اسمك الكامل' : language === 'fr' ? 'Entrez votre nom complet' : 'Enter your full name'}
                    className="ps-10"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />
                </div>
              </div>

              {language !== 'ar' && (
                <div className="space-y-2">
                  <Label htmlFor="fullNameAr">
                    {language === 'fr' ? 'Nom complet (Arabe)' : 'Full Name (Arabic)'}
                  </Label>
                  <Input
                    id="fullNameAr"
                    type="text"
                    placeholder="الاسم الكامل بالعربية"
                    value={fullNameAr}
                    onChange={(e) => setFullNameAr(e.target.value)}
                    dir="rtl"
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">{t('email')} <span className="text-destructive">*</span></Label>
                <div className="relative">
                  <Mail className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="email@example.com"
                    className="ps-10"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    dir="ltr"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">{t('phone')} <span className="text-destructive">*</span></Label>
                <div className="relative">
                  <Phone className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground z-10" />
                  <PhoneInput
                    id="phone"
                    className="ps-10"
                    value={phone}
                    onChange={setPhone}
                    required
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="dob">{t('dateOfBirth')}</Label>
                  <div className="relative">
                    <Calendar className="absolute start-3 rtl:start-auto rtl:end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="dob"
                      type="date"
                      className="ps-10 rtl:ps-3 rtl:pe-10"
                      value={dateOfBirth}
                      onChange={(e) => setDateOfBirth(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gender">{t('gender')}</Label>
                  <Select value={gender} onValueChange={setGender}>
                    <SelectTrigger>
                      <SelectValue placeholder={language === 'ar' ? 'اختر' : language === 'fr' ? 'Sélectionner' : 'Select'} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">{t('male')}</SelectItem>
                      <SelectItem value="female">{t('female')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">{t('password')} <span className="text-destructive">*</span></Label>
                <div className="relative">
                  <Lock className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    className="ps-10"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                    dir="ltr"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {language === 'ar' ? '8 أحرف على الأقل' : language === 'fr' ? 'Au moins 8 caractères' : 'At least 8 characters'}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">{t('confirmPassword')} <span className="text-destructive">*</span></Label>
                <div className="relative">
                  <Lock className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="••••••••"
                    className="ps-10"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    dir="ltr"
                  />
                </div>
              </div>

              <div className="flex items-start gap-2">
                <Checkbox 
                  id="terms" 
                  checked={agreeToTerms}
                  onCheckedChange={(checked) => setAgreeToTerms(checked as boolean)}
                  className="mt-1"
                />
                <Label htmlFor="terms" className="text-sm cursor-pointer">
                  {language === 'ar' ? 'أوافق على ' : language === 'fr' ? 'J\'accepte les ' : 'I agree to the '}
                  <Link href="/terms" className="text-primary hover:underline">{t('terms')}</Link>
                  {language === 'ar' ? ' و' : language === 'fr' ? ' et la ' : ' and '}
                  <Link href="/privacy" className="text-primary hover:underline">{t('privacy')}</Link>
                </Label>
              </div>

              <Button type="submit" className="w-full gap-2" disabled={isLoading || !agreeToTerms}>
                {isLoading ? (
                  <>
                    <LoadingSpinner size="sm" />
                    {language === 'ar' ? 'جاري إنشاء الحساب...' : language === 'fr' ? 'Création du compte...' : 'Creating account...'}
                  </>
                ) : (
                  <>
                    {t('createAccount')}
                    <ArrowIcon className="h-4 w-4" />
                  </>
                )}
              </Button>
            </form>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">
                  {language === 'ar' ? 'أو' : language === 'fr' ? 'Ou' : 'Or'}
                </span>
              </div>
            </div>

            {/* Google Sign Up */}
            <Button 
              type="button" 
              variant="outline" 
              className="w-full gap-3 bg-transparent" 
              disabled={isLoading}
              onClick={async () => {
                if (!agreeToTerms) {
                  setError(language === 'ar' ? 'يجب الموافقة على الشروط والأحكام' : language === 'fr' ? 'Vous devez accepter les conditions' : 'You must agree to the terms')
                  return
                }
                setIsLoading(true)
                setError(null)
                try {
                  const { error } = await supabase.auth.signInWithOAuth({
                    provider: 'google',
                    options: {
                      redirectTo: `${window.location.origin}/auth/callback`,
                      queryParams: {
                        access_type: 'offline',
                        prompt: 'consent',
                      }
                    }
                  })
                  if (error) {
                    setError(language === 'ar' ? 'فشل التسجيل بجوجل' : language === 'fr' ? 'Échec de l\'inscription Google' : 'Google sign up failed')
                  }
                } catch (err) {
                  setError(language === 'ar' ? 'حدث خطأ' : language === 'fr' ? 'Une erreur est survenue' : 'An error occurred')
                } finally {
                  setIsLoading(false)
                }
              }}
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              {language === 'ar' ? 'التسجيل بحساب جوجل' : language === 'fr' ? 'S\'inscrire avec Google' : 'Sign up with Google'}
            </Button>

            <div className="mt-6 text-center text-sm">
              <span className="text-muted-foreground">{t('haveAccount')} </span>
              <Link href="/login" className="text-primary hover:underline font-medium">
                {t('login')}
              </Link>
            </div>

            <div className="mt-4 text-center">
              <Link href="/professional/auth/signup" className="text-sm text-primary hover:underline font-medium">
                {language === 'ar' ? 'التسجيل كمزود خدمة صحية' : language === 'fr' ? 'S\'inscrire en tant que professionnel' : 'Register as a Healthcare Professional'}
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
