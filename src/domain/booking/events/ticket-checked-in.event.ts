import { IDomainEvent } from '../../../common/domain/domain-event.interface';

export class TicketCheckedInEvent implements IDomainEvent {
  readonly occurredOn: Date;
  readonly eventName = 'TicketCheckedIn';

  constructor(
    readonly ticketId: string,
    readonly ticketCode: string,
    readonly eventId: string,
    readonly checkedInAt: Date,
  ) {
    this.occurredOn = new Date();
  }
}
