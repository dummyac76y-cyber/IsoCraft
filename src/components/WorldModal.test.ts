// @ts-ignore
import { describe, test, expect } from 'bun:test';
import { sanitizeSeed } from './WorldModal';

describe('WorldModal sanitizeSeed', () => {
  test('returns valid integer seeds unchanged when within range [1, 999999]', () => {
    expect(sanitizeSeed('1')).toBe(1);
    expect(sanitizeSeed('42')).toBe(42);
    expect(sanitizeSeed('999999')).toBe(999999);
    expect(sanitizeSeed(12345)).toBe(12345);
  });

  test('clamps upper bound to 999999', () => {
    expect(sanitizeSeed('1000000')).toBe(999999);
    expect(sanitizeSeed('999999999')).toBe(999999);
    expect(sanitizeSeed(1000000)).toBe(999999);
  });

  test('handles negative numbers safely by taking absolute value and clamping min to 1', () => {
    expect(sanitizeSeed('-500')).toBe(500);
    expect(sanitizeSeed('-10000000')).toBe(999999);
    expect(sanitizeSeed('-0')).toBe(1);
    expect(sanitizeSeed(0)).toBe(1);
  });

  test('returns fallback seed 1 for non-integer or decimal input strings', () => {
    expect(sanitizeSeed('12.34')).toBe(1);
    expect(sanitizeSeed('100.5')).toBe(1);
  });

  test('returns fallback seed 1 for non-numeric, malicious, empty, or special inputs', () => {
    expect(sanitizeSeed('')).toBe(1);
    expect(sanitizeSeed('   ')).toBe(1);
    expect(sanitizeSeed('abc')).toBe(1);
    expect(sanitizeSeed('123abc')).toBe(1);
    expect(sanitizeSeed('<script>alert(1)</script>')).toBe(1);
    expect(sanitizeSeed('NaN')).toBe(1);
    expect(sanitizeSeed('Infinity')).toBe(1);
    expect(sanitizeSeed(NaN)).toBe(1);
    expect(sanitizeSeed(Infinity)).toBe(1);
  });
});
