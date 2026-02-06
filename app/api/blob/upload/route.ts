/**
 * Client-side blob upload handler
 * Handles client-side uploads with authentication
 */

import { createServerClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = (await request.json()) as HandleUploadBody

    // Verify authentication
    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        // Optionally validate pathname, file type, etc.
        // Return metadata to be stored with the blob
        return {
          allowedContentTypes: [
            'image/jpeg',
            'image/png',
            'image/webp',
            'image/gif',
            'application/pdf',
            'audio/mpeg',
            'audio/wav',
            'audio/ogg',
            'video/mp4',
          ],
          tokenPayload: JSON.stringify({
            userId: user.id,
            uploadedAt: new Date().toISOString(),
          }),
        }
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        // Optional: Store blob metadata in your database
        console.log('[blob/upload] Upload completed:', blob.url, tokenPayload)
      },
    })

    return NextResponse.json(jsonResponse)
  } catch (error) {
    console.error('[blob/upload] Error:', error)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}
