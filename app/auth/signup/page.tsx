'use client'

import React from "react"

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createBrowserClient } from '@/lib/supabase/client'
import { checkEmailRegistered } from '@/app/professional/auth/signup/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Header } from '@/components/header'
import { Mail, Lock, User, Phone, CheckCircle } from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/page-loading'
import { PhoneInput } from '@/components/ui/phone-input'

export default function PatientSignupPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirect')
  const supabase = createBrowserClient()
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    const isValidAlgerianPhone = (p: string) => /^0[5-7]\d{8}$/.test(p) || /^0[2-4]\d{7}$/.test(p)
    if (!formData.phone || !isValidAlgerianPhone(formData.phone)) {
      setError('Invalid phone. Use Algerian format: 05X XX XX XX XX (mobile) or 0XX XX XX XX (landline)')
      return
    }

    setIsSubmitting(true)

    try {
      // Pre-check: block from the beginning if email is already registered (patient or professional)
      const alreadyRegistered = await checkEmailRegistered(formData.email)
      if (alreadyRegistered) {
        setError('This email is already registered (as patient or professional). You cannot create a new account. Please log in instead or use a different email.')
        setIsSubmitting(false)
        return
      }

      // Create auth account
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            user_type: 'patient',
            full_name: `${formData.firstName} ${formData.lastName}`,
            phone: formData.phone
          }
        }
      })

      if (authError) throw authError

      // Backup: Supabase does not return error for existing email. Check identities.
      if (authData?.user && (!authData.user.identities || authData.user.identities.length === 0)) {
        setError('This email is already registered (as patient or professional). You cannot create a new account. Please log in instead or use a different email.')
        setIsSubmitting(false)
        return
      }

      if (authData.user) {
        // Update profile (trigger creates base profile; we enrich it)
        try {
          const fullName = `${formData.firstName} ${formData.lastName}`.trim()
          const { error: profileError } = await supabase
            .from('profiles')
            .update({
              full_name: fullName,
              email: formData.email,
              phone: formData.phone,
              user_type: 'patient',
            })
            .eq('id', authData.user.id)

          if (profileError) {
            console.error('[auth/signup] Profile update error (non-fatal):', profileError)
          }
        } catch (profileErr) {
          console.error('[auth/signup] Profile update failed (non-fatal):', profileErr)
        }

        // Always redirect or show success on auth success
        if (authData.session) {
          // Keep loading visible until redirect completes
          const path = redirectTo && typeof redirectTo === 'string' && redirectTo.startsWith('/') && !redirectTo.startsWith('//') ? redirectTo : '/dashboard'
          router.push(path)
        } else {
          setSuccess(true)
          setIsSubmitting(false)
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create account')
      setIsSubmitting(false)
    }
  }

  if (success) {
    return (
      <>
        <Header />
        <div className="min-h-screen flex items-center justify-center bg-muted/30 py-12 px-4">
          <Card className="w-full max-w-md text-center">
            <CardHeader>
              <div className="flex justify-center mb-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
              </div>
              <CardTitle className="text-2xl">Account Created!</CardTitle>
              <CardDescription className="text-base">
                A confirmation link has been sent to your email. Please check your inbox.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full">
                <Link href="/login">Go to Login</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </>
    )
  }

  return (
    <>
      <Header />
      <div className="min-h-screen flex items-center justify-center bg-muted/30 py-12 px-4">
        <Card className="w-full max-w-md relative">
          {/* Loading overlay - visible while processing/redirecting */}
          {isSubmitting && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 rounded-lg bg-background/80 backdrop-blur-sm">
              <LoadingSpinner size="lg" />
              <p className="text-sm font-medium text-muted-foreground">Creating account...</p>
            </div>
          )}
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Create Patient Account</CardTitle>
            <CardDescription>Sign up to book appointments and manage your health</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="firstName"
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      className="pl-9"
                      required
                      disabled={isSubmitting}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="lastName"
                      value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                      className="pl-9"
                      required
                      disabled={isSubmitting}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="pl-9"
                    required
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
                  <PhoneInput
                    id="phone"
                    className="pl-9"
                    value={formData.phone}
                    onChange={(v) => setFormData({ ...formData, phone: v })}
                    required
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="pl-9"
                    required
                    disabled={isSubmitting}
                    minLength={6}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    className="pl-9"
                    required
                    disabled={isSubmitting}
                    minLength={6}
                  />
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? 'Creating Account...' : 'Create Account'}
              </Button>

              <div className="text-center text-sm text-muted-foreground">
                Already have an account?{' '}
                <Link href="/login" className="text-primary hover:underline">
                  Sign in
                </Link>
              </div>

              <div className="text-center text-sm text-muted-foreground">
                Are you a healthcare professional?{' '}
                <Link href="/professional/auth/signup" className="text-primary hover:underline">
                  Sign up here
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
