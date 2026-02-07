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
    // @supabase/ssr with simple document.cookie–based storage for PKCE
    // Matches v0 fix: explicit getAll/setAll so verifier persists across OAuth redirect
    client = createBrowserClientSSR(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return document.cookie
            .split(";")
            .map((c) => {
              const [name, ...rest] = c.trim().split("=");
              return { name: name ?? "", value: rest.join("=").trim() || "" };
            })
            .filter((c) => c.name);
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            const opts = (options ?? {}) as { maxAge?: number; path?: string; domain?: string; sameSite?: string; secure?: boolean };
            let cookie = `${name}=${value}`;
            if (opts.maxAge != null) cookie += `; max-age=${opts.maxAge}`;
            if (opts.path) cookie += `; path=${opts.path}`;
            if (opts.domain) cookie += `; domain=${opts.domain}`;
            if (opts.sameSite) cookie += `; samesite=${opts.sameSite}`;
            if (opts.secure) cookie += "; secure";
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
