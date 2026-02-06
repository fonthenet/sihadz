import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const cookieStore = await cookies()
  
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Ignore
          }
        },
      },
    }
  )

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  console.log('[v0] Force admin - User check:', { 
    hasUser: !!user, 
    email: user?.email,
    authError: authError?.message 
  })
  
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
  
  console.log('[v0] Force admin - Authorization check:', {
    userEmail: user.email,
    isSuperAdmin,
    allowedEmails: SUPER_ADMIN_EMAILS
  })
  
  if (!isSuperAdmin) {
    return NextResponse.json({ 
      error: 'Not authorized',
      yourEmail: user.email,
      message: 'Your email is not in the super admin list'
    }, { status: 403 })
  }

  // Update profile to super_admin
  console.log('[v0] Force admin - Updating profile for:', user.id)
  
  const { error } = await supabase
    .from('profiles')
    .update({
      user_type: 'super_admin',
    })
    .eq('id', user.id)

  if (error) {
    console.error('[v0] Force admin - Profile update error:', error)
    return NextResponse.json({ 
      error: 'Failed to update profile',
      details: error.message 
    }, { status: 500 })
  }

  console.log('[v0] Force admin - Success! Redirecting to super-admin')

  // Redirect to super admin panel (use public origin when behind proxy)
  const { getRequestOrigin } = await import('@/lib/request-origin')
  const url = new URL('/super-admin', getRequestOrigin(request))
  return NextResponse.redirect(url)
}
