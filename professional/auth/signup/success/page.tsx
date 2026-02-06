'use client'

import { useRouter } from "next/navigation"

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CheckCircle, Mail, AlertCircle } from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/page-loading'
import { createBrowserClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { Suspense } from 'react'
import Loading from '@/components/ui/loading'

function SuccessContent() {
  const searchParams = useSearchParams()
  const email = searchParams.get('email') || ''
  const [isResending, setIsResending] = useState(false)
  const [resendSuccess, setResendSuccess] = useState(false)
  const [resendError, setResendError] = useState('')
  const router = useRouter()

  const handleResendConfirmation = async () => {
    if (!email) {
      setResendError('Email address not found. Please sign up again.')
      return
    }

    setIsResending(true)
    setResendSuccess(false)
    setResendError('')
    
    try {
      const supabase = createBrowserClient()
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
      })
      
      if (error) throw error
      
      setResendSuccess(true)
    } catch (err) {
      console.error('[v0] Resend confirmation error:', err)
      setResendError('Failed to resend confirmation email. Please try again or contact support.')
    } finally {
      setIsResending(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-cyan-50 p-4">
      <Suspense fallback={<Loading />}>
        {email ? (
          <Card className="w-full max-w-2xl">
            <CardHeader className="text-center space-y-4">
              <div className="flex justify-center">
                <div className="bg-green-100 p-4 rounded-full">
                  <CheckCircle className="h-12 w-12 text-green-600" />
                </div>
              </div>
              <CardTitle className="text-2xl font-bold">Account Created Successfully!</CardTitle>
              <CardDescription className="text-base">
                Welcome to Siha DZ Professional Network
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Alert className="border-blue-200 bg-blue-50">
                <Mail className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-900">
                  <p className="font-semibold mb-2">Important: Please confirm your email address</p>
                  <p className="text-sm">
                    We've sent a confirmation email to <span className="font-medium">{email}</span>. 
                    Please check your inbox and click the confirmation link to activate your account.
                  </p>
                </AlertDescription>
              </Alert>

              {resendSuccess && (
                <Alert className="border-green-200 bg-green-50">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-900">
                    Confirmation email sent successfully! Please check your inbox and spam folder.
                  </AlertDescription>
                </Alert>
              )}

              {resendError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{resendError}</AlertDescription>
                </Alert>
              )}

              <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                <h3 className="font-semibold text-sm">Next Steps:</h3>
                <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                  <li>Check your email inbox for the confirmation link</li>
                  <li>Don't forget to check your spam or junk folder</li>
                  <li>Click the confirmation link in the email</li>
                  <li>Once confirmed, you can log in to your account</li>
                </ol>
              </div>

              <div className="space-y-3">
                <Button 
                  variant="outline" 
                  className="w-full bg-transparent" 
                  onClick={handleResendConfirmation}
                  disabled={isResending}
                >
                  {isResending ? (
                    <>
                      <LoadingSpinner size="sm" className="me-2" />
                      Resending...
                    </>
                  ) : (
                    <>
                      <Mail className="mr-2 h-4 w-4" />
                      Resend Confirmation Email
                    </>
                  )}
                </Button>

                <Link href="/professional/auth/login" className="block">
                  <Button className="w-full">
                    Go to Login Page
                  </Button>
                </Link>
              </div>

              <p className="text-center text-sm text-muted-foreground">
                Need help? <Link href="/support" className="text-primary hover:underline">Contact Support</Link>
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="text-center">Invalid Access</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-muted-foreground mb-4">This page requires valid signup information.</p>
              <Button onClick={() => router.push('/professional/auth/signup')}>
                Go to Signup
              </Button>
            </CardContent>
          </Card>
        )}
      </Suspense>
    </div>
  )
}

export default function SignupSuccessPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><LoadingSpinner size="lg" className="text-primary" /></div>}>
      <SuccessContent />
    </Suspense>
  )
}
