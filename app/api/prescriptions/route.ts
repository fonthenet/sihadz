import { createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get doctor's professional record
    const { data: professional } = await supabase
      .from('professionals')
      .select('id, business_name')
      .eq('auth_user_id', user.id)
      .eq('type', 'doctor')
      .single()

    if (!professional) {
      return NextResponse.json({ error: 'Not authorized as a doctor' }, { status: 403 })
    }

    const body = await request.json()
    const { 
      patientId,
      appointmentId,
      familyMemberId,
      diagnosis,
      diagnosisAr,
      medications,
      notes,
      pharmacyId,
      validDays = 30,
      isChifaEligible = false
    } = body

    // Validate required fields
    if (!patientId || !medications || medications.length === 0) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Generate RX-DDMMYY-{visitRef}-{random} (requires scripts/059-prescription-rx-numbering.sql)
    const admin = createAdminClient()
    const { data: rxNumber, error: rpcErr } = await admin.rpc('get_next_rx_number', {
      p_appointment_id: appointmentId || null
    })
    const d = new Date()
    const ddmmyy = `${String(d.getDate()).padStart(2,'0')}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getFullYear()).slice(-2)}`
    const visitRef = appointmentId ? appointmentId.replace(/-/g,'').slice(-6).toLowerCase() : '000000'
    const prescriptionNumber = rpcErr ? `RX-${ddmmyy}-${visitRef}-${Math.floor(100000 + Math.random() * 900000)}` : (rxNumber as string)

    // Create prescription
    const validUntil = new Date()
    validUntil.setDate(validUntil.getDate() + validDays)

    const now = new Date().toISOString()
    // If familyMemberId explicitly provided (including null for Self), use it. Otherwise inherit from appointment.
    let resolvedFamilyMemberId: string | null
    if (familyMemberId !== undefined) {
      resolvedFamilyMemberId = familyMemberId || null
    } else if (appointmentId) {
      const { data: apt } = await supabase
        .from('appointments')
        .select('family_member_id')
        .eq('id', appointmentId)
        .single()
      resolvedFamilyMemberId = apt?.family_member_id || null
    } else {
      resolvedFamilyMemberId = null
    }

    const { data: prescription, error: prescError } = await supabase
      .from('prescriptions')
      .insert({
        doctor_id: professional.id,
        patient_id: patientId,
        appointment_id: appointmentId || null,
        family_member_id: resolvedFamilyMemberId,
        diagnosis,
        diagnosis_ar: diagnosisAr,
        medications,
        notes,
        pharmacy_id: null, // Always null on creation - will be set when sent to pharmacy
        status: 'active', // Active status - not sent to pharmacy yet, can be printed or sent later
        valid_until: validUntil.toISOString().split('T')[0],
        is_chifa_eligible: isChifaEligible,
        prescription_number: prescriptionNumber,
        qr_code: `PRESC-${Date.now()}-${professional.id.slice(0,8)}`,
      })
      .select()
      .single()

    if (prescError) {
      console.error('Prescription creation error:', prescError)
      return NextResponse.json({ error: prescError.message }, { status: 500 })
    }

    // Only create notifications when pharmacy is selected (sent workflow)
    // If no pharmacy, prescription is draft - doctor/patient can send later
    // Notifications and ticket/thread updates happen when sending, not on creation

    return NextResponse.json({ 
      success: true, 
      prescription,
      message: 'Prescription created as draft. You can print it or send it to a pharmacy.'
    })

  } catch (error) {
    console.error('Prescription API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const role = searchParams.get('role') // 'doctor', 'pharmacy', or 'patient'
    const status = searchParams.get('status')

    // Get professional record if doctor or pharmacy
    let query = supabase
      .from('prescriptions')
      .select(`
        *,
        doctor:professionals!doctor_id(business_name, phone),
        patient:profiles!patient_id(full_name, phone, chifa_number),
        pharmacy:professionals!pharmacy_id(business_name, phone, commune, wilaya)
      `)
      .order('created_at', { ascending: false })

    if (role === 'doctor') {
      const { data: professional } = await supabase
        .from('professionals')
        .select('id')
        .eq('auth_user_id', user.id)
        .single()
      
      if (professional) {
        query = query.eq('doctor_id', professional.id)
      }
    } else if (role === 'pharmacy') {
      const { data: professional } = await supabase
        .from('professionals')
        .select('id')
        .eq('auth_user_id', user.id)
        .single()
      
      if (professional) {
        query = query.eq('pharmacy_id', professional.id)
      }
    } else {
      // Patient view
      query = query.eq('patient_id', user.id)
    }

    if (status) {
      query = query.eq('status', status)
    }

    const { data: prescriptions, error } = await query.limit(50)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ prescriptions })

  } catch (error) {
    console.error('Get prescriptions error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
