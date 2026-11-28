import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('schema cria isolamento por organização e chave composta de ambiente/ativo', async () => {
  const sql = await readFile(new URL('../schema.sql', import.meta.url), 'utf8');
  assert.match(sql, /PRIMARY KEY \(organization_id, id\)/);
  assert.match(sql, /FOREIGN KEY \(organization_id, environment_id\)/);
  assert.match(sql, /assets_qr_identifier_unique/);
  assert.match(sql, /audit_events/);
});

test('schema não armazena senha de Access Point em coluna dedicada', async () => {
  const sql = await readFile(new URL('../schema.sql', import.meta.url), 'utf8');
  assert.doesNotMatch(sql, /access_point_password|wifi_password|password_qr/i);
});
