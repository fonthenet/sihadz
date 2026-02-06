'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@/lib/supabase/client'

const BUCKET = 'chat-attachments'
const EXPIRES_IN = 3600

/**
 * Resolves a URL for a chat attachment.
 * For audio: uses proxy API to avoid CORS/playback issues with signed URLs.
 * For other types: uses signed URL from storage.
 */
export function useAttachmentUrl(attachment: { url?: string; storage_path?: string; file_type?: string } | null) {
  const [url, setUrl] = useState<string>('')

  useEffect(() => {
    if (!attachment) {
      setUrl('')
      return
    }
    const existing = attachment.url && (attachment.url.startsWith('http') || attachment.url.startsWith('/'))
    if (existing) {
      setUrl(attachment.url)
      return
    }
    const path = attachment.storage_path
    if (!path || typeof path !== 'string' || path.startsWith('http')) {
      setUrl('')
      return
    }

    const isAudio = (attachment.file_type || '').startsWith('audio/')

    let cancelled = false
    ;(async () => {
      try {
        // Audio: use proxy API for reliable playback (avoids CORS with signed URLs)
        if (isAudio) {
          const proxyUrl = `/api/chat/attachment?path=${encodeURIComponent(path)}`
          if (!cancelled) setUrl(proxyUrl)
          return
        }
        // Images/videos/files: use signed URL
        const { data, error } = await createBrowserClient()
          .storage
          .from(BUCKET)
          .createSignedUrl(path, EXPIRES_IN)
        if (!cancelled && !error && data?.signedUrl) {
          setUrl(data.signedUrl)
        }
      } catch {
        if (!cancelled) setUrl('')
      }
    })()
    return () => { cancelled = true }
  }, [attachment?.url, attachment?.storage_path, attachment?.file_type])

  return attachment?.url && (attachment.url.startsWith('http') || attachment.url.startsWith('/')) ? attachment.url : url
}
