/**
 * POST /api/ai/care-plan
 * Generate patient-friendly care instructions from doctor notes
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { executeAI, CarePlanOutput } from '@/lib/ai';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { appointmentId, ticketId, doctorNotes, diagnosis, language = 'fr' } = body;

    if (!doctorNotes || doctorNotes.trim().length < 10) {
      return NextResponse.json(
        { error: 'Doctor notes are required' },
        { status: 400 }
      );
    }

    const admin = createAdminClient();

    // Get prescriptions and lab orders for the appointment
    let prescriptions: any[] = [];
    let labOrders: any[] = [];
    let patientId = user.id;

    if (appointmentId) {
      // Get prescriptions
      const { data: rxData } = await admin
        .from('prescriptions')
        .select('id, medications, diagnosis')
        .eq('appointment_id', appointmentId);
      prescriptions = rxData || [];

      // Get lab orders
      const { data: labData } = await admin
        .from('lab_test_requests')
        .select('id, test_name, tests')
        .eq('appointment_id', appointmentId);
      labOrders = labData || [];

      // Get patient from appointment
      const { data: appointment } = await admin
        .from('appointments')
        .select('patient_id')
        .eq('id', appointmentId)
        .single();
      
      if (appointment?.patient_id) {
        patientId = appointment.patient_id;
      }
    }

    // Check authorization (patient can view their own, doctor can generate for their patients)
    const { data: prof } = await admin
      .from('professionals')
      .select('id, type')
      .eq('auth_user_id', user.id)
      .maybeSingle();

    const isDoctor = prof?.type === 'doctor';
    const isPatient = patientId === user.id;

    if (!isDoctor && !isPatient) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const response = await executeAI<CarePlanOutput>({
      skill: 'generate_care_plan',
      input: {
        doctorNotes,
        prescriptions,
        labOrders,
        diagnosis,
      },
      userId: user.id,
      userRole: isDoctor ? 'doctor' : 'patient',
      language,
      appointmentId,
      ticketId,
      context: {
        patientId,
        providerId: prof?.id,
      },
    });

    return NextResponse.json(response);

  } catch (error: any) {
    console.error('[AI care-plan] Error:', error);
    return NextResponse.json(
      { error: 'Failed to generate care plan' },
      { status: 500 }
    );
  }
}
