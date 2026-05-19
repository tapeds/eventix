import { IDomainEvent } from '../../../common/domain/domain-event.interface';

export class EventPublished implements IDomainEvent {
  public readonly occurredOn: Date;
  public readonly eventName = 'EventPublished';
  constructor(public readonly payload: { eventId: string }) {
    this.occurredOn = new Date();
  }
}
