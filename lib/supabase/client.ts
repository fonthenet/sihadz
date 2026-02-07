import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";
import { createPkceStorage } from "./pkce-storage";

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

  // PKCE fix: Use custom storage with sessionStorage fallback for code verifier.
  // Cookies can fail in some browsers (e.g. after logout, in-app browsers).
  // sessionStorage reliably persists across OAuth redirect in same tab.
  const storageKey =
    "sb-" + (supabaseUrl ? new URL(supabaseUrl).hostname.split(".")[0] : "auth") + "-auth-token";
  const { storage } = createPkceStorage(storageKey);

  const isBrowser = typeof window !== "undefined" && typeof window.document !== "undefined";

  client = createSupabaseClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      flowType: "pkce",
      autoRefreshToken: isBrowser,
      detectSessionInUrl: isBrowser,
      persistSession: true,
      storage,
      storageKey,
    },
  }) as SupabaseClient;
  
  return client;
}

// Alias for consistency with common naming patterns
export const createBrowserClient = createClient;
