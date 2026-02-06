'use server'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET: List all family members for the authenticated user
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get family members owned by user OR where user is guardian
    // Using simple select to avoid schema cache issues with FK joins
    const { data: members, error } = await supabase
      .from('family_members')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching family members:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Also fetch members where user is a guardian
    const { data: guardedMembers } = await supabase
      .from('family_member_guardians')
      .select('family_member_id')
      .eq('guardian_user_id', user.id)

    let allMembers = members || []
    if (guardedMembers && guardedMembers.length > 0) {
      const guardedIds = guardedMembers.map(g => g.family_member_id)
      const { data: guardedData } = await supabase
        .from('family_members')
        .select('*')
        .in('id', guardedIds)
      if (guardedData) {
        // Add guarded members that aren't already in the list
        const existingIds = new Set(allMembers.map(m => m.id))
        guardedData.forEach(m => {
          if (!existingIds.has(m.id)) {
            allMembers.push({ ...m, is_guarded: true })
          }
        })
      }
    }

    // Fetch doctor names separately if any members have doctors assigned
    const doctorIds = [...new Set([
      ...allMembers.map(m => m.family_doctor_id).filter(Boolean),
      ...allMembers.map(m => m.pediatrician_id).filter(Boolean),
    ])]
    
    let doctorsMap = new Map<string, any>()
    if (doctorIds.length > 0) {
      const { data: doctors } = await supabase
        .from('professionals')
        .select('id, business_name, specialty')
        .in('id', doctorIds)
      doctors?.forEach(d => doctorsMap.set(d.id, d))
    }

    // Enrich members with doctor info
    allMembers = allMembers.map(m => ({
      ...m,
      family_doctor: m.family_doctor_id ? doctorsMap.get(m.family_doctor_id) || null : null,
      pediatrician: m.pediatrician_id ? doctorsMap.get(m.pediatrician_id) || null : null,
    }))

    // Get upcoming appointments count for each member
    const memberIds = allMembers.map(m => m.id)
    let appointmentCounts: Record<string, number> = {}
    
    if (memberIds.length > 0) {
      const today = new Date().toISOString().split('T')[0]
      const { data: appointments } = await supabase
        .from('appointments')
        .select('family_member_id')
        .in('family_member_id', memberIds)
        .gte('appointment_date', today)
        .in('status', ['confirmed', 'pending'])

      appointments?.forEach(apt => {
        if (apt.family_member_id) {
          appointmentCounts[apt.family_member_id] = (appointmentCounts[apt.family_member_id] || 0) + 1
        }
      })
    }

    // Enrich members with appointment counts
    const enrichedMembers = allMembers.map(m => ({
      ...m,
      upcoming_appointments: appointmentCounts[m.id] || 0,
    }))

    return NextResponse.json({ members: enrichedMembers })
  } catch (e: any) {
    console.error('Family members error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// POST: Create a new family member
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    
    const {
      full_name,
      full_name_ar,
      date_of_birth,
      gender,
      blood_type,
      relationship,
      relationship_details,
      chifa_number,
      national_id,
      allergies,
      chronic_conditions,
      current_medications,
      birth_weight_kg,
      gestational_weeks,
      delivery_type,
      apgar_score_1min,
      apgar_score_5min,
      birth_complications,
      feeding_type,
      dietary_notes,
      school_name,
      school_grade,
      special_needs,
      developmental_notes,
      height_cm,
      weight_kg,
      head_circumference_cm,
      mobility_status,
      cognitive_notes,
      emergency_contact_name,
      emergency_contact_phone,
      emergency_contact_relationship,
      family_doctor_id,
      pediatrician_id,
      notes_for_doctor,
      medical_history_notes,
      family_medical_history,
      requires_guardian,
    } = body

    // Validate required fields
    if (!full_name || !date_of_birth || !relationship) {
      return NextResponse.json(
        { error: 'full_name, date_of_birth, and relationship are required' },
        { status: 400 }
      )
    }

    const { data: member, error } = await supabase
      .from('family_members')
      .insert({
        user_id: user.id,
        full_name,
        full_name_ar,
        date_of_birth,
        gender,
        blood_type,
        relationship,
        relationship_details,
        chifa_number,
        national_id,
        allergies: allergies || [],
        chronic_conditions: chronic_conditions || [],
        current_medications: current_medications || [],
        birth_weight_kg,
        gestational_weeks,
        delivery_type,
        apgar_score_1min,
        apgar_score_5min,
        birth_complications,
        feeding_type,
        dietary_notes,
        school_name,
        school_grade,
        special_needs,
        developmental_notes,
        height_cm,
        weight_kg,
        head_circumference_cm,
        last_measured_at: height_cm || weight_kg ? new Date().toISOString().split('T')[0] : null,
        mobility_status,
        cognitive_notes,
        emergency_contact_name,
        emergency_contact_phone,
        emergency_contact_relationship,
        family_doctor_id,
        pediatrician_id,
        notes_for_doctor,
        medical_history_notes,
        family_medical_history: family_medical_history || [],
        requires_guardian: requires_guardian || false,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating family member:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Also create first growth record if measurements provided
    if (member && (height_cm || weight_kg || head_circumference_cm)) {
      await supabase.from('family_growth_records').insert({
        family_member_id: member.id,
        measured_at: new Date().toISOString().split('T')[0],
        height_cm,
        weight_kg,
        head_circumference_cm,
        notes: 'Initial measurement at profile creation',
      })
    }

    return NextResponse.json({ member }, { status: 201 })
  } catch (e: any) {
    console.error('Create family member error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
