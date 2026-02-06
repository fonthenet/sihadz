'use client'

export const dynamic = 'force-dynamic'

import React, { useState } from "react"
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { useLanguage } from '@/lib/i18n/language-context'
import { LanguageSwitcher } from '@/components/language-switcher'
import { Stethoscope, Mail, Lock, ArrowRight, ArrowLeft, User, Briefcase, Pill, Eye, EyeOff } from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/page-loading'
import { AppLogo } from '@/components/app-logo'
import { createBrowserClient } from '@/lib/supabase/client'

const getRegisterLink = () => '/register'; // Declare getRegisterLink function

export default function LoginPage() {
  const { t, language, dir } = useLanguage()
  const router = useRouter()
  const supabase = createBrowserClient()
  
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [accountType, setAccountType] = useState('patient') // Declare accountType and setAccountType

  const ArrowIcon = dir === 'rtl' ? ArrowLeft : ArrowRight

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (signInError) {
        setError(language === 'ar' ? 'البريد الإلكتروني أو كلمة المرور غير صحيحة' : 
                 language === 'fr' ? 'Email ou mot de passe incorrect' : 
                 signInError.message || 'Invalid email or password')
        setIsLoading(false)
        return
      }

      if (data.user) {
        // BYPASS DATABASE - Check email directly for known super admins
        const SUPER_ADMIN_EMAILS = ['f.onthenet@gmail.com', 'info@sihadz.com']
        
        if (SUPER_ADMIN_EMAILS.includes(data.user.email || '')) {
          // Direct redirect for known admins - no database query needed
          console.log('Super admin detected by email, redirecting...')
          window.location.href = '/super-admin'
          return
        }

        // For other users, try to check profile but handle errors gracefully
        let redirectPath = '/dashboard'
        
        try {
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('user_type')
            .eq('id', data.user.id)
            .maybeSingle()

          if (!profileError && profile) {
            const userType = profile.user_type
            
            if (userType === 'super_admin' || userType === 'admin') {
              redirectPath = '/super-admin'
            } else if (['doctor', 'nurse', 'pharmacy', 'laboratory', 'clinic', 'professional', 'ambulance'].includes(userType || '')) {
              redirectPath = '/professional/dashboard'
            }
          }
        } catch (err) {
          console.error('Profile query failed, using default redirect:', err)
        }
        
        window.location.href = redirectPath
      }
    } catch (err) {
      setError(language === 'ar' ? 'حدث خطأ. حاول مرة أخرى.' : 
               language === 'fr' ? 'Une erreur est survenue. Réessayez.' : 
               'An error occurred. Please try again.')
      setIsLoading(false)
    }
  }



  return (
    <div className="min-h-screen bg-muted/30 flex flex-col" dir={dir}>
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2">
            <AppLogo size="md" />
            <span className="text-xl font-semibold text-foreground">{t('appName')}</span>
          </Link>
          <LanguageSwitcher />
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className={`${dir === 'rtl' ? 'text-right' : 'text-center'}`}>
            <div className={`mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 ${dir === 'rtl' ? 'ml-auto' : 'mx-auto'}`}>
              <User className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-2xl">
              {language === 'ar' ? 'مرحبًا بك' : language === 'fr' ? 'Bienvenue' : 'Patient Login'}
            </CardTitle>
            <CardDescription>
              {language === 'ar' ? 'سجل الدخول لحساب المريض' : language === 'fr' ? 'Connectez-vous à votre compte patient' : 'Sign in to your patient account'}
            </CardDescription>
          </CardHeader>
          <CardContent>

            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className={`space-y-4 ${dir === 'rtl' ? 'text-right' : ''}`}>
              <div className="space-y-2">
                <Label htmlFor="email" className={dir === 'rtl' ? 'block text-right' : ''}>{t('email')}</Label>
                <div className="relative">
                  <Mail className={`absolute top-2.5 h-5 w-5 text-muted-foreground pointer-events-none ${dir === 'rtl' ? 'end-3' : 'start-3'}`} />
                  <Input
                    id="email"
                    type="email"
                    placeholder="email@example.com"
                    className="ps-11 pe-11"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    dir="ltr"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className={`flex items-center ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
                  <Label htmlFor="password" className={dir === 'rtl' ? 'flex-1 text-right' : ''}>{t('password')}</Label>
                  <Link href="/forgot-password" className={`text-sm text-primary hover:underline ${dir === 'rtl' ? 'mr-auto' : 'ml-auto'}`}>
                    {t('forgotPassword')}
                  </Link>
                </div>
                <div className="relative">
                  <Lock className={`absolute top-2.5 h-5 w-5 text-muted-foreground pointer-events-none ${dir === 'rtl' ? 'end-3' : 'start-3'}`} />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    className="ps-11 pe-11"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    dir="ltr"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className={`absolute top-2.5 text-muted-foreground hover:text-foreground ${dir === 'rtl' ? 'start-3' : 'end-3'}`}
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <div className={`flex items-center gap-2 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
                <Checkbox 
                  id="remember" 
                  checked={rememberMe}
                  onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                />
                <Label htmlFor="remember" className="text-sm cursor-pointer">
                  {t('rememberMe')}
                </Label>
              </div>

              <Button type="submit" className="w-full gap-2" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <LoadingSpinner size="sm" />
                    {language === 'ar' ? 'جاري تسجيل الدخول...' : language === 'fr' ? 'Connexion...' : 'Signing in...'}
                  </>
                ) : (
                  <>
                    {t('login')}
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

            {/* Google Sign In */}
            <Button 
              type="button" 
              variant="outline" 
              className="w-full gap-3 bg-transparent" 
              disabled={isLoading}
              onClick={async () => {
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
                    setError(language === 'ar' ? 'فشل تسجيل الدخول بجوجل' : language === 'fr' ? 'Échec de la connexion Google' : 'Google sign in failed')
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
              {language === 'ar' ? 'الدخول بحساب جوجل' : language === 'fr' ? 'Continuer avec Google' : 'Continue with Google'}
            </Button>

            <div className="mt-6 text-center text-sm">
              <span className="text-muted-foreground">{t('noAccount')} </span>
              <Link href="/register" className="text-primary hover:underline font-medium">
                {t('createAccount')}
              </Link>
            </div>

            {/* Professional Login Link */}
            <div className={`mt-4 pt-4 border-t ${dir === 'rtl' ? 'text-right' : 'text-center'}`}>
              <p className="text-sm text-muted-foreground mb-2">
                {language === 'ar' ? 'هل أنت طبيب أو صيدلي أو مختبر؟' : language === 'fr' ? 'Êtes-vous un professionnel de santé ?' : 'Are you a healthcare professional?'}
              </p>
              <Link 
                href="/professional/auth/login" 
                className={`inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}
              >
                <Stethoscope className="h-4 w-4" />
                {language === 'ar' ? 'دخول المهنيين' : language === 'fr' ? 'Connexion professionnelle' : 'Professional Login'}
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
