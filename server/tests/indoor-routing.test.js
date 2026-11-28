import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const source = await readFile(new URL('../../js/indoor-routing.js', import.meta.url), 'utf8');
const context = { State: {}, MapearModule: {}, MinimapModule: {} };
vm.runInNewContext(source + '\\nglobalThis.__routing = IndoorRouting;', context);
const routing = context.__routing;

test('sem obstáculos mantém rota direta entre origem e destino', () => {
  const route = routing.calcular({ x: 0, z: 0 }, { x: 3, z: 0 }, []);
  assert.equal(route.length, 2);
  assert.deepEqual(JSON.parse(JSON.stringify(route[0])), { x: 0, z: 0 });
});

test('A* contorna uma parede cadastrada em vez de atravessá-la', () => {
  const wall = { x1: 0, z1: -1, x2: 0, z2: 1, largura: 0.2 };
  const route = routing.calcular({ x: -2, z: 0 }, { x: 2, z: 0 }, [wall]);
  assert.ok(route && route.length > 2, 'esperava caminho alternativo');
  const distance = route.reduce((sum, point, i) => i
    ? sum + Math.hypot(point.x - route[i-1].x, point.z - route[i-1].z)
    : 0, 0);
  assert.ok(distance > 4.2, 'rota parece atravessar a parede em linha reta');
});

test('cadastro antigo sem lista de obstáculos continua compatível', async () => {
  const state = await readFile(new URL('../../js/state.js', import.meta.url), 'utf8');
  assert.match(state, /Array\.isArray\(dados\.obstaculos\).*: \[\]/);
});
