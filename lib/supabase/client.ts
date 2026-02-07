import { createBrowserClient as createSupabaseBrowserClient } from "@supabase/ssr";
import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

export function createClient() {
  if (client) return client;
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('[CRITICAL] Missing Supabase environment variables:', {
      hasUrl: !!supabaseUrl,
      hasKey: !!supabaseAnonKey,
      nodeEnv: process.env.NODE_ENV,
    });
    client = createSupabaseClient(
      'https://placeholder.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder',
    ) as SupabaseClient;
    return client;
  }

  // CRITICAL: Always use @supabase/ssr createBrowserClient with cookies.
  // Do NOT fall back to createSupabaseClient - that uses localStorage, which breaks
  // PKCE: code_verifier is stored in localStorage but server/callback expects cookies.
  client = createSupabaseBrowserClient(supabaseUrl, supabaseAnonKey, {
    cookieOptions: {
      path: '/',
      sameSite: 'lax',
      secure: typeof window !== 'undefined' && window.location?.protocol === 'https:',
    },
  }) as SupabaseClient;
  
  return client;
}

// Alias for consistency with common naming patterns
export const createBrowserClient = createClient;
