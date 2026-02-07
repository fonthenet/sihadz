import { createBrowserClient as createSupabaseBrowserClient } from "@supabase/ssr";
import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";
import * as cookie from "cookie";

let client: SupabaseClient | null = null;

function isCodeVerifierName(name: string): boolean {
  return name.includes("-code-verifier");
}

/**
 * Custom cookies for @supabase/ssr that mirror PKCE code verifier to sessionStorage.
 * Cookies can fail in production (e.g. cross-subdomain, strict browsers).
 * sessionStorage reliably persists across OAuth redirect in same tab.
 */
function createPkceCookies() {
  const defaults = {
    path: "/",
    sameSite: "lax" as const,
    secure: typeof window !== "undefined" && window.location?.protocol === "https:",
  };

  return {
    getAll: () => {
      const parsed = cookie.parse(typeof document !== "undefined" ? document.cookie : "");
      const list = Object.keys(parsed).map((name) => ({ name, value: parsed[name] ?? "" }));
      // Fallback: code verifier from sessionStorage when cookie missing (production edge cases)
      if (typeof window !== "undefined") {
        for (const key of Object.keys(window.sessionStorage)) {
          if (isCodeVerifierName(key) && !list.some((c) => c.name === key || c.name.startsWith(key + "."))) {
            const v = window.sessionStorage.getItem(key);
            if (v) list.push({ name: key, value: v });
          }
        }
      }
      return list;
    },
    setAll: (cookiesToSet: { name: string; value: string; options?: object }[]) => {
      if (typeof document === "undefined") return;
      cookiesToSet.forEach(({ name, value, options }) => {
        const opts = { ...defaults, ...options };
        document.cookie = cookie.serialize(name, value, opts);
        if (isCodeVerifierName(name)) {
          try {
            window.sessionStorage.setItem(name, value);
          } catch {
            // ignore
          }
        }
      });
    },
  };
}

export function createClient() {
  if (client) return client;

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

  // Use @supabase/ssr (recommended) with custom cookies that mirror PKCE code verifier to sessionStorage.
  const pkceCookies = createPkceCookies();

  client = createSupabaseBrowserClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll: pkceCookies.getAll,
      setAll: pkceCookies.setAll,
    },
    cookieOptions: {
      path: "/",
      sameSite: "lax",
      secure: typeof window !== "undefined" && window.location?.protocol === "https:",
    },
  }) as SupabaseClient;

  return client;
}

// Alias for consistency with common naming patterns
export const createBrowserClient = createClient;
