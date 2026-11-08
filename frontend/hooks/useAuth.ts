import * as React from "react";
import { api, ApiError } from "@/lib/api";
import {
  getAuthToken,
  setAuthToken,
  clearAuthToken,
  authService,
  getStoredUser,
  StoredUser,
} from "@/lib/supabase/client";
import type { ProfileRead } from "@/types";

/**
 * Authentication and session hook.
 * Manages user profile, tokens, login/signup/logout, and refresh persistence.
 */
export function useAuth() {
  const [token, setTokenState] = React.useState<string | null>(null);
  const [profile, setProfile] = React.useState<ProfileRead | null>(null);
  const [user, setUser] = React.useState<StoredUser | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  const refreshProfile = React.useCallback(async () => {
    const currentToken = getAuthToken();
    if (!currentToken) {
      setTokenState(null);
      setProfile(null);
      setUser(null);
      setIsLoading(false);
      return;
    }
    setTokenState(currentToken);
    setUser(getStoredUser());
    try {
      const data = await api.profile.get();
      setProfile(data);
    } catch (err) {
      if (err instanceof ApiError && err.isUnauthenticated) {
        clearAuthToken();
        setTokenState(null);
        setProfile(null);
        setUser(null);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    // Initial session load
    authService.initSession().then(() => {
      refreshProfile();
    });

    const handleUnauth = () => {
      setTokenState(null);
      setProfile(null);
      setUser(null);
    };

    window.addEventListener("carbonquest:unauthenticated", handleUnauth);
    return () => {
      window.removeEventListener("carbonquest:unauthenticated", handleUnauth);
    };
  }, [refreshProfile]);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const res = await authService.signIn(email, password);
      if (res.token) {
        setTokenState(res.token);
        setUser(getStoredUser());
        await refreshProfile();
      }
      return res;
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (email: string, password: string, displayName?: string) => {
    setIsLoading(true);
    try {
      const res = await authService.signUp(email, password, displayName);
      if (res.token) {
        setTokenState(res.token);
        setUser(getStoredUser());
        await refreshProfile();
      }
      return res;
    } finally {
      setIsLoading(false);
    }
  };

  const loginDemo = async () => {
    setIsLoading(true);
    try {
      const res = await authService.signInDemo();
      setTokenState(res.token);
      setUser(getStoredUser());
      await refreshProfile();
      return res;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    await authService.signOut();
    setTokenState(null);
    setProfile(null);
    setUser(null);
  };

  return {
    token,
    user,
    profile,
    isLoading,
    isAuthenticated: Boolean(token),
    login,
    signup,
    loginDemo,
    logout,
    refreshProfile,
  };
}
