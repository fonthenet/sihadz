'use client'

import React from "react"
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Stethoscope, Mail, Lock, Building2, Phone, AlertCircle, CheckCircle, ArrowLeft, ArrowRight } from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/page-loading'
import { createBrowserClient } from '@/lib/supabase/client'
import { useLanguage } from '@/lib/i18n/language-context'
import { Suspense } from 'react'
import Loading from './loading'
import { createProfessionalRecord } from './actions'

const PROFESSIONAL_TYPES_EN = [
  { value: 'doctor', label: 'Doctor (Individual Practitioner)' },
  { value: 'clinic', label: 'Clinic / Medical Center' },
  { value: 'pharmacy', label: 'Pharmacy' },
  { value: 'laboratory', label: 'Laboratory / Diagnostic Center' },
  { value: 'radiology', label: 'Radiology / Imaging Center' },
  { value: 'ambulance', label: 'Ambulance Service' },
  { value: 'dental', label: 'Dental Clinic' },
  { value: 'other', label: 'Other Healthcare Provider' },
]

const PROFESSIONAL_TYPES_AR = [
  { value: 'doctor', label: 'طبيب (ممارس فردي)' },
  { value: 'clinic', label: 'عيادة / مركز طبي' },
  { value: 'pharmacy', label: 'صيدلية' },
  { value: 'laboratory', label: 'مختبر / مركز تشخيصي' },
  { value: 'radiology', label: 'قسم الأشعاع' },
  { value: 'ambulance', label: 'خدمة الإسعاف' },
  { value: 'dental', label: 'عيادة أسنان' },
  { value: 'other', label: 'مزود خدمات صحية آخر' },
]

export default function ProfessionalSignupPage() {
  const router = useRouter()
  const { language, dir, t: contextT } = useLanguage()
  const [step, setStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  
  // Form data
  const [professionalType, setProfessionalType] = useState('')
  const [businessName, setBusinessName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const PROFESSIONAL_TYPES = language === 'ar' ? PROFESSIONAL_TYPES_AR : PROFESSIONAL_TYPES_EN

  // Translation function
  const t = (key: string) => {
    const translations: Record<string, Record<string, string>> = {
      'ar': {
        'join_professional': 'انضم إلى Siha DZ كمحترف',
        'register_practice': 'سجل مكتبك وابدأ في قبول المواعيد عبر الإنترنت',
        'professional_type': 'نوع الخدمة الصحية',
        'select_type': 'اختر النوع',
        'business_name': 'اسم المؤسسة',
        'business_placeholder': 'عيادة د. أحمد',
        'email': 'البريد الإلكتروني',
        'email_placeholder': 'example@gmail.com',
        'phone': 'رقم الهاتف',
        'phone_placeholder': '0555123456',
        'password': 'كلمة المرور',
        'password_placeholder': 'الحد الأدنى 6 أحرف',
        'confirm_password': 'تأكيد كلمة المرور',
        'confirm_placeholder': 'أعد إدخال كلمة المرور',
        'passwords_match': 'كلمات المرور غير متطابقة',
        'password_length': 'يجب أن تكون كلمة المرور 6 أحرف على الأقل',
        'failed': 'فشل التسجيل. يرجى المحاولة مرة أخرى.',
        'next_step': 'التالي',
        'back': 'رجوع',
        'create_account': 'إنشاء حساب',
        'creating': 'جاري الإنشاء...',
        'have_account': 'هل لديك حساب بالفعل؟',
        'sign_in': 'تسجيل الدخول هنا',
        'or': 'أو',
        'back_to_patient': '← العودة إلى بوابة المرضى',
        'account_created': 'تم إنشاء الحساب بنجاح!',
        'check_email': 'سيتم توجيهك إلى إكمال ملفك الشخصي',
      },
      'fr': {
        'join_professional': 'Rejoindre Siha DZ en tant que professionnel',
        'register_practice': 'Enregistrez votre cabinet et commencez à accepter des rendez-vous en ligne',
        'professional_type': 'Type de service de santé',
        'select_type': 'Sélectionnez le type',
        'business_name': 'Nom de l\'entreprise',
        'business_placeholder': 'Clinique du Dr Ahmed',
        'email': 'Adresse e-mail',
        'email_placeholder': 'exemple@gmail.com',
        'phone': 'Numéro de téléphone',
        'phone_placeholder': '0555123456',
        'password': 'Mot de passe',
        'password_placeholder': 'Minimum 6 caractères',
        'confirm_password': 'Confirmer le mot de passe',
        'confirm_placeholder': 'Ressaisissez le mot de passe',
        'passwords_match': 'Les mots de passe ne correspondent pas',
        'password_length': 'Le mot de passe doit contenir au moins 6 caractères',
        'failed': 'Échec de l\'inscription. Veuillez réessayer.',
        'next_step': 'Suivant',
        'back': 'Retour',
        'create_account': 'Créer un compte',
        'creating': 'Création...',
        'have_account': 'Vous avez déjà un compte ?',
        'sign_in': 'Se connecter ici',
        'or': 'OU',
        'back_to_patient': '← Retour au portail patient',
        'account_created': 'Compte créé avec succès !',
        'check_email': 'Vous allez être redirigé pour compléter votre profil',
      },
      'en': {
        'join_professional': 'Join Siha DZ as a Professional',
        'register_practice': 'Register your practice and start accepting online appointments',
        'professional_type': 'Healthcare Service Type',
        'select_type': 'Select type',
        'business_name': 'Business Name',
        'business_placeholder': 'Dr. Ahmed\'s Clinic',
        'email': 'Email Address',
        'email_placeholder': 'example@gmail.com',
        'phone': 'Phone Number',
        'phone_placeholder': '0555123456',
        'password': 'Password',
        'password_placeholder': 'Minimum 6 characters',
        'confirm_password': 'Confirm Password',
        'confirm_placeholder': 'Re-enter password',
        'passwords_match': 'Passwords do not match',
        'password_length': 'Password must be at least 6 characters long',
        'failed': 'Signup failed. Please try again.',
        'next_step': 'Next',
        'back': 'Back',
        'create_account': 'Create Account',
        'creating': 'Creating...',
        'have_account': 'Already have an account?',
        'sign_in': 'Sign in here',
        'or': 'OR',
        'back_to_patient': '← Back to patient portal',
        'account_created': 'Account Created Successfully!',
        'check_email': 'You will be redirected to complete your profile',
      },
    }

    return translations[language]?.[key] || translations['en'][key] || key
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // If we're on step 1, just go to step 2 instead of submitting
    if (step === 1) {
      if (professionalType && businessName) {
        setStep(2)
      }
      return
    }
    
    setIsLoading(true)
    setError('')

    try {
      if (password !== confirmPassword) {
        throw new Error(t('passwords_match'))
      }

      if (password.length < 6) {
        throw new Error(t('password_length'))
      }

      const supabase = createBrowserClient()

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL || `${window.location.origin}/professional/dashboard`,
          data: {
            user_type: 'professional',
            business_name: businessName,
            phone: phone,
            professional_type: professionalType
          }
        },
      })
      
      console.log('[v0] Signup response:', { 
        user: authData?.user?.id, 
        session: authData?.session?.access_token ? 'exists' : 'null',
        error: authError 
      })

      if (authError) {
        console.error('[v0] Auth signup error details:', {
          message: authError.message,
          status: authError.status,
          code: (authError as any).code
        })
        
        // Handle specific auth errors
        if (authError.message.toLowerCase().includes('already registered') || 
            authError.message.toLowerCase().includes('user already registered')) {
          throw new Error('This email is already registered. Please login instead or use a different email address.')
        }
        if (authError.message.toLowerCase().includes('invalid') && authError.message.toLowerCase().includes('email')) {
          throw new Error('This email address cannot be used. It may have been previously registered and deleted. Please use a different email address or contact support.')
        }
        if (authError.message.toLowerCase().includes('email confirmation')) {
          throw new Error('Email confirmation is required. Please check your Supabase settings or contact support.')
        }
        throw new Error(`Signup failed: ${authError.message}`)
      }

      if (!authData.user) {
        throw new Error('Failed to create user account')
      }

      // Use server action to create professional record (bypasses RLS)
      const result = await createProfessionalRecord({
        authUserId: authData.user.id,
        email: email,
        phone: phone,
        businessName: businessName,
        professionalType: professionalType,
      })

      if (!result.success) {
        // Clean up the auth user if professional record creation fails
        await supabase.auth.signOut()
        
        // Handle specific database errors
        if (result.error && result.error.includes('duplicate key')) {
          if (result.error.includes('email')) {
            throw new Error('This email is already registered. Please login instead.')
          }
          throw new Error('An account with these details already exists. Please check your information or contact support.')
        }
        
        throw new Error(result.error || 'Failed to create professional account')
      }

      console.log('[v0] Signup successful, checking session:', !!authData.session)
      
      // If we have a session from signup, user is automatically logged in
      if (authData.session) {
        console.log('[v0] User has session, redirecting to onboarding')
        setSuccess(true)
        
        // Redirect to onboarding immediately
        setTimeout(() => {
          router.replace(`/professional/onboarding?lang=${language}`)
        }, 500)
        return
      }
      
      // No session means email confirmation is required
      console.log('[v0] No session - email confirmation required')
      setSuccess(true)
      setError('Account created! Please check your email to confirm your account, then log in to complete your profile.')
      
      // Redirect to login after showing message
      setTimeout(() => {
        router.push(`/professional/auth/login?lang=${language}`)
      }, 3000)

    } catch (err) {
      console.error('[v0] Professional signup error:', err)
      setError(err instanceof Error ? err.message : t('failed'))
    } finally {
      setIsLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-cyan-50 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className={`${dir === 'rtl' ? 'text-right' : 'text-center'}`}>
            <div className={`flex mb-4 ${dir === 'rtl' ? 'justify-end' : 'justify-center'}`}>
              <div className="bg-green-100 p-3 rounded-full">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold">{t('account_created')}</CardTitle>
            <CardDescription>
              {t('check_email')}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-cyan-50 p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className={`space-y-1 ${dir === 'rtl' ? 'text-right' : 'text-center'}`}>
          <div className={`flex mb-4 ${dir === 'rtl' ? 'justify-end' : 'justify-center'}`}>
            <div className="bg-primary/10 p-3 rounded-full">
              <Stethoscope className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">{t('join_professional')}</CardTitle>
          <CardDescription>
            {t('register_practice')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<Loading />}>
            <form onSubmit={handleSignup} className={`space-y-6 ${dir === 'rtl' ? 'text-right' : ''}`}>
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* Step 1: Professional Type */}
              {step === 1 && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="type" className={dir === 'rtl' ? 'block text-right' : ''}>{t('professional_type')}</Label>
                    <Select value={professionalType} onValueChange={setProfessionalType} required>
                      <SelectTrigger>
                        <SelectValue placeholder={t('select_type')} />
                      </SelectTrigger>
                      <SelectContent>
                        {PROFESSIONAL_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="businessName" className={dir === 'rtl' ? 'block text-right' : ''}>{t('business_name')}</Label>
                    <div className="relative">
                      <Building2 className={`absolute top-2.5 h-5 w-5 text-muted-foreground pointer-events-none ${dir === 'rtl' ? 'end-3' : 'start-3'}`} />
                      <Input
                        id="businessName"
                        placeholder={t('business_placeholder')}
                        value={businessName}
                        onChange={(e) => setBusinessName(e.target.value)}
                        className={dir === 'rtl' ? 'pe-11 ps-4 text-right' : 'ps-11 pe-4'}
                        required
                        dir={dir}
                      />
                    </div>
                  </div>

                  <Button 
                    type="button" 
                    className="w-full" 
                    onClick={() => setStep(2)}
                    disabled={!professionalType || !businessName}
                  >
                    {t('next_step')}
                    {dir === 'rtl' ? <ArrowLeft className="ml-2 h-4 w-4" /> : <ArrowRight className="ml-2 h-4 w-4" />}
                  </Button>
                </div>
              )}

              {/* Step 2: Contact & Password */}
              {step === 2 && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email" className={dir === 'rtl' ? 'block text-right' : ''}>{t('email')}</Label>
                    <div className="relative">
                      <Mail className={`absolute top-2.5 h-5 w-5 text-muted-foreground pointer-events-none ${dir === 'rtl' ? 'end-3' : 'start-3'}`} />
                      <Input
                        id="email"
                        type="email"
                        placeholder={t('email_placeholder')}
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className={dir === 'rtl' ? 'pe-11 ps-4' : 'ps-11 pe-4'}
                        required
                        dir="ltr"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone" className={dir === 'rtl' ? 'block text-right' : ''}>{t('phone')}</Label>
                    <div className="relative">
                      <Phone className={`absolute top-2.5 h-5 w-5 text-muted-foreground pointer-events-none ${dir === 'rtl' ? 'end-3' : 'start-3'}`} />
                      <Input
                        id="phone"
                        type="tel"
                        placeholder={t('phone_placeholder')}
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className={dir === 'rtl' ? 'pe-11 ps-4' : 'ps-11 pe-4'}
                        required
                        dir="ltr"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password" className={dir === 'rtl' ? 'block text-right' : ''}>{t('password')}</Label>
                    <div className="relative">
                      <Lock className={`absolute top-2.5 h-5 w-5 text-muted-foreground pointer-events-none ${dir === 'rtl' ? 'end-3' : 'start-3'}`} />
                      <Input
                        id="password"
                        type="password"
                        placeholder={t('password_placeholder')}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className={dir === 'rtl' ? 'pe-11 ps-4' : 'ps-11 pe-4'}
                        required
                        dir="ltr"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword" className={dir === 'rtl' ? 'block text-right' : ''}>{t('confirm_password')}</Label>
                    <div className="relative">
                      <Lock className={`absolute top-2.5 h-5 w-5 text-muted-foreground pointer-events-none ${dir === 'rtl' ? 'end-3' : 'start-3'}`} />
                      <Input
                        id="confirmPassword"
                        type="password"
                        placeholder={t('confirm_placeholder')}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className={dir === 'rtl' ? 'pe-11 ps-4' : 'ps-11 pe-4'}
                        required
                        dir="ltr"
                      />
                    </div>
                  </div>

                  <div className={`flex gap-3 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
                    <Button 
                      type="button" 
                      variant="outline" 
                      className="flex-1 bg-transparent"
                      onClick={() => setStep(1)}
                    >
                      {dir === 'rtl' ? <ArrowRight className="ml-2 h-4 w-4" /> : <ArrowLeft className="mr-2 h-4 w-4" />}
                      {t('back')}
                    </Button>
                    <Button type="submit" className="flex-1" disabled={isLoading}>
                      {isLoading ? (
                        <>
                          <LoadingSpinner size="sm" className="me-2" />
                          {t('creating')}
                        </>
                      ) : (
                        t('create_account')
                      )}
                    </Button>
                  </div>
                </div>
              )}

              <div className={`text-center text-sm ${dir === 'rtl' ? 'text-right' : ''}`}>
                <p className="text-muted-foreground">
                  {t('have_account')}{' '}
                  <Link href="/professional/auth/login" className="text-primary hover:underline">
                    {t('sign_in')}
                  </Link>
                </p>
                
                <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">{t('or')}</span>
                  </div>
                </div>

                <Link href="/" className="text-sm text-muted-foreground hover:text-primary">
                  {t('back_to_patient')}
                </Link>
              </div>
            </form>
          </Suspense>
        </CardContent>
      </Card>
    </div>
  )
}
