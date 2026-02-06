/**
 * POST /api/ai/draft-note
 * Generate clinical note draft from keywords
 * For doctors during patient visits
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { executeAI, ClinicalNoteOutput } from '@/lib/ai';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user is a doctor
    const admin = createAdminClient();
    const { data: prof } = await admin
      .from('professionals')
      .select('id, type')
      .eq('auth_user_id', user.id)
      .single();

    if (!prof || prof.type !== 'doctor') {
      return NextResponse.json({ error: 'Access denied. Doctors only.' }, { status: 403 });
    }

    const body = await request.json();
    const { keywords, existingNotes, visitReason, vitalSigns, appointmentId, language = 'en' } = body;

    if (!keywords || keywords.trim().length < 10) {
      return NextResponse.json(
        { error: 'Please provide more clinical keywords' },
        { status: 400 }
      );
    }

    // Get patient context if appointmentId provided
    let patientHistory;
    if (appointmentId) {
      const { data: appointment } = await admin
        .from('appointments')
        .select(`
          patient_id,
          reason,
          patient:profiles!patient_id(full_name, date_of_birth, gender, allergies, chronic_conditions)
        `)
        .eq('id', appointmentId)
        .single();

      if (appointment?.patient) {
        patientHistory = {
          profile: appointment.patient,
          allergies: (appointment.patient as any).allergies || [],
          conditions: (appointment.patient as any).chronic_conditions || [],
        };
      }
    }

    const response = await executeAI<ClinicalNoteOutput>({
      skill: 'draft_clinical_note',
      input: {
        keywords,
        existingNotes,
        visitReason,
        vitalSigns,
      },
      userId: user.id,
      userRole: 'doctor',
      language,
      appointmentId,
      context: {
        providerId: prof.id,
        patientHistory,
      },
    });

    return NextResponse.json(response);

  } catch (error: any) {
    console.error('[AI draft-note] Error:', error);
    return NextResponse.json(
      { error: 'Failed to generate clinical note' },
      { status: 500 }
    );
  }
}
