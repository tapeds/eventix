import { DisableTicketCategoryHandler } from './disable-ticket-category.handler';
import { DisableTicketCategoryCommand } from './disable-ticket-category.command';
import { EventRepository } from '../../../../domain/event/repositories/event.repository.interface';
import { IDomainEventPublisher } from '../../../../common/application/domain-event-publisher.interface';
import { Event } from '../../../../domain/event/entities/event.entity';
import { TicketCategory } from '../../../../domain/event/entities/ticket-category.entity';
import { Money } from '../../../../common/domain/money.vo';
import { EventNotFoundError } from '../../errors/event-not-found.error';

const NOW = Date.now();
const START = new Date(NOW + 1000 * 60 * 60 * 24);
const END = new Date(NOW + 1000 * 60 * 60 * 25);

const buildEvent = (): Event => {
  const event = Event.create({
    id: 'event-1',
    name: 'Concert',
    startDate: START,
    endDate: END,
    maxCapacity: 100,
  });
  event.addTicketCategory(
    new TicketCategory({
      id: 'cat-1',
      name: 'Regular',
      price: new Money(50_000),
      quota: 50,
      salesStartDate: new Date(NOW),
      salesEndDate: new Date(NOW + 1000 * 60 * 60),
    }),
  );
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

describe('DisableTicketCategoryHandler', () => {
  it('disables the category and publishes TicketCategoryDisabled', async () => {
    const event = buildEvent();
    const repo = makeRepo(event);
    const publisher = makePublisher();
    const handler = new DisableTicketCategoryHandler(repo, publisher);

    await handler.execute(new DisableTicketCategoryCommand('event-1', 'cat-1'));

    expect(event.ticketCategories[0].status.isActive()).toBe(false);
    const events = publisher.publishAll.mock.calls[0][0];
    expect(events.map((e) => e.eventName)).toContain('TicketCategoryDisabled');
    expect(event.domainEvents).toHaveLength(0);
  });

  it('throws EventNotFoundError when the event does not exist', async () => {
    const handler = new DisableTicketCategoryHandler(
      makeRepo(null),
      makePublisher(),
    );

    await expect(
      handler.execute(new DisableTicketCategoryCommand('missing', 'cat-1')),
    ).rejects.toBeInstanceOf(EventNotFoundError);
  });

  it('rejects disabling an unknown category', async () => {
    const handler = new DisableTicketCategoryHandler(
      makeRepo(buildEvent()),
      makePublisher(),
    );

    await expect(
      handler.execute(new DisableTicketCategoryCommand('event-1', 'nope')),
    ).rejects.toThrow(/ticket category not found/i);
  });
});
