import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const source = await readFile(new URL('../../js/device-signatures.js', import.meta.url), 'utf8');
const context = {};
vm.runInNewContext(source, context);
const detectar = context.DeviceSignatures.detectar;

test('reconhece UC HYB pela assinatura observada sem expor a senha', () => {
  const result = detectar('wifismup');
  assert.equal(result.tipo, 'UC HYB');
  assert.equal(result.conteudoSensivel, true);
  assert.equal(result.identificacaoIndividual, false);
  assert.equal('password' in result, false);
});

test('reconhece UC pela combinação de campos mesmo com quebras de linha', () => {
  const result = detectar('www.smupweb.com.br\nEL5200.05VUSB\ncorrentout2000mA');
  assert.equal(result.tipo, 'UC');
  assert.equal(result.modelo, 'EL5200.05VUSB');
  assert.equal(result.identificacaoIndividual, false);
});

test('não classifica texto parcial como dispositivo SMUP', () => {
  assert.equal(detectar('EL5200.05VUSB'), null);
  assert.equal(detectar('wifismup-extra'), null);
});
