'use client'

import { useState, useEffect, useCallback, useMemo, Fragment } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { EditableAvatar } from '@/components/editable-avatar'
import { Progress } from '@/components/ui/progress'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { 
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import { 
  FlaskConical, Calendar, Users, DollarSign, TrendingUp,
  Clock, CheckCircle, AlertCircle, Bell, Search,
  FileText, MessageSquare, Star, Package, Truck,
  BarChart2, Wallet, ArrowUpRight, Filter, Download, RefreshCw, 
  MoreHorizontal, ChevronRight, Plus, Mail, Volume2, LayoutDashboard, Cog,
  LogOut, Home, ChevronLeft, Banknote, Activity, Microscope,
  Beaker, ClipboardCheck, FileSpreadsheet, Upload, Send, Timer,
  Thermometer, Droplet, Dna, Heart, Brain, Eye, Bone, Ticket, X, Receipt,
  CheckCircle2, XCircle, UserCircle
} from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/page-loading'
import { createBrowserClient } from '@/lib/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { useAutoRefresh } from '@/hooks/use-auto-refresh'
import { LabReportTemplateForm } from '@/app/professional/settings/components/lab-report-template-form'
import { LabStaffManagement, type LabStaff, type LabStaffMember } from '@/app/professional/settings/components/lab-staff-management'
import { EmployeeManagement } from '@/app/professional/settings/components/employee-management'
import { RoleEditor } from '@/app/professional/settings/components/role-editor'
import { EmbeddedChat } from '@/components/chat-widget/embedded-chat'
import { cn } from '@/lib/utils'
import { AvailabilityCalendar } from './availability-calendar'
import { ProDocumentsSection } from './pro-documents-section'
import { SuppliersSection } from './suppliers-section'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { LabRequestDocumentsAttach } from '@/components/lab-request-documents-attach'
import { PatientDocumentsView } from '@/components/patient-documents-view'
import { DocumentViewer } from '@/components/document-viewer'
import ProfessionalPOSUnified from './pos/professional-pos-unified'

/** Per-test fulfillment. Lab enters result value, unit, reference range per standard (HL7/FHIR-like). */
type LabFulfillmentItem = {
  item_id: string
  status: 'pending' | 'sample_collected' | 'processing' | 'completed' | 'failed'
  lab_notes?: string
  failed_reason?: string
  completed_at?: string
  /** Result fields (required when status=completed) - standard lab format */
  result_value?: string
  result_unit?: string
  reference_range?: string
  result_status?: 'normal' | 'high' | 'low' | 'critical'
}

interface LaboratoryProDashboardProps {
  professional: any
  profile: any
  authUserId?: string | null
  avatarUrl?: string | null
  onAvatarUpdate?: () => void
  onSignOut: () => void
  onProfessionalUpdate?: () => void
  initialSection?: string
  /** Employee permissions - when set, sidebar and content are filtered; owner has full access when null */
  employeePermissions?: { dashboard?: Record<string, boolean> } | null
  /** Employee username - shown when logged in as employee */
  employeeUsername?: string | null
}

// Placeholder chart data when no real data (no fake/seed numbers)
const emptyVolumeData = [
  { month: 'Jan', tests: 0, revenue: 0 },
  { month: 'Feb', tests: 0, revenue: 0 },
  { month: 'Mar', tests: 0, revenue: 0 },
  { month: 'Apr', tests: 0, revenue: 0 },
  { month: 'May', tests: 0, revenue: 0 },
  { month: 'Jun', tests: 0, revenue: 0 },
]
const emptyWeeklyTests = [
  { day: 'Sat', received: 0, completed: 0 },
  { day: 'Sun', received: 0, completed: 0 },
  { day: 'Mon', received: 0, completed: 0 },
  { day: 'Tue', received: 0, completed: 0 },
  { day: 'Wed', received: 0, completed: 0 },
  { day: 'Thu', received: 0, completed: 0 },
  { day: 'Fri', received: 0, completed: 0 },
]
const emptyTestCategories = [
  { name: 'No data yet', value: 100, color: '#94a3b8' },
]

/** Lab section id -> permission key(s); any true grants access */
const LAB_SECTION_PERMISSIONS: Record<string, string[]> = {
  overview: ['overview'],
  schedule: ['overview', 'requests'],
  requests: ['requests', 'lab_requests'],
  patients: ['patients'],
  samples: ['samples'],
  results: ['results'],
  equipment: ['equipment'],
  pos: ['pos'],
  analytics: ['analytics'],
  finances: ['finances'],
  documents: ['documents'],
  messages: ['messages'],
  settings: ['settings'],
}

function canAccessLabSection(perms: Record<string, boolean> | null | undefined, sectionId: string): boolean {
  if (!perms) return true
  const keys = LAB_SECTION_PERMISSIONS[sectionId]
  if (!keys) return true
  return keys.some(k => perms[k] === true)
}

export function LaboratoryProDashboard({ professional, authUserId, avatarUrl, onAvatarUpdate, onSignOut, onProfessionalUpdate, initialSection = 'overview', employeePermissions, employeeUsername }: LaboratoryProDashboardProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const [activeSection, setActiveSection] = useState(initialSection)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isOperating, setIsOperating] = useState(true)
  const [acceptingSamples, setAcceptingSamples] = useState(true)
  const [timeRange, setTimeRange] = useState('7d')
  const [searchQuery, setSearchQuery] = useState('')
  const [testRequests, setTestRequests] = useState<any[]>([])
  const [unreadMessages, setUnreadMessages] = useState(0)
  const [selectedRequest, setSelectedRequest] = useState<any>(null)
  const [detailTicket, setDetailTicket] = useState<any>(null)
  const [actionLoading, setActionLoading] = useState<'accept' | 'deny' | 'save' | 'send_results' | null>(null)
  const [pdfLoading, setPdfLoading] = useState(false)
  const [pdfViewerState, setPdfViewerState] = useState<{ url: string; filename: string; revoke: () => void } | null>(null)
  const [requestDetailTab, setRequestDetailTab] = useState<'details' | 'documents'>('details')
  const [localFulfillment, setLocalFulfillment] = useState<LabFulfillmentItem[]>([])
  
  // Deny reason dialog state
  const [denyDialogOpen, setDenyDialogOpen] = useState(false)
  const [denyReason, setDenyReason] = useState('')
  const [requestToDeny, setRequestToDeny] = useState<string | null>(null)
  const [assignedTechnicianId, setAssignedTechnicianId] = useState<string | null>(null)
  const [resultsGroupBy, setResultsGroupBy] = useState<'date' | 'patient' | 'doctor'>('date')
  const [resultsSortBy, setResultsSortBy] = useState<'newest' | 'oldest' | 'patient' | 'doctor'>('newest')
  const [resultsSearch, setResultsSearch] = useState('')
  
  // Test Requests section state
  const [requestsSearch, setRequestsSearch] = useState('')
  const [requestsStatusFilter, setRequestsStatusFilter] = useState<'all' | 'pending' | 'processing' | 'completed'>('all')
  const [requestsSortBy, setRequestsSortBy] = useState<'newest' | 'oldest' | 'patient' | 'doctor' | 'status'>('newest')
  const [requestsGroupBy, setRequestsGroupBy] = useState<'none' | 'date' | 'status' | 'doctor' | 'patient'>('none')
  
  // Patients section state
  const [expandedPatientId, setExpandedPatientId] = useState<string | null>(null)
  const [expandedPatientTab, setExpandedPatientTab] = useState<'requests' | 'documents'>('requests')
  const [patientsSearch, setPatientsSearch] = useState('')
  
  // Equipment state
  interface LabEquipment {
    id: string
    name: string
    model: string
    manufacturer: string
    serial_number: string
    category: 'analyzer' | 'centrifuge' | 'microscope' | 'incubator' | 'refrigerator' | 'other'
    status: 'operational' | 'maintenance' | 'repair' | 'calibration' | 'offline'
    location: string
    purchase_date?: string
    warranty_expiry?: string
    last_maintenance?: string
    next_maintenance?: string
    notes?: string
  }
  const [equipment, setEquipment] = useState<LabEquipment[]>([])
  const [showEquipmentDialog, setShowEquipmentDialog] = useState(false)
  const [editingEquipment, setEditingEquipment] = useState<LabEquipment | null>(null)
  const [equipmentSearch, setEquipmentSearch] = useState('')
  const [equipmentFilter, setEquipmentFilter] = useState<'all' | 'operational' | 'maintenance' | 'offline'>('all')
  const [equipmentForm, setEquipmentForm] = useState<Partial<LabEquipment>>({
    category: 'analyzer',
    status: 'operational'
  })

  // Get lab staff from professional
  const labStaff: LabStaff = (professional?.lab_staff as LabStaff) || { technicians: [], pathologists: [] }
  const technicians = labStaff.technicians || []
  const pathologists = labStaff.pathologists || []
  const assignedTechnician = technicians.find(t => t.id === assignedTechnicianId) || null

  const [stats, setStats] = useState({
    pendingTests: 0,
    processingTests: 0,
    completedToday: 0,
    awaitingCollection: 0,
    monthlyRevenue: 0,
    revenueGrowth: 0,
    rating: 0,
    avgTurnaround: 0,
    accuracy: 0,
    samplesPending: 0,
  })

  useEffect(() => {
    if (initialSection) setActiveSection(initialSection)
  }, [initialSection])

  // Sync section to URL so refresh preserves the current view
  useEffect(() => {
    const params = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '')
    const current = params.get('section')
    if (activeSection === 'overview' && !current) return
    if (activeSection === current) return
    if (activeSection === 'overview') {
      params.delete('section')
    } else {
      params.set('section', activeSection)
    }
    const q = params.toString()
    const url = '/professional/dashboard' + (q ? '?' + q : '')
    router.replace(url, { scroll: false })
  }, [activeSection, router])

  // When employee permissions apply, redirect to first allowed section if current is blocked
  const dashPerms = employeePermissions?.dashboard
  const labSectionIds = ['overview', 'schedule', 'requests', 'patients', 'samples', 'results', 'equipment', 'analytics', 'finances', 'documents', 'messages', 'settings']
  useEffect(() => {
    if (!dashPerms) return
    const allowed = canAccessLabSection(dashPerms, activeSection)
    if (!allowed) {
      const first = labSectionIds.find(id => canAccessLabSection(dashPerms, id)) || 'overview'
      setActiveSection(first)
    }
  }, [dashPerms, activeSection])

  useEffect(() => {
    loadDashboardData()
  }, [professional])

  useEffect(() => {
    if (!selectedRequest?.id) {
      setDetailTicket(null)
      setAssignedTechnicianId(null)
      setRequestDetailTab('details')
      return
    }
    // Set assigned technician from request
    setAssignedTechnicianId(selectedRequest.assigned_technician_id || null)
    
    const supabase = createBrowserClient()
    supabase
      .from('healthcare_tickets')
      .select('id, ticket_number, status, priority, metadata, created_at')
      .eq('lab_request_id', selectedRequest.id)
      .maybeSingle()
      .then(({ data }) => setDetailTicket(data))
  }, [selectedRequest?.id])

  // Sync local fulfillment when selected request changes (from lab_fulfillment or init from items)
  useEffect(() => {
    if (!selectedRequest?.items?.length) {
      setLocalFulfillment([])
      return
    }
    const existing = (selectedRequest.lab_fulfillment ?? []) as LabFulfillmentItem[]
    const byItemId = new Map(existing.map((f) => [f.item_id, f]))
    const merged: LabFulfillmentItem[] = selectedRequest.items.map((item: any) => {
      const curr = byItemId.get(item.id)
      return curr ?? { item_id: item.id, status: 'pending' as const }
    })
    setLocalFulfillment(merged)
  }, [selectedRequest?.id, selectedRequest?.items, selectedRequest?.lab_fulfillment])

  const getFulfillmentForItem = (itemId: string): LabFulfillmentItem => {
    return localFulfillment.find((f) => f.item_id === itemId) ?? { item_id: itemId, status: 'pending' }
  }

  const setFulfillmentForItem = (itemId: string, update: Partial<LabFulfillmentItem>) => {
    setLocalFulfillment((prev) => {
      const idx = prev.findIndex((f) => f.item_id === itemId)
      const current = idx >= 0 ? prev[idx] : { item_id: itemId, status: 'pending' as const }
      // Only clear result fields when status is explicitly changed away from completed
      const clearResults = 'status' in update && update.status !== 'completed'
      const clearFailed = 'status' in update && update.status !== 'failed'
      const merged: Partial<LabFulfillmentItem> = {
        ...update,
        ...(update.status === 'completed' ? { completed_at: new Date().toISOString() } : {}),
        ...(clearResults ? { result_value: undefined, result_unit: undefined, reference_range: undefined, result_status: undefined } : {}),
        ...(clearFailed ? { failed_reason: undefined } : {}),
      }
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = { ...next[idx], ...merged }
        return next
      }
      return [...prev, { item_id: itemId, status: 'pending', ...merged }]
    })
  }

  const isProcessing = ['processing', 'sample_collected'].includes(selectedRequest?.status || '')
  const completedCount = localFulfillment.filter((f) => f.status === 'completed').length
  const failedCount = localFulfillment.filter((f) => f.status === 'failed').length
  const totalItems = selectedRequest?.items?.length ?? 0
  const completedWithResults = localFulfillment.filter((f) => f.status === 'completed' && f.result_value && String(f.result_value).trim()).length
  const canSendResults = totalItems > 0 && (completedCount >= 1 || (completedCount + failedCount) >= totalItems) && completedWithResults === completedCount

  const loadDashboardData = async () => {
    if (!professional?.id) return
    const supabase = createBrowserClient()
    
    try {
      // Use API route which runs server-side and has proper RLS bypass for joined data
      const res = await fetch('/api/lab-requests?role=laboratory', { credentials: 'include' })
      if (!res.ok) {
        console.error('[LaboratoryProDashboard] API error:', res.status)
        setTestRequests([])
        return
      }
      const { labRequests } = await res.json()
      const requests = labRequests || []
      setTestRequests(requests)
      
      // Derive real stats from requests
      const pending = requests.filter((r: any) => r.status === 'sent_to_lab' || r.status === 'pending' || r.status === 'sent').length
      const processing = requests.filter((r: any) => r.status === 'sample_collected' || r.status === 'processing').length
      const today = new Date().toDateString()
      const completedToday = requests.filter((r: any) =>
        ['fulfilled', 'completed'].includes(r.status || '') &&
        r.updated_at && new Date(r.updated_at).toDateString() === today
      ).length
      setStats((prev) => ({
        ...prev,
        pendingTests: pending,
        processingTests: processing,
        completedToday,
        awaitingCollection: 0,
        samplesPending: pending + processing,
      }))

      // Load equipment from professional's JSONB field
      const savedEquipment = (professional?.lab_equipment as LabEquipment[]) || []
      setEquipment(savedEquipment)
    } catch (error) {
      console.error('[LaboratoryProDashboard] load error:', error)
      setTestRequests([])
    }
  }
  
  // Equipment CRUD functions
  const saveEquipment = async (equipmentList: LabEquipment[]) => {
    if (!professional?.id) return false
    try {
      const res = await fetch(`/api/professionals/${professional.id}/equipment`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ lab_equipment: equipmentList })
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to save equipment')
      }
      setEquipment(equipmentList)
      if (onProfessionalUpdate) onProfessionalUpdate()
      return true
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' })
      return false
    }
  }

  const handleAddEquipment = async () => {
    if (!equipmentForm.name?.trim()) {
      toast({ title: 'Error', description: 'Equipment name is required', variant: 'destructive' })
      return
    }
    const newEquipment: LabEquipment = {
      id: editingEquipment?.id || `eq-${Date.now()}`,
      name: equipmentForm.name?.trim() || '',
      model: equipmentForm.model?.trim() || '',
      manufacturer: equipmentForm.manufacturer?.trim() || '',
      serial_number: equipmentForm.serial_number?.trim() || '',
      category: equipmentForm.category || 'other',
      status: equipmentForm.status || 'operational',
      location: equipmentForm.location?.trim() || '',
      purchase_date: equipmentForm.purchase_date || undefined,
      warranty_expiry: equipmentForm.warranty_expiry || undefined,
      last_maintenance: equipmentForm.last_maintenance || undefined,
      next_maintenance: equipmentForm.next_maintenance || undefined,
      notes: equipmentForm.notes?.trim() || undefined,
    }
    
    let updatedList: LabEquipment[]
    if (editingEquipment) {
      updatedList = equipment.map(e => e.id === editingEquipment.id ? newEquipment : e)
    } else {
      updatedList = [...equipment, newEquipment]
    }
    
    const success = await saveEquipment(updatedList)
    if (success) {
      toast({ title: editingEquipment ? 'Equipment updated' : 'Equipment added' })
      setShowEquipmentDialog(false)
      setEditingEquipment(null)
      setEquipmentForm({ category: 'analyzer', status: 'operational' })
    }
  }

  const handleDeleteEquipment = async (id: string) => {
    const updatedList = equipment.filter(e => e.id !== id)
    const success = await saveEquipment(updatedList)
    if (success) {
      toast({ title: 'Equipment removed' })
    }
  }

  useAutoRefresh(loadDashboardData, 60_000, { enabled: !!professional })

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true)
    try {
      onProfessionalUpdate?.()
      await loadDashboardData()
    } finally {
      setIsRefreshing(false)
    }
  }, [professional?.id, onProfessionalUpdate])

  const getLabRequestForPdf = useCallback((req: any) => {
    const isCompleted = ['fulfilled', 'completed', 'results_ready'].includes(req?.status || '')
    return isCompleted ? req : { ...req, lab_fulfillment: localFulfillment }
  }, [localFulfillment])

  const fetchLabReportTemplate = useCallback(async () => {
    if (!professional?.id) return null
    const res = await fetch(`/api/professionals/${professional.id}/branding`, { credentials: 'include' })
    const json = await res.json()
    return res.ok && json.labReportTemplate ? json.labReportTemplate : null
  }, [professional?.id])

  const handleViewPdf = useCallback(async (req: any) => {
    if (!req?.id) return
    setPdfLoading(true)
    try {
      const { generateLabRequestPdf } = await import('@/lib/print-prescription-lab')
      const labRequest = getLabRequestForPdf(req)
      const labReportTemplate = await fetchLabReportTemplate()
      const options = labReportTemplate
        ? { labReportTemplate, reportId: labRequest.id, baseUrl: typeof window !== 'undefined' ? window.location.origin : '' }
        : undefined
      const result = await generateLabRequestPdf(labRequest, null, options)
      if (result) {
        setPdfViewerState({ url: result.url, filename: result.filename, revoke: result.revoke })
      } else {
        toast({ title: 'Error', description: 'Failed to generate PDF', variant: 'destructive' })
      }
    } catch (e) {
      console.error('[Lab PDF]', e)
      toast({ title: 'Error', description: 'Failed to generate PDF', variant: 'destructive' })
    } finally {
      setPdfLoading(false)
    }
  }, [getLabRequestForPdf, fetchLabReportTemplate])

  const handleDownloadPdf = useCallback(async (req: any) => {
    if (!req?.id) return
    setPdfLoading(true)
    try {
      const { generateLabRequestPdf } = await import('@/lib/print-prescription-lab')
      const labRequest = getLabRequestForPdf(req)
      const labReportTemplate = await fetchLabReportTemplate()
      const options = labReportTemplate
        ? { labReportTemplate, reportId: labRequest.id, baseUrl: typeof window !== 'undefined' ? window.location.origin : '' }
        : undefined
      const result = await generateLabRequestPdf(labRequest, null, options)
      if (result) {
        const a = document.createElement('a')
        a.href = result.url
        a.download = result.filename
        a.click()
        result.revoke()
        toast({ title: 'Downloaded', description: result.filename })
      } else {
        toast({ title: 'Error', description: 'Failed to generate PDF', variant: 'destructive' })
      }
    } catch (e) {
      console.error('[Lab PDF]', e)
      toast({ title: 'Error', description: 'Failed to download PDF', variant: 'destructive' })
    } finally {
      setPdfLoading(false)
    }
  }, [getLabRequestForPdf, fetchLabReportTemplate])

  // Count equipment needing attention (maintenance due or needs repair)
  const equipmentNeedsAttention = equipment.filter(e => 
    e.status === 'repair' || 
    (e.next_maintenance && new Date(e.next_maintenance) < new Date())
  ).length

  // Derive patients from lab requests (group by patient_id)
  const labPatients = useMemo(() => {
    const byPatient = new Map<string, { patient_id: string; patient: any; requests: any[] }>()
    for (const req of testRequests) {
      const pid = req.patient_id || req.patient?.id || 'unknown'
      if (!byPatient.has(pid)) {
        byPatient.set(pid, {
          patient_id: pid,
          patient: req.patient || { full_name: 'Unknown', phone: '', date_of_birth: null },
          requests: [],
        })
      }
      byPatient.get(pid)!.requests.push(req)
    }
    return Array.from(byPatient.values()).map(p => ({
      ...p,
      request_count: p.requests.length,
      last_request: p.requests.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())[0],
    }))
  }, [testRequests])

  const filteredLabPatients = useMemo(() => {
    if (!patientsSearch.trim()) return labPatients
    const q = patientsSearch.toLowerCase().trim()
    return labPatients.filter(p => {
      const name = (p.patient?.full_name || '').toLowerCase()
      const phone = (p.patient?.phone || '').toLowerCase()
      const doctor = p.requests.some((r: any) => (r.doctor?.business_name || '').toLowerCase().includes(q))
      return name.includes(q) || phone.includes(q) || doctor
    })
  }, [labPatients, patientsSearch])

  const allSidebarItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard, badge: null },
    { id: 'schedule', label: 'Schedule', icon: Calendar, badge: null },
    { id: 'requests', label: 'Test Requests', icon: ClipboardCheck, badge: stats.pendingTests },
    { id: 'patients', label: 'Patients', icon: Users, badge: null },
    { id: 'samples', label: 'Samples', icon: Beaker, badge: stats.samplesPending },
    { id: 'results', label: 'Results', icon: FileSpreadsheet, badge: null },
    { id: 'equipment', label: 'Equipment', icon: Microscope, badge: equipmentNeedsAttention || null },
    { id: 'pos', label: 'Point of Sale', icon: Receipt, badge: null },
    { id: 'analytics', label: 'Analytics', icon: BarChart2, badge: null },
    { id: 'finances', label: 'Finances', icon: Banknote, badge: null },
    { id: 'messages', label: 'Messages', icon: MessageSquare, badge: unreadMessages > 0 ? unreadMessages : null },
    { id: 'settings', label: 'Settings', icon: Cog, badge: null },
  ]
  const sidebarItems = dashPerms
    ? allSidebarItems.filter(item => canAccessLabSection(dashPerms, item.id))
    : allSidebarItems

  const quickActions = [
    { label: 'Register Sample', icon: Beaker, color: 'bg-violet-500', action: () => {} },
    { label: 'Upload Results', icon: Upload, color: 'bg-emerald-500', action: () => {} },
    { label: 'New Test', icon: FlaskConical, color: 'bg-cyan-500', action: () => {} },
    { label: 'Send Report', icon: Send, color: 'bg-amber-500', action: () => {} },
  ]

  const testIcons: Record<string, any> = {
    blood: Droplet,
    cardio: Heart,
    neuro: Brain,
    vision: Eye,
    bone: Bone,
    genetic: Dna,
  }

  const statusLabel = (s: string | undefined) => {
    if (!s) return 'pending'
    if (s === 'sent_to_lab' || s === 'sent') return 'received'
    if (s === 'fulfilled') return 'results sent'
    return s.replace(/_/g, ' ')
  }
  
  // Open deny dialog
  const openDenyDialog = (requestId: string) => {
    setRequestToDeny(requestId)
    setDenyReason('')
    setDenyDialogOpen(true)
  }
  
  // Confirm deny
  const confirmDeny = async () => {
    if (!requestToDeny) return
    setDenyDialogOpen(false)
    setActionLoading('deny')
    try {
      const res = await fetch('/api/lab-requests', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          requestId: requestToDeny, 
          action: 'deny',
          deny_reason: denyReason || undefined,
        }),
        credentials: 'include',
      })
      if (!res.ok) throw new Error((await res.json()).error || 'Failed')
      await loadDashboardData()
      setSelectedRequest(null)
      toast({ title: 'Request denied', description: 'Doctor and patient have been notified.' })
    } catch (e) {
      console.error('Deny failed:', e)
      toast({ title: 'Error', description: 'Failed to deny request', variant: 'destructive' })
    } finally {
      setActionLoading(null)
      setRequestToDeny(null)
      setDenyReason('')
    }
  }

  // Point of Sale - cash-focused POS for all professionals
  if (activeSection === 'pos') {
    const appointmentIdFromUrl = searchParams.get('appointment')
    return (
      <div className="w-full min-w-0 py-4 sm:py-6 px-0">
        <ProfessionalPOSUnified
          professionalName={professional?.business_name}
          employeeUsername={employeeUsername}
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
          userType={professional?.type || 'laboratory'}
        />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full min-h-0 bg-slate-50 dark:bg-slate-950">
      {/* Main Content - sidebar is provided by layout (ProDashboardSidebar) */}
      <main className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* Top Bar */}
        <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 flex items-center justify-between flex-shrink-0">
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">
              {sidebarItems.find(i => i.id === activeSection)?.label || 'Dashboard'}
            </h1>
            <p className="text-xs text-muted-foreground">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Employee login indicator in header */}
            {employeeUsername && (
              <Badge variant="outline" className="bg-violet-50 dark:bg-violet-950/30 text-violet-600 dark:text-violet-400 border-violet-200 dark:border-violet-800">
                <UserCircle className="h-3.5 w-3.5 mr-1.5" />
                @{employeeUsername}
              </Badge>
            )}

            <div className="relative hidden md:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search tests, patients..."
                className="pl-10 w-72 bg-slate-50 dark:bg-slate-800"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-[180px] min-h-10 bg-slate-50 dark:bg-slate-800">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="24h">Last 24h</SelectItem>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" size="icon" onClick={handleRefresh} className="bg-transparent" disabled={isRefreshing} aria-label="Refresh">
              <RefreshCw className={cn('h-4 w-4', isRefreshing && 'animate-spin')} />
            </Button>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {activeSection === 'overview' && (
            <div className="space-y-6">
              {/* Quick Actions */}
              <div className="flex items-center gap-3 overflow-x-auto pb-2">
                {quickActions.map((action, i) => (
                  <Button 
                    key={i}
                    variant="outline" 
                    className="flex-shrink-0 gap-2 bg-white dark:bg-slate-900 hover:shadow-md transition-shadow"
                  >
                    <div className={cn("h-6 w-6 rounded-lg flex items-center justify-center", action.color)}>
                      <action.icon className="h-3.5 w-3.5 text-white" />
                    </div>
                    {action.label}
                  </Button>
                ))}
              </div>

              {/* Stats */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card 
                  className="bg-gradient-to-br from-violet-500 to-violet-600 text-white border-0 shadow-lg shadow-violet-500/20 cursor-pointer hover:scale-[1.02] transition-transform"
                  onClick={() => setActiveSection('requests')}
                >
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-violet-100 text-sm font-medium">Pending Tests</p>
                        <p className="text-4xl font-bold mt-2">{stats.pendingTests}</p>
                        <div className="flex items-center gap-1 mt-2 text-violet-100 text-sm">
                          <Clock className="h-4 w-4" />
                          <span>Awaiting processing</span>
                        </div>
                      </div>
                      <div className="h-12 w-12 bg-white/20 rounded-2xl flex items-center justify-center">
                        <FlaskConical className="h-6 w-6" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card 
                  className="bg-gradient-to-br from-cyan-500 to-cyan-600 text-white border-0 shadow-lg shadow-cyan-500/20 cursor-pointer hover:scale-[1.02] transition-transform"
                  onClick={() => setActiveSection('samples')}
                >
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-cyan-100 text-sm font-medium">In Progress</p>
                        <p className="text-4xl font-bold mt-2">{stats.processingTests}</p>
                        <div className="flex items-center gap-1 mt-2 text-cyan-100 text-sm">
                          <Activity className="h-4 w-4" />
                          <span>Being processed</span>
                        </div>
                      </div>
                      <div className="h-12 w-12 bg-white/20 rounded-2xl flex items-center justify-center">
                        <Microscope className="h-6 w-6" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card 
                  className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white border-0 shadow-lg shadow-emerald-500/20 cursor-pointer hover:scale-[1.02] transition-transform"
                  onClick={() => setActiveSection('results')}
                >
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-emerald-100 text-sm font-medium">Completed Today</p>
                        <p className="text-4xl font-bold mt-2">{stats.completedToday}</p>
                        <div className="flex items-center gap-1 mt-2 text-emerald-100 text-sm">
                          <CheckCircle className="h-4 w-4" />
                          <span>Tests completed</span>
                        </div>
                      </div>
                      <div className="h-12 w-12 bg-white/20 rounded-2xl flex items-center justify-center">
                        <ClipboardCheck className="h-6 w-6" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card 
                  className="bg-gradient-to-br from-amber-500 to-orange-500 text-white border-0 shadow-lg shadow-amber-500/20 cursor-pointer hover:scale-[1.02] transition-transform"
                  onClick={() => setActiveSection('finances')}
                >
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-amber-100 text-sm font-medium">Monthly Revenue</p>
                        <p className="text-4xl font-bold mt-2">{(stats.monthlyRevenue / 1000).toFixed(0)}K</p>
                        <div className="flex items-center gap-1 mt-2 text-amber-100 text-sm">
                          <ArrowUpRight className="h-4 w-4" />
                          <span>+{stats.revenueGrowth}% growth</span>
                        </div>
                      </div>
                      <div className="h-12 w-12 bg-white/20 rounded-2xl flex items-center justify-center">
                        <DollarSign className="h-6 w-6" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2 shadow-sm">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <div>
                      <CardTitle className="text-lg font-semibold">Test Volume</CardTitle>
                      <CardDescription>Monthly tests and revenue</CardDescription>
                    </div>
                    <Button variant="outline" size="sm" className="bg-transparent">
                      <Download className="h-4 w-4 mr-2" />
                      Export
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <div className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={emptyVolumeData}>
                          <defs>
                            <linearGradient id="colorTests" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="#7c3aed" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                          <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                          <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                          <Tooltip 
                            contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', color: '#fff' }}
                          />
                          <Area type="monotone" dataKey="tests" stroke="#7c3aed" strokeWidth={3} fill="url(#colorTests)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                <Card className="shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg font-semibold">Test Categories</CardTitle>
                    <CardDescription>Distribution by type</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-44">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={emptyTestCategories}
                            cx="50%"
                            cy="50%"
                            innerRadius={45}
                            outerRadius={70}
                            dataKey="value"
                            paddingAngle={5}
                          >
                            {emptyTestCategories.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="space-y-2 mt-2">
                      {emptyTestCategories.map((cat) => (
                        <div key={cat.name} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                            <span className="text-sm font-medium">{cat.name}</span>
                          </div>
                          <span className="text-sm text-muted-foreground">{cat.value}%</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Bottom Row */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Pending Requests */}
                <Card className="lg:col-span-2 shadow-sm">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <div>
                      <CardTitle className="text-lg font-semibold">Pending Test Requests</CardTitle>
                      <CardDescription>{stats.pendingTests} tests awaiting processing</CardDescription>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-violet-600 hover:text-violet-700"
                      onClick={() => setActiveSection('requests')}
                    >
                      View All
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {testRequests.length > 0 ? testRequests.slice(0, 5).map((req, i) => (
                        <button
                          key={req.id || i}
                          type="button"
                          onClick={() => {
                            setActiveSection('requests')
                            setSelectedRequest(req)
                          }}
                          className="w-full flex items-center gap-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left cursor-pointer border border-transparent hover:border-violet-200 dark:hover:border-violet-800 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2"
                        >
                          <div className="h-10 w-10 bg-violet-100 rounded-xl flex items-center justify-center flex-shrink-0">
                            <FlaskConical className="h-5 w-5 text-violet-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">
                              {req.patient?.full_name || 'Patient'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Dr. {req.doctor?.business_name || 'Unknown'} • {(req.items || []).length} tests
                            </p>
                          </div>
                          <Badge className={cn(
                            "text-xs flex-shrink-0",
                            (req.status === 'pending' || req.status === 'sent_to_lab' || req.status === 'sent') && 'bg-amber-100 text-amber-700',
                            req.status === 'processing' && 'bg-cyan-100 text-cyan-700',
                            req.status === 'completed' && 'bg-green-100 text-green-700',
                          )}>
                            {statusLabel(req.status)}
                          </Badge>
                          <Badge variant="outline" className={cn(
                            "flex-shrink-0",
                            req.priority === 'urgent' && 'border-red-500 text-red-600'
                          )}>
                            {req.priority || 'normal'}
                          </Badge>
                          <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        </button>
                      )) : (
                        <div className="text-center py-8 text-muted-foreground">
                          <FlaskConical className="h-12 w-12 mx-auto mb-3 opacity-50" />
                          <p>No pending test requests</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Performance & Popular Tests */}
                <div className="space-y-6">
                  <Card className="shadow-sm">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg font-semibold">Performance</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <div className="flex justify-between text-sm mb-2">
                          <span className="text-muted-foreground">Accuracy Rate</span>
                          <span className="font-semibold">{stats.accuracy}%</span>
                        </div>
                        <Progress value={stats.accuracy} className="h-2" />
                      </div>
                      <div>
                        <div className="flex justify-between text-sm mb-2">
                          <span className="text-muted-foreground">Avg Turnaround</span>
                          <span className="font-semibold">{stats.avgTurnaround}h</span>
                        </div>
                        <Progress value={100 - stats.avgTurnaround * 10} className="h-2" />
                      </div>
                      <div>
                        <div className="flex justify-between text-sm mb-2">
                          <span className="text-muted-foreground">Customer Rating</span>
                          <span className="font-semibold">{stats.rating}/5</span>
                        </div>
                        <div className="flex gap-1">
                          {[1,2,3,4,5].map(i => (
                            <Star key={i} className={cn("h-4 w-4", i <= Math.floor(stats.rating) ? "fill-amber-500 text-amber-500" : "text-slate-200")} />
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="shadow-sm">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg font-semibold">Popular Tests</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {testRequests.length > 0
                        ? testRequests.slice(0, 4).map((req: any, i) => (
                          <div key={req.id || i} className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium">Dr. {req.doctor?.business_name || 'Doctor'}</p>
                              <p className="text-xs text-muted-foreground">{(req.items || []).length} test(s)</p>
                            </div>
                            <Badge variant="outline">{statusLabel(req.status)}</Badge>
                          </div>
                        ))
                        : <p className="text-sm text-muted-foreground">No requests yet</p>}
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          )}

          {/* Patients Section - derived from lab requests */}
          {activeSection === 'patients' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <p className="text-muted-foreground text-sm">
                  Patients who have had lab tests at your laboratory. Expand to view requests, attach documents, and manage records.
                </p>
                <Input
                  placeholder="Search by name, phone, doctor..."
                  className="max-w-xs"
                  value={patientsSearch}
                  onChange={(e) => setPatientsSearch(e.target.value)}
                />
              </div>
              <Card className="shadow-sm">
                <CardContent className="p-0">
                  {filteredLabPatients.length === 0 ? (
                    <div className="p-12 text-center">
                      <Users className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                      <p className="font-medium">No patients yet</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Patients will appear here once they have lab requests assigned to your laboratory.
                      </p>
                      <Button className="mt-4" variant="outline" onClick={() => setActiveSection('requests')}>
                        View Test Requests
                      </Button>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-slate-50 dark:bg-slate-800/50 border-b">
                          <tr>
                            <th className="text-left p-4 text-sm font-medium text-muted-foreground">Patient</th>
                            <th className="text-left p-4 text-sm font-medium text-muted-foreground">Contact</th>
                            <th className="text-left p-4 text-sm font-medium text-muted-foreground">Last request</th>
                            <th className="text-left p-4 text-sm font-medium text-muted-foreground">Requests</th>
                            <th className="text-left p-4 text-sm font-medium text-muted-foreground">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {filteredLabPatients.map((p) => (
                            <Fragment key={p.patient_id}>
                              <tr
                                onClick={() => {
                                  const next = expandedPatientId === p.patient_id ? null : p.patient_id
                                  setExpandedPatientId(next)
                                  if (next) setExpandedPatientTab('requests')
                                }}
                                className="hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors"
                                role="button"
                                tabIndex={0}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    const next = expandedPatientId === p.patient_id ? null : p.patient_id
                                    setExpandedPatientId(next)
                                    if (next) setExpandedPatientTab('requests')
                                  }
                                }}
                              >
                                <td className="p-4">
                                  <div className="flex items-center gap-3">
                                    <div className="flex-shrink-0 w-6 flex justify-center">
                                      {expandedPatientId === p.patient_id ? (
                                        <ChevronRight className="h-4 w-4 text-muted-foreground rotate-90" />
                                      ) : (
                                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                      )}
                                    </div>
                                    <Avatar className="h-10 w-10">
                                      <AvatarFallback className="bg-violet-100 text-violet-700 dark:bg-violet-900/50 dark:text-violet-300">
                                        {(p.patient?.full_name || 'P').charAt(0)}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div>
                                      <p className="font-medium">{p.patient?.full_name || 'Patient'}</p>
                                      {p.patient?.date_of_birth && (
                                        <p className="text-xs text-muted-foreground">
                                          DOB: {new Date(p.patient.date_of_birth).toLocaleDateString()}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                </td>
                                <td className="p-4">
                                  <div className="text-sm">
                                    {p.patient?.phone && <p>{p.patient.phone}</p>}
                                    {!p.patient?.phone && <span className="text-muted-foreground">—</span>}
                                  </div>
                                </td>
                                <td className="p-4">
                                  <div className="text-sm">
                                    {p.last_request ? (
                                      <>
                                        <p className="font-medium md:hidden">
                                          {new Date(p.last_request.created_at).toLocaleDateString()} {new Date(p.last_request.created_at).toTimeString().slice(0, 5)}
                                        </p>
                                        <div className="hidden md:block">
                                          <p className="font-medium">{p.last_request.request_number || '—'}</p>
                                          <p className="text-muted-foreground">
                                            {new Date(p.last_request.created_at).toLocaleDateString()} • Dr. {p.last_request.doctor?.business_name || '—'}
                                          </p>
                                          <Badge variant="outline" className="mt-1 text-xs">
                                            {statusLabel(p.last_request.status)}
                                          </Badge>
                                        </div>
                                      </>
                                    ) : (
                                      <span className="text-muted-foreground">—</span>
                                    )}
                                  </div>
                                </td>
                                <td className="p-4">
                                  <Badge variant="outline">{p.request_count}</Badge>
                                </td>
                                <td className="p-4">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      setActiveSection('requests')
                                      setSelectedRequest(p.last_request)
                                    }}
                                  >
                                    Open in Requests
                                  </Button>
                                </td>
                              </tr>
                              {expandedPatientId === p.patient_id && (
                                <tr key={`${p.patient_id}-expanded`} className="bg-slate-50/50 dark:bg-slate-800/30">
                                  <td colSpan={5} className="p-4 ps-14">
                                    <div className="text-sm space-y-4">
                                      <div className="flex gap-1 border-b pb-3">
                                        <Button
                                          variant={expandedPatientTab === 'requests' ? 'secondary' : 'ghost'}
                                          size="sm"
                                          onClick={() => setExpandedPatientTab('requests')}
                                        >
                                          <ClipboardCheck className="h-4 w-4 me-1" />
                                          Requests
                                        </Button>
                                        <Button
                                          variant={expandedPatientTab === 'documents' ? 'secondary' : 'ghost'}
                                          size="sm"
                                          onClick={() => setExpandedPatientTab('documents')}
                                        >
                                          <FileText className="h-4 w-4 me-1" />
                                          Documents
                                        </Button>
                                      </div>
                                      {expandedPatientTab === 'requests' && (
                                        <ul className="space-y-3">
                                          {p.requests.map((req: any) => (
                                            <li
                                              key={req.id}
                                              className="flex items-center justify-between flex-wrap gap-2 p-4 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
                                            >
                                              <div className="flex items-center gap-3">
                                                <span className="font-medium">{req.request_number || req.id}</span>
                                                <Badge variant={req.status === 'fulfilled' || req.status === 'completed' ? 'default' : 'secondary'} className="capitalize">
                                                  {statusLabel(req.status)}
                                                </Badge>
                                                <span className="text-muted-foreground">
                                                  Dr. {req.doctor?.business_name || '—'} • {(req.items || []).length} test(s)
                                                </span>
                                              </div>
                                              <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => {
                                                  setActiveSection('requests')
                                                  setSelectedRequest(req)
                                                }}
                                              >
                                                Manage
                                              </Button>
                                            </li>
                                          ))}
                                        </ul>
                                      )}
                                      {expandedPatientTab === 'documents' && (
                                        <div className="space-y-4">
                                          <div>
                                            <p className="font-medium mb-2">Patient records</p>
                                            <PatientDocumentsView patientId={p.patient_id} canAttach />
                                          </div>
                                          <div>
                                            <p className="font-medium mb-2">Lab request documents</p>
                                            <div className="space-y-3">
                                              {p.requests.map((req: any) => (
                                                <div key={req.id} className="p-4 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                                                  <div className="flex items-center justify-between mb-2">
                                                    <span className="text-sm font-medium">{req.request_number || req.id}</span>
                                                    <Button
                                                      variant="ghost"
                                                      size="sm"
                                                      onClick={() => {
                                                        setActiveSection('requests')
                                                        setSelectedRequest(req)
                                                      }}
                                                    >
                                                      Manage
                                                    </Button>
                                                  </div>
                                                  <LabRequestDocumentsAttach
                                                    labRequestId={req.id}
                                                    viewerType="laboratory"
                                                  />
                                                </div>
                                              ))}
                                            </div>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </Fragment>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Documents Section */}
          {activeSection === 'documents' && (
            <ProDocumentsSection professionalId={professional?.id} />
          )}

          {/* Suppliers Section */}
          {activeSection === 'suppliers' && (
            <SuppliersSection
              professionalId={professional?.id}
              professionalType={professional?.type}
            />
          )}

          {/* Settings Section */}
          {activeSection === 'settings' && (
            <div className="max-w-3xl space-y-6">
              <Card className="shadow-sm">
                <CardHeader>
                  <CardTitle>Laboratory Settings</CardTitle>
                  <CardDescription>Manage your laboratory preferences</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-base font-medium">Operating Status</Label>
                      <p className="text-sm text-muted-foreground">Show laboratory as open for samples</p>
                    </div>
                    <Switch checked={isOperating} onCheckedChange={setIsOperating} />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-base font-medium">Accept New Samples</Label>
                      <p className="text-sm text-muted-foreground">Allow new sample registrations</p>
                    </div>
                    <Switch checked={acceptingSamples} onCheckedChange={setAcceptingSamples} />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-base font-medium">Home Collection</Label>
                      <p className="text-sm text-muted-foreground">Enable home sample collection service</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-base font-medium">Doctor Messages</Label>
                      <p className="text-sm text-muted-foreground">Receive messages from referring doctors</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-sm">
                <CardHeader>
                  <CardTitle>Notifications</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Bell className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <Label>New Test Request Alerts</Label>
                        <p className="text-sm text-muted-foreground">Get notified for new requests</p>
                      </div>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Timer className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <Label>Turnaround Alerts</Label>
                        <p className="text-sm text-muted-foreground">Alert when tests exceed turnaround time</p>
                      </div>
                    </div>
                    <Switch defaultChecked />
                  </div>
                </CardContent>
              </Card>

              <LabStaffManagement professional={professional} onUpdate={onProfessionalUpdate} />

              <LabReportTemplateForm professional={professional} onUpdate={onProfessionalUpdate} showSaveButton />

              {/* Employee Management */}
              <EmployeeManagement professional={professional} />

              {/* Roles & Permissions */}
              <RoleEditor professional={professional} />
            </div>
          )}

          {/* Schedule Section - Availability Calendar */}
          {activeSection === 'schedule' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <p className="text-muted-foreground">Manage your lab operating hours, holidays, and appointment calendar</p>
                <Button variant="outline" onClick={() => router.push('/professional/dashboard/settings?tab=practice')}>
                  <Cog className="h-4 w-4 mr-2" />
                  Manage Schedule
                </Button>
              </div>
              <AvailabilityCalendar 
                professional={professional} 
                onDateSelect={(date) => setActiveSection('requests')}
              />
            </div>
          )}

          {/* Test Requests section with sorting, filtering, and grouping */}
          {activeSection === 'requests' && (() => {
            // Filter requests
            const filteredRequests = testRequests.filter((req: any) => {
              // Search filter
              if (requestsSearch) {
                const search = requestsSearch.toLowerCase()
                const matches = 
                  (req.request_number || '').toLowerCase().includes(search) ||
                  (req.patient?.full_name || '').toLowerCase().includes(search) ||
                  (req.doctor?.business_name || '').toLowerCase().includes(search) ||
                  (req.diagnosis || '').toLowerCase().includes(search) ||
                  (req.items || []).some((item: any) => (item.test_name || item.name || '').toLowerCase().includes(search))
                if (!matches) return false
              }
              
              // Status filter
              if (requestsStatusFilter !== 'all') {
                if (requestsStatusFilter === 'pending' && !['pending', 'sent_to_lab', 'sent'].includes(req.status)) return false
                if (requestsStatusFilter === 'processing' && !['sample_collected', 'processing'].includes(req.status)) return false
                if (requestsStatusFilter === 'completed' && !['fulfilled', 'completed', 'results_ready'].includes(req.status)) return false
              }
              
              return true
            })

            // Sort requests
            const sortedRequests = [...filteredRequests].sort((a, b) => {
              switch (requestsSortBy) {
                case 'newest':
                  return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                case 'oldest':
                  return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
                case 'patient':
                  return (a.patient?.full_name || '').localeCompare(b.patient?.full_name || '')
                case 'doctor':
                  return (a.doctor?.business_name || '').localeCompare(b.doctor?.business_name || '')
                case 'status':
                  const statusOrder = ['pending', 'sent_to_lab', 'sent', 'sample_collected', 'processing', 'results_ready', 'fulfilled', 'completed', 'denied']
                  return statusOrder.indexOf(a.status) - statusOrder.indexOf(b.status)
                default:
                  return 0
              }
            })

            // Group requests
            const groupedRequests: Record<string, any[]> = {}
            if (requestsGroupBy === 'none') {
              groupedRequests['All Requests'] = sortedRequests
            } else {
              sortedRequests.forEach((req: any) => {
                let key = ''
                switch (requestsGroupBy) {
                  case 'date':
                    key = new Date(req.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
                    break
                  case 'status':
                    key = statusLabel(req.status)
                    break
                  case 'doctor':
                    key = req.doctor?.business_name || 'Unknown Doctor'
                    break
                  case 'patient':
                    key = req.patient?.full_name || 'Unknown Patient'
                    break
                }
                if (!groupedRequests[key]) groupedRequests[key] = []
                groupedRequests[key].push(req)
              })
            }

            // Stats
            const pendingCount = testRequests.filter((r: any) => ['pending', 'sent_to_lab', 'sent'].includes(r.status)).length
            const processingCount = testRequests.filter((r: any) => ['sample_collected', 'processing'].includes(r.status)).length
            const completedCount = testRequests.filter((r: any) => ['fulfilled', 'completed', 'results_ready'].includes(r.status)).length

            return (
              <div className="space-y-6">
                {/* Stats Row */}
                <div className="grid grid-cols-4 gap-4">
                  <button
                    type="button"
                    onClick={() => setRequestsStatusFilter('all')}
                    className={cn(
                      "p-4 rounded-lg border text-left transition-all",
                      requestsStatusFilter === 'all' ? 'border-violet-500 bg-violet-50 dark:bg-violet-950/20' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                    )}
                  >
                    <p className="text-sm text-muted-foreground">Total</p>
                    <p className="text-2xl font-bold">{testRequests.length}</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRequestsStatusFilter('pending')}
                    className={cn(
                      "p-4 rounded-lg border text-left transition-all",
                      requestsStatusFilter === 'pending' ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/20' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                    )}
                  >
                    <p className="text-sm text-amber-600">Pending</p>
                    <p className="text-2xl font-bold text-amber-600">{pendingCount}</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRequestsStatusFilter('processing')}
                    className={cn(
                      "p-4 rounded-lg border text-left transition-all",
                      requestsStatusFilter === 'processing' ? 'border-cyan-500 bg-cyan-50 dark:bg-cyan-950/20' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                    )}
                  >
                    <p className="text-sm text-cyan-600">Processing</p>
                    <p className="text-2xl font-bold text-cyan-600">{processingCount}</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRequestsStatusFilter('completed')}
                    className={cn(
                      "p-4 rounded-lg border text-left transition-all",
                      requestsStatusFilter === 'completed' ? 'border-green-500 bg-green-50 dark:bg-green-950/20' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                    )}
                  >
                    <p className="text-sm text-green-600">Completed</p>
                    <p className="text-2xl font-bold text-green-600">{completedCount}</p>
                  </button>
                </div>

                {/* Filters & Controls */}
                <Card className="shadow-sm">
                  <CardHeader className="pb-4">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div>
                        <CardTitle className="text-lg font-semibold">All Test Requests</CardTitle>
                        <CardDescription>
                          {filteredRequests.length} of {testRequests.length} request(s)
                        </CardDescription>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            placeholder="Search requests..."
                            value={requestsSearch}
                            onChange={(e) => setRequestsSearch(e.target.value)}
                            className="pl-9 w-[200px]"
                          />
                        </div>
                        <Select value={requestsGroupBy} onValueChange={(v) => setRequestsGroupBy(v as any)}>
                          <SelectTrigger className="w-[140px]">
                            <SelectValue placeholder="Group by" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">No Grouping</SelectItem>
                            <SelectItem value="date">By Date</SelectItem>
                            <SelectItem value="status">By Status</SelectItem>
                            <SelectItem value="doctor">By Doctor</SelectItem>
                            <SelectItem value="patient">By Patient</SelectItem>
                          </SelectContent>
                        </Select>
                        <Select value={requestsSortBy} onValueChange={(v) => setRequestsSortBy(v as any)}>
                          <SelectTrigger className="w-[130px]">
                            <SelectValue placeholder="Sort by" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="newest">Newest First</SelectItem>
                            <SelectItem value="oldest">Oldest First</SelectItem>
                            <SelectItem value="patient">By Patient</SelectItem>
                            <SelectItem value="doctor">By Doctor</SelectItem>
                            <SelectItem value="status">By Status</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {Object.keys(groupedRequests).length === 0 || filteredRequests.length === 0 ? (
                      <div className="text-center py-12 text-muted-foreground">
                        <ClipboardCheck className="h-12 w-12 mx-auto mb-3 opacity-50" />
                        <p>{testRequests.length === 0 ? 'No test requests yet. Requests from doctors will appear here.' : 'No requests match your filters.'}</p>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {Object.entries(groupedRequests).map(([groupKey, items]) => (
                          <div key={groupKey}>
                            {requestsGroupBy !== 'none' && (
                              <div className="flex items-center gap-2 mb-3">
                                {requestsGroupBy === 'date' && <Calendar className="h-4 w-4 text-violet-600" />}
                                {requestsGroupBy === 'status' && <Activity className="h-4 w-4 text-violet-600" />}
                                {requestsGroupBy === 'doctor' && <UserCircle className="h-4 w-4 text-violet-600" />}
                                {requestsGroupBy === 'patient' && <Users className="h-4 w-4 text-violet-600" />}
                                <h4 className="font-semibold text-sm">{groupKey}</h4>
                                <Badge variant="secondary" className="text-xs">{items.length}</Badge>
                              </div>
                            )}
                            <div className={cn("space-y-3", requestsGroupBy !== 'none' && "ml-6")}>
                              {items.map((req: any) => (
                                <button
                                  key={req.id}
                                  type="button"
                                  onClick={() => setSelectedRequest(req)}
                                  className={cn(
                                    "w-full flex flex-wrap items-center gap-4 p-4 rounded-xl border transition-all text-left cursor-pointer",
                                    selectedRequest?.id === req.id 
                                      ? 'border-violet-500 bg-violet-50 dark:bg-violet-950/20' 
                                      : 'bg-slate-50/50 dark:bg-slate-800/30 hover:bg-slate-100 dark:hover:bg-slate-800/50 border-slate-200 dark:border-slate-700 hover:border-violet-300 dark:hover:border-violet-700'
                                  )}
                                >
                                  <div className={cn(
                                    "h-12 w-12 rounded-xl flex items-center justify-center flex-shrink-0",
                                    ['pending', 'sent_to_lab', 'sent'].includes(req.status) && 'bg-amber-100 dark:bg-amber-900/30',
                                    ['sample_collected', 'processing'].includes(req.status) && 'bg-cyan-100 dark:bg-cyan-900/30',
                                    ['fulfilled', 'completed', 'results_ready'].includes(req.status) && 'bg-green-100 dark:bg-green-900/30',
                                    req.status === 'denied' && 'bg-red-100 dark:bg-red-900/30'
                                  )}>
                                    <FlaskConical className={cn(
                                      "h-6 w-6",
                                      ['pending', 'sent_to_lab', 'sent'].includes(req.status) && 'text-amber-600',
                                      ['sample_collected', 'processing'].includes(req.status) && 'text-cyan-600',
                                      ['fulfilled', 'completed', 'results_ready'].includes(req.status) && 'text-green-600',
                                      req.status === 'denied' && 'text-red-600'
                                    )} />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      <p className="font-semibold text-sm">
                                        {req.request_number || req.id?.slice(0, 8)}
                                      </p>
                                      {req.priority === 'urgent' && (
                                        <Badge variant="destructive" className="text-xs">URGENT</Badge>
                                      )}
                                    </div>
                                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground mt-0.5">
                                      {requestsGroupBy !== 'doctor' && (
                                        <span className="flex items-center gap-1">
                                          <UserCircle className="h-3 w-3" />
                                          Dr. {req.doctor?.business_name ?? 'Doctor'}
                                        </span>
                                      )}
                                      {requestsGroupBy !== 'patient' && req.patient?.full_name && (
                                        <span className="flex items-center gap-1">
                                          <Users className="h-3 w-3" />
                                          {req.patient.full_name}
                                        </span>
                                      )}
                                      {requestsGroupBy !== 'date' && (
                                        <span className="flex items-center gap-1">
                                          <Calendar className="h-3 w-3" />
                                          {new Date(req.created_at).toLocaleDateString()}
                                        </span>
                                      )}
                                    </div>
                                    <div className="flex flex-wrap gap-1 mt-2">
                                      {(req.items || []).slice(0, 3).map((item: any, idx: number) => (
                                        <Badge key={idx} variant="outline" className="text-xs font-normal">
                                          {item.test_name || item.name || 'Test'}
                                        </Badge>
                                      ))}
                                      {(req.items || []).length > 3 && (
                                        <Badge variant="outline" className="text-xs font-normal">
                                          +{(req.items || []).length - 3} more
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                  {requestsGroupBy !== 'status' && (
                                    <Badge className={cn(
                                      "flex-shrink-0",
                                      ['pending', 'sent_to_lab', 'sent'].includes(req.status) && 'bg-amber-100 text-amber-700',
                                      ['sample_collected', 'processing'].includes(req.status) && 'bg-cyan-100 text-cyan-700',
                                      ['fulfilled', 'completed', 'results_ready'].includes(req.status) && 'bg-green-100 text-green-700',
                                      req.status === 'denied' && 'bg-red-100 text-red-700'
                                    )}>
                                      {statusLabel(req.status)}
                                    </Badge>
                                  )}
                                  <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                </button>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )
          })()}

          {/* Results section with grouping and sorting */}
          {activeSection === 'results' && (() => {
            // Filter to only completed/fulfilled results
            const completedResults = testRequests.filter((r: any) => 
              ['fulfilled', 'completed', 'results_ready'].includes(r.status)
            )
            
            // Apply search filter
            const filteredResults = completedResults.filter((r: any) => {
              if (!resultsSearch) return true
              const search = resultsSearch.toLowerCase()
              return (
                (r.request_number || '').toLowerCase().includes(search) ||
                (r.patient?.full_name || '').toLowerCase().includes(search) ||
                (r.doctor?.business_name || '').toLowerCase().includes(search) ||
                (r.items || []).some((item: any) => (item.test_name || '').toLowerCase().includes(search))
              )
            })

            // Sort results
            const sortedResults = [...filteredResults].sort((a, b) => {
              switch (resultsSortBy) {
                case 'newest':
                  return new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime()
                case 'oldest':
                  return new Date(a.updated_at || a.created_at).getTime() - new Date(b.updated_at || b.created_at).getTime()
                case 'patient':
                  return (a.patient?.full_name || '').localeCompare(b.patient?.full_name || '')
                case 'doctor':
                  return (a.doctor?.business_name || '').localeCompare(b.doctor?.business_name || '')
                default:
                  return 0
              }
            })

            // Group results
            const groupedResults: Record<string, any[]> = {}
            sortedResults.forEach((r: any) => {
              let key = ''
              switch (resultsGroupBy) {
                case 'date':
                  key = new Date(r.updated_at || r.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
                  break
                case 'patient':
                  key = r.patient?.full_name || 'Unknown Patient'
                  break
                case 'doctor':
                  key = r.doctor?.business_name || 'Unknown Doctor'
                  break
              }
              if (!groupedResults[key]) groupedResults[key] = []
              groupedResults[key].push(r)
            })

            return (
              <Card className="shadow-sm">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg font-semibold">Completed Results</CardTitle>
                      <CardDescription>{completedResults.length} completed test result(s)</CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Search results..."
                          value={resultsSearch}
                          onChange={(e) => setResultsSearch(e.target.value)}
                          className="pl-9 w-[200px]"
                        />
                      </div>
                      <Select value={resultsGroupBy} onValueChange={(v) => setResultsGroupBy(v as any)}>
                        <SelectTrigger className="w-[140px]">
                          <SelectValue placeholder="Group by" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="date">Group by Date</SelectItem>
                          <SelectItem value="patient">Group by Patient</SelectItem>
                          <SelectItem value="doctor">Group by Doctor</SelectItem>
                        </SelectContent>
                      </Select>
                      <Select value={resultsSortBy} onValueChange={(v) => setResultsSortBy(v as any)}>
                        <SelectTrigger className="w-[130px]">
                          <SelectValue placeholder="Sort by" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="newest">Newest First</SelectItem>
                          <SelectItem value="oldest">Oldest First</SelectItem>
                          <SelectItem value="patient">By Patient</SelectItem>
                          <SelectItem value="doctor">By Doctor</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {Object.keys(groupedResults).length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <FileSpreadsheet className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p>No completed results yet.</p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {Object.entries(groupedResults).map(([groupKey, items]) => (
                        <div key={groupKey}>
                          <div className="flex items-center gap-2 mb-3">
                            {resultsGroupBy === 'date' && <Calendar className="h-4 w-4 text-violet-600" />}
                            {resultsGroupBy === 'patient' && <Users className="h-4 w-4 text-violet-600" />}
                            {resultsGroupBy === 'doctor' && <UserCircle className="h-4 w-4 text-violet-600" />}
                            <h4 className="font-semibold text-sm">{groupKey}</h4>
                            <Badge variant="secondary" className="text-xs">{items.length}</Badge>
                          </div>
                          <div className="space-y-2 ml-6">
                            {items.map((req: any) => (
                              <div
                                key={req.id}
                                role="button"
                                tabIndex={0}
                                onClick={() => setSelectedRequest(req)}
                                onKeyDown={(e) => e.key === 'Enter' && setSelectedRequest(req)}
                                className={cn(
                                  "w-full text-left p-4 rounded-lg border transition-all hover:shadow-md hover:border-violet-300 cursor-pointer",
                                  selectedRequest?.id === req.id ? 'border-violet-500 bg-violet-50 dark:bg-violet-950/20' : 'bg-white dark:bg-slate-900'
                                )}
                              >
                                <div className="flex items-start justify-between">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="font-medium">{req.request_number || `LT-${req.id.slice(0,6)}`}</span>
                                      <Badge className="bg-green-100 text-green-700 text-xs">Completed</Badge>
                                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-7 text-xs text-teal-600 hover:text-teal-700 hover:bg-teal-50"
                                          onClick={() => handleViewPdf(req)}
                                          disabled={pdfLoading}
                                        >
                                          <FileText className="h-3.5 w-3.5 me-1" />
                                          View
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-7 text-xs text-teal-600 hover:text-teal-700 hover:bg-teal-50"
                                          onClick={() => handleDownloadPdf(req)}
                                          disabled={pdfLoading}
                                        >
                                          <Download className="h-3.5 w-3.5 me-1" />
                                          Download
                                        </Button>
                                      </div>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground mt-1">
                                      {resultsGroupBy !== 'patient' && req.patient?.full_name && (
                                        <span className="flex items-center gap-1">
                                          <Users className="h-3 w-3" />
                                          {req.patient.full_name}
                                        </span>
                                      )}
                                      {resultsGroupBy !== 'doctor' && req.doctor?.business_name && (
                                        <span className="flex items-center gap-1">
                                          <UserCircle className="h-3 w-3" />
                                          {req.doctor.business_name}
                                        </span>
                                      )}
                                      {resultsGroupBy !== 'date' && (
                                        <span className="flex items-center gap-1">
                                          <Calendar className="h-3 w-3" />
                                          {new Date(req.updated_at || req.created_at).toLocaleDateString()}
                                        </span>
                                      )}
                                      <span className="flex items-center gap-1">
                                        <FlaskConical className="h-3 w-3" />
                                        {(req.items || []).length} test(s)
                                      </span>
                                    </div>
                                    {/* Show test names */}
                                    <div className="flex flex-wrap gap-1 mt-2">
                                      {(req.items || []).slice(0, 4).map((item: any, idx: number) => (
                                        <Badge key={idx} variant="outline" className="text-xs font-normal">
                                          {item.test_name || item.name || 'Test'}
                                        </Badge>
                                      ))}
                                      {(req.items || []).length > 4 && (
                                        <Badge variant="outline" className="text-xs font-normal">
                                          +{(req.items || []).length - 4} more
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                  <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })()}

          {/* Equipment Management Section */}
          {activeSection === 'equipment' && (() => {
            const filteredEquipment = equipment.filter(eq => {
              const matchesSearch = !equipmentSearch || 
                eq.name.toLowerCase().includes(equipmentSearch.toLowerCase()) ||
                eq.model.toLowerCase().includes(equipmentSearch.toLowerCase()) ||
                eq.serial_number.toLowerCase().includes(equipmentSearch.toLowerCase())
              const matchesFilter = equipmentFilter === 'all' ||
                (equipmentFilter === 'operational' && eq.status === 'operational') ||
                (equipmentFilter === 'maintenance' && ['maintenance', 'calibration', 'repair'].includes(eq.status)) ||
                (equipmentFilter === 'offline' && eq.status === 'offline')
              return matchesSearch && matchesFilter
            })

            const statusColors: Record<string, string> = {
              operational: 'bg-green-100 text-green-700',
              maintenance: 'bg-amber-100 text-amber-700',
              repair: 'bg-red-100 text-red-700',
              calibration: 'bg-blue-100 text-blue-700',
              offline: 'bg-slate-100 text-slate-700',
            }

            const categoryIcons: Record<string, any> = {
              analyzer: Activity,
              centrifuge: RefreshCw,
              microscope: Microscope,
              incubator: Thermometer,
              refrigerator: Thermometer,
              other: Package,
            }

            return (
              <div className="space-y-6">
                {/* Header */}
                <Card className="shadow-sm">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg font-semibold">Equipment Inventory</CardTitle>
                        <CardDescription>{equipment.length} equipment item(s) registered</CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            placeholder="Search equipment..."
                            value={equipmentSearch}
                            onChange={(e) => setEquipmentSearch(e.target.value)}
                            className="pl-9 w-[200px]"
                          />
                        </div>
                        <Select value={equipmentFilter} onValueChange={(v) => setEquipmentFilter(v as any)}>
                          <SelectTrigger className="w-[150px]">
                            <SelectValue placeholder="Filter" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Status</SelectItem>
                            <SelectItem value="operational">Operational</SelectItem>
                            <SelectItem value="maintenance">Maintenance</SelectItem>
                            <SelectItem value="offline">Offline</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button 
                          className="bg-violet-600 hover:bg-violet-700"
                          onClick={() => {
                            setEditingEquipment(null)
                            setEquipmentForm({ category: 'analyzer', status: 'operational' })
                            setShowEquipmentDialog(true)
                          }}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add Equipment
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {/* Stats Row */}
                    <div className="grid grid-cols-4 gap-4 mb-6">
                      <div className="bg-green-50 dark:bg-green-950/20 rounded-lg p-4">
                        <div className="flex items-center gap-2 text-green-700">
                          <CheckCircle className="h-5 w-5" />
                          <span className="font-medium">Operational</span>
                        </div>
                        <p className="text-2xl font-bold text-green-700 mt-1">
                          {equipment.filter(e => e.status === 'operational').length}
                        </p>
                      </div>
                      <div className="bg-amber-50 dark:bg-amber-950/20 rounded-lg p-4">
                        <div className="flex items-center gap-2 text-amber-700">
                          <Clock className="h-5 w-5" />
                          <span className="font-medium">Maintenance</span>
                        </div>
                        <p className="text-2xl font-bold text-amber-700 mt-1">
                          {equipment.filter(e => ['maintenance', 'calibration'].includes(e.status)).length}
                        </p>
                      </div>
                      <div className="bg-red-50 dark:bg-red-950/20 rounded-lg p-4">
                        <div className="flex items-center gap-2 text-red-700">
                          <AlertCircle className="h-5 w-5" />
                          <span className="font-medium">Needs Repair</span>
                        </div>
                        <p className="text-2xl font-bold text-red-700 mt-1">
                          {equipment.filter(e => e.status === 'repair').length}
                        </p>
                      </div>
                      <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
                        <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                          <Microscope className="h-5 w-5" />
                          <span className="font-medium">Total</span>
                        </div>
                        <p className="text-2xl font-bold text-slate-700 dark:text-slate-300 mt-1">
                          {equipment.length}
                        </p>
                      </div>
                    </div>

                    {/* Equipment List */}
                    {filteredEquipment.length === 0 ? (
                      <div className="text-center py-12 text-muted-foreground">
                        <Microscope className="h-12 w-12 mx-auto mb-3 opacity-50" />
                        <p>{equipment.length === 0 ? 'No equipment registered yet.' : 'No equipment matches your search.'}</p>
                        {equipment.length === 0 && (
                          <Button 
                            className="mt-4 bg-violet-600 hover:bg-violet-700"
                            onClick={() => {
                              setEditingEquipment(null)
                              setEquipmentForm({ category: 'analyzer', status: 'operational' })
                              setShowEquipmentDialog(true)
                            }}
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Add Your First Equipment
                          </Button>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {filteredEquipment.map((eq) => {
                          const CategoryIcon = categoryIcons[eq.category] || Package
                          const needsMaintenance = eq.next_maintenance && new Date(eq.next_maintenance) < new Date()
                          return (
                            <div 
                              key={eq.id}
                              className={cn(
                                "border rounded-lg p-4 transition-all hover:shadow-md",
                                needsMaintenance && "border-amber-300 bg-amber-50/50"
                              )}
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex items-start gap-4">
                                  <div className={cn(
                                    "h-12 w-12 rounded-xl flex items-center justify-center",
                                    eq.status === 'operational' ? 'bg-violet-100' : 'bg-slate-100'
                                  )}>
                                    <CategoryIcon className={cn(
                                      "h-6 w-6",
                                      eq.status === 'operational' ? 'text-violet-600' : 'text-slate-500'
                                    )} />
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <h4 className="font-semibold">{eq.name}</h4>
                                      <Badge className={statusColors[eq.status] || statusColors.offline}>
                                        {eq.status.charAt(0).toUpperCase() + eq.status.slice(1)}
                                      </Badge>
                                      {needsMaintenance && (
                                        <Badge variant="outline" className="text-amber-600 border-amber-300">
                                          <AlertCircle className="h-3 w-3 mr-1" />
                                          Maintenance Due
                                        </Badge>
                                      )}
                                    </div>
                                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground mt-1">
                                      {eq.model && <span>{eq.model}</span>}
                                      {eq.manufacturer && <span>• {eq.manufacturer}</span>}
                                      {eq.serial_number && <span>• S/N: {eq.serial_number}</span>}
                                    </div>
                                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground mt-2">
                                      {eq.location && (
                                        <span className="flex items-center gap-1">
                                          <Package className="h-3 w-3" />
                                          {eq.location}
                                        </span>
                                      )}
                                      {eq.last_maintenance && (
                                        <span className="flex items-center gap-1">
                                          <Clock className="h-3 w-3" />
                                          Last: {new Date(eq.last_maintenance).toLocaleDateString()}
                                        </span>
                                      )}
                                      {eq.next_maintenance && (
                                        <span className={cn("flex items-center gap-1", needsMaintenance && "text-amber-600 font-medium")}>
                                          <Calendar className="h-3 w-3" />
                                          Next: {new Date(eq.next_maintenance).toLocaleDateString()}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => {
                                      setEditingEquipment(eq)
                                      setEquipmentForm(eq)
                                      setShowEquipmentDialog(true)
                                    }}
                                  >
                                    Edit
                                  </Button>
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                    onClick={() => {
                                      if (confirm('Remove this equipment?')) {
                                        handleDeleteEquipment(eq.id)
                                      }
                                    }}
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )
          })()}

          {/* Samples Management Section */}
          {activeSection === 'samples' && (() => {
            // Samples are test requests that need sample collection or are being processed
            const awaitingCollection = testRequests.filter((r: any) => 
              ['pending', 'sent_to_lab', 'sent'].includes(r.status)
            )
            const inProcessing = testRequests.filter((r: any) => 
              ['sample_collected', 'processing'].includes(r.status)
            )
            
            const handleMarkSampleCollected = async (requestId: string) => {
              try {
                const res = await fetch(`/api/lab-requests/${requestId}/lab-fulfillment`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ status: 'sample_collected' }),
                  credentials: 'include',
                })
                if (!res.ok) throw new Error('Failed to update')
                await loadDashboardData()
                toast({ title: 'Sample collected', description: 'Sample marked as collected and ready for processing.' })
              } catch (e) {
                toast({ title: 'Error', description: 'Failed to update sample status', variant: 'destructive' })
              }
            }

            const handleStartProcessing = async (requestId: string) => {
              try {
                const res = await fetch(`/api/lab-requests/${requestId}/lab-fulfillment`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ status: 'processing' }),
                  credentials: 'include',
                })
                if (!res.ok) throw new Error('Failed to update')
                await loadDashboardData()
                toast({ title: 'Processing started', description: 'Sample is now being processed.' })
              } catch (e) {
                toast({ title: 'Error', description: 'Failed to update status', variant: 'destructive' })
              }
            }

            return (
              <div className="space-y-6">
                {/* Stats Row */}
                <div className="grid grid-cols-3 gap-4">
                  <Card className="bg-gradient-to-br from-amber-500 to-amber-600 text-white border-0 shadow-lg">
                    <CardContent className="p-5">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-amber-100 text-sm font-medium">Awaiting Collection</p>
                          <p className="text-3xl font-bold mt-1">{awaitingCollection.length}</p>
                        </div>
                        <div className="h-12 w-12 bg-white/20 rounded-xl flex items-center justify-center">
                          <Clock className="h-6 w-6" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="bg-gradient-to-br from-cyan-500 to-cyan-600 text-white border-0 shadow-lg">
                    <CardContent className="p-5">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-cyan-100 text-sm font-medium">In Processing</p>
                          <p className="text-3xl font-bold mt-1">{inProcessing.length}</p>
                        </div>
                        <div className="h-12 w-12 bg-white/20 rounded-xl flex items-center justify-center">
                          <Activity className="h-6 w-6" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="bg-gradient-to-br from-violet-500 to-violet-600 text-white border-0 shadow-lg">
                    <CardContent className="p-5">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-violet-100 text-sm font-medium">Total Active</p>
                          <p className="text-3xl font-bold mt-1">{awaitingCollection.length + inProcessing.length}</p>
                        </div>
                        <div className="h-12 w-12 bg-white/20 rounded-xl flex items-center justify-center">
                          <Beaker className="h-6 w-6" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Awaiting Collection */}
                <Card className="shadow-sm">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 bg-amber-100 rounded-lg flex items-center justify-center">
                          <Clock className="h-4 w-4 text-amber-600" />
                        </div>
                        <div>
                          <CardTitle className="text-lg font-semibold">Awaiting Sample Collection</CardTitle>
                          <CardDescription>{awaitingCollection.length} sample(s) need to be collected</CardDescription>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {awaitingCollection.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <CheckCircle className="h-10 w-10 mx-auto mb-2 opacity-50" />
                        <p>All samples have been collected!</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {awaitingCollection.map((req: any) => (
                          <div 
                            key={req.id}
                            className="flex items-center justify-between p-4 border rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                          >
                            <div className="flex items-center gap-4">
                              <div className="h-10 w-10 bg-amber-100 rounded-lg flex items-center justify-center">
                                <Beaker className="h-5 w-5 text-amber-600" />
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">{req.request_number || `LT-${req.id.slice(0,6)}`}</span>
                                  {req.priority === 'urgent' && (
                                    <Badge variant="destructive" className="text-xs">URGENT</Badge>
                                  )}
                                </div>
                                <div className="flex items-center gap-3 text-sm text-muted-foreground mt-0.5">
                                  <span className="flex items-center gap-1">
                                    <Users className="h-3 w-3" />
                                    {req.patient?.full_name || 'Patient'}
                                  </span>
                                  <span>•</span>
                                  <span>{(req.items || []).length} test(s)</span>
                                  <span>•</span>
                                  <span>{new Date(req.created_at).toLocaleDateString()}</span>
                                </div>
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {(req.items || []).slice(0, 3).map((item: any, idx: number) => (
                                    <Badge key={idx} variant="outline" className="text-xs font-normal">
                                      {item.test_name || item.name || 'Test'}
                                    </Badge>
                                  ))}
                                  {(req.items || []).length > 3 && (
                                    <Badge variant="outline" className="text-xs font-normal">
                                      +{(req.items || []).length - 3} more
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setSelectedRequest(req)}
                              >
                                View Details
                              </Button>
                              <Button
                                size="sm"
                                className="bg-amber-600 hover:bg-amber-700"
                                onClick={() => handleMarkSampleCollected(req.id)}
                              >
                                <Beaker className="h-4 w-4 mr-1" />
                                Mark Collected
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* In Processing */}
                <Card className="shadow-sm">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 bg-cyan-100 rounded-lg flex items-center justify-center">
                          <Activity className="h-4 w-4 text-cyan-600" />
                        </div>
                        <div>
                          <CardTitle className="text-lg font-semibold">Samples In Processing</CardTitle>
                          <CardDescription>{inProcessing.length} sample(s) being processed</CardDescription>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {inProcessing.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Beaker className="h-10 w-10 mx-auto mb-2 opacity-50" />
                        <p>No samples currently in processing.</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {inProcessing.map((req: any) => {
                          const fulfillment = (req.lab_fulfillment || []) as any[]
                          const completedTests = fulfillment.filter(f => f.status === 'completed').length
                          const totalTests = (req.items || []).length
                          const progress = totalTests > 0 ? Math.round((completedTests / totalTests) * 100) : 0
                          
                          return (
                            <div 
                              key={req.id}
                              className="p-4 border rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                  <div className="h-10 w-10 bg-cyan-100 rounded-lg flex items-center justify-center">
                                    <Activity className="h-5 w-5 text-cyan-600" />
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <span className="font-medium">{req.request_number || `LT-${req.id.slice(0,6)}`}</span>
                                      <Badge className={req.status === 'processing' ? 'bg-cyan-100 text-cyan-700' : 'bg-blue-100 text-blue-700'}>
                                        {req.status === 'processing' ? 'Processing' : 'Sample Collected'}
                                      </Badge>
                                      {req.priority === 'urgent' && (
                                        <Badge variant="destructive" className="text-xs">URGENT</Badge>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-3 text-sm text-muted-foreground mt-0.5">
                                      <span className="flex items-center gap-1">
                                        <Users className="h-3 w-3" />
                                        {req.patient?.full_name || 'Patient'}
                                      </span>
                                      <span>•</span>
                                      <span>{completedTests}/{totalTests} tests completed</span>
                                      {req.assigned_technician_name && (
                                        <>
                                          <span>•</span>
                                          <span className="flex items-center gap-1">
                                            <UserCircle className="h-3 w-3" />
                                            {req.assigned_technician_name}
                                          </span>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setSelectedRequest(req)}
                                  >
                                    Enter Results
                                  </Button>
                                  {req.status === 'sample_collected' && (
                                    <Button
                                      size="sm"
                                      className="bg-cyan-600 hover:bg-cyan-700"
                                      onClick={() => handleStartProcessing(req.id)}
                                    >
                                      <Activity className="h-4 w-4 mr-1" />
                                      Start Processing
                                    </Button>
                                  )}
                                </div>
                              </div>
                              {/* Progress bar */}
                              <div className="mt-3">
                                <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                                  <span>Progress</span>
                                  <span>{progress}%</span>
                                </div>
                                <Progress value={progress} className="h-2" />
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )
          })()}

          {/* Placeholder sections for other tabs */}
          {['analytics', 'finances'].includes(activeSection) && (
            <Card className="shadow-sm">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <div className="h-16 w-16 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center mb-4">
                  {activeSection === 'analytics' && <BarChart2 className="h-8 w-8 text-slate-400" />}
                  {activeSection === 'finances' && <Banknote className="h-8 w-8 text-slate-400" />}
                </div>
                <h3 className="text-lg font-semibold mb-1">
                  {sidebarItems.find(i => i.id === activeSection)?.label}
                </h3>
                <p className="text-muted-foreground text-center max-w-md">
                  Manage all your {activeSection.replace('-', ' ')} from this section.
                </p>
                <Button className="mt-4 bg-violet-600 hover:bg-violet-700">
                  <Plus className="h-4 w-4 mr-2" />
                  Add New
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </main>

      {/* Request detail dialog (laboratory professional view) */}
      <Dialog open={!!selectedRequest} onOpenChange={(open) => !open && setSelectedRequest(null)}>
        <DialogContent size="xl2" className="flex flex-col max-h-[90vh]" style={{ width: 'min(1100px, 95vw)' }}>
          <DialogHeader className="shrink-0">
            <div className="flex items-start justify-between gap-4">
              <div>
                <DialogTitle className="flex items-center gap-2">
                  <FlaskConical className="h-5 w-5 text-teal-600 dark:text-teal-400" />
                  {selectedRequest?.request_number || 'Lab Request'}
                </DialogTitle>
                <DialogDescription>
                  Lab test request details
                </DialogDescription>
              </div>
              {selectedRequest && (['fulfilled', 'completed', 'results_ready'].includes(selectedRequest.status || '') || localFulfillment.some(f => f.result_value)) && (
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleViewPdf(selectedRequest)}
                    disabled={pdfLoading}
                  >
                    {pdfLoading ? <LoadingSpinner size="sm" /> : <FileText className="h-4 w-4" />}
                    <span className="ms-2">View PDF</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownloadPdf(selectedRequest)}
                    disabled={pdfLoading}
                  >
                    {pdfLoading ? <LoadingSpinner size="sm" /> : <Download className="h-4 w-4" />}
                    <span className="ms-2">Download</span>
                  </Button>
                </div>
              )}
            </div>
          </DialogHeader>
          {selectedRequest && (
            <div className="flex-1 min-h-0 overflow-hidden flex flex-col -mx-1 px-1">
            <div className="flex-1 flex flex-col min-h-0">
              <div className="flex gap-1 shrink-0 mb-3">
                <Button
                  variant={requestDetailTab === 'details' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setRequestDetailTab('details')}
                >
                  Details
                </Button>
                <Button
                  variant={requestDetailTab === 'documents' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setRequestDetailTab('documents')}
                >
                  Documents
                </Button>
              </div>
              {requestDetailTab === 'details' && (
            <div className="space-y-5">
              {/* Status & Priority */}
              <div className="flex items-center gap-3">
                <Badge className={cn(
                  "text-sm px-3 py-1",
                  (selectedRequest.status === 'pending' || selectedRequest.status === 'sent_to_lab' || selectedRequest.status === 'sent') && 'bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-200 dark:border-amber-800',
                  (selectedRequest.status === 'sample_collected' || selectedRequest.status === 'processing') && 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/60 dark:text-cyan-200 dark:border-cyan-800',
                  (selectedRequest.status === 'fulfilled' || selectedRequest.status === 'completed') && 'bg-green-100 text-green-700 dark:bg-green-900/60 dark:text-green-200 dark:border-green-800',
                )}>
                  {statusLabel(selectedRequest.status)}
                </Badge>
                {selectedRequest.priority && selectedRequest.priority !== 'normal' && (
                  <Badge variant="outline" className="text-sm">
                    {selectedRequest.priority}
                  </Badge>
                )}
                {selectedRequest.created_at && (
                  <span className="text-sm text-muted-foreground ml-auto">
                    {new Date(selectedRequest.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                )}
              </div>

              {/* Doctor & Patient Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg border p-3 space-y-1">
                  <p className="text-xs text-muted-foreground font-medium">Referring Doctor</p>
                  <p className="font-medium">{selectedRequest.doctor?.business_name ? `Dr. ${selectedRequest.doctor.business_name}` : 'Doctor'}</p>
                </div>
                <div className="rounded-lg border p-3 space-y-1">
                  <p className="text-xs text-muted-foreground font-medium">Patient</p>
                  <p className="font-medium">{selectedRequest.patient?.full_name || 'Not specified'}</p>
                </div>
              </div>

              {/* Assigned Technician */}
              <div className="rounded-lg border p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground font-medium mb-1">Assigned Technician</p>
                    {assignedTechnician ? (
                      <div className="flex items-center gap-2">
                        <UserCircle className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                        <span className="font-medium text-sm">{assignedTechnician.name}</span>
                        {assignedTechnician.specialization && (
                          <Badge variant="secondary" className="text-xs">{assignedTechnician.specialization}</Badge>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">Not assigned</p>
                    )}
                  </div>
                  {isProcessing && technicians.length > 0 && (
                    <Select 
                      value={assignedTechnicianId || '__unassigned__'} 
                      onValueChange={(v) => setAssignedTechnicianId(v === '__unassigned__' ? null : v)}
                    >
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Assign tech..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__unassigned__">Unassigned</SelectItem>
                        {technicians.map((tech) => (
                          <SelectItem key={tech.id} value={tech.id}>
                            {tech.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
                {technicians.length === 0 && isProcessing && (
                  <p className="text-xs text-amber-600 dark:text-amber-400">Add technicians in Settings → Lab Staff Directory</p>
                )}
              </div>

              {/* Diagnosis & Clinical Notes */}
              {(selectedRequest.diagnosis || selectedRequest.clinical_notes) && (
                <div className="rounded-lg border p-3 space-y-2">
                  {selectedRequest.diagnosis && (
                    <div>
                      <p className="text-xs text-muted-foreground font-medium mb-1">Diagnosis</p>
                      <p className="text-sm">{selectedRequest.diagnosis}</p>
                    </div>
                  )}
                  {selectedRequest.clinical_notes && (
                    <div>
                      <p className="text-xs text-muted-foreground font-medium mb-1">Clinical Notes</p>
                      <p className="text-sm">{selectedRequest.clinical_notes}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Tests Requested - Table with result entry (standard: value, unit, ref range) */}
              <div className="rounded-lg border overflow-hidden">
                <div className="flex items-center justify-between px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border-b">
                  <p className="text-xs text-muted-foreground font-medium">
                    Tests Requested {isProcessing && '— Enter result value, unit & reference range for completed tests'}
                  </p>
                  {isProcessing && (selectedRequest.items?.length ?? 0) > 0 && (
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className="h-7 text-xs">
                          Apply status to all
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-48 p-2" align="end">
                        <p className="text-xs text-muted-foreground mb-2">Set same status for all tests:</p>
                        <div className="flex flex-col gap-0.5">
                          {(['pending', 'sample_collected', 'processing', 'completed', 'failed'] as const).map((s) => (
                            <Button
                              key={s}
                              variant="ghost"
                              size="sm"
                              className="h-8 justify-start text-xs"
                              onClick={() => setLocalFulfillment((prev) => prev.map((f) => ({ ...f, status: s })))}
                            >
                              {s === 'pending' && '⏳ Pending'}
                              {s === 'sample_collected' && '🧪 Sample collected'}
                              {s === 'processing' && '⚙️ Processing'}
                              {s === 'completed' && '✓ Completed'}
                              {s === 'failed' && '✗ Failed'}
                            </Button>
                          ))}
                        </div>
                      </PopoverContent>
                    </Popover>
                  )}
                </div>
                {(selectedRequest.items?.length ?? 0) > 0 ? (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-slate-50/50 dark:bg-slate-800/30 hover:bg-slate-50/50">
                          <TableHead className="font-medium w-8">#</TableHead>
                          <TableHead className="font-medium min-w-[120px]">Test Name</TableHead>
                          <TableHead className="font-medium min-w-[80px]">Category</TableHead>
                          {isProcessing && (
                            <>
                              <TableHead className="font-medium">Status</TableHead>
                              <TableHead className="font-medium">Result</TableHead>
                              <TableHead className="font-medium">Unit</TableHead>
                              <TableHead className="font-medium">Ref. Range</TableHead>
                              <TableHead className="font-medium">Interpretation</TableHead>
                            </>
                          )}
                          {!isProcessing && ['fulfilled', 'completed'].includes(selectedRequest?.status || '') && (
                            <>
                              <TableHead className="font-medium">Result</TableHead>
                              <TableHead className="font-medium">Ref. Range</TableHead>
                              <TableHead className="font-medium">Status</TableHead>
                            </>
                          )}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(selectedRequest.items || []).map((item: any, i: number) => {
                          const f = getFulfillmentForItem(item.id)
                          const showResultCols = isProcessing || ['fulfilled', 'completed'].includes(selectedRequest?.status || '')
                          return (
                            <TableRow key={item.id || i}>
                              <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                              <TableCell className="font-medium">
                                <div>{item.test_type?.name || '—'}</div>
                                {item.test_type?.name_ar && (
                                  <div className="text-xs text-muted-foreground">{item.test_type.name_ar}</div>
                                )}
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className="text-xs font-normal">
                                  {item.test_type?.category || '—'}
                                </Badge>
                              </TableCell>
                              {isProcessing && (
                                <>
                                  <TableCell>
                                    <Select
                                      value={f.status}
                                      onValueChange={(v: LabFulfillmentItem['status']) => setFulfillmentForItem(item.id, { status: v })}
                                    >
                                      <SelectTrigger className="h-8 text-sm w-[130px]">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="pending">⏳ Pending</SelectItem>
                                        <SelectItem value="sample_collected">🧪 Sample collected</SelectItem>
                                        <SelectItem value="processing">⚙️ Processing</SelectItem>
                                        <SelectItem value="completed">✓ Completed</SelectItem>
                                        <SelectItem value="failed">✗ Failed</SelectItem>
                                      </SelectContent>
                                    </Select>
                                    {f.status === 'failed' && (
                                      <Input
                                        placeholder="Reason"
                                        className="mt-1 h-7 text-xs"
                                        value={f.failed_reason ?? ''}
                                        onChange={(e) => setFulfillmentForItem(item.id, { failed_reason: e.target.value })}
                                      />
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    {f.status === 'completed' ? (
                                      <Input
                                        placeholder="e.g. 4.2"
                                        className="h-8 text-sm w-20"
                                        value={f.result_value ?? ''}
                                        onChange={(e) => setFulfillmentForItem(item.id, { result_value: e.target.value })}
                                      />
                                    ) : f.status === 'failed' ? (
                                      <span className="text-xs text-red-600">—</span>
                                    ) : (
                                      <span className="text-muted-foreground text-xs">—</span>
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    {f.status === 'completed' ? (
                                      <Input
                                        placeholder="g/dL, mg/L..."
                                        className="h-8 text-sm w-24"
                                        value={f.result_unit ?? ''}
                                        onChange={(e) => setFulfillmentForItem(item.id, { result_unit: e.target.value })}
                                      />
                                    ) : (
                                      <span className="text-muted-foreground text-xs">—</span>
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    {f.status === 'completed' ? (
                                      <Input
                                        placeholder="3.5-5.5"
                                        className="h-8 text-sm w-24"
                                        value={f.reference_range ?? ''}
                                        onChange={(e) => setFulfillmentForItem(item.id, { reference_range: e.target.value })}
                                      />
                                    ) : (
                                      <span className="text-muted-foreground text-xs">—</span>
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    {f.status === 'completed' ? (
                                      <Select
                                        value={f.result_status ?? 'normal'}
                                        onValueChange={(v: LabFulfillmentItem['result_status']) => setFulfillmentForItem(item.id, { result_status: v })}
                                      >
                                        <SelectTrigger className="h-8 text-sm w-[100px]">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="normal">Normal</SelectItem>
                                          <SelectItem value="high">High</SelectItem>
                                          <SelectItem value="low">Low</SelectItem>
                                          <SelectItem value="critical">Critical</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    ) : (
                                      <span className="text-muted-foreground text-xs">—</span>
                                    )}
                                  </TableCell>
                                </>
                              )}
                              {!isProcessing && showResultCols && (
                                <>
                                  <TableCell className="font-medium">
                                    {f.status === 'failed' ? (
                                      <span className="text-red-600">Failed{f.failed_reason ? `: ${f.failed_reason}` : ''}</span>
                                    ) : (
                                      <>
                                        {f.result_value ?? item.result_value ?? '—'}
                                        {(f.result_unit ?? item.result_unit) && <span className="text-muted-foreground ml-1">{f.result_unit ?? item.result_unit}</span>}
                                      </>
                                    )}
                                  </TableCell>
                                  <TableCell className="text-muted-foreground text-sm">{f.reference_range ?? item.reference_range ?? '—'}</TableCell>
                                  <TableCell>
                                    {f.status === 'failed' ? (
                                      <Badge variant="destructive" className="text-xs">Failed</Badge>
                                    ) : (f.result_status ?? item.result_status) ? (
                                      <Badge variant={
                                        (f.result_status ?? item.result_status) === 'normal' ? 'default' :
                                        (f.result_status ?? item.result_status) === 'critical' ? 'destructive' : 'secondary'
                                      } className="text-xs">{f.result_status ?? item.result_status}</Badge>
                                    ) : (
                                      <span className="text-muted-foreground">—</span>
                                    )}
                                  </TableCell>
                                </>
                              )}
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground p-3">No tests specified</p>
                )}
              </div>

              {/* Ticket reference (minimal) */}
              {detailTicket && (
                <div className="flex items-center justify-between text-sm bg-slate-50 dark:bg-slate-800/50 rounded-lg px-3 py-2">
                  <div className="flex items-center gap-2">
                    <Ticket className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                    <span className="font-mono text-xs">{detailTicket.ticket_number}</span>
                  </div>
                  <Badge variant="outline" className="text-xs">{detailTicket.status}</Badge>
                </div>
              )}
            </div>
              )}
              {requestDetailTab === 'documents' && selectedRequest.id && (
                <div className="flex-1 min-h-0 overflow-y-auto">
                  <LabRequestDocumentsAttach labRequestId={selectedRequest.id} viewerType="laboratory" />
                </div>
              )}
            </div>
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-0 flex-wrap shrink-0">
            <Button variant="outline" onClick={() => setSelectedRequest(null)} disabled={!!actionLoading}>
              Close
            </Button>
            {selectedRequest && ['pending', 'sent_to_lab', 'sent'].includes(selectedRequest.status || '') ? (
              <>
                <Button
                  variant="outline"
                  className="border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700"
                  onClick={() => selectedRequest?.id && openDenyDialog(selectedRequest.id)}
                  disabled={!!actionLoading}
                >
                  {actionLoading === 'deny' ? <LoadingSpinner size="sm" /> : <XCircle className="h-4 w-4" />}
                  <span className="ml-2">Deny</span>
                </Button>
                <Button
                  className="bg-teal-600 hover:bg-teal-700"
                  onClick={async () => {
                    if (!selectedRequest?.id) return
                    setActionLoading('accept')
                    try {
                      const res = await fetch('/api/lab-requests', {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ requestId: selectedRequest.id, action: 'accept' }),
                        credentials: 'include',
                      })
                      if (!res.ok) throw new Error((await res.json()).error || 'Failed')
                      await loadDashboardData()
                      setSelectedRequest(null)
                      toast({ title: 'Request accepted', description: 'Doctor and patient have been notified.' })
                    } catch (e) {
                      console.error('Accept failed:', e)
                      toast({ title: 'Error', description: 'Failed to accept request', variant: 'destructive' })
                    } finally {
                      setActionLoading(null)
                    }
                  }}
                  disabled={!!actionLoading}
                >
                  {actionLoading === 'accept' ? <LoadingSpinner size="sm" /> : <CheckCircle2 className="h-4 w-4" />}
                  <span className="ml-2">Accept</span>
                </Button>
              </>
            ) : isProcessing ? (
              <>
                <Button
                  variant="outline"
                  onClick={async () => {
                    if (!selectedRequest?.id) return
                    setActionLoading('save')
                    try {
                      const res = await fetch(`/api/lab-requests/${selectedRequest.id}/lab-fulfillment`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          lab_fulfillment: localFulfillment,
                          assigned_technician_id: assignedTechnicianId || null,
                          assigned_technician_name: assignedTechnician?.name || null,
                        }),
                        credentials: 'include',
                      })
                      if (!res.ok) throw new Error((await res.json()).error || 'Failed')
                      setSelectedRequest((r: any) => (r ? { ...r, lab_fulfillment: localFulfillment, assigned_technician_id: assignedTechnicianId, assigned_technician_name: assignedTechnician?.name } : null))
                      toast({ title: 'Saved', description: 'Test statuses updated.' })
                    } catch (e) {
                      console.error('Save failed:', e)
                      toast({ title: 'Error', description: 'Failed to save', variant: 'destructive' })
                    } finally {
                      setActionLoading(null)
                    }
                  }}
                  disabled={!!actionLoading}
                >
                  {actionLoading === 'save' ? <LoadingSpinner size="sm" /> : null}
                  <span className="ml-2">Save Status</span>
                </Button>
                <Button
                  className="bg-teal-600 hover:bg-teal-700"
                  onClick={async () => {
                    if (!selectedRequest?.id || !canSendResults) return
                    setActionLoading('send_results')
                    try {
                      const res = await fetch('/api/lab-requests', {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          requestId: selectedRequest.id,
                          action: 'send_results',
                          lab_fulfillment: localFulfillment,
                          assigned_technician_id: assignedTechnicianId || null,
                          assigned_technician_name: assignedTechnician?.name || null,
                        }),
                        credentials: 'include',
                      })
                      if (!res.ok) {
                        const err = await res.json()
                        throw new Error(err.error || 'Failed')
                      }
                      await loadDashboardData()
                      setSelectedRequest(null)
                      toast({ title: 'Results sent', description: 'Doctor and patient have been notified.' })
                    } catch (e: any) {
                      console.error('Send results failed:', e)
                      toast({ title: 'Error', description: e.message || 'Failed to send results', variant: 'destructive' })
                    } finally {
                      setActionLoading(null)
                    }
                  }}
                  disabled={!!actionLoading || !canSendResults}
                >
                  {actionLoading === 'send_results' ? <LoadingSpinner size="sm" /> : <Send className="h-4 w-4" />}
                  <span className="ml-2">Send Results</span>
                </Button>
              </>
            ) : (
              <Button variant="outline" onClick={() => setSelectedRequest(null)}>
                Done
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Lab Results PDF Viewer - view inside ticket */}
      {pdfViewerState && (
        <DocumentViewer
          open={!!pdfViewerState}
          onOpenChange={(open) => {
            if (!open) {
              pdfViewerState.revoke()
              setPdfViewerState(null)
            }
          }}
          fileUrl={pdfViewerState.url}
          fileName={pdfViewerState.filename}
          fileType="pdf"
        />
      )}

      {/* Equipment Add/Edit Dialog */}
      <Dialog open={showEquipmentDialog} onOpenChange={(open) => {
        if (!open) {
          setShowEquipmentDialog(false)
          setEditingEquipment(null)
          setEquipmentForm({ category: 'analyzer', status: 'operational' })
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Microscope className="h-5 w-5 text-violet-600" />
              {editingEquipment ? 'Edit Equipment' : 'Add New Equipment'}
            </DialogTitle>
            <DialogDescription>
              {editingEquipment ? 'Update equipment details and maintenance schedule.' : 'Register new laboratory equipment.'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label htmlFor="eq-name">Equipment Name *</Label>
                <Input 
                  id="eq-name"
                  placeholder="e.g., Automated Hematology Analyzer"
                  value={equipmentForm.name || ''}
                  onChange={(e) => setEquipmentForm(prev => ({ ...prev, name: e.target.value }))}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="eq-model">Model</Label>
                <Input 
                  id="eq-model"
                  placeholder="e.g., BC-6800 Plus"
                  value={equipmentForm.model || ''}
                  onChange={(e) => setEquipmentForm(prev => ({ ...prev, model: e.target.value }))}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="eq-manufacturer">Manufacturer</Label>
                <Input 
                  id="eq-manufacturer"
                  placeholder="e.g., Mindray"
                  value={equipmentForm.manufacturer || ''}
                  onChange={(e) => setEquipmentForm(prev => ({ ...prev, manufacturer: e.target.value }))}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="eq-serial">Serial Number</Label>
                <Input 
                  id="eq-serial"
                  placeholder="e.g., SN-2024-12345"
                  value={equipmentForm.serial_number || ''}
                  onChange={(e) => setEquipmentForm(prev => ({ ...prev, serial_number: e.target.value }))}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="eq-location">Location</Label>
                <Input 
                  id="eq-location"
                  placeholder="e.g., Lab Room A, Floor 2"
                  value={equipmentForm.location || ''}
                  onChange={(e) => setEquipmentForm(prev => ({ ...prev, location: e.target.value }))}
                  className="mt-1"
                />
              </div>
            </div>

            <Separator />

            {/* Category & Status */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Category</Label>
                <Select 
                  value={equipmentForm.category || 'analyzer'} 
                  onValueChange={(v) => setEquipmentForm(prev => ({ ...prev, category: v as any }))}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="analyzer">Analyzer</SelectItem>
                    <SelectItem value="centrifuge">Centrifuge</SelectItem>
                    <SelectItem value="microscope">Microscope</SelectItem>
                    <SelectItem value="incubator">Incubator</SelectItem>
                    <SelectItem value="refrigerator">Refrigerator / Freezer</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Status</Label>
                <Select 
                  value={equipmentForm.status || 'operational'} 
                  onValueChange={(v) => setEquipmentForm(prev => ({ ...prev, status: v as any }))}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="operational">Operational</SelectItem>
                    <SelectItem value="maintenance">Under Maintenance</SelectItem>
                    <SelectItem value="calibration">Calibration</SelectItem>
                    <SelectItem value="repair">Needs Repair</SelectItem>
                    <SelectItem value="offline">Offline</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Separator />

            {/* Dates */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="eq-purchase">Purchase Date</Label>
                <Input 
                  id="eq-purchase"
                  type="date"
                  value={equipmentForm.purchase_date || ''}
                  onChange={(e) => setEquipmentForm(prev => ({ ...prev, purchase_date: e.target.value }))}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="eq-warranty">Warranty Expiry</Label>
                <Input 
                  id="eq-warranty"
                  type="date"
                  value={equipmentForm.warranty_expiry || ''}
                  onChange={(e) => setEquipmentForm(prev => ({ ...prev, warranty_expiry: e.target.value }))}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="eq-last-maint">Last Maintenance</Label>
                <Input 
                  id="eq-last-maint"
                  type="date"
                  value={equipmentForm.last_maintenance || ''}
                  onChange={(e) => setEquipmentForm(prev => ({ ...prev, last_maintenance: e.target.value }))}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="eq-next-maint">Next Maintenance</Label>
                <Input 
                  id="eq-next-maint"
                  type="date"
                  value={equipmentForm.next_maintenance || ''}
                  onChange={(e) => setEquipmentForm(prev => ({ ...prev, next_maintenance: e.target.value }))}
                  className="mt-1"
                />
              </div>
            </div>

            <Separator />

            {/* Notes */}
            <div>
              <Label htmlFor="eq-notes">Notes</Label>
              <textarea
                id="eq-notes"
                placeholder="Additional notes, maintenance history, calibration requirements..."
                value={equipmentForm.notes || ''}
                onChange={(e) => setEquipmentForm(prev => ({ ...prev, notes: e.target.value }))}
                className="mt-1 w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => {
              setShowEquipmentDialog(false)
              setEditingEquipment(null)
              setEquipmentForm({ category: 'analyzer', status: 'operational' })
            }}>
              Cancel
            </Button>
            <Button className="bg-violet-600 hover:bg-violet-700" onClick={handleAddEquipment}>
              {editingEquipment ? 'Update Equipment' : 'Add Equipment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Deny Reason Dialog */}
      <Dialog open={denyDialogOpen} onOpenChange={setDenyDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <XCircle className="h-5 w-5" />
              Deny Lab Request
            </DialogTitle>
            <DialogDescription>
              Please provide a reason for denying this lab request. This will be visible to the prescribing doctor.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="deny-reason" className="text-sm font-medium">
              Reason for Denying (optional)
            </Label>
            <Textarea
              id="deny-reason"
              value={denyReason}
              onChange={(e) => setDenyReason(e.target.value)}
              placeholder="e.g., Lab equipment under maintenance, Sample requirements not met, etc."
              className="mt-2"
              rows={3}
            />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDenyDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDeny} disabled={!!actionLoading}>
              {actionLoading === 'deny' ? <LoadingSpinner size="sm" className="me-2" /> : null}
              Confirm Deny
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
