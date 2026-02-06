import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, createAdminClient } from '@/lib/supabase/server'

export const runtime = "nodejs"
export const dynamic = "force-dynamic"


/**
 * GET /api/professionals/[id]/schedules?employeeId=xxx
 * Get schedules for an employee
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: professionalId } = await params
    const supabase = await createServerClient()

    // Verify user owns this professional
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: professional } = await supabase
      .from('professionals')
      .select('id, auth_user_id')
      .eq('id', professionalId)
      .single()

    if (!professional || professional.auth_user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const employeeId = searchParams.get('employeeId')

    if (!employeeId) {
      return NextResponse.json({ error: 'Employee ID is required' }, { status: 400 })
    }

    // Verify employee belongs to this professional
    const { data: employee } = await supabase
      .from('professional_employees')
      .select('id')
      .eq('id', employeeId)
      .eq('professional_id', professionalId)
      .single()

    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
    }

    // Get schedules
    const { data: schedules, error } = await supabase
      .from('employee_schedules')
      .select('*')
      .eq('employee_id', employeeId)
      .order('day_of_week')

    if (error) {
      console.error('Error fetching schedules:', error)
      return NextResponse.json({ error: 'Failed to fetch schedules' }, { status: 500 })
    }

    return NextResponse.json({ schedules: schedules || [] })
  } catch (error) {
    console.error('Schedules GET error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

/**
 * POST /api/professionals/[id]/schedules
 * Create or update schedules for an employee (batch)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: professionalId } = await params
    const supabase = await createServerClient()
    const adminClient = createAdminClient()

    // Verify user owns this professional
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: professional } = await supabase
      .from('professionals')
      .select('id, auth_user_id')
      .eq('id', professionalId)
      .single()

    if (!professional || professional.auth_user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { employeeId, schedules } = body

    if (!employeeId || !Array.isArray(schedules)) {
      return NextResponse.json(
        { error: 'Employee ID and schedules array are required' },
        { status: 400 }
      )
    }

    // Verify employee belongs to this professional
    const { data: employee } = await supabase
      .from('professional_employees')
      .select('id')
      .eq('id', employeeId)
      .eq('professional_id', professionalId)
      .single()

    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
    }

    // Delete existing schedules
    await adminClient
      .from('employee_schedules')
      .delete()
      .eq('employee_id', employeeId)

    // Insert new schedules
    if (schedules.length > 0) {
      const schedulesToInsert = schedules.map((s: any) => ({
        employee_id: employeeId,
        day_of_week: s.dayOfWeek,
        start_time: s.startTime || null,
        end_time: s.endTime || null,
        is_day_off: s.isDayOff || false,
        break_start: s.breakStart || null,
        break_end: s.breakEnd || null,
        notes: s.notes || null,
      }))

      const { error } = await adminClient
        .from('employee_schedules')
        .insert(schedulesToInsert)

      if (error) {
        console.error('Error inserting schedules:', error)
        return NextResponse.json({ error: 'Failed to save schedules' }, { status: 500 })
      }
    }

    // Fetch updated schedules
    const { data: updatedSchedules } = await adminClient
      .from('employee_schedules')
      .select('*')
      .eq('employee_id', employeeId)
      .order('day_of_week')

    return NextResponse.json({ schedules: updatedSchedules || [] })
  } catch (error) {
    console.error('Schedules POST error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
