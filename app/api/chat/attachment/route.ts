/**
 * Proxy chat attachment for playback - avoids CORS issues with direct storage URLs
 * GET ?path=chat/threadId/msgId/filename - streams file from storage
 */

import { createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

const BUCKET = 'chat-attachments'

export async function GET(request: NextRequest) {
  try {
    const path = request.nextUrl.searchParams.get('path')
    if (!path || typeof path !== 'string') {
      return NextResponse.json({ error: 'Path required' }, { status: 400 })
    }
    // Prevent path traversal
    if (path.includes('..') || path.startsWith('/')) {
      return NextResponse.json({ error: 'Invalid path' }, { status: 400 })
    }

    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Extract threadId from path: chat/threadId/msgId/filename OR threadId/msgId/filename
    const parts = path.split('/')
    const threadId = path.startsWith('chat/') ? parts[1] : parts[0]
    if (!threadId || threadId.length < 10) {
      return NextResponse.json({ error: 'Invalid path format' }, { status: 400 })
    }

    // Verify user has access to thread
    const admin = createAdminClient()
    const { data: member } = await admin
      .from('chat_thread_members')
      .select('user_id')
      .eq('thread_id', threadId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (!member) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const { data, error } = await admin.storage.from(BUCKET).download(path)
    if (error || !data) {
      console.error('[chat/attachment] Download error:', error)
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }

    const contentType = data.type || 'application/octet-stream'

    return new NextResponse(data, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'private, max-age=3600',
      },
    })
  } catch (e) {
    console.error('[chat/attachment] Error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
