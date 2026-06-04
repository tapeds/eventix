import { IUseCase } from '../../../../common/application/use-case.interface';
import { IDomainEventPublisher } from '../../../../common/application/domain-event-publisher.interface';
import { EventRepository } from '../../../../domain/event/repositories/event.repository.interface';
import { EventNotFoundError } from '../../errors/event-not-found.error';
import { CancelEventCommand } from './cancel-event.command';

export class CancelEventHandler implements IUseCase<CancelEventCommand, void> {
  constructor(
    private readonly eventRepository: EventRepository,
    private readonly eventPublisher: IDomainEventPublisher,
  ) {}

  async execute(command: CancelEventCommand): Promise<void> {
    const event = await this.eventRepository.findById(command.eventId);
    if (!event) {
      throw new EventNotFoundError(command.eventId);
    }

    event.cancel(command.reason);

    await this.eventRepository.save(event);
    await this.eventPublisher.publishAll(event.domainEvents);
    event.clearDomainEvents();

    // TODO: marking paid bookings as requiring a refund (US3) is a cross-aggregate
    // reaction driven by the EventCancelled domain event; it belongs in an event
    // subscriber, not in this handler.
  }
}
