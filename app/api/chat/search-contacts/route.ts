/**
 * Chat contact search - uses service role to bypass RLS.
 * Ensures all professionals (verified, approved, pending) are discoverable.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

function tokenizeQuery(q: string): string[] {
  return q.trim().toLowerCase().split(/\s+/).map(t => t.trim()).filter(Boolean).slice(0, 4)
}

function buildOrFilter(columns: string[], tokens: string[]): string {
  const parts: string[] = []
  for (const col of columns) {
    for (const t of tokens) {
      if (t.length > 0) parts.push(`${col}.ilike.%${t}%`)
    }
  }
  return parts.join(',')
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const query = request.nextUrl.searchParams.get('q') || ''
    const tokens = tokenizeQuery(query)
    if (tokens.length === 0) {
      return NextResponse.json({ professionals: [], patients: [] })
    }

    // Use service role to bypass RLS (ensures all pros are visible)
    const { createClient: createAdminClient } = await import('@supabase/supabase-js')
    const admin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    )

    const proOr = buildOrFilter(['business_name', 'email', 'type', 'wilaya'], tokens)
    const { data: professionals, error: proError } = await admin
      .from('professionals')
      .select('id, auth_user_id, business_name, type, phone, wilaya, commune, is_verified, is_active, rating')
      .or(proOr)
      .in('status', ['verified', 'approved', 'pending', 'waiting_approval'])
      .not('auth_user_id', 'is', null)
      .neq('auth_user_id', user.id)
      .limit(20)
    
    console.log('[chat/search-contacts] Query:', query, 'Tokens:', tokens, 'Filter:', proOr)
    console.log('[chat/search-contacts] Professionals found:', professionals?.length || 0, proError ? `Error: ${proError.message}` : '')

    const profileOr = buildOrFilter(['full_name', 'email'], tokens)
    const { data: patients } = await admin
      .from('profiles')
      .select('id, full_name, user_type, avatar_url')
      .or(profileOr)
      .neq('id', user.id)
      .limit(15)

    return NextResponse.json({
      professionals: professionals || [],
      patients: patients || [],
    })
  } catch (error) {
    console.error('[chat/search-contacts]', error)
    return NextResponse.json({ error: 'Search failed' }, { status: 500 })
  }
}
