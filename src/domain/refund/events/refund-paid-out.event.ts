import { IDomainEvent } from '../../../common/domain/domain-event.interface';

export class RefundPaidOutEvent implements IDomainEvent {
  readonly occurredOn: Date;
  readonly eventName = 'RefundPaidOut';

  constructor(
    readonly refundId: string,
    readonly bookingId: string,
    readonly paymentReference: string,
    readonly paidOutAt: Date,
  ) {
    this.occurredOn = new Date();
  }
}
