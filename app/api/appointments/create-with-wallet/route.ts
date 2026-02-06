import { createAdminClient } from '@/lib/supabase/admin'
import { createServerClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * Creates an appointment paid from the user's wallet (deposit).
 * Requires auth. Validates balance, creates appointment, deducts wallet, creates transaction.
 * Does NOT book if insufficient credit.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'You must be logged in to pay with wallet.' }, { status: 401 })
    }

    const body = await request.json()
    const {
      patient_name,
      patient_email,
      patient_phone,
      patient_id,
      doctor_id,
      doctor_name,
      doctor_specialty,
      appointment_date,
      appointment_time,
      notes,
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

    const amount = Number(payment_amount)
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: 'Invalid payment amount.' }, { status: 400 })
    }

    // Wallet payment only for the logged-in user (patient_id must match)
    if (patient_id && patient_id !== user.id) {
      return NextResponse.json({ error: 'Wallet payment is only for your own account.' }, { status: 403 })
    }

    const providerId =
      doctor_id && typeof doctor_id === 'string' && UUID_RE.test(doctor_id.trim())
        ? doctor_id.trim()
        : null

    const admin = createAdminClient()

    // Resolve doctor_id to professionals.id and enforce schedule (working_hours, unavailable_dates).
    let resolvedProviderId: string | null = null
    let autoConfirmAppointments = false
    if (providerId) {
      const { data: pro } = await admin
        .from('professionals')
        .select('id, working_hours, unavailable_dates, auto_confirm_appointments')
        .eq('id', providerId)
        .maybeSingle()
      if (pro?.id) {
        resolvedProviderId = pro.id
        autoConfirmAppointments = !!(pro as { auto_confirm_appointments?: boolean }).auto_confirm_appointments
        const unavail = (pro as { unavailable_dates?: string[] }).unavailable_dates
        if (Array.isArray(unavail) && typeof appointment_date === 'string' && unavail.includes(appointment_date)) {
          return NextResponse.json(
            { success: false, error: 'This date is not available for the selected provider. Please choose another date.' },
            { status: 400 }
          )
        }
        const wh = (pro as { working_hours?: Record<string, { open?: string; close?: string; isOpen?: boolean }> }).working_hours
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
      } else {
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
      if (!resolvedProviderId) {
        resolvedProviderId = null
        console.warn('[create-with-wallet] Provider id not in professionals or doctors:', providerId)
      }
    }

    // 1. Get or create wallet and check balance
    let { data: wallet } = await admin
      .from('wallets')
      .select('id, balance')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!wallet) {
      const { data: newWallet, error: insertErr } = await admin
        .from('wallets')
        .insert({ user_id: user.id })
        .select('id, balance')
        .single()
      if (insertErr) {
        console.error('[create-with-wallet] Insert wallet:', insertErr)
        return NextResponse.json({ error: insertErr.message }, { status: 500 })
      }
      wallet = newWallet
    }

    const balance = Number(wallet.balance)
    if (balance < amount) {
      return NextResponse.json(
        {
          success: false,
          error: 'Insufficient balance',
          balance,
          required: amount,
        },
        { status: 400 }
      )
    }

    // 2. Deduplication: prevent duplicate appointments
    const dq = admin
      .from('appointments')
      .select('id, status')
      .eq('appointment_date', appointment_date)
      .eq('appointment_time', appointment_time)
      .or(
        patient_id
          ? `patient_id.eq.${patient_id}`
          : `guest_email.eq.${patient_email},guest_phone.eq.${patient_phone}`
      )
      .neq('status', 'cancelled')
    const { data: existingAppt } = resolvedProviderId != null
      ? await dq.eq('doctor_id', resolvedProviderId).maybeSingle()
      : await dq.is('doctor_id', null).maybeSingle()

    if (existingAppt) {
      return NextResponse.json(
        { success: false, error: 'An appointment already exists for this time slot.' },
        { status: 409 }
      )
    }

    const displayName = (doctor_name && typeof doctor_name === 'string') ? doctor_name.trim() || null : null
    const displaySpecialty = (doctor_specialty && typeof doctor_specialty === 'string') ? doctor_specialty.trim() || null : null

    // Serialize JSONB arrays to readable text for appointment columns
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
    const effectivePatientId = patient_id || user.id
    let appointmentVitals: Record<string, unknown> = {}
    if (family_member_ids.length > 0) {
      // Multi-family: use first member for appointment columns (backward compat)
      const { data: fm } = await admin
        .from('family_members')
        .select('date_of_birth, gender, blood_type, height_cm, weight_kg, allergies, chronic_conditions, current_medications')
        .eq('id', family_member_id)
        .maybeSingle()
      const overlay = (familyMemberVitalsParam && typeof familyMemberVitalsParam === 'object' && (familyMemberVitalsParam as Record<string, unknown>)[family_member_id]) as Record<string, unknown> | undefined
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
    } else if (family_member_id) {
      const { data: fm } = await admin
        .from('family_members')
        .select('date_of_birth, gender, blood_type, height_cm, weight_kg, allergies, chronic_conditions, current_medications')
        .eq('id', family_member_id)
        .maybeSingle()
      if (fm) {
        appointmentVitals = {
          patient_date_of_birth: fm.date_of_birth ?? null,
          patient_gender: fm.gender ?? null,
          patient_blood_type: fm.blood_type ?? null,
          patient_allergies: jsonbToText(fm.allergies) ?? null,
          patient_chronic_conditions: jsonbToText(fm.chronic_conditions) ?? null,
          patient_current_medications: jsonbToText(fm.current_medications) ?? null,
          patient_height_cm: fm.height_cm ?? null,
          patient_weight_kg: fm.weight_kg ?? null,
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
    } else {
      const { data: profile } = await admin
        .from('profiles')
        .select('date_of_birth, gender, blood_type, height_cm, weight_kg, allergies, chronic_conditions, current_medications')
        .eq('id', effectivePatientId)
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

    // 3. Create appointment (doctor_id only; professional_id may not exist in schema)
    const { data: appointment, error: appointmentError } = await admin
      .from('appointments')
      .insert({
        patient_id: effectivePatientId,
        doctor_id: resolvedProviderId,
        doctor_display_name: displayName,
        doctor_specialty: displaySpecialty,
        appointment_date,
        appointment_time,
        notes,
        payment_method: 'wallet',
        payment_amount: amount,
        payment_status: 'paid',
        status: autoConfirmAppointments ? 'confirmed' : 'pending',
        visit_type: visit_type || 'in-person',
        guest_name: patient_name ?? null,
        guest_email: patient_email ?? null,
        guest_phone: patient_phone ?? null,
        is_guest_booking: !patient_id,
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
      console.error('[create-with-wallet] Create appointment:', appointmentError)
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

    // 4. Deduct from wallet and record transaction
    const newBalance = balance - amount
    const { error: updateWalletError } = await admin
      .from('wallets')
      .update({
        balance: newBalance,
        updated_at: new Date().toISOString(),
      })
      .eq('id', wallet.id)

    if (updateWalletError) {
      console.error('[create-with-wallet] Update wallet:', updateWalletError)
      // Rollback: delete the appointment we just created
      await admin.from('appointments').delete().eq('id', appointment.id)
      return NextResponse.json({ error: 'Failed to deduct from wallet. Appointment not created.' }, { status: 500 })
    }

    const { data: txData, error: txError } = await admin.from('wallet_transactions').insert({
      wallet_id: wallet.id,
      type: 'deposit',
      amount: -amount,
      balance_after: newBalance,
      reference_type: 'appointment',
      reference_id: appointment.id,
      description: `Deposit for appointment ${appointment_date} ${appointment_time}`,
    }).select().single()

    if (txError) {
      console.error('[create-with-wallet] Insert transaction:', txError)
      // Rollback: refund wallet and delete appointment
      await admin.from('wallets').update({ balance, updated_at: new Date().toISOString() }).eq('id', wallet.id)
      await admin.from('appointments').delete().eq('id', appointment.id)
      return NextResponse.json({ error: 'Failed to record transaction. Appointment not created.' }, { status: 500 })
    }

    // 4b. Create booking_deposits record for tracking refunds
    const { data: depositRecord } = await admin.from('booking_deposits').insert({
      user_id: user.id,
      appointment_id: appointment.id,
      amount: amount,
      status: 'frozen',
      debit_transaction_id: txData?.id
    }).select().single()

    // Update appointment with deposit_id and deposit_status
    if (depositRecord) {
      await admin.from('appointments')
        .update({ deposit_id: depositRecord.id, deposit_status: 'paid' })
        .eq('id', appointment.id)
    }

    // 5. Create ticket if requested
    let ticketNumber: string | null = null
    if (create_ticket) {
      const ticketDate = new Date().toISOString().slice(0, 10).replace(/-/g, '')
      const randomNum = Math.floor(10000 + Math.random() * 90000)
      ticketNumber = `TKT-${ticketDate}-${randomNum}`

      // Fetch patient vitals from profile/family_member so ticket carries them for doctor
      const effectivePatientId = patient_id || user.id
      let patientVitals: Record<string, unknown> = {}
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
          .eq('id', effectivePatientId)
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
        // Fallback: use client-provided vitals from confirm page when profile has no data
        if (Object.keys(patientVitals).length === 0 && clientVitals && typeof clientVitals === 'object') {
          const v = clientVitals as Record<string, unknown>
          const dob = v.date_of_birth as string | undefined
          const age = dob ? Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : null
          patientVitals = {
            date_of_birth: v.date_of_birth ?? null,
            age_years: age,
            gender: v.gender ?? null,
            blood_type: v.blood_type ?? null,
            height_cm: v.height_cm ?? null,
            weight_kg: v.weight_kg ?? null,
            allergies: v.allergies ?? null,
            chronic_conditions: v.chronic_conditions ?? null,
            current_medications: v.current_medications ?? null,
          }
        }
      }

      const { data: ticket, error: ticketError } = await admin
        .from('healthcare_tickets')
        .insert({
          ticket_number: ticketNumber,
          ticket_type: 'appointment',
          status: 'confirmed',
          patient_id: effectivePatientId,
          patient_name,
          patient_phone,
          primary_provider_id: resolvedProviderId,
          primary_provider_type: 'doctor',
          appointment_id: appointment.id,
          payment_method: 'wallet',
          payment_amount: amount,
          payment_status: 'paid',
          metadata: {
            patient_email,
            appointment_date,
            appointment_time,
            notes,
            visit_type: visit_type || 'in-person',
            family_member_id: family_member_id || null,
            family_member_ids: family_member_ids.length > 0 ? family_member_ids : null,
            family_members_vitals: familyMembersVitalsForTicket.length > 0 ? familyMembersVitalsForTicket : null,
            ...patientVitals,
          },
        })
        .select()
        .single()

      if (!ticketError && ticket) {
        await admin.from('ticket_timeline').insert({
          ticket_id: ticket.id,
          action: 'created',
          action_description: 'Appointment ticket created (paid from wallet)',
          action_description_ar: 'تم إنشاء تذكرة الموعد (مدفوعة من المحفظة)',
          actor_id: user.id,
          actor_type: 'patient',
          actor_name: patient_name,
        })
      }
    }

    return NextResponse.json({
      success: true,
      appointment,
      ticket_number: ticketNumber,
      balance_after: newBalance,
    })
  } catch (error: any) {
    console.error('[create-with-wallet] Error:', error)
    return NextResponse.json({ error: error.message || 'Unknown error' }, { status: 500 })
  }
}
