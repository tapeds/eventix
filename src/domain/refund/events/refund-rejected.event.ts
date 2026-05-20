import { IDomainEvent } from '../../../common/domain/domain-event.interface';

export class RefundRejectedEvent implements IDomainEvent {
  readonly occurredOn: Date;
  readonly eventName = 'RefundRejected';

  constructor(
    readonly refundId: string,
    readonly bookingId: string,
    readonly reason: string,
    readonly rejectedAt: Date,
  ) {
    this.occurredOn = new Date();
  }
}
