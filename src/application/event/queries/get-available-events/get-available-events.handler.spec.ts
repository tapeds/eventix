import { GetAvailableEventsHandler } from './get-available-events.handler';
import { GetAvailableEventsQuery } from './get-available-events.query';
import { EventRepository } from '../../../../domain/event/repositories/event.repository.interface';
import { Event } from '../../../../domain/event/entities/event.entity';
import { TicketCategory } from '../../../../domain/event/entities/ticket-category.entity';
import { Money } from '../../../../common/domain/money.vo';

const ONE_HOUR = 1000 * 60 * 60;

const buildEvent = (
  id: string,
  opts: { location?: string; start: Date; end: Date; prices: number[] },
): Event => {
  const event = Event.create({
    id,
    name: `Event ${id}`,
    startDate: opts.start,
    endDate: opts.end,
    location: opts.location,
    maxCapacity: 1000,
  });
  opts.prices.forEach((price, i) =>
    event.addTicketCategory(
      new TicketCategory({
        id: `${id}-cat-${i}`,
        name: `Cat ${i}`,
        price: new Money(price),
        quota: 10,
        salesStartDate: new Date(opts.start.getTime() - 2 * ONE_HOUR),
        salesEndDate: new Date(opts.start.getTime() - ONE_HOUR),
      }),
    ),
  );
  event.clearDomainEvents();
  return event;
};

const makeRepo = (events: Event[]): jest.Mocked<EventRepository> => ({
  save: jest.fn(),
  findById: jest.fn(),
  findPublished: jest.fn().mockResolvedValue(events),
});

describe('GetAvailableEventsHandler', () => {
  const jun10 = new Date('2026-06-10T10:00:00Z');
  const jun11 = new Date('2026-06-11T10:00:00Z');
  const jul01 = new Date('2026-07-01T10:00:00Z');
  const jul02 = new Date('2026-07-02T10:00:00Z');

  it('returns published events with the lowest active price', async () => {
    const repo = makeRepo([
      buildEvent('a', {
        location: 'Jakarta',
        start: jun11,
        end: jun11,
        prices: [80_000, 50_000],
      }),
    ]);
    const handler = new GetAvailableEventsHandler(repo);

    const result = await handler.execute(new GetAvailableEventsQuery());

    expect(result).toHaveLength(1);
    expect(result[0].lowestPrice).toBe(50_000);
  });

  it('returns null lowestPrice when an event has no categories', async () => {
    const repo = makeRepo([
      buildEvent('a', { start: jun11, end: jun11, prices: [] }),
    ]);
    const handler = new GetAvailableEventsHandler(repo);

    const [summary] = await handler.execute(new GetAvailableEventsQuery());

    expect(summary.lowestPrice).toBeNull();
  });

  it('filters by date within the event window', async () => {
    const repo = makeRepo([
      buildEvent('a', { start: jun10, end: jun11, prices: [10] }),
      buildEvent('b', { start: jul01, end: jul02, prices: [20] }),
    ]);
    const handler = new GetAvailableEventsHandler(repo);

    const result = await handler.execute(
      new GetAvailableEventsQuery({ date: jun10 }),
    );

    expect(result.map((e) => e.id)).toEqual(['a']);
  });

  it('filters by location (case-insensitive substring)', async () => {
    const repo = makeRepo([
      buildEvent('a', {
        location: 'Jakarta',
        start: jun11,
        end: jun11,
        prices: [10],
      }),
      buildEvent('b', {
        location: 'Bandung',
        start: jun11,
        end: jun11,
        prices: [20],
      }),
    ]);
    const handler = new GetAvailableEventsHandler(repo);

    const result = await handler.execute(
      new GetAvailableEventsQuery({ location: 'jakarta' }),
    );

    expect(result.map((e) => e.id)).toEqual(['a']);
  });
});
