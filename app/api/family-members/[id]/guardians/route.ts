import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = "nodejs"
export const dynamic = "force-dynamic"


// GET: Get guardians for a family member
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

    // Verify ownership
    const { data: member } = await supabase
      .from('family_members')
      .select('id, user_id')
      .eq('id', id)
      .single()

    if (!member || member.user_id !== user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const { data: guardians, error } = await supabase
      .from('family_member_guardians')
      .select(`
        *,
        guardian:guardian_user_id(id, email)
      `)
      .eq('family_member_id', id)
      .order('is_primary', { ascending: false })

    if (error) {
      console.error('Error fetching guardians:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ guardians: guardians || [] })
  } catch (e: any) {
    console.error('Get guardians error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// POST: Add a guardian (by email)
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
      guardian_email,
      guardian_type,
      relationship_to_member,
      can_book_appointments,
      can_view_records,
      can_edit_profile,
      is_primary,
    } = body

    if (!guardian_email) {
      return NextResponse.json({ error: 'guardian_email is required' }, { status: 400 })
    }

    // Find user by email
    const { data: guardianProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', guardian_email.toLowerCase().trim())
      .single()

    if (!guardianProfile) {
      return NextResponse.json(
        { error: 'No user found with this email. They must have an account first.' },
        { status: 404 }
      )
    }

    // Check if already a guardian
    const { data: existing } = await supabase
      .from('family_member_guardians')
      .select('id')
      .eq('family_member_id', id)
      .eq('guardian_user_id', guardianProfile.id)
      .single()

    if (existing) {
      return NextResponse.json({ error: 'This user is already a guardian' }, { status: 400 })
    }

    const { data: guardian, error } = await supabase
      .from('family_member_guardians')
      .insert({
        family_member_id: id,
        guardian_user_id: guardianProfile.id,
        guardian_type: guardian_type || 'authorized_adult',
        relationship_to_member,
        can_book_appointments: can_book_appointments !== false,
        can_view_records: can_view_records !== false,
        can_edit_profile: can_edit_profile || false,
        can_receive_notifications: true,
        is_primary: is_primary || false,
        is_verified: false,
      })
      .select()
      .single()

    if (error) {
      console.error('Error adding guardian:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ guardian }, { status: 201 })
  } catch (e: any) {
    console.error('Add guardian error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// DELETE: Remove a guardian
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { searchParams } = new URL(req.url)
    const guardianId = searchParams.get('guardianId')

    if (!guardianId) {
      return NextResponse.json({ error: 'guardianId query param required' }, { status: 400 })
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

    const { error } = await supabase
      .from('family_member_guardians')
      .delete()
      .eq('id', guardianId)
      .eq('family_member_id', id)

    if (error) {
      console.error('Error removing guardian:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (e: any) {
    console.error('Remove guardian error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
