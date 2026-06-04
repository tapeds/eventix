/* eslint-disable @typescript-eslint/unbound-method -- jest.Mocked<T> mock references trigger a false positive */
import { CreateEventHandler } from './create-event.handler';
import { CreateEventCommand } from './create-event.command';
import { EventRepository } from '../../../../domain/event/repositories/event.repository.interface';
import { IDomainEventPublisher } from '../../../../common/application/domain-event-publisher.interface';
import { Event } from '../../../../domain/event/entities/event.entity';
import { EventStatusEnum } from '../../../../domain/event/value-objects/event-status.vo';

const NOW = Date.now();
const START = new Date(NOW + 1000 * 60 * 60);
const END = new Date(NOW + 1000 * 60 * 60 * 2);

const makeRepo = (): jest.Mocked<EventRepository> => ({
  save: jest.fn().mockResolvedValue(undefined),
  findById: jest.fn(),
  findPublished: jest.fn(),
});

const makePublisher = (): jest.Mocked<IDomainEventPublisher> => ({
  publish: jest.fn().mockResolvedValue(undefined),
  publishAll: jest.fn().mockResolvedValue(undefined),
});

describe('CreateEventHandler', () => {
  it('creates a draft event and publishes EventCreated', async () => {
    const repo = makeRepo();
    const publisher = makePublisher();
    const handler = new CreateEventHandler(repo, publisher);

    const result = await handler.execute(
      new CreateEventCommand('Concert', START, END, 100, 'desc', 'Jakarta'),
    );

    expect(result.eventId).toBeTruthy();
    const saved = repo.save.mock.calls[0][0];
    expect(saved.status.value).toBe(EventStatusEnum.Draft);
    expect(publisher.publishAll).toHaveBeenCalledTimes(1);
    const events = publisher.publishAll.mock.calls[0][0];
    expect(events.map((e) => e.eventName)).toContain('EventCreated');
    expect(saved.domainEvents).toHaveLength(0);
  });

  it('rejects an event whose end date is before its start date', async () => {
    const handler = new CreateEventHandler(makeRepo(), makePublisher());

    await expect(
      handler.execute(new CreateEventCommand('Bad', END, START, 100)),
    ).rejects.toThrow(/end date must be after start date/i);
  });

  it('rejects an event with zero or negative capacity', async () => {
    const handler = new CreateEventHandler(makeRepo(), makePublisher());

    await expect(
      handler.execute(new CreateEventCommand('Zero', START, END, 0)),
    ).rejects.toThrow(/max capacity must be greater than zero/i);
  });
});
