const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function setup(signupResult) {
  const calls = [];
  let context;
  const React = {
    createContext: () => ({ Provider: 'provider' }),
    useState: (value) => [value, () => {}],
    useRef: (value) => ({ current: value }),
    useCallback: (fn) => fn,
    useEffect: () => {},
  };
  const modules = {
    react: React,
    'react/jsx-runtime': { jsx: (_, props) => { context = props.value; } },
    '@/lib/passkey': { getLocalPasskey: () => null },
    '@/integrations/supabase/client': { supabase: { auth: {
      signUp: async (args) => { calls.push(['signup', args]); return signupResult; },
      signOut: async (args) => { calls.push(['signout', args]); return { error: null }; },
    } } },
  };
  const exports = {};
  const code = ts.transpileModule(readFileSync('src/auth/AuthProvider.tsx', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(code, { exports, require: (id) => modules[id], window: { location: { origin: 'https://app.example' } } });
  exports.AuthProvider({ children: null });
  return { auth: context, calls };
}

test('pending email signup returns confirmation state and the password-login callback URL', async () => {
  const s = setup({ data: { session: null }, error: null });
  const result = await s.auth.signUp('new@example.com', 'password', 'New User');
  assert.equal(result.confirmationRequired, true);
  assert.equal(s.calls[0][1].options.emailRedirectTo, 'https://app.example/auth?confirmed=true');
  assert.equal(s.calls.length, 1);
});

test('signup with automatic server confirmation signs out instead of opening the account', async () => {
  const s = setup({ data: { session: { user: { id: 'new' } } }, error: null });
  const result = await s.auth.signUp('new@example.com', 'password', 'New User');
  assert.equal(result.confirmationRequired, false);
  assert.equal(s.calls[1][0], 'signout');
  assert.equal(s.calls[1][1].scope, 'local');
});

test('signup failure is returned for display without signing out a nonexistent signup session', async () => {
  const error = new Error('Email rate limit');
  const s = setup({ data: { session: null }, error });
  const result = await s.auth.signUp('new@example.com', 'password', 'New User');
  assert.equal(result.error, error);
  assert.equal(s.calls.length, 1);
});
