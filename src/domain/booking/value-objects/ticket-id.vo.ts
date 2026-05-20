import { ValueObject } from '../../../common/domain/value-object';
import { randomUUID } from 'crypto';

interface TicketIdProps {
  value: string;
}

export class TicketId extends ValueObject<TicketIdProps> {
  constructor(value: string) {
    if (!value || value.trim().length === 0) {
      throw new Error('TicketId cannot be empty');
    }
    super({ value });
  }

  get value(): string {
    return this.props.value;
  }

  static generate(): TicketId {
    return new TicketId(randomUUID());
  }

  toString(): string {
    return this.props.value;
  }
}
