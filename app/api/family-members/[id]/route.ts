import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = "nodejs"
export const dynamic = "force-dynamic"


// GET: Get a single family member by ID
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

    const { data: member, error } = await supabase
      .from('family_members')
      .select(`
        *,
        family_doctor:family_doctor_id(id, business_name, specialty),
        pediatrician:pediatrician_id(id, business_name, specialty)
      `)
      .eq('id', id)
      .single()

    if (error) {
      console.error('Error fetching family member:', error)
      return NextResponse.json({ error: error.message }, { status: 404 })
    }

    // Verify access (owner or guardian)
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

    // Get allergies
    const { data: allergies } = await supabase
      .from('family_allergies')
      .select('*')
      .eq('family_member_id', id)
      .eq('is_active', true)
      .order('severity', { ascending: false })

    // Get growth records
    const { data: growthRecords } = await supabase
      .from('family_growth_records')
      .select('*')
      .eq('family_member_id', id)
      .order('measured_at', { ascending: false })
      .limit(12)

    // Get vaccination records
    const { data: vaccinations } = await supabase
      .from('vaccination_records')
      .select(`
        *,
        vaccine:vaccine_id(code, name, name_ar, name_fr, disease_prevention, is_mandatory)
      `)
      .eq('family_member_id', id)
      .order('administered_date', { ascending: false })

    // Get upcoming appointments
    const today = new Date().toISOString().split('T')[0]
    const { data: appointments } = await supabase
      .from('appointments')
      .select(`
        id,
        appointment_date,
        appointment_time,
        status,
        visit_type,
        doctor:doctor_id(id, business_name, specialty)
      `)
      .eq('family_member_id', id)
      .gte('appointment_date', today)
      .in('status', ['confirmed', 'pending'])
      .order('appointment_date', { ascending: true })
      .limit(5)

    // Get guardians
    const { data: guardians } = await supabase
      .from('family_member_guardians')
      .select(`
        *,
        guardian:guardian_user_id(id, email)
      `)
      .eq('family_member_id', id)

    return NextResponse.json({
      member,
      allergies: allergies || [],
      growthRecords: growthRecords || [],
      vaccinations: vaccinations || [],
      upcomingAppointments: appointments || [],
      guardians: guardians || [],
    })
  } catch (e: any) {
    console.error('Get family member error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// PATCH: Update a family member
export async function PATCH(
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

    // Verify ownership (only owner can edit, not guardians)
    const { data: existing } = await supabase
      .from('family_members')
      .select('user_id')
      .eq('id', id)
      .single()

    if (!existing || existing.user_id !== user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const body = await req.json()
    
    // Remove fields that shouldn't be updated directly
    delete body.id
    delete body.user_id
    delete body.created_at
    delete body.is_minor // computed column

    // If measurements changed, update last_measured_at
    if (body.height_cm !== undefined || body.weight_kg !== undefined || body.head_circumference_cm !== undefined) {
      body.last_measured_at = new Date().toISOString().split('T')[0]
    }

    const { data: member, error } = await supabase
      .from('family_members')
      .update(body)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating family member:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ member })
  } catch (e: any) {
    console.error('Update family member error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// DELETE: Remove a family member
export async function DELETE(
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
    const { data: existing } = await supabase
      .from('family_members')
      .select('user_id')
      .eq('id', id)
      .single()

    if (!existing || existing.user_id !== user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Check if there are active appointments
    const today = new Date().toISOString().split('T')[0]
    const { data: activeApts } = await supabase
      .from('appointments')
      .select('id')
      .eq('family_member_id', id)
      .gte('appointment_date', today)
      .in('status', ['confirmed', 'pending'])
      .limit(1)

    if (activeApts && activeApts.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete family member with active appointments' },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from('family_members')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting family member:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (e: any) {
    console.error('Delete family member error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
