import { IDomainEvent } from '../../../common/domain/domain-event.interface';

export class RefundApprovedEvent implements IDomainEvent {
  readonly occurredOn: Date;
  readonly eventName = 'RefundApproved';

  constructor(
    readonly refundId: string,
    readonly bookingId: string,
    readonly approvedAt: Date,
  ) {
    this.occurredOn = new Date();
  }
}
