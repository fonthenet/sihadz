import { createServerClient } from '@/lib/supabase/server'
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

    // Create prescription
    const validUntil = new Date()
    validUntil.setDate(validUntil.getDate() + validDays)

    const { data: prescription, error: prescError } = await supabase
      .from('prescriptions')
      .insert({
        doctor_id: professional.id,
        patient_id: patientId,
        appointment_id: appointmentId || null,
        diagnosis,
        diagnosis_ar: diagnosisAr,
        medications,
        notes,
        pharmacy_id: pharmacyId || null,
        status: pharmacyId ? 'sent' : 'pending',
        valid_until: validUntil.toISOString().split('T')[0],
        is_chifa_eligible: isChifaEligible,
        qr_code: `PRESC-${Date.now()}-${professional.id.slice(0,8)}`,
      })
      .select()
      .single()

    if (prescError) {
      console.error('Prescription creation error:', prescError)
      return NextResponse.json({ error: prescError.message }, { status: 500 })
    }

    // If pharmacy is selected, create notification
    if (pharmacyId) {
      // Get pharmacy's auth_user_id for notification
      const { data: pharmacy } = await supabase
        .from('professionals')
        .select('auth_user_id, business_name')
        .eq('id', pharmacyId)
        .single()

      if (pharmacy) {
        // Notify pharmacy
        await supabase.from('notifications').insert({
          user_id: pharmacy.auth_user_id,
          type: 'new_prescription',
          title: 'New Prescription Received',
          title_ar: 'تم استلام وصفة طبية جديدة',
          message: `Dr. ${professional.business_name} has sent a new prescription`,
          message_ar: `أرسل الدكتور ${professional.business_name} وصفة طبية جديدة`,
          metadata: { 
            prescription_id: prescription.id,
            doctor_name: professional.business_name,
          },
          action_url: '/professional/dashboard',
        })
      }

      // Notify patient
      await supabase.from('notifications').insert({
        user_id: patientId,
        type: 'prescription_sent',
        title: 'Prescription Sent to Pharmacy',
        title_ar: 'تم إرسال الوصفة إلى الصيدلية',
        message: `Your prescription has been sent to ${pharmacy?.business_name || 'the pharmacy'}`,
        message_ar: `تم إرسال وصفتك إلى ${pharmacy?.business_name || 'الصيدلية'}`,
        metadata: { 
          prescription_id: prescription.id,
          pharmacy_name: pharmacy?.business_name,
        },
      })
    }

    return NextResponse.json({ 
      success: true, 
      prescription,
      message: pharmacyId ? 'Prescription sent to pharmacy' : 'Prescription created'
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
