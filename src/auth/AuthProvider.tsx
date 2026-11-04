import * as React from "react";
import { supabase } from "@/integrations/supabase/client";
import { getLocalPasskey, rememberAccount } from "@/lib/passkey";
import type { Session, User } from "@supabase/supabase-js";

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  accessConfirmed: boolean;
  setAccessConfirmed: (confirmed: boolean) => void;
  signUp: (email: string, password: string, name: string) => Promise<{ error: Error | null; confirmationRequired: boolean }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
  updatePassword: (password: string) => Promise<{ error: Error | null }>;
};

const AuthContext = React.createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = React.useState<Session | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [confirmedUserId, setConfirmedUserId] = React.useState<string | null>(null);
  const accessConfirmed = !!session && confirmedUserId === session.user.id;
  const sessionRef = React.useRef(session);
  sessionRef.current = session;
  const setAccessConfirmed = React.useCallback((confirmed: boolean) => {
    if (confirmed && sessionRef.current) rememberAccount(sessionRef.current.user);
    setConfirmedUserId(confirmed ? sessionRef.current?.user.id ?? null : null);
  }, []);

  React.useEffect(() => {
    const lock = () => {
      if (document.visibilityState === "hidden" && getLocalPasskey()) setAccessConfirmed(false);
    };
    document.addEventListener("visibilitychange", lock);
    window.addEventListener("pagehide", lock);
    return () => {
      document.removeEventListener("visibilitychange", lock);
      window.removeEventListener("pagehide", lock);
    };
  }, []);

  React.useEffect(() => {
    // CRITICAL: subscribe BEFORE getSession
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (sessionRef.current?.user.id !== newSession?.user.id || !newSession) setConfirmedUserId(null);
      sessionRef.current = newSession;
      setSession(newSession);
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data }) => {
      sessionRef.current = data.session;
      setSession(data.session);
      setLoading(false);
    });

    return () => subscription.subscription.unsubscribe();
  }, []);

  const signUp = React.useCallback(async (email: string, password: string, name: string) => {
    setAccessConfirmed(false);
    if (sessionRef.current) {
      const { error: signOutError } = await supabase.auth.signOut({ scope: "local" });
      if (signOutError) throw signOutError;
    }
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth?confirmed=true`,
        data: { name },
      },
    });
    if (!error && data.session) {
      const { error: signOutError } = await supabase.auth.signOut({ scope: "local" });
      if (signOutError) throw signOutError;
    }
    return { error, confirmationRequired: !data.session };
  }, []);

  const signIn = React.useCallback(async (email: string, password: string) => {
    setAccessConfirmed(false);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (!error && data.user) rememberAccount(data.user);
    return { error };
  }, []);

  const signOut = React.useCallback(async () => {
    setAccessConfirmed(false);
    await supabase.auth.signOut();
  }, []);

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
    session,
    user: session?.user ?? null,
    loading,
    accessConfirmed,
    setAccessConfirmed,
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
