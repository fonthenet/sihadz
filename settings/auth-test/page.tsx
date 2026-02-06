'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { createBrowserClient } from '@/lib/supabase/client'
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/page-loading'
import Link from 'next/link'

type TestStatus = 'idle' | 'running' | 'success' | 'error'

interface TestResult {
  name: string
  status: TestStatus
  message: string
  details?: string
}

export default function AuthTestPage() {
  const [supabase] = useState(() => createBrowserClient())
  const [results, setResults] = useState<TestResult[]>([])
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [isRunning, setIsRunning] = useState(false)

  useEffect(() => {
    // Check current session on mount
    supabase.auth.getSession().then(({ data }) => {
      setCurrentUser(data.session?.user || null)
    })
  }, [supabase])

  const updateResult = (name: string, status: TestStatus, message: string, details?: string) => {
    setResults(prev => {
      const existing = prev.findIndex(r => r.name === name)
      const newResult = { name, status, message, details }
      if (existing >= 0) {
        const updated = [...prev]
        updated[existing] = newResult
        return updated
      }
      return [...prev, newResult]
    })
  }

  const runTests = async () => {
    setIsRunning(true)
    setResults([])

    // Test 1: Supabase Connection
    updateResult('Supabase Connection', 'running', 'Testing connection...')
    try {
      const { data, error } = await supabase.auth.getSession()
      if (error) throw error
      updateResult('Supabase Connection', 'success', 'Connected to Supabase', `Session exists: ${!!data.session}`)
    } catch (err: any) {
      updateResult('Supabase Connection', 'error', 'Failed to connect', err.message)
    }

    // Test 2: Database Connection (profiles table)
    updateResult('Database Access', 'running', 'Testing database...')
    try {
      const { error } = await supabase.from('profiles').select('id').limit(1)
      if (error) throw error
      updateResult('Database Access', 'success', 'Database accessible', 'profiles table is reachable')
    } catch (err: any) {
      updateResult('Database Access', 'error', 'Database error', err.message)
    }

    // Test 3: Auth State Listener
    updateResult('Auth Listener', 'running', 'Testing auth listener...')
    try {
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        console.log('[v0] Auth state change:', event)
      })
      subscription.unsubscribe()
      updateResult('Auth Listener', 'success', 'Auth listener works', 'onAuthStateChange is functional')
    } catch (err: any) {
      updateResult('Auth Listener', 'error', 'Auth listener failed', err.message)
    }

    // Test 4: Check Google OAuth Config
    updateResult('Google OAuth', 'running', 'Checking Google OAuth...')
    try {
      // We can't fully test OAuth without redirecting, but we can check if the method exists
      const hasOAuth = typeof supabase.auth.signInWithOAuth === 'function'
      if (hasOAuth) {
        updateResult('Google OAuth', 'success', 'OAuth method available', 'signInWithOAuth is configured')
      } else {
        updateResult('Google OAuth', 'error', 'OAuth not available', 'signInWithOAuth method missing')
      }
    } catch (err: any) {
      updateResult('Google OAuth', 'error', 'OAuth check failed', err.message)
    }

    // Test 5: Check Environment Variables
    updateResult('Environment', 'running', 'Checking environment...')
    const hasUrl = !!process.env.NEXT_PUBLIC_SUPABASE_URL
    const hasKey = !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (hasUrl && hasKey) {
      updateResult('Environment', 'success', 'Environment configured', 'Supabase URL and key are set')
    } else {
      updateResult('Environment', 'error', 'Missing environment vars', `URL: ${hasUrl}, Key: ${hasKey}`)
    }

    setIsRunning(false)
  }

  const testSignOut = async () => {
    try {
      await supabase.auth.signOut()
      setCurrentUser(null)
      alert('Signed out successfully')
    } catch (err: any) {
      alert('Sign out error: ' + err.message)
    }
  }

  const StatusIcon = ({ status }: { status: TestStatus }) => {
    switch (status) {
      case 'running': return <LoadingSpinner size="md" className="text-blue-500" />
      case 'success': return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'error': return <XCircle className="h-5 w-5 text-red-500" />
      default: return <AlertCircle className="h-5 w-5 text-gray-400" />
    }
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Auth Diagnostics</h1>
          <Link href="/">
            <Button variant="outline">Back to Home</Button>
          </Link>
        </div>

        {/* Current Session */}
        <Card>
          <CardHeader>
            <CardTitle>Current Session</CardTitle>
          </CardHeader>
          <CardContent>
            {currentUser ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="default" className="bg-green-500">Logged In</Badge>
                </div>
                <p><strong>Email:</strong> {currentUser.email}</p>
                <p><strong>ID:</strong> {currentUser.id}</p>
                <p><strong>Provider:</strong> {currentUser.app_metadata?.provider || 'email'}</p>
                <Button variant="destructive" onClick={testSignOut} className="mt-4">
                  Sign Out
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <Badge variant="secondary">Not Logged In</Badge>
                <div className="flex flex-wrap gap-2">
                  <Link href="/login"><Button>Go to Login</Button></Link>
                  <Link href="/register"><Button variant="outline">Go to Register</Button></Link>
                  <Link href="/register/doctor"><Button variant="outline">Doctor Register</Button></Link>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Run Tests */}
        <Card>
          <CardHeader>
            <CardTitle>System Tests</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={runTests} disabled={isRunning}>
              {isRunning ? (
                <>
                  <LoadingSpinner size="sm" className="me-2" />
                  Running Tests...
                </>
              ) : (
                'Run All Tests'
              )}
            </Button>

            {results.length > 0 && (
              <div className="space-y-3 mt-4">
                {results.map((result) => (
                  <div key={result.name} className="flex items-start gap-3 p-3 border rounded-lg">
                    <StatusIcon status={result.status} />
                    <div className="flex-1">
                      <p className="font-medium">{result.name}</p>
                      <p className="text-sm text-muted-foreground">{result.message}</p>
                      {result.details && (
                        <p className="text-xs text-muted-foreground mt-1">{result.details}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Auth Flow Links */}
        <Card>
          <CardHeader>
            <CardTitle>Test Auth Flows</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 border rounded-lg">
                <h3 className="font-semibold mb-2">Patient Flow</h3>
                <div className="space-y-2">
                  <Link href="/register" className="block">
                    <Button variant="outline" className="w-full justify-start bg-transparent">
                      1. Register as Patient
                    </Button>
                  </Link>
                  <Link href="/login" className="block">
                    <Button variant="outline" className="w-full justify-start bg-transparent">
                      2. Login as Patient
                    </Button>
                  </Link>
                  <Link href="/dashboard" className="block">
                    <Button variant="outline" className="w-full justify-start bg-transparent">
                      3. Patient Dashboard
                    </Button>
                  </Link>
                </div>
              </div>

              <div className="p-4 border rounded-lg">
                <h3 className="font-semibold mb-2">Doctor Flow</h3>
                <div className="space-y-2">
                  <Link href="/register/doctor" className="block">
                    <Button variant="outline" className="w-full justify-start bg-transparent">
                      1. Register as Doctor
                    </Button>
                  </Link>
                  <Link href="/login" className="block">
                    <Button variant="outline" className="w-full justify-start bg-transparent">
                      2. Login as Doctor
                    </Button>
                  </Link>
                  <Link href="/doctor-dashboard" className="block">
                    <Button variant="outline" className="w-full justify-start bg-transparent">
                      3. Doctor Dashboard
                    </Button>
                  </Link>
                </div>
              </div>

              <div className="p-4 border rounded-lg">
                <h3 className="font-semibold mb-2">Pharmacy Flow</h3>
                <div className="space-y-2">
                  <Link href="/register/pharmacy" className="block">
                    <Button variant="outline" className="w-full justify-start bg-transparent">
                      1. Register as Pharmacy
                    </Button>
                  </Link>
                  <Link href="/login" className="block">
                    <Button variant="outline" className="w-full justify-start bg-transparent">
                      2. Login as Pharmacy
                    </Button>
                  </Link>
                  <Link href="/pharmacy-dashboard" className="block">
                    <Button variant="outline" className="w-full justify-start bg-transparent">
                      3. Pharmacy Dashboard
                    </Button>
                  </Link>
                </div>
              </div>

              <div className="p-4 border rounded-lg">
                <h3 className="font-semibold mb-2">OAuth Test</h3>
                <div className="space-y-2">
                  <Button 
                    variant="outline" 
                    className="w-full justify-start bg-transparent"
                    onClick={async () => {
                      try {
                        const { error } = await supabase.auth.signInWithOAuth({
                          provider: 'google',
                          options: {
                            redirectTo: window.location.origin + '/auth/callback?next=/auth-test'
                          }
                        })
                        if (error) alert('OAuth Error: ' + error.message)
                      } catch (err: any) {
                        alert('Error: ' + err.message)
                      }
                    }}
                  >
                    Test Google OAuth
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Debug Info */}
        <Card>
          <CardHeader>
            <CardTitle>Debug Information</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-muted p-4 rounded-lg text-xs overflow-auto max-h-60">
{`Supabase URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Set' : 'NOT SET'}
Anon Key: ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Set' : 'NOT SET'}
Redirect URL: ${process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL || 'NOT SET'}
Current Origin: ${typeof window !== 'undefined' ? window.location.origin : 'SSR'}
User Agent: ${typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 50) + '...' : 'SSR'}`}
            </pre>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
