import { PublishEventHandler } from './publish-event.handler';
import { PublishEventCommand } from './publish-event.command';
import { EventRepository } from '../../../../domain/event/repositories/event.repository.interface';
import { IDomainEventPublisher } from '../../../../common/application/domain-event-publisher.interface';
import { Event } from '../../../../domain/event/entities/event.entity';
import { TicketCategory } from '../../../../domain/event/entities/ticket-category.entity';
import { Money } from '../../../../common/domain/money.vo';
import { EventNotFoundError } from '../../errors/event-not-found.error';

const NOW = Date.now();
const START = new Date(NOW + 1000 * 60 * 60 * 24);
const END = new Date(NOW + 1000 * 60 * 60 * 25);
const SALES_START = new Date(NOW - 1000 * 60 * 60);
const SALES_END = new Date(NOW + 1000 * 60 * 60);

const buildEvent = (withCategory = true): Event => {
  const event = Event.create({
    id: 'event-1',
    name: 'Concert',
    startDate: START,
    endDate: END,
    maxCapacity: 100,
  });
  if (withCategory) {
    event.addTicketCategory(
      new TicketCategory({
        id: 'cat-1',
        name: 'Regular',
        price: new Money(50_000),
        quota: 50,
        salesStartDate: SALES_START,
        salesEndDate: SALES_END,
      }),
    );
  }
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

describe('PublishEventHandler', () => {
  it('publishes an event with an active ticket category', async () => {
    const event = buildEvent();
    const repo = makeRepo(event);
    const publisher = makePublisher();
    const handler = new PublishEventHandler(repo, publisher);

    await handler.execute(new PublishEventCommand('event-1'));

    expect(event.status.isPublished()).toBe(true);
    const events = publisher.publishAll.mock.calls[0][0];
    expect(events.map((e) => e.eventName)).toContain('EventPublished');
    expect(event.domainEvents).toHaveLength(0);
  });

  it('throws EventNotFoundError when the event does not exist', async () => {
    const handler = new PublishEventHandler(makeRepo(null), makePublisher());

    await expect(
      handler.execute(new PublishEventCommand('missing')),
    ).rejects.toBeInstanceOf(EventNotFoundError);
  });

  it('rejects publishing without an active ticket category', async () => {
    const handler = new PublishEventHandler(
      makeRepo(buildEvent(false)),
      makePublisher(),
    );

    await expect(
      handler.execute(new PublishEventCommand('event-1')),
    ).rejects.toThrow(/at least one active ticket category/i);
  });

  it('rejects publishing a cancelled event', async () => {
    const event = buildEvent();
    event.cancel();
    event.clearDomainEvents();

    const handler = new PublishEventHandler(makeRepo(event), makePublisher());

    await expect(
      handler.execute(new PublishEventCommand('event-1')),
    ).rejects.toThrow(/only draft events can be published/i);
  });
});
