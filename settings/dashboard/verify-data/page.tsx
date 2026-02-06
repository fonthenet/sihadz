'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, XCircle } from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/page-loading'

export default function VerifyDataPage() {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState({
    appointments: 0,
    prescriptions: 0,
    familyMembers: 0,
    doctors: 0,
    profile: null as any
  })

  useEffect(() => {
    loadAllData()
  }, [])

  const loadAllData = async () => {
    const supabase = createBrowserClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      setLoading(false)
      return
    }

    // Get profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    // Count appointments
    const { count: appointmentsCount } = await supabase
      .from('appointments')
      .select('*', { count: 'exact', head: true })
      .eq('patient_id', user.id)

    // Count prescriptions
    const { count: prescriptionsCount } = await supabase
      .from('prescriptions')
      .select('*', { count: 'exact', head: true })
      .eq('patient_id', user.id)

    // Count family members
    const { count: familyCount } = await supabase
      .from('family_members')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)

    // Count doctors (just to verify they exist)
    const { count: doctorsCount } = await supabase
      .from('doctors')
      .select('*', { count: 'exact', head: true })

    setData({
      appointments: appointmentsCount || 0,
      prescriptions: prescriptionsCount || 0,
      familyMembers: familyCount || 0,
      doctors: doctorsCount || 0,
      profile
    })

    setLoading(false)
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Data Verification</h1>
        <p className="text-muted-foreground">Check if your test data is properly loaded</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Profile</CardTitle>
            {data.profile ? <CheckCircle className="h-4 w-4 text-green-500" /> : <XCircle className="h-4 w-4 text-red-500" />}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.profile?.full_name || 'Not Found'}</div>
            <p className="text-xs text-muted-foreground">
              {data.profile?.email}
            </p>
            <Badge variant="secondary" className="mt-2">{data.profile?.user_type}</Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Appointments</CardTitle>
            {data.appointments > 0 ? <CheckCircle className="h-4 w-4 text-green-500" /> : <XCircle className="h-4 w-4 text-red-500" />}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.appointments}</div>
            <p className="text-xs text-muted-foreground">
              {data.appointments > 0 ? 'Appointments found' : 'No appointments'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Prescriptions</CardTitle>
            {data.prescriptions > 0 ? <CheckCircle className="h-4 w-4 text-green-500" /> : <XCircle className="h-4 w-4 text-red-500" />}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.prescriptions}</div>
            <p className="text-xs text-muted-foreground">
              {data.prescriptions > 0 ? 'Prescriptions found' : 'No prescriptions'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Family Members</CardTitle>
            {data.familyMembers > 0 ? <CheckCircle className="h-4 w-4 text-green-500" /> : <XCircle className="h-4 w-4 text-red-500" />}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.familyMembers}</div>
            <p className="text-xs text-muted-foreground">
              {data.familyMembers > 0 ? 'Family members added' : 'No family members'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Doctors in System</CardTitle>
            {data.doctors > 0 ? <CheckCircle className="h-4 w-4 text-green-500" /> : <XCircle className="h-4 w-4 text-red-500" />}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.doctors}</div>
            <p className="text-xs text-muted-foreground">
              {data.doctors > 0 ? 'Doctors available' : 'No doctors'}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Debug Information</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="text-xs bg-muted p-4 rounded overflow-auto">
            {JSON.stringify(data, null, 2)}
          </pre>
        </CardContent>
      </Card>
    </div>
  )
}
