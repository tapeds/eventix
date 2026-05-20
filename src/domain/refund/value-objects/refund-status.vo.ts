import { ValueObject } from '../../../common/domain/value-object';

export enum RefundStatusEnum {
  REQUESTED = 'REQUESTED',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  PAID_OUT = 'PAID_OUT',
}

interface RefundStatusProps {
  value: RefundStatusEnum;
}

export class RefundStatus extends ValueObject<RefundStatusProps> {
  constructor(value: RefundStatusEnum) {
    if (!Object.values(RefundStatusEnum).includes(value)) {
      throw new Error(`Invalid refund status: ${value}`);
    }
    super({ value });
  }

  get value(): RefundStatusEnum {
    return this.props.value;
  }

  isRequested(): boolean {
    return this.props.value === RefundStatusEnum.REQUESTED;
  }

  isApproved(): boolean {
    return this.props.value === RefundStatusEnum.APPROVED;
  }

  isRejected(): boolean {
    return this.props.value === RefundStatusEnum.REJECTED;
  }

  isPaidOut(): boolean {
    return this.props.value === RefundStatusEnum.PAID_OUT;
  }

  static requested(): RefundStatus {
    return new RefundStatus(RefundStatusEnum.REQUESTED);
  }

  static approved(): RefundStatus {
    return new RefundStatus(RefundStatusEnum.APPROVED);
  }

  static rejected(): RefundStatus {
    return new RefundStatus(RefundStatusEnum.REJECTED);
  }

  static paidOut(): RefundStatus {
    return new RefundStatus(RefundStatusEnum.PAID_OUT);
  }

  toString(): string {
    return this.props.value;
  }
}
