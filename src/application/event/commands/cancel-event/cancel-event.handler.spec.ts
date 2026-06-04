import { CancelEventHandler } from './cancel-event.handler';
import { CancelEventCommand } from './cancel-event.command';
import { EventRepository } from '../../../../domain/event/repositories/event.repository.interface';
import { IDomainEventPublisher } from '../../../../common/application/domain-event-publisher.interface';
import { Event } from '../../../../domain/event/entities/event.entity';
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

describe('CancelEventHandler', () => {
  it('cancels the event and publishes EventCancelled', async () => {
    const event = buildEvent();
    const repo = makeRepo(event);
    const publisher = makePublisher();
    const handler = new CancelEventHandler(repo, publisher);

    await handler.execute(new CancelEventCommand('event-1', 'venue closed'));

    expect(event.status.isCancelled()).toBe(true);
    const events = publisher.publishAll.mock.calls[0][0];
    expect(events.map((e) => e.eventName)).toContain('EventCancelled');
    expect(event.domainEvents).toHaveLength(0);
  });

  it('throws EventNotFoundError when the event does not exist', async () => {
    const handler = new CancelEventHandler(makeRepo(null), makePublisher());

    await expect(
      handler.execute(new CancelEventCommand('missing')),
    ).rejects.toBeInstanceOf(EventNotFoundError);
  });

  it('rejects cancelling an already cancelled event', async () => {
    const event = buildEvent();
    event.cancel();
    event.clearDomainEvents();

    const handler = new CancelEventHandler(makeRepo(event), makePublisher());

    await expect(
      handler.execute(new CancelEventCommand('event-1')),
    ).rejects.toThrow(/already cancelled/i);
  });
});
