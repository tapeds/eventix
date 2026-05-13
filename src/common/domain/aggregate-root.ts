import { IDomainEvent } from './domain-event.interface';
import { BaseEntity } from './base.entity';

export abstract class AggregateRoot<TId> extends BaseEntity<TId> {
  private _domainEvents: IDomainEvent[] = [];

  get domainEvents(): IDomainEvent[] {
    return [...this._domainEvents];
  }

  protected addDomainEvent(event: IDomainEvent): void {
    this._domainEvents.push(event);
  }

  public clearDomainEvents(): void {
    this._domainEvents = [];
  }
}
