import { ValueObject } from '../../../common/domain/value-object';

export enum BookingStatusEnum {
  PENDING_PAYMENT = 'PENDING_PAYMENT',
  PAID = 'PAID',
  EXPIRED = 'EXPIRED',
  REFUNDED = 'REFUNDED',
}

interface BookingStatusProps {
  value: BookingStatusEnum;
}

export class BookingStatus extends ValueObject<BookingStatusProps> {
  constructor(value: BookingStatusEnum) {
    if (!Object.values(BookingStatusEnum).includes(value)) {
      throw new Error(`Invalid booking status: ${value}`);
    }
    super({ value });
  }

  get value(): BookingStatusEnum {
    return this.props.value;
  }

  isPendingPayment(): boolean {
    return this.props.value === BookingStatusEnum.PENDING_PAYMENT;
  }

  isPaid(): boolean {
    return this.props.value === BookingStatusEnum.PAID;
  }

  isExpired(): boolean {
    return this.props.value === BookingStatusEnum.EXPIRED;
  }

  isRefunded(): boolean {
    return this.props.value === BookingStatusEnum.REFUNDED;
  }

  static pendingPayment(): BookingStatus {
    return new BookingStatus(BookingStatusEnum.PENDING_PAYMENT);
  }

  static paid(): BookingStatus {
    return new BookingStatus(BookingStatusEnum.PAID);
  }

  static expired(): BookingStatus {
    return new BookingStatus(BookingStatusEnum.EXPIRED);
  }

  static refunded(): BookingStatus {
    return new BookingStatus(BookingStatusEnum.REFUNDED);
  }

  toString(): string {
    return this.props.value;
  }
}
