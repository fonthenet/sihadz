/**
 * POST /api/ai/extract-symptoms
 * Extract structured symptoms from free-text patient input
 * Used in booking flow to suggest specialty and visit type
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { executeAI, SymptomExtractionOutput } from '@/lib/ai';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { freeText, patientAge, patientGender, language = 'fr' } = body;

    if (!freeText || freeText.trim().length < 5) {
      return NextResponse.json(
        { error: 'Please describe your symptoms in more detail' },
        { status: 400 }
      );
    }

    // Get patient profile for context
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, date_of_birth, gender, allergies, chronic_conditions')
      .eq('id', user.id)
      .single();

    // Calculate age if not provided
    let age = patientAge;
    if (!age && profile?.date_of_birth) {
      const birthDate = new Date(profile.date_of_birth);
      age = Math.floor((Date.now() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
    }

    const response = await executeAI<SymptomExtractionOutput>({
      skill: 'extract_symptoms',
      input: {
        freeText,
        patientAge: age,
        patientGender: patientGender || profile?.gender,
      },
      userId: user.id,
      userRole: 'patient',
      language,
      context: {
        patientId: user.id,
        patientHistory: {
          profile,
          allergies: profile?.allergies || [],
          conditions: profile?.chronic_conditions || [],
        },
      },
    });

    return NextResponse.json(response);

  } catch (error: any) {
    console.error('[AI extract-symptoms] Error:', error);
    return NextResponse.json(
      { error: 'Failed to analyze symptoms' },
      { status: 500 }
    );
  }
}
