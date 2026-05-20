import { IDomainEvent } from '../../../common/domain/domain-event.interface';

export class RefundRequestedEvent implements IDomainEvent {
  readonly occurredOn: Date;
  readonly eventName = 'RefundRequested';

  constructor(
    readonly refundId: string,
    readonly bookingId: string,
    readonly customerId: string,
    readonly amount: number,
    readonly currency: string,
  ) {
    this.occurredOn = new Date();
  }
}
