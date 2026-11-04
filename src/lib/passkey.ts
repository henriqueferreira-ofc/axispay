import { startAuthentication, startRegistration } from "@simplewebauthn/browser";
import { supabase } from "@/integrations/supabase/client";
import {
  finishPasskeyLogin,
  finishPasskeyRegistration,
  startPasskeyLogin,
  startPasskeyRegistration,
} from "@/lib/passkey.functions";

const KEY = "axispay.passkey";
const LAST_ACCOUNT_KEY = "axispay.lastAccount";
type RememberedAccount = { userId: string; email: string; name: string };

export function getRememberedAccount(): RememberedAccount | null {
  if (typeof window === "undefined") return null;
  try {
    const account = JSON.parse(window.localStorage.getItem(LAST_ACCOUNT_KEY) || "null");
    return typeof account?.userId === "string" && typeof account.email === "string" && typeof account.name === "string" ? account : null;
  } catch { return null; }
}

// Store identity only after authentication succeeds; never store passwords.
export function rememberAccount(user: { id: string; email?: string; user_metadata?: Record<string, unknown> }) {
  try {
    const legacy = window.localStorage.getItem(KEY);
    if (legacy) {
      const previous = JSON.parse(legacy) as LocalPasskey;
      if (previous.userId && previous.credentialId)
        window.localStorage.setItem(`${KEY}.${previous.userId}`, legacy);
    }
    const name = user.user_metadata?.name || user.user_metadata?.full_name;
    const account: RememberedAccount = { userId: user.id, email: user.email || "", name: typeof name === "string" ? name : user.email?.split("@")[0] || "" };
    window.localStorage.setItem(LAST_ACCOUNT_KEY, JSON.stringify(account));
    window.localStorage.setItem("axispay.lastUserName", account.name);
    const credential = window.localStorage.getItem(`${KEY}.${user.id}`);
    if (credential) window.localStorage.setItem(KEY, credential);
    else window.localStorage.removeItem(KEY);
  } catch { /* Authentication remains available when storage is blocked. */ }
}

export type LocalPasskey = { credentialId: string; userId: string };

export function getLocalPasskey(userId?: string): LocalPasskey | null {
  if (typeof window === "undefined") return null;
  try {
    userId ??= getRememberedAccount()?.userId;
    const raw = (userId && window.localStorage.getItem(`${KEY}.${userId}`)) || window.localStorage.getItem(KEY);
    if (!raw) return null;
    const v = JSON.parse(raw) as LocalPasskey;
    return v?.credentialId && v?.userId && (!userId || v.userId === userId) ? v : null;
  } catch {
    return null;
  }
}

export function clearLocalPasskey(userId?: string) {
  try {
    const local = getLocalPasskey(userId);
    if (local) window.localStorage.removeItem(`${KEY}.${local.userId}`);
    if (!userId || getLocalPasskey()?.userId === userId) window.localStorage.removeItem(KEY);
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

// The authenticated registration options already contain this account's saved
// credentials. Recover them even when Safari/PWA local storage has no pointer.
export async function prepareExistingPasskeyLogin(userId: string, registration: PreparedPasskeyRegistration) {
  const credentials = registration.options.excludeCredentials ?? [];
  if (!credentials.length) return null;
  const start = await startPasskeyLogin({ data: { credentialId: credentials[0].id } });
  if (start.missing) throw new Error("Não foi possível recuperar a chave existente. Entre com e-mail e senha.");
  return {
    ...start,
    options: { ...start.options, allowCredentials: credentials },
    local: { credentialId: credentials[0].id, userId },
    preparedAt: Date.now(),
  };
}

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
  const previous = getLocalPasskey();
  if (previous) window.localStorage.setItem(`${KEY}.${previous.userId}`, JSON.stringify(previous));
  const value = JSON.stringify({ credentialId, userId } satisfies LocalPasskey);
  window.localStorage.setItem(`${KEY}.${userId}`, value);
  window.localStorage.setItem(KEY, value);
}

export function isEmbeddedAuthContext(): boolean {
  return typeof window !== "undefined" && window.self !== window.top;
}

export function registrationErrorMessage(error: unknown): string {
  const name = error instanceof Error ? error.name : "";
  if (name === "NotAllowedError") {
    if (isEmbeddedAuthContext())
      return "O navegador não concluiu a criação da chave nesta prévia. Abra o aplicativo fora do editor e tente ativar novamente.";
    return "A criação da chave de acesso foi cancelada, expirou ou não foi permitida pelo navegador. Tente novamente e confirme com a biometria ou o código do aparelho.";
  }
  if (name === "InvalidStateError")
    return "Já existe uma chave de acesso para esta conta no aparelho. Entre com a chave existente ou gerencie-a nas configurações de senhas do aparelho.";
  return "Não foi possível concluir a ativação. Tente novamente ou entre com e-mail e senha.";
}

export async function preparePasskeyLogin(userId?: string) {
  const local = getLocalPasskey(userId);
  if (!local) return null;
  const start = await startPasskeyLogin({ data: { credentialId: local.credentialId } });
  if (start.missing) {
    clearLocalPasskey(local.userId);
    return null;
  }
  return { ...start, local, preparedAt: Date.now() };
}

export type PreparedPasskeyLogin = NonNullable<Awaited<ReturnType<typeof preparePasskeyLogin>>>;

/** Prepared options keep the native prompt directly attached to the user's tap on Safari. */
export async function loginWithPasskey(prepared?: PreparedPasskeyLogin): Promise<"ok" | "missing"> {
  const attempt = prepared ?? await preparePasskeyLogin();
  if (!attempt) return "missing";
  if (Date.now() - attempt.preparedAt >= 4 * 60 * 1000)
    throw new Error("O acesso expirou. Toque novamente para preparar uma nova tentativa.");
  const response = await startAuthentication({ optionsJSON: attempt.options });
  const { tokenHash } = await finishPasskeyLogin({
    data: { challengeId: attempt.challengeId, response: response as unknown as Record<string, unknown> },
  });
  const { data, error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: "email" });
  if (error) throw error;
  if (data.user?.id !== attempt.local.userId) {
    await supabase.auth.signOut({ scope: "local" });
    throw new Error("A chave de acesso não corresponde à conta selecionada.");
  }
  rememberAccount(data.user);
  const local = { credentialId: response.id, userId: data.user.id } satisfies LocalPasskey;
  window.localStorage.setItem(`${KEY}.${local.userId}`, JSON.stringify(local));
  window.localStorage.setItem(KEY, JSON.stringify(local));
  return "ok";
}
