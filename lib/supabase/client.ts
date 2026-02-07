import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

export function createClient() {
  // Return cached client if it exists and we're in the browser
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

  // Use standard Supabase client which handles PKCE with localStorage automatically
  client = createSupabaseClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      // Use localStorage for PKCE flow (default, but being explicit)
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      flowType: 'pkce'
    }
  }) as SupabaseClient;
  
  return client;
}

// Alias for consistency with common naming patterns
export const createBrowserClient = createClient;
