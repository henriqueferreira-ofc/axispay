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

export async function preparePasskeyRegistration() {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();
  if (error || !session)
    throw new Error("Entre com e-mail e senha novamente para ativar a biometria.");
  const headers = { Authorization: `Bearer ${session.access_token}` };
  const result = await startPasskeyRegistration({ headers });
  if (result.error || !result.options || !result.challengeId) {
    throw new Error(result.error || "Não foi possível preparar a biometria.");
  }
  return {
    headers,
    challengeId: result.challengeId,
    options: result.options,
    preparedAt: Date.now(),
  };
}

export type PreparedPasskeyRegistration = Awaited<ReturnType<typeof preparePasskeyRegistration>>;

export async function enrollPasskey(userId: string, prepared?: PreparedPasskeyRegistration) {
  prepared ??= await preparePasskeyRegistration();
  if (Date.now() - prepared.preparedAt >= 4 * 60 * 1000) {
    throw new Error("A ativação expirou. Feche esta janela e tente novamente.");
  }
  // Invoke WebAuthn directly from the click, before any session or network awaits (Safari).
  const response = await startRegistration({ optionsJSON: prepared.options });
  const label = typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 80) : undefined;
  const { credentialId } = await finishPasskeyRegistration({
    headers: prepared.headers,
    data: {
      challengeId: prepared.challengeId,
      response: response as unknown as Record<string, unknown>,
      deviceLabel: label,
    },
  });
  window.localStorage.setItem(KEY, JSON.stringify({ credentialId, userId } satisfies LocalPasskey));
}

export function registrationErrorMessage(error: unknown): string {
  const name = error instanceof Error ? error.name : "";
  if (name === "NotAllowedError")
    return "A criação da chave de acesso foi cancelada ou não foi autorizada pelo iPhone. Tente novamente e confirme no Face ID ou com o código do aparelho.";
  if (name === "InvalidStateError")
    return "Já existe uma chave de acesso para esta conta no aparelho. Entre com a chave existente ou gerencie-a nos ajustes de Senhas do iPhone.";
  return "Não foi possível concluir a ativação. Tente novamente ou entre com e-mail e senha.";
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
  const response = await startAuthentication({ optionsJSON: start.options });
  const { tokenHash } = await finishPasskeyLogin({
    data: {
      challengeId: start.challengeId,
      response: response as unknown as Record<string, unknown>,
    },
  });
  const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: "email" });
  if (error) throw error;
  return "ok";
}
