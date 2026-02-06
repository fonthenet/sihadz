'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { LoadingSpinner } from '@/components/ui/page-loading'
import { createBrowserClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Send,
  Paperclip,
  FileText,
  Image as ImageIcon,
  X,
  MessageSquare,
  Pill,
  FlaskConical,
  UserPlus,
  CheckCircle,
  AlertCircle,
  Download,
  Trash2,
  Settings,
  MoreVertical,
  Plus,
  ChevronDown,
  ChevronUp,
  Printer,
  Send as SendIcon,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import PrescriptionBuilder from './prescription-builder'
import LabTestRequestBuilder from './lab-test-request-builder'
import PharmacySelector from './pharmacy-selector'
import LaboratorySelector from './laboratory-selector'
import { format, isToday, isYesterday } from 'date-fns'

interface AppointmentThreadProps {
  threadId?: string // If provided, use this thread ID directly instead of querying
  appointmentId: string
  doctorId: string
  patientId?: string
  threadType?: 'prescription' | 'lab' | 'referral' | null
  targetId?: string
  targetName?: string
  /** When true, show a highlight (e.g. new pharmacy thread added below). */
  isNew?: boolean
  /** When true, hide the loading card (parent shows one section-level loading instead). */
  suppressLoadingCard?: boolean
  /** Called when this thread has finished loading (found or created). */
  onLoaded?: () => void
  /** Called when a new thread is created, passing the thread ID so parent can store it. */
  onThreadCreated?: (threadId: string) => void
  onThreadDeleted?: () => void
  onPharmacyChanged?: (pharmacyId: string, pharmacyName: string) => void
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

export default function AppointmentThread({
  threadId: propThreadId,
  appointmentId,
  doctorId,
  patientId,
  threadType,
  targetId,
  targetName,
  isNew = false,
  suppressLoadingCard = false,
  onLoaded,
  onThreadCreated,
  onThreadDeleted,
  onPharmacyChanged,
}: AppointmentThreadProps) {
  const supabase = createBrowserClient()
  const { toast } = useToast()
  const [user, setUser] = useState<{ id: string } | null>(null)
  const [thread, setThread] = useState<any>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [messageText, setMessageText] = useState('')
  const [activeTab, setActiveTab] = useState<'messages' | 'prescription' | 'lab' | 'files'>('messages')
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const threadRef = useRef<any>(null)
  const subscriptionCleanupRef = useRef<(() => void) | null>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showChangePharmacy, setShowChangePharmacy] = useState(false)
  const [showChangeLaboratory, setShowChangeLaboratory] = useState(false)
  const [currentPharmacyId, setCurrentPharmacyId] = useState<string | undefined>(
    targetId && threadType === 'prescription' ? targetId : undefined
  )
  const [currentLaboratoryId, setCurrentLaboratoryId] = useState<string | undefined>(
    targetId && threadType === 'lab' ? targetId : undefined
  )
  const [savedPrescription, setSavedPrescription] = useState<{
    id: string
    diagnosis?: string
    notes?: string
    medications: Array<{ medication_name: string; form?: string; dosage: string; quantity?: number; frequency: string; duration: string; instructions?: string }>
    status?: string
    created_at?: string
  } | null>(null)
  const [loadingPrescription, setLoadingPrescription] = useState(false)
  /** All prescriptions sent to this pharmacy for this appointment (so we can show multiple + add new). */
  const [prescriptionsList, setPrescriptionsList] = useState<Array<{
    id: string
    diagnosis?: string
    notes?: string
    medications: Array<{ medication_name: string; form?: string; dosage: string; quantity?: number; frequency: string; duration: string; instructions?: string }>
    status?: string
    created_at?: string
  }>>([])
  const [loadingPrescriptionsList, setLoadingPrescriptionsList] = useState(false)
  const [expandedPrescriptionId, setExpandedPrescriptionId] = useState<string | null>(null)
  /** Increment to remount PrescriptionBuilder and clear form after save */
  const [prescriptionFormKey, setPrescriptionFormKey] = useState(0)
  const [savedLabRequest, setSavedLabRequest] = useState<{
    id: string
    diagnosis?: string
    clinical_notes?: string
    priority?: string
    status?: string
    created_at?: string
    laboratory_id?: string | null
    items?: Array<{ test_type: { name: string; name_ar?: string } }>
  } | null>(null)
  const [loadingLabRequest, setLoadingLabRequest] = useState(false)
  const [labRequestsList, setLabRequestsList] = useState<Array<{
    id: string
    diagnosis?: string
    clinical_notes?: string
    priority?: string
    status?: string
    created_at?: string
    laboratory_id?: string | null
    items?: Array<{ test_type: { name: string; name_ar?: string } }>
  }>>([])
  const [loadingLabRequestsList, setLoadingLabRequestsList] = useState(false)
  const [expandedLabRequestId, setExpandedLabRequestId] = useState<string | null>(null)
  const [labRequestFormKey, setLabRequestFormKey] = useState(0)
  // Send/print actions for draft prescriptions and lab requests
  const [showSendPrescriptionDialog, setShowSendPrescriptionDialog] = useState(false)
  const [showSendLabRequestDialog, setShowSendLabRequestDialog] = useState(false)
  const [selectedPharmacyForSend, setSelectedPharmacyForSend] = useState<{ id: string; name: string } | null>(null)
  const [selectedLabForSend, setSelectedLabForSend] = useState<{ id: string; name: string } | null>(null)
  const [showSendPrescriptionConfirm, setShowSendPrescriptionConfirm] = useState(false)
  const [showSendLabRequestConfirm, setShowSendLabRequestConfirm] = useState(false)
  const [sendingPrescription, setSendingPrescription] = useState(false)
  const [sendingLabRequest, setSendingLabRequest] = useState(false)

  useEffect(() => {
    if (targetId && threadType === 'prescription') {
      setCurrentPharmacyId(targetId)
    }
  }, [targetId, threadType])

  useEffect(() => {
    const loadUser = async () => {
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
      if (authError) {
        console.error('[AppointmentThread] Error getting auth user:', authError)
      }
      if (authUser) {
        console.log('[AppointmentThread] Current auth user:', { id: authUser.id, email: authUser.email })
        setUser(authUser)
      }
    }
    loadUser()
  }, [])

  useEffect(() => {
    if (user && appointmentId) {
      findOrCreateThread()
    }
  }, [user, appointmentId, threadType, targetId])

  useEffect(() => {
    threadRef.current = thread
  }, [thread])

  useEffect(() => {
    // Cleanup previous subscription before setting up new one
    if (subscriptionCleanupRef.current) {
      subscriptionCleanupRef.current()
      subscriptionCleanupRef.current = null
    }

    if (!thread) {
      setMessages([])
      return
    }

    const currentThreadId = thread.id // Capture thread.id to ensure we use the correct one

    // Load messages for this thread (don't clear first — avoids losing messages on reload)
    loadMessages()
    
    // Subscribe to new messages for this specific thread
    const unsubscribe = subscribeToMessages()
    if (unsubscribe) {
      subscriptionCleanupRef.current = unsubscribe
    }
    
    // Cleanup: remove subscription when thread changes or component unmounts
    return () => {
      if (subscriptionCleanupRef.current) {
        subscriptionCleanupRef.current()
        subscriptionCleanupRef.current = null
      }
    }
  }, [thread?.id]) // Only re-run when thread.id changes, not when thread object reference changes

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const loadSavedPrescription = useCallback(async (prescriptionId: string) => {
    setLoadingPrescription(true)
    try {
      const { data, error } = await supabase
        .from('prescriptions')
        .select('id, doctor_id, diagnosis, notes, medications, status, created_at')
        .eq('id', prescriptionId)
        .maybeSingle()
      if (!error && data) setSavedPrescription(data as any)
      else setSavedPrescription(null)
    } catch {
      setSavedPrescription(null)
    } finally {
      setLoadingPrescription(false)
    }
  }, [])

  const getPrescriptionStatusLabel = (status: string | undefined) => {
    const labels: Record<string, string> = {
      sent: 'Sent',
      received: 'Received',
      processing: 'Processing',
      ready: 'Ready for pickup',
      picked_up: 'Picked up',
      declined: 'Declined',
      delivered: 'Delivered',
      cancelled: 'Cancelled',
    }
    return status ? (labels[status] || status) : '—'
  }

  const getLabRequestStatusLabel = (status: string | undefined) => {
    const labels: Record<string, string> = {
      pending: 'Pending',
      sent: 'Sent',
      received: 'Received',
      in_progress: 'In Progress',
      completed: 'Completed',
      cancelled: 'Cancelled',
    }
    return status ? (labels[status] || status) : '—'
  }

  const loadPrescriptionsForPharmacy = useCallback(async () => {
    const pharmacyId = currentPharmacyId || (thread?.metadata?.target_id as string) || targetId
    if (!appointmentId || !doctorId) return
    const isDraft = typeof pharmacyId === 'string' && pharmacyId.startsWith('draft-')
    if (!isDraft && !pharmacyId) return
    setLoadingPrescriptionsList(true)
    try {
      let q = supabase
        .from('prescriptions')
        .select('id, prescription_number, diagnosis, notes, medications, status, created_at')
        .eq('appointment_id', appointmentId)
        .eq('doctor_id', doctorId)
        .order('created_at', { ascending: false })
      if (isDraft) {
        q = q.is('pharmacy_id', null)
      } else {
        q = q.eq('pharmacy_id', pharmacyId)
      }
      const { data, error } = await q
      if (!error && data) setPrescriptionsList(data as any[])
      else setPrescriptionsList([])
    } catch {
      setPrescriptionsList([])
    } finally {
      setLoadingPrescriptionsList(false)
    }
  }, [appointmentId, doctorId, currentPharmacyId, thread?.metadata?.target_id, targetId])

  useEffect(() => {
    const pid = thread?.metadata?.prescription_id
    if (thread?.id && pid) {
      loadSavedPrescription(pid)
      return
    }
    if (thread?.id && thread?.ticket_id) {
      supabase
        .from('healthcare_tickets')
        .select('prescription_id')
        .eq('id', thread.ticket_id)
        .maybeSingle()
        .then(({ data }) => {
          if (data?.prescription_id) loadSavedPrescription(data.prescription_id)
          else setSavedPrescription(null)
        })
      return
    }
    setSavedPrescription(null)
  }, [thread?.id, thread?.metadata?.prescription_id, thread?.ticket_id, loadSavedPrescription])

  useEffect(() => {
    if ((threadType === 'prescription' || thread?.order_type === 'prescription') && thread?.id && appointmentId && doctorId) {
      loadPrescriptionsForPharmacy()
    } else {
      setPrescriptionsList([])
    }
  }, [thread?.id, thread?.order_type, threadType, appointmentId, doctorId, loadPrescriptionsForPharmacy])

  const loadSavedLabRequest = useCallback(async (labRequestId: string) => {
    setLoadingLabRequest(true)
    try {
      const res = await fetch(`/api/lab-requests/${labRequestId}`, { credentials: 'include' })
      const data = await res.json()
      if (res.ok && data?.id) setSavedLabRequest(data as any)
      else setSavedLabRequest(null)
    } catch {
      setSavedLabRequest(null)
    } finally {
      setLoadingLabRequest(false)
    }
  }, [])

  const loadLabRequestsForLaboratory = useCallback(async () => {
    const laboratoryId = currentLaboratoryId || (thread?.metadata?.target_id as string) || targetId
    if (!appointmentId || !doctorId) return
    const isDraft = typeof laboratoryId === 'string' && laboratoryId.startsWith('draft-')
    if (!isDraft && !laboratoryId) return
    setLoadingLabRequestsList(true)
    try {
      const params = new URLSearchParams({ doctor_id: doctorId })
      if (isDraft) params.set('laboratory_id', 'draft')
      else params.set('laboratory_id', laboratoryId)
      const res = await fetch(`/api/appointments/${appointmentId}/lab-requests?${params}`, { credentials: 'include' })
      const json = await res.json()
      if (res.ok && Array.isArray(json.labRequests)) setLabRequestsList(json.labRequests)
      else setLabRequestsList([])
    } catch {
      setLabRequestsList([])
    } finally {
      setLoadingLabRequestsList(false)
    }
  }, [appointmentId, doctorId, currentLaboratoryId, thread?.metadata?.target_id, targetId])

  useEffect(() => {
    const lid = thread?.metadata?.lab_request_id
    if (thread?.id && lid) {
      loadSavedLabRequest(lid)
      return
    }
    if (thread?.id && thread?.ticket_id) {
      supabase
        .from('healthcare_tickets')
        .select('lab_request_id')
        .eq('id', thread.ticket_id)
        .maybeSingle()
        .then(({ data }) => {
          if (data?.lab_request_id) loadSavedLabRequest(data.lab_request_id)
          else setSavedLabRequest(null)
        })
      return
    }
    setSavedLabRequest(null)
  }, [thread?.id, thread?.metadata?.lab_request_id, thread?.ticket_id, loadSavedLabRequest])

  useEffect(() => {
    if ((threadType === 'lab' || thread?.order_type === 'lab') && thread?.id && appointmentId && doctorId) {
      loadLabRequestsForLaboratory()
    } else {
      setLabRequestsList([])
    }
  }, [thread?.id, thread?.order_type, threadType, appointmentId, doctorId, loadLabRequestsForLaboratory])

  // Realtime: when pharmacy updates prescription status, refetch so doctor sees it
  const pharmacyIdForPrescriptions = currentPharmacyId || (thread?.metadata?.target_id as string) || targetId
  useEffect(() => {
    if (!appointmentId || !pharmacyIdForPrescriptions || !doctorId) return
    const channel = supabase
      .channel(`prescriptions:${appointmentId}:${pharmacyIdForPrescriptions}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'prescriptions',
          filter: `appointment_id=eq.${appointmentId}`,
        },
        () => {
          loadPrescriptionsForPharmacy()
          const pid = thread?.metadata?.prescription_id
          if (pid) loadSavedPrescription(pid)
          else if (thread?.ticket_id) {
            supabase.from('healthcare_tickets').select('prescription_id').eq('id', thread.ticket_id).maybeSingle().then(({ data }) => {
              if (data?.prescription_id) loadSavedPrescription(data.prescription_id)
            })
          }
        }
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [appointmentId, pharmacyIdForPrescriptions, doctorId, thread?.id, thread?.metadata?.prescription_id, thread?.ticket_id, loadPrescriptionsForPharmacy, loadSavedPrescription])

  const loadUser = async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (authUser) setUser(authUser)
  }

  const findOrCreateThread = async () => {
    if (!user || !appointmentId) return

    // Already have this thread loaded — don't re-run (avoids duplicate creation / state churn when sending messages)
    if (propThreadId && threadRef.current?.id === propThreadId) {
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      // If threadId is provided as prop, use it directly (most reliable - no query needed)
      if (propThreadId) {
        const { data: directThread, error: directError } = await supabase
          .from('chat_threads')
          .select('*')
          .eq('id', propThreadId)
          .single()

        if (directError) {
          console.error('[Thread Lookup] Error loading thread by ID:', directError)
          throw new Error(directError.message || 'Failed to load thread')
        }

        if (directThread) {
          // Require only appointment match when parent gave us this threadId (parent already chose this thread for this slot)
          const matchesAppointment = directThread.order_id === appointmentId ||
            directThread.metadata?.appointment_id === appointmentId

          // If order_id is missing but metadata has appointment_id, update order_id for consistency
          if (!directThread.order_id && directThread.metadata?.appointment_id === appointmentId) {
            console.log(`[Thread Lookup] Updating thread ${directThread.id} to set order_id from metadata`)
            await supabase
              .from('chat_threads')
              .update({ order_id: appointmentId })
              .eq('id', directThread.id)
            directThread.order_id = appointmentId // Update local object
          }

          if (matchesAppointment) {
            console.log(`[Thread Lookup] Using provided threadId ${propThreadId} - matches appointment ${appointmentId}`)
            setThread(directThread)
            setLoading(false)
            onLoaded?.()
            return
          }
          // If appointment doesn't match, fall through to query-based lookup (don't use this thread for another appointment)
        }
      }

      // If we already have the correct thread for this appointment+target, don't re-fetch or create (keeps messages in this thread)
      const current = threadRef.current
      if (
        current &&
        (current.order_id === appointmentId || current.metadata?.appointment_id === appointmentId) && // Check both for compatibility
        (current.metadata?.target_id === targetId || !targetId)
      ) {
        setLoading(false)
        return
      }

      // Find existing thread for this appointment
      // PRIMARY: Use order_id (appointment/visit number) as the main tracking field
      // FALLBACK: Also check metadata->>appointment_id for backward compatibility with older threads
      let query = supabase
        .from('chat_threads')
        .select('*')
        .or(`order_id.eq.${appointmentId},metadata->>appointment_id.eq.${appointmentId}`) // Check both for compatibility
      
      if (threadType) {
        query = query.eq('order_type', threadType)
      } else {
        query = query.in('order_type', ['prescription', 'lab', 'referral'])
      }

      // For prescription/lab/referral, filter by target so we get the thread for this specific pharmacy/lab/doctor
      // CRITICAL: Always filter by targetId when provided to avoid getting wrong thread
      if (targetId) {
        query = query.eq('metadata->>target_id', targetId)
      } else if (threadType) {
        // If we have threadType but no targetId, we can't safely find a thread (might be multiple)
        console.warn('Cannot find thread: threadType provided but no targetId', { threadType, appointmentId })
        setLoading(false)
        return
      }

      const { data: rows, error: findError } = await query

      if (findError) {
        const msg = findError.message || (typeof findError === 'object' && findError !== null && 'message' in findError ? String((findError as any).message) : 'Failed to find thread')
        console.error('Error finding thread:', msg, findError)
        throw new Error(msg)
      }

      // If multiple threads found, log warning and take the one matching targetId
      let existingThreads = null
      if (Array.isArray(rows) && rows.length > 0) {
        console.log(`[Thread Lookup] Found ${rows.length} thread(s) for appointment ${appointmentId}, targetId: ${targetId}`, {
          threads: rows.map((t: any) => ({
            id: t.id,
            target_id: t.metadata?.target_id,
            order_type: t.order_type,
            title: t.title
          }))
        })

        if (rows.length > 1) {
          // If we have targetId, filter to exact match
          if (targetId) {
            const matching = rows.find((t: any) => t.metadata?.target_id === targetId)
            if (matching) {
              existingThreads = matching
              console.log(`[Thread Lookup] Selected thread matching targetId ${targetId}:`, matching.id)
            } else {
              console.error(`[Thread Lookup] No thread found matching targetId ${targetId}`, {
                availableTargetIds: rows.map((t: any) => t.metadata?.target_id)
              })
              setLoading(false)
              return
            }
          } else {
            console.warn(`[Thread Lookup] Multiple threads found but no targetId provided, taking first one`)
            existingThreads = rows[0]
          }
        } else {
          existingThreads = rows[0]
          console.log(`[Thread Lookup] Found single thread:`, existingThreads.id, `target_id: ${existingThreads.metadata?.target_id}`)
        }
        
        // CRITICAL: Verify the thread matches our criteria before using it
        if (targetId && existingThreads.metadata?.target_id !== targetId) {
          console.error('[Thread Lookup] Thread target_id mismatch:', { 
            expected: targetId, 
            found: existingThreads.metadata?.target_id,
            threadId: existingThreads.id,
            threadTitle: existingThreads.title
          })
          setLoading(false)
          return
        }
      } else {
        console.log(`[Thread Lookup] No threads found for appointment ${appointmentId}, targetId: ${targetId}`)
      }

      if (existingThreads) {
        // Double-check thread matches appointment - check both order_id and metadata for compatibility
        const matchesAppointment = existingThreads.order_id === appointmentId || 
                                   existingThreads.metadata?.appointment_id === appointmentId
        
        // If order_id is missing but metadata has appointment_id, update order_id for consistency
        if (!existingThreads.order_id && existingThreads.metadata?.appointment_id === appointmentId) {
          console.log(`[Thread Lookup] Updating thread ${existingThreads.id} to set order_id from metadata`)
          await supabase
            .from('chat_threads')
            .update({ order_id: appointmentId })
            .eq('id', existingThreads.id)
          existingThreads.order_id = appointmentId // Update local object
        }
        
        if (!matchesAppointment) {
          console.error('Thread appointment mismatch:', {
            expectedAppointmentId: appointmentId,
            foundOrderId: existingThreads.order_id,
            foundMetadataAppointmentId: existingThreads.metadata?.appointment_id
          })
          setLoading(false)
          return
        }

        setThread(existingThreads)
        setLoading(false)
        onLoaded?.()
        return
      }

      // If no thread exists and we have threadType and targetId, create one
      if (threadType && targetId) {
        const { data: doctor, error: doctorError } = await supabase
          .from('professionals')
          .select('auth_user_id')
          .eq('id', doctorId)
          .single()

        if (doctorError) {
          console.error('Error fetching doctor:', doctorError)
          throw new Error(doctorError.message || 'Failed to fetch doctor information')
        }

        if (!doctor?.auth_user_id) {
          throw new Error('Doctor not found')
        }

        const { data: appointment, error: appointmentError } = await supabase
          .from('appointments')
          .select('patient_id')
          .eq('id', appointmentId)
          .single()

        if (appointmentError) {
          console.error('Error fetching appointment:', appointmentError)
        }

        const isDraft = String(targetId).startsWith('draft-')
        let threadTitle: string
        let ticketId: string | null = null
        let threadInsert: Record<string, unknown>
        let members: { thread_id: string; user_id: string; role: string }[] = [
          { thread_id: '', user_id: doctor.auth_user_id, role: 'admin' },
        ]
        let target: { auth_user_id?: string; type: string; business_name?: string } | null = null
        let targetHasAccount = false

        if (isDraft) {
          // Create prescription/lab first, then send later — no pharmacy/lab selected, no ticket yet
          threadTitle = targetName || (threadType === 'prescription' ? 'Prescription (draft)' : 'Lab Request (draft)')
          threadInsert = {
            type: 'group',
            title: threadTitle,
            order_type: threadType,
            order_id: appointmentId,
            created_by: doctor.auth_user_id,
            metadata: {
              appointment_id: appointmentId,
              doctor_id: doctorId,
              target_id: targetId,
              target_type: 'draft',
            },
          }
          if (appointment?.patient_id) {
            members.push({ thread_id: '', user_id: appointment.patient_id, role: 'member' })
          }
        } else {
          const { data: targetRow, error: targetError } = await supabase
            .from('professionals')
            .select('id, type, business_name, auth_user_id')
            .eq('id', targetId)
            .maybeSingle()

          if (targetError) {
            const errMsg = (targetError as any).message ?? (targetError as any).details ?? 'Failed to fetch provider information'
            console.error('Error fetching target provider:', errMsg, targetError)
            throw new Error(errMsg)
          }

          if (!targetRow) {
            throw new Error('Target provider not found. The pharmacy or lab may have been removed or you may need to select it again.')
          }

          target = targetRow
          targetHasAccount = !!target.auth_user_id
          if (!targetHasAccount) {
            console.warn('[findOrCreateThread] Target provider has no linked account (auth_user_id is null):', targetId, target?.business_name)
          }

          threadTitle = threadType === 'prescription'
            ? `Prescription - ${targetName || target?.business_name}`
            : threadType === 'lab'
            ? `Lab Request - ${targetName || target?.business_name}`
            : `Referral - ${targetName || target?.business_name}`

          if (threadType === 'prescription') {
            try {
              const ticketRes = await fetch('/api/tickets/prescription', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  appointmentId,
                  doctorId,
                  pharmacyId: targetId,
                  patientId: appointment?.patient_id ?? undefined,
                }),
                credentials: 'include',
              })
              const ticketData = await ticketRes.json()
              if (!ticketRes.ok) throw new Error(ticketData?.error || 'Failed to create ticket')
              if (ticketData?.ticket?.id) ticketId = ticketData.ticket.id
            } catch (ticketErr: any) {
              console.error('Ticket creation failed:', ticketErr)
              toast({ title: 'Warning', description: 'Ticket could not be created; thread will still be created.', variant: 'destructive' })
            }
          } else if (threadType === 'lab') {
            try {
              const ticketRes = await fetch('/api/tickets/lab-request', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  appointmentId,
                  doctorId,
                  laboratoryId: targetId,
                  patientId: appointment?.patient_id ?? undefined,
                }),
                credentials: 'include',
              })
              const ticketData = await ticketRes.json()
              if (!ticketRes.ok) throw new Error(ticketData?.error || 'Failed to create ticket')
              if (ticketData?.ticket?.id) ticketId = ticketData.ticket.id
            } catch (ticketErr: any) {
              console.error('Ticket creation failed:', ticketErr)
              toast({ title: 'Warning', description: 'Ticket could not be created; thread will still be created.', variant: 'destructive' })
            }
          }

          threadInsert = {
            type: 'group',
            title: threadTitle,
            order_type: threadType,
            order_id: appointmentId,
            created_by: doctor.auth_user_id,
            metadata: {
              appointment_id: appointmentId,
              doctor_id: doctorId,
              target_id: targetId,
              target_type: target.type,
            },
          }
          if (ticketId) (threadInsert as any).ticket_id = ticketId

          members = [
            { thread_id: '', user_id: doctor.auth_user_id, role: 'admin' },
          ]
          if (targetHasAccount && target?.auth_user_id) {
            members.push({ thread_id: '', user_id: target.auth_user_id, role: 'member' })
          }
          if (appointment?.patient_id) {
            members.push({ thread_id: '', user_id: appointment.patient_id, role: 'member' })
          }
        }

        const { data: newThread, error: threadError } = await supabase
          .from('chat_threads')
          .insert(threadInsert)
          .select()
          .single()

        if (threadError) {
          console.error('Error creating thread:', threadError)
          throw new Error(threadError.message || 'Failed to create thread')
        }

        if (!newThread) {
          throw new Error('Thread creation returned no data')
        }

        // Fix member thread_ids (were placeholder)
        members = members.map(m => ({ ...m, thread_id: newThread.id }))

        const { data: { user: currentUser } } = await supabase.auth.getUser()
        console.log('[Thread Creation] Adding members to thread', newThread.id, {
          currentAuthUserId: currentUser?.id,
          doctorAuthUserId: doctor.auth_user_id,
          targetAuthUserId: target?.auth_user_id ?? '(no account)',
          targetType: target?.type ?? (isDraft ? 'draft' : undefined),
          targetName: target?.business_name ?? (isDraft ? targetName : undefined),
          patient: appointment?.patient_id,
          membersCount: members.length,
        })
        if (target?.auth_user_id && currentUser?.id !== doctor.auth_user_id) {
          console.warn('[Thread Creation] WARNING: Doctor auth_user_id mismatch!', {
            currentUser: currentUser?.id,
            doctorAuthUserId: doctor.auth_user_id
          })
        }

        const { error: membersError, data: insertedMembers } = await supabase
          .from('chat_thread_members')
          .insert(members)
          .select()

        if (membersError) {
          console.error('[Thread Creation] Error adding members:', membersError)
          // Don't throw - thread is created, members can be added later
        } else {
          console.log(`[Thread Creation] Successfully added ${insertedMembers?.length || 0} members to thread`)
        }

        // Create welcome message
        const { error: messageError } = await supabase.from('chat_messages').insert({
          thread_id: newThread.id,
          sender_id: doctor.auth_user_id,
          message_type: 'system',
          content: `Thread created for ${threadType === 'prescription' ? 'prescription' : threadType === 'lab' ? 'lab request' : 'referral'}.`,
        })

        if (messageError) {
          console.error('Error creating welcome message:', messageError)
          // Don't throw - thread is created, message is not critical
        }

        if (ticketId && newThread) (newThread as any).ticket_id = ticketId
        setThread(newThread)
        if (!isDraft && !targetHasAccount && target) {
          toast({
            title: 'Thread created',
            description: `${target.business_name || 'This provider'} does not have an account yet. The thread was created; they can be added when they sign up.`,
          })
        }
        // Notify parent of the new thread ID so it can be stored in state
        onThreadCreated?.(newThread.id)
        onLoaded?.()
      }
    } catch (error: any) {
      console.error('Error finding/creating thread:', error)
      const errorMessage = error?.message || error?.error?.message || JSON.stringify(error) || 'Failed to load thread'
      toast({ title: 'Error', description: errorMessage, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const loadMessages = async () => {
    if (!thread) {
      setMessages([])
      return
    }

    const currentThreadId = thread.id // Capture thread.id to ensure we only load messages for THIS thread

    const { data, error } = await supabase
      .from('chat_messages')
      .select(`
        *,
        chat_attachments(*)
      `)
      .eq('thread_id', currentThreadId)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error loading messages:', error)
      return
    }

    // CRITICAL: Only set messages if thread hasn't changed (prevents showing wrong thread's messages on refresh)
    if (threadRef.current?.id !== currentThreadId) {
      console.warn('Thread changed while loading messages, discarding results')
      return
    }

    // CRITICAL: Filter messages to only include those for the current thread (double-check)
    const validMessages = (data || []).filter((msg: any) => {
      if (msg.thread_id !== currentThreadId) {
        console.warn(`[LoadMessages] Discarding message ${msg.id} - thread_id mismatch:`, {
          messageThreadId: msg.thread_id,
          expectedThreadId: currentThreadId
        })
        return false
      }
      return true
    })

    // Hydrate sender info
    const hydratedMessages = await Promise.all(
      validMessages.map(async (msg) => {
        let sender: any = null
        // Try to get from profiles
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url')
          .eq('id', msg.sender_id)
          .maybeSingle()

        if (profile) {
          sender = profile
        } else {
          // Try to get from professionals
          const { data: prof } = await supabase
            .from('professionals')
            .select('auth_user_id, business_name')
            .eq('auth_user_id', msg.sender_id)
            .maybeSingle()

          if (prof) {
            sender = { id: prof.auth_user_id, business_name: prof.business_name }
          }
        }

        // Add URLs to attachments
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
    if (threadRef.current?.id === currentThreadId) {
      console.log(`[LoadMessages] Setting ${hydratedMessages.length} messages for thread ${currentThreadId}`)
      setMessages(hydratedMessages)
    } else {
      console.warn(`[LoadMessages] Thread changed during load, discarding ${hydratedMessages.length} messages`)
    }
  }

  const subscribeToMessages = () => {
    if (!thread || !user) return () => {}

    const currentThreadId = thread.id // Capture thread.id to ensure we only process messages for THIS thread
    
    const channel = supabase
      .channel(`appointment-thread-${currentThreadId}`)
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

          // Hydrate sender
          const { data: profile } = await supabase
            .from('profiles')
            .select('id, full_name, avatar_url')
            .eq('id', newMsg.sender_id)
            .maybeSingle()

          let sender: { id: any; full_name?: any; business_name?: any; avatar_url?: any } | null = profile
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

          // Load attachments
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

    setSending(true)
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

      console.log(`[AppointmentThread SendMessage] Sending via API to thread ${currentThreadId}`)
      const res = await fetch(`/api/threads/${currentThreadId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ content, files: filesPayload.length > 0 ? filesPayload : undefined }),
      })
      const json = await res.json()
      console.log(`[AppointmentThread SendMessage] API response:`, res.status, json)

      if (!res.ok) {
        throw new Error(json.error || 'Failed to send message')
      }

      setMessageText('')
      setSelectedFiles([])
      await loadMessages()
    } catch (error: any) {
      console.error('Error sending message:', error)
      toast({ title: 'Error', description: error.message || 'Failed to send message', variant: 'destructive' })
    } finally {
      setSending(false)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    setSelectedFiles((prev) => [...prev, ...files])
  }

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
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

  if (loading) {
    if (suppressLoadingCard) return null
    return (
      <Card className="mt-6">
        <CardContent className="p-8 flex items-center justify-center">
          <LoadingSpinner size="lg" className="text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  if (!thread && (!threadType || !targetId)) {
    return (
      <Card className="mt-6">
        <CardContent className="p-8 text-center text-muted-foreground">
          <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p>Select a pharmacy, lab, or doctor/clinic to start a conversation</p>
        </CardContent>
      </Card>
    )
  }

  if (!thread && threadType && targetId) {
    if (suppressLoadingCard) return null
    return (
      <Card className="mt-6">
        <CardContent className="p-8 flex items-center justify-center">
          <LoadingSpinner size="lg" className="text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  const handleDeleteThread = async () => {
    if (!thread || !user) return
    setDeleting(true)
    try {
      const appointmentIdForDelete = thread.order_id || thread.metadata?.appointment_id
      const pharmacyIdForDelete = thread.metadata?.target_id
      
      // 1. Resolve prescription to delete (so it never reappears on pharmacy or doctor)
      let prescriptionId = thread.metadata?.prescription_id
      let labRequestId: string | undefined = thread.metadata?.lab_request_id
      if (!prescriptionId && thread.ticket_id) {
        const { data: ticket } = await supabase
          .from('healthcare_tickets')
          .select('prescription_id')
          .eq('id', thread.ticket_id)
          .maybeSingle()
        if (ticket?.prescription_id) prescriptionId = ticket.prescription_id
      }
      // Fallback: prescription may exist for this appointment+pharmacy but not linked in thread/ticket
      if (!prescriptionId && appointmentIdForDelete && pharmacyIdForDelete && doctorId && (threadType === 'prescription' || thread?.order_type === 'prescription')) {
        const { data: rx } = await supabase
          .from('prescriptions')
          .select('id')
          .eq('appointment_id', appointmentIdForDelete)
          .eq('pharmacy_id', pharmacyIdForDelete)
          .eq('doctor_id', doctorId)
          .maybeSingle()
        if (rx?.id) prescriptionId = rx.id
      }
      if (prescriptionId) {
        const res = await fetch(`/api/prescriptions/${prescriptionId}`, { method: 'DELETE', credentials: 'include' })
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(data?.error || 'Failed to remove prescription')
        }
      }

      // 1b. Resolve lab request to delete (so it never reappears on laboratory or doctor)
      if (!labRequestId && thread.ticket_id) {
        const { data: ticket } = await supabase
          .from('healthcare_tickets')
          .select('lab_request_id')
          .eq('id', thread.ticket_id)
          .maybeSingle()
        if (ticket?.lab_request_id) labRequestId = ticket.lab_request_id
      }
      // Fallback: lab request may exist for this appointment+lab but not linked in thread/ticket
      if (!labRequestId && appointmentIdForDelete && doctorId && (threadType === 'lab' || thread?.order_type === 'lab')) {
        const { data: labReq } = await supabase
          .from('lab_test_requests')
          .select('id')
          .eq('appointment_id', appointmentIdForDelete)
          .eq('doctor_id', doctorId)
          .maybeSingle()
        if (labReq?.id) labRequestId = labReq.id
      }
      // Delete the lab request via API
      if (labRequestId) {
        const res = await fetch(`/api/lab-requests/${labRequestId}`, { method: 'DELETE', credentials: 'include' })
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(data?.error || 'Failed to remove lab request')
        }
      }

      // 2. Cancel ticket so it doesn’t keep linking to this thread (even when no prescription)
      if (thread.ticket_id) {
        const updateData: any = { 
          status: 'cancelled', 
          updated_at: new Date().toISOString(),
          prescription_id: null,
          lab_request_id: null,
        }
        await supabase
          .from('healthcare_tickets')
          .update(updateData)
          .eq('id', thread.ticket_id)
      }

      // 4. Delete notifications related to this thread's prescriptions/lab requests
      if (prescriptionId) {
        await supabase
          .from('notifications')
          .delete()
          .eq('metadata->>prescription_id', prescriptionId)
      }
      if (labRequestId) {
        // Delete notifications where metadata contains request_id or lab_request_id matching labRequestId
        const { data: allNotifications } = await supabase
          .from('notifications')
          .select('id, metadata')
          .or(`metadata->>'request_id'.eq.${labRequestId},metadata->>'lab_request_id'.eq.${labRequestId}`)
        if (allNotifications && allNotifications.length > 0) {
          const notificationIds = allNotifications.map(n => n.id)
          await supabase
            .from('notifications')
            .delete()
            .in('id', notificationIds)
        }
      }

      // 5. Delete thread (CASCADE removes messages and members)
      const { error } = await supabase
        .from('chat_threads')
        .delete()
        .eq('id', thread.id)

      if (error) throw error

      const deletedItems = []
      if (prescriptionId) deletedItems.push('prescription')
      if (labRequestId) deletedItems.push('lab request')
      const itemsText = deletedItems.length > 0 ? `, ${deletedItems.join(' and ')}` : ''
      toast({ title: 'Success', description: `Thread${itemsText} removed everywhere from all parties` })
      if (onThreadDeleted) {
        onThreadDeleted()
      }
      setShowDeleteDialog(false)
    } catch (error: any) {
      console.error('Error deleting thread:', error)
      toast({ title: 'Error', description: error.message || 'Failed to delete thread', variant: 'destructive' })
    } finally {
      setDeleting(false)
    }
  }

  const handleChangePharmacy = async (newPharmacyId: string, newPharmacyName: string) => {
    if (!thread || !user) return

    try {
      // Update thread metadata with new pharmacy
      const { error: updateError } = await supabase
        .from('chat_threads')
        .update({
          metadata: {
            ...thread.metadata,
            target_id: newPharmacyId,
          },
          title: `Prescription - ${newPharmacyName}`,
        })
        .eq('id', thread.id)

      if (updateError) throw updateError

      // Get new pharmacy user_id first
      const { data: newPharmacy } = await supabase
        .from('professionals')
        .select('auth_user_id')
        .eq('id', newPharmacyId)
        .single()

      if (!newPharmacy?.auth_user_id) {
        throw new Error('New pharmacy not found')
      }

      // Get old pharmacy user_id to remove from members
      const oldPharmacyId = thread.metadata?.target_id
      if (oldPharmacyId) {
        const { data: oldPharmacy } = await supabase
          .from('professionals')
          .select('auth_user_id')
          .eq('id', oldPharmacyId)
          .single()

        if (oldPharmacy?.auth_user_id) {
          await supabase
            .from('chat_thread_members')
            .delete()
            .eq('thread_id', thread.id)
            .eq('user_id', oldPharmacy.auth_user_id)
        }
      }

      // Add new pharmacy member
      const { data: existingMember } = await supabase
        .from('chat_thread_members')
        .select('user_id')
        .eq('thread_id', thread.id)
        .eq('user_id', newPharmacy.auth_user_id)
        .maybeSingle()

      if (!existingMember) {
        await supabase.from('chat_thread_members').insert({
          thread_id: thread.id,
          user_id: newPharmacy.auth_user_id,
          role: 'member',
        })
      }

      // Update any existing prescription
      if (thread.metadata?.prescription_id) {
        await supabase
          .from('prescriptions')
          .update({ pharmacy_id: newPharmacyId })
          .eq('id', thread.metadata.prescription_id)
      }

      // Send system message
      await supabase.from('chat_messages').insert({
        thread_id: thread.id,
        sender_id: user.id,
        message_type: 'system',
        content: `Pharmacy changed to ${newPharmacyName}.`,
      })

      setCurrentPharmacyId(newPharmacyId)
      if (onPharmacyChanged) {
        onPharmacyChanged(newPharmacyId, newPharmacyName)
      }
      
      // Reload thread to get updated data
      await findOrCreateThread()
      
      toast({ title: 'Success', description: 'Pharmacy changed successfully' })
      setShowChangePharmacy(false)
    } catch (error: any) {
      console.error('Error changing pharmacy:', error)
      toast({ title: 'Error', description: error.message || 'Failed to change pharmacy', variant: 'destructive' })
    }
  }

  const handleChangeLaboratory = async (newLaboratoryId: string, newLaboratoryName: string) => {
    if (!thread || !user) return

    try {
      // Update thread metadata with new laboratory
      const { error: updateError } = await supabase
        .from('chat_threads')
        .update({
          metadata: {
            ...thread.metadata,
            target_id: newLaboratoryId,
          },
          title: `Lab Request - ${newLaboratoryName}`,
        })
        .eq('id', thread.id)

      if (updateError) throw updateError

      // Get new laboratory user_id first
      const { data: newLaboratory } = await supabase
        .from('professionals')
        .select('auth_user_id')
        .eq('id', newLaboratoryId)
        .single()

      if (!newLaboratory?.auth_user_id) {
        throw new Error('New laboratory not found')
      }

      // Get old laboratory user_id to remove from members
      const oldLaboratoryId = thread.metadata?.target_id
      if (oldLaboratoryId) {
        const { data: oldLaboratory } = await supabase
          .from('professionals')
          .select('auth_user_id')
          .eq('id', oldLaboratoryId)
          .single()

        if (oldLaboratory?.auth_user_id) {
          await supabase
            .from('chat_thread_members')
            .delete()
            .eq('thread_id', thread.id)
            .eq('user_id', oldLaboratory.auth_user_id)
        }
      }

      // Add new laboratory member
      const { data: existingMember } = await supabase
        .from('chat_thread_members')
        .select('user_id')
        .eq('thread_id', thread.id)
        .eq('user_id', newLaboratory.auth_user_id)
        .maybeSingle()

      if (!existingMember) {
        await supabase.from('chat_thread_members').insert({
          thread_id: thread.id,
          user_id: newLaboratory.auth_user_id,
          role: 'member',
        })
      }

      // Update any existing lab request
      if (thread.metadata?.lab_request_id) {
        await supabase
          .from('lab_test_requests')
          .update({ laboratory_id: newLaboratoryId })
          .eq('id', thread.metadata.lab_request_id)
      }

      // Send system message
      await supabase.from('chat_messages').insert({
        thread_id: thread.id,
        sender_id: user.id,
        message_type: 'system',
        content: `Laboratory changed to ${newLaboratoryName}.`,
      })

      setCurrentLaboratoryId(newLaboratoryId)
      
      // Reload thread to get updated data
      await findOrCreateThread()
      
      toast({ title: 'Success', description: 'Laboratory changed successfully' })
      setShowChangeLaboratory(false)
    } catch (error: any) {
      console.error('Error changing laboratory:', error)
      toast({ title: 'Error', description: error.message || 'Failed to change laboratory', variant: 'destructive' })
    }
  }

  // Send prescription to pharmacy
  const handleSendPrescription = async () => {
    if (!savedPrescription || !selectedPharmacyForSend) return
    setShowSendPrescriptionConfirm(false)
    setSendingPrescription(true)
    try {
      const response = await fetch(`/api/prescriptions/${savedPrescription.id}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pharmacyId: selectedPharmacyForSend.id,
          ticketId: thread?.ticket_id,
          threadId: thread?.id,
        }),
      })
      const result = await response.json()
      if (!response.ok) {
        throw new Error(result.error || 'Failed to send prescription')
      }
      await loadSavedPrescription(savedPrescription.id)
      await loadPrescriptionsForPharmacy()
      setShowSendPrescriptionDialog(false)
      setSelectedPharmacyForSend(null)
      toast({ title: 'Success', description: 'Prescription sent to pharmacy successfully' })
    } catch (error: any) {
      console.error('Error sending prescription:', error)
      toast({ title: 'Error', description: error.message || 'Failed to send prescription', variant: 'destructive' })
    } finally {
      setSendingPrescription(false)
    }
  }

  // Send lab request to laboratory
  const handleSendLabRequest = async () => {
    if (!savedLabRequest || !selectedLabForSend) return
    setShowSendLabRequestConfirm(false)
    setSendingLabRequest(true)
    try {
      const response = await fetch(`/api/lab-requests/${savedLabRequest.id}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          laboratoryId: selectedLabForSend.id,
          ticketId: thread?.ticket_id,
          threadId: thread?.id,
        }),
      })
      const result = await response.json()
      if (!response.ok) {
        throw new Error(result.error || 'Failed to send lab request')
      }
      await loadSavedLabRequest(savedLabRequest.id)
      await loadLabRequestsForLaboratory()
      setShowSendLabRequestDialog(false)
      setSelectedLabForSend(null)
      toast({ title: 'Success', description: 'Lab request sent to laboratory successfully' })
    } catch (error: any) {
      console.error('Error sending lab request:', error)
      toast({ title: 'Error', description: error.message || 'Failed to send lab request', variant: 'destructive' })
    } finally {
      setSendingLabRequest(false)
    }
  }

  // Print prescription - open PDF with doctor's branding
  const handlePrintPrescription = async () => {
    if (!savedPrescription) return
    try {
      const docId = savedPrescription.doctor_id || doctorId
      let branding = null
      if (docId) {
        const res = await fetch(`/api/professionals/${docId}/branding`, { credentials: 'include' })
        const json = await res.json()
        if (res.ok) branding = json.branding
      }
      const { openPdfPrescription, getPrescriptionPrintHtml, openPrintWindow } = await import('@/lib/print-prescription-lab')
      const ok = await openPdfPrescription(savedPrescription, branding)
      if (!ok) openPrintWindow(getPrescriptionPrintHtml(savedPrescription, branding), 'Prescription')
    } catch (e) {
      console.error(e)
    }
  }

  // Print lab request - open PDF with doctor's branding
  const handlePrintLabRequest = async () => {
    if (!savedLabRequest) return
    try {
      const docId = savedLabRequest.doctor_id || doctorId
      let branding = null
      let labReportTemplate = null
      if (docId) {
        const res = await fetch(`/api/professionals/${docId}/branding`, { credentials: 'include' })
        const json = await res.json()
        if (res.ok) branding = json.branding
      }
      const hasResults = (savedLabRequest.items || []).some(
        (item: any) => item.result_value || (savedLabRequest.lab_fulfillment || []).find((f: any) => f.item_id === item.id)?.result_value
      )
      if (hasResults && savedLabRequest.laboratory_id) {
        try {
          const res = await fetch(`/api/professionals/${savedLabRequest.laboratory_id}/branding`, { credentials: 'include' })
          const json = await res.json()
          if (res.ok && json.labReportTemplate) labReportTemplate = json.labReportTemplate
        } catch (_) {}
      }
      const printOptions = labReportTemplate
        ? {
            labReportTemplate,
            reportId: savedLabRequest.id,
            baseUrl: typeof window !== 'undefined' ? window.location.origin : '',
          }
        : undefined
      const { openPdfLabRequest, getLabRequestPrintHtml, openPrintWindow } = await import('@/lib/print-prescription-lab')
      const ok = await openPdfLabRequest(savedLabRequest, branding, printOptions)
      if (!ok) openPrintWindow(getLabRequestPrintHtml(savedLabRequest, branding, printOptions), hasResults ? 'Lab Results' : 'Lab Request')
    } catch (e) {
      console.error(e)
    }
  }

  return (
    <Card className={`mt-6 ${isNew ? 'ring-2 ring-primary/50 bg-primary/5 dark:bg-primary/10' : ''}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            {thread.title || 'Conversation'}
          </CardTitle>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {(threadType === 'prescription' || thread?.order_type === 'prescription') && (
                <>
                  <DropdownMenuItem onClick={() => setShowChangePharmacy(true)}>
                    <Settings className="h-4 w-4 mr-2" />
                    Change Pharmacy
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}
              {(threadType === 'lab' || thread?.order_type === 'lab') && (
                <>
                  <DropdownMenuItem onClick={() => setShowChangeLaboratory(true)}>
                    <Settings className="h-4 w-4 mr-2" />
                    Change Laboratory
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}
              <DropdownMenuItem
                onClick={() => setShowDeleteDialog(true)}
                className="text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Thread
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent>
        {/* Sticky: compact "current" prescription summary (latest linked to thread) — visible while scrolling */}
        {(threadType === 'prescription' || thread?.order_type === 'prescription') && (savedPrescription || loadingPrescription) && (
          <div className="sticky top-0 z-10 mb-4 -mx-6 px-6 py-2 bg-card border-b shadow-sm">
            {loadingPrescription ? (
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <LoadingSpinner size="sm" />
                Loading prescription…
              </div>
            ) : savedPrescription ? (
              <div className="flex items-center gap-3 flex-wrap text-sm">
                <span className="font-medium flex items-center gap-1.5">
                  <Pill className="h-4 w-4 text-primary" />
                  Latest prescription
                </span>
                {savedPrescription.diagnosis && (
                  <span className="text-muted-foreground">— {savedPrescription.diagnosis}</span>
                )}
                {savedPrescription.status && (
                  <Badge variant="secondary" className="text-xs font-normal">
                    {getPrescriptionStatusLabel(savedPrescription.status)}
                  </Badge>
                )}
                <span className="text-muted-foreground">
                  {(savedPrescription.medications || []).length} medication(s)
                </span>
                {savedPrescription.created_at && (
                  <span className="text-muted-foreground">
                    {format(new Date(savedPrescription.created_at), 'MMM d, HH:mm')}
                  </span>
                )}
              </div>
            ) : null}
          </div>
        )}

        {/* Sticky: compact "current" lab request summary (latest linked to thread) — visible while scrolling */}
        {(threadType === 'lab' || thread?.order_type === 'lab') && (savedLabRequest || loadingLabRequest) && (
          <div className="sticky top-0 z-10 mb-4 -mx-6 px-6 py-2 bg-card border-b shadow-sm">
            {loadingLabRequest ? (
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <LoadingSpinner size="sm" />
                Loading lab request…
              </div>
            ) : savedLabRequest ? (
              <div className="flex items-center gap-3 flex-wrap text-sm">
                <span className="font-medium flex items-center gap-1.5">
                  <FlaskConical className="h-4 w-4 text-primary" />
                  Latest lab request
                </span>
                {savedLabRequest.diagnosis && (
                  <span className="text-muted-foreground">— {savedLabRequest.diagnosis}</span>
                )}
                {savedLabRequest.status && (
                  <Badge variant="secondary" className="text-xs font-normal">
                    {getLabRequestStatusLabel(savedLabRequest.status)}
                  </Badge>
                )}
                {savedLabRequest.priority && (
                  <Badge variant={savedLabRequest.priority === 'urgent' ? 'destructive' : 'secondary'} className="text-xs font-normal">
                    {savedLabRequest.priority === 'urgent' ? 'Urgent' : 'Normal'}
                  </Badge>
                )}
                <span className="text-muted-foreground">
                  {savedLabRequest.items?.length || 0} test(s)
                </span>
                {savedLabRequest.created_at && (
                  <span className="text-muted-foreground">
                    {format(new Date(savedLabRequest.created_at), 'MMM d, HH:mm')}
                  </span>
                )}
                {/* Show send/print actions for pending lab requests (not sent to lab yet) */}
                {(savedLabRequest.status === 'pending' || !savedLabRequest.laboratory_id) && (
                  <div className="flex items-center gap-2 ml-auto">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handlePrintLabRequest}
                      className="h-7 text-xs"
                    >
                      <Download className="h-3 w-3 mr-1" />
                      PDF
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => setShowSendLabRequestDialog(true)}
                      className="h-7 text-xs"
                    >
                      <SendIcon className="h-3 w-3 mr-1" />
                      Send to Lab
                    </Button>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        )}

        <Tabs
          value={activeTab}
          onValueChange={(v) => {
            setActiveTab(v as any)
            if (v === 'prescription' && (threadType === 'prescription' || thread?.order_type === 'prescription')) {
              loadPrescriptionsForPharmacy()
              const pid = thread?.metadata?.prescription_id
              if (pid) loadSavedPrescription(pid)
              else if (thread?.ticket_id) {
                supabase.from('healthcare_tickets').select('prescription_id').eq('id', thread.ticket_id).maybeSingle().then(({ data }) => {
                  if (data?.prescription_id) loadSavedPrescription(data.prescription_id)
                })
              }
            }
            if (v === 'lab' && (threadType === 'lab' || thread?.order_type === 'lab')) {
              loadLabRequestsForLaboratory()
              const lid = thread?.metadata?.lab_request_id
              if (lid) loadSavedLabRequest(lid)
              else if (thread?.ticket_id) {
                supabase.from('healthcare_tickets').select('lab_request_id').eq('id', thread.ticket_id).maybeSingle().then(({ data }) => {
                  if (data?.lab_request_id) loadSavedLabRequest(data.lab_request_id)
                })
              }
            }
          }}
        >
          <TabsList className={`grid w-full ${(threadType === 'prescription' || thread?.order_type === 'prescription') && (threadType === 'lab' || thread?.order_type === 'lab') ? 'grid-cols-4' : (threadType === 'prescription' || thread?.order_type === 'prescription') || (threadType === 'lab' || thread?.order_type === 'lab') ? 'grid-cols-3' : 'grid-cols-2'}`}>
            <TabsTrigger value="messages">
              <MessageSquare className="h-4 w-4 mr-2" />
              Messages
            </TabsTrigger>
            {(threadType === 'prescription' || thread?.order_type === 'prescription') && (
              <TabsTrigger value="prescription">
                <Pill className="h-4 w-4 mr-2" />
                Prescription
              </TabsTrigger>
            )}
            {(threadType === 'lab' || thread?.order_type === 'lab') && (
              <TabsTrigger value="lab">
                <FlaskConical className="h-4 w-4 mr-2" />
                Lab Request
              </TabsTrigger>
            )}
            <TabsTrigger value="files">
              <FileText className="h-4 w-4 mr-2" />
              Files ({messages.reduce((acc, m) => acc + (m.chat_attachments?.length || 0), 0)})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="messages" className="mt-4">
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-4">
                {messages.map((message) => {
                  const isOwn = message.sender_id === user?.id
                  const senderName = message.sender?.full_name || message.sender?.business_name || 'User'
                  
                  return (
                    <div key={message.id} className={`flex gap-3 ${isOwn ? 'flex-row-reverse' : ''}`}>
                      <Avatar className="h-8 w-8 flex-shrink-0">
                        <AvatarFallback className="text-xs">
                          {getInitials(senderName)}
                        </AvatarFallback>
                      </Avatar>
                      <div className={`flex-1 ${isOwn ? 'items-end' : 'items-start'} flex flex-col`}>
                        <div className={`rounded-lg px-4 py-2 max-w-[80%] ${isOwn ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                          {!isOwn && (
                            <p className="text-xs font-medium mb-1 opacity-70">{senderName}</p>
                          )}
                          {message.content && (
                            <p className={`text-sm whitespace-pre-wrap ${(message.content || '').toLowerCase().includes('declined') || (message.content || '').toLowerCase().includes('denied') ? 'text-red-600 dark:text-red-400 font-medium bg-red-50 dark:bg-red-950/30 px-2 py-1 rounded' : ''}`}>{message.content}</p>
                          )}
                          {message.chat_attachments && message.chat_attachments.length > 0 && (
                            <div className="mt-2 space-y-2">
                              {message.chat_attachments.map((att) => (
                                <div key={att.id} className="flex items-center gap-2 p-2 bg-background/50 rounded">
                                  {att.file_type?.startsWith('image/') ? (
                                    <ImageIcon className="h-4 w-4" />
                                  ) : (
                                    <FileText className="h-4 w-4" />
                                  )}
                                  <a
                                    href={att.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-sm hover:underline flex-1 truncate"
                                  >
                                    {att.file_name}
                                  </a>
                                  <Badge variant="outline" className="text-xs">
                                    {(att.file_size || 0) / 1024 > 1024
                                      ? `${((att.file_size || 0) / 1024 / 1024).toFixed(1)} MB`
                                      : `${((att.file_size || 0) / 1024).toFixed(0)} KB`}
                                  </Badge>
                                </div>
                              ))}
                            </div>
                          )}
                          <p className={`text-xs mt-1 ${isOwn ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                            {formatMessageTime(message.created_at)}
                          </p>
                        </div>
                      </div>
                    </div>
                  )
                })}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            <Separator className="my-4" />

            {/* File previews */}
            {selectedFiles.length > 0 && (
              <div className="mb-4 space-y-2">
                {selectedFiles.map((file, index) => (
                  <div key={index} className="flex items-center gap-2 p-2 bg-muted rounded">
                    <FileText className="h-4 w-4" />
                    <span className="text-sm flex-1 truncate">{file.name}</span>
                    <Badge variant="outline" className="text-xs">
                      {(file.size / 1024).toFixed(0)} KB
                    </Badge>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6"
                      onClick={() => removeFile(index)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {/* Message input */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => fileInputRef.current?.click()}
              >
                <Paperclip className="h-4 w-4" />
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={handleFileSelect}
              />
              <Textarea
                placeholder="Type a message..."
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    sendMessage()
                  }
                }}
                className="flex-1 min-h-[60px]"
              />
              <Button onClick={sendMessage} disabled={sending || (!messageText.trim() && selectedFiles.length === 0)}>
                {sending ? (
                  <LoadingSpinner size="sm" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </TabsContent>

          {(threadType === 'prescription' || thread?.order_type === 'prescription') && (
            <TabsContent value="prescription" className="mt-4 space-y-4">
              {/* Sent prescriptions — list of all prescriptions for this pharmacy */}
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Sent prescriptions
                </h3>
                {loadingPrescriptionsList ? (
                  <div className="flex items-center gap-2 text-muted-foreground py-4">
                    <LoadingSpinner size="sm" />
                    <span className="text-sm">Loading…</span>
                  </div>
                ) : prescriptionsList.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-3 rounded-lg border border-dashed bg-muted/20 px-4">
                    No prescriptions sent yet. Use the form below to add one.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {prescriptionsList.map((rx, index) => {
                      const rxLabel = (rx as { prescription_number?: string }).prescription_number || `RX-${String(index + 1).padStart(4, '0')}`
                      const accentClass = [
                        'border-l-4 border-l-primary/30 bg-primary/5',
                        'border-l-4 border-l-blue-500/30 bg-blue-500/5',
                        'border-l-4 border-l-emerald-500/30 bg-emerald-500/5',
                        'border-l-4 border-l-amber-500/30 bg-amber-500/5',
                        'border-l-4 border-l-violet-500/30 bg-violet-500/5',
                      ][index % 5]
                      return (
                      <Card key={rx.id} className={`overflow-hidden ${accentClass}`}>
                        <button
                          type="button"
                          className="w-full flex items-center justify-between p-3 text-left hover:opacity-90 transition-opacity"
                          onClick={() => setExpandedPrescriptionId((id) => (id === rx.id ? null : rx.id))}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <Pill className="h-4 w-4 text-primary flex-shrink-0" />
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">
                                {rxLabel}
                                {rx.diagnosis ? ` · ${rx.diagnosis}` : ''}
                              </p>
                              <p className="text-xs text-muted-foreground flex items-center gap-2 flex-wrap">
                                <span>{(rx.medications || []).length} medication(s)</span>
                                {rx.status && (
                                  <Badge variant="secondary" className="text-xs font-normal">
                                    {getPrescriptionStatusLabel(rx.status)}
                                  </Badge>
                                )}
                                {rx.created_at && (
                                  <span>· {format(new Date(rx.created_at), 'MMM d, yyyy HH:mm')}</span>
                                )}
                              </p>
                            </div>
                          </div>
                          {expandedPrescriptionId === rx.id ? (
                            <ChevronUp className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                          )}
                        </button>
                        {expandedPrescriptionId === rx.id && (
                          <CardContent className="pt-0 pb-3 px-3 border-t bg-muted/20">
                            {rx.diagnosis && (
                              <p className="text-sm mb-2"><span className="font-medium text-muted-foreground">Diagnosis:</span> {rx.diagnosis}</p>
                            )}
                            <div className="rounded-md border overflow-x-auto bg-background text-sm">
                              <table className="w-full">
                                <thead>
                                  <tr className="border-b bg-muted/50">
                                    <th className="text-left p-2 font-medium">Medication</th>
                                    <th className="text-left p-2">Form</th>
                                    <th className="text-left p-2">Dosage</th>
                                    <th className="text-left p-2">Qty</th>
                                    <th className="text-left p-2">Frequency</th>
                                    <th className="text-left p-2">Duration</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {(rx.medications || []).map((med: any, i: number) => (
                                    <tr key={i} className="border-b last:border-0">
                                      <td className="p-2">{med.medication_name || med.medication_name_ar || '—'}</td>
                                      <td className="p-2">{med.form || '—'}</td>
                                      <td className="p-2">{med.dosage || '—'}</td>
                                      <td className="p-2">{med.quantity ?? '—'}</td>
                                      <td className="p-2">{med.frequency || '—'}</td>
                                      <td className="p-2">{med.duration || '—'}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                            {rx.notes && (
                              <p className="text-sm mt-2"><span className="font-medium text-muted-foreground">Notes:</span> {rx.notes}</p>
                            )}
                          </CardContent>
                        )}
                      </Card>
                    )
                    })}
                  </div>
                )}
              </div>

              <Separator />

              {/* New prescription — always visible so doctor can send another */}
              <div>
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  New prescription
                </h3>
                <PrescriptionBuilder
                  key={prescriptionFormKey}
                  threadId={thread.id}
                  ticketId={thread?.ticket_id ?? undefined}
                  appointmentId={appointmentId}
                  doctorId={doctorId}
                  patientId={undefined}
                  pharmacyId={currentPharmacyId || (thread.metadata?.target_type === 'pharmacy' ? thread.metadata?.target_id : undefined)}
                  onPrescriptionCreated={async (prescriptionId) => {
                    const isDraft = (thread?.metadata?.target_id as string)?.startsWith?.('draft-')
                    if (thread?.id && isDraft) {
                      await supabase
                        .from('chat_threads')
                        .update({
                          metadata: { ...(thread.metadata as object || {}), prescription_id: prescriptionId },
                          updated_at: new Date().toISOString(),
                        })
                        .eq('id', thread.id)
                      setThread((prev: any) => prev ? { ...prev, metadata: { ...(prev.metadata as object || {}), prescription_id: prescriptionId } } : null)
                    }
                    loadSavedPrescription(prescriptionId)
                    loadPrescriptionsForPharmacy()
                    setPrescriptionFormKey((k) => k + 1)
                    setActiveTab('messages')
                    toast({ title: 'Success', description: 'Prescription created successfully' })
                    setTimeout(() => scrollToBottom(), 150)
                  }}
                />
              </div>
            </TabsContent>
          )}

          {(threadType === 'lab' || thread?.order_type === 'lab') && (
            <TabsContent value="lab" className="mt-4 space-y-4">
              {/* Sent lab requests — list of all lab requests for this laboratory */}
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Sent lab requests
                </h3>
                {loadingLabRequestsList ? (
                  <div className="flex items-center gap-2 text-muted-foreground py-4">
                    <LoadingSpinner size="sm" />
                    <span className="text-sm">Loading…</span>
                  </div>
                ) : labRequestsList.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-3 rounded-lg border border-dashed bg-muted/20 px-4">
                    No lab requests sent yet. Use the form below to add one.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {labRequestsList.map((lr, index) => {
                      const lrLabel = (lr as { request_number?: string }).request_number || `LT-${String(index + 1).padStart(4, '0')}`
                      const accentClass = [
                        'border-l-4 border-l-primary/30 bg-primary/5',
                        'border-l-4 border-l-blue-500/30 bg-blue-500/5',
                        'border-l-4 border-l-emerald-500/30 bg-emerald-500/5',
                        'border-l-4 border-l-amber-500/30 bg-amber-500/5',
                        'border-l-4 border-l-violet-500/30 bg-violet-500/5',
                      ][index % 5]
                      return (
                        <Card key={lr.id} className={`overflow-hidden ${accentClass}`}>
                          <button
                            type="button"
                            className="w-full flex items-center justify-between p-3 text-left hover:opacity-90 transition-opacity"
                            onClick={() => setExpandedLabRequestId((id) => (id === lr.id ? null : lr.id))}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <FlaskConical className="h-4 w-4 text-primary flex-shrink-0" />
                              <div className="min-w-0">
                                <p className="text-sm font-medium truncate">
                                  {lrLabel}
                                  {lr.diagnosis ? ` · ${lr.diagnosis}` : ''}
                                </p>
                                <p className="text-xs text-muted-foreground flex items-center gap-2 flex-wrap">
                                  <span>{lr.items?.length || 0} test(s)</span>
                                  {lr.priority && (
                                    <Badge variant={lr.priority === 'urgent' ? 'destructive' : 'secondary'} className="text-xs font-normal">
                                      {lr.priority === 'urgent' ? 'Urgent' : 'Normal'}
                                    </Badge>
                                  )}
                                  {lr.status && (
                                    <Badge variant="secondary" className="text-xs font-normal">
                                      {getLabRequestStatusLabel(lr.status)}
                                    </Badge>
                                  )}
                                  {lr.created_at && (
                                    <span>· {format(new Date(lr.created_at), 'MMM d, yyyy HH:mm')}</span>
                                  )}
                                </p>
                              </div>
                            </div>
                            {expandedLabRequestId === lr.id ? (
                              <ChevronUp className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                            ) : (
                              <ChevronDown className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                            )}
                          </button>
                          {expandedLabRequestId === lr.id && (
                            <CardContent className="pt-0 pb-3 px-3 border-t bg-muted/20">
                              {lr.diagnosis && (
                                <p className="text-sm mb-2"><span className="font-medium text-muted-foreground">Diagnosis:</span> {lr.diagnosis}</p>
                              )}
                              {lr.clinical_notes && (
                                <p className="text-sm mb-2"><span className="font-medium text-muted-foreground">Clinical Notes:</span> {lr.clinical_notes}</p>
                              )}
                              {lr.items && lr.items.length > 0 && (
                                <div className="rounded-md border overflow-x-auto bg-background text-sm mt-2">
                                  <table className="w-full">
                                    <thead>
                                      <tr className="border-b bg-muted/50">
                                        <th className="text-left p-2 font-medium">Test Name</th>
                                        <th className="text-left p-2">Status</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {lr.items.map((item: any, i: number) => (
                                        <tr key={i} className="border-b last:border-0">
                                          <td className="p-2">{item.test_type?.name || item.test_type?.name_ar || '—'}</td>
                                          <td className="p-2">{item.status || 'pending'}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </CardContent>
                          )}
                        </Card>
                      )
                    })}
                  </div>
                )}
              </div>

              <Separator />

              {/* New lab request — always visible so doctor can send another */}
              <div>
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  New lab request
                </h3>
                <LabTestRequestBuilder
                  key={labRequestFormKey}
                  threadId={thread.id}
                  ticketId={thread?.ticket_id ?? undefined}
                  appointmentId={appointmentId}
                  doctorId={doctorId}
                  patientId={undefined}
                  laboratoryId={currentLaboratoryId || (thread.metadata?.target_type === 'laboratory' ? thread.metadata?.target_id : undefined)}
                  onLabRequestCreated={async (labRequestId) => {
                    const isDraft = (thread?.metadata?.target_id as string)?.startsWith?.('draft-')
                    if (thread?.id && isDraft) {
                      await supabase
                        .from('chat_threads')
                        .update({
                          metadata: { ...(thread.metadata as object || {}), lab_request_id: labRequestId },
                          updated_at: new Date().toISOString(),
                        })
                        .eq('id', thread.id)
                      setThread((prev: any) => prev ? { ...prev, metadata: { ...(prev.metadata as object || {}), lab_request_id: labRequestId } } : null)
                    }
                    loadSavedLabRequest(labRequestId)
                    loadLabRequestsForLaboratory()
                    setLabRequestFormKey((k) => k + 1)
                    setActiveTab('messages')
                    toast({ title: 'Success', description: 'Lab request created successfully' })
                    setTimeout(() => scrollToBottom(), 150)
                  }}
                />
              </div>
            </TabsContent>
          )}

          <TabsContent value="files" className="mt-4">
            <ScrollArea className="h-[400px]">
              <div className="space-y-2">
                {messages
                  .filter((m) => m.chat_attachments && m.chat_attachments.length > 0)
                  .map((message) =>
                    message.chat_attachments?.map((att) => (
                      <div
                        key={att.id}
                        className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50"
                      >
                        {att.file_type?.startsWith('image/') ? (
                          <ImageIcon className="h-5 w-5 text-muted-foreground" />
                        ) : (
                          <FileText className="h-5 w-5 text-muted-foreground" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{att.file_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatMessageTime(message.created_at)} •{' '}
                            {(att.file_size || 0) / 1024 > 1024
                              ? `${((att.file_size || 0) / 1024 / 1024).toFixed(1)} MB`
                              : `${((att.file_size || 0) / 1024).toFixed(0)} KB`}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          asChild
                        >
                          <a href={att.url} target="_blank" rel="noopener noreferrer">
                            <Download className="h-4 w-4" />
                          </a>
                        </Button>
                      </div>
                    ))
                  )
                  .flat()}
                {messages.filter((m) => m.chat_attachments && m.chat_attachments.length > 0).length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No files shared yet</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>

      {/* Delete Thread Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Thread</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this thread? This action cannot be undone. All messages and prescription data will be removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteThread}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? (
                <>
                  <LoadingSpinner size="sm" className="me-2" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Change Pharmacy Dialog */}
      {showChangePharmacy && (
        <PharmacySelector
          open={showChangePharmacy}
          onClose={() => setShowChangePharmacy(false)}
          onSelect={(pharmacy) => {
            handleChangePharmacy(pharmacy.id, pharmacy.business_name || pharmacy.name || 'Pharmacy')
          }}
          patientId={patientId}
          doctorId={doctorId}
        />
      )}

      {/* Change Laboratory Dialog */}
      {showChangeLaboratory && (
        <LaboratorySelector
          open={showChangeLaboratory}
          onClose={() => setShowChangeLaboratory(false)}
          onSelect={(laboratory) => {
            handleChangeLaboratory(laboratory.id, laboratory.business_name || laboratory.name || 'Laboratory')
          }}
          patientId={patientId}
          doctorId={doctorId}
        />
      )}

      {/* Send Prescription Dialog */}
      <Dialog open={showSendPrescriptionDialog} onOpenChange={setShowSendPrescriptionDialog}>
        <DialogContent size="lg" style={{width: '640px'}}>
          <DialogHeader>
            <DialogTitle>Send Prescription to Pharmacy</DialogTitle>
            <DialogDescription>
              Select a pharmacy to send this prescription to.
            </DialogDescription>
          </DialogHeader>
          <PharmacySelector
            open={true}
            onClose={() => {
              setShowSendPrescriptionDialog(false)
              setSelectedPharmacyForSend(null)
            }}
            onSelect={(pharmacy) => {
              setSelectedPharmacyForSend({ id: pharmacy.id, name: pharmacy.business_name ?? pharmacy.name ?? 'Pharmacy' })
            }}
            patientId={patientId}
            doctorId={doctorId}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowSendPrescriptionDialog(false)
              setSelectedPharmacyForSend(null)
            }}>
              Cancel
            </Button>
            <Button
              onClick={() => selectedPharmacyForSend && setShowSendPrescriptionConfirm(true)}
              disabled={!selectedPharmacyForSend || sendingPrescription}
            >
              {sendingPrescription ? (
                <>
                  <LoadingSpinner size="sm" className="me-2" />
                  Sending...
                </>
              ) : (
                <>
                  <SendIcon className="mr-2 h-4 w-4" />
                  Send
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Send Lab Request Dialog */}
      <Dialog open={showSendLabRequestDialog} onOpenChange={setShowSendLabRequestDialog}>
        <DialogContent size="lg" style={{width: '640px'}}>
          <DialogHeader>
            <DialogTitle>Send Lab Request to Laboratory</DialogTitle>
            <DialogDescription>
              Select a laboratory to send this lab request to.
            </DialogDescription>
          </DialogHeader>
          <LaboratorySelector
            open={true}
            onClose={() => {
              setShowSendLabRequestDialog(false)
              setSelectedLabForSend(null)
            }}
            onSelect={(laboratory) => {
              setSelectedLabForSend({ id: laboratory.id, name: laboratory.business_name ?? laboratory.name ?? 'Laboratory' })
            }}
            patientId={patientId}
            doctorId={doctorId}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowSendLabRequestDialog(false)
              setSelectedLabForSend(null)
            }}>
              Cancel
            </Button>
            <Button
              onClick={() => selectedLabForSend && setShowSendLabRequestConfirm(true)}
              disabled={!selectedLabForSend || sendingLabRequest}
            >
              {sendingLabRequest ? (
                <>
                  <LoadingSpinner size="sm" className="me-2" />
                  Sending...
                </>
              ) : (
                <>
                  <SendIcon className="mr-2 h-4 w-4" />
                  Send
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm send prescription to pharmacy */}
      <AlertDialog open={showSendPrescriptionConfirm} onOpenChange={setShowSendPrescriptionConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Send prescription to pharmacy?</AlertDialogTitle>
            <AlertDialogDescription>
              This prescription will be sent to <strong>{selectedPharmacyForSend?.name}</strong>. They will be notified.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={sendingPrescription}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={sendingPrescription}
              onClick={(e) => {
                e.preventDefault()
                handleSendPrescription()
              }}
            >
              {sendingPrescription ? <LoadingSpinner size="sm" className="me-2" /> : <SendIcon className="h-4 w-4 mr-2" />}
              Send
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirm send lab request to laboratory */}
      <AlertDialog open={showSendLabRequestConfirm} onOpenChange={setShowSendLabRequestConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Send lab request to laboratory?</AlertDialogTitle>
            <AlertDialogDescription>
              This lab request will be sent to <strong>{selectedLabForSend?.name}</strong>. They will be notified.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={sendingLabRequest}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={sendingLabRequest}
              onClick={(e) => {
                e.preventDefault()
                handleSendLabRequest()
              }}
            >
              {sendingLabRequest ? <LoadingSpinner size="sm" className="me-2" /> : <SendIcon className="h-4 w-4 mr-2" />}
              Send
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}
