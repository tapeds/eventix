import { IDomainEvent } from '../../../common/domain/domain-event.interface';

export class BookingPaidEvent implements IDomainEvent {
  readonly occurredOn: Date;
  readonly eventName = 'BookingPaid';

  constructor(
    readonly bookingId: string,
    readonly amount: number,
    readonly currency: string,
    readonly paidAt: Date,
  ) {
    this.occurredOn = new Date();
  }
}
