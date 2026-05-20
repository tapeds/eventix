import { ValueObject } from '../../../common/domain/value-object';
import { randomUUID } from 'crypto';

interface TicketCodeProps {
  value: string;
}

/**
 * A unique, human-presentable code printed on an issued ticket and scanned at the
 * gate. Uniqueness at scale is ultimately enforced by the persistence layer; this
 * value object only guarantees a well-formed, non-empty code.
 */
export class TicketCode extends ValueObject<TicketCodeProps> {
  private static readonly PREFIX = 'TKT-';

  constructor(value: string) {
    if (!value || value.trim().length === 0) {
      throw new Error('TicketCode cannot be empty');
    }
    super({ value: value.trim().toUpperCase() });
  }

  get value(): string {
    return this.props.value;
  }

  static generate(): TicketCode {
    const suffix = randomUUID().replace(/-/g, '').slice(0, 12).toUpperCase();
    return new TicketCode(`${TicketCode.PREFIX}${suffix}`);
  }

  toString(): string {
    return this.props.value;
  }
}
