import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync(new URL('../../js/auth-ui.js', import.meta.url), 'utf8');
const html = fs.readFileSync(new URL('../../index.html', import.meta.url), 'utf8');

test('primeiro acesso usa e-mail e código de verificação, sem CPF', () => {
  assert.match(source, /auth\/bootstrap\/send-code/);
  assert.match(source, /emailCode: code/);
  assert.match(source, /alandesouzalobox@gmail\.com/);
  assert.doesNotMatch(source, /cpfValido|auth-cpf|\bcpf\b/i);
  assert.match(html, /auth-admin-email/);
  assert.match(html, /auth-email-code/);
  assert.doesNotMatch(html, /auth-cpf/);
});

test('interface não contém senha administrativa embutida', () => {
  assert.doesNotMatch(source, /password\s*[:=]\s*['"]admin['"]/i);
  assert.match(source, /apiBaseUrl/);
  assert.match(source, /auth\/first-access/);
});
