'use server'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server'
import { generateWithFallback, hasAiProvider } from '@/lib/ai/generate-with-fallback'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { 
      referralId, 
      appointmentId,
      patientName,
      patientAge,
      patientGender,
      diagnosis,
      referralReason,
      targetSpecialty,
      targetDoctorName,
      clinicalSummary,
      relevantHistory,
      currentMedications,
      testResults,
      urgency
    } = body

    if (!hasAiProvider()) {
      return NextResponse.json(
        { error: 'AI service not configured' },
        { status: 503 }
      )
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const admin = createAdminClient()

    // Verify user is a doctor
    const { data: prof } = await admin
      .from('professionals')
      .select('id, full_name, specialty, business_name, address, phone, email')
      .eq('auth_user_id', user.id)
      .single()

    if (!prof) {
      return NextResponse.json({ error: 'Access denied. Doctors only.' }, { status: 403 })
    }

    // If referralId provided, fetch referral data
    let referralData = null
    if (referralId) {
      const { data: ref } = await admin
        .from('referrals')
        .select(`
          *,
          patient:patient_id(full_name, date_of_birth, gender),
          appointment:appointment_id(diagnosis, notes, symptoms)
        `)
        .eq('id', referralId)
        .single()
      referralData = ref
    }

    // Build context from referral data or provided params
    const patient = referralData?.patient || { full_name: patientName }
    const patientAgeValue = patientAge || (referralData?.patient?.date_of_birth 
      ? Math.floor((Date.now() - new Date(referralData.patient.date_of_birth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
      : 'Unknown')
    const patientGenderValue = patientGender || referralData?.patient?.gender || 'Unknown'
    
    const diagnosisValue = diagnosis || referralData?.appointment?.diagnosis || referralData?.reason || 'Not specified'
    const reasonValue = referralReason || referralData?.reason || diagnosisValue
    const specialtyValue = targetSpecialty || referralData?.target_specialty || 'Specialist'
    const urgencyValue = urgency || referralData?.priority || 'routine'

    const prompt = `You are a medical professional in Algeria generating a formal referral letter. Create a professional referral letter in French (standard format in Algeria).

## Referring Doctor Information
- Name: Dr. ${prof.full_name || 'N/A'}
- Specialty: ${prof.specialty || 'General Medicine'}
- Practice: ${prof.business_name || 'Private Practice'}
- Address: ${prof.address || 'N/A'}
- Phone: ${prof.phone || 'N/A'}

## Patient Information
- Name: ${patient.full_name || patientName || 'Patient'}
- Age: ${patientAgeValue}
- Gender: ${patientGenderValue}

## Referral Details
- Target Specialty: ${specialtyValue}
- Target Doctor: ${targetDoctorName || 'Respected Colleague'}
- Urgency: ${urgencyValue}

## Clinical Information
- Diagnosis/Reason for Referral: ${diagnosisValue}
- Reason for Referral: ${reasonValue}
- Clinical Summary: ${clinicalSummary || 'See attached consultation notes'}
- Relevant Medical History: ${relevantHistory || 'To be reviewed'}
- Current Medications: ${currentMedications || 'See prescription'}
- Recent Test Results: ${testResults || 'To be reviewed'}

## Instructions
Generate a formal, professional referral letter in French following the standard Algerian medical letter format:
1. Header with date and doctor info
2. Salutation to colleague
3. Patient presentation
4. Clinical summary and reason for referral
5. Specific questions or requests
6. Closing with appreciation

Return a JSON response:
{
  "letter_fr": "Complete letter in French",
  "letter_ar": "Complete letter in Arabic (optional translation)",
  "summary": "Brief summary of the referral",
  "key_requests": ["Specific request 1", "Request 2"]
}

Be professional, concise, and clinically relevant.`

    const { text, provider } = await generateWithFallback(prompt, 2500)

    let result
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0])
      } else {
        result = { letter_fr: text, summary: 'Referral letter generated' }
      }
    } catch {
      result = { letter_fr: text, summary: 'Referral letter generated' }
    }

    // Optionally save the generated letter to the referral
    if (referralId) {
      await admin
        .from('referrals')
        .update({ 
          notes: result.letter_fr,
          updated_at: new Date().toISOString()
        })
        .eq('id', referralId)
    }

    return NextResponse.json({
      success: true,
      ...result,
      provider,
      generatedAt: new Date().toISOString()
    })

  } catch (error: any) {
    console.error('[Referral Letter] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to generate referral letter' },
      { status: 500 }
    )
  }
}
