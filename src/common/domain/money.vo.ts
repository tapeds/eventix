export class Money {
  private readonly _amount: number;
  private readonly _currency: string;

  constructor(amount: number, currency = 'IDR') {
    if (!Number.isFinite(amount)) throw new Error('Invalid money amount');
    if (amount < 0) throw new Error('Money amount cannot be negative');
    this._amount = amount;
    this._currency = currency;
  }

  get amount(): number {
    return this._amount;
  }

  get currency(): string {
    return this._currency;
  }

  public add(other: Money): Money {
    this.assertSameCurrency(other);
    return new Money(this._amount + other._amount, this._currency);
  }

  public multiply(factor: number): Money {
    if (!Number.isFinite(factor)) throw new Error('Invalid factor');
    return new Money(this._amount * factor, this._currency);
  }

  private assertSameCurrency(other: Money) {
    if (this._currency !== other._currency)
      throw new Error('Currency mismatch');
  }
}
