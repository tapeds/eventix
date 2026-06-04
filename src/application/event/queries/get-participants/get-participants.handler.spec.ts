import { GetParticipantsHandler } from './get-participants.handler';
import { GetParticipantsQuery } from './get-participants.query';
import { EventRepository } from '../../../../domain/event/repositories/event.repository.interface';
import { IBookingRepository } from '../../../../domain/booking/repositories/booking.repository.interface';
import { ITicketRepository } from '../../../../domain/booking/repositories/ticket.repository.interface';
import { IUserRepository } from '../../../../domain/user/repositories/user.repository.interface';
import { Event } from '../../../../domain/event/entities/event.entity';
import { TicketCategory } from '../../../../domain/event/entities/ticket-category.entity';
import { Booking } from '../../../../domain/booking/entities/booking.entity';
import { BookingStatus } from '../../../../domain/booking/value-objects/booking-status.vo';
import { Ticket } from '../../../../domain/booking/entities/ticket.entity';
import { TicketCode } from '../../../../domain/booking/value-objects/ticket-code.vo';
import { TicketStatus } from '../../../../domain/booking/value-objects/ticket-status.vo';
import { User } from '../../../../domain/user/entities/user.entity';
import { UserRoleEnum } from '../../../../domain/user/value-objects/user-role.vo';
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
      name: 'VIP',
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

const buildUser = (customerId: string, name: string): User =>
  User.reconstitute(customerId, {
    name,
    email: `${name.replace(/\s+/g, '').toLowerCase()}@example.com`,
    role: UserRoleEnum.CUSTOMER,
    passwordHash: 'hash',
    createdAt: new Date(NOW),
    updatedAt: new Date(NOW),
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

const makeUserRepo = (users: User[]): jest.Mocked<IUserRepository> => ({
  save: jest.fn(),
  findById: jest
    .fn()
    .mockImplementation((id: { value: string }) =>
      Promise.resolve(users.find((u) => u.userId.value === id.value) ?? null),
    ),
  findByEmail: jest.fn(),
  existsByEmail: jest.fn(),
  delete: jest.fn(),
});

describe('GetParticipantsHandler', () => {
  it('throws EventNotFoundError when the event does not exist', async () => {
    const handler = new GetParticipantsHandler(
      makeEventRepo(null),
      makeBookingRepo([]),
      makeTicketRepo([]),
      makeUserRepo([]),
    );

    await expect(
      handler.execute(new GetParticipantsQuery('missing')),
    ).rejects.toBeInstanceOf(EventNotFoundError);
  });

  it('lists only participants from paid bookings with resolved names', async () => {
    const paid = buildBooking('paid', BookingStatus.paid());
    const refunded = buildBooking('refunded', BookingStatus.refunded());
    const paidUser = buildUser('customer-paid', 'Alice Paid');

    const handler = new GetParticipantsHandler(
      makeEventRepo(buildEvent()),
      makeBookingRepo([paid, refunded]),
      makeTicketRepo([
        buildTicket('t1', 'paid'),
        buildTicket('t2', 'refunded'),
      ]),
      makeUserRepo([paidUser]),
    );

    const participants = await handler.execute(
      new GetParticipantsQuery('event-1'),
    );

    expect(participants).toHaveLength(1);
    expect(participants[0]).toMatchObject({
      customerId: 'customer-paid',
      customerName: 'Alice Paid',
      ticketCategory: 'VIP',
      ticketCode: 'TKT-T1',
      checkInStatus: 'ACTIVE',
    });
  });
});
