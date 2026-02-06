import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = "nodejs"
export const dynamic = "force-dynamic"


// GET: Get vaccination records and schedule for a family member
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

    // Get vaccination records
    const { data: records, error: recordsError } = await supabase
      .from('vaccination_records')
      .select(`
        *,
        vaccine:vaccine_id(
          id, code, name, name_ar, name_fr, 
          disease_prevention, disease_prevention_ar,
          recommended_age, dose_count, is_mandatory, is_free
        )
      `)
      .eq('family_member_id', id)
      .order('administered_date', { ascending: false })

    if (recordsError) {
      console.error('Error fetching vaccination records:', recordsError)
      return NextResponse.json({ error: recordsError.message }, { status: 500 })
    }

    // Get all Algeria vaccines for the schedule
    const { data: allVaccines } = await supabase
      .from('vaccines')
      .select('*')
      .like('code', 'DZ-%')
      .order('recommended_age')

    // Calculate age in days for schedule comparison
    const dob = new Date(member.date_of_birth)
    const today = new Date()
    const ageInDays = Math.floor((today.getTime() - dob.getTime()) / (1000 * 60 * 60 * 24))
    const ageInMonths = Math.floor(ageInDays / 30)
    const ageInYears = Math.floor(ageInDays / 365)

    // Map received vaccines
    const receivedVaccineIds = new Set((records || []).map(r => r.vaccine_id))

    // Build schedule with status
    const schedule = (allVaccines || []).map(vaccine => {
      const received = receivedVaccineIds.has(vaccine.id)
      const record = (records || []).find(r => r.vaccine_id === vaccine.id)
      
      // Determine recommended age in days for comparison
      let recommendedAgeDays = 0
      const age = vaccine.recommended_age?.toLowerCase() || ''
      
      if (age.includes('birth')) recommendedAgeDays = 0
      else if (age.includes('2 months')) recommendedAgeDays = 60
      else if (age.includes('3 months')) recommendedAgeDays = 90
      else if (age.includes('4 months')) recommendedAgeDays = 120
      else if (age.includes('9 months') || age.includes('11 months')) recommendedAgeDays = 330
      else if (age.includes('12 months')) recommendedAgeDays = 365
      else if (age.includes('18 months')) recommendedAgeDays = 548
      else if (age.includes('6 years')) recommendedAgeDays = 2190
      else if (age.includes('11 years')) recommendedAgeDays = 4015
      else if (age.includes('16')) recommendedAgeDays = 5840
      else recommendedAgeDays = 99999

      // Determine status
      let status: 'completed' | 'due' | 'overdue' | 'upcoming' | 'not_applicable' = 'upcoming'
      
      if (received) {
        status = 'completed'
      } else if (recommendedAgeDays <= ageInDays) {
        // Check if overdue (more than 30 days past recommended)
        if (ageInDays - recommendedAgeDays > 30) {
          status = 'overdue'
        } else {
          status = 'due'
        }
      } else {
        status = 'upcoming'
      }

      return {
        vaccine,
        received,
        record: record || null,
        status,
        recommendedAgeDays,
      }
    })

    // Sort by recommended age, then by status (overdue first)
    schedule.sort((a, b) => {
      const statusOrder = { overdue: 0, due: 1, upcoming: 2, completed: 3, not_applicable: 4 }
      if (a.status !== b.status) {
        return statusOrder[a.status] - statusOrder[b.status]
      }
      return a.recommendedAgeDays - b.recommendedAgeDays
    })

    // Calculate summary stats
    const mandatoryVaccines = schedule.filter(s => s.vaccine.is_mandatory)
    const mandatoryCompleted = mandatoryVaccines.filter(s => s.status === 'completed').length
    const overdueCount = schedule.filter(s => s.status === 'overdue').length
    const dueCount = schedule.filter(s => s.status === 'due').length

    return NextResponse.json({
      records: records || [],
      schedule,
      summary: {
        totalVaccines: schedule.length,
        completed: schedule.filter(s => s.status === 'completed').length,
        mandatoryTotal: mandatoryVaccines.length,
        mandatoryCompleted,
        overdueCount,
        dueCount,
        completionPercent: mandatoryVaccines.length > 0 
          ? Math.round((mandatoryCompleted / mandatoryVaccines.length) * 100) 
          : 100,
        ageInMonths,
        ageInYears,
      },
    })
  } catch (e: any) {
    console.error('Vaccinations error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// POST: Record a vaccination
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
      vaccine_id,
      administered_date,
      dose_number,
      lot_number,
      administered_by,
      administered_at_facility,
      next_dose_date,
      side_effects,
      notes,
    } = body

    if (!vaccine_id || !administered_date) {
      return NextResponse.json(
        { error: 'vaccine_id and administered_date are required' },
        { status: 400 }
      )
    }

    // Check if this vaccine was already recorded
    const { data: existing } = await supabase
      .from('vaccination_records')
      .select('id')
      .eq('family_member_id', id)
      .eq('vaccine_id', vaccine_id)
      .single()

    if (existing) {
      return NextResponse.json(
        { error: 'This vaccine has already been recorded' },
        { status: 400 }
      )
    }

    const { data: record, error } = await supabase
      .from('vaccination_records')
      .insert({
        family_member_id: id,
        vaccine_id,
        administered_date,
        dose_number: dose_number || 1,
        lot_number,
        administered_by,
        administered_at_facility,
        next_dose_date,
        side_effects,
        is_verified: false,
      })
      .select(`
        *,
        vaccine:vaccine_id(code, name, name_ar, name_fr)
      `)
      .single()

    if (error) {
      console.error('Error recording vaccination:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ record }, { status: 201 })
  } catch (e: any) {
    console.error('Record vaccination error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
