import { ValueObject } from '../../../common/domain/value-object';
import { randomUUID } from 'crypto';

interface BookingIdProps {
  value: string;
}

export class BookingId extends ValueObject<BookingIdProps> {
  constructor(value: string) {
    if (!value || value.trim().length === 0) {
      throw new Error('BookingId cannot be empty');
    }
    super({ value });
  }

  get value(): string {
    return this.props.value;
  }

  static generate(): BookingId {
    return new BookingId(randomUUID());
  }

  toString(): string {
    return this.props.value;
  }
}
