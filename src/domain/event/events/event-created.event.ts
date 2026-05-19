import { IDomainEvent } from '../../../common/domain/domain-event.interface';

export class EventCreated implements IDomainEvent {
  public readonly occurredOn: Date;
  public readonly eventName = 'EventCreated';
  constructor(public readonly payload: { eventId: string; name: string }) {
    this.occurredOn = new Date();
  }
}
