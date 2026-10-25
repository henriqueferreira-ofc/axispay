import { startAuthentication, startRegistration } from "@simplewebauthn/browser";
import { supabase } from "@/integrations/supabase/client";
import {
  finishPasskeyLogin,
  finishPasskeyRegistration,
  startPasskeyLogin,
  startPasskeyRegistration,
} from "@/lib/passkey.functions";

const KEY = "axispay.passkey";

export type LocalPasskey = { credentialId: string; userId: string };

export function getLocalPasskey(): LocalPasskey | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const v = JSON.parse(raw) as LocalPasskey;
    return v?.credentialId && v?.userId ? v : null;
  } catch {
    return null;
  }
}

export function clearLocalPasskey() {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}

export async function isBiometricAvailable(): Promise<boolean> {
  if (typeof window === "undefined" || !window.PublicKeyCredential) return false;
  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

export async function enrollPasskey(userId: string) {
  const { challengeId, options } = await startPasskeyRegistration();
  const response = await startRegistration({ optionsJSON: options as never });
  const label = typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 80) : undefined;
  const { credentialId } = await finishPasskeyRegistration({
    data: { challengeId, response: response as unknown as Record<string, unknown>, deviceLabel: label },
  });
  window.localStorage.setItem(KEY, JSON.stringify({ credentialId, userId } satisfies LocalPasskey));
}

/** Returns "ok" on success, "missing" when this device has no valid biometric registered. */
export async function loginWithPasskey(): Promise<"ok" | "missing"> {
  const local = getLocalPasskey();
  if (!local) return "missing";
  const start = await startPasskeyLogin({ data: { credentialId: local.credentialId } });
  if (start.missing) {
    clearLocalPasskey();
    return "missing";
  }
  const response = await startAuthentication({ optionsJSON: start.options as never });
  const { tokenHash } = await finishPasskeyLogin({
    data: { challengeId: start.challengeId, response: response as unknown as Record<string, unknown> },
  });
  const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: "email" });
  if (error) throw error;
  return "ok";
}
