/**
 * Chat attachment upload API
 * Uploads files to Vercel Blob and stores metadata in database
 */

import { createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'
import { put } from '@vercel/blob'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MAX_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
  'audio/mpeg',
  'audio/wav',
  'audio/ogg',
  'video/mp4',
]

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const pathname = formData.get('pathname') as string | null
    const messageId = formData.get('messageId') as string | null

    if (!file || !messageId) {
      return NextResponse.json({ error: 'File and messageId required' }, { status: 400 })
    }

    // Validate file
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: `File too large. Maximum size: ${MAX_SIZE / (1024 * 1024)}MB` },
        { status: 400 }
      )
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: 'File type not allowed' }, { status: 400 })
    }

    // Extract threadId from pathname or messageId
    const threadId = pathname?.split('/')[1] || messageId.split('-')[0]

    // Verify user has access to thread
    const admin = createAdminClient()
    const { data: member } = await admin
      .from('chat_thread_members')
      .select('user_id')
      .eq('thread_id', threadId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (!member) {
      return NextResponse.json({ error: 'Access denied to this thread' }, { status: 403 })
    }

    // Upload to Vercel Blob
    const path = pathname || `chat/${threadId}/${messageId}/${Date.now()}-${file.name}`
    const blob = await put(path, file, {
      access: 'public',
      contentType: file.type,
    })

    // Store attachment metadata
    await admin.from('chat_attachments').insert({
      message_id: messageId,
      file_name: file.name,
      file_type: file.type,
      file_size: file.size,
      storage_path: path,
      file_url: blob.url,
    })

    // Trigger message update for realtime sync
    try {
      await admin
        .from('chat_messages')
        .update({ edited_at: new Date().toISOString() })
        .eq('id', messageId)
    } catch (_) {
      // Ignore update errors
    }

    return NextResponse.json({ url: blob.url })
  } catch (error) {
    console.error('[chat/upload] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Upload failed' },
      { status: 500 }
    )
  }
}
