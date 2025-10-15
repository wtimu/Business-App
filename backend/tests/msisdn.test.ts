import { describe, expect, it } from 'vitest';
import { normalizeMsisdn } from '../src/utils/msisdn.js';

describe('normalizeMsisdn', () => {
  it('normalizes 07 format', () => {
    expect(normalizeMsisdn('0789123456')).toEqual('256789123456');
  });

  it('normalizes +256 format', () => {
    expect(normalizeMsisdn('+256789123456')).toEqual('256789123456');
  });

  it('throws on invalid number', () => {
    expect(() => normalizeMsisdn('12345')).toThrow('Invalid Ugandan MSISDN');
  });
});
