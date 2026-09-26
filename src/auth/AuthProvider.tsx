import * as React from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session, User } from "@supabase/supabase-js";

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  lockRevision: number;
  signUp: (email: string, password: string, name: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
  updatePassword: (password: string) => Promise<{ error: Error | null }>;
};

const AuthContext = React.createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = React.useState<Session | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [unlocked, setUnlocked] = React.useState(false);
  const [lockRevision, setLockRevision] = React.useState(0);
  const accessVersion = React.useRef(0);

  const lock = React.useCallback(() => {
    document.documentElement.dataset.appLocked = "true";
    accessVersion.current += 1;
    setUnlocked(false);
    setLockRevision(accessVersion.current);
  }, []);

  React.useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") lock();
    };
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) lock();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("pagehide", lock);
    window.addEventListener("pageshow", onPageShow);
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("pagehide", lock);
      window.removeEventListener("pageshow", onPageShow);
    };
  }, [lock]);

  React.useEffect(() => {
    // CRITICAL: subscribe BEFORE getSession
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      if (!newSession) setUnlocked(false);
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    }).catch(() => {
      setSession(null);
      setLoading(false);
    });

    return () => subscription.subscription.unsubscribe();
  }, []);

  const signUp = React.useCallback(async (email: string, password: string, name: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: { name },
      },
    });
    return { error };
  }, []);

  const signIn = React.useCallback(async (email: string, password: string) => {
    const version = accessVersion.current;
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    // A login that finishes after the app was hidden must not reopen private data.
    if (!error && data.session && version === accessVersion.current && !document.hidden) {
      delete document.documentElement.dataset.appLocked;
      setSession(data.session);
      setUnlocked(true);
      const name = data.user?.user_metadata?.name || data.user?.user_metadata?.full_name;
      try {
        if (typeof name === "string") localStorage.setItem("axispay.lastUserName", name);
      } catch { /* The greeting is optional when browser storage is unavailable. */ }
    }
    return { error };
  }, []);

  const signOut = React.useCallback(async () => {
    lock();
    await supabase.auth.signOut();
  }, [lock]);

  const resetPassword = React.useCallback(async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    return { error };
  }, []);

  const updatePassword = React.useCallback(async (password: string) => {
    const { error } = await supabase.auth.updateUser({ password });
    return { error };
  }, []);

  const value: AuthContextValue = {
    session: unlocked ? session : null,
    user: unlocked ? session?.user ?? null : null,
    loading,
    lockRevision,
    signUp,
    signIn,
    signOut,
    resetPassword,
    updatePassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
