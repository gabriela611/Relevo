import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toMinorUnits, fromMinorUnits, isAtLeast, formatAmount, isValidDecimalAmount } from '../src/index.js';

test('decimal <-> minor units are exact', () => {
  assert.equal(toMinorUnits('15.00', 2), 1500n);
  assert.equal(toMinorUnits('0.1', 2), 10n);
  assert.equal(toMinorUnits('7', 0), 7n);
  assert.equal(toMinorUnits('1.230', 2), 123n);
  assert.throws(() => toMinorUnits('1.234', 2));
  assert.throws(() => toMinorUnits('-1', 2));
  assert.equal(fromMinorUnits(5n, 2), '0.05');
  assert.equal(fromMinorUnits('1550', 2), '15.50');
  assert.equal(isValidDecimalAmount('0'), false);
  assert.equal(isValidDecimalAmount('0.01'), true);
});

test('isAtLeast compares across scales without floats', () => {
  assert.equal(isAtLeast({ value: '1500', assetScale: 2 }, { value: '15000', assetScale: 3 }), true);
  assert.equal(isAtLeast({ value: '1499', assetScale: 2 }, { value: '15000', assetScale: 3 }), false);
  assert.equal(isAtLeast({ value: '15001', assetScale: 3 }, { value: '1500', assetScale: 2 }), true);
  // 0.1 + 0.2 style float traps
  assert.equal(isAtLeast({ value: '30', assetScale: 2 }, { value: String(toMinorUnits('0.3', 2)), assetScale: 2 }), true);
});

test('formatAmount', () => {
  assert.equal(formatAmount({ value: '1500', assetCode: 'USD', assetScale: 2 }), '15.00 USD');
});
