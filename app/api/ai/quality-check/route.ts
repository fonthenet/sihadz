/**
 * POST /api/ai/quality-check
 * Validate lab results before release
 * For laboratory quality control
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { executeAI, QualityCheckOutput } from '@/lib/ai';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user is a lab professional
    const admin = createAdminClient();
    const { data: prof } = await admin
      .from('professionals')
      .select('id, type')
      .eq('auth_user_id', user.id)
      .single();

    if (!prof || prof.type !== 'laboratory') {
      return NextResponse.json({ error: 'Access denied. Laboratory professionals only.' }, { status: 403 });
    }

    const body = await request.json();
    const { results, labResultId, patientId, language = 'fr' } = body;

    if (!results || !Array.isArray(results) || results.length === 0) {
      return NextResponse.json(
        { error: 'Lab results are required' },
        { status: 400 }
      );
    }

    // Get previous results for delta check if patientId provided
    let previousResults: any[] = [];
    if (patientId) {
      const { data: prevData } = await admin
        .from('lab_results')
        .select('results, created_at')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false })
        .limit(5);

      if (prevData) {
        previousResults = prevData.flatMap((lr: any) => {
          if (!lr.results) return [];
          return lr.results.map((r: any) => ({
            testName: r.test_name || r.name,
            value: r.value,
            date: lr.created_at,
          }));
        });
      }
    }

    const response = await executeAI<QualityCheckOutput>({
      skill: 'quality_check',
      input: {
        results: results.map((r: any) => ({
          testName: r.test_name || r.name || r.testName,
          value: r.value,
          unit: r.unit,
          referenceRange: r.reference_range || r.referenceRange,
        })),
        previousResults,
      },
      userId: user.id,
      userRole: 'lab',
      language,
      context: {
        providerId: prof.id,
        patientId,
      },
    });

    return NextResponse.json(response);

  } catch (error: any) {
    console.error('[AI quality-check] Error:', error);
    return NextResponse.json(
      { error: 'Failed to perform quality check' },
      { status: 500 }
    );
  }
}
