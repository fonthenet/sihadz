import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = "nodejs"
export const dynamic = "force-dynamic"


interface Params {
  params: Promise<{ id: string }>
}

interface TimeSlot {
  time: string
  endTime: string
  available: boolean
}

// ============================================================================
// GET /api/professionals/[id]/slots - Get available slots for a date
// ============================================================================
export async function GET(request: NextRequest, { params }: Params) {
  try {
    // Fail fast if env vars missing (common in production when Vercel env not set)
    const hasUrl = !!process.env.NEXT_PUBLIC_SUPABASE_URL
    const hasServiceKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!hasUrl || !hasServiceKey) {
      console.error('[slots] Missing Supabase env in production:', { hasUrl, hasServiceKey })
      return NextResponse.json(
        {
          error: 'Server configuration error',
          code: 'MISSING_SUPABASE_CONFIG',
          message: 'Slots API requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY. Check Vercel Environment Variables for Production.',
        },
        { status: 503 }
      )
    }

    const { id: professionalId } = await params
    const admin = createAdminClient()
    
    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date')
    const duration = parseInt(searchParams.get('duration') || '30')
    const showAll = searchParams.get('show_all') === 'true' // Include unavailable slots
    
    if (!date) {
      return NextResponse.json({ error: 'Date parameter required (YYYY-MM-DD)' }, { status: 400 })
    }
    
    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/
    if (!dateRegex.test(date)) {
      return NextResponse.json({ error: 'Invalid date format. Use YYYY-MM-DD' }, { status: 400 })
    }
    
    // Get professional's working hours
    const { data: professional, error: profError } = await admin
      .from('professionals')
      .select('id, working_hours, unavailable_dates, is_active')
      .eq('id', professionalId)
      .single()
    
    if (profError || !professional) {
      // Supabase auth errors (401/403) often mean wrong/missing service role key
      const isAuthError = profError?.code === 'PGRST301' || profError?.message?.includes('JWT') || profError?.message?.includes('invalid')
      if (isAuthError) {
        console.error('[slots] Supabase auth error - check SUPABASE_SERVICE_ROLE_KEY:', profError)
        return NextResponse.json(
          { error: 'Server configuration error', code: 'SUPABASE_AUTH_ERROR', message: 'Invalid Supabase credentials. Verify SUPABASE_SERVICE_ROLE_KEY in Vercel.' },
          { status: 503 }
        )
      }
      return NextResponse.json({ error: 'Professional not found' }, { status: 404 })
    }
    
    // Check if professional is active
    if (!professional.is_active) {
      return NextResponse.json({ 
        slots: [], 
        message: 'Provider is not currently accepting appointments' 
      })
    }
    
    // Get day of week - use noon to avoid timezone shifting the calendar day
    const dateObj = new Date(date + 'T12:00:00')
    const dayOfWeek = dateObj.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase()
    const workingHours = (professional.working_hours as Record<string, any> | null) || {}
    
    // Default schedule when none configured: Mon-Sat 08:00-18:00, Sun 09:00-13:00
    const DEFAULT_OPEN = '08:00'
    const DEFAULT_CLOSE = '18:00'
    const DEFAULT_OPEN_SUN = '09:00'
    const DEFAULT_CLOSE_SUN = '13:00'
    
    // Check day schedule - support "monday", "Monday", and "weekdays" fallback
    let daySchedule = workingHours[dayOfWeek]
    if (!daySchedule) {
      const dayCapitalized = dayOfWeek.charAt(0).toUpperCase() + dayOfWeek.slice(1)
      daySchedule = workingHours[dayCapitalized]
    }
    if (!daySchedule && workingHours.weekdays) {
      daySchedule = workingHours.weekdays
    }
    if (!daySchedule && workingHours.Weekdays) {
      daySchedule = workingHours.Weekdays
    }
    
    // When no schedule at all, use default (open Mon-Sat 08-18, Sun 09-13)
    let openTime: string
    let closeTime: string
    let isOpen: boolean
    
    if (!daySchedule || (typeof daySchedule !== 'object')) {
      // No schedule configured for this day - use default
      if (dayOfWeek === 'sunday') {
        openTime = DEFAULT_OPEN_SUN
        closeTime = DEFAULT_CLOSE_SUN
        isOpen = true
      } else if (dayOfWeek === 'friday') {
        // Friday often short or closed in Algeria
        openTime = '09:00'
        closeTime = '13:00'
        isOpen = true
      } else {
        openTime = DEFAULT_OPEN
        closeTime = DEFAULT_CLOSE
        isOpen = true
      }
    } else {
      // Explicit closed
      if (daySchedule.isOpen === false || (daySchedule.open === '00:00' && daySchedule.close === '00:00')) {
        return NextResponse.json({ 
          slots: [], 
          message: `Closed on ${dayOfWeek}` 
        })
      }
      // Open - use stored or default
      openTime = (daySchedule.open as string) || DEFAULT_OPEN
      closeTime = (daySchedule.close as string) || DEFAULT_CLOSE
      isOpen = daySchedule.isOpen !== false
      if (!isOpen) {
        return NextResponse.json({ 
          slots: [], 
          message: `Closed on ${dayOfWeek}` 
        })
      }
    }
    
    // Check if date is in unavailable_dates
    const unavailableDates = professional.unavailable_dates as string[] | null
    if (unavailableDates?.includes(date)) {
      return NextResponse.json({ 
        slots: [], 
        message: 'This date is blocked' 
      })
    }
    
    // Check for approved all-day time-off
    const { data: timeOff } = await admin
      .from('time_off_requests')
      .select('id')
      .eq('professional_id', professionalId)
      .eq('status', 'approved')
      .lte('start_date', date)
      .gte('end_date', date)
      .eq('all_day', true)
      .limit(1)
    
    if (timeOff && timeOff.length > 0) {
      return NextResponse.json({ 
        slots: [], 
        message: 'Provider is on leave this day' 
      })
    }
    
    // Generate slots (openTime, closeTime set above from daySchedule or defaults)
    const [openHour, openMin] = openTime.split(':').map(Number)
    const [closeHour, closeMin] = closeTime.split(':').map(Number)
    
    const openMinutes = openHour * 60 + openMin
    const closeMinutes = closeHour * 60 + closeMin
    
    const slots: TimeSlot[] = []
    
    // Get existing appointments for this date (check both doctor_id and professional_id)
    const { data: appointments } = await admin
      .from('appointments')
      .select('appointment_time, duration')
      .eq('appointment_date', date)
      .not('status', 'in', '("cancelled","rejected")')
      .or(`doctor_id.eq.${professionalId},professional_id.eq.${professionalId}`)
    
    // Get blocked slots for this date
    const { data: blockedSlots } = await admin
      .from('blocked_slots')
      .select('start_time, end_time')
      .eq('professional_id', professionalId)
      .eq('slot_date', date)
    
    // Get partial time-off for this date
    const { data: partialTimeOff } = await admin
      .from('time_off_requests')
      .select('start_time, end_time')
      .eq('professional_id', professionalId)
      .eq('status', 'approved')
      .lte('start_date', date)
      .gte('end_date', date)
      .eq('all_day', false)
    
    // Generate time slots
    for (let minutes = openMinutes; minutes + duration <= closeMinutes; minutes += duration) {
      const slotHour = Math.floor(minutes / 60)
      const slotMin = minutes % 60
      const slotTime = `${String(slotHour).padStart(2, '0')}:${String(slotMin).padStart(2, '0')}`
      
      const endMinutes = minutes + duration
      const endHour = Math.floor(endMinutes / 60)
      const endMin = endMinutes % 60
      const slotEndTime = `${String(endHour).padStart(2, '0')}:${String(endMin).padStart(2, '0')}`
      
      // Check if slot overlaps with any appointment
      const isBooked = appointments?.some(apt => {
        const aptTime = apt.appointment_time as string
        const aptDuration = (apt.duration as number) || 30
        const [aptHour, aptMin] = aptTime.split(':').map(Number)
        const aptStart = aptHour * 60 + aptMin
        const aptEnd = aptStart + aptDuration
        
        // Check overlap
        return !(endMinutes <= aptStart || minutes >= aptEnd)
      })
      
      // Check if slot overlaps with blocked slots
      const isBlocked = blockedSlots?.some(block => {
        const [blockStartHour, blockStartMin] = (block.start_time as string).split(':').map(Number)
        const [blockEndHour, blockEndMin] = (block.end_time as string).split(':').map(Number)
        const blockStart = blockStartHour * 60 + blockStartMin
        const blockEnd = blockEndHour * 60 + blockEndMin
        
        return !(endMinutes <= blockStart || minutes >= blockEnd)
      })
      
      // Check if slot overlaps with partial time-off
      const isOnLeave = partialTimeOff?.some(off => {
        if (!off.start_time || !off.end_time) return false
        const [offStartHour, offStartMin] = (off.start_time as string).split(':').map(Number)
        const [offEndHour, offEndMin] = (off.end_time as string).split(':').map(Number)
        const offStart = offStartHour * 60 + offStartMin
        const offEnd = offEndHour * 60 + offEndMin
        
        return !(endMinutes <= offStart || minutes >= offEnd)
      })
      
      const isAvailable = !isBooked && !isBlocked && !isOnLeave
      
      if (showAll || isAvailable) {
        slots.push({
          time: slotTime,
          endTime: slotEndTime,
          available: isAvailable
        })
      }
    }
    
    return NextResponse.json({
      date,
      dayOfWeek,
      openTime,
      closeTime,
      slotDuration: duration,
      slots,
      totalSlots: slots.length,
      availableSlots: slots.filter(s => s.available).length
    })
    
  } catch (error: any) {
    console.error('Error fetching slots:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
