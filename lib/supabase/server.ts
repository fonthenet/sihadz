import { createServerClient as createServerClientSSR } from "@supabase/ssr";
import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

// Fallback client for build-time prerendering when env vars are unavailable
function createFallbackClient(): SupabaseClient {
  return createSupabaseClient(
    'https://placeholder.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder',
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

export async function createServerClient(): Promise<SupabaseClient> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('[CRITICAL] Missing Supabase environment variables in server client');
    return createFallbackClient();
  }

  try {
    const cookieStore = await cookies();

    return createServerClientSSR(
      supabaseUrl,
      supabaseAnonKey,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options),
              );
            } catch {
              // The "setAll" method was called from a Server Component.
              // This can be ignored if you have proxy refreshing user sessions.
            }
          },
        },
      },
    ) as unknown as SupabaseClient;
  } catch {
    // During build-time prerendering, cookies() or SSR client may throw
    return createFallbackClient();
  }
}

// Alias for backward compatibility
export { createServerClient as createClient };

// Admin client using service role key - bypasses RLS
// Only use on server-side for admin operations
export function createAdminClient(): SupabaseClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('[CRITICAL] Missing Supabase environment variables in admin client');
    // Return a dummy client that won't throw during build
    // This code path only runs at build time when env vars aren't available
    return createSupabaseClient(
      'https://placeholder.supabase.co',
      'placeholder-key',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );
  }

  return createSupabaseClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
