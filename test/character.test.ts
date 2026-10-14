import assert from 'node:assert';
import { safeHexColor } from '../src/engine/character';

// Standard node assertions runnable via node or bun test
function runTests() {
  assert.strictEqual(
    safeHexColor('#2563eb', '#ffffff').getHexString(),
    '2563eb',
    'returns THREE.Color with valid 6-digit hex string'
  );

  assert.strictEqual(
    safeHexColor('#f00', '#ffffff').getHexString(),
    'ff0000',
    'returns THREE.Color with valid 3-digit hex string'
  );

  assert.strictEqual(
    safeHexColor('invalid_color_string', '#2563eb').getHexString(),
    '2563eb',
    'falls back to default color on invalid color string'
  );

  assert.strictEqual(
    safeHexColor('red; background: url(x)', '#000000').getHexString(),
    '000000',
    'falls back to default color on malicious inputs'
  );

  assert.strictEqual(
    safeHexColor('rgb(255, 0, 0)', '#000000').getHexString(),
    '000000',
    'falls back to default color on non-hex inputs'
  );
}

runTests();
console.log('All safeHexColor character tests passed!');
