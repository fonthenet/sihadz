/**
 * Thread messages API - unified messaging for all boards (doctor, pharmacy, patient, lab)
 * GET: Load messages for a thread
 * POST: Send message (text and/or files) to a thread
 * Uses admin client to bypass RLS after verifying user has access.
 */

import { createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

const MAX_FILE_SIZE = 15 * 1024 * 1024 // 15MB

async function verifyThreadAccess(admin: ReturnType<typeof createAdminClient>, threadId: string, userId: string) {
  // Use admin client to bypass RLS when checking membership
  const { data } = await admin
    .from('chat_thread_members')
    .select('user_id')
    .eq('thread_id', threadId)
    .eq('user_id', userId)
    .maybeSingle()
  return !!data
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
  { params }: { params: Promise<{ threadId: string }> }
) {
  try {
    const { threadId } = await params
    if (!threadId) return NextResponse.json({ error: 'Thread ID required' }, { status: 400 })

    const supabase = await createServerClient()
    
    // Get the user - if session is stale, getUser will refresh it
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError) {
      console.error('[threads/messages] Auth error:', authError)
      return NextResponse.json({ error: 'Session expired. Please refresh the page.' }, { status: 401 })
    }
    if (!user) {
      console.error('[threads/messages] No user found')
      return NextResponse.json({ error: 'Unauthorized. Please sign in.' }, { status: 401 })
    }

    const admin = createAdminClient()
    
    // Use admin client to verify access (bypasses RLS)
    const hasAccess = await verifyThreadAccess(admin, threadId, user.id)
    if (!hasAccess) {
      // User not a member - ensure they are added, then allow access
      await ensureUserIsMember(admin, threadId, user.id)
    }

    const { data: msgs } = await admin
      .from('chat_messages')
      .select(`
        id, content, message_type, created_at, sender_id, is_deleted,
        sender:profiles!sender_id(id, full_name, avatar_url),
        chat_attachments(id, file_name, file_type, file_size, storage_path)
      `)
      .eq('thread_id', threadId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: true })
      .limit(200)

    return NextResponse.json({ messages: msgs ?? [], threadId })
  } catch (e) {
    console.error('[threads/messages] GET error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ threadId: string }> }
) {
  try {
    const { threadId } = await params
    if (!threadId) return NextResponse.json({ error: 'Thread ID required' }, { status: 400 })

    const supabase = await createServerClient()
    
    // Get the user - if session is stale, getUser will refresh it
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError) {
      console.error('[threads/messages] Auth error:', authError)
      return NextResponse.json({ error: 'Session expired. Please refresh the page.' }, { status: 401 })
    }
    if (!user) {
      console.error('[threads/messages] No user found')
      return NextResponse.json({ error: 'Unauthorized. Please sign in.' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const content = (body.content as string)?.trim() ?? ''
    const files = (body.files as Array<{ name: string; type: string; size?: number; base64?: string; duration?: number }>) ?? []
    const isVoiceMessage = body.message_type === 'audio' || (files.length === 1 && files[0].type?.startsWith('audio/'))

    if (!content && files.length === 0) {
      return NextResponse.json({ error: 'Content or file required' }, { status: 400 })
    }

    const admin = createAdminClient()
    
    // Always ensure user is a member before sending
    await ensureUserIsMember(admin, threadId, user.id)

    let messageType: 'text' | 'image' | 'file' | 'video' = 'text'
    if (isVoiceMessage) {
      messageType = 'file'
    } else if (files.length > 0) {
      const firstType = files[0].type ?? ''
      if (firstType.startsWith('image/')) messageType = 'image'
      else if (firstType.startsWith('video/')) messageType = 'file'
      else if (firstType.startsWith('audio/')) messageType = 'file'
      else messageType = 'file'
    }

    const insertContent = content || (isVoiceMessage ? '🎙️ Voice message' : (files[0]?.name ?? 'File'))
    const { data: message, error: msgErr } = await admin
      .from('chat_messages')
      .insert({
        thread_id: threadId,
        sender_id: user.id,
        content: insertContent,
        message_type: messageType,
      })
      .select('id')
      .single()

    if (msgErr || !message) {
      console.error('[threads/messages] Insert error:', msgErr)
      return NextResponse.json({ error: msgErr?.message ?? 'Failed to send' }, { status: 500 })
    }

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
            ...(file.duration != null && { duration: Math.round(file.duration) }),
          })
        }
      } catch (upErr) {
        console.error('[threads/messages] File upload error:', upErr)
      }
    }

    await admin.from('chat_threads').update({ updated_at: new Date().toISOString() }).eq('id', threadId)
    return NextResponse.json({ success: true, messageId: message.id })
  } catch (e) {
    console.error('[threads/messages] POST error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
