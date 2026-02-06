import { createServerClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const supabase = await createServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  
  if (!user) {
    return NextResponse.json({ 
      error: 'Not logged in',
      details: authError?.message || 'No user session found'
    }, { status: 401 })
  }

  // Super admin emails list
  const SUPER_ADMIN_EMAILS = [
    'f.onthenet@gmail.com',
    'info@sihadz.com',
  ]
  
  const isSuperAdmin = SUPER_ADMIN_EMAILS.includes(user.email || '')
  
  
  if (!isSuperAdmin) {
    return NextResponse.json({ 
      error: 'Not authorized',
      yourEmail: user.email,
      message: 'Your email is not in the super admin list'
    }, { status: 403 })
  }

  // Update profile to super_admin
  
  const { error } = await supabase
    .from('profiles')
    .update({
      user_type: 'super_admin',
    })
    .eq('id', user.id)

  if (error) {
    return NextResponse.json({ 
      error: 'Failed to update profile',
      details: error.message 
    }, { status: 500 })
  }

  // Redirect to super admin panel (use public origin when behind proxy)
  const { getRequestOrigin } = await import('@/lib/request-origin')
  const url = new URL('/super-admin', getRequestOrigin(request))
  return NextResponse.redirect(url)
}
