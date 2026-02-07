import { createBrowserClient as createSupabaseBrowserClient } from "@supabase/ssr";
import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";

// Don't cache the client - recreate each time to handle SSR properly
export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('[CRITICAL] Missing Supabase environment variables:', {
      hasUrl: !!supabaseUrl,
      hasKey: !!supabaseAnonKey,
      nodeEnv: process.env.NODE_ENV,
    });
    // Use @supabase/supabase-js directly as fallback (accepts any URL)
    return createSupabaseClient(
      'https://placeholder.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder',
    ) as SupabaseClient;
  }

  // Check if we're in the browser
  const isBrowser = typeof window !== 'undefined';

  try {
    // Only use cookie storage when in browser for PKCE flow
    if (isBrowser) {
      return createSupabaseBrowserClient(supabaseUrl, supabaseAnonKey, {
        cookies: {
          getAll() {
            return document.cookie.split(';').map(cookie => {
              const [name, ...rest] = cookie.trim().split('=');
              return { name, value: rest.join('=') };
            });
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              let cookie = `${name}=${value}`;
              if (options?.maxAge) cookie += `; max-age=${options.maxAge}`;
              if (options?.path) cookie += `; path=${options.path}`;
              if (options?.domain) cookie += `; domain=${options.domain}`;
              if (options?.sameSite) cookie += `; samesite=${options.sameSite}`;
              if (options?.secure) cookie += '; secure';
              document.cookie = cookie;
            });
          },
        },
      }) as SupabaseClient;
    } else {
      // For SSR, use the basic client
      return createSupabaseClient(supabaseUrl, supabaseAnonKey) as SupabaseClient;
    }
  } catch {
    // Fallback if SSR browser client throws
    return createSupabaseClient(supabaseUrl, supabaseAnonKey) as SupabaseClient;
  }
}

// Alias for consistency with common naming patterns
export const createBrowserClient = createClient;
