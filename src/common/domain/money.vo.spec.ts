import { Money } from './money.vo';

describe('Money value object', () => {
  it('defaults to IDR currency', () => {
    expect(new Money(1000).currency).toBe('IDR');
  });

  it('throws when the amount is negative', () => {
    expect(() => new Money(-1)).toThrow('Money amount cannot be negative');
  });

  it('throws when the amount is not finite', () => {
    expect(() => new Money(Number.NaN)).toThrow('Invalid money amount');
    expect(() => new Money(Number.POSITIVE_INFINITY)).toThrow(
      'Invalid money amount',
    );
  });

  it('adds two amounts of the same currency', () => {
    expect(new Money(1000).add(new Money(250)).amount).toBe(1250);
  });

  it('throws when adding a different currency', () => {
    expect(() => new Money(1000, 'IDR').add(new Money(10, 'USD'))).toThrow(
      'Currency mismatch',
    );
  });

  it('multiplies by a factor', () => {
    expect(new Money(1500).multiply(3).amount).toBe(4500);
  });

  it('throws when multiplying by a non-finite factor', () => {
    expect(() => new Money(1500).multiply(Number.NaN)).toThrow(
      'Invalid factor',
    );
  });

  it('reports equality by amount and currency', () => {
    expect(new Money(1000).equals(new Money(1000))).toBe(true);
    expect(new Money(1000).equals(new Money(1001))).toBe(false);
    expect(new Money(1000, 'IDR').equals(new Money(1000, 'USD'))).toBe(false);
  });

  it('exposes a zero constructor', () => {
    expect(Money.zero().isZero()).toBe(true);
    expect(Money.zero('USD').currency).toBe('USD');
    expect(new Money(1).isZero()).toBe(false);
  });
});
