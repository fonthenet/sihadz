import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase'

interface Params {
  params: Promise<{ id: string }>
}

export interface HolidaySettings {
  id?: string
  professional_id: string
  use_ramadan_schedule: boolean
  ramadan_hours: Record<string, { open: string; close: string; isOpen: boolean }>
  ramadan_start_override?: string | null
  ramadan_end_override?: string | null
  auto_close_on_holidays: boolean
  disabled_holidays: string[]
  custom_holiday_dates: Array<{ date: string; name: string; nameAr?: string; nameFr?: string }>
}

const DEFAULT_RAMADAN_HOURS = {
  sunday: { open: '09:00', close: '15:00', isOpen: true },
  monday: { open: '09:00', close: '15:00', isOpen: true },
  tuesday: { open: '09:00', close: '15:00', isOpen: true },
  wednesday: { open: '09:00', close: '15:00', isOpen: true },
  thursday: { open: '09:00', close: '15:00', isOpen: true },
  friday: { open: '09:00', close: '12:00', isOpen: true },
  saturday: { open: '09:00', close: '14:00', isOpen: true }
}

// GET - Fetch holiday settings
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { id: professionalId } = await params
    const admin = createAdminClient()
    
    const { data: settings, error } = await admin
      .from('professional_holiday_settings')
      .select('*')
      .eq('professional_id', professionalId)
      .single()
    
    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching holiday settings:', error)
      return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 })
    }
    
    // Return default settings if none exist
    if (!settings) {
      return NextResponse.json({
        settings: {
          professional_id: professionalId,
          use_ramadan_schedule: true,
          ramadan_hours: DEFAULT_RAMADAN_HOURS,
          ramadan_start_override: null,
          ramadan_end_override: null,
          auto_close_on_holidays: true,
          disabled_holidays: [],
          custom_holiday_dates: []
        }
      })
    }
    
    return NextResponse.json({ settings })
    
  } catch (error: any) {
    console.error('Holiday settings GET error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST/PATCH - Save holiday settings
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { id: professionalId } = await params
    const supabase = await createClient()
    const admin = createAdminClient()
    
    // Verify auth
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
    
    const settingsData = {
      professional_id: professionalId,
      use_ramadan_schedule: body.use_ramadan_schedule ?? true,
      ramadan_hours: body.ramadan_hours || DEFAULT_RAMADAN_HOURS,
      ramadan_start_override: body.ramadan_start_override || null,
      ramadan_end_override: body.ramadan_end_override || null,
      auto_close_on_holidays: body.auto_close_on_holidays ?? true,
      disabled_holidays: body.disabled_holidays || [],
      custom_holiday_dates: body.custom_holiday_dates || [],
      updated_at: new Date().toISOString()
    }
    
    // Upsert settings
    const { data: settings, error } = await admin
      .from('professional_holiday_settings')
      .upsert(settingsData, { onConflict: 'professional_id' })
      .select()
      .single()
    
    if (error) {
      console.error('Error saving holiday settings:', error)
      return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 })
    }
    
    return NextResponse.json({ settings })
    
  } catch (error: any) {
    console.error('Holiday settings POST error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
