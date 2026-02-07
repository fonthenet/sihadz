'use client'

import { useState, useEffect, useRef } from 'react'
import { createBrowserClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { ImagePreviewDialog } from '@/components/image-preview-dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Pill,
  Clock,
  CheckCircle,
  Package,
  Truck,
  Eye,
  XCircle,
  AlertCircle,
  MessageSquare,
  Send,
  Paperclip,
  FileText,
  Image as ImageIcon,
  Download,
  ScanLine,
  Save,
  Search,
  Calendar,
  Users,
  UserCircle,
  Activity,
  ChevronDown,
  ChevronUp,
  ExternalLink,
} from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/page-loading'
import { Input } from '@/components/ui/input'
import { QRCodeDisplay } from '@/components/qr-code-display'
import { useScanHandler } from '@/lib/scanner'
import { getStatusBadgeClassName } from '@/lib/status-colors'
import { useToast } from '@/hooks/use-toast'
import { format, isToday, isYesterday } from 'date-fns'

/** Per-medication fulfillment from pharmacy (original prescription is never modified). */
export type PharmacyFulfillmentItem = {
  medication_index: number
  status: 'available' | 'partial' | 'out_of_stock' | 'substituted' | 'pending_approval'
  dispensed_quantity?: number
  unit_price?: number // Price in DZD
  substitute_name?: string
  substitute_dosage?: string
  substitute_manufacturer?: string
  pharmacy_notes?: string
  requires_doctor_approval?: boolean // True if substitution needs doctor approval
  doctor_approved?: boolean // Doctor approved the substitution
  doctor_approval_notes?: string // Notes from doctor when approving/rejecting
  batch_number?: string // For traceability
  expiry_date?: string // ISO date string
  back_order_date?: string // Expected availability date if out of stock
}

interface Prescription {
  id: string
  prescription_number?: string
  patient_id?: string
  doctor_id: string
  appointment_id?: string
  pharmacy_id?: string
  diagnosis?: string
  notes?: string
  medications: any[]
  pharmacy_fulfillment?: PharmacyFulfillmentItem[]
  status: string
  valid_until?: string
  created_at: string
  received_at?: string
  ready_at?: string
  picked_up_at?: string
  delivered_at?: string
  estimated_ready_at?: string // When pharmacy expects prescription to be ready
  total_price?: number // Total price in DZD
  patient?: {
    full_name?: string
    phone?: string
  }
  doctor?: {
    business_name?: string
    phone?: string
  }
}

interface PharmacyPrescriptionsProps {
  pharmacyId: string
}

interface Message {
  id: string
  thread_id: string
  sender_id: string
  content: string | null
  message_type: string
  created_at: string
  sender?: {
    id: string
    full_name?: string
    business_name?: string
    avatar_url?: string
  }
  chat_attachments?: Array<{
    id: string
    file_name: string
    file_type: string
    file_size?: number
    storage_path: string
    url?: string
  }>
}

export default function PharmacyPrescriptions({ pharmacyId }: PharmacyPrescriptionsProps) {
  const supabase = createBrowserClient()
  const { toast } = useToast()
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'patient' | 'doctor'>('newest')
  const [groupBy, setGroupBy] = useState<'none' | 'date' | 'status' | 'doctor' | 'patient'>('none')
  const [selectedPrescription, setSelectedPrescription] = useState<Prescription | null>(null)
  const [showDetails, setShowDetails] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [notes, setNotes] = useState('')
  const [actualPharmacyId, setActualPharmacyId] = useState<string | null>(null)
  
  // Message thread state
  const [activeTab, setActiveTab] = useState<'details' | 'discussion'>('details')
  const [thread, setThread] = useState<any>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [messageText, setMessageText] = useState('')
  const [sendingMessage, setSendingMessage] = useState(false)
  const [user, setUser] = useState<{ id: string } | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const threadRef = useRef<any>(null)
  const subscriptionCleanupRef = useRef<(() => void) | null>(null)
  const [scanBaseUrl, setScanBaseUrl] = useState<string>('')
  /** Local fulfillment edits (pharmacy-only; original prescription unchanged). */
  const [localFulfillment, setLocalFulfillment] = useState<PharmacyFulfillmentItem[]>([])
  const [savingFulfillment, setSavingFulfillment] = useState(false)
  const [estimatedReadyAt, setEstimatedReadyAt] = useState<string>('')
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null)
  const [filesCollapsed, setFilesCollapsed] = useState(false)
  
  // Decline reason dialog state
  const [declineDialogOpen, setDeclineDialogOpen] = useState(false)
  const [declineReason, setDeclineReason] = useState('')
  const [prescriptionToDecline, setPrescriptionToDecline] = useState<string | null>(null)

  useEffect(() => {
    if (typeof window !== 'undefined') setScanBaseUrl(window.location.origin)
  }, [])

  // Sync local fulfillment when prescription details open (from saved or default per line)
  useEffect(() => {
    if (!selectedPrescription?.medications?.length) {
      setLocalFulfillment([])
      setEstimatedReadyAt('')
      return
    }
    const saved = selectedPrescription.pharmacy_fulfillment || []
    const byIndex = new Map(saved.map((f: PharmacyFulfillmentItem) => [f.medication_index, f]))
    const next = selectedPrescription.medications.map((_: any, index: number) => {
      const existing = byIndex.get(index)
      return existing || { medication_index: index, status: 'available' as const }
    })
    setLocalFulfillment(next)
    setEstimatedReadyAt(selectedPrescription.estimated_ready_at || '')
  }, [selectedPrescription?.id, selectedPrescription?.medications?.length, selectedPrescription?.pharmacy_fulfillment, selectedPrescription?.estimated_ready_at])

  // Load current user
  useEffect(() => {
    const loadUser = async () => {
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
      if (authError) {
        console.error('[Pharmacy] Error getting auth user:', authError)
      }
      if (authUser) {
        console.log('[Pharmacy] Current auth user:', { id: authUser.id, email: authUser.email })
        setUser(authUser)
        
        // Also verify pharmacy professional's auth_user_id matches
        const { data: pharmacyProf } = await supabase
          .from('professionals')
          .select('auth_user_id, business_name')
          .eq('id', pharmacyId)
          .single()
        
        if (pharmacyProf) {
          console.log('[Pharmacy] Pharmacy professional:', {
            professionalId: pharmacyId,
            authUserId: pharmacyProf.auth_user_id,
            currentAuthUserId: authUser.id,
            match: pharmacyProf.auth_user_id === authUser.id
          })
          
          if (pharmacyProf.auth_user_id !== authUser.id) {
            console.warn('[Pharmacy] WARNING: auth_user_id mismatch! This will cause RLS issues.')
          }
        }
      }
    }
    loadUser()
  }, [pharmacyId])

  // Use pharmacyId directly (prescriptions now references professionals.id)
  useEffect(() => {
    // Verify it's a pharmacy
    const verifyPharmacy = async () => {
      const { data: prof } = await supabase
        .from('professionals')
        .select('id, type')
        .eq('id', pharmacyId)
        .single()
      
      if (prof && prof.type === 'pharmacy') {
        setActualPharmacyId(pharmacyId)
      }
    }
    verifyPharmacy()
  }, [pharmacyId])

  useEffect(() => {
    if (actualPharmacyId) {
      loadPrescriptions()
      // Subscribe to real-time updates
      const channel = supabase
        .channel('pharmacy-prescriptions')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'prescriptions',
            filter: `pharmacy_id=eq.${actualPharmacyId}`,
          },
          () => {
            loadPrescriptions()
          }
        )
        .subscribe()

      return () => {
        supabase.removeChannel(channel)
      }
    }
  }, [actualPharmacyId, statusFilter])

  const loadPrescriptions = async (statusOverride?: string) => {
    if (!actualPharmacyId) return
    
    setLoading(true)
    try {
      const params = new URLSearchParams()
      const filter = statusOverride ?? statusFilter
      if (filter !== 'all') params.set('status', filter)
      const res = await fetch(`/api/prescriptions/pharmacy?${params.toString()}`, {
        credentials: 'include',
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || `Failed to load prescriptions (${res.status})`)
      }
      const { prescriptions: data } = await res.json()
      setPrescriptions(data || [])
    } catch (error: any) {
      console.error('Error loading prescriptions:', error)
      toast({ title: 'Error', description: error.message || 'Failed to load prescriptions', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const updateStatus = async (prescriptionId: string, newStatus: string, reason?: string) => {
    setUpdating(true)
    try {
      const body: any = { status: newStatus }
      if (reason) body.decline_reason = reason
      
      const res = await fetch(`/api/prescriptions/${prescriptionId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      })

      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        const errMsg = data?.error || (res.status === 403 ? 'Not authorized to update this prescription' : `Update failed (${res.status})`)
        throw new Error(errMsg)
      }

      toast({ title: 'Success', description: `Prescription status updated to ${newStatus}` })
      // Switch filter to new status so the prescription remains visible after update
      setStatusFilter(newStatus)
      await loadPrescriptions(newStatus)
      setShowDetails(false)
    } catch (error: any) {
      const errDesc = error?.message || error?.details || (typeof error === 'string' ? error : 'Failed to update status')
      console.error('Error updating status:', errDesc, error)
      toast({ title: 'Error', description: errDesc, variant: 'destructive' })
    } finally {
      setUpdating(false)
    }
  }
  
  // Open decline dialog
  const openDeclineDialog = (prescriptionId: string) => {
    setPrescriptionToDecline(prescriptionId)
    setDeclineReason('')
    setDeclineDialogOpen(true)
  }
  
  // Confirm decline
  const confirmDecline = async () => {
    if (!prescriptionToDecline) return
    setDeclineDialogOpen(false)
    await updateStatus(prescriptionToDecline, 'declined', declineReason || undefined)
    setPrescriptionToDecline(null)
    setDeclineReason('')
  }

  const getFulfillmentForIndex = (index: number): PharmacyFulfillmentItem => {
    return localFulfillment[index] ?? { medication_index: index, status: 'available' }
  }

  const setFulfillmentForIndex = (index: number, update: Partial<PharmacyFulfillmentItem>) => {
    setLocalFulfillment((prev) => {
      const next = [...prev]
      next[index] = { ...(next[index] ?? { medication_index: index, status: 'available' }), ...update }
      return next
    })
  }

  const saveFulfillment = async () => {
    if (!selectedPrescription) return
    setSavingFulfillment(true)
    try {
      const totalPrice = localFulfillment.reduce((sum, f) => sum + (f.unit_price || 0), 0)
      const res = await fetch(`/api/prescriptions/${selectedPrescription.id}/pharmacy-fulfillment`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          pharmacy_fulfillment: localFulfillment,
          estimated_ready_at: estimatedReadyAt || null,
          total_price: totalPrice || null,
        }),
        credentials: 'include',
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to save fulfillment')
      const updatedFields = { 
        pharmacy_fulfillment: localFulfillment,
        estimated_ready_at: estimatedReadyAt || undefined,
        total_price: totalPrice || undefined,
      }
      setSelectedPrescription((p) => (p ? { ...p, ...updatedFields } : null))
      setPrescriptions((prev) =>
        prev.map((p) =>
          p.id === selectedPrescription.id ? { ...p, ...updatedFields } : p
        )
      )
      toast({ title: 'Fulfillment saved', description: 'Doctor and patient will see your updates.' })
    } catch (e: any) {
      toast({ title: 'Error', description: e.message || 'Failed to save', variant: 'destructive' })
    } finally {
      setSavingFulfillment(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const labels: Record<string, string> = {
      sent: 'Received',
      received: 'Received',
      processing: 'Processing',
      ready: 'Ready for pickup',
      picked_up: 'Picked up',
      declined: 'Declined',
      delivered: 'Delivered',
      dispensed: 'Dispensed',
      cancelled: 'Cancelled',
    }
    const label = labels[status] ?? status
    const className = getStatusBadgeClassName(status, 'solid')
    return <Badge className={className}>{label}</Badge>
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent':
      case 'received':
        return <Clock className="h-4 w-4" />
      case 'processing':
        return <LoadingSpinner size="sm" />
      case 'ready':
        return <Package className="h-4 w-4" />
      case 'picked_up':
      case 'delivered':
      case 'dispensed':
        return <CheckCircle className="h-4 w-4" />
      case 'declined':
      case 'cancelled':
        return <XCircle className="h-4 w-4" />
      default:
        return <Pill className="h-4 w-4" />
    }
  }

  // After Accept: processing → ready → picked_up. Received/sent use Accept/Decline (no single "next").
  const getNextStatus = (currentStatus: string): string | null => {
    const workflow: Record<string, string> = {
      processing: 'ready',
      ready: 'picked_up',
    }
    return workflow[currentStatus] || null
  }

  const needsAcceptOrDecline = (status: string) => status === 'sent' || status === 'received'

  // Keep threadRef in sync
  useEffect(() => {
    threadRef.current = thread
  }, [thread])

  // Load thread and messages when prescription is selected
  useEffect(() => {
    // Cleanup previous subscription when switching prescriptions or closing dialog
    if (subscriptionCleanupRef.current) {
      subscriptionCleanupRef.current()
      subscriptionCleanupRef.current = null
    }

    if (selectedPrescription?.appointment_id && showDetails && user) {
      loadThreadAndMessages()
    } else {
      setThread(null)
      setMessages([])
      setActiveTab('details')
    }

    // Cleanup on unmount or when dependencies change
    return () => {
      if (subscriptionCleanupRef.current) {
        subscriptionCleanupRef.current()
        subscriptionCleanupRef.current = null
      }
    }
  }, [selectedPrescription?.appointment_id, showDetails, user])

  // Scroll to bottom when messages change
  useEffect(() => {
    if (activeTab === 'discussion') {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
      }, 100)
    }
  }, [messages, activeTab])

  const loadThreadAndMessages = async () => {
    if (!selectedPrescription || !user) return
    const appointmentId = selectedPrescription.appointment_id
    if (!appointmentId) {
      setLoadingMessages(false)
      return
    }

    setLoadingMessages(true)
    try {
      // Ticket-centric: try to find thread via healthcare_ticket first (primary path)
      const pharmacyProfessionalId = selectedPrescription.pharmacy_id || pharmacyId
      let threadData: any = null

      let ticket: { id: string } | null = null
      const bySecondary = await supabase.from('healthcare_tickets').select('id').eq('prescription_id', selectedPrescription.id).eq('secondary_provider_id', pharmacyProfessionalId).maybeSingle()
      if (bySecondary.data?.id) ticket = bySecondary.data
      else {
        const byPharmacy = await supabase.from('healthcare_tickets').select('id').eq('prescription_id', selectedPrescription.id).eq('pharmacy_id', pharmacyProfessionalId).maybeSingle()
        if (byPharmacy.data?.id) ticket = byPharmacy.data
      }

      if (ticket?.id) {
        const { data: threadByTicket, error: threadErr } = await supabase
          .from('chat_threads')
          .select('*')
          .eq('ticket_id', ticket.id)
          .maybeSingle()
        if (!threadErr && threadByTicket) threadData = threadByTicket
      }

      // Fallback: find thread by order_id + pharmacy (backward compatibility)
      if (!threadData) {
        let query = supabase
          .from('chat_threads')
          .select('*')
          .or(`order_id.eq.${appointmentId},metadata->>appointment_id.eq.${appointmentId}`)
          .eq('order_type', 'prescription')
        if (pharmacyProfessionalId) {
          query = query.eq('metadata->>target_id', pharmacyProfessionalId)
        }
        const { data: rows, error: threadError } = await query

        if (threadError) {
          console.error('Error loading thread:', threadError.message || threadError)
          toast({ title: 'Error', description: threadError.message || 'Failed to load conversation thread', variant: 'destructive' })
          setLoadingMessages(false)
          return
        }

        if (Array.isArray(rows) && rows.length > 0) {
          threadData = rows.length === 1
            ? rows[0]
            : rows.find((t: any) => t.metadata?.target_id === pharmacyProfessionalId) ?? rows[0]
        }
      }

      if (threadData) {
        // CRITICAL: RLS requires auth.uid() to match chat_thread_members.user_id
        // We MUST use user.id (current auth user) - the thread member must match this
        const pharmacyUserId = user.id
        
        console.log(`[Pharmacy Thread] Checking membership for thread ${threadData.id}:`, {
          currentUserId: user.id,
          pharmacyId: selectedPrescription.pharmacy_id,
          threadId: threadData.id
        })
        
        // Check all members to see what's actually in the database
        const { data: allMembers } = await supabase
          .from('chat_thread_members')
          .select('user_id, role')
          .eq('thread_id', threadData.id)
        
        console.log(`[Pharmacy Thread] Thread ${threadData.id} members:`, allMembers)

        // Verify pharmacy user is a member of the thread, if not add them
        const { data: memberCheck } = await supabase
          .from('chat_thread_members')
          .select('user_id')
          .eq('thread_id', threadData.id)
          .eq('user_id', pharmacyUserId)
          .maybeSingle()

        if (!memberCheck) {
          console.log(`[Pharmacy Thread] Pharmacy user ${pharmacyUserId} not a member, adding...`)
          // Pharmacy user is not a member, add them
          const { error: addMemberError } = await supabase
            .from('chat_thread_members')
            .insert({
              thread_id: threadData.id,
              user_id: pharmacyUserId,
              role: 'member',
            })

          if (addMemberError) {
            console.error('[Pharmacy Thread] Error adding pharmacy to thread:', addMemberError)
            // Don't block - continue anyway
          } else {
            console.log(`[Pharmacy Thread] Successfully added pharmacy user ${pharmacyUserId} to thread`)
          }
        } else {
          console.log(`[Pharmacy Thread] Pharmacy user ${pharmacyUserId} is already a member`)
        }

        // Ticket-centric threads are already validated via ticket; otherwise check order_id/metadata
        const matchesPrescription = threadData.ticket_id != null ||
          threadData.order_id === selectedPrescription.appointment_id ||
          threadData.metadata?.appointment_id === selectedPrescription.appointment_id

        if (!threadData.order_id && threadData.metadata?.appointment_id === selectedPrescription.appointment_id) {
          await supabase
            .from('chat_threads')
            .update({ order_id: selectedPrescription.appointment_id })
            .eq('id', threadData.id)
          threadData.order_id = selectedPrescription.appointment_id
        }

        if (!matchesPrescription) {
          console.error('Thread appointment mismatch:', {
            expectedAppointmentId: selectedPrescription.appointment_id,
            foundOrderId: threadData.order_id,
            foundMetadataAppointmentId: threadData.metadata?.appointment_id
          })
          setLoadingMessages(false)
          return
        }

        setThread(threadData)
        // Clear messages before loading new ones to prevent mixing
        setMessages([])
        await loadMessages(threadData.id)
        // Store cleanup function so we can unsubscribe when thread changes
        const cleanup = subscribeToMessages(threadData.id)
        if (cleanup) {
          subscriptionCleanupRef.current = cleanup
        }
      }
    } catch (error: any) {
      console.error('Error loading thread:', error)
      toast({ title: 'Error', description: error.message || 'Failed to load conversation thread', variant: 'destructive' })
    } finally {
      setLoadingMessages(false)
    }
  }

  const loadMessages = async (threadId: string) => {
    const { data, error } = await supabase
      .from('chat_messages')
      .select(`
        *,
        chat_attachments(*)
      `)
      .eq('thread_id', threadId)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error loading messages:', error)
      return
    }

    // CRITICAL: Only set messages if thread hasn't changed (prevents showing wrong thread's messages on refresh)
    if (threadRef.current?.id !== threadId) {
      console.warn('Thread changed while loading messages, discarding results')
      return
    }

    // CRITICAL: Filter messages to only include those for the current thread (double-check)
    const validMessages = (data || []).filter((msg: any) => {
      if (msg.thread_id !== threadId) {
        console.warn(`[Pharmacy LoadMessages] Discarding message ${msg.id} - thread_id mismatch:`, {
          messageThreadId: msg.thread_id,
          expectedThreadId: threadId
        })
        return false
      }
      return true
    })

    // Hydrate sender info
    const hydratedMessages = await Promise.all(
      validMessages.map(async (msg) => {
        let sender: any = null
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url')
          .eq('id', msg.sender_id)
          .maybeSingle()

        if (profile) {
          sender = profile
        } else {
          const { data: prof } = await supabase
            .from('professionals')
            .select('auth_user_id, business_name')
            .eq('auth_user_id', msg.sender_id)
            .maybeSingle()

          if (prof) {
            sender = { id: prof.auth_user_id, business_name: prof.business_name }
          }
        }

        const attachments = (msg.chat_attachments || []).map((att: any) => ({
          ...att,
          url: att.storage_path?.startsWith('http')
            ? att.storage_path
            : supabase.storage.from('chat-attachments').getPublicUrl(att.storage_path || '').data.publicUrl,
        }))

        return {
          ...msg,
          sender: sender || { id: msg.sender_id },
          chat_attachments: attachments,
        }
      })
    )

    // Final check: only set messages if thread hasn't changed
    if (threadRef.current?.id === threadId) {
      console.log(`[Pharmacy LoadMessages] Setting ${hydratedMessages.length} messages for thread ${threadId}`)
      setMessages(hydratedMessages)
    } else {
      console.warn(`[Pharmacy LoadMessages] Thread changed during load, discarding ${hydratedMessages.length} messages`)
    }
  }

  const subscribeToMessages = (threadId: string) => {
    if (!user) return () => {}

    const currentThreadId = threadId // Capture threadId to ensure we only process messages for THIS thread

    const channel = supabase
      .channel(`pharmacy-prescription-messages-${currentThreadId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `thread_id=eq.${currentThreadId}`,
        },
        async (payload) => {
          const newMsg = payload.new as any
          
          // CRITICAL: Only add message if it belongs to the current thread (prevents mixing threads on refresh)
          if (newMsg.thread_id !== currentThreadId) {
            console.warn('Received message for different thread, ignoring:', { messageThreadId: newMsg.thread_id, currentThreadId })
            return
          }
          
          // Double-check thread is still the same (thread might have changed)
          if (threadRef.current?.id !== currentThreadId) {
            console.warn('Thread changed while processing message, ignoring')
            return
          }

          const { data: profile } = await supabase
            .from('profiles')
            .select('id, full_name, avatar_url')
            .eq('id', newMsg.sender_id)
            .maybeSingle()

          let sender = profile
          if (!sender) {
            const { data: prof } = await supabase
              .from('professionals')
              .select('auth_user_id, business_name')
              .eq('auth_user_id', newMsg.sender_id)
              .maybeSingle()
            if (prof) {
              sender = { id: prof.auth_user_id, business_name: prof.business_name }
            }
          }

          const { data: atts } = await supabase
            .from('chat_attachments')
            .select('*')
            .eq('message_id', newMsg.id)

          const attachments = (atts || []).map((att: any) => ({
            ...att,
            url: att.storage_path?.startsWith('http')
              ? att.storage_path
              : supabase.storage.from('chat-attachments').getPublicUrl(att.storage_path || '').data.publicUrl,
          }))

          setMessages((prev) => {
            // Prevent duplicates: check if message already exists
            if (prev.some(m => m.id === newMsg.id)) {
              return prev
            }
            return [
              ...prev,
              {
                ...newMsg,
                sender: sender || { id: newMsg.sender_id },
                chat_attachments: attachments,
              },
            ]
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }

  const sendMessage = async () => {
    if (!thread || !user || (!messageText.trim() && selectedFiles.length === 0)) return

    const currentThreadId = thread.id
    const currentThread = threadRef.current
    
    if (!currentThread || currentThread.id !== currentThreadId) {
      toast({ title: 'Error', description: 'Thread changed, please try again', variant: 'destructive' })
      return
    }

    setSendingMessage(true)
    try {
      const content = messageText.trim()
      
      // Use API to bypass RLS - works reliably across all boards
      const filesPayload: Array<{ name: string; type: string; size: number; base64: string }> = []
      for (const file of selectedFiles) {
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.onloadend = () => {
            const b = (reader.result as string)?.split(',')[1]
            if (b) resolve(b); else reject(new Error('Could not read file'))
          }
          reader.onerror = () => reject(reader.error)
          reader.readAsDataURL(file)
        })
        filesPayload.push({ name: file.name, type: file.type, size: file.size, base64 })
      }

      console.log(`[Pharmacy SendMessage] Sending via API to thread ${currentThreadId}`)
      const res = await fetch(`/api/threads/${currentThreadId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ content, files: filesPayload.length > 0 ? filesPayload : undefined }),
      })
      const json = await res.json()
      console.log(`[Pharmacy SendMessage] API response:`, res.status, json)

      if (!res.ok) {
        throw new Error(json.error || 'Failed to send message')
      }

      setMessageText('')
      setSelectedFiles([])
      await loadMessages(currentThreadId)
    } catch (error: any) {
      console.error('Error sending message:', error)
      const errorMessage = error?.message || error?.error?.message || JSON.stringify(error) || 'Failed to send message'
      toast({ title: 'Error', description: errorMessage, variant: 'destructive' })
    } finally {
      setSendingMessage(false)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    setSelectedFiles((prev) => [...prev, ...files])
  }

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const formatMessageTime = (date: string) => {
    const d = new Date(date)
    if (isToday(d)) return format(d, 'HH:mm')
    if (isYesterday(d)) return 'Yesterday ' + format(d, 'HH:mm')
    return format(d, 'MMM d, HH:mm')
  }

  const getInitials = (name: string) => {
    return (name || '').trim().split(/\s+/).map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?'
  }

  const { onKeyDown: prescriptionSearchScanKeyDown } = useScanHandler({
    context: 'prescriptions',
    value: searchQuery,
    onScan: (value) => setSearchQuery(value),
  })

  // Filter prescriptions
  const filteredPrescriptions = prescriptions.filter((p) => {
    // Status filter
    if (statusFilter !== 'all') {
      if (statusFilter === 'received' && p.status !== 'sent' && p.status !== 'received') return false
      if (statusFilter === 'declined' && p.status !== 'declined') return false
      if (statusFilter !== 'received' && statusFilter !== 'declined' && p.status !== statusFilter) return false
    }
    // Search filter
    if (searchQuery) {
      const search = searchQuery.toLowerCase()
      const matches = 
        (p.prescription_number || '').toLowerCase().includes(search) ||
        (p.patient?.full_name || '').toLowerCase().includes(search) ||
        (p.doctor?.business_name || '').toLowerCase().includes(search) ||
        (p.diagnosis || '').toLowerCase().includes(search) ||
        (p.medications || []).some((m: any) => (m.name || '').toLowerCase().includes(search))
      if (!matches) return false
    }
    return true
  })

  // Sort prescriptions
  const sortedPrescriptions = [...filteredPrescriptions].sort((a, b) => {
    switch (sortBy) {
      case 'newest':
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      case 'oldest':
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      case 'patient':
        return (a.patient?.full_name || '').localeCompare(b.patient?.full_name || '')
      case 'doctor':
        return (a.doctor?.business_name || '').localeCompare(b.doctor?.business_name || '')
      default:
        return 0
    }
  })

  // Group prescriptions
  const groupedPrescriptions: Record<string, Prescription[]> = {}
  if (groupBy === 'none') {
    // Group by appointment for thread display
    const groupedByAppointment = sortedPrescriptions.reduce<Map<string, Prescription[]>>((acc, p) => {
      const key = p.appointment_id ?? p.id
      const list = acc.get(key) ?? []
      list.push(p)
      acc.set(key, list)
      return acc
    }, new Map())
    Array.from(groupedByAppointment.entries()).forEach(([key, list]) => {
      groupedPrescriptions[key] = list
    })
  } else {
    sortedPrescriptions.forEach((p) => {
      let key = ''
      switch (groupBy) {
        case 'date':
          key = new Date(p.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
          break
        case 'status':
          key = getStatusLabel(p.status)
          break
        case 'doctor':
          key = p.doctor?.business_name || 'Unknown Doctor'
          break
        case 'patient':
          key = p.patient?.full_name || 'Unknown Patient'
          break
      }
      if (!groupedPrescriptions[key]) groupedPrescriptions[key] = []
      groupedPrescriptions[key].push(p)
    })
  }

  // Sort groups by most recent prescription
  const groupEntries = Object.entries(groupedPrescriptions)
    .map(([key, list]) => [key, [...list].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())] as const)
    .sort((a, b) => {
      const aLatest = Math.max(...a[1].map((p) => new Date(p.created_at).getTime()))
      const bLatest = Math.max(...b[1].map((p) => new Date(p.created_at).getTime()))
      return bLatest - aLatest
    })

  return (
    <div className="space-y-4">
      {/* Header with search, filters, and controls */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Prescriptions</h2>
          <p className="text-muted-foreground">
            {filteredPrescriptions.length} of {prescriptions.length} prescription{prescriptions.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Scan or search prescriptions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={prescriptionSearchScanKeyDown}
              className="pl-9 w-[180px]"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="received">Received</SelectItem>
              <SelectItem value="declined">Declined</SelectItem>
              <SelectItem value="processing">Processing</SelectItem>
              <SelectItem value="ready">Ready for pickup</SelectItem>
              <SelectItem value="picked_up">Picked up</SelectItem>
              <SelectItem value="delivered">Delivered</SelectItem>
            </SelectContent>
          </Select>
          <Select value={groupBy} onValueChange={(v) => setGroupBy(v as any)}>
            <SelectTrigger className="w-[130px]">
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
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
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

      {loading ? (
        <Card>
          <CardContent className="p-8 flex items-center justify-center">
            <LoadingSpinner size="md" className="text-muted-foreground" />
          </CardContent>
        </Card>
      ) : filteredPrescriptions.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            <Pill className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No prescriptions found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {groupEntries.map(([groupKey, groupPrescriptions]) => {
            const first = groupPrescriptions[0]
            const isGrouped = groupBy === 'none' && groupPrescriptions.length > 1
            return (
              <div key={groupKey}>
                {/* Group Header when grouping is enabled */}
                {groupBy !== 'none' && (
                  <div className="flex items-center gap-2 mb-2">
                    {groupBy === 'date' && <Calendar className="h-4 w-4 text-emerald-600" />}
                    {groupBy === 'status' && <Activity className="h-4 w-4 text-emerald-600" />}
                    {groupBy === 'doctor' && <UserCircle className="h-4 w-4 text-emerald-600" />}
                    {groupBy === 'patient' && <Users className="h-4 w-4 text-emerald-600" />}
                    <h4 className="font-semibold text-sm">{groupKey}</h4>
                    <Badge variant="secondary" className="text-xs">{groupPrescriptions.length}</Badge>
                  </div>
                )}
                <Card className={`overflow-hidden shadow-sm border-t-0 py-1.5 gap-1 ${groupBy !== 'none' ? 'ml-6' : ''}`}>
                  {groupBy === 'none' && (
                    <CardHeader className="py-1 px-4 !pb-1 border-b border-muted/50 gap-x-1.5 gap-y-px">
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <CardTitle className="text-sm font-semibold tracking-tight">
                          {first.patient?.full_name || 'Patient'}
                        </CardTitle>
                        <span className="text-sm text-muted-foreground">· Dr. {first.doctor?.business_name || '—'}</span>
                        {isGrouped && (
                          <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                            Same visit · {groupPrescriptions.length} prescription{groupPrescriptions.length !== 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                    </CardHeader>
                  )}
                <CardContent className="px-4 pt-1.5 pb-2 space-y-1.5">
                  {groupPrescriptions.map((prescription, index) => {
                    const rxLabel = `RX-${String(index + 1).padStart(4, '0')}`
                    const accentClasses = [
                      'border-l-4 border-l-primary/40 bg-primary/5 rounded-r-lg',
                      'border-l-4 border-l-blue-500/40 bg-blue-500/5 rounded-r-lg',
                      'border-l-4 border-l-emerald-500/40 bg-emerald-500/5 rounded-r-lg',
                      'border-l-4 border-l-amber-500/40 bg-amber-500/5 rounded-r-lg',
                      'border-l-4 border-l-violet-500/40 bg-violet-500/5 rounded-r-lg',
                    ][index % 5]
                    return (
                      <div
                        key={prescription.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => {
                          setSelectedPrescription(prescription)
                          setShowDetails(true)
                          setActiveTab('details')
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            setSelectedPrescription(prescription)
                            setShowDetails(true)
                            setActiveTab('details')
                          }
                        }}
                        className={`rounded-lg border p-2.5 cursor-pointer transition-colors hover:opacity-90 active:opacity-95 ${accentClasses}`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                          <div className="min-w-0 flex-1 space-y-0.5">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="font-medium text-foreground text-sm">{rxLabel}</span>
                              {getStatusBadge(prescription.status)}
                              {prescription.prescription_number && (
                                <span className="text-xs text-muted-foreground">#{prescription.prescription_number}</span>
                              )}
                            </div>
                            {prescription.diagnosis && (
                              <p className="text-xs leading-tight">
                                <span className="font-medium text-muted-foreground">Diagnosis:</span>{' '}
                                <span className="text-foreground">{prescription.diagnosis}</span>
                              </p>
                            )}
                            <div className="flex flex-wrap gap-x-1.5 gap-y-0 text-xs text-muted-foreground">
                              <span>{prescription.medications?.length || 0} medication(s)</span>
                              <span>Created {format(new Date(prescription.created_at), 'MMM d, HH:mm')}</span>
                              {prescription.received_at && (
                                <span>Received {format(new Date(prescription.received_at), 'MMM d, HH:mm')}</span>
                              )}
                              {prescription.ready_at && (
                                <span>Ready {format(new Date(prescription.ready_at), 'MMM d, HH:mm')}</span>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-1.5 flex-shrink-0 sm:flex-row sm:flex-nowrap" onClick={(e) => e.stopPropagation()}>
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full sm:w-auto"
                              onClick={() => {
                                setSelectedPrescription(prescription)
                                setShowDetails(true)
                                setActiveTab('discussion')
                              }}
                            >
                              <MessageSquare className="h-4 w-4 mr-1.5" />
                              Discussion
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full sm:w-auto"
                              onClick={() => {
                                setSelectedPrescription(prescription)
                                setShowDetails(true)
                                setActiveTab('details')
                              }}
                            >
                              <Eye className="h-4 w-4 mr-1.5" />
                              Details
                            </Button>
                            {needsAcceptOrDecline(prescription.status) && (
                              <>
                                <Button
                                  size="sm"
                                  className="w-full sm:w-auto"
                                  onClick={() => updateStatus(prescription.id, 'processing')}
                                  disabled={updating}
                                >
                                  {updating ? <LoadingSpinner size="sm" /> : <><CheckCircle className="h-4 w-4 me-1.5" /> Accept</>}
                                </Button>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  className="w-full sm:w-auto"
                                  onClick={() => openDeclineDialog(prescription.id)}
                                  disabled={updating}
                                >
                                  <XCircle className="h-4 w-4 mr-1.5" />
                                  Decline
                                </Button>
                              </>
                            )}
                            {getNextStatus(prescription.status) && (
                              <Button
                                size="sm"
                                className="w-full sm:w-auto"
                                onClick={() => updateStatus(prescription.id, getNextStatus(prescription.status)!)}
                                disabled={updating}
                              >
                                {updating ? (
                                  <LoadingSpinner size="sm" />
                                ) : (
                                  <>
                                    {getNextStatus(prescription.status) === 'ready' && <Package className="h-4 w-4 mr-1.5" />}
                                    {getNextStatus(prescription.status) === 'picked_up' && <Truck className="h-4 w-4 mr-1.5" />}
                                    {getNextStatus(prescription.status) === 'ready' ? 'Ready for pickup' : 'Mark as picked up'}
                                  </>
                                )}
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </CardContent>
              </Card>
              </div>
            )
          })}
        </div>
      )}

      {/* Prescription Details Dialog */}
      <Dialog open={showDetails} onOpenChange={(open) => {
        setShowDetails(open)
        if (!open) {
          setActiveTab('details')
          setThread(null)
          setMessages([])
          setMessageText('')
          setSelectedFiles([])
        }
      }}>
        <DialogContent size="full" className="flex flex-col" style={{width: '1280px', height: '85vh'}}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Prescription Details
              {selectedPrescription && getStatusBadge(selectedPrescription.status)}
            </DialogTitle>
            <DialogDescription>
              {selectedPrescription && (
                <>
Patient: {selectedPrescription.patient?.full_name || '—'} •
                  Doctor: {selectedPrescription.doctor?.business_name || '—'}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          {selectedPrescription && (
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'details' | 'discussion')} className="w-full flex-1 flex flex-col min-h-0 overflow-hidden">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="details">
                  <Pill className="h-4 w-4 mr-2" />
                  Prescription Details
                </TabsTrigger>
                <TabsTrigger value="discussion">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Care Team Discussion
                  {thread && messages.length > 0 && (
                    <Badge variant="secondary" className="ml-2">
                      {messages.length}
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="details" className="mt-4 flex-1 min-h-0 overflow-auto">
                <div className="space-y-4 pr-4 pb-8">
                    {/* Header: Patient, Doctor, QR Code */}
                    <div className="flex gap-4 items-start">
                      <div className="flex-1 grid grid-cols-2 gap-4">
                        <div>
                          <Label>Patient</Label>
                          <p className="font-medium">
                            {selectedPrescription.patient?.full_name || '—'}
                          </p>
                          {selectedPrescription.patient?.phone && (
                            <p className="text-sm text-muted-foreground">
                              {selectedPrescription.patient.phone}
                            </p>
                          )}
                        </div>
                        <div>
                          <Label>Doctor</Label>
                          <p className="font-medium">
                            {selectedPrescription.doctor?.business_name || '—'}
                          </p>
                          {selectedPrescription.doctor?.phone && (
                            <p className="text-sm text-muted-foreground">
                              {selectedPrescription.doctor.phone}
                            </p>
                          )}
                        </div>
                        {selectedPrescription.diagnosis && (
                          <div className="col-span-2">
                            <Label>Diagnosis</Label>
                            <p>{selectedPrescription.diagnosis}</p>
                          </div>
                        )}
                      </div>
                      {/* QR Code - show when processing or ready */}
                      {['processing', 'ready'].includes(selectedPrescription.status) && scanBaseUrl && (
                        <div className="shrink-0 text-center border rounded-lg p-3 bg-muted/30">
                          <p className="text-xs font-medium text-muted-foreground mb-2">Scan for pickup</p>
                          <QRCodeDisplay
                            value={`${scanBaseUrl}/professional/dashboard/scan?id=${selectedPrescription.id}`}
                            size={100}
                            showDownload={true}
                            downloadFileName={`prescription-${selectedPrescription.id}-pickup`}
                          />
                        </div>
                      )}
                    </div>

                    <div>
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                        <div>
                          <Label className="text-base font-semibold">Medications ({selectedPrescription.medications?.length || 0})</Label>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Original (read-only). Set status, qty, and price per line. Your entries are visible to doctor and patient.
                          </p>
                        </div>
                        {['received', 'processing'].includes(selectedPrescription.status) && (
                          <Button size="sm" onClick={saveFulfillment} disabled={savingFulfillment} className="gap-1.5 shrink-0">
                            {savingFulfillment ? <LoadingSpinner size="sm" /> : <Save className="h-4 w-4" />}
                            Save fulfillment
                          </Button>
                        )}
                      </div>
                      <div className="rounded-lg border overflow-auto">
                        <table className="w-full text-sm table-auto">
                          <thead>
                            <tr className="bg-muted/70 border-b">
                              <th className="text-left p-2.5 font-semibold text-foreground whitespace-nowrap">Medication</th>
                              <th className="text-left p-2.5 font-medium text-muted-foreground whitespace-nowrap">Form</th>
                              <th className="text-center p-2.5 font-medium text-muted-foreground whitespace-nowrap">Qty</th>
                              <th className="text-left p-2.5 font-medium text-muted-foreground whitespace-nowrap">Schedule</th>
                              <th className="text-left p-2.5 font-semibold text-foreground whitespace-nowrap">Status</th>
                              <th className="text-center p-2.5 font-semibold text-foreground whitespace-nowrap">Disp.</th>
                              <th className="text-right p-2.5 font-semibold text-foreground whitespace-nowrap">Price</th>
                              <th className="text-left p-2.5 font-semibold text-foreground" style={{minWidth: '280px'}}>Substitute / Notes</th>
                            </tr>
                          </thead>
                          <tbody>
                            {selectedPrescription.medications?.map((med: any, index: number) => {
                              const f = getFulfillmentForIndex(index)
                              const schedule = [med.frequency, med.duration].filter(Boolean).join(', ') || '—'
                              const isEditable = ['received', 'processing'].includes(selectedPrescription.status)
                              const needsSubstitute = f.status === 'substituted'
                              const needsDispensedQty = f.status === 'partial' || f.status === 'substituted'
                              const showApprovalBadge = f.status === 'pending_approval' || (f.status === 'substituted' && f.requires_doctor_approval)
                              return (
                                <tr key={index} className={`border-b last:border-0 transition-colors ${
                                  f.status === 'out_of_stock' ? 'bg-red-50/50' :
                                  f.status === 'pending_approval' ? 'bg-amber-50/50' :
                                  f.status === 'substituted' ? 'bg-purple-50/50' :
                                  f.status === 'partial' ? 'bg-yellow-50/50' :
                                  'bg-background hover:bg-muted/20'
                                }`}>
                                  <td className="p-2.5 font-medium align-top whitespace-nowrap" title={med.instructions ? `Instructions: ${med.instructions}` : undefined}>
                                    <div className="font-semibold">{med.medication_name || '—'}</div>
                                    <div className="text-xs text-muted-foreground">{med.dosage || ''}</div>
                                  </td>
                                  <td className="p-2.5 text-muted-foreground align-top text-sm whitespace-nowrap">{med.form || '—'}</td>
                                  <td className="p-2.5 text-center align-top font-medium">{med.quantity ?? '—'}</td>
                                  <td className="p-2.5 text-muted-foreground align-top text-sm whitespace-nowrap">{schedule}</td>
                                  <td className="p-2.5 align-top" style={{minWidth: '150px'}}>
                                    {isEditable ? (
                                      <div className="space-y-1.5">
                                        <Select
                                          value={f.status}
                                          onValueChange={(v: PharmacyFulfillmentItem['status']) => setFulfillmentForIndex(index, { status: v })}
                                        >
                                          <SelectTrigger className="h-8 text-sm border-muted-foreground/30" style={{minWidth: '130px'}}>
                                            <SelectValue />
                                          </SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="available">✓ Available</SelectItem>
                                            <SelectItem value="partial">⚠ Partial qty</SelectItem>
                                            <SelectItem value="out_of_stock">✗ Out of stock</SelectItem>
                                            <SelectItem value="substituted">↔ Substituted</SelectItem>
                                            <SelectItem value="pending_approval">⏳ Pending approval</SelectItem>
                                          </SelectContent>
                                        </Select>
                                        {needsSubstitute && (
                                          <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer whitespace-nowrap">
                                            <input
                                              type="checkbox"
                                              checked={f.requires_doctor_approval ?? false}
                                              onChange={(e) => setFulfillmentForIndex(index, { requires_doctor_approval: e.target.checked })}
                                              className="rounded border-muted-foreground/30"
                                            />
                                            Needs doctor approval
                                          </label>
                                        )}
                                        {showApprovalBadge && f.doctor_approved !== undefined && (
                                          <Badge variant={f.doctor_approved ? 'default' : 'destructive'} className="text-xs">
                                            {f.doctor_approved ? '✓ Approved' : '✗ Rejected'}
                                          </Badge>
                                        )}
                                      </div>
                                    ) : (
                                      <div className="space-y-1">
                                        <Badge variant={
                                          f.status === 'available' ? 'default' : 
                                          f.status === 'out_of_stock' ? 'destructive' : 
                                          f.status === 'pending_approval' ? 'outline' : 'secondary'
                                        } className="text-xs">
                                          {f.status === 'available' ? '✓ Available' : 
                                           f.status === 'partial' ? '⚠ Partial' : 
                                           f.status === 'out_of_stock' ? '✗ Out of stock' : 
                                           f.status === 'pending_approval' ? '⏳ Pending' : '↔ Substituted'}
                                        </Badge>
                                        {showApprovalBadge && f.doctor_approved !== undefined && (
                                          <Badge variant={f.doctor_approved ? 'default' : 'destructive'} className="text-xs block w-fit">
                                            {f.doctor_approved ? '✓ Dr. Approved' : '✗ Dr. Rejected'}
                                          </Badge>
                                        )}
                                      </div>
                                    )}
                                  </td>
                                  <td className="p-2.5 align-top text-center">
                                    {isEditable && needsDispensedQty ? (
                                      <Input
                                        type="number"
                                        min={0}
                                        value={f.dispensed_quantity ?? ''}
                                        onChange={(e) => setFulfillmentForIndex(index, { dispensed_quantity: e.target.value ? parseInt(e.target.value, 10) : undefined })}
                                        className="h-8 text-center mx-auto text-sm"
                                        style={{width: '60px'}}
                                        placeholder="0"
                                      />
                                    ) : f.dispensed_quantity != null ? (
                                      <span className="text-muted-foreground font-medium">{f.dispensed_quantity}</span>
                                    ) : f.status === 'available' ? (
                                      <span className="text-green-600 font-medium">{med.quantity ?? '—'}</span>
                                    ) : (
                                      <span className="text-muted-foreground">—</span>
                                    )}
                                  </td>
                                  <td className="p-2.5 align-top text-right whitespace-nowrap">
                                    {isEditable ? (
                                      <div className="flex items-center justify-end gap-1">
                                        <Input
                                          type="number"
                                          min={0}
                                          step={10}
                                          value={f.unit_price ?? ''}
                                          onChange={(e) => setFulfillmentForIndex(index, { unit_price: e.target.value ? parseFloat(e.target.value) : undefined })}
                                          className="h-8 text-right text-sm"
                                          style={{width: '80px'}}
                                          placeholder="0"
                                        />
                                        <span className="text-sm text-muted-foreground">DZD</span>
                                      </div>
                                    ) : f.unit_price != null ? (
                                      <span className="font-medium">{f.unit_price.toLocaleString()} DZD</span>
                                    ) : (
                                      <span className="text-muted-foreground">—</span>
                                    )}
                                  </td>
                                  <td className="p-2.5 align-top" style={{minWidth: '280px'}}>
                                    {isEditable ? (
                                      <div className="space-y-2">
                                        {needsSubstitute && (
                                          <div className="flex gap-2">
                                            <Input
                                              placeholder="Substitute medication name"
                                              value={f.substitute_name ?? ''}
                                              onChange={(e) => setFulfillmentForIndex(index, { substitute_name: e.target.value || undefined })}
                                              className="h-8 text-sm flex-1"
                                              style={{minWidth: '160px'}}
                                            />
                                            <Input
                                              placeholder="Dosage"
                                              value={f.substitute_dosage ?? ''}
                                              onChange={(e) => setFulfillmentForIndex(index, { substitute_dosage: e.target.value || undefined })}
                                              className="h-8 text-sm"
                                              style={{width: '80px'}}
                                            />
                                          </div>
                                        )}
                                        {f.status === 'out_of_stock' && (
                                          <Input
                                            type="date"
                                            placeholder="Expected date"
                                            value={f.back_order_date ?? ''}
                                            onChange={(e) => setFulfillmentForIndex(index, { back_order_date: e.target.value || undefined })}
                                            className="h-8 text-sm"
                                          />
                                        )}
                                        <Input
                                          placeholder="Notes (optional)"
                                          value={f.pharmacy_notes ?? ''}
                                          onChange={(e) => setFulfillmentForIndex(index, { pharmacy_notes: e.target.value || undefined })}
                                          className="h-8 text-sm"
                                        />
                                      </div>
                                    ) : (
                                      <div className="space-y-0.5 text-xs">
                                        {f.substitute_name && (
                                          <div className="text-purple-700 font-medium">
                                            ↔ {f.substitute_name}{f.substitute_dosage ? ` ${f.substitute_dosage}` : ''}
                                          </div>
                                        )}
                                        {f.back_order_date && (
                                          <div className="text-amber-600">Expected: {new Date(f.back_order_date).toLocaleDateString()}</div>
                                        )}
                                        {f.pharmacy_notes && (
                                          <div className="text-muted-foreground">{f.pharmacy_notes}</div>
                                        )}
                                        {!f.substitute_name && !f.back_order_date && !f.pharmacy_notes && (
                                          <span className="text-muted-foreground">—</span>
                                        )}
                                      </div>
                                    )}
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                          {/* Total Price Footer */}
                          <tfoot>
                            <tr className="bg-muted/50 border-t-2">
                              <td colSpan={6} className="p-2 text-right font-semibold">Total:</td>
                              <td className="p-2 text-right font-bold text-lg">
                                {localFulfillment.reduce((sum, f) => sum + (f.unit_price || 0), 0).toLocaleString()} DZD
                              </td>
                              <td className="p-2"></td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>

                    {selectedPrescription.notes && (
                      <div>
                        <Label>Doctor Notes</Label>
                        <p className="text-sm bg-muted/50 p-2 rounded">{selectedPrescription.notes}</p>
                      </div>
                    )}

                    {/* Estimated Ready Time - only show when processing */}
                    {['received', 'processing'].includes(selectedPrescription.status) && (
                      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <Label className="flex items-center gap-2 text-blue-800">
                          <Clock className="h-4 w-4" />
                          Estimated Ready Time
                        </Label>
                        <p className="text-xs text-blue-600 mt-1 mb-2">
                          Set when the prescription will be ready for pickup. Patient and doctor will see this.
                        </p>
                        <Input
                          type="datetime-local"
                          value={estimatedReadyAt}
                          onChange={(e) => setEstimatedReadyAt(e.target.value)}
                          className="max-w-xs"
                        />
                      </div>
                    )}

                    {/* Show estimated ready time if set and not editable */}
                    {!['received', 'processing'].includes(selectedPrescription.status) && selectedPrescription.estimated_ready_at && (
                      <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                        <Label className="flex items-center gap-2 text-green-800">
                          <Clock className="h-4 w-4" />
                          Estimated Ready
                        </Label>
                        <p className="font-medium text-green-700">
                          {new Date(selectedPrescription.estimated_ready_at).toLocaleString()}
                        </p>
                      </div>
                    )}

                    <Separator />

                    <div>
                      <Label>Status Actions</Label>
                      <div className="flex gap-2 mt-2">
                        {selectedPrescription.status === 'sent' && (
                          <Button onClick={() => updateStatus(selectedPrescription.id, 'received')}>
                            Mark as Received
                          </Button>
                        )}
                        {selectedPrescription.status === 'received' && (
                          <Button onClick={() => updateStatus(selectedPrescription.id, 'processing')}>
                            Start Processing
                          </Button>
                        )}
                        {selectedPrescription.status === 'processing' && (
                          <Button onClick={() => updateStatus(selectedPrescription.id, 'ready')}>
                            Mark as Ready
                          </Button>
                        )}
                        {selectedPrescription.status === 'ready' && (
                          <>
                            <Button onClick={() => updateStatus(selectedPrescription.id, 'picked_up')}>
                              Mark as Picked Up
                            </Button>
                            <Button variant="outline" onClick={() => updateStatus(selectedPrescription.id, 'delivered')}>
                              Mark as Delivered
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                </div>
              </TabsContent>

              <TabsContent value="discussion" className="mt-4 flex-1 flex flex-col min-h-0 overflow-hidden">
                {loadingMessages ? (
                  <div className="flex items-center justify-center py-12">
                    <LoadingSpinner size="lg" className="text-muted-foreground" />
                  </div>
                ) : !thread ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p className="font-medium">No discussion thread for this prescription yet.</p>
                    <p className="text-sm mt-1">The prescriber will open a thread when the order is sent.</p>
                  </div>
                ) : (
                  <div className="flex flex-col flex-1 min-h-0 gap-4">
                    <p className="text-sm text-muted-foreground">Notes and updates between prescriber, pharmacy, and patient.</p>
                    <div className="flex flex-1 min-h-0 gap-4 overflow-hidden">
                      <div className="flex flex-col flex-1 min-w-0 min-h-0">
                        <ScrollArea className="flex-1 pr-4 border rounded-lg p-4 min-h-[280px] max-h-[450px]">
                      <div className="space-y-4">
                        {messages.length === 0 ? (
                          <div className="text-center py-8 text-muted-foreground">
                            <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-50" />
                            <p>No notes yet.</p>
                            <p className="text-sm mt-1">Add a note or ask a question for the care team.</p>
                          </div>
                        ) : (
                          messages.map((message) => {
                            const isOwn = message.sender_id === user?.id
                            const senderName = message.sender?.full_name || message.sender?.business_name || 'User'
                            const isProfessional = !!message.sender?.business_name && !isOwn
                            const avatarColor = isOwn
                              ? 'bg-emerald-100 text-emerald-700'
                              : isProfessional
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-violet-100 text-violet-700'
                            
                            return (
                              <div key={message.id} className={`flex gap-3 ${isOwn ? 'flex-row-reverse' : ''}`}>
                                <Avatar className={`h-10 w-10 flex-shrink-0 ring-2 ring-offset-2 ${isOwn ? 'ring-emerald-200' : isProfessional ? 'ring-blue-200' : 'ring-violet-200'}`}>
                                  <AvatarImage src={message.sender?.avatar_url} />
                                  <AvatarFallback className={`text-sm font-semibold ${avatarColor}`}>
                                    {getInitials(senderName)}
                                  </AvatarFallback>
                                </Avatar>
                                <div className={`flex-1 ${isOwn ? 'items-end' : 'items-start'} flex flex-col min-w-0`}>
                                  <div className={`rounded-xl px-4 py-3 max-w-[85%] shadow-sm ${isOwn ? 'bg-emerald-600 text-white' : 'bg-slate-100 dark:bg-slate-800'}`}>
                                    {!isOwn && (
                                      <p className={`text-xs font-semibold mb-1 ${isProfessional ? 'text-blue-600 dark:text-blue-400' : 'text-violet-600 dark:text-violet-400'}`}>
                                        {senderName}
                                      </p>
                                    )}
                                    {message.message_type === 'system' ? (
                                      <p className={`text-xs italic ${(message.content || '').toLowerCase().includes('declined') || (message.content || '').toLowerCase().includes('denied') ? 'text-red-600 dark:text-red-400 font-medium bg-red-50 dark:bg-red-950/30 px-2 py-1 rounded' : 'opacity-70'}`}>{message.content}</p>
                                    ) : (
                                      <>
                                        {message.content && (
                                          <p className={`text-sm whitespace-pre-wrap break-words ${(message.content || '').toLowerCase().includes('declined') || (message.content || '').toLowerCase().includes('denied') ? 'text-red-600 dark:text-red-400 font-medium bg-red-50 dark:bg-red-950/30 px-2 py-1 rounded' : ''}`}>{message.content}</p>
                                        )}
                                        {message.chat_attachments && message.chat_attachments.length > 0 && (
                                          <div className="mt-3 space-y-2">
                                            {message.chat_attachments.map((att) => {
                                              const isImage = (att.file_type || '').startsWith('image/')
                                              return (
                                                <div key={att.id} className={`p-2 rounded-lg ${isOwn ? 'bg-white/20' : 'bg-slate-200/50 dark:bg-slate-700/50'}`}>
                                                  {isImage && att.url ? (
                                                    <button
                                                      type="button"
                                                      onClick={() => setImagePreviewUrl(att.url || null)}
                                                      className="block text-left hover:opacity-90 transition-opacity"
                                                    >
                                                      <img
                                                        src={att.url}
                                                        alt={att.file_name || 'Image'}
                                                        className="max-w-[160px] max-h-[160px] rounded-lg object-cover border shadow-sm"
                                                      />
                                                    </button>
                                                  ) : (
                                                    <div className="flex items-center gap-2 w-full min-w-0">
                                                      <FileText className="h-4 w-4 flex-shrink-0" />
                                                      <a href={att.url} target="_blank" rel="noopener noreferrer" className="text-sm hover:underline flex-1 truncate min-w-0">
                                                        {att.file_name}
                                                      </a>
                                                      <Badge variant="outline" className="text-xs">
                                                        {(att.file_size || 0) / 1024 > 1024 ? `${((att.file_size || 0) / 1024 / 1024).toFixed(1)} MB` : `${((att.file_size || 0) / 1024).toFixed(0)} KB`}
                                                      </Badge>
                                                      <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                                                        <a href={att.url} target="_blank" rel="noopener noreferrer">
                                                          <Download className="h-4 w-4" />
                                                        </a>
                                                      </Button>
                                                    </div>
                                                  )}
                                                </div>
                                              )
                                            })}
                                          </div>
                                        )}
                                      </>
                                    )}
                                    <p className={`text-xs mt-2 ${isOwn ? 'text-white/80' : 'text-muted-foreground'}`}>
                                      {formatMessageTime(message.created_at)}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            )
                          })
                        )}
                        <div ref={messagesEndRef} />
                      </div>
                    </ScrollArea>

                    {selectedFiles.length > 0 && (
                      <div className="mt-2 space-y-2 flex-shrink-0">
                        {selectedFiles.map((file, index) => (
                          <div key={index} className="flex items-center gap-2 p-2 bg-muted rounded-lg">
                            <FileText className="h-4 w-4" />
                            <span className="text-sm flex-1 truncate">{file.name}</span>
                            <Badge variant="outline" className="text-xs">{(file.size / 1024).toFixed(0)} KB</Badge>
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => removeFile(index)}>
                              <XCircle className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex gap-2 pt-3 mt-3 border-t flex-shrink-0">
                      <Button variant="outline" size="icon" onClick={() => fileInputRef.current?.click()} className="flex-shrink-0">
                        <Paperclip className="h-4 w-4" />
                      </Button>
                      <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileSelect} />
                      <Textarea
                        placeholder="Add a note for the care team..."
                        value={messageText}
                        onChange={(e) => setMessageText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault()
                            sendMessage()
                          }
                        }}
                        className="flex-1 min-h-[52px] max-h-[120px]"
                      />
                      <Button
                        onClick={sendMessage}
                        disabled={sendingMessage || (!messageText.trim() && selectedFiles.length === 0)}
                        className="flex-shrink-0"
                      >
                        {sendingMessage ? <LoadingSpinner size="sm" /> : <Send className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>

                  {/* Files section */}
                  <div className="w-56 flex-shrink-0 flex flex-col border rounded-lg p-3">
                    <button
                      onClick={() => setFilesCollapsed(!filesCollapsed)}
                      className="flex items-center justify-between w-full hover:bg-muted/50 rounded px-2 py-1.5 transition-colors"
                    >
                      <p className="text-xs font-semibold text-muted-foreground uppercase">Files</p>
                      {filesCollapsed ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />}
                    </button>
                    {!filesCollapsed && (() => {
                      const fileItems = messages.flatMap((m: any) =>
                        (m.chat_attachments || []).map((att: any) => ({ ...att, created_at: m.created_at }))
                      )
                      if (fileItems.length === 0) return <p className="text-xs text-muted-foreground py-4">No files yet</p>
                      return (
                        <ScrollArea className="flex-1 max-h-[280px] mt-2">
                          <div className="space-y-1.5">
                            {fileItems.map((att: any) => {
                              const isImage = (att.file_type || '').startsWith('image/')
                              const fileUrl = att.url || (att.storage_path?.startsWith('http') ? att.storage_path : supabase.storage.from('chat-attachments').getPublicUrl(att.storage_path || '').data.publicUrl)
                              return (
                                <button
                                  key={att.id}
                                  onClick={() => {
                                    if (isImage && fileUrl) setImagePreviewUrl(fileUrl)
                                    else if (fileUrl) window.open(fileUrl, '_blank')
                                  }}
                                  className="w-full flex items-center gap-2 p-2 rounded-lg border bg-muted/30 hover:bg-muted/60 transition-colors text-left"
                                >
                                  {isImage && fileUrl ? (
                                    <img src={fileUrl} alt="" className="h-10 w-10 rounded object-cover flex-shrink-0" />
                                  ) : (
                                    <FileText className="h-4 w-4 text-primary flex-shrink-0" />
                                  )}
                                  <div className="min-w-0 flex-1">
                                    <span className="text-xs truncate block font-medium">{att.file_name || 'File'}</span>
                                    <span className="text-[10px] text-muted-foreground">{format(new Date(att.created_at || 0), 'MMM d, HH:mm')}</span>
                                  </div>
                                  <ExternalLink className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                                </button>
                              )
                            })}
                          </div>
                        </ScrollArea>
                      )
                    })()}
                  </div>
                </div>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetails(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Image Preview Modal */}
      <ImagePreviewDialog
        open={!!imagePreviewUrl}
        onOpenChange={(open) => { if (!open) setImagePreviewUrl(null) }}
        src={imagePreviewUrl || ''}
        alt="Preview"
      />

      {/* Decline Reason Dialog */}
      <Dialog open={declineDialogOpen} onOpenChange={setDeclineDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <XCircle className="h-5 w-5" />
              Decline Prescription
            </DialogTitle>
            <DialogDescription>
              Please provide a reason for declining this prescription. This will be visible to the prescribing doctor.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="decline-reason" className="text-sm font-medium">
              Reason for Declining (optional)
            </Label>
            <Textarea
              id="decline-reason"
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
              placeholder="e.g., Medication out of stock, Patient not registered, etc."
              className="mt-2"
              rows={3}
            />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeclineDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDecline} disabled={updating}>
              {updating ? <LoadingSpinner size="sm" className="me-2" /> : null}
              Confirm Decline
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
