import { createServerClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

/**
 * GET /api/documents/lab-results
 * Returns lab results for the authenticated patient.
 * Lab results are automatically created when a laboratory fulfills a lab request.
 * Used by the Documents page to show lab results in the "lab" tab.
 */
export async function GET() {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Patient id = auth user id (profiles.id = auth.users.id)
    const patientId = user.id

    // Fetch lab_results (when lab fulfills, a row is created here)
    const { data: labResults, error } = await supabase
      .from('lab_results')
      .select(`
        id,
        request_id,
        result_pdf_url,
        result_data,
        created_at,
        request:lab_test_requests!request_id(
          request_number,
          completed_at,
          appointment_id,
          laboratory:professionals!laboratory_id(business_name)
        )
      `)
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false })

    // If lab_results table doesn't have patient_id or doesn't exist, fall back to lab_test_requests only
    let fromLabResults = labResults ?? []
    if (error) {
      console.warn('[documents/lab-results] lab_results query failed, using lab_test_requests only:', error.message)
      fromLabResults = []
    }

    // Also fetch completed lab_test_requests (primary source when lab_results lacks patient_id)
    // (e.g. if insert failed or schema differs) - use as fallback for display
    const { data: requestsWithAppt } = await supabase
      .from('lab_test_requests')
      .select('id, request_number, completed_at, lab_fulfillment, appointment_id, laboratory:professionals!laboratory_id(business_name)')
      .eq('patient_id', patientId)
      .in('status', ['completed', 'fulfilled'])
      .order('completed_at', { ascending: false })

    // Build unified list: prefer lab_results, add completed requests that don't have lab_results
    const resultIds = new Set(fromLabResults.map((r: { request_id: string }) => r.request_id))
    const fromRequests = (requestsWithAppt ?? [])
      .filter((r: { id: string }) => !resultIds.has(r.id))
      .map((r: { id: string; request_number: string; completed_at: string; lab_fulfillment: unknown; appointment_id: string | null; laboratory: { business_name: string } | null }) => ({
        id: r.id,
        request_id: r.id,
        result_pdf_url: null,
        result_data: r.lab_fulfillment ? { lab_fulfillment: r.lab_fulfillment } : null,
        created_at: r.completed_at,
        request: {
          request_number: r.request_number,
          completed_at: r.completed_at,
          appointment_id: r.appointment_id,
          laboratory: r.laboratory,
        },
      }))

    const all = [...fromLabResults, ...fromRequests]
    all.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

    return NextResponse.json({ labResults: all })
  } catch (e) {
    console.error('[documents/lab-results] Error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
