import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const source = await readFile(new URL('../../js/api-client.js', import.meta.url), 'utf8');

test('cliente API fica desativado quando não há URL configurada', () => {
  const store = new Map();
  const context = {
    window: { SMUPLOC_CONFIG: {} },
    sessionStorage: {
      getItem: key => store.get(key) || null,
      setItem: (key, value) => store.set(key, value),
      removeItem: key => store.delete(key)
    }
  };
  vm.runInNewContext(source + String.fromCharCode(10) + 'globalThis.__api = SmupLocApi;', context);
  assert.equal(context.__api.configurado(), false);
  assert.equal(context.__api.autenticado(), false);
});

test('cliente API mantém token apenas na sessão e limpa ao sair', async () => {
  const store = new Map();
  const context = {
    window: { SMUPLOC_CONFIG: { apiBaseUrl: 'https://api.example.test/' } },
    sessionStorage: {
      getItem: key => store.get(key) || null,
      setItem: (key, value) => store.set(key, value),
      removeItem: key => store.delete(key)
    },
    fetch: async () => ({
      ok: true,
      json: async () => ({ token: 'token-temporario', user: { id: 'u1', role: 'technician' } })
    })
  };
  vm.runInNewContext(source + String.fromCharCode(10) + 'globalThis.__api = SmupLocApi;', context);
  const user = await context.__api.login('tecnico@example.test', 'senha-forte');
  assert.equal(user.id, 'u1');
  assert.equal(store.get('smuploc_api_token'), 'token-temporario');
  context.__api.logout();
  assert.equal(store.has('smuploc_api_token'), false);
});
