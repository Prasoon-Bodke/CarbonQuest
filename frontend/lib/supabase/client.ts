/**
 * Supabase client configuration for authentication only.
 * The frontend authenticates through Supabase Auth and passes the session JWT
 * to the FastAPI backend via Authorization: Bearer <token>.
 *
 * Rule: The frontend NEVER queries database tables directly.
 */

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

// Session token helper (integrates with Supabase Auth session)
let cachedToken: string | null = null;

export function setAuthToken(token: string | null) {
  cachedToken = token;
}

export function getAuthToken(): string | null {
  return cachedToken;
}
