'use client'

import React from "react"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { 
  Activity, Heart, Thermometer, Pill, FlaskConical, Syringe, 
  FileText, Users, Calendar, TrendingUp, TrendingDown, Minus,
  AlertTriangle, CheckCircle, Clock, Download, Share2, 
  Brain, Sparkles, ChevronRight, Baby, User
} from 'lucide-react'
import { createBrowserClient } from '@/lib/supabase/client'
import { format, formatDistanceToNow, differenceInYears, addYears } from 'date-fns'

interface LabResult {
  id: string
  test_code: string
  test_name: string
  result_value: string
  unit: string
  normal_range_min?: number
  normal_range_max?: number
  status: 'normal' | 'high' | 'low' | 'critical'
  tested_at: string
}

interface Prescription {
  id: string
  doctor_name: string
  diagnosis: string
  medications: any[]
  created_at: string
  status: string
}

interface VaccineRecord {
  id: string
  vaccine_name: string
  vaccine_name_ar?: string
  dose_number: number
  administered_at: string
  next_dose_due?: string
  administered_by?: string
  batch_number?: string
}

interface FamilyMember {
  id: string
  full_name: string
  relationship: string
  date_of_birth: string
  gender: string
}

interface HealthDashboardProps {
  patientId: string
  patientName: string
}

export function HealthDashboard({ patientId, patientName }: HealthDashboardProps) {
  const [labResults, setLabResults] = useState<LabResult[]>([])
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([])
  const [vaccineRecords, setVaccineRecords] = useState<VaccineRecord[]>([])
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([])
  const [selectedLabResult, setSelectedLabResult] = useState<LabResult | null>(null)
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')

  const supabase = createBrowserClient()

  // Load patient data
  useEffect(() => {
    async function loadData() {
      const [labData, prescData, vaccData, familyData] = await Promise.all([
        supabase.from('lab_test_results').select('*').eq('patient_id', patientId).order('tested_at', { ascending: false }),
        supabase.from('prescriptions').select('*').eq('patient_id', patientId).order('created_at', { ascending: false }),
        supabase.from('vaccination_records').select('*, vaccines(name, name_ar)').eq('patient_id', patientId).order('administered_at', { ascending: false }),
        supabase.from('family_members').select('*').eq('primary_account_id', patientId)
      ])

      if (labData.data) setLabResults(labData.data)
      if (prescData.data) setPrescriptions(prescData.data)
      if (vaccData.data) setVaccineRecords(vaccData.data)
      if (familyData.data) setFamilyMembers(familyData.data)
    }
    loadData()
  }, [patientId, supabase])

  // AI Lab Analysis
  const analyzeLabResult = async (result: LabResult) => {
    setSelectedLabResult(result)
    setIsAnalyzing(true)
    setAiAnalysis(null)

    try {
      const response = await fetch('/api/ai/analyze-lab', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          testName: result.test_name,
          testCode: result.test_code,
          value: result.result_value,
          unit: result.unit,
          normalMin: result.normal_range_min,
          normalMax: result.normal_range_max,
          status: result.status
        })
      })

      const data = await response.json()
      setAiAnalysis(data.analysis)
    } catch (error) {
      setAiAnalysis('Unable to generate analysis at this time. Please consult with your healthcare provider for interpretation of your results.')
    } finally {
      setIsAnalyzing(false)
    }
  }

  // Get status color and icon
  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'normal':
        return { color: 'text-green-500', bg: 'bg-green-500/10', icon: CheckCircle }
      case 'high':
        return { color: 'text-orange-500', bg: 'bg-orange-500/10', icon: TrendingUp }
      case 'low':
        return { color: 'text-blue-500', bg: 'bg-blue-500/10', icon: TrendingDown }
      case 'critical':
        return { color: 'text-red-500', bg: 'bg-red-500/10', icon: AlertTriangle }
      default:
        return { color: 'text-gray-500', bg: 'bg-gray-500/10', icon: Minus }
    }
  }

  // Calculate health metrics
  const normalResultsCount = labResults.filter(r => r.status === 'normal').length
  const abnormalResultsCount = labResults.filter(r => r.status !== 'normal').length
  const upcomingVaccines = vaccineRecords.filter(v => v.next_dose_due && new Date(v.next_dose_due) > new Date())

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Health Dashboard</h2>
          <p className="text-muted-foreground">Welcome back, {patientName}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="bg-transparent">
            <Download className="h-4 w-4 mr-2" />
            Export Records
          </Button>
          <Button variant="outline" className="bg-transparent">
            <Share2 className="h-4 w-4 mr-2" />
            Share with Doctor
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Lab Results</p>
                <p className="text-2xl font-bold">{labResults.length}</p>
              </div>
              <FlaskConical className="h-8 w-8 text-purple-500" />
            </div>
            <div className="mt-2 flex gap-2">
              <Badge variant="secondary" className="text-green-600">
                {normalResultsCount} normal
              </Badge>
              {abnormalResultsCount > 0 && (
                <Badge variant="secondary" className="text-orange-600">
                  {abnormalResultsCount} to review
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Prescriptions</p>
                <p className="text-2xl font-bold">{prescriptions.length}</p>
              </div>
              <Pill className="h-8 w-8 text-blue-500" />
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              {prescriptions.filter(p => p.status === 'active').length} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Vaccinations</p>
                <p className="text-2xl font-bold">{vaccineRecords.length}</p>
              </div>
              <Syringe className="h-8 w-8 text-green-500" />
            </div>
            {upcomingVaccines.length > 0 && (
              <Badge className="mt-2">{upcomingVaccines.length} upcoming</Badge>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Family Members</p>
                <p className="text-2xl font-bold">{familyMembers.length}</p>
              </div>
              <Users className="h-8 w-8 text-orange-500" />
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Linked accounts
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="labs">Lab Results</TabsTrigger>
          <TabsTrigger value="prescriptions">Prescriptions</TabsTrigger>
          <TabsTrigger value="vaccines">Vaccines</TabsTrigger>
          <TabsTrigger value="family">Family</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid lg:grid-cols-2 gap-4">
            {/* Recent Lab Results */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <FlaskConical className="h-5 w-5" />
                  Recent Lab Results
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {labResults.slice(0, 5).map(result => {
                    const statusInfo = getStatusInfo(result.status)
                    const StatusIcon = statusInfo.icon
                    return (
                      <div 
                        key={result.id} 
                        className="flex items-center justify-between p-3 rounded-lg hover:bg-muted cursor-pointer"
                        onClick={() => analyzeLabResult(result)}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-full ${statusInfo.bg}`}>
                            <StatusIcon className={`h-4 w-4 ${statusInfo.color}`} />
                          </div>
                          <div>
                            <p className="font-medium">{result.test_name}</p>
                            <p className="text-sm text-muted-foreground">
                              {result.result_value} {result.unit}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge variant={result.status === 'normal' ? 'secondary' : 'destructive'}>
                            {result.status}
                          </Badge>
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatDistanceToNow(new Date(result.tested_at), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                  {labResults.length === 0 && (
                    <p className="text-center text-muted-foreground py-4">
                      No lab results yet
                    </p>
                  )}
                </div>
              </CardContent>
              {labResults.length > 5 && (
                <CardFooter>
                  <Button variant="ghost" className="w-full" onClick={() => setActiveTab('labs')}>
                    View All Results
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </Button>
                </CardFooter>
              )}
            </Card>

            {/* Upcoming Vaccines */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Syringe className="h-5 w-5" />
                  Vaccination Schedule
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {vaccineRecords.slice(0, 5).map(record => (
                    <div key={record.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <div>
                        <p className="font-medium">{record.vaccine_name}</p>
                        {record.vaccine_name_ar && (
                          <p className="text-sm text-muted-foreground">{record.vaccine_name_ar}</p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          Dose {record.dose_number} - {format(new Date(record.administered_at), 'MMM d, yyyy')}
                        </p>
                      </div>
                      {record.next_dose_due && new Date(record.next_dose_due) > new Date() ? (
                        <Badge>
                          <Clock className="h-3 w-3 mr-1" />
                          Next: {format(new Date(record.next_dose_due), 'MMM yyyy')}
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Complete
                        </Badge>
                      )}
                    </div>
                  ))}
                  {vaccineRecords.length === 0 && (
                    <p className="text-center text-muted-foreground py-4">
                      No vaccination records
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Lab Results Tab */}
        <TabsContent value="labs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FlaskConical className="h-5 w-5" />
                All Lab Results
              </CardTitle>
              <CardDescription>
                Click on any result to get AI-powered analysis
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="space-y-2">
                  {labResults.map(result => {
                    const statusInfo = getStatusInfo(result.status)
                    const StatusIcon = statusInfo.icon
                    return (
                      <Dialog key={result.id}>
                        <DialogTrigger asChild>
                          <div 
                            className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted cursor-pointer transition-colors"
                            onClick={() => analyzeLabResult(result)}
                          >
                            <div className="flex items-center gap-4">
                              <div className={`p-2 rounded-full ${statusInfo.bg}`}>
                                <StatusIcon className={`h-5 w-5 ${statusInfo.color}`} />
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-mono text-sm text-muted-foreground">{result.test_code}</span>
                                  <span className="font-medium">{result.test_name}</span>
                                </div>
                                <p className="text-sm text-muted-foreground">
                                  {format(new Date(result.tested_at), 'PPP')}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-lg font-semibold">
                                {result.result_value} <span className="text-sm font-normal text-muted-foreground">{result.unit}</span>
                              </p>
                              {(result.normal_range_min || result.normal_range_max) && (
                                <p className="text-xs text-muted-foreground">
                                  Normal: {result.normal_range_min}-{result.normal_range_max} {result.unit}
                                </p>
                              )}
                            </div>
                          </div>
                        </DialogTrigger>
                        <DialogContent className="max-w-lg">
                          <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                              <Brain className="h-5 w-5 text-purple-500" />
                              AI Lab Result Analysis
                            </DialogTitle>
                            <DialogDescription>
                              Powered by AI - Always consult your doctor for medical advice
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div className="p-4 rounded-lg bg-muted">
                              <div className="flex justify-between items-start mb-2">
                                <div>
                                  <h4 className="font-semibold">{result.test_name}</h4>
                                  <p className="text-sm text-muted-foreground">{result.test_code}</p>
                                </div>
                                <Badge className={statusInfo.bg + ' ' + statusInfo.color}>
                                  {result.status.toUpperCase()}
                                </Badge>
                              </div>
                              <div className="grid grid-cols-2 gap-4 mt-4">
                                <div>
                                  <p className="text-sm text-muted-foreground">Your Result</p>
                                  <p className="text-xl font-bold">{result.result_value} {result.unit}</p>
                                </div>
                                <div>
                                  <p className="text-sm text-muted-foreground">Normal Range</p>
                                  <p className="text-xl font-bold">
                                    {result.normal_range_min}-{result.normal_range_max} {result.unit}
                                  </p>
                                </div>
                              </div>
                            </div>

                            <Separator />

                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <Sparkles className="h-4 w-4 text-purple-500" />
                                <h4 className="font-semibold">AI Analysis</h4>
                              </div>
                              {isAnalyzing ? (
                                <div className="flex items-center justify-center py-8">
                                  <LoadingSpinner size="lg" className="me-2" />
                                  <span>Analyzing your results...</span>
                                </div>
                              ) : aiAnalysis ? (
                                <div className="p-4 rounded-lg bg-purple-50 dark:bg-purple-950/20 text-sm leading-relaxed">
                                  {aiAnalysis}
                                </div>
                              ) : null}
                            </div>
                          </div>
                          <DialogFooter>
                            <Button variant="outline" className="bg-transparent">
                              <Share2 className="h-4 w-4 mr-2" />
                              Share with Doctor
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    )
                  })}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Prescriptions Tab */}
        <TabsContent value="prescriptions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Pill className="h-5 w-5" />
                My Prescriptions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="space-y-4">
                  {prescriptions.map(prescription => (
                    <Card key={prescription.id}>
                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <p className="font-semibold">{prescription.diagnosis}</p>
                            <p className="text-sm text-muted-foreground">
                              By {prescription.doctor_name} - {format(new Date(prescription.created_at), 'PPP')}
                            </p>
                          </div>
                          <Badge variant={prescription.status === 'active' ? 'default' : 'secondary'}>
                            {prescription.status}
                          </Badge>
                        </div>
                        <Separator className="my-3" />
                        <div className="space-y-2">
                          {prescription.medications?.map((med: any, idx: number) => (
                            <div key={idx} className="flex items-center justify-between p-2 rounded bg-muted/50">
                              <div>
                                <p className="font-medium">{med.medication || med.medication_name}</p>
                                <p className="text-sm text-muted-foreground">
                                  {med.dosage} - {med.frequency}
                                </p>
                              </div>
                              <Badge variant="outline">{med.duration}</Badge>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {prescriptions.length === 0 && (
                    <p className="text-center text-muted-foreground py-8">
                      No prescriptions yet
                    </p>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Vaccines Tab */}
        <TabsContent value="vaccines" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Syringe className="h-5 w-5" />
                Vaccination History
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="space-y-3">
                  {vaccineRecords.map(record => (
                    <div key={record.id} className="p-4 rounded-lg border">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-semibold">{record.vaccine_name}</h4>
                          {record.vaccine_name_ar && (
                            <p className="text-sm text-muted-foreground">{record.vaccine_name_ar}</p>
                          )}
                        </div>
                        <Badge>Dose {record.dose_number}</Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-4 mt-3 text-sm">
                        <div>
                          <p className="text-muted-foreground">Administered</p>
                          <p className="font-medium">{format(new Date(record.administered_at), 'PPP')}</p>
                        </div>
                        {record.next_dose_due && (
                          <div>
                            <p className="text-muted-foreground">Next Dose</p>
                            <p className="font-medium">{format(new Date(record.next_dose_due), 'PPP')}</p>
                          </div>
                        )}
                        {record.administered_by && (
                          <div>
                            <p className="text-muted-foreground">Administered By</p>
                            <p className="font-medium">{record.administered_by}</p>
                          </div>
                        )}
                        {record.batch_number && (
                          <div>
                            <p className="text-muted-foreground">Batch Number</p>
                            <p className="font-medium font-mono">{record.batch_number}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  {vaccineRecords.length === 0 && (
                    <p className="text-center text-muted-foreground py-8">
                      No vaccination records
                    </p>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Family Tab */}
        <TabsContent value="family" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Family Members
              </CardTitle>
              <CardDescription>
                Manage health records for your family members
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4">
                {familyMembers.map(member => (
                  <Card key={member.id} className="cursor-pointer hover:bg-muted/50 transition-colors">
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-4">
                        <div className="p-3 rounded-full bg-primary/10">
                          {member.relationship === 'child' ? (
                            <Baby className="h-6 w-6 text-primary" />
                          ) : (
                            <User className="h-6 w-6 text-primary" />
                          )}
                        </div>
                        <div>
                          <h4 className="font-semibold">{member.full_name}</h4>
                          <p className="text-sm text-muted-foreground capitalize">
                            {member.relationship} - {member.gender}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {differenceInYears(new Date(), new Date(member.date_of_birth))} years old
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {familyMembers.length === 0 && (
                  <div className="col-span-2 text-center py-8">
                    <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No family members added yet</p>
                    <Button className="mt-4">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Family Member
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function Plus(props: React.ComponentProps<'svg'>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M5 12h14" />
      <path d="M12 5v14" />
    </svg>
  )
}
