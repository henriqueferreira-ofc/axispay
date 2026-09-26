import * as React from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session, User } from "@supabase/supabase-js";
import { passkeysEnabled } from "./passkeyConfig";
import { hasRememberedPasskey, rememberPasskey, supportsPasskeys, passkeyInterrupted } from "./passkeys";

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  lockRevision: number;
  passkeySupported: boolean;
  passkeySetupSuggested: boolean;
  dismissPasskeySetup: () => void;
  signInWithPasskey: () => Promise<{ error: Error | null }>;
  registerPasskey: () => Promise<{ error: Error | null }>;
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
  const [passkeySupported, setPasskeySupported] = React.useState(false);
  const [passkeySetupSuggested, setPasskeySetupSuggested] = React.useState(false);
  const passkeyAttempt = React.useRef<{ controller: AbortController; hidden: boolean } | null>(null);

  const lock = React.useCallback(() => {
    passkeyAttempt.current?.controller.abort();
    passkeyAttempt.current = null;
    document.documentElement.dataset.appLocked = "true";
    accessVersion.current += 1;
    setUnlocked(false);
    setPasskeySetupSuggested(false);
    setLockRevision(accessVersion.current);
  }, []);

  React.useEffect(() => {
    setPasskeySupported(passkeysEnabled && supportsPasskeys());
    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        // Native biometric/password-manager prompts may temporarily hide the page.
        // Keep content masked; only a server-verified result may finish the ceremony.
        if (passkeyAttempt.current) {
          document.documentElement.dataset.appLocked = "true";
          passkeyAttempt.current.hidden = true;
        } else lock();
      }
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
    const { data: subscription } = supabase.auth.onAuthStateChange((event, newSession) => {
      setSession(newSession);
      if (!newSession) {
        if (event === "INITIAL_SESSION") setUnlocked(false);
        else lock();
      }
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
  }, [lock]);

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

  const acceptSession = React.useCallback((nextSession: Session, version: number) => {
    if (version === accessVersion.current && !document.hidden) {
      delete document.documentElement.dataset.appLocked;
      setSession(nextSession);
      setUnlocked(true);
      const name = nextSession.user.user_metadata?.name || nextSession.user.user_metadata?.full_name;
      try {
        if (typeof name === "string") localStorage.setItem("axispay.lastUserName", name);
      } catch { /* The greeting is optional when browser storage is unavailable. */ }
      return true;
    }
    return false;
  }, []);

  const signIn = React.useCallback(async (email: string, password: string) => {
    const version = accessVersion.current;
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return { error };
      if (!data.session || !acceptSession(data.session, version)) return { error: passkeyInterrupted() };
      setPasskeySetupSuggested(passkeysEnabled && supportsPasskeys() && !hasRememberedPasskey(data.session.user.id));
      return { error: null };
    } catch (error) { return { error: error instanceof Error ? error : new Error("Login failed") }; }
  }, [acceptSession]);

  const runPasskey = React.useCallback(async (register: boolean): Promise<{ error: Error | null }> => {
    if (!passkeysEnabled || !supportsPasskeys() || passkeyAttempt.current || (register && (!unlocked || !session))) {
      return { error: new Error("Passkey unavailable") };
    }
    const version = accessVersion.current;
    const attempt = { controller: new AbortController(), hidden: false };
    passkeyAttempt.current = attempt;
    const timeout = setTimeout(() => attempt.controller.abort(), 120_000);
    let verified = false;
    try {
      if (register) {
        const { data, error } = await supabase.auth.registerPasskey({ options: { signal: attempt.controller.signal } });
        if (error) return { error };
        if (!data || attempt.controller.signal.aborted || version !== accessVersion.current || document.hidden) return { error: passkeyInterrupted() };
        rememberPasskey(session!.user.id);
        setPasskeySetupSuggested(false);
        delete document.documentElement.dataset.appLocked;
        verified = true;
      } else {
        const { data, error } = await supabase.auth.signInWithPasskey({ options: { signal: attempt.controller.signal } });
        if (error) return { error };
        if (!data?.session || attempt.controller.signal.aborted || !acceptSession(data.session, version)) return { error: passkeyInterrupted() };
        rememberPasskey(data.session.user.id);
        verified = true;
      }
      return { error: null };
    } catch (error) {
      return { error: error instanceof Error ? error : new Error("Passkey failed") };
    } finally {
      clearTimeout(timeout);
      if (passkeyAttempt.current === attempt) {
        passkeyAttempt.current = null;
        if (!verified && attempt.hidden) lock();
      }
    }
  }, [acceptSession, lock, session, unlocked]);

  const signInWithPasskey = React.useCallback(() => runPasskey(false), [runPasskey]);
  const registerPasskey = React.useCallback(() => runPasskey(true), [runPasskey]);
  const dismissPasskeySetup = React.useCallback(() => setPasskeySetupSuggested(false), []);

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
    passkeySupported,
    passkeySetupSuggested,
    dismissPasskeySetup,
    signInWithPasskey,
    registerPasskey,
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
