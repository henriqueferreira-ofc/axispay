import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

// Exercise the provider with controlled lifecycle events and delayed auth responses.
// No real accounts or credentials are used.
function harness(file, supabase = {}, enabled = true) {
  const state = [];
  const effects = [];
  const cleanups = [];
  let cursor = 0;
  let firstRender = true;
  const document = new EventTarget();
  document.hidden = false;
  document.visibilityState = "visible";
  document.documentElement = { dataset: {} };
  const window = new EventTarget();
  window.isSecureContext = true;
  const storage = new Map();
  const localStorage = {
    getItem: (key) => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, value),
  };
  const React = {
    createContext: () => ({ Provider: "Provider" }),
    useState(initial) {
      const index = cursor++;
      if (firstRender) state[index] = typeof initial === "function" ? initial() : initial;
      return [state[index], (value) => {
        state[index] = typeof value === "function" ? value(state[index]) : value;
      }];
    },
    useRef(initial) {
      const index = cursor++;
      if (firstRender) state[index] = { current: initial };
      return state[index];
    },
    useCallback: (callback) => callback,
    useEffect(effect) { if (firstRender) effects.push(effect); },
  };
  const jsx = (type, props) => ({ type, props });
  const exports = {};
  const context = vm.createContext({
    exports, document, window, localStorage, console, AbortController, setTimeout, clearTimeout,
    PublicKeyCredential: class {}, navigator: { credentials: {} },
    require(name) {
      if (name === "./passkeyConfig") return { passkeysEnabled: enabled };
      if (name === "./passkeys") {
        const helperContext = vm.createContext({ exports: {}, window, localStorage, navigator: { credentials: {} }, PublicKeyCredential: class {} });
        vm.runInContext(ts.transpileModule(readFileSync(new URL("../src/auth/passkeys.ts", import.meta.url), "utf8"), {
          compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
        }).outputText, helperContext);
        return helperContext.exports;
      }
      if (name === "react") return React;
      if (name === "react/jsx-runtime") return { jsx, jsxs: jsx };
      if (name === "@/integrations/supabase/client") return { supabase };
      throw new Error(`Unexpected import: ${name}`);
    },
  });
  const output = ts.transpileModule(readFileSync(new URL(file, import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  vm.runInContext(output, context);
  return {
    document, window, localStorage,
    render(name) {
      cursor = 0;
      const tree = exports[name]({ children: null });
      firstRender = false;
      return tree;
    },
    mount() { for (const effect of effects.splice(0)) cleanups.push(effect()); },
    unmount() { for (const cleanup of cleanups) cleanup?.(); },
    hide() {
      document.hidden = true;
      document.visibilityState = "hidden";
      document.dispatchEvent(new Event("visibilitychange"));
    },
    show() {
      document.hidden = false;
      document.visibilityState = "visible";
      document.dispatchEvent(new Event("visibilitychange"));
    },
  };
}

const user = { id: "test-user", user_metadata: { name: "Henrique" } };
const session = { user };
function authHarness(enabled = true) {
  let onAuthChange;
  let resolveLogin;
  let resolvePasskey;
  let passkeySignal;
  const auth = {
    onAuthStateChange(callback) {
      onAuthChange = callback;
      return { data: { subscription: { unsubscribe() {} } } };
    },
    getSession: async () => ({ data: { session } }),
    signInWithPassword: () => new Promise((resolve) => { resolveLogin = resolve; }),
    signInWithPasskey: ({ options }) => new Promise(resolve => { passkeySignal = options.signal; resolvePasskey = resolve; }),
    registerPasskey: ({ options }) => new Promise(resolve => { passkeySignal = options.signal; resolvePasskey = resolve; }),
    signOut: async () => onAuthChange("SIGNED_OUT", null),
  };
  const h = harness("../src/auth/AuthProvider.tsx", { auth }, enabled);
  const value = () => h.render("AuthProvider").props.value;
  value();
  h.mount();
  return { ...h, value, getSignal: () => passkeySignal, finishPasskey: (result = { data: { session, user }, error: null }) => resolvePasskey(result), emit: (...args) => onAuthChange(...args), finishLogin: () => resolveLogin({ data: { session, user }, error: null }) };
}

test("restored sessions and auth events never unlock the app without explicit login", async () => {
  const h = authHarness();
  await Promise.resolve();
  assert.equal(h.value().loading, false);
  assert.equal(h.value().user, null);
  h.emit("SIGNED_IN", session);
  h.emit("TOKEN_REFRESHED", session);
  assert.equal(h.value().session, null);
  h.unmount();
});

test("successful login unlocks; backgrounding immediately masks and locks; return stays locked", async () => {
  const h = authHarness();
  const login = h.value().signIn("test@example.com", "test-only");
  h.finishLogin();
  await login;
  assert.equal(h.value().user.id, user.id);
  assert.equal(h.localStorage.getItem("axispay.lastUserName"), "Henrique");
  h.hide();
  assert.equal(h.document.documentElement.dataset.appLocked, "true");
  assert.equal(h.value().user, null);
  assert.equal(h.value().lockRevision, 1);
  h.show();
  h.emit("TOKEN_REFRESHED", session);
  assert.equal(h.value().session, null);
  const loginAgain = h.value().signIn("test@example.com", "test-only");
  h.finishLogin();
  await loginAgain;
  assert.equal(h.value().user.id, user.id);
  assert.equal(h.document.documentElement.dataset.appLocked, undefined);
  h.window.dispatchEvent(new Event("pagehide"));
  assert.equal(h.value().user, null);
  h.unmount();
});

test("a pending login cannot unlock after leaving and returning", async () => {
  const h = authHarness();
  const login = h.value().signIn("test@example.com", "test-only");
  h.hide();
  h.show();
  h.finishLogin();
  await login;
  assert.equal(h.value().user, null);
  const restored = new Event("pageshow");
  restored.persisted = true;
  h.window.dispatchEvent(restored);
  assert.equal(h.value().lockRevision, 2);
  h.unmount();
});

test("photo selection waits for visibility, avoids the previous photo, and stays stable", () => {
  const h = harness("../src/components/AuthHeroBackground.tsx");
  h.localStorage.setItem("axispay.lastWelcomePhoto", "/auth-bg-1.png");
  assert.equal(h.render("AuthHeroBackground").props.children[0], null);
  h.hide();
  h.mount();
  assert.equal(h.render("AuthHeroBackground").props.children[0], null);
  h.show();
  const photo = h.render("AuthHeroBackground").props.children[0].props.src;
  assert.notEqual(photo, "/auth-bg-1.png");
  assert.equal(h.localStorage.getItem("axispay.lastWelcomePhoto"), photo);
  h.hide();
  h.show();
  assert.equal(h.render("AuthHeroBackground").props.children[0].props.src, photo);
  h.unmount();
});


test("passkey needs a verified server session and tolerates the native prompt visibility cycle", async () => {
  const h = authHarness();
  const login = h.value().signInWithPasskey();
  assert.equal(h.value().user, null);
  h.hide();
  assert.equal(h.document.documentElement.dataset.appLocked, "true");
  assert.equal(h.getSignal().aborted, false);
  h.show();
  h.finishPasskey();
  assert.equal((await login).error, null);
  assert.equal(h.value().user.id, user.id);
  assert.equal(h.localStorage.getItem("axispay.passkeyUser"), user.id);
  h.hide();
  assert.equal(h.value().user, null);
  h.unmount();
});

test("cancelled or invalid passkey responses never unlock", async () => {
  for (const result of [{ data: null, error: { name: "NotAllowedError" } }, { data: { session: null }, error: null }]) {
    const h = authHarness();
    const login = h.value().signInWithPasskey();
    h.hide(); h.show();
    h.finishPasskey(result);
    assert.ok((await login).error);
    assert.equal(h.value().user, null);
    assert.equal(h.localStorage.getItem("axispay.passkeyUser"), null);
    h.unmount();
  }
});

test("pagehide aborts passkeys and rejects a late successful response", async () => {
  const h = authHarness();
  const login = h.value().signInWithPasskey();
  h.window.dispatchEvent(new Event("pagehide"));
  assert.equal(h.getSignal().aborted, true);
  h.finishPasskey();
  assert.ok((await login).error);
  assert.equal(h.value().user, null);
  h.unmount();
});

test("enrollment requires an unlocked account and only remembers verified credentials", async () => {
  const h = authHarness();
  assert.ok((await h.value().registerPasskey()).error);
  const login = h.value().signIn("test@example.com", "test-only");
  h.finishLogin(); await login;
  assert.equal(h.value().passkeySetupSuggested, true);
  const failed = h.value().registerPasskey();
  h.finishPasskey({ data: null, error: { code: "passkey_disabled" } });
  assert.ok((await failed).error);
  assert.equal(h.localStorage.getItem("axispay.passkeyUser"), null);
  const enrollment = h.value().registerPasskey();
  h.hide(); h.show();
  h.finishPasskey({ data: { id: "credential-test" }, error: null });
  assert.equal((await enrollment).error, null);
  assert.equal(h.value().passkeySetupSuggested, false);
  assert.equal(h.value().user.id, user.id);
  assert.equal(h.localStorage.getItem("axispay.passkeyUser"), user.id);
  h.unmount();
});


test("disabled rollout keeps password login and never offers passkey enrollment", async () => {
  const h = authHarness(false);
  assert.equal(h.value().passkeySupported, false);
  assert.ok((await h.value().signInWithPasskey()).error);
  const login = h.value().signIn("test@example.com", "test-only");
  h.finishLogin(); await login;
  assert.equal(h.value().user.id, user.id);
  assert.equal(h.value().passkeySetupSuggested, false);
  h.unmount();
});
