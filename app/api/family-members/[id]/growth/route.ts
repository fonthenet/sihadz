import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = "nodejs"
export const dynamic = "force-dynamic"


// GET: Get growth records for a family member
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
      .select('id, user_id, date_of_birth')
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

    const { data: records, error } = await supabase
      .from('family_growth_records')
      .select('*')
      .eq('family_member_id', id)
      .order('measured_at', { ascending: false })

    if (error) {
      console.error('Error fetching growth records:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Calculate age at each measurement
    const dob = new Date(member.date_of_birth)
    const recordsWithAge = (records || []).map(r => {
      const measureDate = new Date(r.measured_at)
      const ageInDays = Math.floor((measureDate.getTime() - dob.getTime()) / (1000 * 60 * 60 * 24))
      const ageInMonths = Math.floor(ageInDays / 30)
      return {
        ...r,
        age_in_months: ageInMonths,
        age_in_days: ageInDays,
      }
    })

    return NextResponse.json({ records: recordsWithAge })
  } catch (e: any) {
    console.error('Get growth records error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// POST: Add a growth record
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
      .select('id, user_id, date_of_birth')
      .eq('id', id)
      .single()

    if (!member || member.user_id !== user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const body = await req.json()
    const {
      measured_at,
      height_cm,
      weight_kg,
      head_circumference_cm,
      notes,
    } = body

    if (!measured_at) {
      return NextResponse.json(
        { error: 'measured_at is required' },
        { status: 400 }
      )
    }

    if (!height_cm && !weight_kg && !head_circumference_cm) {
      return NextResponse.json(
        { error: 'At least one measurement (height, weight, or head circumference) is required' },
        { status: 400 }
      )
    }

    // Calculate BMI if both height and weight provided
    let bmi: number | null = null
    if (height_cm && weight_kg) {
      const heightM = height_cm / 100
      bmi = Math.round((weight_kg / (heightM * heightM)) * 10) / 10
    }

    const { data: record, error } = await supabase
      .from('family_growth_records')
      .insert({
        family_member_id: id,
        measured_at,
        height_cm,
        weight_kg,
        head_circumference_cm,
        bmi,
        notes,
      })
      .select()
      .single()

    if (error) {
      console.error('Error adding growth record:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Update the current measurements on family_members
    const updateData: any = { last_measured_at: measured_at }
    if (height_cm) updateData.height_cm = height_cm
    if (weight_kg) updateData.weight_kg = weight_kg
    if (head_circumference_cm) updateData.head_circumference_cm = head_circumference_cm

    await supabase
      .from('family_members')
      .update(updateData)
      .eq('id', id)

    return NextResponse.json({ record }, { status: 201 })
  } catch (e: any) {
    console.error('Add growth record error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
