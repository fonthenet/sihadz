import { createBrowserClient as createBrowserClientSSR } from "@supabase/ssr";
import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

export function createClient() {
  if (client && typeof window !== "undefined") return client;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("[CRITICAL] Missing Supabase environment variables:", {
      hasUrl: !!supabaseUrl,
      hasKey: !!supabaseAnonKey,
      nodeEnv: process.env.NODE_ENV,
    });
    client = createSupabaseClient(
      "https://placeholder.supabase.co",
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder"
    ) as SupabaseClient;
    return client;
  }

  if (typeof window !== "undefined") {
    // @supabase/ssr with explicit cookie storage for PKCE flow
    // Ensures PKCE verifier is stored in cookies accessible across OAuth redirect
    client = createBrowserClientSSR(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return document.cookie.split(";").map((cookie) => {
            const [name, ...rest] = cookie.trim().split("=");
            return { name, value: rest.join("=") };
          });
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            let cookie = `${name}=${value}`;
            if (options?.maxAge) cookie += `; max-age=${options.maxAge}`;
            if (options?.path) cookie += `; path=${options.path}`;
            if (options?.domain) cookie += `; domain=${options.domain}`;
            if (options?.sameSite) cookie += `; samesite=${options.sameSite}`;
            if (options?.secure) cookie += "; secure";
            document.cookie = cookie;
          });
        },
      },
    }) as SupabaseClient;
  } else {
    client = createSupabaseClient(supabaseUrl, supabaseAnonKey) as SupabaseClient;
  }

  return client;
}

// Alias for consistency with common naming patterns
export const createBrowserClient = createClient;
