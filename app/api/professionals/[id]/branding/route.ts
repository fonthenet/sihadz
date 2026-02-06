import { createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/professionals/[id]/branding
 * Returns document_template for a professional (for printing prescriptions/lab requests).
 * Authenticated professionals can read any professional's branding (it appears on printed docs).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: professionalId } = await params
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const admin = createAdminClient()
    const { data: prof, error } = await admin
      .from('professionals')
      .select('id, business_name, type, document_template, lab_report_template')
      .eq('id', professionalId)
      .maybeSingle()

    if (error || !prof) {
      return NextResponse.json({ error: 'Professional not found' }, { status: 404 })
    }

    const template = (prof.document_template as Record<string, unknown>) || {}
    const branding = {
      practiceName: template.practiceName ?? prof.business_name,
      headerText: template.headerText ?? '',
      logoUrl: template.logoUrl ?? '',
      footerText: template.footerText ?? '',
      tagline: template.tagline ?? '',
      signatureStyle: template.signatureStyle ?? 'none',
      signatureText: template.signatureText ?? '',
      signatureImageUrl: template.signatureImageUrl ?? '',
      primaryColor: template.primaryColor ?? undefined,
      fontFamily: template.fontFamily ?? undefined,
      formLayout: template.formLayout ?? 'table',
    }

    const labReportTemplate =
      (prof as { type?: string }).type === 'laboratory' && (prof as { lab_report_template?: unknown }).lab_report_template
        ? ((prof as { lab_report_template: Record<string, unknown> }).lab_report_template as Record<string, unknown>)
        : undefined

    return NextResponse.json({
      branding,
      ...(labReportTemplate && { labReportTemplate: labReportTemplate as object }),
    })
  } catch (e) {
    console.error('[professionals/branding] Error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
