import { ValueObject } from '../../../common/domain/value-object';
import { randomUUID } from 'crypto';

interface RefundIdProps {
  value: string;
}

export class RefundId extends ValueObject<RefundIdProps> {
  constructor(value: string) {
    if (!value || value.trim().length === 0) {
      throw new Error('RefundId cannot be empty');
    }
    super({ value });
  }

  get value(): string {
    return this.props.value;
  }

  static generate(): RefundId {
    return new RefundId(randomUUID());
  }

  toString(): string {
    return this.props.value;
  }
}
