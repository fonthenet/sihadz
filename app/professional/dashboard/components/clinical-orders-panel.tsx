'use client'

import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { createBrowserClient } from '@/lib/supabase/client'
import { useAutoRefresh } from '@/hooks/use-auto-refresh'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { ImagePreviewDialog } from '@/components/image-preview-dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { LoadingSpinner } from '@/components/ui/page-loading'
import { Separator } from '@/components/ui/separator'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Pill,
  FlaskConical,
  Plus,
  Printer,
  Download,
  Send,
  MoreHorizontal,
  Edit,
  Trash2,
  Clock,
  CheckCircle,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  FileText,
  Building2,
  Activity,
  RefreshCw,
  MessageSquare,
  Paperclip,
  File,
  Image,
  Upload,
  History,
  ArrowRight,
  Circle,
  CheckCircle2,
  XCircle,
  GripVertical,
  ExternalLink
} from 'lucide-react'
import { format, formatDistanceToNow } from 'date-fns'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/components/auth-provider'
import { addToSyncQueue, isOnline } from '@/lib/offline-sync'
import PharmacySelector from './pharmacy-selector'
import LaboratorySelector from './laboratory-selector'
import PrescriptionBuilder from './prescription-builder'
import LabTestRequestBuilder, { type LabTestVisitContext } from './lab-test-request-builder'
import { LabRequestDocumentsAttach } from '@/components/lab-request-documents-attach'
import { VisitDocumentsAttach } from '@/components/visit-documents-attach'

/** Option for "Prescription/Lab for:" selector (Self or a family member) */
export interface FamilyMemberOption {
  id: string | null
  full_name: string
  age_years?: number
  relationship?: string
  allergies?: string
}

interface ClinicalOrdersPanelProps {
  appointmentId: string
  doctorId: string
  /** Appointment's assigned doctor - use for loading prescriptions when different from doctorId (e.g. clinic view). */
  appointmentDoctorId?: string | null
  patientId: string
  /** Optional: family member ID when booking is for a single family member (backward compat). */
  familyMemberId?: string | null
  /** Optional: list of patients for this visit (Self + family members). When length > 1, doctor must select "For:" when creating Rx/Lab. */
  familyMembers?: FamilyMemberOption[]
  /** Optional: family member allergies for drug interaction warnings (legacy - use familyMembers[].allergies when per-member). */
  familyMemberAllergies?: { name: string; severity?: string }[]
  /** Optional: visit context for AI lab test suggestions (symptoms, notes, patient info from same ticket). */
  visitContext?: LabTestVisitContext
  /** Optional: visit context per family member (for multi-family AI suggestions). Key = family_member_id or 'self'. */
  visitContextByMember?: Record<string, LabTestVisitContext>
  /** Optional: called when prescription/lab is sent to pharmacy/lab (e.g. to refresh thread list). */
  onThreadCreated?: (orderType: 'prescription' | 'lab', providerId: string, providerName: string) => void
  /** Optional: prescription ID from URL to auto-open and expand. */
  initialPrescriptionId?: string | null
  /** Optional: lab request ID from URL to auto-open and expand. */
  initialLabRequestId?: string | null
}

// Status configurations with colors (dark mode variants for contrast)
const PRESCRIPTION_STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string; icon: any }> = {
  active: { label: 'Active', color: 'text-blue-700 dark:text-blue-300', bgColor: 'bg-blue-50 border-blue-200 dark:bg-blue-950/60 dark:border-blue-800', icon: FileText },
  sent: { label: 'Sent to Pharmacy', color: 'text-purple-700 dark:text-purple-300', bgColor: 'bg-purple-50 border-purple-200 dark:bg-purple-950/60 dark:border-purple-800', icon: Send },
  received: { label: 'Received', color: 'text-indigo-700 dark:text-indigo-300', bgColor: 'bg-indigo-50 border-indigo-200 dark:bg-indigo-950/60 dark:border-indigo-800', icon: CheckCircle },
  processing: { label: 'Processing', color: 'text-amber-700 dark:text-amber-300', bgColor: 'bg-amber-50 border-amber-200 dark:bg-amber-950/60 dark:border-amber-800', icon: Clock },
  ready: { label: 'Ready for Pickup', color: 'text-green-700 dark:text-green-300', bgColor: 'bg-green-50 border-green-200 dark:bg-green-950/60 dark:border-green-800', icon: CheckCircle },
  picked_up: { label: 'Picked Up', color: 'text-emerald-700 dark:text-emerald-300', bgColor: 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950/60 dark:border-emerald-800', icon: CheckCircle },
  delivered: { label: 'Delivered', color: 'text-teal-700 dark:text-teal-300', bgColor: 'bg-teal-50 border-teal-200 dark:bg-teal-950/60 dark:border-teal-800', icon: CheckCircle },
  dispensed: { label: 'Dispensed', color: 'text-green-800 dark:text-green-300', bgColor: 'bg-green-100 border-green-300 dark:bg-green-950/60 dark:border-green-800', icon: CheckCircle },
  partially_dispensed: { label: 'Partial', color: 'text-orange-700 dark:text-orange-300', bgColor: 'bg-orange-50 border-orange-200 dark:bg-orange-950/60 dark:border-orange-800', icon: AlertCircle },
  expired: { label: 'Expired', color: 'text-gray-600 dark:text-gray-400', bgColor: 'bg-gray-100 border-gray-300 dark:bg-gray-800 dark:border-gray-600', icon: Clock },
  cancelled: { label: 'Cancelled', color: 'text-red-700 dark:text-red-300', bgColor: 'bg-red-50 border-red-200 dark:bg-red-950/60 dark:border-red-800', icon: AlertCircle },
  declined: { label: 'Declined', color: 'text-red-700 dark:text-red-300', bgColor: 'bg-red-50 border-red-200 dark:bg-red-950/60 dark:border-red-800', icon: XCircle },
}

const LAB_STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string; icon: any }> = {
  pending: { label: 'Pending', color: 'text-blue-700 dark:text-blue-300', bgColor: 'bg-blue-50 border-blue-200 dark:bg-blue-950/60 dark:border-blue-800', icon: Clock },
  sent_to_lab: { label: 'Sent to Lab', color: 'text-purple-700 dark:text-purple-300', bgColor: 'bg-purple-50 border-purple-200 dark:bg-purple-950/60 dark:border-purple-800', icon: Send },
  sent: { label: 'Sent to Lab', color: 'text-purple-700 dark:text-purple-300', bgColor: 'bg-purple-50 border-purple-200 dark:bg-purple-950/60 dark:border-purple-800', icon: Send },
  sample_collected: { label: 'Sample Collected', color: 'text-indigo-700 dark:text-indigo-300', bgColor: 'bg-indigo-50 border-indigo-200 dark:bg-indigo-950/60 dark:border-indigo-800', icon: Activity },
  processing: { label: 'Processing', color: 'text-amber-700 dark:text-amber-300', bgColor: 'bg-amber-50 border-amber-200 dark:bg-amber-950/60 dark:border-amber-800', icon: RefreshCw },
  results_ready: { label: 'Results Received', color: 'text-green-700 dark:text-green-300', bgColor: 'bg-green-50 border-green-200 dark:bg-green-950/60 dark:border-green-800', icon: CheckCircle },
  fulfilled: { label: 'Results Received', color: 'text-emerald-700 dark:text-emerald-300', bgColor: 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950/60 dark:border-emerald-800', icon: CheckCircle },
  completed: { label: 'Results Received', color: 'text-emerald-700 dark:text-emerald-300', bgColor: 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950/60 dark:border-emerald-800', icon: CheckCircle },
  denied: { label: 'Denied', color: 'text-red-700 dark:text-red-300', bgColor: 'bg-red-50 border-red-200 dark:bg-red-950/60 dark:border-red-800', icon: AlertCircle },
  cancelled: { label: 'Cancelled', color: 'text-red-700 dark:text-red-300', bgColor: 'bg-red-50 border-red-200 dark:bg-red-950/60 dark:border-red-800', icon: AlertCircle },
}

// Status progress steps for visual timeline
// Note: picked_up and delivered are completion statuses that come after 'ready'
const PRESCRIPTION_STEPS = ['active', 'sent', 'received', 'processing', 'ready', 'picked_up', 'dispensed']
const LAB_STEPS = ['pending', 'sent_to_lab', 'sample_collected', 'processing', 'results_ready', 'completed']

// Map statuses not in PRESCRIPTION_STEPS to their timeline position
const PRESCRIPTION_STATUS_MAP: Record<string, string> = {
  'expired': 'active',
  'cancelled': 'active',
}

// Map lab statuses to LAB_STEPS for timeline (fulfilled = completed, sent = sent_to_lab)
const LAB_STATUS_MAP: Record<string, string> = {
  'fulfilled': 'completed',
  'sent': 'sent_to_lab',
  'denied': 'cancelled',
}

export default function ClinicalOrdersPanel({
  appointmentId,
  doctorId,
  patientId,
  familyMemberId,
  familyMembers,
  familyMemberAllergies,
  visitContext,
  visitContextByMember,
  onThreadCreated,
  appointmentDoctorId,
  initialPrescriptionId,
  initialLabRequestId,
}: ClinicalOrdersPanelProps) {
  const supabase = useMemo(() => createBrowserClient(), [])
  const { toast } = useToast()
  const { user } = useAuth()
  
  // Data state
  const [prescriptions, setPrescriptions] = useState<any[]>([])
  const [labRequests, setLabRequests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('prescriptions')
  
  // Expanded rows and sub-tabs
  const [expandedPrescriptionId, setExpandedPrescriptionId] = useState<string | null>(null)
  const [expandedLabRequestId, setExpandedLabRequestId] = useState<string | null>(null)
  const [prescriptionSubTab, setPrescriptionSubTab] = useState<Record<string, string>>({}) // orderId -> 'details' | 'messages' | 'files'
  const [labSubTab, setLabSubTab] = useState<Record<string, string>>({})
  
  // Messages state
  const [messages, setMessages] = useState<Record<string, any[]>>({}) // orderId -> messages[]
  const [messagesLoading, setMessagesLoading] = useState<Record<string, boolean>>({})
  const [messageInput, setMessageInput] = useState<Record<string, string>>({})
  const [sendingMessage, setSendingMessage] = useState(false)
  // Track unread messages - stores timestamp of last viewed message per order
  const [lastViewedTimestamp, setLastViewedTimestamp] = useState<Record<string, string>>({})
  
  // Current user for coloring sender names (must be before getUnreadCount)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setCurrentUserId(user?.id ?? null))
  }, [supabase])
  
  /** Count unread messages (messages from others after last viewed timestamp) */
  const getUnreadCount = useCallback((orderId: string) => {
    const orderMessages = messages[orderId] || []
    const lastViewed = lastViewedTimestamp[orderId]
    if (!currentUserId) return 0
    
    return orderMessages.filter((msg: any) => {
      // Don't count own messages or system messages
      if (msg.sender_id === currentUserId) return false
      if (msg.message_type === 'system') return false
      // If never viewed, all messages from others are unread
      if (!lastViewed) return true
      // Messages after last viewed timestamp are unread
      return new Date(msg.created_at) > new Date(lastViewed)
    }).length
  }, [messages, lastViewedTimestamp, currentUserId])
  
  /** Mark all messages in an order as read (set last viewed to now) */
  const markAsRead = useCallback((orderId: string) => {
    const orderMessages = messages[orderId] || []
    if (orderMessages.length > 0) {
      const latestTimestamp = orderMessages[orderMessages.length - 1]?.created_at
      if (latestTimestamp) {
        setLastViewedTimestamp(prev => ({ ...prev, [orderId]: latestTimestamp }))
      }
    }
  }, [messages])
  
  // Chat window resizing state
  const [chatHeights, setChatHeights] = useState<Record<string, number>>({}) // orderId -> height in px
  const [chatWidths, setChatWidths] = useState<Record<string, number>>({}) // orderId -> width in px (for messages panel)
  const [isResizing, setIsResizing] = useState<string | null>(null) // orderId being resized
  
  // Files section collapse state
  const [filesCollapsed, setFilesCollapsed] = useState<Record<string, boolean>>({}) // orderId -> collapsed
  
  // Image preview modal
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null)
  
  // Files state
  const [files, setFiles] = useState<Record<string, any[]>>({}) // orderId -> files[]
  const [filesLoading, setFilesLoading] = useState<Record<string, boolean>>({})
  
  // Dialog state
  const [showNewPrescriptionDialog, setShowNewPrescriptionDialog] = useState(false)
  const [showNewLabRequestDialog, setShowNewLabRequestDialog] = useState(false)
  const [showPharmacySelector, setShowPharmacySelector] = useState(false)
  const [showLabSelector, setShowLabSelector] = useState(false)
  const [selectedPrescriptionForSend, setSelectedPrescriptionForSend] = useState<string | null>(null)
  const [selectedLabRequestForSend, setSelectedLabRequestForSend] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  /** Pending send confirmation: show AlertDialog before actually sending */
  const [pendingSendToPharmacy, setPendingSendToPharmacy] = useState<{ id: string; name: string } | null>(null)
  const [pendingSendToLab, setPendingSendToLab] = useState<{ id: string; name: string } | null>(null)
  /** Edit prescription/lab request */
  const [editingPrescription, setEditingPrescription] = useState<any | null>(null)
  const [editingLabRequest, setEditingLabRequest] = useState<any | null>(null)
  
  // Get current sub-tab for an order
  const getPrescriptionSubTab = (id: string) => prescriptionSubTab[id] || 'details'
  const getLabSubTab = (id: string) => labSubTab[id] || 'details' // 'details' | 'documents' | 'messages'

  // Load data - CRITICAL: Healthcare data must always be visible to authorized users
  const loadPrescriptions = useCallback(async () => {
    console.log('[ClinicalOrdersPanel] Loading prescriptions for appointment:', appointmentId)
    try {
      const res = await fetch(`/api/appointments/${appointmentId}/prescriptions`, { credentials: 'include' })
      const json = await res.json()
      console.log('[ClinicalOrdersPanel] API response:', res.status, json)
      
      if (!res.ok) {
        // CRITICAL: Surface errors - never silently fail for healthcare data
        console.error('[ClinicalOrdersPanel] CRITICAL: Failed to load prescriptions:', json)
        toast({
          title: 'Error loading prescriptions',
          description: json.error || `Server error (${res.status})`,
          variant: 'destructive'
        })
        setPrescriptions([])
        return
      }
      
      if (Array.isArray(json.prescriptions)) {
        setPrescriptions(json.prescriptions)
        console.log('[ClinicalOrdersPanel] Set prescriptions:', json.prescriptions.length)
      } else {
        console.warn('[ClinicalOrdersPanel] Unexpected response format:', json)
        setPrescriptions([])
      }
    } catch (err) {
      console.error('[ClinicalOrdersPanel] CRITICAL: Network error loading prescriptions:', err)
      toast({
        title: 'Connection error',
        description: 'Could not load prescriptions. Please refresh the page.',
        variant: 'destructive'
      })
      setPrescriptions([])
    }
  }, [appointmentId, toast])

  const loadLabRequests = useCallback(async () => {
    try {
      const res = await fetch(`/api/appointments/${appointmentId}/lab-requests`, { credentials: 'include' })
      const json = await res.json()
      if (res.ok && Array.isArray(json.labRequests)) {
        setLabRequests(json.labRequests)
      }
    } catch (err) {
      console.error('[ClinicalOrdersPanel] loadLabRequests error:', err)
    }
  }, [appointmentId])

  // Map orderId -> threadId for prescriptions and lab requests (from threads API)
  const [orderToThread, setOrderToThread] = useState<Record<string, string>>({})

  const loadThreadsMap = useCallback(async () => {
    if (!appointmentId) return
    try {
      const res = await fetch(`/api/appointments/${appointmentId}/threads`, { credentials: 'include' })
      const json = await res.json()
      const map: Record<string, string> = {}
      for (const t of json.threads || []) {
        if (t.prescriptionId) map[`p:${t.prescriptionId}`] = t.threadId
        if (t.labRequestId) map[`l:${t.labRequestId}`] = t.threadId
      }
      setOrderToThread(map)
    } catch { /* ignore */ }
  }, [appointmentId])

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      await Promise.all([loadPrescriptions(), loadLabRequests()])
      await loadThreadsMap()
      setLoading(false)
    }
    loadData()
  }, [loadPrescriptions, loadLabRequests, loadThreadsMap])

  useAutoRefresh(async () => {
    await Promise.all([loadPrescriptions(), loadLabRequests()])
    await loadThreadsMap()
  }, 60_000, { enabled: !!appointmentId })

  // Auto-open tab and expand item when arriving with ?prescription= or ?labRequest= in URL
  useEffect(() => {
    if (loading) return
    if (initialPrescriptionId) {
      setActiveTab('prescriptions')
      setExpandedPrescriptionId(initialPrescriptionId)
    }
    if (initialLabRequestId) {
      setActiveTab('lab-requests')
      setExpandedLabRequestId(initialLabRequestId)
    }
  }, [loading, initialPrescriptionId, initialLabRequestId])

  // Auto-refresh on status changes (prescriptions, lab requests)
  useEffect(() => {
    if (!appointmentId) return
    const channel = supabase
      .channel(`clinical-orders-${appointmentId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'prescriptions',
        filter: `appointment_id=eq.${appointmentId}`,
      }, () => { loadPrescriptions() })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'lab_test_requests',
        filter: `appointment_id=eq.${appointmentId}`,
      }, () => { loadLabRequests() })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [appointmentId, loadPrescriptions, loadLabRequests, supabase])

  // Track loading to prevent duplicate fetches
  const loadingRef = useRef<Record<string, boolean>>({})
  const messagesEndRef = useRef<Record<string, HTMLDivElement | null>>({})
  const scrollAreaRefs = useRef<Record<string, HTMLDivElement | null>>({})
  
  // Scroll chat to bottom - tries viewport scroll first, then scrollIntoView
  const scrollChatToBottom = useCallback((orderId: string) => {
    const run = () => {
      const scrollContainer = scrollAreaRefs.current[orderId]
      const viewport = scrollContainer?.querySelector('[data-radix-scroll-area-viewport], [data-slot="scroll-area-viewport"]') as HTMLElement
      if (viewport) {
        viewport.scrollTo({ top: viewport.scrollHeight, behavior: 'smooth' })
      } else {
        const endRef = messagesEndRef.current[orderId]
        endRef?.scrollIntoView({ behavior: 'smooth', block: 'end' })
      }
    }
    requestAnimationFrame(() => requestAnimationFrame(run))
  }, [])

  // Auto-scroll messages to bottom when new messages arrive
  useEffect(() => {
    Object.keys(messages).forEach((orderId) => {
      if ((messages[orderId] || []).length > 0) {
        setTimeout(() => scrollChatToBottom(orderId), 150)
      }
    })
  }, [messages, scrollChatToBottom])

  // Handle resizing for chat windows
  useEffect(() => {
    if (!isResizing) return

    const handleMouseMove = (e: MouseEvent) => {
      const container = document.querySelector(`[data-order-id="${isResizing}"]`) as HTMLElement
      if (!container) return
      
      const rect = container.getBoundingClientRect()
      const newWidth = e.clientX - rect.left
      if (newWidth > 200 && newWidth < rect.width - 200) {
        setChatWidths(prev => ({ ...prev, [isResizing!]: newWidth }))
      }
    }

    const handleMouseUp = () => {
      setIsResizing(null)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isResizing])

  const getThreadId = useCallback((orderId: string, orderType: 'prescription' | 'lab') => {
    const key = orderType === 'prescription' ? `p:${orderId}` : `l:${orderId}`
    return orderToThread[key] ?? null
  }, [orderToThread])

  // Load messages for an order - use clinical-orders API (finds thread server-side, most reliable)
  const loadMessagesForOrder = useCallback(async (orderId: string, orderType: 'prescription' | 'lab', forceReload = false) => {
    if (!forceReload && loadingRef.current[orderId]) {
      console.log(`[loadMessagesForOrder] Already loading ${orderId}, skipping`)
      return
    }
    loadingRef.current[orderId] = true
    setMessagesLoading(prev => ({ ...prev, [orderId]: true }))
    try {
      const url = `/api/clinical-orders/${orderType}/${orderId}/messages`
      console.log(`[loadMessagesForOrder] Fetching: ${url}`)
      const res = await fetch(url, { credentials: 'include' })
      const json = await res.json()
      console.log(`[loadMessagesForOrder] Response status=${res.status}, messages=${json.messages?.length ?? 0}, threadId=${json.threadId}`)
      if (res.ok && Array.isArray(json.messages)) {
        console.log(`[loadMessagesForOrder] Setting ${json.messages.length} messages for orderId=${orderId}`)
        setMessages(prev => {
          const updated = { ...prev, [orderId]: json.messages }
          console.log(`[loadMessagesForOrder] Updated messages state, keys:`, Object.keys(updated))
          return updated
        })
        setTimeout(() => scrollChatToBottom(orderId), 250)
      } else {
        console.warn(`[loadMessagesForOrder] Invalid response or error:`, json)
        setMessages(prev => ({ ...prev, [orderId]: [] }))
      }
    } catch (err) {
      console.error('[loadMessagesForOrder] Error:', err)
      setMessages(prev => ({ ...prev, [orderId]: [] }))
    } finally {
      loadingRef.current[orderId] = false
      setMessagesLoading(prev => ({ ...prev, [orderId]: false }))
    }
  }, [scrollChatToBottom])

  // Send message - use clinical-orders API (finds thread server-side)
  const sendMessageForOrder = async (orderId: string, orderType: 'prescription' | 'lab') => {
    const content = messageInput[orderId]?.trim()
    if (!content || sendingMessage) return
    
    setSendingMessage(true)
    const tempId = `temp-${Date.now()}`
    
    // Get current user for optimistic message
    const { data: { user } } = await supabase.auth.getUser()
    let senderName = 'You'
    if (user) {
      const { data: prof } = await supabase
        .from('professionals')
        .select('business_name')
        .eq('auth_user_id', user.id)
        .maybeSingle()
      if (prof?.business_name) senderName = prof.business_name
    }
    
    // Optimistically add message
    const optimisticMessage: any = {
      id: tempId,
      content,
      message_type: 'text',
      created_at: new Date().toISOString(),
      sender_id: user?.id || '',
      is_deleted: false,
      sender: {
        id: user?.id || '',
        full_name: senderName,
        avatar_url: null,
      },
      chat_attachments: [],
    }
    
    setMessages(prev => {
      const current = prev[orderId] || []
      return { ...prev, [orderId]: [...current, optimisticMessage] }
    })
    setMessageInput(prev => ({ ...prev, [orderId]: '' }))
    
    try {
      const url = `/api/clinical-orders/${orderType}/${orderId}/messages`
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ content }),
      })
      const json = await res.json()
      
      if (!res.ok) {
        // Remove optimistic message on error
        setMessages(prev => {
          const current = prev[orderId] || []
          return { ...prev, [orderId]: current.filter((m: any) => m.id !== tempId) }
        })
        throw new Error(json.error || 'Failed to send message')
      }
      
      // Replace optimistic message with real one, or reload all
      if (json.message) {
        setMessages(prev => {
          const current = prev[orderId] || []
          const filtered = current.filter((m: any) => m.id !== tempId)
          return { ...prev, [orderId]: [...filtered, json.message] }
        })
        setTimeout(() => scrollChatToBottom(orderId), 150)
      } else {
        // Fallback: reload all messages
        await loadMessagesForOrder(orderId, orderType, true)
      }
    } catch (err) {
      console.error('[sendMessageForOrder] Error:', err)
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Failed to send message', variant: 'destructive' })
      // Remove optimistic message
      setMessages(prev => {
        const current = prev[orderId] || []
        return { ...prev, [orderId]: current.filter((m: any) => m.id !== tempId) }
      })
    }
    setSendingMessage(false)
  }

  // Upload file - prefer thread-based API
  const [uploadingFile, setUploadingFile] = useState<Record<string, boolean>>({})
  const fileInputRef = useRef<HTMLInputElement>(null)
  const fileInputOrderRef = useRef<{ orderId: string; orderType: 'prescription' | 'lab' } | null>(null)
  const uploadFileForOrder = useCallback(async (orderId: string, orderType: 'prescription' | 'lab', file: File) => {
    if (file.size > 15 * 1024 * 1024) {
      toast({ title: 'File too large', description: 'Max size is 15MB', variant: 'destructive' })
      return
    }
    setUploadingFile(prev => ({ ...prev, [orderId]: true }))
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onloadend = () => {
          const b = (reader.result as string)?.split(',')[1]
          if (b) resolve(b); else reject(new Error('Could not read file'))
        }
        reader.onerror = () => reject(reader.error)
        reader.readAsDataURL(file)
      })
      const url = `/api/clinical-orders/${orderType}/${orderId}/messages`
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ content: '', files: [{ name: file.name, type: file.type, size: file.size, base64 }] }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to upload')
      await loadMessagesForOrder(orderId, orderType, true)
      toast({ title: 'File uploaded', description: file.name })
    } catch (err) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Failed to upload file', variant: 'destructive' })
    } finally {
      setUploadingFile(prev => ({ ...prev, [orderId]: false }))
    }
  }, [loadMessagesForOrder, toast])

  // Get status step index for timeline
  const getStatusStepIndex = (status: string, steps: string[], statusMap?: Record<string, string>) => {
    // Completion statuses (picked_up, delivered) = full flow complete, show dispensed checked
    if (status === 'picked_up' || status === 'delivered' || status === 'partially_dispensed') {
      return steps.length - 1 // Last step (dispensed)
    }

    // Direct match
    let index = steps.indexOf(status)
    if (index >= 0) return index

    // Mapped status (expired, cancelled, fulfilled→completed, sent→sent_to_lab, etc.)
    const map = statusMap ?? PRESCRIPTION_STATUS_MAP
    const mappedStatus = map[status]
    if (mappedStatus) {
      index = steps.indexOf(mappedStatus)
      if (index >= 0) return index
    }

    return 0
  }

  // Check if status is a declined/denied status
  const isDeclinedStatus = (status: string) => status === 'declined' || status === 'denied'

  // Render status timeline - last step uses green when completed, shows declined as branch
  const renderStatusTimeline = (status: string, steps: string[], config: Record<string, any>, statusMap?: Record<string, string>, orderType?: 'prescription' | 'lab') => {
    const isDeclined = isDeclinedStatus(status)
    const currentIndex = isDeclined
      ? steps.indexOf(orderType === 'lab' ? 'sent_to_lab' : 'sent')
      : getStatusStepIndex(status, steps, statusMap)

    return (
      <div className="flex items-center gap-1 py-2 overflow-x-auto">
        {steps.map((step, i) => {
          const stepConfig = config[step] || { label: step, color: 'text-gray-500' }
          const isCompleted = !isDeclined && i <= currentIndex
          const isSentStep = step === 'sent' || step === 'sent_to_lab'
          const isCurrent = !isDeclined && i === currentIndex
          const isLastStep = i === steps.length - 1
          const useGreen = isLastStep && isCompleted
          const isBeforeDecline = isDeclined && i <= currentIndex

          return (
            <div key={step} className="flex items-center shrink-0">
              <div className="flex flex-col items-center min-w-[60px] relative">
                <div className={`
                  w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium
                  ${useGreen ? 'bg-green-600 text-white' : isCompleted || isBeforeDecline ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}
                  ${isCurrent ? (useGreen ? 'ring-2 ring-green-600 ring-offset-2' : 'ring-2 ring-primary ring-offset-2') : ''}
                `}>
                  {isCompleted || isBeforeDecline ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-3 w-3" />}
                </div>
                <span className={`text-[10px] mt-1 text-center leading-tight ${useGreen ? 'font-medium text-green-600 dark:text-green-400' : isCurrent || isBeforeDecline ? 'font-medium text-primary' : 'text-muted-foreground'}`}>
                  {stepConfig.label?.split(' ')[0] || step}
                </span>

                {isDeclined && isSentStep && (
                  <div className="absolute -right-3 top-0 flex items-center">
                    <div className="w-3 h-0.5 bg-red-500 rotate-45 origin-left ml-1" />
                    <div className="flex flex-col items-center ml-2 -mt-1">
                      <div className="w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center ring-2 ring-red-500 ring-offset-2">
                        <XCircle className="h-4 w-4" />
                      </div>
                      <span className="text-[10px] mt-1 text-center leading-tight font-medium text-red-600 dark:text-red-400">
                        {orderType === 'lab' ? 'Denied' : 'Declined'}
                      </span>
                    </div>
                  </div>
                )}
              </div>
              {i < steps.length - 1 && !isDeclined && (
                <div className={`w-4 h-0.5 ${
                  i < currentIndex
                    ? (i === steps.length - 2 && currentIndex === steps.length - 1 ? 'bg-green-600' : 'bg-primary')
                    : 'bg-muted'
                } mx-0.5`} />
              )}
              {i < steps.length - 1 && isDeclined && (
                <div className={`w-4 h-0.5 ${i < currentIndex ? 'bg-primary' : 'bg-muted'} mx-0.5`} />
              )}
            </div>
          )
        })}
      </div>
    )
  }

  // Actions - open PDF in new tab with doctor's branding (user can print or save)
  const fetchBranding = async (doctorId: string) => {
    try {
      const res = await fetch(`/api/professionals/${doctorId}/branding`, { credentials: 'include' })
      const json = await res.json()
      return res.ok ? json.branding : null
    } catch {
      return null
    }
  }

  const handlePrintPrescription = async (prescription: any) => {
    try {
      const { openPdfPrescription, getPrescriptionPrintHtml, openPrintWindow } = await import('@/lib/print-prescription-lab')
      const branding = prescription.doctor_id ? await fetchBranding(prescription.doctor_id) : null
      const ok = await openPdfPrescription(prescription, branding)
      if (!ok) {
        const fallback = openPrintWindow(getPrescriptionPrintHtml(prescription, branding), 'Prescription')
        if (!fallback) toast({ title: 'Print blocked', description: 'Allow pop-ups, then try again.', variant: 'destructive' })
        else toast({ title: 'Opened', description: 'Use browser Print or Save as PDF.' })
      }
    } catch (e) {
      console.error(e)
      toast({ title: 'Error', description: 'Failed to open PDF', variant: 'destructive' })
    }
  }

  const handlePrintLabRequest = async (labRequest: any) => {
    try {
      const { openPdfLabRequest, getLabRequestPrintHtml, openPrintWindow } = await import('@/lib/print-prescription-lab')
      const branding = labRequest.doctor_id ? await fetchBranding(labRequest.doctor_id) : null
      const hasResults = (labRequest.items || []).some(
        (item: any) => item.result_value || (labRequest.lab_fulfillment || []).find((f: any) => f.item_id === item.id)?.result_value
      )
      let labReportTemplate = null
      if (hasResults && labRequest.laboratory_id) {
        try {
          const res = await fetch(`/api/professionals/${labRequest.laboratory_id}/branding`, { credentials: 'include' })
          const json = await res.json()
          if (res.ok && json.labReportTemplate) labReportTemplate = json.labReportTemplate
        } catch (_) {}
      }
      const printOptions = labReportTemplate
        ? {
            labReportTemplate,
            reportId: labRequest.id,
            baseUrl: typeof window !== 'undefined' ? window.location.origin : '',
          }
        : undefined
      const ok = await openPdfLabRequest(labRequest, branding, printOptions)
      if (!ok) {
        const fallback = openPrintWindow(
          getLabRequestPrintHtml(labRequest, branding, printOptions),
          hasResults ? 'Lab Results' : 'Lab Request'
        )
        if (!fallback) toast({ title: 'Print blocked', description: 'Allow pop-ups, then try again.', variant: 'destructive' })
        else toast({ title: 'Opened', description: 'Use browser Print or Save as PDF.' })
      }
    } catch (e) {
      console.error(e)
      toast({ title: 'Error', description: 'Failed to open PDF', variant: 'destructive' })
    }
  }

  const handleSendPrescription = async (pharmacyId: string, pharmacyName: string) => {
    if (!selectedPrescriptionForSend) return
    if (!isOnline() && user?.id) {
      try {
        await addToSyncQueue(user.id, { type: 'prescription_send', payload: { id: selectedPrescriptionForSend, pharmacyId } }, 'Prescription send')
        toast({ title: 'Queued', description: 'Will sync when you\'re back online.' })
        setShowPharmacySelector(false)
        setSelectedPrescriptionForSend(null)
        setPendingSendToPharmacy(null)
        window.dispatchEvent(new CustomEvent('offline-sync-queued'))
      } catch (e) {
        toast({ title: 'Error', description: 'Failed to queue', variant: 'destructive' })
      }
      return
    }
    setSending(true)
    setPendingSendToPharmacy(null)
    try {
      const res = await fetch(`/api/prescriptions/${selectedPrescriptionForSend}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pharmacyId }),
        credentials: 'include',
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error || 'Failed to send prescription')
      
      toast({ title: 'Prescription sent', description: `Sent to ${pharmacyName}` })
      setShowPharmacySelector(false)
      setSelectedPrescriptionForSend(null)
      await loadPrescriptions()
      await loadThreadsMap()
      onThreadCreated?.('prescription', pharmacyId, pharmacyName)
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' })
    } finally {
      setSending(false)
    }
  }

  const handleSendLabRequest = async (labId: string, labName: string) => {
    if (!selectedLabRequestForSend) return
    if (!isOnline() && user?.id) {
      try {
        await addToSyncQueue(user.id, { type: 'lab_request_send', payload: { id: selectedLabRequestForSend, laboratoryId: labId } }, 'Lab request send')
        toast({ title: 'Queued', description: 'Will sync when you\'re back online.' })
        setShowLabSelector(false)
        setSelectedLabRequestForSend(null)
        setPendingSendToLab(null)
        window.dispatchEvent(new CustomEvent('offline-sync-queued'))
      } catch (e) {
        toast({ title: 'Error', description: 'Failed to queue', variant: 'destructive' })
      }
      return
    }
    setSending(true)
    setPendingSendToLab(null)
    try {
      const res = await fetch(`/api/lab-requests/${selectedLabRequestForSend}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ laboratoryId: labId }),
        credentials: 'include',
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error || 'Failed to send lab request')
      
      toast({ title: 'Lab request sent', description: `Sent to ${labName}` })
      setShowLabSelector(false)
      setSelectedLabRequestForSend(null)
      await loadLabRequests()
      await loadThreadsMap()
      onThreadCreated?.('lab', labId, labName)
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' })
    } finally {
      setSending(false)
    }
  }

  const handleDeletePrescription = async (prescriptionId: string) => {
    if (!confirm('Are you sure you want to delete this prescription?')) return
    try {
      const res = await fetch(`/api/prescriptions/${prescriptionId}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      if (!res.ok) throw new Error('Failed to delete prescription')
      toast({ title: 'Deleted', description: 'Prescription has been deleted' })
      loadPrescriptions()
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' })
    }
  }

  const handleDeleteLabRequest = async (labRequestId: string) => {
    if (!confirm('Are you sure you want to delete this lab request?')) return
    try {
      const res = await fetch(`/api/lab-requests/${labRequestId}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      if (!res.ok) throw new Error('Failed to delete lab request')
      toast({ title: 'Deleted', description: 'Lab request has been deleted' })
      loadLabRequests()
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' })
    }
  }

  // Resend declined prescription to another pharmacy
  const handleResendPrescription = async (prescriptionId: string) => {
    try {
      const res = await fetch(`/api/prescriptions/${prescriptionId}/resend`, {
        method: 'POST',
        credentials: 'include',
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to prepare resend')
      }
      toast({ title: 'Ready to Resend', description: 'Select a different pharmacy to send this prescription.' })
      await loadPrescriptions()
      setSelectedPrescriptionForSend(prescriptionId)
      setShowPharmacySelector(true)
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' })
    }
  }

  // Resend denied lab request to another laboratory
  const handleResendLabRequest = async (labRequestId: string) => {
    try {
      const res = await fetch(`/api/lab-requests/${labRequestId}/resend`, {
        method: 'POST',
        credentials: 'include',
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to prepare resend')
      }
      toast({ title: 'Ready to Resend', description: 'Select a different laboratory to send this request.' })
      await loadLabRequests()
      setSelectedLabRequestForSend(labRequestId)
      setShowLabSelector(true)
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' })
    }
  }

  const getStatusBadge = (status: string, type: 'prescription' | 'lab') => {
    // Hide "sent" status badges - orders are linked to tickets
    if (status === 'sent' || status === 'sent_to_lab') {
      return null
    }
    const config = type === 'prescription' 
      ? PRESCRIPTION_STATUS_CONFIG[status] || PRESCRIPTION_STATUS_CONFIG.active
      : LAB_STATUS_CONFIG[status] || LAB_STATUS_CONFIG.pending
    const Icon = config.icon
    return (
      <Badge variant="outline" className={`${config.bgColor} ${config.color} border font-medium`}>
        <Icon className="h-3 w-3 mr-1" />
        {config.label}
      </Badge>
    )
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 flex items-center justify-center">
          <LoadingSpinner size="lg" className="text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card className="overflow-hidden py-0 gap-0">
        <CardContent className="p-0">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <div className="border-b border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30 shrink-0">
              <TabsList className="w-full grid grid-cols-3 gap-0 rounded-none bg-transparent h-auto p-0 border-0 shadow-none">
              <TabsTrigger 
                value="prescriptions" 
                className="relative flex items-center justify-center gap-2.5 rounded-none py-4 px-6 font-medium text-sm transition-all duration-200
                  data-[state=inactive]:bg-slate-50 data-[state=inactive]:text-slate-500 data-[state=inactive]:hover:bg-slate-100 data-[state=inactive]:hover:text-slate-700
                  dark:data-[state=inactive]:bg-slate-800 dark:data-[state=inactive]:text-slate-300 dark:data-[state=inactive]:hover:bg-slate-700 dark:data-[state=inactive]:hover:text-slate-100
                  data-[state=active]:bg-gradient-to-b data-[state=active]:from-blue-50 data-[state=active]:to-white data-[state=active]:text-blue-700
                  dark:data-[state=active]:from-blue-950/60 dark:data-[state=active]:to-card dark:data-[state=active]:text-blue-300
                  data-[state=active]:shadow-[inset_0_-3px_0_0_rgb(59,130,246)] data-[state=active]:border-b-0
                  border-b border-slate-200 dark:border-slate-700"
              >
                {prescriptions.length === 0 && (
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-100 data-[state=active]:bg-blue-500 transition-colors group-data-[state=active]:bg-blue-500">
                    <Pill className="h-4 w-4 text-blue-600" />
                  </div>
                )}
                <span className="font-semibold">Prescriptions</span>
                {prescriptions.length > 0 && (
                  <Badge className="ml-1 bg-blue-500 hover:bg-blue-600 text-white border-0 px-2.5 py-0.5 text-xs font-bold rounded-full shadow-sm">
                    {prescriptions.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger 
                value="lab-tests" 
                className="relative flex items-center justify-center gap-2.5 rounded-none py-4 px-6 font-medium text-sm transition-all duration-200
                  data-[state=inactive]:bg-slate-50 data-[state=inactive]:text-slate-500 data-[state=inactive]:hover:bg-slate-100 data-[state=inactive]:hover:text-slate-700
                  dark:data-[state=inactive]:bg-slate-800 dark:data-[state=inactive]:text-slate-300 dark:data-[state=inactive]:hover:bg-slate-700 dark:data-[state=inactive]:hover:text-slate-100
                  data-[state=active]:bg-gradient-to-b data-[state=active]:from-violet-50 data-[state=active]:to-white data-[state=active]:text-violet-700
                  dark:data-[state=active]:from-violet-950/60 dark:data-[state=active]:to-card dark:data-[state=active]:text-violet-300
                  data-[state=active]:shadow-[inset_0_-3px_0_0_rgb(139,92,246)] data-[state=active]:border-b-0
                  border-b border-slate-200 dark:border-slate-700"
              >
                {labRequests.length === 0 && (
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-violet-100 transition-colors">
                    <FlaskConical className="h-4 w-4 text-violet-600" />
                  </div>
                )}
                <span className="font-semibold">Lab Tests</span>
                {labRequests.length > 0 && (
                  <Badge className="ml-1 bg-violet-500 hover:bg-violet-600 text-white border-0 px-2.5 py-0.5 text-xs font-bold rounded-full shadow-sm">
                    {labRequests.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger 
                value="documents" 
                className="relative flex items-center justify-center gap-2.5 rounded-none py-4 px-6 font-medium text-sm transition-all duration-200
                  data-[state=inactive]:bg-slate-50 data-[state=inactive]:text-slate-500 data-[state=inactive]:hover:bg-slate-100 data-[state=inactive]:hover:text-slate-700
                  dark:data-[state=inactive]:bg-slate-800 dark:data-[state=inactive]:text-slate-300 dark:data-[state=inactive]:hover:bg-slate-700 dark:data-[state=inactive]:hover:text-slate-100
                  data-[state=active]:bg-gradient-to-b data-[state=active]:from-slate-100 data-[state=active]:to-white data-[state=active]:text-slate-700
                  dark:data-[state=active]:from-slate-800 dark:data-[state=active]:to-card dark:data-[state=active]:text-slate-300
                  data-[state=active]:shadow-[inset_0_-3px_0_0_rgb(100,116,139)] data-[state=active]:border-b-0
                  border-b border-slate-200 dark:border-slate-700"
              >
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-slate-200 dark:bg-slate-600 transition-colors">
                  <Paperclip className="h-4 w-4 text-slate-600 dark:text-slate-300" />
                </div>
                <span className="font-semibold">Documents</span>
              </TabsTrigger>
            </TabsList>
            </div>

            <TabsContent value="prescriptions" className="m-0">
              {prescriptions.length === 0 ? (
                <div className="p-8 text-center bg-blue-50/80 dark:bg-blue-950/30 rounded-b-lg">
                  <Pill className="h-12 w-12 mx-auto text-blue-500/60 dark:text-blue-400/50 mb-3" />
                  <p className="text-blue-700/80 dark:text-blue-300/80 mb-4">No prescriptions yet</p>
                  <Button variant="outline" className="border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/40" onClick={() => setShowNewPrescriptionDialog(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create First Prescription
                  </Button>
                </div>
              ) : (
                <div className="divide-y">
                  <div className="flex justify-end p-3 border-b border-slate-100 dark:border-slate-800">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setShowNewPrescriptionDialog(true)}
                      className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950/40"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      New Prescription
                    </Button>
                  </div>
                  {prescriptions.map((rx, index) => (
                    <div key={rx.id} className="hover:bg-muted/30 transition-colors">
                      <div 
                        className="p-4 cursor-pointer flex items-center justify-between"
                        onClick={() => setExpandedPrescriptionId(expandedPrescriptionId === rx.id ? null : rx.id)}
                      >
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            index % 4 === 0 ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/60 dark:text-blue-300' :
                            index % 4 === 1 ? 'bg-purple-100 text-purple-600 dark:bg-purple-900/60 dark:text-purple-300' :
                            index % 4 === 2 ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/60 dark:text-emerald-300' :
                            'bg-amber-100 text-amber-600 dark:bg-amber-900/60 dark:text-amber-300'
                          }`}>
                            <Pill className="h-5 w-5" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium">{rx.prescription_number || `RX-${String(index + 1).padStart(4, '0')}`}</span>
                              {getStatusBadge(rx.status, 'prescription')}
                              {rx.family_member_id && rx.family_member && (
                                <Badge variant="outline" className="text-xs font-normal">
                                  For: {rx.family_member.full_name}
                                  {rx.family_member.date_of_birth && ` (${Math.floor((Date.now() - new Date(rx.family_member.date_of_birth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))} yrs)`}
                                </Badge>
                              )}
                            </div>
                            <div className="text-sm text-muted-foreground flex items-center gap-3 mt-1">
                              <span>{(rx.medications || []).length} medication(s)</span>
                              <span>•</span>
                              <span>{format(new Date(rx.created_at), 'MMM d, yyyy HH:mm')}</span>
                              {rx.pharmacy?.business_name && (
                                <>
                                  <span>•</span>
                                  <span className="flex items-center gap-1">
                                    <Building2 className="h-3 w-3" />
                                    {rx.pharmacy.business_name}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {(rx.status === 'active' && !rx.pharmacy?.id) && (
                                <DropdownMenuItem onClick={() => setEditingPrescription(rx)}>
                                  <Edit className="h-4 w-4 mr-2" />
                                  Edit
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem onClick={() => handlePrintPrescription(rx)}>
                                <Download className="h-4 w-4 mr-2" />
                                PDF
                              </DropdownMenuItem>
                              {(rx.status === 'active' && !rx.pharmacy?.id) && (
                                <DropdownMenuItem onClick={() => {
                                  setSelectedPrescriptionForSend(rx.id)
                                  setShowPharmacySelector(true)
                                }}>
                                  <Send className="h-4 w-4 mr-2" />
                                  Send to Pharmacy
                                </DropdownMenuItem>
                              )}
                              {rx.status === 'declined' && (
                                <DropdownMenuItem onClick={() => handleResendPrescription(rx.id)} className="text-blue-600">
                                  <RefreshCw className="h-4 w-4 mr-2" />
                                  Send to Another Pharmacy
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={() => handleDeletePrescription(rx.id)}
                                className="text-destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                          {expandedPrescriptionId === rx.id ? (
                            <ChevronUp className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                      </div>
                      
                      {expandedPrescriptionId === rx.id && (
                        <div className="px-4 pb-4 bg-gradient-to-b from-muted/30 to-muted/10 dark:from-muted/20 dark:to-muted/10">
                          {/* Status Timeline */}
                          <div className="mb-4 p-3 bg-white dark:bg-card rounded-lg border">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs font-medium text-muted-foreground uppercase">Progress</span>
                              <span className="text-xs text-muted-foreground">
                                {formatDistanceToNow(new Date(rx.created_at), { addSuffix: true })}
                              </span>
                            </div>
                            {renderStatusTimeline(rx.status, PRESCRIPTION_STEPS, PRESCRIPTION_STATUS_CONFIG, undefined, 'prescription')}
                          </div>
                          
                          {/* Sub-tabs for Details, Messages */}
                          <div className="bg-white dark:bg-card rounded-lg border overflow-hidden">
                            <div className="flex border-b">
                              <button
                                onClick={() => setPrescriptionSubTab(prev => ({ ...prev, [rx.id]: 'details' }))}
                                className={`flex-1 px-4 py-2.5 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
                                  getPrescriptionSubTab(rx.id) === 'details'
                                    ? 'bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary border-b-2 border-primary -mb-px'
                                    : 'text-muted-foreground hover:bg-muted/50'
                                }`}
                              >
                                <FileText className="h-4 w-4" />
                                Details
                              </button>
                              <button
                                onClick={() => {
                                  setPrescriptionSubTab(prev => ({ ...prev, [rx.id]: 'messages' }))
                                  if (!messages[rx.id]) loadMessagesForOrder(rx.id, 'prescription')
                                  // Mark messages as read when opening messages tab
                                  markAsRead(rx.id)
                                }}
                                className={`flex-1 px-4 py-2.5 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
                                  getPrescriptionSubTab(rx.id) === 'messages'
                                    ? 'bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary border-b-2 border-primary -mb-px'
                                    : 'text-muted-foreground hover:bg-muted/50'
                                }`}
                              >
                                <MessageSquare className="h-4 w-4" />
                                Messages
                                {(() => {
                                  const unread = getUnreadCount(rx.id)
                                  const total = messages[rx.id]?.length || 0
                                  if (unread > 0) {
                                    return <Badge className="h-5 min-w-5 px-1.5 bg-red-500 text-white animate-pulse">{unread}</Badge>
                                  } else if (total > 0) {
                                    return <Badge variant="secondary" className="h-5 min-w-5 px-1.5">{total}</Badge>
                                  }
                                  return null
                                })()}
                              </button>
                            </div>
                            
                            {/* Details Tab */}
                            {getPrescriptionSubTab(rx.id) === 'details' && (
                              <div className="p-4 space-y-4">
                                {rx.family_member_id && rx.family_member && (
                                  <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 dark:bg-amber-950/50 dark:border-amber-800">
                                    <span className="text-xs font-medium text-amber-700 dark:text-amber-300 uppercase">Patient</span>
                                    <p className="mt-1 text-amber-900 dark:text-amber-100 font-medium">
                                      {rx.family_member.full_name}
                                      {rx.family_member.date_of_birth && ` (${Math.floor((Date.now() - new Date(rx.family_member.date_of_birth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))} yrs)`}
                                    </p>
                                    {rx.family_member.allergies && (
                                      <p className="mt-0.5 text-sm text-amber-800 dark:text-amber-200">
                                        <strong>Allergies:</strong> {Array.isArray(rx.family_member.allergies)
                                          ? rx.family_member.allergies.map((a: any) => a?.name ?? a).filter(Boolean).join(', ')
                                          : String(rx.family_member.allergies)}
                                      </p>
                                    )}
                                  </div>
                                )}
                                {rx.diagnosis && (
                                  <div className="p-3 bg-blue-50 rounded-lg border border-blue-100 dark:bg-blue-950/50 dark:border-blue-800">
                                    <span className="text-xs font-medium text-blue-700 dark:text-blue-300 uppercase">Diagnosis</span>
                                    <p className="mt-1 text-blue-900 dark:text-blue-100">{rx.diagnosis}</p>
                                  </div>
                                )}
                                {/* Pharmacy Info: Estimated time and total price */}
                                {rx.pharmacy?.id && (rx.estimated_ready_at || rx.total_price) && (
                                  <div className="flex flex-wrap gap-4 p-3 bg-green-50 border border-green-200 rounded-lg mb-3 dark:bg-green-950/50 dark:border-green-800">
                                    {rx.estimated_ready_at && (
                                      <div className="flex items-center gap-2">
                                        <Clock className="h-4 w-4 text-green-600 dark:text-green-400" />
                                        <span className="text-sm text-green-700 dark:text-green-300">
                                          <strong>Ready:</strong> {new Date(rx.estimated_ready_at).toLocaleString()}
                                        </span>
                                      </div>
                                    )}
                                    {rx.total_price && (
                                      <div className="flex items-center gap-2">
                                        <span className="text-sm text-green-700 dark:text-green-300">
                                          <strong>Total:</strong> {rx.total_price.toLocaleString()} DZD
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                )}
                                <div className="rounded-lg border overflow-auto">
                                  <Table className="table-auto">
                                    <TableHeader>
                                      <TableRow className="bg-muted/50">
                                        <TableHead className="font-semibold whitespace-nowrap">Medication</TableHead>
                                        <TableHead className="whitespace-nowrap">Form</TableHead>
                                        <TableHead className="whitespace-nowrap">Dosage</TableHead>
                                        <TableHead className="whitespace-nowrap text-center">Qty</TableHead>
                                        <TableHead className="whitespace-nowrap">Frequency</TableHead>
                                        <TableHead className="whitespace-nowrap">Duration</TableHead>
                                        {rx.pharmacy?.id && (
                                          <>
                                            <TableHead className="bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-200 font-semibold whitespace-nowrap">Status</TableHead>
                                            <TableHead className="bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-200 text-center whitespace-nowrap">Disp.</TableHead>
                                            <TableHead className="bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-200 text-right whitespace-nowrap">Price</TableHead>
                                            <TableHead className="bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-200 whitespace-nowrap" style={{minWidth: '180px'}}>Notes / Substitute</TableHead>
                                            <TableHead className="bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-200 text-center whitespace-nowrap">Action</TableHead>
                                          </>
                                        )}
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {(rx.medications || []).map((med: any, i: number) => {
                                        const fulfillment = rx.pharmacy_fulfillment?.find((f: any) => f.medication_index === i) || null
                                        const needsApproval = fulfillment?.requires_doctor_approval && fulfillment?.doctor_approved === undefined
                                        const isPendingApproval = fulfillment?.status === 'pending_approval'
                                        return (
                                          <TableRow key={i} className={
                                            fulfillment?.status === 'out_of_stock' ? 'bg-red-50 dark:bg-red-950/40' :
                                            isPendingApproval || needsApproval ? 'bg-amber-50 dark:bg-amber-950/40' :
                                            fulfillment?.status === 'substituted' ? 'bg-purple-50 dark:bg-purple-950/40' :
                                            fulfillment?.status === 'partial' ? 'bg-yellow-50 dark:bg-yellow-950/40' :
                                            i % 2 === 0 ? 'bg-white dark:bg-card' : 'bg-muted/20 dark:bg-muted/30'
                                          }>
                                            <TableCell className="font-medium">{med.medication_name || '—'}</TableCell>
                                            <TableCell>{med.form || '—'}</TableCell>
                                            <TableCell>{med.dosage || '—'}</TableCell>
                                            <TableCell>{med.quantity || '—'}</TableCell>
                                            <TableCell>{med.frequency || '—'}</TableCell>
                                            <TableCell>{med.duration || '—'}</TableCell>
                                            {rx.pharmacy?.id && (
                                              <>
                                                <TableCell>
                                                  {fulfillment ? (
                                                    <div className="space-y-1">
                                                      <Badge variant={
                                                        fulfillment.status === 'available' ? 'default' :
                                                        fulfillment.status === 'out_of_stock' ? 'destructive' : 
                                                        fulfillment.status === 'pending_approval' ? 'outline' : 'secondary'
                                                      } className="text-xs">
                                                        {fulfillment.status === 'available' ? '✓ Available' :
                                                         fulfillment.status === 'partial' ? '⚠ Partial' :
                                                         fulfillment.status === 'out_of_stock' ? '✗ Out of stock' : 
                                                         fulfillment.status === 'pending_approval' ? '⏳ Pending' : '↔ Substituted'}
                                                      </Badge>
                                                      {fulfillment.doctor_approved !== undefined && (
                                                        <Badge variant={fulfillment.doctor_approved ? 'default' : 'destructive'} className="text-xs block w-fit">
                                                          {fulfillment.doctor_approved ? '✓ Approved' : '✗ Rejected'}
                                                        </Badge>
                                                      )}
                                                    </div>
                                                  ) : (
                                                    <span className="text-muted-foreground text-xs">Pending</span>
                                                  )}
                                                </TableCell>
                                                <TableCell className="text-center">
                                                  {fulfillment?.dispensed_quantity ?? (fulfillment?.status === 'available' ? med.quantity : '—')}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                  {fulfillment?.unit_price ? `${fulfillment.unit_price.toLocaleString()} DZD` : '—'}
                                                </TableCell>
                                                <TableCell className="text-xs max-w-[180px]">
                                                  <div className="space-y-0.5">
                                                    {fulfillment?.substitute_name && (
                                                      <div className="text-purple-700 font-medium">
                                                        ↔ {fulfillment.substitute_name}{fulfillment.substitute_dosage ? ` ${fulfillment.substitute_dosage}` : ''}
                                                      </div>
                                                    )}
                                                    {fulfillment?.back_order_date && (
                                                      <div className="text-amber-600">Expected: {new Date(fulfillment.back_order_date).toLocaleDateString()}</div>
                                                    )}
                                                    {fulfillment?.pharmacy_notes && (
                                                      <div className="text-muted-foreground">{fulfillment.pharmacy_notes}</div>
                                                    )}
                                                    {fulfillment?.doctor_approval_notes && (
                                                      <div className="text-blue-600 italic">Dr: {fulfillment.doctor_approval_notes}</div>
                                                    )}
                                                    {!fulfillment?.substitute_name && !fulfillment?.pharmacy_notes && !fulfillment?.back_order_date && '—'}
                                                  </div>
                                                </TableCell>
                                                <TableCell className="text-center">
                                                  {(needsApproval || isPendingApproval) ? (
                                                    <div className="flex gap-1">
                                                      <Button 
                                                        size="sm" 
                                                        variant="outline" 
                                                        className="h-7 px-2 text-xs bg-green-50 hover:bg-green-100 border-green-300"
                                                        onClick={async () => {
                                                          try {
                                                            const res = await fetch(`/api/prescriptions/${rx.id}/approve-substitution`, {
                                                              method: 'POST',
                                                              headers: { 'Content-Type': 'application/json' },
                                                              body: JSON.stringify({ medication_index: i, approved: true }),
                                                              credentials: 'include',
                                                            })
                                                            if (!res.ok) throw new Error('Failed to approve')
                                                            toast({ title: 'Approved', description: 'Substitution approved' })
                                                            loadPrescriptions()
                                                          } catch (e) {
                                                            toast({ title: 'Error', description: 'Failed to approve', variant: 'destructive' })
                                                          }
                                                        }}
                                                      >
                                                        <CheckCircle className="h-3 w-3" />
                                                      </Button>
                                                      <Button 
                                                        size="sm" 
                                                        variant="outline" 
                                                        className="h-7 px-2 text-xs bg-red-50 hover:bg-red-100 border-red-300"
                                                        onClick={async () => {
                                                          const reason = prompt('Reason for rejection (optional):')
                                                          try {
                                                            const res = await fetch(`/api/prescriptions/${rx.id}/approve-substitution`, {
                                                              method: 'POST',
                                                              headers: { 'Content-Type': 'application/json' },
                                                              body: JSON.stringify({ medication_index: i, approved: false, notes: reason }),
                                                              credentials: 'include',
                                                            })
                                                            if (!res.ok) throw new Error('Failed to reject')
                                                            toast({ title: 'Rejected', description: 'Substitution rejected' })
                                                            loadPrescriptions()
                                                          } catch (e) {
                                                            toast({ title: 'Error', description: 'Failed to reject', variant: 'destructive' })
                                                          }
                                                        }}
                                                      >
                                                        <XCircle className="h-3 w-3" />
                                                      </Button>
                                                    </div>
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
                                    {/* Total Price Footer */}
                                    {rx.pharmacy?.id && rx.total_price && (
                                      <tfoot>
                                        <TableRow className="bg-muted/50 border-t-2">
                                          <TableCell colSpan={8} className="text-right font-semibold">Total:</TableCell>
                                          <TableCell className="text-right font-bold">{rx.total_price.toLocaleString()} DZD</TableCell>
                                          <TableCell colSpan={2}></TableCell>
                                        </TableRow>
                                      </tfoot>
                                    )}
                                  </Table>
                                </div>
                                {rx.notes && (
                                  <div className="p-3 bg-amber-50 rounded-lg border border-amber-100 dark:bg-amber-950/50 dark:border-amber-800">
                                    <span className="text-xs font-medium text-amber-700 dark:text-amber-300 uppercase">Patient Notes</span>
                                    <p className="mt-1 text-sm text-amber-900 dark:text-amber-100">{rx.notes}</p>
                                  </div>
                                )}
                                <div className="flex gap-2 pt-2">
                                  {(rx.status === 'active' && !rx.pharmacy?.id) && (
                                    <Button size="sm" variant="outline" onClick={() => setEditingPrescription(rx)}>
                                      <Edit className="h-4 w-4 mr-1" />
                                      Edit
                                    </Button>
                                  )}
                                  <Button size="sm" variant="outline" onClick={() => handlePrintPrescription(rx)}>
                                    <Download className="h-4 w-4 mr-1" />
                                    PDF
                                  </Button>
                                  {(rx.status === 'active' && !rx.pharmacy?.id) && (
                                    <Button size="sm" className="bg-primary" onClick={() => {
                                      setSelectedPrescriptionForSend(rx.id)
                                      setShowPharmacySelector(true)
                                    }}>
                                      <Send className="h-4 w-4 mr-1" />
                                      Send to Pharmacy
                                    </Button>
                                  )}
                                  {rx.status === 'declined' && (
                                    <Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={() => handleResendPrescription(rx.id)}>
                                      <RefreshCw className="h-4 w-4 mr-1" />
                                      Send to Another Pharmacy
                                    </Button>
                                  )}
                                </div>
                              </div>
                            )}
                            
                            {/* Messages Tab - split: messages left, files right */}
                            {getPrescriptionSubTab(rx.id) === 'messages' && (
                              <div className="p-4 flex flex-col min-h-[420px]">
                                {!rx.pharmacy?.id ? (
                                  <div className="text-center py-8">
                                    <MessageSquare className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
                                    <p className="text-muted-foreground mb-3">Send this prescription to a pharmacy to start messaging</p>
                                    <Button size="sm" onClick={() => {
                                      setSelectedPrescriptionForSend(rx.id)
                                      setShowPharmacySelector(true)
                                    }}>
                                      <Send className="h-4 w-4 mr-1" />
                                      Send to Pharmacy
                                    </Button>
                                  </div>
                                ) : messagesLoading[rx.id] ? (
                                  <div className="flex items-center justify-center py-8">
                                    <LoadingSpinner size="lg" className="text-primary" />
                                  </div>
                                ) : (
                                  <div className="flex gap-0 min-h-[380px] relative flex-1" data-order-id={rx.id}>
                                    {/* Left: Messages */}
                                    <div 
                                      className="flex flex-col relative border-r flex-1 min-h-0"
                                      style={{ width: chatWidths[rx.id] || 'calc(100% - 200px)', minWidth: '200px' }}
                                    >
                                      <ScrollArea 
                                        ref={(el) => { if (el) scrollAreaRefs.current[rx.id] = el as HTMLDivElement }}
                                        className="flex-1 min-h-[200px] max-h-[400px] pr-2 border rounded-md p-3"
                                        style={{ height: chatHeights[rx.id] || 300, minHeight: chatHeights[rx.id] ?? 240 }}
                                      >
                                        {(messages[rx.id] || []).length === 0 ? (
                                          <div className="text-center py-6 text-muted-foreground">
                                            <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                            <p>No messages yet. Start the conversation!</p>
                                          </div>
                                        ) : (
                                          <div className="space-y-3">
                                            {(messages[rx.id] || []).map((msg: any, idx: number, arr: any[]) => (
                                              <div key={msg.id} className="flex gap-3">
                                                <Avatar className="h-8 w-8 flex-shrink-0">
                                                  <AvatarImage src={msg.sender?.avatar_url} />
                                                  <AvatarFallback className="bg-primary/10 text-primary text-xs">
                                                    {(msg.sender?.full_name || msg.sender?.business_name || '?')[0]}
                                                  </AvatarFallback>
                                                </Avatar>
                                                <div className="flex-1 min-w-0">
                                                  <div className="flex items-center gap-2">
                                                    <span className={`text-sm font-bold truncate ${(msg.sender_id === currentUserId || msg.sender?.id === currentUserId) ? 'text-teal-600 dark:text-teal-400' : 'text-blue-600 dark:text-blue-400'}`}>{msg.sender?.full_name || msg.sender?.business_name || 'Unknown'}</span>
                                                    <span className="text-xs text-muted-foreground flex-shrink-0">
                                                      {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                                                    </span>
                                                  </div>
                                                  <p className={`text-sm mt-0.5 break-words line-clamp-2 ${(msg.content || '').toLowerCase().includes('declined') || (msg.content || '').toLowerCase().includes('denied') ? 'text-red-600 dark:text-red-400 font-medium bg-red-50 dark:bg-red-950/30 px-2 py-1 rounded' : ''}`}>{msg.content}</p>
                                                  {(msg.chat_attachments?.length ?? 0) > 0 && (
                                                    <div className="mt-1 flex flex-wrap gap-2">
                                                      {msg.chat_attachments.map((att: any) => {
                                                        const fileUrl = att.storage_path?.startsWith('http')
                                                          ? att.storage_path
                                                          : att.storage_path
                                                            ? supabase.storage.from('chat-attachments').getPublicUrl(att.storage_path).data.publicUrl
                                                            : null
                                                        const isImage = (att.file_type || '').startsWith('image/')
                                                        return isImage && fileUrl ? (
                                                          <button
                                                            key={att.id}
                                                            type="button"
                                                            onClick={() => setImagePreviewUrl(fileUrl)}
                                                            className="block text-left"
                                                          >
                                                            <img
                                                              src={fileUrl}
                                                              alt={att.file_name || 'Image'}
                                                              className="max-w-[120px] max-h-[120px] rounded-lg border border-border object-cover hover:opacity-90 transition-opacity"
                                                              loading="lazy"
                                                            />
                                                          </button>
                                                        ) : (
                                                          <a
                                                            key={att.id}
                                                            href={fileUrl || '#'}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-xs px-1.5 py-0.5 bg-muted rounded inline-flex items-center gap-1 hover:bg-muted/80"
                                                          >
                                                            <Paperclip className="h-3 w-3" />
                                                            {att.file_name || 'File'}
                                                          </a>
                                                        )
                                                      })}
                                                    </div>
                                                  )}
                                                </div>
                                              </div>
                                            ))}
                                            <div ref={(el) => { messagesEndRef.current[rx.id] = el }} />
                                          </div>
                                        )}
                                      </ScrollArea>
                                      {rx.pharmacy?.id ? (
                                        <div className="flex gap-2 pt-2 border-t mt-2">
                                          <input
                                            type="file"
                                            ref={fileInputRef}
                                            className="hidden"
                                            accept="image/*,.pdf,.doc,.docx"
                                            onChange={(e) => {
                                              const f = e.target.files?.[0]
                                              if (f && fileInputOrderRef.current) {
                                                uploadFileForOrder(fileInputOrderRef.current.orderId, fileInputOrderRef.current.orderType, f)
                                                e.target.value = ''
                                              }
                                            }}
                                          />
                                          <Button
                                            size="icon"
                                            variant="outline"
                                            disabled={!!uploadingFile[rx.id]}
                                            onClick={() => {
                                              fileInputOrderRef.current = { orderId: rx.id, orderType: 'prescription' }
                                              fileInputRef.current?.click()
                                            }}
                                          >
                                            {uploadingFile[rx.id] ? <LoadingSpinner size="sm" /> : <Paperclip className="h-4 w-4" />}
                                          </Button>
                                          <Input
                                            placeholder="Type a message..."
                                            value={messageInput[rx.id] || ''}
                                            onChange={(e) => setMessageInput(prev => ({ ...prev, [rx.id]: e.target.value }))}
                                            onKeyDown={(e) => {
                                              if (e.key === 'Enter' && !e.shiftKey) {
                                                e.preventDefault()
                                                sendMessageForOrder(rx.id, 'prescription')
                                              }
                                            }}
                                            className="flex-1"
                                          />
                                          <Button 
                                            size="icon"
                                            onClick={() => sendMessageForOrder(rx.id, 'prescription')}
                                            disabled={sendingMessage || !messageInput[rx.id]?.trim()}
                                          >
                                            {sendingMessage ? <LoadingSpinner size="sm" /> : <Send className="h-4 w-4" />}
                                          </Button>
                                        </div>
                                      ) : (
                                        <div className="pt-2 border-t mt-2">
                                          <p className="text-xs text-muted-foreground text-center py-2">Send this prescription to a pharmacy to start messaging</p>
                                        </div>
                                      )}
                                    </div>
                                    {/* Resize handle - hidden on mobile */}
                                    <div 
                                      className="w-1 cursor-col-resize hover:bg-primary/30 bg-border transition-colors z-10 flex-shrink-0 hidden md:block"
                                      onMouseDown={(e) => {
                                        setIsResizing(rx.id)
                                        e.preventDefault()
                                      }}
                                    />
                                    {/* Right: Files attached - hidden on mobile */}
                                    <div 
                                      className="flex-shrink-0 pl-4 hidden md:flex flex-col"
                                      style={{ width: chatWidths[rx.id] ? `calc(100% - ${chatWidths[rx.id]}px - 4px)` : '200px', minWidth: '150px' }}
                                    >
                                      <button
                                        onClick={() => setFilesCollapsed(prev => ({ ...prev, [rx.id]: !prev[rx.id] }))}
                                        className="flex items-center justify-between w-full mb-2 hover:bg-muted/50 rounded px-2 py-1.5 transition-colors group"
                                      >
                                        <p className="text-xs font-semibold text-muted-foreground uppercase">Files</p>
                                        {filesCollapsed[rx.id] ? (
                                          <ChevronDown className="h-3 w-3 text-muted-foreground group-hover:text-primary transition-colors" />
                                        ) : (
                                          <ChevronUp className="h-3 w-3 text-muted-foreground group-hover:text-primary transition-colors" />
                                        )}
                                      </button>
                                      {!filesCollapsed[rx.id] && (() => {
                                        const msgs = messages[rx.id] || []
                                        const fileItems = msgs.flatMap((m: any) =>
                                          (m.chat_attachments || []).map((att: any) => ({ ...att, created_at: m.created_at }))
                                        )
                                        if (fileItems.length === 0) {
                                          return <p className="text-xs text-muted-foreground">No files yet</p>
                                        }
                                        return (
                                          <div className="space-y-1.5 max-h-[220px] overflow-y-auto">
                                            {fileItems.map((att: any) => {
                                              const fileUrl = att.storage_path?.startsWith('http')
                                                ? att.storage_path
                                                : att.storage_path
                                                  ? supabase.storage.from('chat-attachments').getPublicUrl(att.storage_path).data.publicUrl
                                                  : null
                                              const isImage = (att.file_type || '').startsWith('image/')
                                              return (
                                                <button
                                                  key={att.id}
                                                  onClick={() => {
                                                    if (isImage && fileUrl) setImagePreviewUrl(fileUrl)
                                                    else if (fileUrl) window.open(fileUrl, '_blank')
                                                  }}
                                                  className="w-full flex items-center gap-2 p-1.5 rounded border bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer text-left"
                                                >
                                                  {isImage && fileUrl ? (
                                                    <img
                                                      src={fileUrl}
                                                      alt={att.file_name || 'Image'}
                                                      className="h-10 w-10 rounded object-cover flex-shrink-0"
                                                    />
                                                  ) : (
                                                    <File className="h-4 w-4 text-primary flex-shrink-0" />
                                                  )}
                                                  <div className="min-w-0 flex-1">
                                                    <span className="text-xs truncate block text-primary font-medium">{att.file_name || 'File'}</span>
                                                    <span className="text-[10px] text-muted-foreground">{formatDistanceToNow(new Date(att.created_at || 0), { addSuffix: true })}</span>
                                                  </div>
                                                  {fileUrl && <ExternalLink className="h-3 w-3 text-muted-foreground flex-shrink-0" />}
                                                </button>
                                              )
                                            })}
                                          </div>
                                        )
                                      })()}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="lab-tests" className="m-0">
              {labRequests.length === 0 ? (
                <div className="p-8 text-center bg-violet-50/80 dark:bg-violet-950/30 rounded-b-lg">
                  <FlaskConical className="h-12 w-12 mx-auto text-violet-500/60 dark:text-violet-400/50 mb-3" />
                  <p className="text-violet-700/80 dark:text-violet-300/80 mb-4">No lab tests requested yet</p>
                  <Button variant="outline" className="border-violet-200 dark:border-violet-800 hover:bg-violet-100 dark:hover:bg-violet-900/40" onClick={() => setShowNewLabRequestDialog(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Request First Lab Test
                  </Button>
                </div>
              ) : (
                <div className="divide-y">
                  <div className="flex justify-end p-3 border-b border-slate-100 dark:border-slate-800">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setShowNewLabRequestDialog(true)}
                      className="text-violet-600 hover:text-violet-700 hover:bg-violet-50 dark:text-violet-400 dark:hover:bg-violet-950/40"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      New Lab Test
                    </Button>
                  </div>
                  {labRequests.map((lr, index) => (
                    <div key={lr.id} className="hover:bg-muted/30 transition-colors">
                      <div 
                        className="p-4 cursor-pointer flex items-center justify-between"
                        onClick={() => setExpandedLabRequestId(expandedLabRequestId === lr.id ? null : lr.id)}
                      >
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            lr.priority === 'urgent' ? 'bg-red-100 text-red-600 dark:bg-red-900/60 dark:text-red-300' :
                            index % 3 === 0 ? 'bg-violet-100 text-violet-600 dark:bg-violet-900/60 dark:text-violet-300' :
                            index % 3 === 1 ? 'bg-cyan-100 text-cyan-600 dark:bg-cyan-900/60 dark:text-cyan-300' :
                            'bg-teal-100 text-teal-600 dark:bg-teal-900/60 dark:text-teal-300'
                          }`}>
                            <FlaskConical className="h-5 w-5" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium">{lr.request_number || `LT-${String(index + 1).padStart(4, '0')}`}</span>
                              {getStatusBadge(lr.status, 'lab')}
                              {lr.priority === 'urgent' && (
                                <Badge variant="destructive" className="text-xs">URGENT</Badge>
                              )}
                              {lr.family_member_id && lr.family_member && (
                                <Badge variant="outline" className="text-xs font-normal">
                                  For: {lr.family_member.full_name}
                                  {lr.family_member.date_of_birth && ` (${Math.floor((Date.now() - new Date(lr.family_member.date_of_birth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))} yrs)`}
                                </Badge>
                              )}
                            </div>
                            <div className="text-sm text-muted-foreground flex items-center gap-3 mt-1">
                              <span>{(lr.items || []).length} test(s)</span>
                              <span>•</span>
                              <span>{format(new Date(lr.created_at), 'MMM d, yyyy HH:mm')}</span>
                              {lr.laboratory?.business_name && (
                                <>
                                  <span>•</span>
                                  <span className="flex items-center gap-1">
                                    <Building2 className="h-3 w-3" />
                                    {lr.laboratory.business_name}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {(lr.status === 'pending' && !lr.laboratory?.id) && (
                                <DropdownMenuItem onClick={() => setEditingLabRequest(lr)}>
                                  <Edit className="h-4 w-4 mr-2" />
                                  Edit
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem onClick={() => handlePrintLabRequest(lr)}>
                                <Download className="h-4 w-4 mr-2" />
                                PDF
                              </DropdownMenuItem>
                              {(lr.status === 'pending' && !lr.laboratory?.id) && (
                                <DropdownMenuItem onClick={() => {
                                  setSelectedLabRequestForSend(lr.id)
                                  setShowLabSelector(true)
                                }}>
                                  <Send className="h-4 w-4 mr-2" />
                                  Send to Laboratory
                                </DropdownMenuItem>
                              )}
                              {lr.status === 'denied' && (
                                <DropdownMenuItem onClick={() => handleResendLabRequest(lr.id)} className="text-violet-600">
                                  <RefreshCw className="h-4 w-4 mr-2" />
                                  Send to Another Lab
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={() => handleDeleteLabRequest(lr.id)}
                                className="text-destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                          {expandedLabRequestId === lr.id ? (
                            <ChevronUp className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                      </div>
                      
                      {expandedLabRequestId === lr.id && (
                        <div className="px-4 pb-4 bg-gradient-to-b from-violet-50/50 to-muted/10 dark:from-violet-950/30 dark:to-muted/20">
                          {/* Status Timeline */}
                          <div className="mb-4 p-3 bg-white dark:bg-card rounded-lg border">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs font-medium text-muted-foreground uppercase">Progress</span>
                              <span className="text-xs text-muted-foreground">
                                {formatDistanceToNow(new Date(lr.created_at), { addSuffix: true })}
                              </span>
                            </div>
                            {renderStatusTimeline(lr.status, LAB_STEPS, LAB_STATUS_CONFIG, LAB_STATUS_MAP, 'lab')}
                          </div>
                          
                          {/* Sub-tabs for Details, Messages */}
                          <div className="bg-white dark:bg-card rounded-lg border overflow-hidden">
                            <div className="flex border-b">
                              <button
                                onClick={() => setLabSubTab(prev => ({ ...prev, [lr.id]: 'details' }))}
                                className={`flex-1 px-4 py-2.5 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
                                  getLabSubTab(lr.id) === 'details'
                                    ? 'bg-violet-100/50 text-violet-700 dark:bg-violet-900/50 dark:text-violet-200 border-b-2 border-violet-500 -mb-px'
                                    : 'text-muted-foreground hover:bg-muted/50'
                                }`}
                              >
                                <FlaskConical className="h-4 w-4" />
                                Details
                              </button>
                              <button
                                onClick={() => setLabSubTab(prev => ({ ...prev, [lr.id]: 'documents' }))}
                                className={`flex-1 px-4 py-2.5 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
                                  getLabSubTab(lr.id) === 'documents'
                                    ? 'bg-violet-100/50 text-violet-700 dark:bg-violet-900/50 dark:text-violet-200 border-b-2 border-violet-500 -mb-px'
                                    : 'text-muted-foreground hover:bg-muted/50'
                                }`}
                              >
                                <FileText className="h-4 w-4" />
                                Documents
                              </button>
                              <button
                                onClick={() => {
                                  setLabSubTab(prev => ({ ...prev, [lr.id]: 'messages' }))
                                  if (!messages[lr.id]) loadMessagesForOrder(lr.id, 'lab')
                                  // Mark messages as read when opening messages tab
                                  markAsRead(lr.id)
                                }}
                                className={`flex-1 px-4 py-2.5 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
                                  getLabSubTab(lr.id) === 'messages'
                                    ? 'bg-violet-100/50 text-violet-700 dark:bg-violet-900/50 dark:text-violet-200 border-b-2 border-violet-500 -mb-px'
                                    : 'text-muted-foreground hover:bg-muted/50'
                                }`}
                              >
                                <MessageSquare className="h-4 w-4" />
                                Messages
                                {(() => {
                                  const unread = getUnreadCount(lr.id)
                                  const total = messages[lr.id]?.length || 0
                                  if (unread > 0) {
                                    return <Badge className="h-5 min-w-5 px-1.5 bg-red-500 text-white animate-pulse">{unread}</Badge>
                                  } else if (total > 0) {
                                    return <Badge variant="secondary" className="h-5 min-w-5 px-1.5">{total}</Badge>
                                  }
                                  return null
                                })()}
                              </button>
                            </div>
                            
                            {/* Details Tab */}
                            {getLabSubTab(lr.id) === 'details' && (
                              <div className="p-4 space-y-4">
                                {lr.family_member_id && lr.family_member && (
                                  <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 dark:bg-amber-950/50 dark:border-amber-800">
                                    <span className="text-xs font-medium text-amber-700 dark:text-amber-300 uppercase">Patient</span>
                                    <p className="mt-1 text-amber-900 dark:text-amber-100 font-medium">
                                      {lr.family_member.full_name}
                                      {lr.family_member.date_of_birth && ` (${Math.floor((Date.now() - new Date(lr.family_member.date_of_birth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))} yrs)`}
                                    </p>
                                    {lr.family_member.allergies && (
                                      <p className="mt-0.5 text-sm text-amber-800 dark:text-amber-200">
                                        <strong>Allergies:</strong> {Array.isArray(lr.family_member.allergies)
                                          ? lr.family_member.allergies.map((a: any) => a?.name ?? a).filter(Boolean).join(', ')
                                          : String(lr.family_member.allergies)}
                                      </p>
                                    )}
                                  </div>
                                )}
                                {lr.diagnosis && (
                                  <div className="p-3 bg-violet-50 rounded-lg border border-violet-100 dark:bg-violet-950/50 dark:border-violet-800">
                                    <span className="text-xs font-medium text-violet-700 dark:text-violet-300 uppercase">Diagnosis</span>
                                    <p className="mt-1 text-violet-900 dark:text-violet-100">{lr.diagnosis}</p>
                                  </div>
                                )}
                                {lr.clinical_notes && (
                                  <div className="p-3 bg-cyan-50 rounded-lg border border-cyan-100 dark:bg-cyan-950/50 dark:border-cyan-800">
                                    <span className="text-xs font-medium text-cyan-700 dark:text-cyan-300 uppercase">Clinical Notes</span>
                                    <p className="mt-1 text-cyan-900 dark:text-cyan-100">{lr.clinical_notes}</p>
                                  </div>
                                )}
                                <div className="rounded-lg border overflow-hidden">
                                  <Table>
                                    <TableHeader>
                                      <TableRow className="bg-muted/50 dark:bg-muted/40">
                                        <TableHead className="w-12">#</TableHead>
                                        <TableHead className="font-semibold">Test Name</TableHead>
                                        <TableHead>Category</TableHead>
                                        {['fulfilled', 'completed'].includes(lr.status) && (
                                          <>
                                            <TableHead>Result</TableHead>
                                            <TableHead>Ref. Range</TableHead>
                                          </>
                                        )}
                                        {['processing', 'sample_collected', 'fulfilled', 'completed'].includes(lr.status) && (
                                          <TableHead>Status</TableHead>
                                        )}
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {(lr.items || []).map((item: any, i: number) => {
                                        const fulfillment = (lr.lab_fulfillment || []).find((f: any) => f.item_id === item?.id)
                                        const itemStatus = fulfillment?.status
                                        const resultValue = item.result_value ?? fulfillment?.result_value
                                        const resultUnit = item.result_unit ?? fulfillment?.result_unit
                                        const refRange = item.reference_range ?? fulfillment?.reference_range
                                        const resultStatus = item.result_status ?? fulfillment?.result_status
                                        const showResults = ['fulfilled', 'completed'].includes(lr.status)
                                        return (
                                          <TableRow key={i} className={i % 2 === 0 ? 'bg-white dark:bg-card' : 'bg-muted/20 dark:bg-muted/30'}>
                                            <TableCell className="text-muted-foreground font-medium">{i + 1}</TableCell>
                                            <TableCell className="font-medium">{item.test_type?.name || '—'}</TableCell>
                                            <TableCell>
                                              <Badge variant="outline" className="font-normal">
                                                {item.test_type?.category || '—'}
                                              </Badge>
                                            </TableCell>
                                            {showResults && (
                                              <>
                                                <TableCell className="font-medium">
                                                  {itemStatus === 'failed' ? (
                                                    <span className="text-red-600 text-sm">Failed{fulfillment?.failed_reason ? `: ${fulfillment.failed_reason}` : ''}</span>
                                                  ) : (
                                                    <>
                                                      {resultValue ?? '—'}
                                                      {resultUnit && <span className="text-muted-foreground ml-1 text-sm">{resultUnit}</span>}
                                                    </>
                                                  )}
                                                </TableCell>
                                                <TableCell className="text-muted-foreground text-sm">{refRange ?? '—'}</TableCell>
                                              </>
                                            )}
                                            {['processing', 'sample_collected', 'fulfilled', 'completed'].includes(lr.status) && (
                                              <TableCell>
                                                {itemStatus ? (
                                                  itemStatus === 'failed' ? (
                                                    <Badge variant="destructive" className="text-xs">Failed</Badge>
                                                  ) : itemStatus === 'completed' && resultStatus ? (
                                                    <Badge variant={
                                                      resultStatus === 'normal' ? 'default' :
                                                      resultStatus === 'critical' ? 'destructive' : 'secondary'
                                                    } className="text-xs">{resultStatus}</Badge>
                                                  ) : (
                                                    <Badge variant={
                                                      itemStatus === 'completed' ? 'default' :
                                                      itemStatus === 'processing' || itemStatus === 'sample_collected' ? 'secondary' : 'outline'
                                                    } className="text-xs">
                                                      {itemStatus === 'completed' ? '✓ Completed' : itemStatus.replace(/_/g, ' ')}
                                                    </Badge>
                                                  )
                                                ) : (
                                                  <span className="text-muted-foreground text-xs">—</span>
                                                )}
                                              </TableCell>
                                            )}
                                          </TableRow>
                                        )
                                      })}
                                    </TableBody>
                                  </Table>
                                </div>
                                <div className="flex gap-2 pt-2">
                                  {(lr.status === 'pending' && !lr.laboratory?.id) && (
                                    <Button size="sm" variant="outline" onClick={() => setEditingLabRequest(lr)}>
                                      <Edit className="h-4 w-4 mr-1" />
                                      Edit
                                    </Button>
                                  )}
                                  <Button size="sm" variant="outline" onClick={() => handlePrintLabRequest(lr)}>
                                    <Download className="h-4 w-4 mr-1" />
                                    PDF
                                  </Button>
                                  {(lr.status === 'pending' && !lr.laboratory?.id) && (
                                    <Button size="sm" className="bg-violet-600 hover:bg-violet-700" onClick={() => {
                                      setSelectedLabRequestForSend(lr.id)
                                      setShowLabSelector(true)
                                    }}>
                                      <Send className="h-4 w-4 mr-1" />
                                      Send to Laboratory
                                    </Button>
                                  )}
                                  {lr.status === 'denied' && (
                                    <Button size="sm" className="bg-violet-600 hover:bg-violet-700" onClick={() => handleResendLabRequest(lr.id)}>
                                      <RefreshCw className="h-4 w-4 mr-1" />
                                      Send to Another Lab
                                    </Button>
                                  )}
                                </div>
                              </div>
                            )}
                            
                            {/* Documents Tab */}
                            {getLabSubTab(lr.id) === 'documents' && (
                              <div className="p-4">
                                {lr.id ? (
                                  <LabRequestDocumentsAttach labRequestId={lr.id} viewerType="doctor" />
                                ) : (
                                  <p className="text-sm text-muted-foreground">No lab request linked</p>
                                )}
                              </div>
                            )}
                            
                            {/* Messages Tab - split: messages left, files right */}
                            {getLabSubTab(lr.id) === 'messages' && (
                              <div className="p-4 flex flex-col min-h-[420px]">
                                {!lr.laboratory?.id ? (
                                  <div className="text-center py-8">
                                    <MessageSquare className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
                                    <p className="text-muted-foreground mb-3">Send this lab request to a laboratory to start messaging</p>
                                    <Button size="sm" className="bg-violet-600 hover:bg-violet-700" onClick={() => {
                                      setSelectedLabRequestForSend(lr.id)
                                      setShowLabSelector(true)
                                    }}>
                                      <Send className="h-4 w-4 mr-1" />
                                      Send to Laboratory
                                    </Button>
                                  </div>
                                ) : messagesLoading[lr.id] ? (
                                  <div className="flex items-center justify-center py-8">
                                    <LoadingSpinner size="lg" className="text-violet-600" />
                                  </div>
                                ) : (
                                  <div className="flex gap-0 min-h-[380px] relative flex-1" data-order-id={lr.id}>
                                    <div 
                                      className="flex flex-col relative border-r flex-1 min-h-0"
                                      style={{ width: chatWidths[lr.id] || 'calc(100% - 200px)', minWidth: '200px' }}
                                    >
                                      <ScrollArea 
                                        ref={(el) => { if (el) scrollAreaRefs.current[lr.id] = el as HTMLDivElement }}
                                        className="flex-1 min-h-[200px] max-h-[400px] pr-2 border rounded-md p-3"
                                        style={{ height: chatHeights[lr.id] || 300, minHeight: chatHeights[lr.id] ?? 240 }}
                                      >
                                        {(messages[lr.id] || []).length === 0 ? (
                                          <div className="text-center py-6 text-muted-foreground">
                                            <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                            <p>No messages yet. Start the conversation!</p>
                                          </div>
                                        ) : (
                                          <div className="space-y-3">
                                            {(messages[lr.id] || []).map((msg: any, idx: number, arr: any[]) => (
                                              <div key={msg.id} className="flex gap-3">
                                                <Avatar className="h-8 w-8 flex-shrink-0">
                                                  <AvatarImage src={msg.sender?.avatar_url} />
                                                  <AvatarFallback className="bg-violet-100 text-violet-600 text-xs">
                                                    {(msg.sender?.full_name || msg.sender?.business_name || '?')[0]}
                                                  </AvatarFallback>
                                                </Avatar>
                                                <div className="flex-1 min-w-0">
                                                  <div className="flex items-center gap-2">
                                                    <span className={`text-sm font-bold truncate ${(msg.sender_id === currentUserId || msg.sender?.id === currentUserId) ? 'text-teal-600 dark:text-teal-400' : 'text-violet-600 dark:text-violet-400'}`}>{msg.sender?.full_name || msg.sender?.business_name || 'Unknown'}</span>
                                                    <span className="text-xs text-muted-foreground flex-shrink-0">{formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}</span>
                                                  </div>
                                                  <p className={`text-sm mt-0.5 break-words line-clamp-2 ${(msg.content || '').toLowerCase().includes('declined') || (msg.content || '').toLowerCase().includes('denied') ? 'text-red-600 dark:text-red-400 font-medium bg-red-50 dark:bg-red-950/30 px-2 py-1 rounded' : ''}`}>{msg.content}</p>
                                                  {(msg.chat_attachments?.length ?? 0) > 0 && (
                                                    <div className="mt-1 flex flex-wrap gap-2">
                                                      {msg.chat_attachments.map((att: any) => {
                                                        const fileUrl = att.storage_path?.startsWith('http')
                                                          ? att.storage_path
                                                          : att.storage_path
                                                            ? supabase.storage.from('chat-attachments').getPublicUrl(att.storage_path).data.publicUrl
                                                            : null
                                                        const isImage = (att.file_type || '').startsWith('image/')
                                                        return isImage && fileUrl ? (
                                                          <button
                                                            key={att.id}
                                                            type="button"
                                                            onClick={() => setImagePreviewUrl(fileUrl)}
                                                            className="block text-left"
                                                          >
                                                            <img
                                                              src={fileUrl}
                                                              alt={att.file_name || 'Image'}
                                                              className="max-w-[120px] max-h-[120px] rounded-lg border border-border object-cover hover:opacity-90 transition-opacity"
                                                              loading="lazy"
                                                            />
                                                          </button>
                                                        ) : (
                                                          <a
                                                            key={att.id}
                                                            href={fileUrl || '#'}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-xs px-1.5 py-0.5 bg-muted rounded inline-flex items-center gap-1 hover:bg-muted/80"
                                                          >
                                                            <Paperclip className="h-3 w-3" />{att.file_name || 'File'}
                                                          </a>
                                                        )
                                                      })}
                                                    </div>
                                                  )}
                                                </div>
                                              </div>
                                            ))}
                                            <div ref={(el) => { messagesEndRef.current[lr.id] = el }} />
                                          </div>
                                        )}
                                      </ScrollArea>
                                      {lr.laboratory_id ? (
                                        <div className="flex gap-2 pt-2 border-t mt-2">
                                          <Button size="icon" variant="outline" disabled={!!uploadingFile[lr.id]}
                                            onClick={() => { fileInputOrderRef.current = { orderId: lr.id, orderType: 'lab' }; fileInputRef.current?.click() }}>
                                            {uploadingFile[lr.id] ? <LoadingSpinner size="sm" /> : <Paperclip className="h-4 w-4" />}
                                          </Button>
                                          <Input placeholder="Type a message..." value={messageInput[lr.id] || ''}
                                            onChange={(e) => setMessageInput(prev => ({ ...prev, [lr.id]: e.target.value }))}
                                            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessageForOrder(lr.id, 'lab') } }}
                                            className="flex-1" />
                                          <Button size="icon" className="bg-violet-600 hover:bg-violet-700"
                                            onClick={() => sendMessageForOrder(lr.id, 'lab')}
                                            disabled={sendingMessage || !messageInput[lr.id]?.trim()}>
                                            {sendingMessage ? <LoadingSpinner size="sm" /> : <Send className="h-4 w-4" />}
                                          </Button>
                                        </div>
                                      ) : (
                                        <div className="pt-2 border-t mt-2">
                                          <p className="text-xs text-muted-foreground text-center py-2">Send this request to a laboratory to start messaging</p>
                                        </div>
                                      )}
                                    </div>
                                    {/* Resize handle - hidden on mobile */}
                                    <div 
                                      className="w-1 cursor-col-resize hover:bg-violet-500/30 bg-border transition-colors z-10 flex-shrink-0 hidden md:block"
                                      onMouseDown={(e) => {
                                        setIsResizing(lr.id)
                                        e.preventDefault()
                                      }}
                                    />
                                    {/* Right: Files attached - hidden on mobile */}
                                    <div 
                                      className="flex-shrink-0 pl-4 hidden md:flex flex-col"
                                      style={{ width: chatWidths[lr.id] ? `calc(100% - ${chatWidths[lr.id]}px - 4px)` : '200px', minWidth: '150px' }}
                                    >
                                      <button
                                        onClick={() => setFilesCollapsed(prev => ({ ...prev, [lr.id]: !prev[lr.id] }))}
                                        className="flex items-center justify-between w-full mb-2 hover:bg-muted/50 rounded px-2 py-1.5 transition-colors group"
                                      >
                                        <p className="text-xs font-semibold text-muted-foreground uppercase">Files</p>
                                        {filesCollapsed[lr.id] ? (
                                          <ChevronDown className="h-3 w-3 text-muted-foreground group-hover:text-violet-600 transition-colors" />
                                        ) : (
                                          <ChevronUp className="h-3 w-3 text-muted-foreground group-hover:text-violet-600 transition-colors" />
                                        )}
                                      </button>
                                      {!filesCollapsed[lr.id] && (() => {
                                        const fileItems = (messages[lr.id] || []).flatMap((m: any) =>
                                          (m.chat_attachments || []).map((att: any) => ({ ...att, created_at: m.created_at }))
                                        )
                                        if (fileItems.length === 0) return <p className="text-xs text-muted-foreground">No files yet</p>
                                        return (
                                          <div className="space-y-1.5 max-h-[220px] overflow-y-auto">
                                            {fileItems.map((att: any) => {
                                              const fileUrl = att.storage_path?.startsWith('http')
                                                ? att.storage_path
                                                : att.storage_path
                                                  ? supabase.storage.from('chat-attachments').getPublicUrl(att.storage_path).data.publicUrl
                                                  : null
                                              const isImage = (att.file_type || '').startsWith('image/')
                                              return (
                                                <button
                                                  key={att.id}
                                                  onClick={() => {
                                                    if (isImage && fileUrl) setImagePreviewUrl(fileUrl)
                                                    else if (fileUrl) window.open(fileUrl, '_blank')
                                                  }}
                                                  className="w-full flex items-center gap-2 p-1.5 rounded border bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer text-left"
                                                >
                                                  {isImage && fileUrl ? (
                                                    <img
                                                      src={fileUrl}
                                                      alt={att.file_name || 'Image'}
                                                      className="h-10 w-10 rounded object-cover flex-shrink-0"
                                                    />
                                                  ) : (
                                                    <File className="h-4 w-4 text-violet-600 flex-shrink-0" />
                                                  )}
                                                  <div className="min-w-0 flex-1">
                                                    <span className="text-xs truncate block text-violet-600 font-medium">{att.file_name || 'File'}</span>
                                                    <span className="text-[10px] text-muted-foreground">{formatDistanceToNow(new Date(att.created_at || 0), { addSuffix: true })}</span>
                                                  </div>
                                                  {fileUrl && <ExternalLink className="h-3 w-3 text-muted-foreground flex-shrink-0" />}
                                                </button>
                                              )
                                            })}
                                          </div>
                                        )
                                      })()}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="documents" className="m-0">
              <div className="p-4">
                <VisitDocumentsAttach appointmentId={appointmentId} viewerType="professional" embedded />
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* New Prescription Dialog - scrollable body, content kept inside frame */}
      <Dialog open={showNewPrescriptionDialog} onOpenChange={setShowNewPrescriptionDialog}>
        <DialogContent size="xl2" className="flex flex-col p-0 gap-0" style={{height: '85vh'}}>
          <DialogHeader className="px-6 pt-6 pb-4 shrink-0 border-b bg-muted/30">
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Pill className="h-5 w-5 text-primary" />
              Create Prescription
            </DialogTitle>
            <DialogDescription className="text-base">
              Add medications for this patient. After saving, you can print or send to a pharmacy.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-6 py-4">
            <div className="min-w-0 max-w-full pb-4">
              <PrescriptionBuilder
                threadId=""
                appointmentId={appointmentId}
                doctorId={doctorId}
                patientId={patientId}
                familyMembers={familyMembers}
                defaultFamilyMemberId={familyMemberId ?? (familyMembers?.length === 1 ? familyMembers[0].id : undefined)}
                onPrescriptionCreated={async (id) => {
                  setShowNewPrescriptionDialog(false)
                  await loadPrescriptions()
                  // Auto-expand the newly created prescription to show print/send buttons
                  setExpandedPrescriptionId(id)
                  toast({ title: 'Prescription created', description: 'You can now print or send it to a pharmacy.' })
                }}
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* New Lab Request Dialog */}
      <Dialog open={showNewLabRequestDialog} onOpenChange={setShowNewLabRequestDialog}>
        <DialogContent size="xl2" className="flex flex-col p-0 gap-0 overflow-hidden" style={{height: '85vh'}}>
          <DialogHeader className="px-6 pt-6 pb-4 shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <FlaskConical className="h-5 w-5 text-primary" />
              Request Lab Tests
            </DialogTitle>
            <DialogDescription>
              Select tests for this patient. After saving, you can print or send to a laboratory.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 min-h-0 overflow-auto w-full">
          <LabTestRequestBuilder
            threadId=""
            appointmentId={appointmentId}
            doctorId={doctorId}
            patientId={patientId}
            familyMembers={familyMembers}
            defaultFamilyMemberId={familyMemberId ?? (familyMembers?.length === 1 ? familyMembers[0].id : undefined)}
            visitContext={visitContext}
            onLabRequestCreated={async (id) => {
              setShowNewLabRequestDialog(false)
              await loadLabRequests()
              // Auto-expand the newly created lab request to show print/send buttons
              setExpandedLabRequestId(id)
              toast({ title: 'Lab request created', description: 'You can now print or send it to a laboratory.' })
            }}
          />
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Prescription Dialog - same scroll/overflow as Create */}
      <Dialog open={!!editingPrescription} onOpenChange={(open) => !open && setEditingPrescription(null)}>
        <DialogContent size="xl2" className="flex flex-col p-0 gap-0" style={{height: '85vh'}}>
          <DialogHeader className="px-6 pt-6 pb-4 shrink-0 border-b bg-muted/30">
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Pill className="h-5 w-5 text-primary" />
              Edit Prescription
            </DialogTitle>
            <DialogDescription className="text-base">
              Modify the prescription before sending to pharmacy.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-6 py-4">
            <div className="min-w-0 max-w-full pb-4">
          {editingPrescription && (
            <PrescriptionBuilder
              threadId=""
              appointmentId={appointmentId}
              doctorId={doctorId}
              patientId={patientId}
              familyMembers={familyMembers}
              initialFamilyMemberId={editingPrescription.family_member_id ?? undefined}
              editMode={true}
              editPrescriptionId={editingPrescription.id}
              initialDiagnosis={editingPrescription.diagnosis || ''}
              initialNotes={editingPrescription.notes || ''}
              initialMedications={(editingPrescription.medications || []).map((m: any) => ({
                medication_id: m.medication_id,
                medication_name: m.medication_name || '',
                medication_name_ar: m.medication_name_ar,
                dci_name: m.dci_name,
                form: m.form || '',
                dosage: m.dosage || '',
                quantity: m.quantity || 1,
                frequency: m.frequency || '',
                duration: m.duration || '',
                route: m.route || 'oral',
                instructions: m.instructions || '',
                reimbursement_rate: m.reimbursement_rate,
                is_chifa_listed: m.is_chifa_listed,
                price: m.price,
              }))}
              onPrescriptionUpdated={() => {
                setEditingPrescription(null)
                loadPrescriptions()
                toast({ title: 'Prescription updated', description: 'Changes have been saved.' })
              }}
            />
          )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Lab Request Dialog */}
      <Dialog open={!!editingLabRequest} onOpenChange={(open) => !open && setEditingLabRequest(null)}>
        <DialogContent size="xl2" className="flex flex-col p-0 gap-0 overflow-hidden" style={{height: '85vh'}}>
          <DialogHeader className="px-6 pt-6 pb-4 shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <FlaskConical className="h-5 w-5 text-primary" />
              Edit Lab Request
            </DialogTitle>
            <DialogDescription>
              Modify the lab request before sending to laboratory.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 min-h-0 overflow-auto w-full">
          {editingLabRequest && (
            <LabTestRequestBuilder
              threadId=""
              appointmentId={appointmentId}
              doctorId={doctorId}
              patientId={patientId}
              familyMembers={familyMembers}
              initialFamilyMemberId={editingLabRequest.family_member_id ?? undefined}
              visitContext={visitContext}
              editMode={true}
              editLabRequestId={editingLabRequest.id}
              initialDiagnosis={editingLabRequest.diagnosis || ''}
              initialClinicalNotes={editingLabRequest.clinical_notes || ''}
              initialPriority={editingLabRequest.priority || 'normal'}
              initialSelectedTests={(editingLabRequest.items || []).map((item: any) => item.test_type?.id).filter(Boolean)}
              onLabRequestUpdated={() => {
                setEditingLabRequest(null)
                loadLabRequests()
                toast({ title: 'Lab request updated', description: 'Changes have been saved.' })
              }}
            />
          )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Pharmacy Selector */}
      <PharmacySelector
        open={showPharmacySelector}
        onClose={() => {
          setShowPharmacySelector(false)
          setSelectedPrescriptionForSend(null)
        }}
        onSelect={(pharmacy) => {
          setShowPharmacySelector(false)
          setPendingSendToPharmacy({ id: pharmacy.id, name: pharmacy.business_name ?? pharmacy.name ?? 'Pharmacy' })
        }}
        patientId={patientId}
        doctorId={doctorId}
      />

      {/* Laboratory Selector */}
      <LaboratorySelector
        open={showLabSelector}
        onClose={() => {
          setShowLabSelector(false)
          setSelectedLabRequestForSend(null)
        }}
        onSelect={(lab) => {
          setShowLabSelector(false)
          setPendingSendToLab({ id: lab.id, name: lab.business_name ?? lab.name ?? 'Laboratory' })
        }}
        patientId={patientId}
        doctorId={doctorId}
      />

      {/* Image Preview */}
      <ImagePreviewDialog
        open={!!imagePreviewUrl}
        onOpenChange={(open) => { if (!open) setImagePreviewUrl(null) }}
        src={imagePreviewUrl || ''}
        alt="Preview"
      />

      {/* Confirm send prescription to pharmacy */}
      <AlertDialog open={!!pendingSendToPharmacy} onOpenChange={(open) => !open && setPendingSendToPharmacy(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Send prescription to pharmacy?</AlertDialogTitle>
            <AlertDialogDescription>
              This prescription will be sent to <strong>{pendingSendToPharmacy?.name}</strong>. They will be notified and a conversation thread will be created.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={sending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={sending}
              onClick={(e) => {
                e.preventDefault()
                if (pendingSendToPharmacy) handleSendPrescription(pendingSendToPharmacy.id, pendingSendToPharmacy.name)
              }}
            >
              {sending ? <LoadingSpinner size="sm" className="mr-2" /> : <Send className="h-4 w-4 mr-2" />}
              Send
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirm send lab request to laboratory */}
      <AlertDialog open={!!pendingSendToLab} onOpenChange={(open) => !open && setPendingSendToLab(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Send lab request to laboratory?</AlertDialogTitle>
            <AlertDialogDescription>
              This lab request will be sent to <strong>{pendingSendToLab?.name}</strong>. They will be notified and a conversation thread will be created.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={sending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={sending}
              onClick={(e) => {
                e.preventDefault()
                if (pendingSendToLab) handleSendLabRequest(pendingSendToLab.id, pendingSendToLab.name)
              }}
            >
              {sending ? <LoadingSpinner size="sm" className="mr-2" /> : <Send className="h-4 w-4 mr-2" />}
              Send
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
