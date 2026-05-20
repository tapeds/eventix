import { IDomainEvent } from '../../../common/domain/domain-event.interface';

export class TicketReservedEvent implements IDomainEvent {
  readonly occurredOn: Date;
  readonly eventName = 'TicketReserved';

  constructor(
    readonly bookingId: string,
    readonly customerId: string,
    readonly eventId: string,
    readonly ticketCategoryId: string,
    readonly quantity: number,
  ) {
    this.occurredOn = new Date();
  }
}
