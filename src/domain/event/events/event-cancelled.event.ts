import { IDomainEvent } from '../../../common/domain/domain-event.interface';

export class EventCancelled implements IDomainEvent {
  public readonly occurredOn: Date;
  public readonly eventName = 'EventCancelled';
  constructor(public readonly payload: { eventId: string; reason?: string }) {
    this.occurredOn = new Date();
  }
}
