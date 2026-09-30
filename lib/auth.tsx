"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import type { Role, User } from "@/types";
import { seedUsers, seedCredentials } from "./seed";

type Session = {
  user: User;
  loginAt: string;
};

interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => { ok: boolean; error?: string };
  logout: () => void;
  hasRole: (...roles: Role[]) => boolean;
}

const SESSION_KEY = "erp_admin_session";

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function loadSession(): Session | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Session;
    // ensure user still exists & active
    const user = seedUsers.find(
      (u) => u.id === parsed.user.id && u.status === "ACTIVE"
    );
    if (!user) return null;
    return { user, loginAt: parsed.loginAt };
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const router = useRouter();

  useEffect(() => {
    setSession(loadSession());
  }, []);

  const login = useCallback(
    (email: string, password: string) => {
      const normalized = email.trim().toLowerCase();
      const user = seedUsers.find(
        (u) => u.email.toLowerCase() === normalized && u.status === "ACTIVE"
      );
      if (!user) {
        return { ok: false, error: "Email tidak terdaftar atau akun tidak aktif." };
      }
      const expected = seedCredentials[user.email];
      if (!expected || password !== expected) {
        return { ok: false, error: "Password salah. Silakan coba lagi." };
      }
      const newSession: Session = {
        user,
        loginAt: new Date().toISOString(),
      };
      localStorage.setItem(SESSION_KEY, JSON.stringify(newSession));
      setSession(newSession);
      return { ok: true };
    },
    []
  );

  const logout = useCallback(() => {
    localStorage.removeItem(SESSION_KEY);
    setSession(null);
    router.push("/login");
  }, [router]);

  const user = session?.user ?? null;

  const hasRole = useCallback(
    (...roles: Role[]) => {
      if (!user) return false;
      if (user.role === "SUPER_ADMIN") return true;
      return roles.includes(user.role);
    },
    [user]
  );

  return (
    <AuthContext.Provider
      value={{ user, isAuthenticated: !!user, login, logout, hasRole }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
