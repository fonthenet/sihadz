'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { SignOutButton } from '@/components/sign-out-button'
import { 
  Building2, Bell, Settings, Calendar, Users, DollarSign, 
  Star, Clock, UserPlus, Stethoscope, BedDouble
} from 'lucide-react'
import { createBrowserClient } from '@/lib/supabase/client'

interface DashboardProps {
  professional: any
  profile: any
  onSignOut: () => void
}

export default function ClinicDashboard({ professional, profile, onSignOut }: DashboardProps) {
  const router = useRouter()
  const [stats, setStats] = useState({
    todayAppointments: 0,
    totalDoctors: 0,
    occupiedBeds: 0,
    monthlyRevenue: 0,
    rating: 0,
    reviewCount: 0,
  })
  const [teamMembers, setTeamMembers] = useState<any[]>([])

  useEffect(() => {
    loadDashboardData()
  }, [professional?.id])

  const loadDashboardData = async () => {
    if (!professional?.id) return
    
    const supabase = createBrowserClient()
    
    // Load team members (doctors associated with this clinic)
    const { data: team } = await supabase
      .from('professional_team')
      .select(`
        *,
        doctor:doctors!doctor_id(
          id,
          clinic_name,
          specialty,
          is_active
        )
      `)
      .eq('clinic_id', professional.id)

    setTeamMembers(team || [])

    setStats({
      todayAppointments: 0,
      totalDoctors: team?.length || 0,
      occupiedBeds: profile?.bed_capacity ? Math.floor(profile.bed_capacity * 0.6) : 0,
      monthlyRevenue: 0,
      rating: profile?.average_rating || 0,
      reviewCount: profile?.total_reviews || 0,
    })
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="w-full px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-cyan-100 p-2 rounded-full">
                <Building2 className="h-6 w-6 text-cyan-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">{professional?.business_name}</h1>
                <p className="text-sm text-muted-foreground">Clinic Dashboard</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant={professional?.status === 'verified' ? 'default' : 'secondary'}>
                {professional?.status}
              </Badge>
              <Button variant="ghost" size="icon">
                <Bell className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => router.push('/professional/dashboard/settings')}>
                <Settings className="h-5 w-5" />
              </Button>
              <SignOutButton variant="icon" onClick={onSignOut} label="Sign Out" />
            </div>
          </div>
        </div>
      </header>

      <div className="w-full py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 px-0">
          <Card className="rounded-none sm:rounded-xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Today's Appointments</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.todayAppointments}</div>
              <p className="text-xs text-muted-foreground">
                Across all doctors
              </p>
            </CardContent>
          </Card>

          <Card className="rounded-none sm:rounded-xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Doctors</CardTitle>
              <Stethoscope className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalDoctors}</div>
              <p className="text-xs text-muted-foreground">
                Team members
              </p>
            </CardContent>
          </Card>

          {profile?.bed_capacity && (
            <Card className="rounded-none sm:rounded-xl">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Bed Occupancy</CardTitle>
                <BedDouble className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stats.occupiedBeds}/{profile.bed_capacity}
                </div>
                <p className="text-xs text-muted-foreground">
                  {Math.round((stats.occupiedBeds / profile.bed_capacity) * 100)}% occupancy
                </p>
              </CardContent>
            </Card>
          )}

          <Card className="rounded-none sm:rounded-xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Rating</CardTitle>
              <Star className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.rating || 'N/A'}</div>
              <p className="text-xs text-muted-foreground">
                {stats.reviewCount} reviews
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="doctors">Doctors</TabsTrigger>
            <TabsTrigger value="appointments">Appointments</TabsTrigger>
            <TabsTrigger value="services">Services</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="rounded-none sm:rounded-xl">
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button className="w-full justify-start">
                    <UserPlus className="mr-2 h-4 w-4" />
                    Add New Doctor
                  </Button>
                  <Button variant="outline" className="w-full justify-start bg-transparent">
                    <Calendar className="mr-2 h-4 w-4" />
                    Manage Schedule
                  </Button>
                  <Button variant="outline" className="w-full justify-start bg-transparent">
                    <Settings className="mr-2 h-4 w-4" />
                    Clinic Settings
                  </Button>
                </CardContent>
              </Card>

              <Card className="rounded-none sm:rounded-xl">
                <CardHeader>
                  <CardTitle>Clinic Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-sm font-medium">Location</p>
                    <p className="text-sm text-muted-foreground">
                      {professional?.commune}, {professional?.wilaya}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Staff Count</p>
                    <p className="text-sm text-muted-foreground">
                      {profile?.staff_count || 0} staff members
                    </p>
                  </div>
                  {profile?.has_pharmacy && (
                    <Badge variant="outline">Has Pharmacy</Badge>
                  )}
                  {profile?.has_laboratory && (
                    <Badge variant="outline">Has Laboratory</Badge>
                  )}
                  {profile?.has_emergency_room && (
                    <Badge variant="outline">Has Emergency Room</Badge>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="doctors" className="space-y-4">
            <Card className="rounded-none sm:rounded-xl">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Clinic Doctors</CardTitle>
                    <CardDescription>Manage your medical team</CardDescription>
                  </div>
                  <Button>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Add Doctor
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {teamMembers.length === 0 ? (
                  <div className="text-center py-8">
                    <Stethoscope className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No doctors added yet</p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Add doctors to your clinic to manage their schedules
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {teamMembers.map((member) => (
                      <div key={member.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center gap-4">
                          <div className="bg-primary/10 p-2 rounded-full">
                            <Stethoscope className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">{member.doctor?.clinic_name}</p>
                            <p className="text-sm text-muted-foreground">{member.doctor?.specialty}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={member.doctor?.is_active ? 'default' : 'secondary'}>
                            {member.doctor?.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                          <Button size="sm" variant="outline">Manage</Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="appointments" className="space-y-4">
            <Card className="rounded-none sm:rounded-xl">
              <CardHeader>
                <CardTitle>Clinic Appointments</CardTitle>
                <CardDescription>All appointments across your clinic</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No appointments today</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Appointments from all doctors will appear here
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="services" className="space-y-4">
            <Card className="rounded-none sm:rounded-xl">
              <CardHeader>
                <CardTitle>Clinic Services</CardTitle>
                <CardDescription>Manage services offered by your clinic</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Services management coming soon</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
