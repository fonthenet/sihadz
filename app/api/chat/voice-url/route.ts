/**
 * Get playable URL for a voice message. Uses admin client to bypass RLS.
 * GET ?messageId=xxx - returns { url } for the first audio attachment
 */

import { createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const messageId = request.nextUrl.searchParams.get('messageId')
    if (!messageId || typeof messageId !== 'string') {
      return NextResponse.json({ error: 'messageId required' }, { status: 400 })
    }

    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const admin = createAdminClient()
    const { data: msg } = await admin
      .from('chat_messages')
      .select('thread_id')
      .eq('id', messageId)
      .single()

    if (!msg?.thread_id) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 })
    }

    // Verify user is in thread
    const { data: member } = await admin
      .from('chat_thread_members')
      .select('user_id')
      .eq('thread_id', msg.thread_id)
      .eq('user_id', user.id)
      .maybeSingle()

    if (!member) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const { data: atts } = await admin
      .from('chat_attachments')
      .select('storage_path, file_type, duration')
      .eq('message_id', messageId)
      .limit(5)

    let audio = (atts || []).find((a: any) => (a?.file_type || '').startsWith('audio/'))

    // Fallback: voice messages may have files in storage but no chat_attachments row
    if (!audio?.storage_path) {
      for (const folder of [`chat/${msg.thread_id}/${messageId}`, `${msg.thread_id}/${messageId}`]) {
        const { data: files } = await admin.storage.from('chat-attachments').list(folder, { limit: 20 })
        const audioFile = (files || []).find(
          (f: any) => f.name && (f.name.endsWith('.webm') || f.name.endsWith('.mp4') || f.name.endsWith('.ogg') || f.name.includes('voice'))
        )
        if (audioFile?.name) {
          audio = { storage_path: `${folder}/${audioFile.name}`, file_type: 'audio/webm', duration: undefined }
          break
        }
      }
    }

    if (!audio?.storage_path) {
      return NextResponse.json({ error: 'No audio attachment' }, { status: 404 })
    }

    const path = audio.storage_path
    const url = `/api/chat/attachment?path=${encodeURIComponent(path)}`

    return NextResponse.json({ url, duration: audio.duration })
  } catch (e) {
    console.error('[chat/voice-url] Error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
