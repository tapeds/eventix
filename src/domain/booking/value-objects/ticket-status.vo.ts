import { ValueObject } from '../../../common/domain/value-object';

export enum TicketStatusEnum {
  ACTIVE = 'ACTIVE',
  CHECKED_IN = 'CHECKED_IN',
  CANCELLED = 'CANCELLED',
  REFUND_REQUIRED = 'REFUND_REQUIRED',
}

interface TicketStatusProps {
  value: TicketStatusEnum;
}

export class TicketStatus extends ValueObject<TicketStatusProps> {
  constructor(value: TicketStatusEnum) {
    if (!Object.values(TicketStatusEnum).includes(value)) {
      throw new Error(`Invalid ticket status: ${value}`);
    }
    super({ value });
  }

  get value(): TicketStatusEnum {
    return this.props.value;
  }

  isActive(): boolean {
    return this.props.value === TicketStatusEnum.ACTIVE;
  }

  isCheckedIn(): boolean {
    return this.props.value === TicketStatusEnum.CHECKED_IN;
  }

  isCancelled(): boolean {
    return this.props.value === TicketStatusEnum.CANCELLED;
  }

  isRefundRequired(): boolean {
    return this.props.value === TicketStatusEnum.REFUND_REQUIRED;
  }

  static active(): TicketStatus {
    return new TicketStatus(TicketStatusEnum.ACTIVE);
  }

  static checkedIn(): TicketStatus {
    return new TicketStatus(TicketStatusEnum.CHECKED_IN);
  }

  static cancelled(): TicketStatus {
    return new TicketStatus(TicketStatusEnum.CANCELLED);
  }

  static refundRequired(): TicketStatus {
    return new TicketStatus(TicketStatusEnum.REFUND_REQUIRED);
  }

  toString(): string {
    return this.props.value;
  }
}
