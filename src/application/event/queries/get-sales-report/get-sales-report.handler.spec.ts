import { GetSalesReportHandler } from './get-sales-report.handler';
import { GetSalesReportQuery } from './get-sales-report.query';
import { EventRepository } from '../../../../domain/event/repositories/event.repository.interface';
import { IBookingRepository } from '../../../../domain/booking/repositories/booking.repository.interface';
import { ITicketRepository } from '../../../../domain/booking/repositories/ticket.repository.interface';
import { Event } from '../../../../domain/event/entities/event.entity';
import { TicketCategory } from '../../../../domain/event/entities/ticket-category.entity';
import { Booking } from '../../../../domain/booking/entities/booking.entity';
import { BookingStatus } from '../../../../domain/booking/value-objects/booking-status.vo';
import { Ticket } from '../../../../domain/booking/entities/ticket.entity';
import { TicketCode } from '../../../../domain/booking/value-objects/ticket-code.vo';
import { TicketStatus } from '../../../../domain/booking/value-objects/ticket-status.vo';
import { Money } from '../../../../common/domain/money.vo';
import { EventNotFoundError } from '../../errors/event-not-found.error';

const NOW = Date.now();
const START = new Date(NOW + 1000 * 60 * 60 * 24);
const END = new Date(START.getTime() + 1000 * 60 * 60);

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
      price: new Money(100_000),
      quota: 50,
      salesStartDate: new Date(NOW),
      salesEndDate: START,
    }),
  );
  event.clearDomainEvents();
  return event;
};

const buildBooking = (id: string, status: BookingStatus): Booking =>
  Booking.reconstitute(id, {
    customerId: `customer-${id}`,
    eventId: 'event-1',
    ticketCategoryId: 'cat-1',
    quantity: 1,
    unitPrice: new Money(100_000),
    serviceFee: Money.zero(),
    totalPrice: new Money(100_000),
    status,
    createdAt: new Date(NOW),
    paymentDeadline: new Date(NOW + 1000 * 60 * 15),
    paidAt: status.isPaid() ? new Date(NOW) : null,
  });

const buildTicket = (id: string, bookingId: string): Ticket =>
  Ticket.reconstitute(id, {
    ticketCode: new TicketCode(`TKT-${id}`),
    bookingId,
    eventId: 'event-1',
    status: TicketStatus.active(),
    issuedAt: new Date(NOW),
    checkedInAt: null,
  });

const makeEventRepo = (event: Event | null): jest.Mocked<EventRepository> => ({
  save: jest.fn(),
  findById: jest.fn().mockResolvedValue(event),
  findPublished: jest.fn(),
});

const makeBookingRepo = (
  bookings: Booking[],
): jest.Mocked<IBookingRepository> => ({
  save: jest.fn(),
  findById: jest.fn(),
  findActiveByCustomerAndEvent: jest.fn(),
  findByEventId: jest.fn().mockResolvedValue(bookings),
  delete: jest.fn(),
});

const makeTicketRepo = (tickets: Ticket[]): jest.Mocked<ITicketRepository> => ({
  save: jest.fn(),
  saveMany: jest.fn(),
  findById: jest.fn(),
  findByCode: jest.fn(),
  findByBookingId: jest.fn(),
  findByCustomerId: jest.fn(),
  findByEventId: jest.fn().mockResolvedValue(tickets),
});

describe('GetSalesReportHandler', () => {
  it('throws EventNotFoundError when the event does not exist', async () => {
    const handler = new GetSalesReportHandler(
      makeEventRepo(null),
      makeBookingRepo([]),
      makeTicketRepo([]),
    );

    await expect(
      handler.execute(new GetSalesReportQuery('missing')),
    ).rejects.toBeInstanceOf(EventNotFoundError);
  });

  it('reports tickets sold, booking status counts and revenue', async () => {
    const paid1 = buildBooking('p1', BookingStatus.paid());
    const paid2 = buildBooking('p2', BookingStatus.paid());
    const pending = buildBooking('pe', BookingStatus.pendingPayment());

    const handler = new GetSalesReportHandler(
      makeEventRepo(buildEvent()),
      makeBookingRepo([paid1, paid2, pending]),
      makeTicketRepo([buildTicket('t1', 'p1'), buildTicket('t2', 'p2')]),
    );

    const report = await handler.execute(new GetSalesReportQuery('event-1'));

    expect(report.ticketsSoldPerCategory).toEqual([
      { categoryId: 'cat-1', categoryName: 'Regular', ticketsSold: 2 },
    ]);
    expect(report.bookingCountsByStatus).toEqual({
      pendingPayment: 1,
      paid: 2,
      expired: 0,
      refunded: 0,
    });
    expect(report.totalRevenue).toBe(200_000);
    expect(report.currency).toBe('IDR');
  });
});
