import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase'

// Force Node.js runtime and dynamic rendering for Vercel
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface Params {
  params: Promise<{ id: string }>
}

// ============================================================================
// GET /api/professionals/[id]/time-off - List time-off requests
// ============================================================================
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { id: professionalId } = await params
    const admin = createAdminClient()
    
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')
    const includeEmployee = searchParams.get('include_employee') === 'true'
    
    let query = admin
      .from('time_off_requests')
      .select('*')
      .eq('professional_id', professionalId)
      .order('start_date', { ascending: false })
    
    if (status) {
      query = query.eq('status', status)
    }
    
    if (startDate) {
      query = query.gte('start_date', startDate)
    }
    
    if (endDate) {
      query = query.lte('end_date', endDate)
    }
    
    if (!includeEmployee) {
      query = query.eq('is_employee_request', false)
    }
    
    const { data: requests, error } = await query
    
    if (error) {
      console.error('Error fetching time-off requests:', error)
      return NextResponse.json({ error: 'Failed to fetch requests' }, { status: 500 })
    }
    
    return NextResponse.json({ requests: requests || [] })
    
  } catch (error: any) {
    console.error('Time-off GET error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// ============================================================================
// POST /api/professionals/[id]/time-off - Create time-off request
// ============================================================================
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { id: professionalId } = await params
    const supabase = await createClient()
    const admin = createAdminClient()
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Verify ownership
    const { data: professional } = await admin
      .from('professionals')
      .select('id, auth_user_id')
      .eq('id', professionalId)
      .single()
    
    if (!professional || professional.auth_user_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }
    
    const body = await request.json()
    const { 
      request_type, start_date, end_date, all_day = true,
      start_time, end_time, reason, employee_id 
    } = body
    
    // Validate required fields
    if (!request_type || !start_date || !end_date) {
      return NextResponse.json({ 
        error: 'Missing required fields: request_type, start_date, end_date' 
      }, { status: 400 })
    }
    
    // Validate date range
    if (new Date(end_date) < new Date(start_date)) {
      return NextResponse.json({ error: 'End date must be after start date' }, { status: 400 })
    }
    
    // Get requestor name
    const { data: profile } = await admin
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single()
    
    const requestorName = profile?.full_name || 'Unknown'
    
    // Check for overlapping approved requests
    const { data: overlapping } = await admin
      .from('time_off_requests')
      .select('id')
      .eq('professional_id', professionalId)
      .eq('status', 'approved')
      .or(`start_date.lte.${end_date},end_date.gte.${start_date}`)
      .limit(1)
    
    if (overlapping && overlapping.length > 0) {
      return NextResponse.json({ 
        error: 'Overlapping time-off request already exists' 
      }, { status: 400 })
    }
    
    // Create request
    const { data: timeOffRequest, error: createError } = await admin
      .from('time_off_requests')
      .insert({
        professional_id: professionalId,
        request_type,
        start_date,
        end_date,
        all_day,
        start_time: all_day ? null : start_time,
        end_time: all_day ? null : end_time,
        reason,
        status: employee_id ? 'pending' : 'approved', // Owner requests auto-approve
        requested_by: user.id,
        requested_by_name: requestorName,
        is_employee_request: !!employee_id,
        employee_id: employee_id || null,
        reviewed_by: employee_id ? null : user.id,
        reviewed_by_name: employee_id ? null : requestorName,
        reviewed_at: employee_id ? null : new Date().toISOString()
      })
      .select()
      .single()
    
    if (createError) {
      console.error('Error creating time-off request:', createError)
      return NextResponse.json({ error: 'Failed to create request' }, { status: 500 })
    }
    
    // If approved, also add to unavailable_dates for compatibility
    if (!employee_id) {
      const dates: string[] = []
      const current = new Date(start_date)
      const end = new Date(end_date)
      
      while (current <= end) {
        dates.push(current.toISOString().split('T')[0])
        current.setDate(current.getDate() + 1)
      }
      
      // Get current unavailable_dates
      const { data: prof } = await admin
        .from('professionals')
        .select('unavailable_dates')
        .eq('id', professionalId)
        .single()
      
      const existing = (prof?.unavailable_dates as string[]) || []
      const combined = [...new Set([...existing, ...dates])]
      
      await admin
        .from('professionals')
        .update({ unavailable_dates: combined })
        .eq('id', professionalId)
    }
    
    return NextResponse.json({ request: timeOffRequest }, { status: 201 })
    
  } catch (error: any) {
    console.error('Time-off POST error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// ============================================================================
// PATCH /api/professionals/[id]/time-off - Update request (approve/reject/cancel)
// ============================================================================
export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const { id: professionalId } = await params
    const supabase = await createClient()
    const admin = createAdminClient()
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Verify ownership
    const { data: professional } = await admin
      .from('professionals')
      .select('id, auth_user_id')
      .eq('id', professionalId)
      .single()
    
    if (!professional || professional.auth_user_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }
    
    const body = await request.json()
    const { request_id, action, review_notes } = body
    
    if (!request_id || !action) {
      return NextResponse.json({ error: 'request_id and action required' }, { status: 400 })
    }
    
    // Get requestor name
    const { data: profile } = await admin
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single()
    
    const reviewerName = profile?.full_name || 'Unknown'
    
    let updateData: any = {
      updated_at: new Date().toISOString()
    }
    
    switch (action) {
      case 'approve':
        updateData.status = 'approved'
        updateData.reviewed_by = user.id
        updateData.reviewed_by_name = reviewerName
        updateData.reviewed_at = new Date().toISOString()
        updateData.review_notes = review_notes
        break
        
      case 'reject':
        updateData.status = 'rejected'
        updateData.reviewed_by = user.id
        updateData.reviewed_by_name = reviewerName
        updateData.reviewed_at = new Date().toISOString()
        updateData.review_notes = review_notes
        break
        
      case 'cancel':
        updateData.status = 'cancelled'
        break
        
      default:
        return NextResponse.json({ error: 'Invalid action. Use: approve, reject, cancel' }, { status: 400 })
    }
    
    const { data: updatedRequest, error: updateError } = await admin
      .from('time_off_requests')
      .update(updateData)
      .eq('id', request_id)
      .eq('professional_id', professionalId)
      .select()
      .single()
    
    if (updateError) {
      console.error('Error updating time-off request:', updateError)
      return NextResponse.json({ error: 'Failed to update request' }, { status: 500 })
    }
    
    // If approved, update unavailable_dates
    if (action === 'approve') {
      const dates: string[] = []
      const current = new Date(updatedRequest.start_date)
      const end = new Date(updatedRequest.end_date)
      
      while (current <= end) {
        dates.push(current.toISOString().split('T')[0])
        current.setDate(current.getDate() + 1)
      }
      
      const { data: prof } = await admin
        .from('professionals')
        .select('unavailable_dates')
        .eq('id', professionalId)
        .single()
      
      const existing = (prof?.unavailable_dates as string[]) || []
      const combined = [...new Set([...existing, ...dates])]
      
      await admin
        .from('professionals')
        .update({ unavailable_dates: combined })
        .eq('id', professionalId)
    }
    
    // If cancelled/rejected, remove from unavailable_dates
    if (action === 'cancel' || action === 'reject') {
      const dates: string[] = []
      const current = new Date(updatedRequest.start_date)
      const end = new Date(updatedRequest.end_date)
      
      while (current <= end) {
        dates.push(current.toISOString().split('T')[0])
        current.setDate(current.getDate() + 1)
      }
      
      const { data: prof } = await admin
        .from('professionals')
        .select('unavailable_dates')
        .eq('id', professionalId)
        .single()
      
      const existing = (prof?.unavailable_dates as string[]) || []
      const filtered = existing.filter(d => !dates.includes(d))
      
      await admin
        .from('professionals')
        .update({ unavailable_dates: filtered })
        .eq('id', professionalId)
    }
    
    return NextResponse.json({ request: updatedRequest })
    
  } catch (error: any) {
    console.error('Time-off PATCH error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// ============================================================================
// DELETE /api/professionals/[id]/time-off - Delete request
// ============================================================================
export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const { id: professionalId } = await params
    const supabase = await createClient()
    const admin = createAdminClient()
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Verify ownership
    const { data: professional } = await admin
      .from('professionals')
      .select('id, auth_user_id')
      .eq('id', professionalId)
      .single()
    
    if (!professional || professional.auth_user_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }
    
    const { searchParams } = new URL(request.url)
    const requestId = searchParams.get('request_id')
    
    if (!requestId) {
      return NextResponse.json({ error: 'request_id required' }, { status: 400 })
    }
    
    // Get request first to clean up unavailable_dates
    const { data: timeOffRequest } = await admin
      .from('time_off_requests')
      .select('start_date, end_date, status')
      .eq('id', requestId)
      .eq('professional_id', professionalId)
      .single()
    
    if (timeOffRequest && timeOffRequest.status === 'approved') {
      // Remove from unavailable_dates
      const dates: string[] = []
      const current = new Date(timeOffRequest.start_date)
      const end = new Date(timeOffRequest.end_date)
      
      while (current <= end) {
        dates.push(current.toISOString().split('T')[0])
        current.setDate(current.getDate() + 1)
      }
      
      const { data: prof } = await admin
        .from('professionals')
        .select('unavailable_dates')
        .eq('id', professionalId)
        .single()
      
      const existing = (prof?.unavailable_dates as string[]) || []
      const filtered = existing.filter(d => !dates.includes(d))
      
      await admin
        .from('professionals')
        .update({ unavailable_dates: filtered })
        .eq('id', professionalId)
    }
    
    // Delete request
    const { error: deleteError } = await admin
      .from('time_off_requests')
      .delete()
      .eq('id', requestId)
      .eq('professional_id', professionalId)
    
    if (deleteError) {
      console.error('Error deleting time-off request:', deleteError)
      return NextResponse.json({ error: 'Failed to delete request' }, { status: 500 })
    }
    
    return NextResponse.json({ success: true })
    
  } catch (error: any) {
    console.error('Time-off DELETE error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
