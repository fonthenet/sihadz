"use client"

import { useState, useEffect } from "react"
import { createBrowserClient } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Search, FileText, Eye, Download, Pill, Calendar, User } from "lucide-react"
import { LoadingSpinner } from "@/components/ui/page-loading"
import { useSearchParams } from "next/navigation"
import { Suspense } from "react"
import Loading from "./loading"

interface Prescription {
  id: string
  appointment_id: string
  diagnosis: string
  medications: any[]
  instructions: string
  created_at: string
  appointments?: {
    appointment_date: string
    doctors?: { full_name: string }
    profiles?: { full_name: string }
  }
}

export default function PrescriptionsManagement() {
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedPrescription, setSelectedPrescription] = useState<Prescription | null>(null)
  const searchParams = useSearchParams()

  const supabase = createBrowserClient()

  useEffect(() => {
    fetchPrescriptions()
  }, [])

  const fetchPrescriptions = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('prescriptions')
      .select(`
        *,
        appointments (
          appointment_date,
          doctors (full_name),
          profiles (full_name)
        )
      `)
      .order('created_at', { ascending: false })

    if (!error && data) {
      setPrescriptions(data)
    }
    setLoading(false)
  }

  const filteredPrescriptions = prescriptions.filter(p =>
    p.diagnosis?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.appointments?.doctors?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.appointments?.profiles?.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <Suspense fallback={<Loading />}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Prescriptions Management</h1>
            <p className="text-muted-foreground">View and manage all prescriptions issued</p>
          </div>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" /> Export
          </Button>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Prescriptions</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{prescriptions.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">This Month</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {prescriptions.filter(p => new Date(p.created_at).getMonth() === new Date().getMonth()).length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Unique Patients</CardTitle>
              <User className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {new Set(prescriptions.map(p => p.appointments?.profiles?.full_name)).size}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search prescriptions..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10" />
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <LoadingSpinner size="lg" className="text-muted-foreground" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Patient</TableHead>
                    <TableHead>Doctor</TableHead>
                    <TableHead>Diagnosis</TableHead>
                    <TableHead>Medications</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPrescriptions.map(prescription => (
                    <TableRow key={prescription.id}>
                      <TableCell className="font-mono text-xs">{prescription.id.slice(0, 8)}...</TableCell>
                      <TableCell>{prescription.appointments?.profiles?.full_name || 'N/A'}</TableCell>
                      <TableCell>{prescription.appointments?.doctors?.full_name || 'N/A'}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{prescription.diagnosis || 'N/A'}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          <Pill className="h-3 w-3 mr-1" />
                          {prescription.medications?.length || 0} items
                        </Badge>
                      </TableCell>
                      <TableCell>{new Date(prescription.created_at).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => setSelectedPrescription(prescription)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* View Prescription Dialog */}
        <Dialog open={!!selectedPrescription} onOpenChange={() => setSelectedPrescription(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Prescription Details</DialogTitle>
            </DialogHeader>
            {selectedPrescription && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Patient</p>
                    <p className="font-medium">{selectedPrescription.appointments?.profiles?.full_name || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Doctor</p>
                    <p className="font-medium">{selectedPrescription.appointments?.doctors?.full_name || 'N/A'}</p>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Diagnosis</p>
                  <p className="font-medium">{selectedPrescription.diagnosis || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Medications</p>
                  <div className="space-y-2">
                    {selectedPrescription.medications?.map((med: any, i: number) => (
                      <div key={i} className="flex items-center gap-2 p-2 bg-muted rounded">
                        <Pill className="h-4 w-4" />
                        <span>{typeof med === 'string' ? med : med.name || JSON.stringify(med)}</span>
                      </div>
                    )) || <p className="text-muted-foreground">No medications</p>}
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Instructions</p>
                  <p className="font-medium">{selectedPrescription.instructions || 'N/A'}</p>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </Suspense>
  )
}
