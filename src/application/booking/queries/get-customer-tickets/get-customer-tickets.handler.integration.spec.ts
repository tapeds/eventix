import { AppDataSource } from '../../../../infrastructure/database/data-source';
import { BookingOrmEntity } from '../../../../infrastructure/booking/persistence/booking.orm-entity';
import { BookingRepository } from '../../../../infrastructure/booking/persistence/booking.repository';
import { TicketOrmEntity } from '../../../../infrastructure/booking/persistence/ticket.orm-entity';
import { TicketRepository } from '../../../../infrastructure/booking/persistence/ticket.repository';
import { TicketReadModelTypeorm } from '../../../../infrastructure/booking/read-models/ticket.read-model';
import { GetCustomerTicketsHandler } from './get-customer-tickets.handler';
import { GetCustomerTicketsQuery } from './get-customer-tickets.query';
import { Booking } from '../../../../domain/booking/entities/booking.entity';
import { BookingStatus } from '../../../../domain/booking/value-objects/booking-status.vo';
import { Money } from '../../../../common/domain/money.vo';
import { Ticket } from '../../../../domain/booking/entities/ticket.entity';
import { TicketCode } from '../../../../domain/booking/value-objects/ticket-code.vo';
import {
  TicketStatus,
  TicketStatusEnum,
} from '../../../../domain/booking/value-objects/ticket-status.vo';

const CUSTOMER_A = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const CUSTOMER_B = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const EVENT_ID = '11111111-1111-1111-1111-111111111111';
const CATEGORY_ID = '22222222-2222-2222-2222-222222222222';

const PAID_BOOKING_A = 'a1111111-1111-1111-1111-111111111111';
const PENDING_BOOKING_A = 'a2222222-2222-2222-2222-222222222222';
const PAID_BOOKING_B = 'b1111111-1111-1111-1111-111111111111';

const TICKET_A_OLDER = 'f1111111-1111-1111-1111-111111111111';
const TICKET_A_NEWER = 'f2222222-2222-2222-2222-222222222222';
const TICKET_A_PENDING = 'f3333333-3333-3333-3333-333333333333';
const TICKET_B = 'fbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

const buildBooking = (
  id: string,
  customerId: string,
  status: BookingStatus,
): Booking =>
  Booking.reconstitute(id, {
    customerId,
    eventId: EVENT_ID,
    ticketCategoryId: CATEGORY_ID,
    quantity: 1,
    unitPrice: new Money(50_000),
    serviceFee: Money.zero(),
    totalPrice: new Money(50_000),
    status,
    createdAt: new Date('2026-05-01T00:00:00Z'),
    paymentDeadline: new Date('2026-05-01T00:15:00Z'),
    paidAt: status.isPaid() ? new Date('2026-05-01T00:10:00Z') : null,
  });

const buildTicket = (
  id: string,
  bookingId: string,
  code: string,
  issuedAt: Date,
  status: TicketStatus = TicketStatus.active(),
): Ticket =>
  Ticket.reconstitute(id, {
    ticketCode: new TicketCode(code),
    bookingId,
    eventId: EVENT_ID,
    status,
    issuedAt,
    checkedInAt: null,
  });

describe('GetCustomerTicketsHandler (integration)', () => {
  let bookingRepo: BookingRepository;
  let ticketRepo: TicketRepository;
  let handler: GetCustomerTicketsHandler;

  beforeAll(async () => {
    await AppDataSource.initialize();
  });

  afterAll(async () => {
    await AppDataSource.destroy();
  });

  beforeEach(async () => {
    await AppDataSource.query('TRUNCATE TABLE tickets, bookings CASCADE');
    bookingRepo = new BookingRepository(
      AppDataSource.getRepository(BookingOrmEntity),
    );
    ticketRepo = new TicketRepository(
      AppDataSource.getRepository(TicketOrmEntity),
    );
    const readModel = new TicketReadModelTypeorm(AppDataSource);
    handler = new GetCustomerTicketsHandler(readModel);

    await bookingRepo.save(
      buildBooking(PAID_BOOKING_A, CUSTOMER_A, BookingStatus.paid()),
    );
    await bookingRepo.save(
      buildBooking(
        PENDING_BOOKING_A,
        CUSTOMER_A,
        BookingStatus.pendingPayment(),
      ),
    );
    await bookingRepo.save(
      buildBooking(PAID_BOOKING_B, CUSTOMER_B, BookingStatus.paid()),
    );

    await ticketRepo.saveMany([
      buildTicket(
        TICKET_A_OLDER,
        PAID_BOOKING_A,
        'TKT-OLDER',
        new Date('2026-05-01T00:00:00Z'),
      ),
      buildTicket(
        TICKET_A_NEWER,
        PAID_BOOKING_A,
        'TKT-NEWER',
        new Date('2026-05-02T00:00:00Z'),
      ),
      buildTicket(
        TICKET_A_PENDING,
        PENDING_BOOKING_A,
        'TKT-PENDING',
        new Date('2026-05-01T00:00:00Z'),
      ),
      buildTicket(
        TICKET_B,
        PAID_BOOKING_B,
        'TKT-BBB',
        new Date('2026-05-01T00:00:00Z'),
      ),
    ]);
  });

  it("returns only the customer's tickets from Paid bookings, newest first", async () => {
    const result = await handler.execute(
      new GetCustomerTicketsQuery(CUSTOMER_A),
    );

    expect(result).toHaveLength(2);
    expect(result.map((t) => t.ticketId)).toEqual([
      TICKET_A_NEWER,
      TICKET_A_OLDER,
    ]);
    result.forEach((t) => {
      expect(t.bookingId).toBe(PAID_BOOKING_A);
      expect(t.status).toBe(TicketStatusEnum.ACTIVE);
    });
  });

  it('does not leak another customer’s tickets', async () => {
    const result = await handler.execute(
      new GetCustomerTicketsQuery(CUSTOMER_B),
    );

    expect(result).toHaveLength(1);
    expect(result[0].ticketId).toBe(TICKET_B);
    expect(result[0].bookingId).toBe(PAID_BOOKING_B);
  });

  it('returns an empty array for an unknown customer', async () => {
    const result = await handler.execute(
      new GetCustomerTicketsQuery('00000000-0000-0000-0000-000000000000'),
    );

    expect(result).toEqual([]);
  });
});
