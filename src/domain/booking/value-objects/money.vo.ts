import { ValueObject } from '../../../common/domain/value-object';

interface MoneyProps {
  amount: number;
  currency: string;
}

/**
 * Monetary amount with currency. Amounts are non-negative (US9: the total price
 * cannot be negative) and rounded to 2 decimal places to avoid floating-point
 * drift when accumulating prices.
 */
export class Money extends ValueObject<MoneyProps> {
  static readonly DEFAULT_CURRENCY = 'IDR';

  constructor(amount: number, currency: string = Money.DEFAULT_CURRENCY) {
    if (typeof amount !== 'number' || Number.isNaN(amount)) {
      throw new Error('Money amount must be a valid number');
    }
    if (amount < 0) {
      throw new Error('Money amount cannot be negative');
    }
    if (!currency || currency.trim().length === 0) {
      throw new Error('Money currency cannot be empty');
    }
    super({
      amount: Math.round(amount * 100) / 100,
      currency: currency.trim().toUpperCase(),
    });
  }

  get amount(): number {
    return this.props.amount;
  }

  get currency(): string {
    return this.props.currency;
  }

  static zero(currency: string = Money.DEFAULT_CURRENCY): Money {
    return new Money(0, currency);
  }

  private assertSameCurrency(other: Money): void {
    if (this.props.currency !== other.props.currency) {
      throw new Error(
        `Currency mismatch: ${this.props.currency} vs ${other.props.currency}`,
      );
    }
  }

  add(other: Money): Money {
    this.assertSameCurrency(other);
    return new Money(
      this.props.amount + other.props.amount,
      this.props.currency,
    );
  }

  multiply(factor: number): Money {
    if (typeof factor !== 'number' || Number.isNaN(factor) || factor < 0) {
      throw new Error('Money multiplier must be a non-negative number');
    }
    return new Money(this.props.amount * factor, this.props.currency);
  }

  isZero(): boolean {
    return this.props.amount === 0;
  }

  toString(): string {
    return `${this.props.amount} ${this.props.currency}`;
  }
}
