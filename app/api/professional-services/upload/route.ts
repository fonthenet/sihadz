/**
 * Professional service image upload
 * POST: multipart form with file + professionalId
 * Uploads to Supabase Storage, returns public URL
 */

import { createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

// Force Node.js runtime and dynamic rendering for Vercel
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const BUCKET = 'professional-services'
const MAX_SIZE = 5 * 1024 * 1024 // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const professionalId = formData.get('professionalId') as string | null
    if (!file || !(file instanceof File) || !professionalId) {
      return NextResponse.json({ error: 'Missing file or professionalId' }, { status: 400 })
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'File too large (max 5MB)' }, { status: 400 })
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: 'Invalid file type (use JPEG, PNG, WebP, or GIF)' }, { status: 400 })
    }

    const admin = createAdminClient()
    const { data: prof } = await admin
      .from('professionals')
      .select('id')
      .eq('id', professionalId)
      .eq('auth_user_id', user.id)
      .maybeSingle()

    if (!prof) {
      const { data: emp } = await admin.from('employee_sessions').select('professional_id').eq('auth_user_id', user.id).maybeSingle()
      if (!emp || emp.professional_id !== professionalId) {
        return NextResponse.json({ error: 'Not authorized for this professional' }, { status: 403 })
      }
    }

    const ext = file.name.split('.').pop() || 'jpg'
    const path = `${professionalId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

    const buf = Buffer.from(await file.arrayBuffer())
    const { error: uploadErr } = await admin.storage
      .from(BUCKET)
      .upload(path, buf, { contentType: file.type, upsert: false })

    if (uploadErr) {
      console.error('[professional-services/upload]', uploadErr)
      return NextResponse.json(
        { error: uploadErr.message || `Upload failed` },
        { status: 500 }
      )
    }

    const { data: urlData } = admin.storage.from(BUCKET).getPublicUrl(path)
    return NextResponse.json({ url: urlData.publicUrl })
  } catch (e) {
    console.error('[professional-services/upload]', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
