import { Money } from './money.vo';

describe('Money value object', () => {
  it('defaults to IDR currency', () => {
    expect(new Money(1000).currency).toBe('IDR');
  });

  it('rounds the amount to 2 decimal places', () => {
    expect(new Money(10.005).amount).toBe(10.01);
  });

  it('throws when the amount is negative', () => {
    expect(() => new Money(-1)).toThrow('Money amount cannot be negative');
  });

  it('throws when the amount is not a number', () => {
    expect(() => new Money(Number.NaN)).toThrow(
      'Money amount must be a valid number',
    );
  });

  it('adds two amounts of the same currency', () => {
    const total = new Money(1000).add(new Money(250));
    expect(total.amount).toBe(1250);
  });

  it('throws when adding a different currency', () => {
    expect(() => new Money(1000, 'IDR').add(new Money(10, 'USD'))).toThrow(
      'Currency mismatch: IDR vs USD',
    );
  });

  it('multiplies by a non-negative factor', () => {
    expect(new Money(1500).multiply(3).amount).toBe(4500);
  });

  it('throws when multiplying by a negative factor', () => {
    expect(() => new Money(1500).multiply(-2)).toThrow(
      'Money multiplier must be a non-negative number',
    );
  });

  it('treats two equal amounts/currencies as equal', () => {
    expect(new Money(1000).equals(new Money(1000))).toBe(true);
    expect(new Money(1000).equals(new Money(1001))).toBe(false);
  });

  it('reports zero correctly', () => {
    expect(Money.zero().isZero()).toBe(true);
    expect(new Money(1).isZero()).toBe(false);
  });
});
