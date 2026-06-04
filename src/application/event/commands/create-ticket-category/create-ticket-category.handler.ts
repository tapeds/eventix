import { randomUUID } from 'crypto';
import { IUseCase } from '../../../../common/application/use-case.interface';
import { IDomainEventPublisher } from '../../../../common/application/domain-event-publisher.interface';
import { EventRepository } from '../../../../domain/event/repositories/event.repository.interface';
import { TicketCategory } from '../../../../domain/event/entities/ticket-category.entity';
import { Money } from '../../../../common/domain/money.vo';
import { EventNotFoundError } from '../../errors/event-not-found.error';
import { CreateTicketCategoryCommand } from './create-ticket-category.command';

export class CreateTicketCategoryHandler implements IUseCase<
  CreateTicketCategoryCommand,
  { categoryId: string }
> {
  constructor(
    private readonly eventRepository: EventRepository,
    private readonly eventPublisher: IDomainEventPublisher,
  ) {}

  async execute(
    command: CreateTicketCategoryCommand,
  ): Promise<{ categoryId: string }> {
    const event = await this.eventRepository.findById(command.eventId);
    if (!event) {
      throw new EventNotFoundError(command.eventId);
    }

    const categoryId = randomUUID();
    const category = new TicketCategory({
      id: categoryId,
      name: command.name,
      price: new Money(command.price, command.currency),
      quota: command.quota,
      salesStartDate: command.salesStartDate,
      salesEndDate: command.salesEndDate,
    });

    event.addTicketCategory(category);

    await this.eventRepository.save(event);
    await this.eventPublisher.publishAll(event.domainEvents);
    event.clearDomainEvents();

    return { categoryId };
  }
}
