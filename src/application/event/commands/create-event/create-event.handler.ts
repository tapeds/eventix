import { randomUUID } from 'crypto';
import { IUseCase } from '../../../../common/application/use-case.interface';
import { IDomainEventPublisher } from '../../../../common/application/domain-event-publisher.interface';
import { EventRepository } from '../../../../domain/event/repositories/event.repository.interface';
import { Event } from '../../../../domain/event/entities/event.entity';
import { CreateEventCommand } from './create-event.command';

export class CreateEventHandler implements IUseCase<
  CreateEventCommand,
  { eventId: string }
> {
  constructor(
    private readonly eventRepository: EventRepository,
    private readonly eventPublisher: IDomainEventPublisher,
  ) {}

  async execute(command: CreateEventCommand): Promise<{ eventId: string }> {
    const event = Event.create({
      id: randomUUID(),
      name: command.name,
      description: command.description,
      startDate: command.startDate,
      endDate: command.endDate,
      location: command.location,
      maxCapacity: command.maxCapacity,
    });

    await this.eventRepository.save(event);
    await this.eventPublisher.publishAll(event.domainEvents);
    event.clearDomainEvents();

    return { eventId: event.id };
  }
}
