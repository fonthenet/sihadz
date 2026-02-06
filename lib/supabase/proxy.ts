import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    // Environment variables not available yet, allow request to proceed
    return supabaseResponse;
  }

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Public routes that should NEVER require authentication
  const publicPaths = ['/', '/search', '/pharmacies', '/labs', '/clinics', '/doctors', '/nurses', '/about', '/contact', '/login', '/signup', '/register'];
  const isPublicPath = publicPaths.some(path => request.nextUrl.pathname === path || request.nextUrl.pathname.startsWith(path + '/'));

  // If it's a public path, allow access immediately
  if (isPublicPath) {
    return supabaseResponse;
  }

  // Protected patient routes - redirect to patient login if not authenticated
  const protectedPatientPaths = ['/dashboard', '/settings', '/family', '/medical-records', '/notifications'];
  const isProtectedPatientPath = protectedPatientPaths.some(path => request.nextUrl.pathname.startsWith(path));

  // Protected professional routes - redirect to professional login if not authenticated
  const protectedProfessionalPaths = ['/professional/dashboard', '/professional/onboarding', '/professional/appointments', '/professional/patients'];
  const isProtectedProfessionalPath = protectedProfessionalPaths.some(path => request.nextUrl.pathname.startsWith(path));

  // Public professional auth pages - never redirect these
  const publicProfessionalAuthPaths = ['/professional/auth/login', '/professional/auth/signup'];
  const isProfessionalAuthPage = publicProfessionalAuthPaths.some(path => request.nextUrl.pathname.startsWith(path));

  if (isProtectedPatientPath && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set('redirect', request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  if (isProtectedProfessionalPath && !user && !isProfessionalAuthPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/professional/auth/login";
    url.searchParams.set('redirect', request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
