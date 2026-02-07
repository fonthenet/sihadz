import { createBrowserClient as createBrowserClientSSR } from "@supabase/ssr";
import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";

// Create a singleton client
let client: SupabaseClient | null = null;

export function createClient() {
  // Only cache in browser
  if (client && typeof window !== 'undefined') return client;
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('[CRITICAL] Missing Supabase environment variables:', {
      hasUrl: !!supabaseUrl,
      hasKey: !!supabaseAnonKey,
      nodeEnv: process.env.NODE_ENV,
    });
    // Use @supabase/supabase-js directly as fallback (accepts any URL)
    client = createSupabaseClient(
      'https://placeholder.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder',
    ) as SupabaseClient;
    return client;
  }

  // Check if we're in browser environment
  if (typeof window !== 'undefined') {
    // Use @supabase/ssr browser client with cookie storage for PKCE flow
    // This ensures PKCE verifier is stored in cookies accessible by server
    client = createBrowserClientSSR(supabaseUrl, supabaseAnonKey, {
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
    // For SSR, use basic client (shouldn't be called, but fallback)
    client = createSupabaseClient(supabaseUrl, supabaseAnonKey) as SupabaseClient;
  }
  
  return client;
}

// Alias for consistency with common naming patterns
export const createBrowserClient = createClient;
