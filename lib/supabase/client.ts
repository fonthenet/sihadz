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
    // Use @supabase/supabase-js directly as fallback (accepts any URL)
    client = createSupabaseClient(
      'https://placeholder.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder',
    ) as SupabaseClient;
    return client;
  }

  try {
    client = createSupabaseBrowserClient(supabaseUrl, supabaseAnonKey) as SupabaseClient;
  } catch {
    // Fallback if SSR browser client throws
    client = createSupabaseClient(supabaseUrl, supabaseAnonKey) as SupabaseClient;
  }
  
  return client;
}

// Alias for consistency with common naming patterns
export const createBrowserClient = createClient;
