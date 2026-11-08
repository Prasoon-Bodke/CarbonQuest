/**
 * Authentication client for CarbonQuest.
 *
 * Architecture:
 * - If Supabase credentials (NEXT_PUBLIC_SUPABASE_URL & NEXT_PUBLIC_SUPABASE_ANON_KEY) are configured,
 *   uses @supabase/supabase-js for authentication, capturing the session JWT.
 * - If Supabase credentials are not configured, uses the FastAPI backend authentication service (/api/v1/auth)
 *   which issues signed Supabase-compatible JWTs validated by FastAPI's security middleware.
 * - Either way, the access JWT is stored in memory and synchronized with localStorage ('carbonquest_auth_token')
 *   to guarantee session persistence across page refreshes.
 *
 * Rule: The frontend NEVER queries database tables directly; all access is via FastAPI REST /api/v1.
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { api } from "@/lib/api/endpoints";

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

export const isSupabaseConfigured = Boolean(
  SUPABASE_URL &&
    SUPABASE_ANON_KEY &&
    !SUPABASE_URL.includes("placeholder") &&
    SUPABASE_URL.startsWith("http")
);

// Lazy singleton Supabase client if configured
let supabaseInstance: SupabaseClient | null = null;
if (isSupabaseConfigured) {
  try {
    supabaseInstance = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  } catch (err) {
    console.warn("Failed to initialize Supabase client:", err);
    supabaseInstance = null;
  }
}

export const supabase = supabaseInstance;

const TOKEN_STORAGE_KEY = "carbonquest_auth_token";
const USER_STORAGE_KEY = "carbonquest_auth_user";

// In-memory token cache
let cachedToken: string | null = null;

export function setAuthToken(token: string | null) {
  cachedToken = token;
  if (typeof window !== "undefined") {
    try {
      if (token) {
        window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
      } else {
        window.localStorage.removeItem(TOKEN_STORAGE_KEY);
        window.localStorage.removeItem(USER_STORAGE_KEY);
      }
    } catch {
      // Ignore storage errors in private browsing / SSR
    }
  }
}

export function getAuthToken(): string | null {
  if (cachedToken) {
    return cachedToken;
  }
  if (typeof window !== "undefined") {
    try {
      const stored = window.localStorage.getItem(TOKEN_STORAGE_KEY);
      if (stored) {
        cachedToken = stored;
        return stored;
      }
    } catch {
      // Ignore storage errors
    }
  }
  return null;
}

export function clearAuthToken() {
  setAuthToken(null);
}

export interface StoredUser {
  id?: string;
  email?: string;
  display_name?: string | null;
  onboarding_done?: boolean;
}

export function getStoredUser(): StoredUser | null {
  if (typeof window !== "undefined") {
    try {
      const stored = window.localStorage.getItem(USER_STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }
  return null;
}

export function setStoredUser(user: StoredUser | null) {
  if (typeof window !== "undefined") {
    try {
      if (user) {
        window.localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
      } else {
        window.localStorage.removeItem(USER_STORAGE_KEY);
      }
    } catch {
      // Ignore
    }
  }
}

/**
 * Unified Authentication Service providing identical API across Supabase and Backend Dev Auth.
 */
export const authService = {
  isConfiguredWithSupabase: () => isSupabaseConfigured && Boolean(supabase),

  async signUp(email: string, password: string, displayName?: string) {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { display_name: displayName || email.split("@")[0] },
        },
      });
      if (error) throw new Error(error.message);
      if (data.session?.access_token) {
        setAuthToken(data.session.access_token);
        setStoredUser({
          id: data.user?.id,
          email: data.user?.email,
          display_name: displayName,
        });
      }
      return {
        token: data.session?.access_token || null,
        user: data.user,
        requiresConfirmation: !data.session,
      };
    } else {
      // Local FastAPI Auth
      const res = await api.auth.signup({
        email,
        password,
        display_name: displayName,
      });
      setAuthToken(res.access_token);
      setStoredUser(res.user);
      return {
        token: res.access_token,
        user: res.user,
        requiresConfirmation: false,
      };
    }
  },

  async signIn(email: string, password: string) {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw new Error(error.message);
      if (data.session?.access_token) {
        setAuthToken(data.session.access_token);
        setStoredUser({
          id: data.user?.id,
          email: data.user?.email,
          display_name: data.user?.user_metadata?.display_name,
        });
      }
      return {
        token: data.session?.access_token || null,
        user: data.user,
      };
    } else {
      // Local FastAPI Auth
      const res = await api.auth.login({
        email,
        password,
      });
      setAuthToken(res.access_token);
      setStoredUser(res.user);
      return {
        token: res.access_token,
        user: res.user,
      };
    }
  },

  async signInDemo() {
    // Demo login always uses the seeded Prasoon Bodke profile via FastAPI /auth/demo
    const res = await api.auth.demo();
    setAuthToken(res.access_token);
    setStoredUser(res.user);
    return {
      token: res.access_token,
      user: res.user,
    };
  },

  async signOut() {
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.auth.signOut();
      } catch (err) {
        console.warn("Supabase sign out error:", err);
      }
    }
    clearAuthToken();
    setStoredUser(null);
  },

  async initSession() {
    if (isSupabaseConfigured && supabase) {
      const { data } = await supabase.auth.getSession();
      if (data.session?.access_token) {
        setAuthToken(data.session.access_token);
        setStoredUser({
          id: data.session.user?.id,
          email: data.session.user?.email,
          display_name: data.session.user?.user_metadata?.display_name,
        });
        return data.session.access_token;
      }
    }
    return getAuthToken();
  },
};
