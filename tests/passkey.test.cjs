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
    '@simplewebauthn/browser': { startRegistration: async () => { events.push('webauthn'); return { id: 'credential' }; } },
    '@/integrations/supabase/client': { supabase: { auth: { getSession: async () => { events.push("session"); return { data: { session } }; } } } },
    '@/lib/passkey.functions': {
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
    window: { self: 1, top: embedded ? 2 : 1, localStorage: { setItem: (k, v) => stored.set(k, v) } },
  });
  return { registrationErrorMessage: exports.registrationErrorMessage, enroll: exports.enrollPasskey, prepare: exports.preparePasskeyRegistration, calls, stored, events };
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
