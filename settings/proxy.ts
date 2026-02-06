import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh session if expired
  const { data: { user } } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname

  // Public routes that don't need auth
  const publicRoutes = [
    '/',
    '/login',
    '/register',
    '/auth/callback',
    '/auth/reset-password',
    '/forgot-password',
    '/professional/auth/login',
    '/professional/auth/signup',
    '/professional/auth/signup/success',
    '/doctors',
    '/pharmacies',
    '/laboratories',
    '/clinics',
    '/nurses',
    '/ambulances',
    '/book',
  ]

  // Check if route is public
  const isPublicRoute = publicRoutes.some(route => 
    pathname === route || pathname.startsWith(`${route}/`)
  )

  // If not authenticated and trying to access protected route
  if (!user && !isPublicRoute) {
    // Check if trying to access professional routes
    if (pathname.startsWith('/professional')) {
      return NextResponse.redirect(new URL('/professional/auth/login', request.url))
    }
    // Check if trying to access super-admin routes
    if (pathname.startsWith('/super-admin')) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    // Check if trying to access patient dashboard
    if (pathname.startsWith('/dashboard')) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    return supabaseResponse
  }

  // If authenticated, check role-based access
  if (user) {
    // Super admin emails list - must match auth/callback/route.ts
    const SUPER_ADMIN_EMAILS = [
      'f.onthenet@gmail.com',
      'info@sihadz.com',
    ]
    const isSuperAdmin = SUPER_ADMIN_EMAILS.includes(user.email || '')

    // Check if user is a professional - use maybeSingle() to handle no results gracefully
    const { data: professional } = await supabase
      .from('professionals')
      .select('id, type, status')
      .eq('auth_user_id', user.id)
      .maybeSingle()

    // SUPER ADMIN PROTECTION
    if (pathname.startsWith('/super-admin')) {
      if (!isSuperAdmin) {
        // Not a super admin - redirect to appropriate dashboard
        if (professional) {
          return NextResponse.redirect(new URL('/professional/dashboard', request.url))
        }
        return NextResponse.redirect(new URL('/dashboard', request.url))
      }
    }

    // PROFESSIONAL ROUTE PROTECTION
    if (pathname.startsWith('/professional') && !pathname.startsWith('/professional/auth')) {
      // Only professionals can access professional routes (except auth routes)
      if (!professional) {
        // Not a professional - redirect to patient dashboard
        return NextResponse.redirect(new URL('/dashboard', request.url))
      }
    }

    // PATIENT DASHBOARD PROTECTION
    if (pathname === '/dashboard' || pathname.startsWith('/dashboard/')) {
      // Professionals should not access patient dashboard
      if (professional) {
        return NextResponse.redirect(new URL('/professional/dashboard', request.url))
      }
      // Super admins should not access patient dashboard
      if (isSuperAdmin) {
        return NextResponse.redirect(new URL('/super-admin', request.url))
      }
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     * - api routes (they have their own auth)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$|api).*)',
  ],
}
