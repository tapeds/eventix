import { IDomainEvent } from '../../../common/domain/domain-event.interface';

export class UserRegisteredEvent implements IDomainEvent {
  readonly occurredOn: Date;
  readonly eventName = 'UserRegistered';

  constructor(
    readonly userId: string,
    readonly email: string,
    readonly name: string,
    readonly role: string,
  ) {
    this.occurredOn = new Date();
  }
}
