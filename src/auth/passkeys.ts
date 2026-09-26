export const PASSKEY_DEVICE_KEY = "axispay.passkeyUser";

export function supportsPasskeys() {
  return typeof window !== "undefined" && window.isSecureContext &&
    typeof PublicKeyCredential !== "undefined" && !!navigator.credentials;
}

// This marker only controls the setup suggestion. It never grants access.
export function hasRememberedPasskey(userId: string) {
  try { return localStorage.getItem(PASSKEY_DEVICE_KEY) === userId; } catch { return false; }
}

export function rememberPasskey(userId: string) {
  try { localStorage.setItem(PASSKEY_DEVICE_KEY, userId); } catch { /* Optional UI preference. */ }
}

export function passkeyErrorKey(error: unknown) {
  const { code, name, cause } = (error ?? {}) as { code?: string; name?: string; cause?: { name?: string } };
  if (name === "NotAllowedError" || name === "AbortError" || cause?.name === "NotAllowedError" || cause?.name === "AbortError" || code === "ERROR_CEREMONY_ABORTED") return "passkey.cancelled";
  if (code === "passkey_disabled") return "passkey.unavailable";
  if (code === "email_not_confirmed") return "passkey.confirmEmail";
  if (code === "webauthn_credential_exists") return "passkey.exists";
  if (code === "passkey_interrupted") return "passkey.interrupted";
  return "passkey.failed";
}

export function passkeyInterrupted() {
  return Object.assign(new Error("Passkey operation interrupted"), { code: "passkey_interrupted" });
}
