/**
 * Forward message to another thread
 * POST: { targetThreadId, messageId }
 * Copies message content and attachments to target thread
 */

import { createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

const BUCKET = 'chat-attachments'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const { targetThreadId, messageId } = body
    if (!targetThreadId || !messageId) {
      return NextResponse.json({ error: 'targetThreadId and messageId required' }, { status: 400 })
    }

    const admin = createAdminClient()

    // Verify user is member of source thread (via message)
    const { data: msg, error: msgErr } = await admin
      .from('chat_messages')
      .select('id, thread_id, sender_id, content, message_type')
      .eq('id', messageId)
      .eq('is_deleted', false)
      .maybeSingle()

    if (msgErr || !msg) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 })
    }

    const sourceThreadId = msg.thread_id

    // Verify user is member of both threads
    const { data: sourceMember } = await admin
      .from('chat_thread_members')
      .select('user_id')
      .eq('thread_id', sourceThreadId)
      .eq('user_id', user.id)
      .maybeSingle()

    const { data: targetMember } = await admin
      .from('chat_thread_members')
      .select('user_id')
      .eq('thread_id', targetThreadId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (!sourceMember || !targetMember) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    if (sourceThreadId === targetThreadId) {
      return NextResponse.json({ error: 'Cannot forward to same thread' }, { status: 400 })
    }

    // Create new message in target thread
    const { data: newMsg, error: insertErr } = await admin
      .from('chat_messages')
      .insert({
        thread_id: targetThreadId,
        sender_id: user.id,
        content: msg.content || '',
        message_type: msg.message_type || 'text',
        forwarded_from_id: messageId,
      })
      .select('id')
      .single()

    if (insertErr || !newMsg) {
      console.error('[forward] Insert error:', insertErr)
      return NextResponse.json({ error: insertErr?.message ?? 'Failed to forward' }, { status: 500 })
    }

    // Copy attachments
    const { data: attachments } = await admin
      .from('chat_attachments')
      .select('file_name, file_type, file_size, storage_path, duration')
      .eq('message_id', messageId)

    if (attachments && attachments.length > 0) {
      for (const att of attachments) {
        const oldPath = att.storage_path
        if (!oldPath || typeof oldPath !== 'string') continue

        const fileName = oldPath.split('/').pop() || `file-${Date.now()}`
        const newPath = `chat/${targetThreadId}/${newMsg.id}/${Date.now()}-${fileName}`

        try {
          const { error: copyErr } = await admin.storage
            .from(BUCKET)
            .copy(oldPath, newPath)

          if (copyErr) {
            console.error('[forward] Copy error:', copyErr)
            continue
          }

          await admin.from('chat_attachments').insert({
            message_id: newMsg.id,
            file_name: att.file_name,
            file_type: att.file_type,
            file_size: att.file_size,
            storage_path: newPath,
            duration: att.duration,
          })
        } catch (e) {
          console.error('[forward] Attachment copy failed:', e)
        }
      }
    }

    await admin.from('chat_threads').update({ updated_at: new Date().toISOString() }).eq('id', targetThreadId)
    return NextResponse.json({ success: true, messageId: newMsg.id })
  } catch (e) {
    console.error('[forward] Error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
