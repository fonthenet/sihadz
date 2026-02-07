import { createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'
import { getLabRequestPrintHtml } from '@/lib/print-prescription-lab'

export const runtime = "nodejs"
export const dynamic = "force-dynamic"


function buildLabRequestFromLabResult(lr: {
  request_id: string
  patient_id: string
  laboratory_id: string
  result_data: unknown
  created_at: string
}) {
  const data = lr.result_data as { lab_fulfillment?: Array<{ test_name?: string; result_value?: string; result_unit?: string; reference_range?: string; item_id?: string }> } | null
  const fulfillment = data?.lab_fulfillment ?? []
  const items = fulfillment
    .filter((f) => f.test_name || f.result_value)
    .map((f, i) => ({
      id: f.item_id || `gen-${i}`,
      result_value: f.result_value,
      result_unit: f.result_unit,
      reference_range: f.reference_range,
      test_type: { name: f.test_name || 'Test', category: '—' },
    }))
  return {
    id: lr.request_id,
    request_number: lr.request_id.slice(0, 8),
    lab_fulfillment: fulfillment,
    laboratory_id: lr.laboratory_id,
    patient_id: lr.patient_id,
    family_member_id: null,
    created_at: lr.created_at,
    completed_at: lr.created_at,
    result_data: data,
    laboratory: null,
    items,
  }
}

/**
 * GET /api/documents/lab-results/[requestId]/view
 * Returns HTML lab report for the patient to view/print.
 * Verifies patient ownership before serving.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ requestId: string }> }
) {
  try {
    const { requestId } = await params
    const ticketId = request.nextUrl?.searchParams?.get('ticketId')
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return new NextResponse('Unauthorized', { status: 401, headers: { 'Content-Type': 'text/html' } })
    }

    const admin = createAdminClient()

    let allowByTicket = false
    if (ticketId) {
      const { data: ticket } = await admin.from('healthcare_tickets').select('patient_id, primary_provider_id, secondary_provider_id, primary_doctor_id, pharmacy_id, laboratory_id').eq('id', ticketId).maybeSingle()
      if (ticket) {
        const t = ticket as { patient_id?: string; primary_provider_id?: string; secondary_provider_id?: string; primary_doctor_id?: string; pharmacy_id?: string; laboratory_id?: string }
        const providerIds = [t.primary_provider_id, t.secondary_provider_id, t.primary_doctor_id, t.pharmacy_id, t.laboratory_id].filter(Boolean) as string[]
        const uniqueIds = [...new Set(providerIds)]
        let isProvider = false
        for (const profId of uniqueIds) {
          const { data: prof } = await admin.from('professionals').select('auth_user_id').eq('id', profId).maybeSingle()
          if ((prof as { auth_user_id?: string })?.auth_user_id === user.id) {
            isProvider = true
            break
          }
        }
        allowByTicket = t.patient_id === user.id || isProvider
      }
    }

    // Try lab_test_requests first (primary source)
    let { data: labRequest, error } = await admin
      .from('lab_test_requests')
      .select(`
        id, request_number, lab_fulfillment, laboratory_id, patient_id, family_member_id,
        created_at, completed_at, result_data,
        laboratory:professionals!laboratory_id(id, business_name, lab_report_template),
        items:lab_test_items(
          id, result_value, result_unit, reference_range, result_status, lab_notes, completed_at,
          test_type:lab_test_types(id, name, name_ar, category)
        )
      `)
      .eq('id', requestId)
      .maybeSingle()

    // Fallback 1: lab_requests table (old MASTER-SETUP schema) - lab_results references this
    if ((error || !labRequest) && requestId) {
      const { data: oldLabRequest } = await admin.from('lab_requests').select('id, request_number, patient_id, laboratory_id, created_at, completed_at, clinical_notes, tests').eq('id', requestId).maybeSingle()
      if (oldLabRequest && (oldLabRequest as { patient_id?: string }).patient_id === user.id) {
        const { data: oldResults } = await admin.from('lab_results').select('test_name, result_value, unit, reference_range, is_abnormal').eq('request_id', requestId).order('created_at')
        const tests = (oldLabRequest as { tests?: Array<{ name?: string }> }).tests || []
        const resultRows = (oldResults || []) as Array<{ test_name: string; result_value?: string; unit?: string; reference_range?: string }>
        const items = resultRows.length > 0
          ? resultRows.map((r, i) => ({ id: `old-${i}`, result_value: r.result_value, result_unit: r.unit, reference_range: r.reference_range, test_type: { name: r.test_name, category: '—' } }))
          : tests.map((t: { name?: string }, i: number) => ({ id: `t-${i}`, test_type: { name: (t as { name?: string }).name || 'Test', category: '—' } }))
        labRequest = {
          id: (oldLabRequest as { id: string }).id,
          request_number: (oldLabRequest as { request_number?: string }).request_number || requestId.slice(0, 8),
          lab_fulfillment: resultRows.map((r, i) => ({ item_id: `old-${i}`, result_value: r.result_value, result_unit: r.unit, reference_range: r.reference_range })),
          laboratory_id: (oldLabRequest as { laboratory_id?: string }).laboratory_id,
          patient_id: (oldLabRequest as { patient_id: string }).patient_id,
          family_member_id: null,
          created_at: (oldLabRequest as { created_at: string }).created_at,
          completed_at: (oldLabRequest as { completed_at?: string }).completed_at || (oldLabRequest as { created_at: string }).created_at,
          laboratory: null,
          items,
        }
        error = null
      }
    }

    // Fallback 2: lab_results (new schema) -> lab_test_requests via request_id
    if ((error || !labRequest) && requestId) {
      const byRequestId = await admin.from('lab_results').select('id, request_id, patient_id, laboratory_id, result_data, created_at').eq('request_id', requestId).limit(1).maybeSingle()
      let labResultRow = byRequestId.data as { request_id: string; patient_id?: string; laboratory_id?: string; result_data?: unknown; created_at: string } | null
      if (!labResultRow) {
        const byId = await admin.from('lab_results').select('id, request_id, patient_id, laboratory_id, result_data, created_at').eq('id', requestId).maybeSingle()
        labResultRow = byId.data as typeof labResultRow
      }
      if (labResultRow && (labResultRow.patient_id === user.id || !labResultRow.patient_id)) {
        const res = await admin.from('lab_test_requests').select(`
          id, request_number, lab_fulfillment, laboratory_id, patient_id, family_member_id,
          created_at, completed_at, result_data,
          laboratory:professionals!laboratory_id(id, business_name, lab_report_template),
          items:lab_test_items(
            id, result_value, result_unit, reference_range, result_status, lab_notes, completed_at,
            test_type:lab_test_types(id, name, name_ar, category)
          )
        `).eq('id', labResultRow.request_id).maybeSingle()
        if (res.data) {
          labRequest = res.data
          error = null
        } else if (labResultRow.result_data && labResultRow.patient_id === user.id) {
          labRequest = buildLabRequestFromLabResult({ ...labResultRow, patient_id: labResultRow.patient_id || user.id, laboratory_id: labResultRow.laboratory_id || '' })
          error = null
        }
      }
    }

    if (error || !labRequest) {
      return new NextResponse('<html><body><h1>Lab report not found</h1></body></html>', {
        status: 404,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      })
    }

    // Verify patient ownership or ticket participant access
    const patientId = (labRequest as { patient_id?: string }).patient_id
    if (!allowByTicket && patientId !== user.id) {
      // Check if user is guardian of family member
      if ((labRequest as { family_member_id?: string }).family_member_id) {
        const { data: fm } = await admin
          .from('family_members')
          .select('guardian_user_id')
          .eq('id', (labRequest as { family_member_id: string }).family_member_id)
          .maybeSingle()
        if (!fm || (fm as { guardian_user_id?: string }).guardian_user_id !== user.id) {
          return new NextResponse('<html><body><h1>Access denied</h1></body></html>', {
            status: 403,
            headers: { 'Content-Type': 'text/html; charset=utf-8' },
          })
        }
      } else {
        return new NextResponse('<html><body><h1>Access denied</h1></body></html>', {
          status: 403,
          headers: { 'Content-Type': 'text/html; charset=utf-8' },
        })
      }
    }

    // Fetch patient info for report
    const { data: patientProfile } = await admin
      .from('profiles')
      .select('full_name')
      .eq('id', patientId)
      .maybeSingle()

    const labWithPatient = {
      ...labRequest,
      patient: patientProfile ? { full_name: patientProfile.full_name } : { full_name: 'Patient' },
    }

    // Fetch lab branding for template
    let labReportTemplate = null
    const labId = (labRequest as { laboratory_id?: string }).laboratory_id
    if (labId) {
      const { data: labProf } = await admin
        .from('professionals')
        .select('lab_report_template, business_name')
        .eq('id', labId)
        .maybeSingle()
      if (labProf?.lab_report_template) {
        labReportTemplate = (labProf.lab_report_template as Record<string, unknown>) || {}
        if (!(labReportTemplate as { labName?: string }).labName && labProf.business_name) {
          (labReportTemplate as { labName: string }).labName = labProf.business_name
        }
      }
    }
    if (!labReportTemplate && (labRequest as { laboratory?: { business_name?: string } }).laboratory?.business_name) {
      labReportTemplate = { labName: (labRequest as { laboratory: { business_name: string } }).laboratory.business_name }
    }

    const baseUrl = request.nextUrl?.origin || ''
    const html = getLabRequestPrintHtml(labWithPatient, null, {
      labReportTemplate,
      reportId: requestId,
      baseUrl,
    })

    const forceDownload = request.nextUrl?.searchParams?.get('download') === '1'
    const headers: Record<string, string> = {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'private, no-cache',
    }
    if (forceDownload) {
      headers['Content-Disposition'] = `attachment; filename="lab-results-${requestId.slice(0, 8)}.html"`
    }

    // Add print script so user can Save as PDF (only when not downloading)
    const printScript = forceDownload ? '' : `
<script>
(function() {
  function doPrint() {
    try { window.print(); } catch (e) {}
    window.onafterprint = function() { try { window.close(); } catch (e) {} };
  }
  if (document.readyState === 'complete') setTimeout(doPrint, 300);
  else window.addEventListener('load', function() { setTimeout(doPrint, 300); });
})();
</script>`
    const fullHtml = printScript ? html.replace('</body>', printScript + '\n</body>') : html

    return new NextResponse(fullHtml, {
      status: 200,
      headers,
    })
  } catch (e) {
    console.error('[documents/lab-results/view] Error:', e)
    return new NextResponse('<html><body><h1>Error loading lab report</h1></body></html>', {
      status: 500,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
  }
}
