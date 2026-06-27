import {
  createContext,
  useCallback,
  useContext,
  useEffect,
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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [user, setUser] = useState<SessionUser | null>(null);

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
    })();
    return () => {
      active = false;
    };
  }, []);

  const login = useCallback(async (credentials: LoginRequest) => {
    const { accessToken, user: loggedUser } = await authClient.login(credentials);
    setToken(accessToken);
    setUser(loggedUser);
    setStatus("authenticated");
  }, []);

  const logout = useCallback(async () => {
    await authClient.logout();
    clearToken();
    setUser(null);
    setStatus("unauthenticated");
  }, []);

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
