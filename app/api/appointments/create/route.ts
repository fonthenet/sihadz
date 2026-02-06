import { createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

/** Main rule: no booking without sign-in. Appointment creation requires authentication. */
export async function POST(request: Request) {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'You must be signed in to book an appointment.' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const {
      patient_name,
      patient_email,
      patient_phone,
      patient_id: _patient_id,
      doctor_id,
      doctor_name,
      doctor_specialty,
      appointment_date,
      appointment_time,
      notes,
      payment_method,
      payment_amount,
      visit_type,
      create_ticket,
      family_member_id: family_member_id_legacy,
      family_member_ids: family_member_ids_param,
      booking_for_name,
      family_member_vitals: familyMemberVitalsParam,
      patient_vitals: clientVitals,
    } = body

    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

    // Support both single (legacy) and multiple family members
    const family_member_ids = Array.isArray(family_member_ids_param) && family_member_ids_param.length > 0
      ? family_member_ids_param.filter((id: unknown) => typeof id === 'string' && UUID_RE.test(id))
      : (family_member_id_legacy && UUID_RE.test(String(family_member_id_legacy)))
        ? [family_member_id_legacy]
        : []
    const family_member_id = family_member_ids[0] || family_member_id_legacy || null

    // Booking is always for the logged-in user (no guest booking)
    const patient_id = user.id
    const providerId =
      doctor_id && typeof doctor_id === 'string' && UUID_RE.test(doctor_id.trim())
        ? doctor_id.trim()
        : null

    // Resolve doctor_id to professionals.id and enforce schedule (working_hours, unavailable_dates).
    let resolvedProviderId: string | null = null
    let autoConfirmAppointments = false
    if (providerId) {
      const admin = createAdminClient()
      const { data: pro } = await admin
        .from('professionals')
        .select('id, working_hours, unavailable_dates, auto_confirm_appointments')
        .eq('id', providerId)
        .maybeSingle()
      if (pro?.id) {
        resolvedProviderId = pro.id
        autoConfirmAppointments = !!(pro as { auto_confirm_appointments?: boolean }).auto_confirm_appointments
        // Schedule: block if date is in unavailable_dates (holidays/time off)
        const unavail = (pro as { unavailable_dates?: string[] }).unavailable_dates
        if (Array.isArray(unavail) && typeof appointment_date === 'string' && unavail.includes(appointment_date)) {
          return NextResponse.json(
            { success: false, error: 'This date is not available for the selected provider. Please choose another date.' },
            { status: 400 }
          )
        }
        // Schedule: if working_hours set for that day, require time within open-close
        const wh = (pro as { working_hours?: Record<string, { open?: string; close?: string; isOpen?: boolean }> }).working_hours
        if (wh && typeof wh === 'object' && appointment_date && appointment_time) {
          const days: Record<number, string> = { 0: 'sunday', 1: 'monday', 2: 'tuesday', 3: 'wednesday', 4: 'thursday', 5: 'friday', 6: 'saturday' }
          const d = new Date(appointment_date + 'T12:00:00')
          const dayKey = days[d.getDay()] || 'monday'
          const dayHours = wh[dayKey] ?? wh.weekdays
          if (dayHours && typeof dayHours === 'object') {
            const isOpen = dayHours.isOpen !== false
            if (!isOpen) {
              return NextResponse.json(
                { success: false, error: 'The provider is not available on this day. Please choose another date.' },
                { status: 400 }
              )
            }
            if (dayHours.open != null && dayHours.close != null) {
              const openMin = dayHours.open.replace(':', '') as string
              const closeMin = dayHours.close.replace(':', '') as string
              const timeStr = (appointment_time as string).replace(':', '')
              if (timeStr < openMin || timeStr > closeMin) {
                return NextResponse.json(
                  { success: false, error: `This time is outside the provider's hours (${dayHours.open}–${dayHours.close}). Please choose another time.` },
                  { status: 400 }
                )
              }
            }
          }
        }
      } else {
        // Fallback: id may be from legacy doctors table – resolve to professionals by auth_user_id
        try {
          const { data: doc } = await admin
            .from('doctors')
            .select('user_id')
            .eq('id', providerId)
            .maybeSingle()
          if (doc?.user_id) {
            const { data: proByUser } = await admin
              .from('professionals')
              .select('id, working_hours, unavailable_dates, auto_confirm_appointments')
              .eq('auth_user_id', doc.user_id)
              .eq('type', 'doctor')
              .maybeSingle()
            if (proByUser?.id) {
              resolvedProviderId = proByUser.id
              autoConfirmAppointments = !!(proByUser as { auto_confirm_appointments?: boolean }).auto_confirm_appointments
              const unavail = (proByUser as { unavailable_dates?: string[] }).unavailable_dates
              if (Array.isArray(unavail) && typeof appointment_date === 'string' && unavail.includes(appointment_date)) {
                return NextResponse.json(
                  { success: false, error: 'This date is not available for the selected provider. Please choose another date.' },
                  { status: 400 }
                )
              }
              const wh = (proByUser as { working_hours?: Record<string, { open?: string; close?: string; isOpen?: boolean }> }).working_hours
              if (wh && typeof wh === 'object' && appointment_date && appointment_time) {
                const days: Record<number, string> = { 0: 'sunday', 1: 'monday', 2: 'tuesday', 3: 'wednesday', 4: 'thursday', 5: 'friday', 6: 'saturday' }
                const d = new Date(appointment_date + 'T12:00:00')
                const dayKey = days[d.getDay()] || 'monday'
                const dayHours = wh[dayKey] ?? wh.weekdays
                if (dayHours && typeof dayHours === 'object' && dayHours.isOpen === false) {
                  return NextResponse.json(
                    { success: false, error: 'The provider is not available on this day. Please choose another date.' },
                    { status: 400 }
                  )
                }
                if (dayHours && typeof dayHours === 'object' && dayHours.open != null && dayHours.close != null) {
                  const timeStr = (appointment_time as string).replace(':', '')
                  const openMin = dayHours.open.replace(':', '')
                  const closeMin = dayHours.close.replace(':', '')
                  if (timeStr < openMin || timeStr > closeMin) {
                    return NextResponse.json(
                      { success: false, error: `This time is outside the provider's hours (${dayHours.open}–${dayHours.close}). Please choose another time.` },
                      { status: 400 }
                    )
                  }
                }
              }
            }
          }
        } catch {
          // doctors table may not exist
        }
      }
      // If still unresolved, allow booking with doctor_id null so the flow completes (store display name/specialty).
      if (!resolvedProviderId) {
        resolvedProviderId = null
        // Log for debugging; do not block – insert with doctor_id null
        console.warn('[appointments/create] Provider id not in professionals or doctors:', providerId)
      }
    }

    // DEDUPLICATION CHECK: Prevent duplicate appointments
    const q = supabase
      .from('appointments')
      .select('id, status')
      .eq('appointment_date', appointment_date)
      .eq('appointment_time', appointment_time)
      .eq('patient_id', patient_id)
      .neq('status', 'cancelled')
    const { data: existingAppt } = resolvedProviderId != null
      ? await q.eq('doctor_id', resolvedProviderId).maybeSingle()
      : await q.is('doctor_id', null).maybeSingle()

    if (existingAppt) {
      console.log('[v0] Duplicate appointment detected:', existingAppt.id)
      return NextResponse.json({
        success: false,
        error: 'An appointment already exists for this time slot',
        existing_appointment_id: existingAppt.id
      }, { status: 409 })
    }
    const displayName = (doctor_name && typeof doctor_name === 'string') ? doctor_name.trim() || null : null
    const displaySpecialty = (doctor_specialty && typeof doctor_specialty === 'string') ? doctor_specialty.trim() || null : null

    // Serialize JSONB arrays (allergies, conditions, meds) to readable text for appointment columns
    const jsonbToText = (v: unknown): string | null => {
      if (v == null) return null
      if (typeof v === 'string') return v.trim() || null
      if (Array.isArray(v)) {
        const parts = v.map((x) => (typeof x === 'object' && x && 'name' in x ? (x as { name: string }).name : String(x)))
        return parts.filter(Boolean).join(', ') || null
      }
      return String(v)
    }

    // Fetch patient vitals from profile (or family_member) to store on appointment for doctor display
    let appointmentVitals: Record<string, unknown> = {}
    const adminForVitals = createAdminClient()
    if (family_member_id) {
      const { data: fm } = await adminForVitals
        .from('family_members')
        .select('date_of_birth, gender, blood_type, height_cm, weight_kg, allergies, chronic_conditions, current_medications, notes_for_doctor')
        .eq('id', family_member_id)
        .maybeSingle()
      const overlay = (familyMemberVitalsParam && typeof familyMemberVitalsParam === 'object' && familyMemberVitalsParam[family_member_id]) as Record<string, unknown> | undefined
      const v = overlay || (clientVitals as Record<string, unknown>)
      const pick = (from: unknown, fallback: unknown) => (from != null && from !== '') ? from : fallback
      if (fm) {
        appointmentVitals = {
          patient_date_of_birth: pick(v?.date_of_birth, fm.date_of_birth) ?? null,
          patient_gender: pick(v?.gender, fm.gender) ?? null,
          patient_blood_type: pick(v?.blood_type, fm.blood_type) ?? null,
          patient_allergies: pick(v?.allergies, jsonbToText(fm.allergies)) ?? null,
          patient_chronic_conditions: pick(v?.chronic_conditions, jsonbToText(fm.chronic_conditions)) ?? null,
          patient_current_medications: pick(v?.current_medications, jsonbToText(fm.current_medications)) ?? null,
          patient_height_cm: (v?.height_cm != null ? v.height_cm : fm.height_cm) ?? null,
          patient_weight_kg: (v?.weight_kg != null ? v.weight_kg : fm.weight_kg) ?? null,
        }
      }
    } else {
      const { data: profile } = await adminForVitals
        .from('profiles')
        .select('date_of_birth, gender, blood_type, height_cm, weight_kg, allergies, chronic_conditions, current_medications')
        .eq('id', patient_id)
        .maybeSingle()
      if (profile) {
        appointmentVitals = {
          patient_date_of_birth: profile.date_of_birth ?? null,
          patient_gender: profile.gender ?? null,
          patient_blood_type: profile.blood_type ?? null,
          patient_allergies: profile.allergies ?? null,
          patient_chronic_conditions: profile.chronic_conditions ?? null,
          patient_current_medications: profile.current_medications ?? null,
          patient_height_cm: profile.height_cm ?? null,
          patient_weight_kg: profile.weight_kg ?? null,
        }
      }
      if (clientVitals && typeof clientVitals === 'object') {
        const v = clientVitals as Record<string, unknown>
        const pick = (from: unknown, fallback: unknown) => (from != null && from !== '') ? from : fallback
        appointmentVitals = {
          patient_date_of_birth: pick(v.date_of_birth, appointmentVitals.patient_date_of_birth) ?? null,
          patient_gender: pick(v.gender, appointmentVitals.patient_gender) ?? null,
          patient_blood_type: pick(v.blood_type, appointmentVitals.patient_blood_type) ?? null,
          patient_allergies: pick(v.allergies, appointmentVitals.patient_allergies) ?? null,
          patient_chronic_conditions: pick(v.chronic_conditions, appointmentVitals.patient_chronic_conditions) ?? null,
          patient_current_medications: pick(v.current_medications, appointmentVitals.patient_current_medications) ?? null,
          patient_height_cm: (v.height_cm != null ? v.height_cm : appointmentVitals.patient_height_cm) ?? null,
          patient_weight_kg: (v.weight_kg != null ? v.weight_kg : appointmentVitals.patient_weight_kg) ?? null,
        }
      }
    }

    // 1. Create the appointment record (logged-in user only). Use doctor_id only (professional_id may not exist in schema).
    const { data: appointment, error: appointmentError } = await supabase
      .from('appointments')
      .insert({
        patient_id,
        doctor_id: resolvedProviderId,
        doctor_display_name: displayName,
        doctor_specialty: displaySpecialty,
        appointment_date,
        appointment_time,
        notes,
        payment_method,
        payment_amount: parseFloat(payment_amount),
        payment_status: payment_method === 'cash' ? 'pending' : 'unpaid',
        status: autoConfirmAppointments ? 'confirmed' : 'pending',
        visit_type: visit_type || 'in-person',
        guest_name: patient_name ?? null,
        guest_email: patient_email ?? null,
        guest_phone: patient_phone ?? null,
        is_guest_booking: false,
        // Family member booking support (single + multiple)
        family_member_id: family_member_id || null,
        family_member_ids: family_member_ids.length > 0 ? family_member_ids : null,
        booking_for_name: booking_for_name || patient_name || null,
        // Patient vitals copied from profile for doctor display
        ...appointmentVitals,
      })
      .select()
      .single()

    if (appointmentError) {
      console.error('[v0] Error creating appointment:', appointmentError)
      const msg = appointmentError.message || ''
      const isFk = msg.includes('foreign key') || msg.includes('appointments_doctor_id_fkey')
      return NextResponse.json(
        {
          success: false,
          error: isFk
            ? 'This doctor cannot be booked here. Please choose a doctor from the booking page (Search / Book appointment).'
            : msg,
        },
        { status: 400 }
      )
    }

    let ticketNumber = null

    // 2. Create a ticket if requested
    if (create_ticket) {
      const ticketDate = new Date().toISOString().slice(0, 10).replace(/-/g, '')
      const randomNum = Math.floor(10000 + Math.random() * 90000)
      ticketNumber = `TKT-${ticketDate}-${randomNum}`

      // Fetch patient vitals from profile so ticket carries them for doctor
      let patientVitals: Record<string, unknown> = {}
      const admin = createAdminClient()
      let familyMembersVitalsForTicket: Array<{ id: string; full_name: string; date_of_birth?: string; age_years?: number; gender?: string; blood_type?: string; allergies?: string; chronic_conditions?: string; current_medications?: string; height_cm?: number; weight_kg?: number }> = []
      if (family_member_ids.length > 0) {
        const { data: fms } = await admin
          .from('family_members')
          .select('id, full_name, date_of_birth, gender, blood_type, height_cm, weight_kg, allergies, chronic_conditions, current_medications')
          .in('id', family_member_ids)
        for (const fm of fms || []) {
          const overlay = (familyMemberVitalsParam && typeof familyMemberVitalsParam === 'object' && (familyMemberVitalsParam as Record<string, unknown>)[fm.id]) as Record<string, unknown> | undefined
          const v = overlay || (fm.id === family_member_id && clientVitals as Record<string, unknown>)
          const pick = (key: string, fromClient: unknown, fallback: unknown) => (fromClient != null && fromClient !== '') ? fromClient : fallback
          const dob = pick('date_of_birth', v?.date_of_birth, fm.date_of_birth) as string | null
          const age = dob ? Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : null
          familyMembersVitalsForTicket.push({
            id: fm.id,
            full_name: fm.full_name || '',
            date_of_birth: dob ?? fm.date_of_birth ?? undefined,
            age_years: age ?? undefined,
            gender: pick('gender', v?.gender, fm.gender) as string | undefined,
            blood_type: pick('blood_type', v?.blood_type, fm.blood_type) as string | undefined,
            height_cm: (v?.height_cm != null ? v.height_cm : fm.height_cm) ?? undefined,
            weight_kg: (v?.weight_kg != null ? v.weight_kg : fm.weight_kg) ?? undefined,
            allergies: (pick('allergies', v?.allergies, jsonbToText(fm.allergies)) as string) ?? undefined,
            chronic_conditions: (pick('chronic_conditions', v?.chronic_conditions, jsonbToText(fm.chronic_conditions)) as string) ?? undefined,
            current_medications: (pick('current_medications', v?.current_medications, jsonbToText(fm.current_medications)) as string) ?? undefined,
          })
        }
        patientVitals = familyMembersVitalsForTicket[0] ? {
          date_of_birth: familyMembersVitalsForTicket[0].date_of_birth ?? null,
          age_years: familyMembersVitalsForTicket[0].age_years ?? null,
          gender: familyMembersVitalsForTicket[0].gender ?? null,
          blood_type: familyMembersVitalsForTicket[0].blood_type ?? null,
          height_cm: familyMembersVitalsForTicket[0].height_cm ?? null,
          weight_kg: familyMembersVitalsForTicket[0].weight_kg ?? null,
          allergies: familyMembersVitalsForTicket[0].allergies ?? null,
          chronic_conditions: familyMembersVitalsForTicket[0].chronic_conditions ?? null,
          current_medications: familyMembersVitalsForTicket[0].current_medications ?? null,
        } : {}
      } else if (family_member_id) {
        const { data: fm } = await admin
          .from('family_members')
          .select('full_name, date_of_birth, gender, blood_type, height_cm, weight_kg, allergies, chronic_conditions, current_medications')
          .eq('id', family_member_id)
          .maybeSingle()
        if (fm) {
          const dob = fm.date_of_birth
          const age = dob ? Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : null
          patientVitals = {
            date_of_birth: fm.date_of_birth ?? null,
            age_years: age,
            gender: fm.gender ?? null,
            blood_type: fm.blood_type ?? null,
            height_cm: fm.height_cm ?? null,
            weight_kg: fm.weight_kg ?? null,
            allergies: jsonbToText(fm.allergies) ?? null,
            chronic_conditions: jsonbToText(fm.chronic_conditions) ?? null,
            current_medications: jsonbToText(fm.current_medications) ?? null,
          }
          const overlay = (familyMemberVitalsParam && typeof familyMemberVitalsParam === 'object' && (familyMemberVitalsParam as Record<string, unknown>)[family_member_id]) as Record<string, unknown> | undefined
          const v = overlay || (clientVitals as Record<string, unknown>)
          if (v && typeof v === 'object') {
            const p = patientVitals as Record<string, unknown>
            const pick = (key: string, fromClient: unknown) => (fromClient != null && fromClient !== '') ? fromClient : (p[key] ?? null)
            const ticketDob = pick('date_of_birth', v.date_of_birth) as string | null
            const ticketAge = ticketDob ? Math.floor((Date.now() - new Date(ticketDob).getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : (p.age_years as number | null) ?? null
            patientVitals = {
              date_of_birth: ticketDob ?? p.date_of_birth ?? null,
              age_years: ticketAge,
              gender: pick('gender', v.gender),
              blood_type: pick('blood_type', v.blood_type),
              height_cm: (v.height_cm != null ? v.height_cm : p.height_cm) ?? null,
              weight_kg: (v.weight_kg != null ? v.weight_kg : p.weight_kg) ?? null,
              allergies: pick('allergies', v.allergies),
              chronic_conditions: pick('chronic_conditions', v.chronic_conditions),
              current_medications: pick('current_medications', v.current_medications),
            }
          }
          familyMembersVitalsForTicket = [{ id: family_member_id, full_name: (fm as { full_name?: string }).full_name || '', ...patientVitals as object }]
        }
      } else {
        const { data: profile } = await admin
          .from('profiles')
          .select('date_of_birth, gender, blood_type, height_cm, weight_kg, allergies, chronic_conditions, current_medications')
          .eq('id', patient_id)
          .maybeSingle()
        if (profile) {
          const dob = profile.date_of_birth
          const age = dob ? Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : null
          patientVitals = {
            date_of_birth: profile.date_of_birth ?? null,
            age_years: age,
            gender: profile.gender ?? null,
            blood_type: profile.blood_type ?? null,
            height_cm: profile.height_cm ?? null,
            weight_kg: profile.weight_kg ?? null,
            allergies: profile.allergies ?? null,
            chronic_conditions: profile.chronic_conditions ?? null,
            current_medications: profile.current_medications ?? null,
          }
        }
        // Overlay client-provided vitals (from confirm page Summary) - prefer client when it has values
        if (clientVitals && typeof clientVitals === 'object') {
          const v = clientVitals as Record<string, unknown>
          const p = patientVitals as Record<string, unknown>
          const pick = (key: string, fromClient: unknown) => (fromClient != null && fromClient !== '') ? fromClient : (p[key] ?? null)
          const dob = pick('date_of_birth', v.date_of_birth) as string | null
          const age = dob ? Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : (p.age_years as number | null) ?? null
          patientVitals = {
            date_of_birth: dob ?? p.date_of_birth ?? null,
            age_years: age,
            gender: pick('gender', v.gender),
            blood_type: pick('blood_type', v.blood_type),
            height_cm: (v.height_cm != null ? v.height_cm : p.height_cm) ?? null,
            weight_kg: (v.weight_kg != null ? v.weight_kg : p.weight_kg) ?? null,
            allergies: pick('allergies', v.allergies),
            chronic_conditions: pick('chronic_conditions', v.chronic_conditions),
            current_medications: pick('current_medications', v.current_medications),
          }
        }
      }

      const { data: ticket, error: ticketError } = await admin
        .from('healthcare_tickets')
        .insert({
          ticket_number: ticketNumber,
          ticket_type: 'appointment',
          status: 'confirmed',
          patient_id,
          patient_name,
          patient_phone,
          primary_provider_id: resolvedProviderId,
          primary_provider_type: 'doctor',
          appointment_id: appointment.id,
          payment_method,
          payment_amount: parseFloat(payment_amount),
          payment_status: payment_method === 'cash' ? 'pending' : 'unpaid',
          metadata: {
            patient_email,
            appointment_date,
            appointment_time,
            notes,
            visit_type,
            family_member_id: family_member_id || null,
            family_member_ids: family_member_ids.length > 0 ? family_member_ids : null,
            family_members_vitals: familyMembersVitalsForTicket.length > 0 ? familyMembersVitalsForTicket : null,
            ...patientVitals,
          }
        })
        .select()
        .single()

      if (ticketError) {
        console.error('[v0] Error creating ticket:', ticketError)
      } else {
        console.log('[v0] Created ticket:', ticket.ticket_number)
        
        // Create timeline entry
        await admin.from('ticket_timeline').insert({
          ticket_id: ticket.id,
          action: 'created',
          action_description: 'Appointment ticket created',
          action_description_ar: 'تم إنشاء تذكرة الموعد',
          actor_id: patient_id,
          actor_type: 'patient',
          actor_name: patient_name
        })
      }
    }

    // Notify patient of new appointment
    const { data: proForNotif } = resolvedProviderId
      ? await createAdminClient().from('professionals').select('business_name, auth_user_id').eq('id', resolvedProviderId).maybeSingle()
      : { data: null }
    await supabase.from('notifications').insert({
      user_id: patient_id,
      type: 'appointment',
      title: 'Appointment Booked',
      title_ar: 'تم حجز الموعد',
      title_fr: 'Rendez-vous réservé',
      message: proForNotif?.business_name
        ? `Your appointment with ${proForNotif.business_name} on ${appointment_date} at ${appointment_time} has been ${autoConfirmAppointments ? 'confirmed' : 'requested'}.`
        : `Your appointment on ${appointment_date} at ${appointment_time} has been ${autoConfirmAppointments ? 'confirmed' : 'requested'}.`,
      message_ar: proForNotif?.business_name
        ? `تم ${autoConfirmAppointments ? 'تأكيد' : 'طلب'} موعدك مع ${proForNotif.business_name} في ${appointment_date} الساعة ${appointment_time}.`
        : `تم ${autoConfirmAppointments ? 'تأكيد' : 'طلب'} موعدك في ${appointment_date} الساعة ${appointment_time}.`,
      metadata: { appointment_id: appointment.id },
      action_url: `/dashboard/appointments/${appointment.id}`,
    })

    // Notify provider of new appointment
    if (proForNotif?.auth_user_id) {
      const { data: patientProfile } = await createAdminClient()
        .from('profiles')
        .select('full_name')
        .eq('id', patient_id)
        .maybeSingle()
      await supabase.from('notifications').insert({
        user_id: proForNotif.auth_user_id,
        type: 'appointment',
        title: 'New Appointment',
        title_ar: 'موعد جديد',
        title_fr: 'Nouveau rendez-vous',
        message: `${patientProfile?.full_name || 'A patient'} has booked an appointment on ${appointment_date} at ${appointment_time}.`,
        message_ar: `حجز ${patientProfile?.full_name || 'مريض'} موعداً في ${appointment_date} الساعة ${appointment_time}.`,
        metadata: { appointment_id: appointment.id },
        action_url: '/professional/dashboard/appointments',
      })
    }

    return NextResponse.json({ 
      success: true, 
      appointment, 
      ticket_number: ticketNumber 
    })

  } catch (error: any) {
    console.error('[v0] Appointment creation error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
