'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { SignOutButton } from '@/components/sign-out-button'
import { 
  Ambulance, Settings, Home, MapPin, Clock, Phone, ChevronLeft,
  Star, AlertTriangle, CheckCircle, Navigation, Truck, Calendar, Receipt, RefreshCw
} from 'lucide-react'
import { createBrowserClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { useAutoRefresh } from '@/hooks/use-auto-refresh'
import { AvailabilityCalendar } from './availability-calendar'
import { EmbeddedChat } from '@/components/chat-widget/embedded-chat'
import { ProDocumentsSection } from './pro-documents-section'
import ProfessionalPOSUnified from './pos/professional-pos-unified'

interface DashboardProps {
  professional: any
  profile: any
  authUserId?: string | null
  avatarUrl?: string | null
  onSignOut: () => void
  onProfessionalUpdate?: () => void
  initialSection?: string
}

export default function AmbulanceDashboard({ professional, profile, authUserId, avatarUrl, onSignOut, initialSection = 'overview' }: DashboardProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [activeSection, setActiveSection] = useState(initialSection)
  const [isAvailable, setIsAvailable] = useState(profile?.accepts_emergency || false)
  const [activeTab, setActiveTab] = useState('calls')
  const [isRefreshing, setIsRefreshing] = useState(false)

  useEffect(() => {
    if (initialSection) setActiveSection(initialSection)
  }, [initialSection])
  const [stats, setStats] = useState({
    completedToday: 0,
    activeVehicles: 0,
    averageResponseTime: '8 min',
    rating: 0,
    reviewCount: 0,
  })

  useEffect(() => {
    loadDashboardData()
  }, [professional?.id])

  const loadDashboardData = async () => {
    if (!professional?.id) return
    
    setStats({
      completedToday: 0,
      activeVehicles: profile?.vehicle_count || 0,
      averageResponseTime: '8 min',
      rating: profile?.average_rating || 0,
      reviewCount: profile?.total_reviews || 0,
    })
  }

  useAutoRefresh(loadDashboardData, 60_000, { enabled: !!professional })

  const toggleAvailability = async () => {
    const supabase = createBrowserClient()
    
    await supabase
      .from('professional_profiles')
      .update({ accepts_emergency: !isAvailable })
      .eq('professional_id', professional.id)

    setIsAvailable(!isAvailable)
  }

  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      await loadDashboardData()
    } finally {
      setIsRefreshing(false)
    }
  }

  // Point of Sale - cash-focused POS for all professionals
  if (activeSection === 'pos') {
    const appointmentIdFromUrl = searchParams.get('appointment')
    return (
      <div className="w-full min-w-0 py-4 sm:py-6 px-0">
        <ProfessionalPOSUnified
          professionalName={professional?.business_name}
          appointmentId={appointmentIdFromUrl}
        />
      </div>
    )
  }

  // Messages section - render directly like patient page (no extra wrappers)
  if (activeSection === 'messages' && authUserId) {
    return (
      <div className="w-full min-w-0 h-[calc(100vh-5rem)] min-h-[400px] flex flex-col">
        <EmbeddedChat
          userId={authUserId}
          userName={professional?.business_name || 'User'}
          userAvatar={avatarUrl || undefined}
          userType={professional?.type || 'ambulance'}
        />
      </div>
    )
  }

  // Documents section
  if (activeSection === 'documents') {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
        <header className="border-b bg-card">
          <div className="w-full px-4 sm:px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-red-100 dark:bg-red-900/30 p-2 rounded-full">
                  <Ambulance className="h-6 w-6 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold">{professional?.business_name}</h1>
                  <p className="text-sm text-muted-foreground">Documents</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="icon" asChild>
                  <Link href="/professional/dashboard" title="Back to Dashboard">
                    <ChevronLeft className="h-5 w-5" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </header>
        <div className="w-full py-8">
          <ProDocumentsSection professionalId={professional?.id} />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="w-full px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-red-100 p-2 rounded-full">
                <Ambulance className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">{professional?.business_name}</h1>
                <p className="text-sm text-muted-foreground">Ambulance Service Dashboard</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Switch 
                  checked={isAvailable} 
                  onCheckedChange={toggleAvailability}
                  className="data-[state=checked]:bg-green-500"
                />
                <Label className={isAvailable ? 'text-green-600 font-medium' : 'text-muted-foreground'}>
                  {isAvailable ? 'Available' : 'Offline'}
                </Label>
              </div>
              <Button variant="outline" size="icon" onClick={handleRefresh} className="bg-transparent" disabled={isRefreshing} aria-label="Refresh">
                <RefreshCw className={cn('h-4 w-4', isRefreshing && 'animate-spin')} />
              </Button>
              <Button variant="ghost" size="icon" asChild>
                <Link href="/" title="Home">
                  <Home className="h-5 w-5" />
                </Link>
              </Button>
              <Button variant="ghost" size="icon" onClick={() => router.push('/professional/dashboard/settings')}>
                <Settings className="h-5 w-5" />
              </Button>
              <SignOutButton variant="icon" onClick={onSignOut} label="Sign Out" />
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="w-full py-8">
        {/* Availability Alert */}
        {!isAvailable && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6 mx-4 sm:mx-6 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
            <div>
              <p className="font-medium text-yellow-800">You are currently offline</p>
              <p className="text-sm text-yellow-700">Toggle availability to receive emergency calls</p>
            </div>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 px-0">
          <Card 
            className={`rounded-none sm:rounded-xl cursor-pointer hover:scale-[1.02] transition-transform ${isAvailable ? 'border-green-200 bg-green-50' : ''}`}
            onClick={() => setActiveTab('calls')}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Status</CardTitle>
              <Ambulance className={`h-4 w-4 ${isAvailable ? 'text-green-600' : 'text-muted-foreground'}`} />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${isAvailable ? 'text-green-700' : 'text-muted-foreground'}`}>
                {isAvailable ? 'Available' : 'Offline'}
              </div>
              <p className="text-xs text-muted-foreground">
                Ready for emergency calls
              </p>
            </CardContent>
          </Card>

          <Card 
            className="rounded-none sm:rounded-xl cursor-pointer hover:scale-[1.02] transition-transform"
            onClick={() => setActiveTab('history')}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Trips Today</CardTitle>
              <Navigation className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.completedToday}</div>
              <p className="text-xs text-muted-foreground">
                Completed transports
              </p>
            </CardContent>
          </Card>

          <Card 
            className="rounded-none sm:rounded-xl cursor-pointer hover:scale-[1.02] transition-transform"
            onClick={() => setActiveTab('fleet')}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Vehicles</CardTitle>
              <Truck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activeVehicles}</div>
              <p className="text-xs text-muted-foreground">
                Available ambulances
              </p>
            </CardContent>
          </Card>

          <Card 
            className="rounded-none sm:rounded-xl cursor-pointer hover:scale-[1.02] transition-transform"
            onClick={() => setActiveTab('coverage')}
          >
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
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList>
            <TabsTrigger value="calls">Emergency Calls</TabsTrigger>
            <TabsTrigger value="schedule">Schedule</TabsTrigger>
            <TabsTrigger value="history">Trip History</TabsTrigger>
            <TabsTrigger value="fleet">Fleet Management</TabsTrigger>
            <TabsTrigger value="coverage">Coverage Area</TabsTrigger>
          </TabsList>

          <TabsContent value="calls" className="space-y-4">
            <Card className="rounded-none sm:rounded-xl">
              <CardHeader>
                <CardTitle>Incoming Calls</CardTitle>
                <CardDescription>Emergency requests in your area</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <Phone className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No active emergency calls</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    {isAvailable 
                      ? 'Waiting for emergency requests...' 
                      : 'Go online to receive emergency calls'}
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="schedule" className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold">Schedule & Availability</h2>
                <p className="text-muted-foreground text-sm">Manage operating hours and holidays</p>
              </div>
              <Button variant="outline" onClick={() => router.push('/professional/dashboard/settings?tab=practice')}>
                <Settings className="h-4 w-4 mr-2" />
                Manage Schedule
              </Button>
            </div>
            <AvailabilityCalendar professional={professional} />
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            <Card className="rounded-none sm:rounded-xl">
              <CardHeader>
                <CardTitle>Trip History</CardTitle>
                <CardDescription>Recent emergency transports</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No trips recorded yet</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="fleet" className="space-y-4">
            <Card className="rounded-none sm:rounded-xl">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Fleet Management</CardTitle>
                    <CardDescription>Manage your ambulance fleet</CardDescription>
                  </div>
                  <Button>
                    <Truck className="mr-2 h-4 w-4" />
                    Add Vehicle
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {profile?.ambulance_types?.map((type: string, i: number) => (
                    <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className="bg-red-100 p-2 rounded-full">
                          <Ambulance className="h-5 w-5 text-red-600" />
                        </div>
                        <div>
                          <p className="font-medium">{type}</p>
                          <p className="text-sm text-muted-foreground">Available</p>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-green-600 border-green-600">
                        Active
                      </Badge>
                    </div>
                  )) || (
                    <div className="text-center py-8">
                      <Truck className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">No vehicles registered</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="coverage" className="space-y-4">
            <Card className="rounded-none sm:rounded-xl">
              <CardHeader>
                <CardTitle>Coverage Area</CardTitle>
                <CardDescription>Areas you service</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <MapPin className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Primary Location</p>
                      <p className="text-sm text-muted-foreground">
                        {professional?.commune}, {professional?.wilaya}
                      </p>
                    </div>
                  </div>
                  
                  {profile?.coverage_area?.length > 0 && (
                    <div>
                      <p className="font-medium mb-2">Coverage Areas:</p>
                      <div className="flex flex-wrap gap-2">
                        {profile.coverage_area.map((area: string, i: number) => (
                          <Badge key={i} variant="outline">{area}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
