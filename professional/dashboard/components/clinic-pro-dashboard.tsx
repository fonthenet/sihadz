'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Progress } from '@/components/ui/progress'
import { Switch } from '@/components/ui/switch'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { 
  Building2, Users, Calendar, DollarSign, TrendingUp, TrendingDown,
  Clock, CheckCircle, XCircle, AlertTriangle, Search, Filter, Plus,
  Settings, Bell, BarChart3, Activity, Stethoscope, UserPlus,
  FileText, CreditCard, PieChart, ArrowUpRight, ArrowDownRight,
  MessageSquare, Star, MapPin, Phone, Mail, Globe, Shield,
  Briefcase, HeartPulse, Bed, Ambulance, RefreshCw
} from 'lucide-react'
import { createBrowserClient } from '@/lib/supabase/client'
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart as RechartsPieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'

interface ClinicProDashboardProps {
  professional: any
}

const visitData = [
  { month: 'Jan', patients: 420, revenue: 840000 },
  { month: 'Feb', patients: 480, revenue: 960000 },
  { month: 'Mar', patients: 520, revenue: 1040000 },
  { month: 'Apr', patients: 590, revenue: 1180000 },
  { month: 'May', patients: 640, revenue: 1280000 },
  { month: 'Jun', patients: 710, revenue: 1420000 },
]

const departmentData = [
  { name: 'General Medicine', value: 35, color: '#0ea5e9' },
  { name: 'Pediatrics', value: 25, color: '#22c55e' },
  { name: 'Cardiology', value: 20, color: '#f59e0b' },
  { name: 'Orthopedics', value: 12, color: '#8b5cf6' },
  { name: 'Dermatology', value: 8, color: '#ec4899' },
]

const recentAppointments = [
  { id: 1, patient: 'Ahmed Benali', department: 'Cardiology', doctor: 'Dr. Karim', time: '09:00', status: 'completed' },
  { id: 2, patient: 'Fatima Hadj', department: 'Pediatrics', doctor: 'Dr. Amina', time: '09:30', status: 'in-progress' },
  { id: 3, patient: 'Omar Saidi', department: 'General', doctor: 'Dr. Hassan', time: '10:00', status: 'waiting' },
  { id: 4, patient: 'Leila Mansour', department: 'Dermatology', doctor: 'Dr. Sara', time: '10:30', status: 'scheduled' },
  { id: 5, patient: 'Youssef Khelifi', department: 'Orthopedics', doctor: 'Dr. Ali', time: '11:00', status: 'scheduled' },
]

const doctors = [
  { id: 1, name: 'Dr. Karim Belkacem', specialty: 'Cardiology', patients: 45, rating: 4.9, available: true },
  { id: 2, name: 'Dr. Amina Cherif', specialty: 'Pediatrics', patients: 52, rating: 4.8, available: true },
  { id: 3, name: 'Dr. Hassan Boudiaf', specialty: 'General Medicine', patients: 38, rating: 4.7, available: false },
  { id: 4, name: 'Dr. Sara Hamidi', specialty: 'Dermatology', patients: 29, rating: 4.9, available: true },
]

export function ClinicProDashboard({ professional }: ClinicProDashboardProps) {
  const [activeSection, setActiveSection] = useState('overview')
  const [searchQuery, setSearchQuery] = useState('')
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [settings, setSettings] = useState({
    acceptNewPatients: true,
    emergencyServices: true,
    onlineBooking: true,
    insuranceAccepted: true
  })

  const handleRefresh = () => {
    setIsRefreshing(true)
    setTimeout(() => setIsRefreshing(false), 1500)
  }

  const navItems = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'appointments', label: 'Appointments', icon: Calendar },
    { id: 'patients', label: 'Patients', icon: Users },
    { id: 'doctors', label: 'Staff', icon: Stethoscope },
    { id: 'departments', label: 'Departments', icon: Building2 },
    { id: 'billing', label: 'Billing', icon: CreditCard },
    { id: 'analytics', label: 'Analytics', icon: PieChart },
    { id: 'settings', label: 'Settings', icon: Settings },
  ]

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-slate-50 dark:bg-slate-900">
      {/* Sidebar Navigation */}
      <div className="w-64 bg-white dark:bg-slate-800 border-r flex flex-col">
        <div className="p-4 border-b">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
              <Building2 className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-semibold truncate">{professional?.business_name || 'Clinic'}</h2>
              <p className="text-xs text-muted-foreground">Clinic Dashboard</p>
            </div>
          </div>
        </div>

        <ScrollArea className="flex-1 p-2">
          <nav className="space-y-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  activeSection === item.id
                    ? 'bg-violet-50 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
                {item.id === 'messages' && (
                  <Badge className="ml-auto bg-violet-500 text-white text-xs">3</Badge>
                )}
              </button>
            ))}
          </nav>
        </ScrollArea>

        <div className="p-4 border-t">
          <div className="bg-gradient-to-r from-violet-500 to-purple-600 rounded-lg p-4 text-white">
            <p className="text-sm font-medium">Pro Features</p>
            <p className="text-xs opacity-80 mt-1">Multi-department management</p>
            <Button size="sm" variant="secondary" className="w-full mt-3 bg-white/20 hover:bg-white/30 text-white border-0">
              Upgrade Plan
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <div className="h-16 bg-white dark:bg-slate-800 border-b flex items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-semibold">
              {navItems.find(n => n.id === activeSection)?.label}
            </h1>
            <Button variant="ghost" size="icon" onClick={handleRefresh} className={isRefreshing ? 'animate-spin' : ''}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search patients, doctors..."
                className="w-64 pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button variant="outline" size="icon">
              <Bell className="h-4 w-4" />
            </Button>
            <Button className="gap-2 bg-violet-600 hover:bg-violet-700">
              <Plus className="h-4 w-4" />
              New Appointment
            </Button>
          </div>
        </div>

        {/* Content Area */}
        <ScrollArea className="flex-1">
          <div className="p-6">
            {activeSection === 'overview' && (
              <div className="space-y-6">
                {/* KPI Cards */}
                <div className="grid grid-cols-4 gap-4">
                  <Card className="bg-gradient-to-br from-violet-500 to-purple-600 text-white border-0">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-sm opacity-80">Today's Patients</p>
                          <p className="text-3xl font-bold mt-1">47</p>
                          <div className="flex items-center gap-1 mt-2 text-sm">
                            <ArrowUpRight className="h-4 w-4" />
                            <span>+12% from yesterday</span>
                          </div>
                        </div>
                        <div className="h-12 w-12 rounded-full bg-white/20 flex items-center justify-center">
                          <Users className="h-6 w-6" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-sm text-muted-foreground">Appointments</p>
                          <p className="text-3xl font-bold mt-1">156</p>
                          <div className="flex items-center gap-1 mt-2 text-sm text-green-600">
                            <ArrowUpRight className="h-4 w-4" />
                            <span>+8% this week</span>
                          </div>
                        </div>
                        <div className="h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                          <Calendar className="h-6 w-6 text-blue-600" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-sm text-muted-foreground">Revenue (DZD)</p>
                          <p className="text-3xl font-bold mt-1">1.42M</p>
                          <div className="flex items-center gap-1 mt-2 text-sm text-green-600">
                            <TrendingUp className="h-4 w-4" />
                            <span>+15% this month</span>
                          </div>
                        </div>
                        <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                          <DollarSign className="h-6 w-6 text-green-600" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-sm text-muted-foreground">Active Doctors</p>
                          <p className="text-3xl font-bold mt-1">12</p>
                          <div className="flex items-center gap-1 mt-2 text-sm text-amber-600">
                            <Activity className="h-4 w-4" />
                            <span>3 on break</span>
                          </div>
                        </div>
                        <div className="h-12 w-12 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                          <Stethoscope className="h-6 w-6 text-amber-600" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Charts Row */}
                <div className="grid grid-cols-3 gap-4">
                  <Card className="col-span-2">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Patient Visits & Revenue</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={visitData}>
                            <defs>
                              <linearGradient id="colorPatients" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                            <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} />
                            <YAxis stroke="#94a3b8" fontSize={12} />
                            <Tooltip />
                            <Area type="monotone" dataKey="patients" stroke="#8b5cf6" fill="url(#colorPatients)" strokeWidth={2} />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Department Distribution</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <RechartsPieChart>
                            <Pie
                              data={departmentData}
                              cx="50%"
                              cy="50%"
                              innerRadius={50}
                              outerRadius={80}
                              paddingAngle={5}
                              dataKey="value"
                            >
                              {departmentData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip />
                          </RechartsPieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="space-y-2 mt-2">
                        {departmentData.map((dept) => (
                          <div key={dept.name} className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                              <div className="h-3 w-3 rounded-full" style={{ backgroundColor: dept.color }} />
                              <span>{dept.name}</span>
                            </div>
                            <span className="font-medium">{dept.value}%</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Appointments & Doctors */}
                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">Today's Schedule</CardTitle>
                        <Button variant="ghost" size="sm">View All</Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {recentAppointments.map((apt) => (
                          <div key={apt.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800">
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
                                <span className="text-sm font-medium text-violet-600">{apt.patient.charAt(0)}</span>
                              </div>
                              <div>
                                <p className="font-medium text-sm">{apt.patient}</p>
                                <p className="text-xs text-muted-foreground">{apt.department} - {apt.doctor}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-medium">{apt.time}</p>
                              <Badge variant={
                                apt.status === 'completed' ? 'default' :
                                apt.status === 'in-progress' ? 'secondary' :
                                apt.status === 'waiting' ? 'outline' : 'outline'
                              } className="text-xs">
                                {apt.status}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">Medical Staff</CardTitle>
                        <Button variant="ghost" size="sm">Manage</Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {doctors.map((doc) => (
                          <div key={doc.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800">
                            <div className="flex items-center gap-3">
                              <Avatar className="h-10 w-10">
                                <AvatarFallback className="bg-violet-100 text-violet-600">
                                  {doc.name.split(' ').map(n => n[0]).join('')}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium text-sm">{doc.name}</p>
                                <p className="text-xs text-muted-foreground">{doc.specialty}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="text-right">
                                <div className="flex items-center gap-1">
                                  <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
                                  <span className="text-sm font-medium">{doc.rating}</span>
                                </div>
                                <p className="text-xs text-muted-foreground">{doc.patients} patients</p>
                              </div>
                              <div className={`h-2 w-2 rounded-full ${doc.available ? 'bg-green-500' : 'bg-slate-300'}`} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-4 gap-4">
                  <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
                    <CardContent className="p-4 flex items-center gap-3">
                      <Bed className="h-8 w-8 text-blue-600" />
                      <div>
                        <p className="text-2xl font-bold text-blue-600">24</p>
                        <p className="text-sm text-blue-600/80">Available Beds</p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
                    <CardContent className="p-4 flex items-center gap-3">
                      <Ambulance className="h-8 w-8 text-green-600" />
                      <div>
                        <p className="text-2xl font-bold text-green-600">3</p>
                        <p className="text-sm text-green-600/80">Ambulances Ready</p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800">
                    <CardContent className="p-4 flex items-center gap-3">
                      <HeartPulse className="h-8 w-8 text-amber-600" />
                      <div>
                        <p className="text-2xl font-bold text-amber-600">8</p>
                        <p className="text-sm text-amber-600/80">ICU Patients</p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800">
                    <CardContent className="p-4 flex items-center gap-3">
                      <Shield className="h-8 w-8 text-purple-600" />
                      <div>
                        <p className="text-2xl font-bold text-purple-600">98%</p>
                        <p className="text-sm text-purple-600/80">Safety Score</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}

            {activeSection === 'settings' && (
              <div className="max-w-2xl space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Clinic Settings</CardTitle>
                    <CardDescription>Configure your clinic preferences</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Accept New Patients</p>
                        <p className="text-sm text-muted-foreground">Allow new patient registrations</p>
                      </div>
                      <Switch
                        checked={settings.acceptNewPatients}
                        onCheckedChange={(v) => setSettings(s => ({ ...s, acceptNewPatients: v }))}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Emergency Services</p>
                        <p className="text-sm text-muted-foreground">24/7 emergency availability</p>
                      </div>
                      <Switch
                        checked={settings.emergencyServices}
                        onCheckedChange={(v) => setSettings(s => ({ ...s, emergencyServices: v }))}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Online Booking</p>
                        <p className="text-sm text-muted-foreground">Allow online appointment booking</p>
                      </div>
                      <Switch
                        checked={settings.onlineBooking}
                        onCheckedChange={(v) => setSettings(s => ({ ...s, onlineBooking: v }))}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Insurance Accepted</p>
                        <p className="text-sm text-muted-foreground">Accept CNAS and insurance</p>
                      </div>
                      <Switch
                        checked={settings.insuranceAccepted}
                        onCheckedChange={(v) => setSettings(s => ({ ...s, insuranceAccepted: v }))}
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Clinic Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium">Clinic Name</label>
                        <Input defaultValue={professional?.business_name} className="mt-1" />
                      </div>
                      <div>
                        <label className="text-sm font-medium">License Number</label>
                        <Input defaultValue={professional?.license_number} className="mt-1" />
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Address</label>
                      <Input defaultValue={professional?.address_line1} className="mt-1" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium">Phone</label>
                        <Input defaultValue={professional?.phone} className="mt-1" />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Email</label>
                        <Input defaultValue={professional?.email} className="mt-1" />
                      </div>
                    </div>
                    <Button className="bg-violet-600 hover:bg-violet-700">Save Changes</Button>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Placeholder for other sections */}
            {!['overview', 'messages', 'settings'].includes(activeSection) && (
              <Card className="h-96 flex items-center justify-center">
                <div className="text-center">
                  <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium">{navItems.find(n => n.id === activeSection)?.label}</h3>
                  <p className="text-muted-foreground mt-1">This section is being developed</p>
                </div>
              </Card>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  )
}
