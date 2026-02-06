/**
 * Clinical order messages API
 * GET: Load messages for a prescription or lab request
 * POST: Send message (and optionally files) for a prescription or lab request
 * Uses admin client to find thread and bypass RLS issues.
 */

import { createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

const MAX_FILE_SIZE = 15 * 1024 * 1024 // 15MB

async function findThreadForOrder(
  admin: ReturnType<typeof createAdminClient>,
  orderId: string,
  orderType: 'prescription' | 'lab'
) {
  const metaKey = orderType === 'prescription' ? 'prescription_id' : 'lab_request_id'
  console.log(`[findThreadForOrder] Looking for ${orderType} ${orderId}, metaKey=${metaKey}`)

  // 1) Direct metadata lookup - search by metadata JSONB field
  const { data: direct, error: directErr } = await admin
    .from('chat_threads')
    .select('id, metadata, order_id, order_type')
    .eq('order_type', orderType)
    .limit(200)

  if (directErr) {
    console.error('[findThreadForOrder] Error querying threads:', directErr)
  }

  console.log(`[findThreadForOrder] Found ${direct?.length ?? 0} threads with order_type=${orderType}`)
  
  const matchedDirect = (direct ?? []).find((t: any) => {
    const meta = t.metadata || {}
    const matches = meta[metaKey] === orderId
    if (matches) {
      console.log(`[findThreadForOrder] Direct match found: threadId=${t.id}, metadata=`, meta)
    }
    return matches
  })
  if (matchedDirect?.id) return matchedDirect.id

  // 2) Fallback: get order's appointment_id, then find threads
  const table = orderType === 'prescription' ? 'prescriptions' : 'lab_test_requests'
  const { data: order, error: orderErr } = await admin.from(table).select('appointment_id').eq('id', orderId).maybeSingle()
  
  if (orderErr) {
    console.error(`[findThreadForOrder] Error fetching ${orderType}:`, orderErr)
  }
  
  if (!order?.appointment_id) {
    console.warn(`[findThreadForOrder] No appointment_id found for ${orderType} ${orderId}`)
    return null
  }

  console.log(`[findThreadForOrder] Order has appointment_id=${order.appointment_id}, searching threads...`)

  const { data: byOrderId, error: byOrderErr } = await admin
    .from('chat_threads')
    .select('id, metadata, order_id')
    .eq('order_type', orderType)
    .eq('order_id', order.appointment_id)
    .limit(50)
    
  if (byOrderErr) {
    console.error('[findThreadForOrder] Error querying by order_id:', byOrderErr)
  }

  let candidates = byOrderId ?? []
  console.log(`[findThreadForOrder] Found ${candidates.length} threads with order_id=${order.appointment_id}`)

  if (candidates.length === 0) {
    candidates = (direct ?? []).filter((t: any) => {
      const meta = t.metadata || {}
      return meta.appointment_id === order.appointment_id
    })
    console.log(`[findThreadForOrder] After filtering by metadata.appointment_id: ${candidates.length} candidates`)
  }

  const match = candidates.find((t: any) => {
    const meta = t.metadata || {}
    const matches = meta[metaKey] === orderId
    if (matches) {
      console.log(`[findThreadForOrder] Match found in candidates: threadId=${t.id}`)
    }
    return matches
  })
  
  if (!match) {
    console.warn(`[findThreadForOrder] No thread found for ${orderType} ${orderId} after all searches`)
    // Log all candidates for debugging
    candidates.forEach((c: any, i: number) => {
      console.log(`[findThreadForOrder] Candidate ${i}: threadId=${c.id}, metadata=`, c.metadata)
    })
  }
  
  return match?.id ?? null
}

async function ensureUserIsMember(admin: ReturnType<typeof createAdminClient>, threadId: string, userId: string) {
  const { data: existing } = await admin
    .from('chat_thread_members')
    .select('user_id')
    .eq('thread_id', threadId)
    .eq('user_id', userId)
    .maybeSingle()

  if (!existing) {
    await admin.from('chat_thread_members').insert({
      thread_id: threadId,
      user_id: userId,
      role: 'member',
    })
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orderType: string; orderId: string }> }
) {
  try {
    const { orderType, orderId } = await params
    if (!['prescription', 'lab'].includes(orderType)) {
      return NextResponse.json({ error: 'Invalid order type' }, { status: 400 })
    }

    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    console.log(`[clinical-orders/messages] GET: orderType=${orderType}, orderId=${orderId}, userId=${user.id}`)

    const admin = createAdminClient()
    const threadId = await findThreadForOrder(admin, orderId, orderType as 'prescription' | 'lab')
    console.log(`[clinical-orders/messages] GET: Found threadId=${threadId} for orderId=${orderId}`)
    
    if (!threadId) {
      console.warn(`[clinical-orders/messages] GET: No thread found for ${orderType} ${orderId}`)
      return NextResponse.json({ messages: [], threadId: null })
    }

    await ensureUserIsMember(admin, threadId, user.id)
    console.log(`[clinical-orders/messages] GET: Ensured user ${user.id} is member of thread ${threadId}`)

    // Fetch messages without join first to avoid RLS issues
    const { data: msgs, error: msgError } = await admin
      .from('chat_messages')
      .select('id, content, message_type, created_at, sender_id, is_deleted')
      .eq('thread_id', threadId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: true })
      .limit(100)

    if (msgError) {
      console.error('[clinical-orders/messages] GET: Error fetching messages:', msgError)
      return NextResponse.json({ error: 'Failed to load messages' }, { status: 500 })
    }

    // Fetch attachments separately
    const messageIds = (msgs ?? []).map((m: any) => m.id)
    const { data: attachments } = messageIds.length > 0 ? await admin
      .from('chat_attachments')
      .select('id, message_id, file_name, file_type, file_size, storage_path')
      .in('message_id', messageIds) : { data: [] }

    // Fetch sender profiles separately
    const senderIds = [...new Set((msgs ?? []).map((m: any) => m.sender_id))]
    const { data: profiles } = senderIds.length > 0 ? await admin
      .from('profiles')
      .select('id, full_name, avatar_url')
      .in('id', senderIds) : { data: [] }

    // Also fetch professionals for doctors/pharmacies
    const { data: professionals } = senderIds.length > 0 ? await admin
      .from('professionals')
      .select('auth_user_id, business_name')
      .in('auth_user_id', senderIds) : { data: [] }

    // Combine data
    const messagesWithData = (msgs ?? []).map((msg: any) => {
      const profile = profiles?.find((p: any) => p.id === msg.sender_id)
      const professional = professionals?.find((p: any) => p.auth_user_id === msg.sender_id)
      const msgAttachments = attachments?.filter((a: any) => a.message_id === msg.id) ?? []
      
      return {
        ...msg,
        sender: profile ? {
          id: profile.id,
          full_name: professional?.business_name || profile.full_name,
          avatar_url: profile.avatar_url,
        } : professional ? {
          id: professional.auth_user_id,
          full_name: professional.business_name,
          avatar_url: null,
        } : {
          id: msg.sender_id,
          full_name: 'Unknown',
          avatar_url: null,
        },
        chat_attachments: msgAttachments,
      }
    })

    console.log(`[clinical-orders/messages] GET: Returning ${messagesWithData.length} messages`)
    return NextResponse.json({ messages: messagesWithData, threadId })
  } catch (e) {
    console.error('[clinical-orders/messages] GET error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orderType: string; orderId: string }> }
) {
  try {
    const { orderType, orderId } = await params
    if (!['prescription', 'lab'].includes(orderType)) {
      return NextResponse.json({ error: 'Invalid order type' }, { status: 400 })
    }

    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json().catch(() => ({}))
    const content = (body.content as string)?.trim() ?? ''
    const files = (body.files as Array<{ name: string; type: string; size?: number; base64?: string }>) ?? []

    console.log(`[clinical-orders/messages] POST: orderType=${orderType}, orderId=${orderId}, userId=${user.id}, contentLength=${content.length}, files=${files.length}`)

    if (!content && files.length === 0) {
      return NextResponse.json({ error: 'Content or file required' }, { status: 400 })
    }

    const admin = createAdminClient()
    const threadId = await findThreadForOrder(admin, orderId, orderType as 'prescription' | 'lab')
    console.log(`[clinical-orders/messages] POST: Found threadId=${threadId} for orderId=${orderId}`)
    
    if (!threadId) {
      console.error(`[clinical-orders/messages] POST: No thread found for ${orderType} ${orderId}`)
      return NextResponse.json(
        { error: orderType === 'prescription' ? 'Send prescription to a pharmacy first' : 'Send lab request to a laboratory first' },
        { status: 404 }
      )
    }

    await ensureUserIsMember(admin, threadId, user.id)
    console.log(`[clinical-orders/messages] POST: Ensured user ${user.id} is member of thread ${threadId}`)

    const messageType = files.length > 0 && files[0].type?.startsWith('image/') ? 'image' : 'text'
    const { data: message, error: msgErr } = await admin
      .from('chat_messages')
      .insert({
        thread_id: threadId,
        sender_id: user.id,
        content: content || (files[0]?.name ?? 'File'),
        message_type: messageType,
      })
      .select('id')
      .single()

    if (msgErr || !message) {
      console.error('[clinical-orders/messages] POST: Insert error:', msgErr)
      return NextResponse.json({ error: msgErr?.message ?? 'Failed to send' }, { status: 500 })
    }

    console.log(`[clinical-orders/messages] POST: Message inserted successfully, messageId=${message.id}`)

    // Immediately fetch the full message with sender info to return
    const { data: fullMessage } = await admin
      .from('chat_messages')
      .select('id, content, message_type, created_at, sender_id, is_deleted')
      .eq('id', message.id)
      .single()

    // Get sender info
    let senderInfo: any = { id: user.id, full_name: 'Unknown', avatar_url: null }
    if (fullMessage) {
      const { data: profile } = await admin
        .from('profiles')
        .select('id, full_name, avatar_url')
        .eq('id', user.id)
        .maybeSingle()
      
      const { data: professional } = await admin
        .from('professionals')
        .select('auth_user_id, business_name')
        .eq('auth_user_id', user.id)
        .maybeSingle()

      if (professional) {
        senderInfo = {
          id: professional.auth_user_id,
          full_name: professional.business_name,
          avatar_url: null,
        }
      } else if (profile) {
        senderInfo = {
          id: profile.id,
          full_name: profile.full_name,
          avatar_url: profile.avatar_url,
        }
      }
    }

    // Upload files
    for (const file of files) {
      if (file.size && file.size > MAX_FILE_SIZE) continue
      if (!file.base64) continue

      const safeName = (file.name || 'file').replace(/[^a-zA-Z0-9.-]/g, '_')
      const storagePath = `${threadId}/${message.id}/${Date.now()}-${safeName}`

      try {
        const buf = Buffer.from(file.base64, 'base64')
        const { error: uploadErr } = await admin.storage
          .from('chat-attachments')
          .upload(storagePath, buf, { contentType: file.type || 'application/octet-stream' })

        if (!uploadErr) {
          await admin.from('chat_attachments').insert({
            message_id: message.id,
            file_name: file.name,
            file_type: file.type || 'application/octet-stream',
            file_size: file.size ?? buf.length,
            storage_path: storagePath,
          })
        }
      } catch (upErr) {
        console.error('[clinical-orders/messages] POST: File upload error:', upErr)
      }
    }

    await admin.from('chat_threads').update({ updated_at: new Date().toISOString() }).eq('id', threadId)

    // Return the full message so frontend can add it optimistically
    const responseMessage = {
      ...fullMessage,
      sender: senderInfo,
      chat_attachments: [],
    }

    console.log(`[clinical-orders/messages] POST: Success, returning messageId=${message.id}`)
    return NextResponse.json({ 
      success: true, 
      messageId: message.id, 
      threadId,
      message: responseMessage,
    })
  } catch (e) {
    console.error('[clinical-orders/messages] POST error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
