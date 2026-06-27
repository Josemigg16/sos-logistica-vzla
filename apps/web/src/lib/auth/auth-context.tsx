import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { LoginRequest } from "@sos/shared";
import * as authClient from "./auth-client";
import type { SessionUser } from "./auth-client";
import { clearToken, setToken } from "./token-store";

type AuthStatus = "loading" | "authenticated" | "unauthenticated";

interface AuthContextValue {
  status: AuthStatus;
  user: SessionUser | null;
  login: (credentials: LoginRequest) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const REFRESH_INTERVAL_MS = 13 * 60 * 1000;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [user, setUser] = useState<SessionUser | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startTimer = useCallback(() => {
    stopTimer();
    timerRef.current = setInterval(async () => {
      const token = await authClient.refresh();
      if (!token) {
        stopTimer();
        clearToken();
        setUser(null);
        setStatus("unauthenticated");
        return;
      }
      setToken(token);
    }, REFRESH_INTERVAL_MS);
  }, [stopTimer]);

  // Al arrancar restauramos la sesión: la cookie httpOnly del refresh sobrevive
  // al reload, así que pedimos un access token nuevo y resolvemos el usuario.
  useEffect(() => {
    let active = true;
    (async () => {
      const token = await authClient.refresh();
      if (!active) return;
      if (!token) {
        setStatus("unauthenticated");
        return;
      }
      setToken(token);
      const me = await authClient.fetchMe(token);
      if (!active) return;
      if (!me) {
        clearToken();
        setStatus("unauthenticated");
        return;
      }
      setUser(me);
      setStatus("authenticated");
      startTimer();
    })();
    return () => {
      active = false;
      stopTimer();
    };
  }, [startTimer, stopTimer]);

  const login = useCallback(async (credentials: LoginRequest) => {
    const { accessToken, user: loggedUser } = await authClient.login(credentials);
    setToken(accessToken);
    setUser(loggedUser);
    setStatus("authenticated");
    startTimer();
  }, [startTimer]);

  const logout = useCallback(async () => {
    stopTimer();
    await authClient.logout();
    clearToken();
    setUser(null);
    setStatus("unauthenticated");
  }, [stopTimer]);

  return (
    <AuthContext.Provider value={{ status, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de <AuthProvider>");
  return ctx;
}
