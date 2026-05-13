import { IDomainEvent } from '../../../common/domain/domain-event.interface';

export class UserRoleChangedEvent implements IDomainEvent {
  readonly occurredOn: Date;
  readonly eventName = 'UserRoleChanged';

  constructor(
    readonly userId: string,
    readonly previousRole: string,
    readonly newRole: string,
  ) {
    this.occurredOn = new Date();
  }
}
