import { GetEventDetailsHandler } from './get-event-details.handler';
import { GetEventDetailsQuery } from './get-event-details.query';
import { EventRepository } from '../../../../domain/event/repositories/event.repository.interface';
import { Event } from '../../../../domain/event/entities/event.entity';
import { TicketCategory } from '../../../../domain/event/entities/ticket-category.entity';
import { Money } from '../../../../common/domain/money.vo';
import { EventNotFoundError } from '../../errors/event-not-found.error';

const NOW = Date.now();
const START = new Date(NOW + 1000 * 60 * 60 * 24 * 10);
const END = new Date(START.getTime() + 1000 * 60 * 60);

const makeRepo = (event: Event | null): jest.Mocked<EventRepository> => ({
  save: jest.fn(),
  findById: jest.fn().mockResolvedValue(event),
  findPublished: jest.fn(),
});

const eventWithCategory = (salesStart: Date, salesEnd: Date): Event => {
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
      salesStartDate: salesStart,
      salesEndDate: salesEnd,
    }),
  );
  event.clearDomainEvents();
  return event;
};

describe('GetEventDetailsHandler', () => {
  it('throws EventNotFoundError when the event does not exist', async () => {
    const handler = new GetEventDetailsHandler(makeRepo(null));

    await expect(
      handler.execute(new GetEventDetailsQuery('missing')),
    ).rejects.toBeInstanceOf(EventNotFoundError);
  });

  it('marks a category whose sales have not started as ComingSoon', async () => {
    const future = new Date(NOW + 1000 * 60 * 60 * 24);
    const handler = new GetEventDetailsHandler(
      makeRepo(eventWithCategory(future, START)),
    );

    const details = await handler.execute(new GetEventDetailsQuery('event-1'));

    expect(details.ticketCategories[0].purchaseStatus).toBe('ComingSoon');
  });

  it('marks a category within its sales window as OnSale', async () => {
    const past = new Date(NOW - 1000 * 60 * 60);
    const handler = new GetEventDetailsHandler(
      makeRepo(eventWithCategory(past, START)),
    );

    const details = await handler.execute(new GetEventDetailsQuery('event-1'));

    expect(details.ticketCategories[0].purchaseStatus).toBe('OnSale');
  });

  it('marks a category whose sales have ended as SalesClosed', async () => {
    const past = new Date(NOW - 1000 * 60 * 60 * 24 * 2);
    const ended = new Date(NOW - 1000 * 60 * 60 * 24);
    const handler = new GetEventDetailsHandler(
      makeRepo(eventWithCategory(past, ended)),
    );

    const details = await handler.execute(new GetEventDetailsQuery('event-1'));

    expect(details.ticketCategories[0].purchaseStatus).toBe('SalesClosed');
  });
});
