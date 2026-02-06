'use client'

import React from "react"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Lock, AlertCircle, CheckCircle } from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/page-loading'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [validToken, setValidToken] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    const checkSession = async () => {
      // If we have a code in URL (e.g. Supabase redirected here directly), exchange it first
      const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null
      const code = params?.get('code')

      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
        if (!exchangeError) {
          // Remove code from URL to avoid re-processing
          window.history.replaceState({}, '', window.location.pathname)
        }
      }

      const { data: { session } } = await supabase.auth.getSession()

      // If user signed in via OAuth (e.g. Google), redirect - they don't need to reset password
      const isOAuthUser = session?.user?.app_metadata?.provider === 'google' ||
        session?.user?.identities?.some((i: { provider?: string }) => i.provider === 'google')
      if (session?.user && isOAuthUser) {
        const SUPER_ADMIN_EMAILS = ['f.onthenet@gmail.com', 'info@sihadz.com']
        const dest = SUPER_ADMIN_EMAILS.includes(session.user.email || '') ? '/super-admin' : '/dashboard'
        router.replace(dest)
        return
      }

      if (session?.user) {
        setValidToken(true)
      } else {
        setError('Invalid or expired reset link. Please request a new password reset.')
      }
    }

    checkSession()
  }, [supabase.auth, router])

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      if (password.length < 6) {
        throw new Error('Password must be at least 6 characters long')
      }

      if (password !== confirmPassword) {
        throw new Error('Passwords do not match')
      }

      console.log('[v0] Updating password...')

      const { error: updateError } = await supabase.auth.updateUser({
        password: password
      })

      if (updateError) {
        console.error('[v0] Password update error:', updateError)
        throw updateError
      }

      console.log('[v0] Password updated successfully')
      setSuccess(true)

      // Redirect after 2 seconds — super admin → /super-admin, others → /dashboard
      const { data: { session: s } } = await supabase.auth.getSession()
      const SUPER_ADMIN_EMAILS = ['f.onthenet@gmail.com', 'info@sihadz.com']
      const dest = SUPER_ADMIN_EMAILS.includes(s?.user?.email || '') ? '/super-admin' : '/dashboard'
      setTimeout(() => {
        router.push(dest)
      }, 2000)

    } catch (err: any) {
      console.error('[v0] Reset password error:', err)
      setError(err.message || 'Failed to reset password')
    } finally {
      setIsLoading(false)
    }
  }

  if (!validToken && !error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 px-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex justify-center">
              <LoadingSpinner size="lg" className="text-primary" />
            </div>
            <p className="text-center mt-4 text-muted-foreground">Verifying reset link...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex justify-center mb-4">
            <div className="bg-primary/10 p-3 rounded-full">
              <Lock className="h-6 w-6 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl text-center">Reset Password</CardTitle>
          <CardDescription className="text-center">
            Enter your new password below
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && !validToken && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success ? (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                Password updated successfully! Redirecting to dashboard...
              </AlertDescription>
            </Alert>
          ) : validToken ? (
            <form onSubmit={handleResetPassword} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium">New Password</label>
                <Input
                  type="password"
                  placeholder="Enter new password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
                  minLength={6}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Confirm Password</label>
                <Input
                  type="password"
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={isLoading}
                  minLength={6}
                />
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <LoadingSpinner size="sm" className="me-2" />
                    Updating Password...
                  </>
                ) : (
                  'Update Password'
                )}
              </Button>
            </form>
          ) : (
            <div className="text-center">
              <Button
                onClick={() => router.push('/login')}
                variant="outline"
                className="w-full bg-transparent"
              >
                Back to Login
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
