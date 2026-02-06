import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

/**
 * Look up a practice by its code
 * Used during employee login to verify and display practice info
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')

    if (!code) {
      return NextResponse.json(
        { error: 'Practice code is required' },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()

    const { data: professional, error } = await supabase
      .from('professionals')
      .select('id, business_name, type, practice_code')
      .eq('practice_code', code.toUpperCase())
      .single()

    if (error || !professional) {
      return NextResponse.json(
        { error: 'Practice not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      id: professional.id,
      businessName: professional.business_name,
      type: professional.type,
      practiceCode: professional.practice_code,
    })
  } catch (error) {
    console.error('Practice lookup error:', error)
    return NextResponse.json(
      { error: 'An error occurred' },
      { status: 500 }
    )
  }
}
