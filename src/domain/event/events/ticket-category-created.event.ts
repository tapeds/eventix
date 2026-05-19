import { IDomainEvent } from '../../../common/domain/domain-event.interface';

export class TicketCategoryCreated implements IDomainEvent {
  public readonly occurredOn: Date;
  public readonly eventName = 'TicketCategoryCreated';
  constructor(
    public readonly payload: { eventId: string; categoryId: string },
  ) {
    this.occurredOn = new Date();
  }
}
