import { CreateTicketCategoryHandler } from './create-ticket-category.handler';
import { CreateTicketCategoryCommand } from './create-ticket-category.command';
import { EventRepository } from '../../../../domain/event/repositories/event.repository.interface';
import { IDomainEventPublisher } from '../../../../common/application/domain-event-publisher.interface';
import { Event } from '../../../../domain/event/entities/event.entity';
import { EventNotFoundError } from '../../errors/event-not-found.error';

const NOW = Date.now();
const START = new Date(NOW + 1000 * 60 * 60 * 24);
const END = new Date(NOW + 1000 * 60 * 60 * 25);
const SALES_START = new Date(NOW);
const SALES_END = new Date(NOW + 1000 * 60 * 60);
const AFTER_EVENT_START = new Date(START.getTime() + 1000 * 60 * 60);

const buildEvent = (maxCapacity = 100): Event => {
  const event = Event.create({
    id: 'event-1',
    name: 'Concert',
    startDate: START,
    endDate: END,
    maxCapacity,
  });
  event.clearDomainEvents();
  return event;
};

const makeRepo = (event: Event | null): jest.Mocked<EventRepository> => ({
  save: jest.fn().mockResolvedValue(undefined),
  findById: jest.fn().mockResolvedValue(event),
  findPublished: jest.fn(),
});

const makePublisher = (): jest.Mocked<IDomainEventPublisher> => ({
  publish: jest.fn().mockResolvedValue(undefined),
  publishAll: jest.fn().mockResolvedValue(undefined),
});

const command = (overrides: Partial<CreateTicketCategoryCommand> = {}) =>
  new CreateTicketCategoryCommand(
    overrides.eventId ?? 'event-1',
    overrides.name ?? 'Regular',
    overrides.price ?? 50_000,
    overrides.quota ?? 50,
    overrides.salesStartDate ?? SALES_START,
    overrides.salesEndDate ?? SALES_END,
  );

describe('CreateTicketCategoryHandler', () => {
  it('adds a ticket category and publishes TicketCategoryCreated', async () => {
    const event = buildEvent();
    const repo = makeRepo(event);
    const publisher = makePublisher();
    const handler = new CreateTicketCategoryHandler(repo, publisher);

    const result = await handler.execute(command());

    expect(result.categoryId).toBeTruthy();
    expect(event.ticketCategories).toHaveLength(1);
    const events = publisher.publishAll.mock.calls[0][0];
    expect(events.map((e) => e.eventName)).toContain('TicketCategoryCreated');
    expect(event.domainEvents).toHaveLength(0);
  });

  it('throws EventNotFoundError when the event does not exist', async () => {
    const handler = new CreateTicketCategoryHandler(
      makeRepo(null),
      makePublisher(),
    );

    await expect(handler.execute(command())).rejects.toBeInstanceOf(
      EventNotFoundError,
    );
  });

  it('rejects a quota that exceeds the event max capacity', async () => {
    const handler = new CreateTicketCategoryHandler(
      makeRepo(buildEvent(10)),
      makePublisher(),
    );

    await expect(handler.execute(command({ quota: 50 }))).rejects.toThrow(
      /quota cannot exceed event max capacity/i,
    );
  });

  it('rejects sales ending after the event start date', async () => {
    const handler = new CreateTicketCategoryHandler(
      makeRepo(buildEvent()),
      makePublisher(),
    );

    await expect(
      handler.execute(command({ salesEndDate: AFTER_EVENT_START })),
    ).rejects.toThrow(/sales end must be before or at event start/i);
  });
});
