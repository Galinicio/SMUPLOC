import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('CSS mantém alvos de toque e movimento reduzido em telas pequenas', async () => {
  const css = await readFile(new URL('../../css/styles.css', import.meta.url), 'utf8');
  assert.match(css, /min-height:\s*44px/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
  assert.match(css, /overscroll-behavior-y:\s*contain/);
  assert.match(css, /#canvas-expandido\s*\{\s*touch-action:\s*none/);
});
