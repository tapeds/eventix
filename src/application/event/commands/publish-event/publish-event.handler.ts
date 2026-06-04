import { IUseCase } from '../../../../common/application/use-case.interface';
import { IDomainEventPublisher } from '../../../../common/application/domain-event-publisher.interface';
import { EventRepository } from '../../../../domain/event/repositories/event.repository.interface';
import { EventNotFoundError } from '../../errors/event-not-found.error';
import { PublishEventCommand } from './publish-event.command';

export class PublishEventHandler implements IUseCase<
  PublishEventCommand,
  void
> {
  constructor(
    private readonly eventRepository: EventRepository,
    private readonly eventPublisher: IDomainEventPublisher,
  ) {}

  async execute(command: PublishEventCommand): Promise<void> {
    const event = await this.eventRepository.findById(command.eventId);
    if (!event) {
      throw new EventNotFoundError(command.eventId);
    }

    event.publish();

    await this.eventRepository.save(event);
    await this.eventPublisher.publishAll(event.domainEvents);
    event.clearDomainEvents();
  }
}
