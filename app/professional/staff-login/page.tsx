'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Building2, User, KeyRound, ArrowRight, ArrowLeft, CheckCircle } from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/page-loading'

interface PracticeInfo {
  id: string
  businessName: string
  type: string
  practiceCode: string
}

type Step = 'practice' | 'credentials'

export default function StaffLoginPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('practice')
  const [practiceCode, setPracticeCode] = useState('')
  const [practiceInfo, setPracticeInfo] = useState<PracticeInfo | null>(null)
  const [username, setUsername] = useState('')
  const [pin, setPin] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Focus first input on mount and step change
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (step === 'practice') {
        document.getElementById('practice-code')?.focus()
      } else {
        document.getElementById('username')?.focus()
      }
    }, 100)
    return () => clearTimeout(timeout)
  }, [step])

  const handlePracticeLookup = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!practiceCode.trim()) {
      setError('Please enter a practice code')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/employee-auth/practice?code=${encodeURIComponent(practiceCode.trim())}`)
      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Practice not found')
        return
      }

      setPracticeInfo(data)
      setStep('credentials')
    } catch (err) {
      setError('Failed to look up practice. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username.trim() || !pin.trim()) {
      setError('Please enter your username and PIN')
      return
    }

    if (!/^\d{4,6}$/.test(pin)) {
      setError('PIN must be 4-6 digits')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/employee-auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          practiceCode: practiceInfo?.practiceCode,
          username: username.trim().toLowerCase(),
          pin,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Login failed')
        return
      }

      // Redirect to dashboard
      router.push('/professional/dashboard')
    } catch (err) {
      setError('An error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleBack = () => {
    setStep('practice')
    setPracticeInfo(null)
    setUsername('')
    setPin('')
    setError(null)
  }

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      doctor: 'Medical Practice',
      clinic: 'Clinic',
      pharmacy: 'Pharmacy',
      laboratory: 'Laboratory',
      radiology: 'Radiology Center',
      ambulance: 'Ambulance Service',
      dental_clinic: 'Dental Clinic',
      physiotherapy: 'Physiotherapy Center',
      nutrition: 'Nutrition Center',
      psychology: 'Psychology Practice',
    }
    return labels[type] || type
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-900 dark:to-slate-800 p-4">
      <div className="w-full max-w-md">
        {/* Logo/Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary rounded-2xl mb-4">
            <Building2 className="h-8 w-8 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Staff Login</h1>
          <p className="text-muted-foreground mt-1">Access your practice dashboard</p>
        </div>

        <Card className="shadow-xl">
          <CardHeader className="space-y-1">
            <CardTitle className="text-xl">
              {step === 'practice' ? 'Find Your Practice' : 'Enter Credentials'}
            </CardTitle>
            <CardDescription>
              {step === 'practice'
                ? 'Enter the practice code provided by your employer'
                : `Signing in to ${practiceInfo?.businessName}`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Practice Found Indicator */}
            {step === 'credentials' && practiceInfo && (
              <div className="mb-6 p-3 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-green-800 dark:text-green-200 truncate">
                    {practiceInfo.businessName}
                  </p>
                  <p className="text-sm text-green-600 dark:text-green-400">
                    {getTypeLabel(practiceInfo.type)}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleBack}
                  className="text-green-700 hover:text-green-800 hover:bg-green-100"
                >
                  Change
                </Button>
              </div>
            )}

            {/* Error Alert */}
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Step 1: Practice Code */}
            {step === 'practice' && (
              <form onSubmit={handlePracticeLookup} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="practice-code">Practice Code</Label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="practice-code"
                      placeholder="e.g. ABC123"
                      value={practiceCode}
                      onChange={(e) => setPracticeCode(e.target.value.toUpperCase())}
                      className="pl-10 text-lg tracking-wider uppercase"
                      maxLength={10}
                      autoComplete="off"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Ask your employer for the practice code
                  </p>
                </div>

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? (
                    <>
                      <LoadingSpinner size="sm" className="me-2" />
                      Looking up...
                    </>
                  ) : (
                    <>
                      Continue
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </>
                  )}
                </Button>
              </form>
            )}

            {/* Step 2: Username & PIN */}
            {step === 'credentials' && (
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="username"
                      placeholder="Your username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="pl-10"
                      autoComplete="username"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pin">PIN</Label>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="pin"
                      type="password"
                      placeholder="4-6 digit PIN"
                      value={pin}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '').slice(0, 6)
                        setPin(value)
                      }}
                      className="pl-10 text-lg tracking-[0.5em] font-mono"
                      maxLength={6}
                      inputMode="numeric"
                      autoComplete="current-password"
                    />
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleBack}
                    disabled={loading}
                    className="flex-1"
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back
                  </Button>
                  <Button type="submit" className="flex-1" disabled={loading}>
                    {loading ? (
                      <>
                        <LoadingSpinner size="sm" className="me-2" />
                        Signing in...
                      </>
                    ) : (
                      'Sign In'
                    )}
                  </Button>
                </div>
              </form>
            )}

            {/* Help Links */}
            <div className="mt-6 pt-6 border-t text-center text-sm text-muted-foreground">
              <p>
                Are you the practice owner?{' '}
                <Link href="/professional/auth/login" className="text-primary hover:underline">
                  Owner Login
                </Link>
              </p>
              <p className="mt-2">
                Forgot your PIN?{' '}
                <span className="text-primary">Contact your administrator</span>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground mt-6">
          Protected by secure PIN authentication
        </p>
      </div>
    </div>
  )
}
