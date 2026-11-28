import test from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

async function arquivosJs(diretorio) {
  const encontrados = [];
  for (const item of await readdir(diretorio, { withFileTypes: true })) {
    const completo = path.join(diretorio, item.name);
    if (item.isDirectory()) encontrados.push(...await arquivosJs(completo));
    else if (item.isFile() && item.name.endsWith('.js')) encontrados.push(completo);
  }
  return encontrados;
}

test('todos os módulos JavaScript do navegador mantêm sintaxe válida', async () => {
  const files = await arquivosJs(fileURLToPath(new URL('../../js', import.meta.url)));
  assert.ok(files.length > 0, 'nenhum módulo JavaScript encontrado');
  for (const file of files) {
    const source = await readFile(file, 'utf8');
    assert.doesNotThrow(() => new Function(source), path.relative(process.cwd(), file));
  }
});

test('HTML carrega assinaturas QR antes do leitor e mantém a ficha digital', async () => {
  const html = await readFile(new URL('../../index.html', import.meta.url), 'utf8');
  assert.ok(html.indexOf('js/device-signatures.js') >= 0);
  assert.ok(html.indexOf('js/device-signatures.js') < html.indexOf('js/qr-scanner.js'));
  for (const id of ['device-detail-overlay', 'device-detail-tabs', 'device-detail-content', 'device-detail-page-count']) {
    assert.ok(html.includes('id="' + id + '"') || html.includes("id='" + id + "'"), 'ID ausente: ' + id);
  }
});
