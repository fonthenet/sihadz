// Healthcare Ticket Service
// Handles all ticket-related operations for the ecosystem

import { createBrowserClient } from '@/lib/supabase/client'

// Types
export type TicketType = 'appointment' | 'prescription' | 'lab_request' | 'referral' | 'emergency'
export type TicketStatus = 'created' | 'pending' | 'confirmed' | 'in_progress' | 'ready' | 'completed' | 'cancelled' | 'expired'
export type PaymentStatus = 'pending' | 'awaiting_payment' | 'paid_online' | 'paid_cash' | 'paid_chifa' | 'refunded'
export type PaymentMethod = 'cash' | 'card' | 'mobile' | 'chifa'
export type Priority = 'emergency' | 'urgent' | 'normal' | 'routine'

export interface HealthcareTicket {
  id: string
  ticket_number: string
  ticket_type: TicketType
  
  patient_id: string
  patient_name?: string
  patient_phone?: string
  patient_chifa_number?: string
  
  primary_provider_id?: string
  primary_provider_type?: string
  primary_provider_name?: string
  
  secondary_provider_id?: string
  secondary_provider_type?: string
  secondary_provider_name?: string
  
  appointment_id?: string
  prescription_id?: string
  lab_request_id?: string
  referral_id?: string
  
  status: TicketStatus
  status_history?: any[]
  priority: Priority
  
  payment_status: PaymentStatus
  payment_method?: PaymentMethod
  payment_amount?: number
  payment_reference?: string
  paid_at?: string
  
  created_at: string
  updated_at: string
  confirmed_at?: string
  started_at?: string
  ready_at?: string
  completed_at?: string
  cancelled_at?: string
  expires_at?: string
  
  patient_notes?: string
  provider_notes?: string
  
  qr_code_data?: string
  verification_code?: string
  
  metadata?: any
}

export interface TicketTimelineEntry {
  id: string
  ticket_id: string
  action: string
  action_description?: string
  action_description_ar?: string
  actor_id?: string
  actor_type?: string
  actor_name?: string
  previous_value?: string
  new_value?: string
  metadata?: any
  created_at: string
}

export interface TicketMessage {
  id: string
  ticket_id: string
  sender_id: string
  sender_type: string
  sender_name?: string
  message_type: string
  content: string
  attachments?: any[]
  visibility: string
  is_read_by_patient: boolean
  is_read_by_primary: boolean
  is_read_by_secondary: boolean
  created_at: string
}

// Generate ticket number
const generateTicketNumber = (): string => {
  const date = new Date()
  const datePart = date.toISOString().slice(0, 10).replace(/-/g, '')
  const randomPart = Math.random().toString(36).substring(2, 7).toUpperCase()
  return `TKT-${datePart}-${randomPart}`
}

// Generate verification code
const generateVerificationCode = (): string => {
  return Math.random().toString(36).substring(2, 8).toUpperCase()
}

// Create a new healthcare ticket
export async function createTicket(params: {
  ticketType: TicketType
  patientId: string
  patientName?: string
  patientPhone?: string
  patientChifaNumber?: string
  primaryProviderId?: string
  primaryProviderType?: string
  primaryProviderName?: string
  secondaryProviderId?: string
  secondaryProviderType?: string
  secondaryProviderName?: string
  appointmentId?: string
  prescriptionId?: string
  labRequestId?: string
  referralId?: string
  priority?: Priority
  paymentAmount?: number
  patientNotes?: string
  providerNotes?: string
  metadata?: any
}): Promise<{ ticket: HealthcareTicket | null; error: any }> {
  const supabase = createBrowserClient()
  
  const ticketNumber = generateTicketNumber()
  const verificationCode = generateVerificationCode()
  
  const expiresAt = new Date()
  switch (params.ticketType) {
    case 'prescription':
      expiresAt.setDate(expiresAt.getDate() + 30)
      break
    case 'lab_request':
      expiresAt.setDate(expiresAt.getDate() + 14)
      break
    case 'appointment':
      expiresAt.setDate(expiresAt.getDate() + 1)
      break
    default:
      expiresAt.setDate(expiresAt.getDate() + 7)
  }
  
  const { data, error } = await supabase
    .from('healthcare_tickets')
    .insert({
      ticket_number: ticketNumber,
      ticket_type: params.ticketType,
      patient_id: params.patientId,
      patient_name: params.patientName,
      patient_phone: params.patientPhone,
      patient_chifa_number: params.patientChifaNumber,
      primary_provider_id: params.primaryProviderId,
      primary_provider_type: params.primaryProviderType,
      primary_provider_name: params.primaryProviderName,
      secondary_provider_id: params.secondaryProviderId,
      secondary_provider_type: params.secondaryProviderType,
      secondary_provider_name: params.secondaryProviderName,
      appointment_id: params.appointmentId,
      prescription_id: params.prescriptionId,
      lab_request_id: params.labRequestId,
      referral_id: params.referralId,
      status: 'created',
      priority: params.priority || 'normal',
      payment_status: 'pending',
      payment_amount: params.paymentAmount,
      patient_notes: params.patientNotes,
      provider_notes: params.providerNotes,
      verification_code: verificationCode,
      expires_at: expiresAt.toISOString(),
      metadata: params.metadata || {},
      qr_code_data: JSON.stringify({
        ticket: ticketNumber,
        code: verificationCode,
        type: params.ticketType
      })
    })
    .select()
    .single()
  
  if (data) {
    await addTimelineEntry({
      ticketId: data.id,
      action: 'ticket_created',
      description: `Ticket ${ticketNumber} created`,
      descriptionAr: `تم إنشاء التذكرة ${ticketNumber}`,
      actorType: 'system',
      actorName: 'System'
    })
  }
  
  return { ticket: data, error }
}

// Update ticket status
export async function updateTicketStatus(params: {
  ticketId: string
  newStatus: TicketStatus
  actorId?: string
  actorType?: string
  actorName?: string
  notes?: string
}): Promise<{ success: boolean; error: any }> {
  const supabase = createBrowserClient()
  
  const updateData: any = { status: params.newStatus }
  
  switch (params.newStatus) {
    case 'confirmed':
      updateData.confirmed_at = new Date().toISOString()
      break
    case 'in_progress':
      updateData.started_at = new Date().toISOString()
      break
    case 'ready':
      updateData.ready_at = new Date().toISOString()
      break
    case 'completed':
      updateData.completed_at = new Date().toISOString()
      break
    case 'cancelled':
      updateData.cancelled_at = new Date().toISOString()
      updateData.cancelled_by = params.actorId
      updateData.cancellation_reason = params.notes
      break
  }
  
  if (params.notes) {
    updateData.provider_notes = params.notes
  }
  
  const { error } = await supabase
    .from('healthcare_tickets')
    .update(updateData)
    .eq('id', params.ticketId)
  
  if (!error) {
    await addTimelineEntry({
      ticketId: params.ticketId,
      action: 'status_updated',
      description: `Status changed to ${params.newStatus}`,
      descriptionAr: `تم تغيير الحالة إلى ${params.newStatus}`,
      actorId: params.actorId,
      actorType: params.actorType,
      actorName: params.actorName,
      newValue: params.newStatus
    })
  }
  
  return { success: !error, error }
}

// Update ticket payment
export async function updateTicketPayment(params: {
  ticketId: string
  paymentStatus: PaymentStatus
  paymentMethod?: PaymentMethod
  paymentReference?: string
  actorId?: string
  actorType?: string
  actorName?: string
}): Promise<{ success: boolean; error: any }> {
  const supabase = createBrowserClient()
  
  const updateData: any = {
    payment_status: params.paymentStatus,
    payment_method: params.paymentMethod,
    payment_reference: params.paymentReference
  }
  
  if (params.paymentStatus.startsWith('paid')) {
    updateData.paid_at = new Date().toISOString()
  }
  
  const { error } = await supabase
    .from('healthcare_tickets')
    .update(updateData)
    .eq('id', params.ticketId)
  
  if (!error) {
    await addTimelineEntry({
      ticketId: params.ticketId,
      action: 'payment_updated',
      description: `Payment: ${params.paymentStatus}${params.paymentMethod ? ` via ${params.paymentMethod}` : ''}`,
      descriptionAr: `الدفع: ${params.paymentStatus}`,
      actorId: params.actorId,
      actorType: params.actorType,
      actorName: params.actorName,
      newValue: params.paymentStatus
    })
  }
  
  return { success: !error, error }
}

// Assign secondary provider
export async function assignSecondaryProvider(params: {
  ticketId: string
  providerId: string
  providerType: string
  providerName: string
  actorId?: string
  actorType?: string
  actorName?: string
}): Promise<{ success: boolean; error: any }> {
  const supabase = createBrowserClient()
  
  const { error } = await supabase
    .from('healthcare_tickets')
    .update({
      secondary_provider_id: params.providerId,
      secondary_provider_type: params.providerType,
      secondary_provider_name: params.providerName,
      status: 'pending'
    })
    .eq('id', params.ticketId)
  
  if (!error) {
    await addTimelineEntry({
      ticketId: params.ticketId,
      action: 'provider_assigned',
      description: `Assigned to ${params.providerName} (${params.providerType})`,
      descriptionAr: `تم التعيين إلى ${params.providerName}`,
      actorId: params.actorId,
      actorType: params.actorType,
      actorName: params.actorName,
      newValue: params.providerName
    })
  }
  
  return { success: !error, error }
}

// Add timeline entry
export async function addTimelineEntry(params: {
  ticketId: string
  action: string
  description: string
  descriptionAr?: string
  actorId?: string
  actorType?: string
  actorName?: string
  previousValue?: string
  newValue?: string
  metadata?: any
}): Promise<{ entry: TicketTimelineEntry | null; error: any }> {
  const supabase = createBrowserClient()
  
  const { data, error } = await supabase
    .from('ticket_timeline')
    .insert({
      ticket_id: params.ticketId,
      action: params.action,
      action_description: params.description,
      action_description_ar: params.descriptionAr,
      actor_id: params.actorId,
      actor_type: params.actorType,
      actor_name: params.actorName,
      previous_value: params.previousValue,
      new_value: params.newValue,
      metadata: params.metadata || {}
    })
    .select()
    .single()
  
  return { entry: data, error }
}

// Add message to ticket
export async function addTicketMessage(params: {
  ticketId: string
  senderId: string
  senderType: string
  senderName?: string
  messageType?: string
  content: string
  attachments?: any[]
  visibility?: string
}): Promise<{ message: TicketMessage | null; error: any }> {
  const supabase = createBrowserClient()
  
  const { data, error } = await supabase
    .from('ticket_messages')
    .insert({
      ticket_id: params.ticketId,
      sender_id: params.senderId,
      sender_type: params.senderType,
      sender_name: params.senderName,
      message_type: params.messageType || 'text',
      content: params.content,
      attachments: params.attachments || [],
      visibility: params.visibility || 'all'
    })
    .select()
    .single()
  
  return { message: data, error }
}

// Get ticket by ID
export async function getTicket(ticketId: string): Promise<{ ticket: HealthcareTicket | null; error: any }> {
  const supabase = createBrowserClient()
  
  const { data, error } = await supabase
    .from('healthcare_tickets')
    .select('*')
    .eq('id', ticketId)
    .single()
  
  return { ticket: data, error }
}

// Get ticket by number
export async function getTicketByNumber(ticketNumber: string): Promise<{ ticket: HealthcareTicket | null; error: any }> {
  const supabase = createBrowserClient()
  
  const { data, error } = await supabase
    .from('healthcare_tickets')
    .select('*')
    .eq('ticket_number', ticketNumber)
    .single()
  
  return { ticket: data, error }
}

// Get ticket timeline (with limit to prevent fetching too many)
export async function getTicketTimeline(ticketId: string, limit = 200): Promise<{ entries: TicketTimelineEntry[]; error: any }> {
  const supabase = createBrowserClient()
  
  const { data, error } = await supabase
    .from('ticket_timeline')
    .select('*')
    .eq('ticket_id', ticketId)
    .order('created_at', { ascending: true })
    .limit(limit)
  
  return { entries: data || [], error }
}

// Get ticket messages (with limit to prevent fetching too many)
export async function getTicketMessages(ticketId: string, limit = 500): Promise<{ messages: TicketMessage[]; error: any }> {
  const supabase = createBrowserClient()
  
  const { data, error } = await supabase
    .from('ticket_messages')
    .select('*')
    .eq('ticket_id', ticketId)
    .order('created_at', { ascending: true })
    .limit(limit)
  
  return { messages: data || [], error }
}

// Get patient tickets
export async function getPatientTickets(patientId: string, options?: {
  status?: TicketStatus | TicketStatus[]
  type?: TicketType | TicketType[]
  limit?: number
}): Promise<{ tickets: HealthcareTicket[]; error: any }> {
  const supabase = createBrowserClient()
  
  let query = supabase
    .from('healthcare_tickets')
    .select('*')
    .eq('patient_id', patientId)
    .order('created_at', { ascending: false })
  
  if (options?.status) {
    if (Array.isArray(options.status)) {
      query = query.in('status', options.status)
    } else {
      query = query.eq('status', options.status)
    }
  }
  
  if (options?.type) {
    if (Array.isArray(options.type)) {
      query = query.in('ticket_type', options.type)
    } else {
      query = query.eq('ticket_type', options.type)
    }
  }
  
  if (options?.limit) {
    query = query.limit(options.limit)
  }
  
  const { data, error } = await query
  return { tickets: data || [], error }
}

// Get provider tickets
export async function getProviderTickets(providerId: string, role: 'primary' | 'secondary', options?: {
  status?: TicketStatus | TicketStatus[]
  type?: TicketType | TicketType[]
  limit?: number
}): Promise<{ tickets: HealthcareTicket[]; error: any }> {
  const supabase = createBrowserClient()
  
  const column = role === 'primary' ? 'primary_provider_id' : 'secondary_provider_id'
  
  let query = supabase
    .from('healthcare_tickets')
    .select('*')
    .eq(column, providerId)
    .order('created_at', { ascending: false })
  
  if (options?.status) {
    if (Array.isArray(options.status)) {
      query = query.in('status', options.status)
    } else {
      query = query.eq('status', options.status)
    }
  }
  
  if (options?.type) {
    if (Array.isArray(options.type)) {
      query = query.in('ticket_type', options.type)
    } else {
      query = query.eq('ticket_type', options.type)
    }
  }
  
  if (options?.limit) {
    query = query.limit(options.limit)
  }
  
  const { data, error } = await query
  return { tickets: data || [], error }
}

// Mark messages as read
export async function markMessagesRead(ticketId: string, readerType: 'patient' | 'primary' | 'secondary'): Promise<{ success: boolean; error: any }> {
  const supabase = createBrowserClient()
  
  const column = readerType === 'patient' 
    ? 'is_read_by_patient' 
    : readerType === 'primary' 
      ? 'is_read_by_primary' 
      : 'is_read_by_secondary'
  
  const { error } = await supabase
    .from('ticket_messages')
    .update({ [column]: true })
    .eq('ticket_id', ticketId)
  
  return { success: !error, error }
}

// Create notification for ticket update
export async function createTicketNotification(params: {
  userId: string
  ticketId: string
  ticketNumber: string
  type: string
  title: string
  message: string
  priority?: Priority
  actionUrl?: string
}): Promise<{ success: boolean; error: any }> {
  const supabase = createBrowserClient()
  
  const { error } = await supabase
    .from('notifications')
    .insert({
      user_id: params.userId,
      type: params.type,
      title: params.title,
      message: params.message,
      data: { 
        ticket_id: params.ticketId, 
        ticket_number: params.ticketNumber 
      }
    })
  
  return { success: !error, error }
}

// Create a child ticket (e.g., prescription creates pharmacy ticket, lab request creates lab ticket)
export async function createChildTicket(params: {
  parentTicketId: string
  ticketType: TicketType
  providerId?: string
  providerType?: string
  providerName?: string
}): Promise<{ ticket: HealthcareTicket | null; error: any }> {
  const supabase = createBrowserClient()
  
  // Use the database function to create child ticket
  const { data, error } = await supabase.rpc('create_child_ticket', {
    parent_id: params.parentTicketId,
    new_ticket_type: params.ticketType,
    new_provider_id: params.providerId || null,
    new_provider_type: params.providerType || null,
    new_provider_name: params.providerName || null
  })
  
  if (error) {
    return { ticket: null, error }
  }
  
  // Fetch the created ticket
  const { data: ticket, error: fetchError } = await supabase
    .from('healthcare_tickets')
    .select('*')
    .eq('id', data)
    .single()
  
  return { ticket, error: fetchError }
}

// Get ticket chain (parent and all children)
export async function getTicketChain(ticketId: string): Promise<{ 
  tickets: Array<HealthcareTicket & { depth: number }>; 
  error: any 
}> {
  const supabase = createBrowserClient()
  
  const { data, error } = await supabase.rpc('get_ticket_chain', {
    ticket_uuid: ticketId
  })
  
  if (error) {
    return { tickets: [], error }
  }
  
  // Fetch full ticket details for each ticket in the chain
  const ticketIds = data.map((t: any) => t.id)
  const { data: tickets, error: fetchError } = await supabase
    .from('healthcare_tickets')
    .select('*')
    .in('id', ticketIds)
  
  if (fetchError) {
    return { tickets: [], error: fetchError }
  }
  
  // Merge depth information
  const ticketsWithDepth = tickets?.map(t => ({
    ...t,
    depth: data.find((d: any) => d.id === t.id)?.depth || 0
  })) || []
  
  return { tickets: ticketsWithDepth.sort((a, b) => a.depth - b.depth), error: null }
}

// Get child tickets of a parent ticket
export async function getChildTickets(parentTicketId: string): Promise<{ 
  tickets: HealthcareTicket[]; 
  error: any 
}> {
  const supabase = createBrowserClient()
  
  const { data, error } = await supabase
    .from('healthcare_tickets')
    .select('*')
    .eq('parent_ticket_id', parentTicketId)
    .order('created_at', { ascending: true })
  
  return { tickets: data || [], error }
}

// Get parent ticket if this is a child ticket
export async function getParentTicket(ticketId: string): Promise<{ 
  ticket: HealthcareTicket | null; 
  error: any 
}> {
  const supabase = createBrowserClient()
  
  // First get the current ticket to find parent_ticket_id
  const { data: currentTicket, error: currentError } = await supabase
    .from('healthcare_tickets')
    .select('parent_ticket_id')
    .eq('id', ticketId)
    .single()
  
  if (currentError || !currentTicket?.parent_ticket_id) {
    return { ticket: null, error: currentError }
  }
  
  // Fetch parent ticket
  const { data, error } = await supabase
    .from('healthcare_tickets')
    .select('*')
    .eq('id', currentTicket.parent_ticket_id)
    .single()
  
  return { ticket: data, error }
}

export default {
  createTicket,
  updateTicketStatus,
  updateTicketPayment,
  assignSecondaryProvider,
  addTimelineEntry,
  addTicketMessage,
  getTicket,
  getTicketByNumber,
  getTicketTimeline,
  getTicketMessages,
  getPatientTickets,
  getProviderTickets,
  markMessagesRead,
  createTicketNotification,
  // Parent-child functions
  createChildTicket,
  getTicketChain,
  getChildTickets,
  getParentTicket
}
