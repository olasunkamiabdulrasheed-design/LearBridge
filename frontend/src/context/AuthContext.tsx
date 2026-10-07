import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { StudentProfile, User } from "../types/domain";
import { ApiError, clearTokens, getAccessToken } from "../services/apiClient";
import { fetchMe, login as apiLogin, refreshAccess, register as apiRegister } from "../services/auth";

interface AuthContextValue {
  user: User | null;
  profile: StudentProfile | null;
  isAuthenticated: boolean;
  initializing: boolean;
  authError: string | null;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  reloadProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const loadMe = useCallback(async () => {
    const me = await fetchMe();
    setUser(me.user);
    setProfile(me.profile);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!getAccessToken()) {
        setInitializing(false);
        return;
      }
      try {
        await loadMe();
      } catch (e) {
        if (e instanceof ApiError && e.status === 401) {
          try {
            await refreshAccess();
            if (!cancelled) await loadMe();
          } catch {
            clearTokens();
          }
        } else {
          clearTokens();
        }
      } finally {
        if (!cancelled) setInitializing(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadMe]);

  const login = useCallback(
    async (username: string, password: string) => {
      setAuthError(null);
      try {
        await apiLogin(username, password);
        await loadMe();
      } catch (e) {
        setAuthError(e instanceof Error ? e.message : "Login failed.");
        throw e;
      }
    },
    [loadMe],
  );

  const register = useCallback(
    async (username: string, email: string, password: string) => {
      setAuthError(null);
      try {
        await apiRegister(username, email, password);
        await loadMe();
      } catch (e) {
        setAuthError(e instanceof Error ? e.message : "Registration failed.");
        throw e;
      }
    },
    [loadMe],
  );

  const logout = useCallback(() => {
    clearTokens();
    setUser(null);
    setProfile(null);
  }, []);

  const reloadProfile = useCallback(async () => {
    await loadMe();
  }, [loadMe]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      profile,
      isAuthenticated: user !== null,
      initializing,
      authError,
      login,
      register,
      logout,
      reloadProfile,
    }),
    [user, profile, initializing, authError, login, register, logout, reloadProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider.");
  return ctx;
}
