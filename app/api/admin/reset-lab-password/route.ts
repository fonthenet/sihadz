import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const LAB_PROFESSIONAL_ID = '06f7299c-85f4-45f8-b8e2-af95484a5118' // Laboratoire d'Analyses Médicales Jijel Centre
const LAB_EMAIL = 'lam.jijel@lab.dz'
const NEW_PASSWORD = 'Rapgame.1987'

export async function POST() {
  try {
    const supabase = createAdminClient()

    const { data: prof, error: profError } = await supabase
      .from('professionals')
      .select('id, auth_user_id, business_name')
      .eq('id', LAB_PROFESSIONAL_ID)
      .single()

    if (profError || !prof) {
      return NextResponse.json(
        { error: 'Laboratory professional not found' },
        { status: 404 }
      )
    }

    if (prof.auth_user_id) {
      const { error: updateError } = await supabase.auth.admin.updateUserById(
        prof.auth_user_id,
        { password: NEW_PASSWORD }
      )
      if (updateError) {
        return NextResponse.json(
          { error: `Password update failed: ${updateError.message}` },
          { status: 500 }
        )
      }
      return NextResponse.json({
        success: true,
        message: `Password reset for ${prof.business_name} (${LAB_EMAIL})`,
      })
    }

    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: LAB_EMAIL,
      password: NEW_PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: prof.business_name, provider_type: 'laboratory' },
    })

    if (authError) {
      return NextResponse.json(
        { error: `Auth create failed: ${authError.message}` },
        { status: 500 }
      )
    }

    const { error: linkError } = await supabase
      .from('professionals')
      .update({ auth_user_id: authData.user.id })
      .eq('id', LAB_PROFESSIONAL_ID)

    if (linkError) {
      return NextResponse.json(
        { error: `Link to professional failed: ${linkError.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: `Account created and linked for ${prof.business_name}. Email: ${LAB_EMAIL}, password set.`,
    })
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message },
      { status: 500 }
    )
  }
}
