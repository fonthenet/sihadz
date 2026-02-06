import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createServerClient } from '@/lib/supabase/server'

// ============================================================================
// GET /api/favorites - Get user's favorites
// ============================================================================
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const admin = createAdminClient()
    
    let { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      const { data: { session } } = await supabase.auth.getSession()
      user = session?.user ?? null
    }
    if (!user) {
      return NextResponse.json({ favorites: [], ids: [] })
    }
    
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') // 'doctor', 'clinic', 'laboratory', 'pharmacy'
    const idsOnly = searchParams.get('ids_only') === 'true'
    
    // Get favorites with optional type filter
    let query = admin
      .from('provider_favorites')
      .select(idsOnly ? 'professional_id' : `
        id,
        professional_id,
        created_at,
        professionals (
          id,
          auth_user_id,
          type,
          business_name,
          specialty,
          avatar_url,
          address_line1,
          wilaya,
          rating,
          consultation_fee
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    
    if (type) {
      // Need to filter by professional type - use a subquery
      const { data: profIds } = await admin
        .from('professionals')
        .select('id')
        .eq('type', type)
      
      if (profIds && profIds.length > 0) {
        query = query.in('professional_id', profIds.map(p => p.id))
      }
    }
    
    const { data: favorites, error } = await query
    
    if (error) {
      const errMsg = typeof error === 'object' && error !== null && 'message' in error
        ? (error as { message: string }).message
        : String(error)
      console.error('Favorites fetch error:', errMsg, error)
      return NextResponse.json({ error: errMsg }, { status: 500 })
    }
    
    if (idsOnly) {
      return NextResponse.json({
        ids: favorites?.map(f => f.professional_id) || []
      })
    }
    
    return NextResponse.json({
      favorites: favorites || [],
      count: favorites?.length || 0
    })
    
  } catch (error: any) {
    console.error('Favorites error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// ============================================================================
// POST /api/favorites - Add a favorite
// ============================================================================
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const admin = createAdminClient()
    
    let { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      const { data: { session } } = await supabase.auth.getSession()
      user = session?.user ?? null
    }
    if (!user) {
      return NextResponse.json({ error: 'Please sign in to save favorites' }, { status: 401 })
    }
    
    const body = await request.json()
    const { professional_id } = body
    
    if (!professional_id) {
      return NextResponse.json({ error: 'professional_id required' }, { status: 400 })
    }
    
    // Check if already favorited
    const { data: existing } = await admin
      .from('provider_favorites')
      .select('id')
      .eq('user_id', user.id)
      .eq('professional_id', professional_id)
      .single()
    
    if (existing) {
      return NextResponse.json({ 
        success: true, 
        message: 'Already favorited',
        favorite_id: existing.id 
      })
    }
    
    // Add favorite
    const { data: favorite, error } = await admin
      .from('provider_favorites')
      .insert({
        user_id: user.id,
        professional_id
      })
      .select()
      .single()
    
    if (error) {
      console.error('Add favorite error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    return NextResponse.json({
      success: true,
      favorite
    })
    
  } catch (error: any) {
    console.error('Add favorite error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// ============================================================================
// DELETE /api/favorites - Remove a favorite
// ============================================================================
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const admin = createAdminClient()
    
    let { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      const { data: { session } } = await supabase.auth.getSession()
      user = session?.user ?? null
    }
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { searchParams } = new URL(request.url)
    const professionalId = searchParams.get('professional_id')
    
    if (!professionalId) {
      return NextResponse.json({ error: 'professional_id required' }, { status: 400 })
    }
    
    const { error } = await admin
      .from('provider_favorites')
      .delete()
      .eq('user_id', user.id)
      .eq('professional_id', professionalId)
    
    if (error) {
      console.error('Remove favorite error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    return NextResponse.json({
      success: true,
      message: 'Favorite removed'
    })
    
  } catch (error: any) {
    console.error('Remove favorite error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
