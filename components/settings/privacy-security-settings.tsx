'use client'

/**
 * Privacy & Security Settings
 * Reusable component for change password, Google account linking, and account security
 */

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { createBrowserClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Shield, Lock, Check, LogOut, Link2, Unlink, Mail, Eye, EyeOff } from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/page-loading'

const LABELS = {
  en: {
    title: 'Privacy & Security',
    description: 'Manage your account security and password',
    changeEmail: 'Change Email',
    changeEmailDesc: 'Update your login email. A confirmation link will be sent to the new address.',
    currentEmail: 'Current email',
    newEmail: 'New email',
    emailPasswordConfirm: 'Confirm with password',
    updateEmail: 'Update email',
    emailUpdateSent: 'Confirmation email sent. Check your new inbox to complete the change.',
    emailRequired: 'Enter new email',
    emailInvalid: 'Enter a valid email',
    changePassword: 'Change Password',
    changePasswordDesc: 'Update your password to keep your account secure',
    currentPassword: 'Current password',
    newPassword: 'New password',
    confirmPassword: 'Confirm new password',
    updatePassword: 'Update password',
    passwordUpdated: 'Password updated successfully',
    currentPasswordRequired: 'Enter current password',
    passwordTooShort: 'New password must be at least 6 characters',
    passwordsDontMatch: 'Passwords do not match',
    currentPasswordIncorrect: 'Current password is incorrect',
    sessionNotFound: 'Session not found',
    signOut: 'Sign out',
    signOutDesc: 'Sign out of this device',
    signOutAll: 'Sign out of all devices',
    signOutAllDesc: 'Invalidate all sessions. You will need to sign in again everywhere.',
    linkGoogle: 'Link Google account',
    linkGoogleDesc: 'Sign in with Google instead of password. Link your Google account to use it for login.',
    googleLinked: 'Google account linked',
    linkGoogleBtn: 'Link Google account',
    unlinkGoogle: 'Unlink Google',
    unlinkGoogleConfirm: 'You will need another way to sign in before unlinking.',
    googleLinkSuccess: 'Google account linked successfully',
    googleLinkError: 'Failed to link Google account',
    googleUnlinkSuccess: 'Google account unlinked',
    googleUnlinkError: 'Failed to unlink. You need at least 2 sign-in methods.',
    manualLinkingDisabled: 'Account linking is not enabled. Contact support.',
  },
  fr: {
    title: 'Confidentialité et sécurité',
    description: 'Gérer la sécurité de votre compte et votre mot de passe',
    changeEmail: 'Changer l\'email',
    changeEmailDesc: 'Mettez à jour votre email de connexion. Un lien de confirmation sera envoyé à la nouvelle adresse.',
    currentEmail: 'Email actuel',
    newEmail: 'Nouvel email',
    emailPasswordConfirm: 'Confirmer avec le mot de passe',
    updateEmail: 'Mettre à jour l\'email',
    emailUpdateSent: 'Email de confirmation envoyé. Vérifiez votre nouvelle boîte mail.',
    emailRequired: 'Entrez le nouvel email',
    emailInvalid: 'Entrez un email valide',
    changePassword: 'Changer le mot de passe',
    changePasswordDesc: 'Mettez à jour votre mot de passe pour sécuriser votre compte',
    currentPassword: 'Mot de passe actuel',
    newPassword: 'Nouveau mot de passe',
    confirmPassword: 'Confirmer le nouveau mot de passe',
    updatePassword: 'Mettre à jour',
    passwordUpdated: 'Mot de passe mis à jour',
    currentPasswordRequired: 'Entrez le mot de passe actuel',
    passwordTooShort: 'Le nouveau mot de passe doit contenir au moins 6 caractères',
    passwordsDontMatch: 'Les mots de passe ne correspondent pas',
    currentPasswordIncorrect: 'Mot de passe actuel incorrect',
    sessionNotFound: 'Session introuvable',
    signOut: 'Déconnexion',
    signOutDesc: 'Se déconnecter de cet appareil',
    signOutAll: 'Déconnexion de tous les appareils',
    signOutAllDesc: 'Invalider toutes les sessions. Vous devrez vous reconnecter partout.',
    linkGoogle: 'Lier le compte Google',
    linkGoogleDesc: 'Connectez-vous avec Google au lieu du mot de passe.',
    googleLinked: 'Compte Google lié',
    linkGoogleBtn: 'Lier le compte Google',
    unlinkGoogle: 'Délier Google',
    unlinkGoogleConfirm: 'Vous aurez besoin d\'une autre méthode de connexion avant de délier.',
    googleLinkSuccess: 'Compte Google lié avec succès',
    googleLinkError: 'Échec de la liaison du compte Google',
    googleUnlinkSuccess: 'Compte Google délié',
    googleUnlinkError: 'Échec du déliage. Vous avez besoin d\'au moins 2 méthodes de connexion.',
    manualLinkingDisabled: 'La liaison de compte n\'est pas activée. Contactez le support.',
  },
  ar: {
    title: 'الخصوصية والأمان',
    description: 'إدارة أمان حسابك وكلمة المرور',
    changeEmail: 'تغيير البريد الإلكتروني',
    changeEmailDesc: 'تحديث بريدك الإلكتروني للدخول. سيتم إرسال رابط تأكيد إلى العنوان الجديد.',
    currentEmail: 'البريد الحالي',
    newEmail: 'البريد الجديد',
    emailPasswordConfirm: 'تأكيد بكلمة المرور',
    updateEmail: 'تحديث البريد',
    emailUpdateSent: 'تم إرسال بريد التأكيد. تحقق من صندوق الوارد الجديد.',
    emailRequired: 'أدخل البريد الجديد',
    emailInvalid: 'أدخل بريداً إلكترونياً صالحاً',
    changePassword: 'تغيير كلمة المرور',
    changePasswordDesc: 'تحديث كلمة المرور لتأمين حسابك',
    currentPassword: 'كلمة المرور الحالية',
    newPassword: 'كلمة المرور الجديدة',
    confirmPassword: 'تأكيد كلمة المرور الجديدة',
    updatePassword: 'تحديث',
    passwordUpdated: 'تم تحديث كلمة المرور',
    currentPasswordRequired: 'أدخل كلمة المرور الحالية',
    passwordTooShort: 'كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل',
    passwordsDontMatch: 'كلمات المرور غير متطابقة',
    currentPasswordIncorrect: 'كلمة المرور الحالية غير صحيحة',
    sessionNotFound: 'لم يتم العثور على الجلسة',
    signOut: 'تسجيل الخروج',
    signOutDesc: 'تسجيل الخروج من هذا الجهاز',
    signOutAll: 'تسجيل الخروج من جميع الأجهزة',
    signOutAllDesc: 'إبطال جميع الجلسات. ستحتاج لتسجيل الدخول مرة أخرى في كل مكان.',
    linkGoogle: 'ربط حساب جوجل',
    linkGoogleDesc: 'تسجيل الدخول باستخدام جوجل بدلاً من كلمة المرور.',
    googleLinked: 'حساب جوجل مرتبط',
    linkGoogleBtn: 'ربط حساب جوجل',
    unlinkGoogle: 'فك ربط جوجل',
    unlinkGoogleConfirm: 'ستحتاج إلى طريقة أخرى لتسجيل الدخول قبل فك الربط.',
    googleLinkSuccess: 'تم ربط حساب جوجل بنجاح',
    googleLinkError: 'فشل ربط حساب جوجل',
    googleUnlinkSuccess: 'تم فك ربط حساب جوجل',
    googleUnlinkError: 'فشل فك الربط. تحتاج إلى طريقة تسجيل دخول أخرى على الأقل.',
    manualLinkingDisabled: 'ربط الحسابات غير مفعّل. اتصل بالدعم.',
  },
} as const

function GoogleIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  )
}

interface PrivacySecuritySettingsProps {
  language?: 'en' | 'fr' | 'ar'
  onSignOut?: () => void
  compact?: boolean
  /** Tab value to add to return URL after OAuth (e.g. "security" or "account") */
  settingsTab?: string
}

export function PrivacySecuritySettings({
  language = 'en',
  onSignOut,
  compact = false,
  settingsTab = 'security',
}: PrivacySecuritySettingsProps) {
  const pathname = usePathname()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrentPw, setShowCurrentPw] = useState(false)
  const [showNewPw, setShowNewPw] = useState(false)
  const [showConfirmPw, setShowConfirmPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [googleLinked, setGoogleLinked] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [identitiesLoading, setIdentitiesLoading] = useState(true)
  // Change email
  const [currentAuthEmail, setCurrentAuthEmail] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [emailPassword, setEmailPassword] = useState('')
  const [showEmailPw, setShowEmailPw] = useState(false)
  const [emailLoading, setEmailLoading] = useState(false)
  const [emailSuccess, setEmailSuccess] = useState(false)

  const l = LABELS[language]

  useEffect(() => {
    const loadEmail = async () => {
      const supabase = createBrowserClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user?.email) setCurrentAuthEmail(user.email)
    }
    loadEmail()
  }, [])

  useEffect(() => {
    const checkIdentities = async () => {
      const supabase = createBrowserClient()
      const { data } = await supabase.auth.getUserIdentities()
      const hasGoogle = data?.identities?.some((i) => i.provider === 'google') ?? false
      setGoogleLinked(hasGoogle)
      setIdentitiesLoading(false)
    }
    checkIdentities()
  }, [])

  const handleUpdatePassword = async () => {
    setError(null)
    setSuccess(false)
    if (!currentPassword.trim()) {
      setError(l.currentPasswordRequired)
      return
    }
    if (newPassword.length < 6) {
      setError(l.passwordTooShort)
      return
    }
    if (newPassword !== confirmPassword) {
      setError(l.passwordsDontMatch)
      return
    }
    setLoading(true)
    try {
      const supabase = createBrowserClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user?.email) {
        setError(l.sessionNotFound)
        return
      }
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      })
      if (signInError) {
        setError(l.currentPasswordIncorrect)
        return
      }
      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword })
      if (updateError) throw updateError
      setSuccess(true)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setTimeout(() => setSuccess(false), 4000)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update password')
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateEmail = async () => {
    setError(null)
    setEmailSuccess(false)
    const trimmed = newEmail.trim()
    if (!trimmed) {
      setError(l.emailRequired)
      return
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(trimmed)) {
      setError(l.emailInvalid)
      return
    }
    if (!emailPassword.trim()) {
      setError(l.currentPasswordRequired)
      return
    }
    setEmailLoading(true)
    try {
      const supabase = createBrowserClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user?.email) {
        setError(l.sessionNotFound)
        return
      }
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: emailPassword,
      })
      if (signInError) {
        setError(l.currentPasswordIncorrect)
        return
      }
      const { error: updateError } = await supabase.auth.updateUser({ email: trimmed })
      if (updateError) throw updateError
      setEmailSuccess(true)
      setNewEmail('')
      setEmailPassword('')
      setTimeout(() => setEmailSuccess(false), 6000)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update email')
    } finally {
      setEmailLoading(false)
    }
  }

  const handleSignOut = async () => {
    const supabase = createBrowserClient()
    await supabase.auth.signOut()
    onSignOut?.()
    window.location.href = '/login'
  }

  const returnPath = pathname ? `${pathname}?tab=${settingsTab}` : '/dashboard/settings?tab=security'

  const handleLinkGoogle = async () => {
    setGoogleLoading(true)
    setError(null)
    try {
      const supabase = createBrowserClient()
      const { data, error: linkError } = await supabase.auth.linkIdentity({
        provider: 'google',
        options: {
          redirectTo: `${typeof window !== 'undefined' ? window.location.origin : ''}/auth/callback?next=${encodeURIComponent(returnPath)}`,
          queryParams: { access_type: 'offline', prompt: 'consent' },
        },
      })
      if (linkError) {
        if (linkError.message?.toLowerCase().includes('manual linking') || linkError.message?.toLowerCase().includes('not enabled')) {
          setError(l.manualLinkingDisabled)
        } else {
          setError(l.googleLinkError)
        }
        return
      }
      if (data?.url) window.location.assign(data.url)
    } catch {
      setError(l.googleLinkError)
    } finally {
      setGoogleLoading(false)
    }
  }

  const handleUnlinkGoogle = async () => {
    setGoogleLoading(true)
    setError(null)
    try {
      const supabase = createBrowserClient()
      const { data } = await supabase.auth.getUserIdentities()
      const googleIdentity = data?.identities?.find((i) => i.provider === 'google')
      if (!googleIdentity) {
        setGoogleLinked(false)
        return
      }
      if ((data?.identities?.length ?? 0) < 2) {
        setError(l.googleUnlinkError)
        return
      }
      const { error: unlinkError } = await supabase.auth.unlinkIdentity(googleIdentity)
      if (unlinkError) throw unlinkError
      setGoogleLinked(false)
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch {
      setError(l.googleUnlinkError)
    } finally {
      setGoogleLoading(false)
    }
  }

  const PwInput = ({
    value,
    onChange,
    show,
    onToggle,
    placeholder,
    autoComplete,
    disabled,
    id,
  }: {
    value: string
    onChange: (v: string) => void
    show: boolean
    onToggle: () => void
    placeholder: string
    autoComplete: string
    disabled: boolean
    id?: string
  }) => (
    <div className="relative">
      <Input
        id={id}
        type={show ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        disabled={disabled}
        className="pe-10"
      />
      <button
        type="button"
        onClick={onToggle}
        className="absolute end-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        tabIndex={-1}
        aria-label={show ? 'Hide password' : 'Show password'}
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  )

  if (compact) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Shield className="h-5 w-5" />
            {l.title}
          </CardTitle>
          <CardDescription>{l.description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Change Email */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              {l.changeEmail}
            </Label>
            <p className="text-xs text-muted-foreground">{l.changeEmailDesc}</p>
            <Input type="email" value={currentAuthEmail} disabled className="bg-muted" />
            <Input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="new@email.com"
              disabled={emailLoading}
            />
            <div className="relative">
              <Input
                type={showEmailPw ? 'text' : 'password'}
                value={emailPassword}
                onChange={(e) => setEmailPassword(e.target.value)}
                placeholder={l.emailPasswordConfirm}
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
            {emailSuccess && (
              <p className="text-sm text-green-600 dark:text-green-400 flex items-center gap-2">
                <Check className="h-4 w-4" />
                {l.emailUpdateSent}
              </p>
            )}
            <Button onClick={handleUpdateEmail} disabled={emailLoading} variant="outline" size="sm">
              {emailLoading ? <LoadingSpinner size="sm" /> : null}
              {l.updateEmail}
            </Button>
          </div>
          <Separator />
          <div className="space-y-2">
            <Label>{l.currentPassword}</Label>
            <PwInput
              value={currentPassword}
              onChange={setCurrentPassword}
              show={showCurrentPw}
              onToggle={() => setShowCurrentPw(!showCurrentPw)}
              placeholder="••••••••"
              autoComplete="current-password"
              disabled={loading}
            />
          </div>
          <div className="space-y-2">
            <Label>{l.newPassword}</Label>
            <PwInput
              value={newPassword}
              onChange={setNewPassword}
              show={showNewPw}
              onToggle={() => setShowNewPw(!showNewPw)}
              placeholder="••••••••"
              autoComplete="new-password"
              disabled={loading}
            />
          </div>
          <div className="space-y-2">
            <Label>{l.confirmPassword}</Label>
            <PwInput
              value={confirmPassword}
              onChange={setConfirmPassword}
              show={showConfirmPw}
              onToggle={() => setShowConfirmPw(!showConfirmPw)}
              placeholder="••••••••"
              autoComplete="new-password"
              disabled={loading}
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          {success && (
            <p className="text-sm text-green-600 dark:text-green-400 flex items-center gap-2">
              <Check className="h-4 w-4" />
              {l.passwordUpdated}
            </p>
          )}
          <Button onClick={handleUpdatePassword} disabled={loading}>
            {loading ? <LoadingSpinner size="sm" /> : null}
            {l.updatePassword}
          </Button>
          <Separator />
          <div className="space-y-2">
            <Label className="text-base font-medium">{l.linkGoogle}</Label>
            <p className="text-sm text-muted-foreground">{l.linkGoogleDesc}</p>
            {identitiesLoading ? (
              <LoadingSpinner size="md" className="text-muted-foreground" />
            ) : googleLinked ? (
              <div className="flex items-center gap-2">
                <Check className="h-5 w-5 text-green-600" />
                <span className="text-sm">{l.googleLinked}</span>
                <Button variant="ghost" size="sm" onClick={handleUnlinkGoogle} disabled={googleLoading}>
                  {googleLoading ? <LoadingSpinner size="sm" /> : <Unlink className="h-4 w-4" />}
                  {l.unlinkGoogle}
                </Button>
              </div>
            ) : (
              <Button variant="outline" onClick={handleLinkGoogle} disabled={googleLoading} className="gap-2">
                {googleLoading ? <LoadingSpinner size="sm" /> : <GoogleIcon />}
                {l.linkGoogleBtn}
              </Button>
            )}
          </div>
          <Separator />
          <Button variant="outline" onClick={handleSignOut} className="w-full sm:w-auto">
            <LogOut className="h-4 w-4 mr-2" />
            {l.signOut}
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Change Email */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            {l.changeEmail}
          </CardTitle>
          <CardDescription>{l.changeEmailDesc}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-1 max-w-md">
            <div className="space-y-2">
              <Label>{l.currentEmail}</Label>
              <Input type="email" value={currentAuthEmail} disabled className="bg-muted" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-email">{l.newEmail}</Label>
              <Input
                id="new-email"
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
          </div>
          {emailSuccess && (
            <p className="text-sm text-green-600 dark:text-green-400 flex items-center gap-2" role="status">
              <Check className="h-4 w-4" />
              {l.emailUpdateSent}
            </p>
          )}
          <Button onClick={handleUpdateEmail} disabled={emailLoading} variant="outline">
            {emailLoading ? <LoadingSpinner size="sm" className="mr-2" /> : null}
            {l.updateEmail}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            {l.changePassword}
          </CardTitle>
          <CardDescription>{l.changePasswordDesc}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-1 max-w-md">
            <div className="space-y-2">
              <Label htmlFor="current-pw">{l.currentPassword}</Label>
              <PwInput
                value={currentPassword}
                onChange={setCurrentPassword}
                show={showCurrentPw}
                onToggle={() => setShowCurrentPw(!showCurrentPw)}
                placeholder="••••••••"
                autoComplete="current-password"
                disabled={loading}
                id="current-pw"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-pw">{l.newPassword}</Label>
              <PwInput
                value={newPassword}
                onChange={setNewPassword}
                show={showNewPw}
                onToggle={() => setShowNewPw(!showNewPw)}
                placeholder="••••••••"
                autoComplete="new-password"
                disabled={loading}
                id="new-pw"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-pw">{l.confirmPassword}</Label>
              <PwInput
                value={confirmPassword}
                onChange={setConfirmPassword}
                show={showConfirmPw}
                onToggle={() => setShowConfirmPw(!showConfirmPw)}
                placeholder="••••••••"
                autoComplete="new-password"
                disabled={loading}
                id="confirm-pw"
              />
            </div>
          </div>
          {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
          {success && (
            <p className="text-sm text-green-600 dark:text-green-400 flex items-center gap-2" role="status">
              <Check className="h-4 w-4" />
              {l.passwordUpdated}
            </p>
          )}
          <Button onClick={handleUpdatePassword} disabled={loading}>
            {loading ? (
              <>
                <LoadingSpinner size="sm" className="mr-2" />
                {language === 'en' ? 'Updating...' : language === 'fr' ? 'Mise à jour...' : 'جاري التحديث...'}
              </>
            ) : (
              l.updatePassword
            )}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            {l.linkGoogle}
          </CardTitle>
          <CardDescription>{l.linkGoogleDesc}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {identitiesLoading ? (
            <LoadingSpinner size="md" className="text-muted-foreground" />
          ) : googleLinked ? (
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 text-sm">
                <GoogleIcon />
                <Check className="h-5 w-5 text-green-600" />
                <span>{l.googleLinked}</span>
              </div>
              <Button variant="outline" size="sm" onClick={handleUnlinkGoogle} disabled={googleLoading}>
                {googleLoading ? <LoadingSpinner size="sm" className="mr-2" /> : <Unlink className="h-4 w-4 mr-2" />}
                {l.unlinkGoogle}
              </Button>
              <p className="text-xs text-muted-foreground w-full">{l.unlinkGoogleConfirm}</p>
            </div>
          ) : (
            <Button variant="outline" onClick={handleLinkGoogle} disabled={googleLoading} className="gap-2">
              {googleLoading ? <LoadingSpinner size="sm" /> : <GoogleIcon />}
              {l.linkGoogleBtn}
            </Button>
          )}
          {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
          {success && (
            <p className="text-sm text-green-600 dark:text-green-400 flex items-center gap-2" role="status">
              <Check className="h-4 w-4" />
              {l.googleUnlinkSuccess}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LogOut className="h-5 w-5" />
            {l.signOut}
          </CardTitle>
          <CardDescription>{l.signOutDesc}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" onClick={handleSignOut}>
            <LogOut className="h-4 w-4 mr-2" />
            {l.signOut}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
