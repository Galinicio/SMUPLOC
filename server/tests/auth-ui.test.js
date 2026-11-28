import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('../../js/auth-ui.js', import.meta.url), 'utf8');
const context = { document: { addEventListener() {} }, window: {} };
vm.createContext(context);
vm.runInContext(source, context);
const cpfValido = vm.runInContext('AuthUI.cpfValido', context);

test('CPF valida dígitos verificadores sem aceitar sequências repetidas', () => {
  assert.equal(cpfValido('529.982.247-25'), true);
  assert.equal(cpfValido('111.111.111-11'), false);
  assert.equal(cpfValido('529.982.247-24'), false);
  assert.equal(cpfValido('123'), false);
});

test('interface não contém senha administrativa embutida', () => {
  assert.doesNotMatch(source, /password\s*[:=]\s*['"]admin['"]/i);
  assert.match(source, /apiBaseUrl/);
  assert.match(source, /auth\/first-access/);
});
