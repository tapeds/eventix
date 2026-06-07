import { Injectable, Logger } from '@nestjs/common';
import { IDomainEventPublisher } from '../../common/application/domain-event-publisher.interface';
import { IDomainEvent } from '../../common/domain/domain-event.interface';

@Injectable()
export class InMemoryDomainEventPublisher implements IDomainEventPublisher {
  private readonly logger = new Logger(InMemoryDomainEventPublisher.name);

  publish(event: IDomainEvent): Promise<void> {
    this.logger.log(`${event.eventName} @ ${event.occurredOn.toISOString()}`);
    return Promise.resolve();
  }

  async publishAll(events: IDomainEvent[]): Promise<void> {
    for (const event of events) {
      await this.publish(event);
    }
  }
}
