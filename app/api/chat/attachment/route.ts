/**
 * Proxy chat attachment for playback - avoids CORS issues with direct storage URLs
 * GET ?path=chat/threadId/msgId/filename - streams file from storage
 * When Safari/iOS requests WebM audio, transcodes to MP4 for playback support
 * (Transcoding skipped on Vercel - ffmpeg exceeds 50MB serverless function limit)
 */

import { createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

const BUCKET = 'chat-attachments'

function isSafariOrIOS(userAgent: string | null): boolean {
  if (!userAgent) return false
  return (
    /iPad|iPhone|iPod/.test(userAgent) ||
    (userAgent.includes('Safari') && !userAgent.includes('Chrome'))
  )
}

function isWebMAudio(path: string, contentType: string): boolean {
  return (
    path.toLowerCase().endsWith('.webm') ||
    contentType.startsWith('audio/webm')
  )
}

/** Stream WebM → MP4 for Safari/iOS. Returns null on Vercel (ffmpeg not available). */
async function transcodeWebmToMp4(buffer: Buffer): Promise<ReadableStream<Uint8Array> | null> {
  if (process.env.VERCEL) return null
  try {
    const { Readable, PassThrough } = await import('stream')
    const ffmpeg = (await import('fluent-ffmpeg')).default
    const ffmpegPath = (await import('ffmpeg-static')).default
    const inputStream = Readable.from(buffer)
    const outputStream = new PassThrough()
    const path = ffmpegPath ?? 'ffmpeg'
    const cmd = ffmpeg(inputStream)
      .setFfmpegPath(path)
      .inputFormat('webm')
      .outputFormat('mp4')
      .audioCodec('aac')
      .audioBitrate('128k')
      .addOutputOptions(['-vn', '-movflags +frag_keyframe+empty_moov'])
      .pipe(outputStream, { end: true })
    cmd.on('error', (err) => {
      console.error('[chat/attachment] FFmpeg error:', err.message)
      outputStream.destroy(err)
    })
    const webStream = Readable.toWeb(outputStream) as ReadableStream<Uint8Array>
    return webStream
  } catch {
    return null
  }
}

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
    const userAgent = request.headers.get('user-agent')

    // Transcode WebM → MP4 for Safari/iOS (WebM not supported)
    // Skipped on Vercel - ffmpeg exceeds 50MB serverless function limit
    if (isSafariOrIOS(userAgent) && isWebMAudio(path, contentType)) {
      const buffer = Buffer.from(await data.arrayBuffer())
      const webStream = await transcodeWebmToMp4(buffer)
      if (webStream) {
        return new NextResponse(webStream, {
          headers: { 'Content-Type': 'audio/mp4', 'Cache-Control': 'private, max-age=3600' },
        })
      }
    }

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
