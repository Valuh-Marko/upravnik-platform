import {
  isValidAccountNumber,
  isValidMaticniBroj,
  isValidPib,
  normaliseAccountNumber,
} from './finance.util';

describe('normaliseAccountNumber', () => {
  it('pads the short form to 18 digits', () => {
    expect(normaliseAccountNumber('840-742221843-57')).toBe(
      '840000074222184357',
    );
    expect(normaliseAccountNumber(' 840-0000742221843-57 ')).toBe(
      '840000074222184357',
    );
  });

  it('accepts the 18-digit form', () => {
    expect(normaliseAccountNumber('840000074222184357')).toBe(
      '840000074222184357',
    );
  });

  it('rejects malformed input', () => {
    expect(normaliseAccountNumber('84-742221843-57')).toBeNull();
    expect(normaliseAccountNumber('840-12345678901234-57')).toBeNull();
    expect(normaliseAccountNumber('84000007422218435')).toBeNull();
    expect(normaliseAccountNumber('abc')).toBeNull();
  });
});

describe('isValidAccountNumber', () => {
  it('accepts a correct control number', () => {
    expect(isValidAccountNumber('840000074222184357')).toBe(true);
  });

  it('rejects a wrong control number', () => {
    expect(isValidAccountNumber('840000074222184358')).toBe(false);
    expect(isValidAccountNumber('840000074222184457')).toBe(false);
  });
});

describe('isValidPib', () => {
  it('accepts real PIBs', () => {
    expect(isValidPib('100002887')).toBe(true);
    expect(isValidPib('104052135')).toBe(true);
  });

  it('rejects a wrong check digit or length', () => {
    expect(isValidPib('100002888')).toBe(false);
    expect(isValidPib('10000288')).toBe(false);
    expect(isValidPib('10000288a')).toBe(false);
  });
});

describe('isValidMaticniBroj', () => {
  it('requires 8 digits', () => {
    expect(isValidMaticniBroj('17542303')).toBe(true);
    expect(isValidMaticniBroj('1754230')).toBe(false);
  });
});
