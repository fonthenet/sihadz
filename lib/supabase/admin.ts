import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Admin client using service role key - bypasses RLS
// Only use on server-side for admin operations
export function createAdminClient(): SupabaseClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('[CRITICAL] Missing Supabase environment variables in admin client:', {
      hasUrl: !!supabaseUrl,
      hasServiceKey: !!serviceRoleKey,
    });
  }

  return createClient(
    supabaseUrl || 'https://placeholder.supabase.co',
    serviceRoleKey || 'placeholder-key',
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
