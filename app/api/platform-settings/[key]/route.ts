import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

const getAdminClient = () => createAdminClient()

// GET - Fetch a specific platform setting (public read)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  try {
    const { key } = await params
    const admin = getAdminClient()

    const { data, error } = await admin
      .from('platform_settings')
      .select('value')
      .eq('key', key)
      .single()

    if (error && error.code !== 'PGRST116') {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: 'Setting not found' }, { status: 404 })
    }

    return NextResponse.json(data.value)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
