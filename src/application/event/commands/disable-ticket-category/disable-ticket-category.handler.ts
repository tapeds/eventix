import { IUseCase } from '../../../../common/application/use-case.interface';
import { IDomainEventPublisher } from '../../../../common/application/domain-event-publisher.interface';
import { EventRepository } from '../../../../domain/event/repositories/event.repository.interface';
import { EventNotFoundError } from '../../errors/event-not-found.error';
import { DisableTicketCategoryCommand } from './disable-ticket-category.command';

export class DisableTicketCategoryHandler implements IUseCase<
  DisableTicketCategoryCommand,
  void
> {
  constructor(
    private readonly eventRepository: EventRepository,
    private readonly eventPublisher: IDomainEventPublisher,
  ) {}

  async execute(command: DisableTicketCategoryCommand): Promise<void> {
    const event = await this.eventRepository.findById(command.eventId);
    if (!event) {
      throw new EventNotFoundError(command.eventId);
    }

    event.disableTicketCategory(command.categoryId);

    await this.eventRepository.save(event);
    await this.eventPublisher.publishAll(event.domainEvents);
    event.clearDomainEvents();
  }
}
