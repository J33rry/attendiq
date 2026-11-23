"use client";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { authApi, UNAUTHORIZED_EVENT } from "@/lib/api";
import { resetThresholdCache } from "@/lib/hooks";
import { useToast } from "@/components/ui/Toast";

const AuthCtx = createContext(null);

/**
 * Who is signed in, according to the backend (GET /api/auth/me).
 * The session itself is the backend's httpOnly cookie — nothing is kept in storage here.
 * `user` is undefined while checking, null when signed out.
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined);
  const userRef = useRef(user);
  userRef.current = user;
  const router = useRouter();
  const pathname = usePathname();
  const toast = useToast();

  const refresh = useCallback(async () => {
    try {
      const { user } = await authApi.me();
      setUser(user);
      return user;
    } catch {
      setUser(null);
      return null;
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  // Any API call that returns 401 means the session expired or was revoked.
  useEffect(() => {
    const onUnauthorized = () => {
      if (userRef.current) {
        toast.info("Your session has ended", "Please sign in again to continue.");
        router.replace(`/login?expired=1&next=${encodeURIComponent(window.location.pathname)}`);
      }
      setUser(null);
    };
    window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
  }, [router, toast]);

  const login = useCallback(async (email, password) => {
    const { user } = await authApi.login(email, password);
    resetThresholdCache();
    setUser(user);
    return user;
  }, []);

  const logout = useCallback(async () => {
    try { await authApi.logout(); } catch { /* cookie is cleared server-side when reachable */ }
    resetThresholdCache();
    setUser(null);
    router.replace("/login");
  }, [router]);

  return <AuthCtx.Provider value={{ user, refresh, login, logout, pathname }}>{children}</AuthCtx.Provider>;
}

export const useAuth = () => useContext(AuthCtx);
