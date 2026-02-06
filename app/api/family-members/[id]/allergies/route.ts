import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = "nodejs"
export const dynamic = "force-dynamic"


// GET: Get allergies for a family member
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify access
    const { data: member } = await supabase
      .from('family_members')
      .select('id, user_id')
      .eq('id', id)
      .single()

    if (!member) {
      return NextResponse.json({ error: 'Family member not found' }, { status: 404 })
    }

    if (member.user_id !== user.id) {
      const { data: guardian } = await supabase
        .from('family_member_guardians')
        .select('id')
        .eq('family_member_id', id)
        .eq('guardian_user_id', user.id)
        .single()
      
      if (!guardian) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 })
      }
    }

    const { data: allergies, error } = await supabase
      .from('family_allergies')
      .select('*')
      .eq('family_member_id', id)
      .order('severity', { ascending: false })
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching allergies:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ allergies: allergies || [] })
  } catch (e: any) {
    console.error('Get allergies error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// POST: Add an allergy
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify ownership
    const { data: member } = await supabase
      .from('family_members')
      .select('id, user_id')
      .eq('id', id)
      .single()

    if (!member || member.user_id !== user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const body = await req.json()
    const {
      allergen_name,
      allergen_name_ar,
      allergen_type,
      severity,
      reaction_description,
      reaction_description_ar,
      diagnosed_date,
      notes,
    } = body

    if (!allergen_name || !severity) {
      return NextResponse.json(
        { error: 'allergen_name and severity are required' },
        { status: 400 }
      )
    }

    const { data: allergy, error } = await supabase
      .from('family_allergies')
      .insert({
        family_member_id: id,
        allergen_name,
        allergen_name_ar,
        allergen_type: allergen_type || 'other',
        severity,
        reaction_description,
        reaction_description_ar,
        diagnosed_date,
        notes,
        is_active: true,
        is_verified: false,
      })
      .select()
      .single()

    if (error) {
      console.error('Error adding allergy:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Also update the allergies JSONB array on family_members for quick access
    const { data: currentMember } = await supabase
      .from('family_members')
      .select('allergies')
      .eq('id', id)
      .single()

    const currentAllergies = (currentMember?.allergies as any[]) || []
    const updatedAllergies = [
      ...currentAllergies,
      { name: allergen_name, severity, type: allergen_type },
    ]

    await supabase
      .from('family_members')
      .update({ allergies: updatedAllergies })
      .eq('id', id)

    return NextResponse.json({ allergy }, { status: 201 })
  } catch (e: any) {
    console.error('Add allergy error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// DELETE: Remove an allergy (mark as inactive)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { searchParams } = new URL(req.url)
    const allergyId = searchParams.get('allergyId')

    if (!allergyId) {
      return NextResponse.json({ error: 'allergyId query param required' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify ownership
    const { data: member } = await supabase
      .from('family_members')
      .select('id, user_id')
      .eq('id', id)
      .single()

    if (!member || member.user_id !== user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Mark allergy as inactive instead of deleting
    const { error } = await supabase
      .from('family_allergies')
      .update({ is_active: false })
      .eq('id', allergyId)
      .eq('family_member_id', id)

    if (error) {
      console.error('Error removing allergy:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (e: any) {
    console.error('Remove allergy error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
