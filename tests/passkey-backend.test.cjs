const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function runtime(user) {
  const exports = {};
  let validations = 0;
  const source = ts.transpileModule(fs.readFileSync('supabase/functions/passkey/runtime.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(source, {
    exports, Error, Deno: { env: { get: () => 'configured' } },
    require: () => ({ createClient: () => ({ auth: { getUser: async () => {
      validations++; return { data: { user }, error: null };
    } } }) }),
  });
  return { define: exports.defineOperation, validations: () => validations };
}

test('edge registration rejects missing and invalid sessions before calling its handler', async () => {
  const r = runtime(null);
  let called = false;
  const operation = r.define().authenticated().inputValidator(x => x).handler(async () => { called = true; });
  await assert.rejects(operation(new Request('https://backend.test'), {}), /Entre com e-mail/);
  await assert.rejects(operation(new Request('https://backend.test', { headers: { Authorization: 'Bearer invalid' } }), {}), /Sessão inválida/);
  assert.equal(called, false);
});

test('edge registration binds the account to the validated token, ignoring a supplied user id', async () => {
  const r = runtime({ id: 'verified-user', email: 'verified@example.test' });
  const operation = r.define().authenticated().inputValidator(x => x).handler(async ({ context }) => context.userId);
  assert.equal(await operation(new Request('https://backend.test', { headers: { Authorization: 'Bearer valid' } }), { userId: 'attacker' }), 'verified-user');
  assert.equal(r.validations(), 1);
});

test('edge login can start without an existing session and still validates input', async () => {
  const r = runtime(null);
  const operation = r.define().inputValidator(x => {
    if (typeof x.credentialId !== 'string') throw new Error('invalid');
    return x;
  }).handler(async ({ data }) => data.credentialId);
  assert.equal(await operation(new Request('https://backend.test'), { credentialId: 'credential' }), 'credential');
  await assert.rejects(operation(new Request('https://backend.test'), {}), /invalid/);
  assert.equal(r.validations(), 0);
});
