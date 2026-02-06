/**
 * Voice message upload - uses FormData to avoid JSON body size limits
 * POST: Send voice message with audio file
 */

import { createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

export const runtime = "nodejs"
export const dynamic = "force-dynamic"


const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB for voice

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

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ threadId: string }> }
) {
  try {
    const { threadId } = await params
    if (!threadId) return NextResponse.json({ error: 'Thread ID required' }, { status: 400 })

    const supabase = await createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized. Please sign in.' }, { status: 401 })
    }

    const formData = await request.formData()
    const audio = formData.get('audio') as File | null
    const duration = Number(formData.get('duration') ?? 0)

    if (!audio || !(audio instanceof File)) {
      return NextResponse.json({ error: 'Audio file required' }, { status: 400 })
    }
    if (audio.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'Voice message too large' }, { status: 400 })
    }

    const admin = createAdminClient()
    await ensureUserIsMember(admin, threadId, user.id)

    const ext = audio.type.includes('webm') ? 'webm' : audio.type.includes('mp4') ? 'mp4' : 'webm'
    const fileName = `voice-${Date.now()}.${ext}`
    const contentType = audio.type || (ext === 'webm' ? 'audio/webm' : 'audio/mp4')

    const { data: message, error: msgErr } = await admin
      .from('chat_messages')
      .insert({
        thread_id: threadId,
        sender_id: user.id,
        content: '🎙️ Voice message',
        message_type: 'file',
      })
      .select('id')
      .single()

    if (msgErr || !message) {
      console.error('[voice] Insert error:', msgErr)
      return NextResponse.json({ error: msgErr?.message ?? 'Failed to send' }, { status: 500 })
    }

    const storagePath = `chat/${threadId}/${message.id}/${fileName}`
    const buf = Buffer.from(await audio.arrayBuffer())
    const { error: uploadErr } = await admin.storage
      .from('chat-attachments')
      .upload(storagePath, buf, { contentType })

    if (uploadErr) {
      console.error('[voice] Upload error:', uploadErr)
      return NextResponse.json({ error: uploadErr.message ?? 'Upload failed' }, { status: 500 })
    }

    await admin.from('chat_attachments').insert({
      message_id: message.id,
      file_name: fileName,
      file_type: contentType,
      file_size: audio.size,
      storage_path: storagePath,
      duration: duration > 0 ? Math.round(duration) : undefined,
    })

    await admin.from('chat_threads').update({ updated_at: new Date().toISOString() }).eq('id', threadId)
    return NextResponse.json({ success: true, messageId: message.id })
  } catch (e) {
    console.error('[voice] Error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
