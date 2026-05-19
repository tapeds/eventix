export class EventId {
  private readonly _value: string;

  constructor(value: string) {
    if (!value) throw new Error('EventId cannot be empty');
    this._value = value;
  }

  get value(): string {
    return this._value;
  }

  public toString(): string {
    return this._value;
  }
}
