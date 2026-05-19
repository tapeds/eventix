import { IDomainEvent } from '../../../common/domain/domain-event.interface';

export class TicketCategoryDisabled implements IDomainEvent {
  public readonly occurredOn: Date;
  public readonly eventName = 'TicketCategoryDisabled';
  constructor(
    public readonly payload: { eventId: string; categoryId: string },
  ) {
    this.occurredOn = new Date();
  }
}
