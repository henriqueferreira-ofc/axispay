const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function setup(session, finishError, preparationError, embedded = false) {
  const calls = [];
  const stored = new Map();
  const events = [];
  const modules = {
    '@simplewebauthn/browser': { startRegistration: async () => { events.push('webauthn'); return { id: 'credential' }; }, startAuthentication: async () => { events.push('authenticate'); return { id: 'credential' }; } },
    '@/integrations/supabase/client': { supabase: { auth: { getSession: async () => { events.push("session"); return { data: { session } }; }, verifyOtp: async () => ({ data: { user: { id: session?.user?.id ?? "user" } }, error: null }), signOut: async () => { events.push("signOut"); } } } },
    '@/lib/passkey.functions': {
      startPasskeyLogin: async () => { events.push("prepare-login"); return { missing: false, challengeId: "challenge", options: {} }; },
      finishPasskeyLogin: async () => ({ tokenHash: "token" }),
      startPasskeyRegistration: async (args) => { calls.push(args); return preparationError ? { error: preparationError } : { challengeId: 'challenge', options: {} }; },
      finishPasskeyRegistration: async (args) => { calls.push(args); if (finishError) throw finishError; return { credentialId: 'credential' }; },
    },
  };
  const exports = {};
  const code = ts.transpileModule(readFileSync('src/lib/passkey.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(code, {
    Error, exports, require: (id) => modules[id], navigator: { userAgent: 'iPhone' },
    window: { self: 1, top: embedded ? 2 : 1, localStorage: { setItem: (k, v) => stored.set(k, v), getItem: (k) => stored.get(k), removeItem: (k) => stored.delete(k) } },
  });
  return { prepareExisting: exports.prepareExistingPasskeyLogin, rememberAccount: exports.rememberAccount, getRememberedAccount: exports.getRememberedAccount, getLocalPasskey: exports.getLocalPasskey, prepareLogin: exports.preparePasskeyLogin, login: exports.loginWithPasskey, registrationErrorMessage: exports.registrationErrorMessage, enroll: exports.enrollPasskey, prepare: exports.preparePasskeyRegistration, calls, stored, events };
}

test('registration authenticates both server calls and remembers only verified credentials', async () => {
  const s = setup({ access_token: 'session-token' });
  await s.enroll('user');
  assert.equal(s.calls.length, 2);
  for (const call of s.calls) assert.equal(call.headers.Authorization, 'Bearer session-token');
  assert.deepEqual(JSON.parse(s.stored.get('axispay.passkey')), { credentialId: 'credential', userId: 'user' });
});

test('registration without a session never contacts the registration endpoints', async () => {
  const s = setup(null);
  await assert.rejects(s.enroll('user'), /Entre com e-mail/);
  assert.equal(s.calls.length, 0);
  assert.equal(s.stored.size, 0);
});

test('failed server verification never enables biometric access locally', async () => {
  const s = setup({ access_token: 'session-token' }, new Error('verification failed'));
  await assert.rejects(s.enroll('user'), /verification failed/);
  assert.equal(s.stored.size, 0);
});


test('prepared enrollment invokes WebAuthn immediately without session/network awaits', async () => {
  const s = setup({ access_token: 'session-token' });
  const prepared = await s.prepare();
  s.events.length = 0;
  const completion = s.enroll('user', prepared);
  assert.deepEqual(s.events, ['webauthn']);
  await completion;
});

test('expired prepared challenges do not invoke WebAuthn or store credentials', async () => {
  const s = setup({ access_token: 'session-token' });
  const prepared = await s.prepare();
  prepared.preparedAt = Date.now() - 5 * 60 * 1000;
  s.events.length = 0;
  await assert.rejects(s.enroll('user', prepared), /expirou/);
  assert.equal(s.events.length, 0);
  assert.equal(s.stored.size, 0);
});


test('server setup failure is displayed before invoking Face ID', async () => {
  const message = 'A biometria ainda não está configurada no servidor.';
  const s = setup({ access_token: 'session-token' }, null, message);
  await assert.rejects(s.prepare(), { message });
  assert.equal(s.events.includes('webauthn'), false);
  assert.equal(s.stored.size, 0);
});


test('cancellation messages do not assume a desktop user has an iPhone', () => {
  const s = setup(null);
  const error = new Error('not allowed');
  error.name = 'NotAllowedError';
  const message = s.registrationErrorMessage(error);
  assert.match(message, /navegador/);
  assert.doesNotMatch(message, /iPhone|Face ID/);
});


test('embedded preview failure explains how to activate outside the editor', () => {
  const s = setup(null, null, null, true);
  const error = new Error('not allowed');
  error.name = 'NotAllowedError';
  assert.match(s.registrationErrorMessage(error), /fora do editor/);
});


test('switching accounts preserves each verified credential and never selects another account key', async () => {
  const s = setup({ access_token: 'session-token' });
  await s.enroll('first');
  await s.enroll('second');
  assert.equal(s.getLocalPasskey('first').userId, 'first');
  assert.equal(s.getLocalPasskey('second').userId, 'second');
  assert.equal(s.getLocalPasskey('unknown'), null);
});

test('legacy single-account credential survives enrollment of a second account', async () => {
  const s = setup({ access_token: 'session-token' });
  s.stored.set('axispay.passkey', JSON.stringify({ credentialId: 'old', userId: 'first' }));
  await s.enroll('second');
  assert.equal(s.getLocalPasskey('first').credentialId, 'old');
});

test('prepared login opens native authentication immediately from the tap', async () => {
  const s = setup({ user: { id: 'user' } });
  s.stored.set('axispay.passkey', JSON.stringify({ credentialId: 'credential', userId: 'user' }));
  const prepared = await s.prepareLogin('user');
  s.events.length = 0;
  const result = s.login(prepared);
  assert.deepEqual(s.events, ['authenticate']);
  assert.equal(await result, 'ok');
});

test('a verified session for a different account is rejected and signed out', async () => {
  const s = setup({ user: { id: 'other' } });
  s.stored.set('axispay.passkey', JSON.stringify({ credentialId: 'credential', userId: 'user' }));
  const prepared = await s.prepareLogin('user');
  await assert.rejects(s.login(prepared), /não corresponde/);
  assert.ok(s.events.includes('signOut'));
});


test('the latest password account wins over the legacy biometric pointer after logout', async () => {
  const s = setup({ access_token: 'token' });
  await s.enroll('old');
  await s.enroll('latest');
  s.rememberAccount({ id: 'old', email: 'old@example.com', user_metadata: { name: 'Old' } });
  s.rememberAccount({ id: 'latest', email: 'latest@example.com', user_metadata: { name: 'Latest' } });
  assert.equal(s.getLocalPasskey().userId, 'latest');
  assert.equal(s.getRememberedAccount().email, 'latest@example.com');
  assert.equal(s.getRememberedAccount().name, 'Latest');
  assert.equal(s.getLocalPasskey('old').userId, 'old');
});

test('a last account without biometrics never falls back to an older account key', async () => {
  const s = setup({ access_token: 'token' });
  await s.enroll('old');
  s.rememberAccount({ id: 'new', email: 'new@example.com' });
  assert.equal(s.getLocalPasskey(), null);
  assert.equal(s.getRememberedAccount().email, 'new@example.com');
  assert.equal(s.getLocalPasskey('old').userId, 'old');
  assert.equal(s.stored.has('password'), false);
});


test('server-known account credentials recover authentication without local storage or new enrollment', async () => {
  const s = setup({ user: { id: 'user' } });
  const prepared = await s.prepareExisting('user', { options: { excludeCredentials: [{ id: 'first' }, { id: 'credential' }] } });
  assert.equal(prepared.options.allowCredentials.length, 2);
  assert.equal(s.stored.size, 0);
  assert.equal(s.events.includes('webauthn'), false);
  assert.equal(await s.login(prepared), 'ok');
  assert.equal(s.getLocalPasskey('user').credentialId, 'credential');
  assert.equal(s.getLocalPasskey().userId, 'user');
});

test('only accounts without registered credentials continue to enrollment', async () => {
  const s = setup({ user: { id: 'user' } });
  assert.equal(await s.prepareExisting('user', { options: { excludeCredentials: [] } }), null);
  assert.equal(s.events.length, 0);
});
