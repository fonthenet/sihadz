'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger 
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table'
import { useToast } from '@/hooks/use-toast'
import { 
  CalendarOff, Plus, RefreshCw, Check, X, Clock, Calendar,
  Plane, Stethoscope, GraduationCap, AlertCircle, Baby, User
} from 'lucide-react'

interface TimeOffRequest {
  id: string
  professional_id: string
  request_type: string
  start_date: string
  end_date: string
  all_day: boolean
  start_time?: string
  end_time?: string
  reason?: string
  status: 'pending' | 'approved' | 'rejected' | 'cancelled'
  reviewed_by?: string
  reviewed_by_name?: string
  reviewed_at?: string
  review_notes?: string
  requested_by: string
  requested_by_name: string
  is_employee_request: boolean
  employee_id?: string
  created_at: string
}

interface TimeOffManagementProps {
  professional: any
  onUpdate?: () => void
}

const REQUEST_TYPES = [
  { value: 'vacation', label: 'Vacation', icon: Plane, color: 'bg-blue-100 text-blue-700' },
  { value: 'sick_leave', label: 'Sick Leave', icon: Stethoscope, color: 'bg-red-100 text-red-700' },
  { value: 'personal', label: 'Personal', icon: User, color: 'bg-purple-100 text-purple-700' },
  { value: 'training', label: 'Training', icon: GraduationCap, color: 'bg-green-100 text-green-700' },
  { value: 'conference', label: 'Conference', icon: GraduationCap, color: 'bg-teal-100 text-teal-700' },
  { value: 'emergency', label: 'Emergency', icon: AlertCircle, color: 'bg-orange-100 text-orange-700' },
  { value: 'maternity', label: 'Maternity/Paternity', icon: Baby, color: 'bg-pink-100 text-pink-700' },
  { value: 'other', label: 'Other', icon: Calendar, color: 'bg-gray-100 text-gray-700' },
]

export default function TimeOffManagement({ professional, onUpdate }: TimeOffManagementProps) {
  const { toast } = useToast()
  const [requests, setRequests] = useState<TimeOffRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [showDialog, setShowDialog] = useState(false)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  
  // Form state
  const [form, setForm] = useState({
    request_type: 'vacation',
    start_date: '',
    end_date: '',
    all_day: true,
    start_time: '',
    end_time: '',
    reason: ''
  })

  // Fetch requests
  const fetchRequests = useCallback(async () => {
    if (!professional?.id) return
    
    try {
      setLoading(true)
      let url = `/api/professionals/${professional.id}/time-off`
      if (statusFilter !== 'all') {
        url += `?status=${statusFilter}`
      }
      
      const res = await fetch(url, { credentials: 'include', cache: 'no-store' })
      if (!res.ok) throw new Error('Failed to fetch')
      
      const data = await res.json()
      setRequests(data.requests || [])
    } catch (error) {
      console.error('Error fetching time-off requests:', error)
    } finally {
      setLoading(false)
    }
  }, [professional?.id, statusFilter])

  useEffect(() => {
    fetchRequests()
  }, [fetchRequests])

  // Create request
  const handleCreate = async () => {
    if (!form.start_date || !form.end_date) {
      toast({ title: 'Error', description: 'Please select dates', variant: 'destructive' })
      return
    }

    try {
      const res = await fetch(`/api/professionals/${professional.id}/time-off`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(form)
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to create request')
      }

      toast({ title: 'Success', description: 'Time-off request created' })
      setShowDialog(false)
      setForm({
        request_type: 'vacation',
        start_date: '',
        end_date: '',
        all_day: true,
        start_time: '',
        end_time: '',
        reason: ''
      })
      fetchRequests()
      onUpdate?.()
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    }
  }

  // Update request status
  const handleStatusChange = async (requestId: string, action: 'approve' | 'reject' | 'cancel') => {
    try {
      const res = await fetch(`/api/professionals/${professional.id}/time-off`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ request_id: requestId, action })
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to update request')
      }

      toast({ title: 'Success', description: `Request ${action}ed` })
      fetchRequests()
      onUpdate?.()
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    }
  }

  // Delete request
  const handleDelete = async (requestId: string) => {
    try {
      const res = await fetch(`/api/professionals/${professional.id}/time-off?request_id=${requestId}`, {
        method: 'DELETE',
        credentials: 'include'
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to delete request')
      }

      toast({ title: 'Success', description: 'Request deleted' })
      fetchRequests()
      onUpdate?.()
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    }
  }

  const getTypeInfo = (type: string) => {
    return REQUEST_TYPES.find(t => t.value === type) || REQUEST_TYPES[REQUEST_TYPES.length - 1]
  }

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-700',
      approved: 'bg-green-100 text-green-700',
      rejected: 'bg-red-100 text-red-700',
      cancelled: 'bg-gray-100 text-gray-500'
    }
    return <Badge className={styles[status] || 'bg-gray-100'}>{status}</Badge>
  }

  const formatDateRange = (start: string, end: string) => {
    const startDate = new Date(start)
    const endDate = new Date(end)
    const sameDay = start === end
    
    const options: Intl.DateTimeFormatOptions = { 
      weekday: 'short', day: 'numeric', month: 'short' 
    }
    
    if (sameDay) {
      return startDate.toLocaleDateString('en-GB', { ...options, year: 'numeric' })
    }
    
    return `${startDate.toLocaleDateString('en-GB', options)} - ${endDate.toLocaleDateString('en-GB', { ...options, year: 'numeric' })}`
  }

  const getDaysCount = (start: string, end: string) => {
    const startDate = new Date(start)
    const endDate = new Date(end)
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1
    return diffDays
  }

  // Stats
  const approvedCount = requests.filter(r => r.status === 'approved').length
  const pendingCount = requests.filter(r => r.status === 'pending').length
  const upcomingApproved = requests.filter(
    r => r.status === 'approved' && new Date(r.start_date) >= new Date()
  ).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <CalendarOff className="h-5 w-5" />
            Time-Off Management
          </h3>
          <p className="text-sm text-muted-foreground">
            Manage vacation, sick leave, and other time-off requests
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchRequests}>
            <RefreshCw className="h-4 w-4 mr-1" />
            Refresh
          </Button>
          <Dialog open={showDialog} onOpenChange={setShowDialog}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-1" />
                Request Time-Off
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>New Time-Off Request</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <Label>Type *</Label>
                  <Select 
                    value={form.request_type}
                    onValueChange={v => setForm(f => ({ ...f, request_type: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {REQUEST_TYPES.map(type => (
                        <SelectItem key={type.value} value={type.value}>
                          <span className="flex items-center gap-2">
                            <type.icon className="h-4 w-4" />
                            {type.label}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Start Date *</Label>
                    <Input 
                      type="date"
                      value={form.start_date}
                      onChange={e => setForm(f => ({ 
                        ...f, 
                        start_date: e.target.value,
                        end_date: f.end_date || e.target.value
                      }))}
                    />
                  </div>
                  <div>
                    <Label>End Date *</Label>
                    <Input 
                      type="date"
                      value={form.end_date}
                      min={form.start_date}
                      onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Switch 
                    checked={form.all_day}
                    onCheckedChange={v => setForm(f => ({ ...f, all_day: v }))}
                  />
                  <Label>All day</Label>
                </div>

                {!form.all_day && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Start Time</Label>
                      <Input 
                        type="time"
                        value={form.start_time}
                        onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label>End Time</Label>
                      <Input 
                        type="time"
                        value={form.end_time}
                        onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))}
                      />
                    </div>
                  </div>
                )}

                <div>
                  <Label>Reason (optional)</Label>
                  <Textarea 
                    placeholder="Add any notes..."
                    value={form.reason}
                    onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreate}>
                  Submit Request
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold text-yellow-600">{pendingCount}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Approved</p>
                <p className="text-2xl font-bold text-green-600">{approvedCount}</p>
              </div>
              <Check className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Upcoming</p>
                <p className="text-2xl font-bold text-blue-600">{upcomingApproved}</p>
              </div>
              <Calendar className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Requests List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Time-Off Requests</CardTitle>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : requests.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CalendarOff className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No time-off requests</p>
              <p className="text-sm">Click "Request Time-Off" to add one</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Dates</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map(request => {
                  const typeInfo = getTypeInfo(request.request_type)
                  const TypeIcon = typeInfo.icon
                  
                  return (
                    <TableRow key={request.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className={`p-1.5 rounded ${typeInfo.color}`}>
                            <TypeIcon className="h-4 w-4" />
                          </div>
                          <span className="font-medium">{typeInfo.label}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {formatDateRange(request.start_date, request.end_date)}
                        {!request.all_day && request.start_time && (
                          <p className="text-xs text-muted-foreground">
                            {request.start_time} - {request.end_time}
                          </p>
                        )}
                      </TableCell>
                      <TableCell>
                        {getDaysCount(request.start_date, request.end_date)} day(s)
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {request.reason || '-'}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(request.status)}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {request.status === 'pending' && (
                            <>
                              <Button 
                                size="sm" 
                                variant="ghost"
                                className="h-8 w-8 p-0 text-green-600"
                                onClick={() => handleStatusChange(request.id, 'approve')}
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button 
                                size="sm" 
                                variant="ghost"
                                className="h-8 w-8 p-0 text-red-600"
                                onClick={() => handleStatusChange(request.id, 'reject')}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                          {request.status === 'approved' && new Date(request.start_date) > new Date() && (
                            <Button 
                              size="sm" 
                              variant="ghost"
                              className="h-8 text-xs"
                              onClick={() => handleStatusChange(request.id, 'cancel')}
                            >
                              Cancel
                            </Button>
                          )}
                          {['rejected', 'cancelled'].includes(request.status) && (
                            <Button 
                              size="sm" 
                              variant="ghost"
                              className="h-8 w-8 p-0 text-red-600"
                              onClick={() => handleDelete(request.id)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
