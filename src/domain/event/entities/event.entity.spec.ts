import { Event } from './event.entity';
import { EventId } from '../value-objects/event-id.vo';
import { TicketCategory } from './ticket-category.entity';
import { Money } from '../../../common/domain/money.vo';

describe('Event aggregate', () => {
  const now = new Date();
  const start = new Date(now.getTime() + 1000 * 60 * 60); // +1h
  const end = new Date(now.getTime() + 1000 * 60 * 60 * 2); // +2h

  it('cannot be created with end date before start date', () => {
    expect(() =>
      Event.create({
        id: new EventId('e-1'),
        name: 'Bad Event',
        startDate: end,
        endDate: start,
        maxCapacity: 10,
      }),
    ).toThrow(/end date must be after start date/i);
  });

  it('cannot be created with zero or negative capacity', () => {
    expect(() =>
      Event.create({
        id: new EventId('e-2'),
        name: 'Zero Cap',
        startDate: start,
        endDate: end,
        maxCapacity: 0,
      }),
    ).toThrow(/max capacity must be greater than zero/i);

    expect(() =>
      Event.create({
        id: new EventId('e-3'),
        name: 'Neg Cap',
        startDate: start,
        endDate: end,
        maxCapacity: -5,
      }),
    ).toThrow(/max capacity must be greater than zero/i);
  });

  it('cannot be published without an active ticket category', () => {
    const event = Event.create({
      id: new EventId('e-4'),
      name: 'No Category',
      startDate: start,
      endDate: end,
      maxCapacity: 100,
    });

    expect(() => event.publish()).toThrow(/must have at least one active ticket category/i);
  });

  it('does not allow ticket categories whose total quota exceed event capacity', () => {
    const event = Event.create({
      id: new EventId('e-5'),
      name: 'Small Event',
      startDate: start,
      endDate: end,
      maxCapacity: 5,
    });

    const tc1 = new TicketCategory({
      id: 'tc-1',
      name: 'VIP',
      price: new Money(100000),
      quota: 3,
      salesStartDate: new Date(now.getTime()),
      salesEndDate: new Date(start.getTime()),
    });

    const tc2 = new TicketCategory({
      id: 'tc-2',
      name: 'Regular',
      price: new Money(50000),
      quota: 3,
      salesStartDate: new Date(now.getTime()),
      salesEndDate: new Date(start.getTime()),
    });

    event.addTicketCategory(tc1);
    expect(() => event.addTicketCategory(tc2)).toThrow(/total ticket quota cannot exceed event max capacity/i);
  });

  it('does not allow ticket category sales end after event start', () => {
    const event = Event.create({
      id: new EventId('e-6'),
      name: 'Sales Date Event',
      startDate: start,
      endDate: end,
      maxCapacity: 10,
    });

    const tc = new TicketCategory({
      id: 'tc-3',
      name: 'LateSales',
      price: new Money(10000),
      quota: 1,
      salesStartDate: new Date(now.getTime()),
      salesEndDate: new Date(end.getTime() + 1000), // after event start
    });

    expect(() => event.addTicketCategory(tc)).toThrow(/sales end must be before or at event start date/i);
  });
});
