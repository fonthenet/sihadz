/**
 * Avatar upload API - updates profiles.avatar_url
 * POST: Accept multipart form with "file" (image), uploads to Vercel Blob, updates profile
 */

import { createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'
import { put } from '@vercel/blob'

// Force Node.js runtime and dynamic rendering for Vercel
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MAX_SIZE = 2 * 1024 * 1024 // 2MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'File too large (max 2MB)' }, { status: 400 })
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: 'Invalid file type (use JPEG, PNG, WebP, or GIF)' }, { status: 400 })
    }

    const ext = file.name.split('.').pop() || 'jpg'
    const path = `avatars/${user.id}/avatar.${ext}`

    const admin = createAdminClient()

    const blob = await put(path, file, { access: 'public', contentType: file.type })
    const avatarUrl = blob.url

    // Ensure profile row exists (professionals may not have one from signup trigger) then set avatar_url
    const { data: existing } = await admin.from('profiles').select('id').eq('id', user.id).maybeSingle()
    const { data: prof } = await admin.from('professionals').select('id, type').eq('auth_user_id', user.id).maybeSingle()
    
    if (!existing) {
      const { error: insertErr } = await admin.from('profiles').insert({
        id: user.id,
        email: user.email ?? '',
        full_name: user.user_metadata?.full_name ?? user.email?.split('@')[0] ?? 'User',
        user_type: prof?.type ?? 'patient',
        avatar_url: avatarUrl,
      })
      if (insertErr) {
        console.error('[avatar/upload] Profile insert error:', insertErr)
        return NextResponse.json({ error: 'Failed to create profile' }, { status: 500 })
      }
    } else {
      const { error: updateErr } = await admin
        .from('profiles')
        .update({ avatar_url: avatarUrl })
        .eq('id', user.id)
      if (updateErr) {
        console.error('[avatar/upload] Profile update error:', updateErr)
        return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 })
      }
    }

    // Also update the professional's business avatar if user is a professional owner
    if (prof?.id) {
      const { error: profUpdateErr } = await admin
        .from('professionals')
        .update({ avatar_url: avatarUrl })
        .eq('id', prof.id)
      if (profUpdateErr) {
        console.error('[avatar/upload] Professional avatar update error:', profUpdateErr)
        // Non-fatal - profile was already updated
      }
    }

    return NextResponse.json({ avatar_url: avatarUrl })
  } catch (e) {
    console.error('[avatar/upload] Error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
