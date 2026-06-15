import { AppDataSource } from '../../../../infrastructure/database/data-source';
import { BookingOrmEntity } from '../../../../infrastructure/booking/persistence/booking.orm-entity';
import { BookingRepository } from '../../../../infrastructure/booking/persistence/booking.repository';
import { TicketOrmEntity } from '../../../../infrastructure/booking/persistence/ticket.orm-entity';
import { TicketRepository } from '../../../../infrastructure/booking/persistence/ticket.repository';
import { MockPaymentGateway } from '../../../../infrastructure/booking/services/payment-gateway.service';
import { PayBookingHandler } from './pay-booking.handler';
import { PayBookingCommand } from './pay-booking.command';
import { Booking } from '../../../../domain/booking/entities/booking.entity';
import {
  BookingStatus,
  BookingStatusEnum,
} from '../../../../domain/booking/value-objects/booking-status.vo';
import { BookingId } from '../../../../domain/booking/value-objects/booking-id.vo';
import { TicketStatusEnum } from '../../../../domain/booking/value-objects/ticket-status.vo';
import { Money } from '../../../../common/domain/money.vo';
import { BookingPaidEvent } from '../../../../domain/booking/events/booking-paid.event';
import { PaymentDeclinedError } from '../../errors/payment-declined.error';
import { IDomainEvent } from '../../../../common/domain/domain-event.interface';
import { IDomainEventPublisher } from '../../../../common/application/domain-event-publisher.interface';

const BOOKING_ID = 'a1111111-1111-1111-1111-111111111111';
const CUSTOMER_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const EVENT_ID = '11111111-1111-1111-1111-111111111111';
const CATEGORY_ID = '22222222-2222-2222-2222-222222222222';

class FakePublisher implements IDomainEventPublisher {
  events: IDomainEvent[] = [];
  publish(event: IDomainEvent): Promise<void> {
    this.events.push(event);
    return Promise.resolve();
  }
  publishAll(events: IDomainEvent[]): Promise<void> {
    this.events.push(...events);
    return Promise.resolve();
  }
}

const buildPendingBooking = (): Booking =>
  Booking.reconstitute(BOOKING_ID, {
    customerId: CUSTOMER_ID,
    eventId: EVENT_ID,
    ticketCategoryId: CATEGORY_ID,
    quantity: 2,
    unitPrice: new Money(50_000),
    serviceFee: Money.zero(),
    totalPrice: new Money(100_000),
    status: BookingStatus.pendingPayment(),
    createdAt: new Date(Date.now() - 60_000),
    paymentDeadline: new Date(Date.now() + 15 * 60_000),
    paidAt: null,
  });

describe('PayBookingHandler (integration)', () => {
  let bookingRepo: BookingRepository;
  let ticketRepo: TicketRepository;
  let publisher: FakePublisher;

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
    publisher = new FakePublisher();
  });

  it('persists Paid status, issues tickets to the DB, and publishes BookingPaid', async () => {
    await bookingRepo.save(buildPendingBooking());
    const handler = new PayBookingHandler(
      bookingRepo,
      ticketRepo,
      new MockPaymentGateway(),
      publisher,
    );

    await handler.execute(
      new PayBookingCommand(BOOKING_ID, CUSTOMER_ID, 100_000, 'IDR'),
    );

    const reloadedBooking = await bookingRepo.findById(
      new BookingId(BOOKING_ID),
    );
    expect(reloadedBooking!.status.value).toBe(BookingStatusEnum.PAID);
    expect(reloadedBooking!.paidAt).toBeInstanceOf(Date);

    const tickets = await ticketRepo.findByBookingId(new BookingId(BOOKING_ID));
    expect(tickets).toHaveLength(2);
    tickets.forEach((t) => {
      expect(t.status.value).toBe(TicketStatusEnum.ACTIVE);
      expect(t.eventId).toBe(EVENT_ID);
      expect(t.bookingId).toBe(BOOKING_ID);
    });
    const codes = tickets.map((t) => t.ticketCode.value);
    expect(new Set(codes).size).toBe(2);

    expect(publisher.events).toHaveLength(1);
    expect(publisher.events[0]).toBeInstanceOf(BookingPaidEvent);
  });

  it('leaves the row Pending and emits no tickets/events when the gateway declines', async () => {
    await bookingRepo.save(buildPendingBooking());
    const handler = new PayBookingHandler(
      bookingRepo,
      ticketRepo,
      new MockPaymentGateway({ alwaysFail: true }),
      publisher,
    );

    await expect(
      handler.execute(
        new PayBookingCommand(BOOKING_ID, CUSTOMER_ID, 100_000, 'IDR'),
      ),
    ).rejects.toBeInstanceOf(PaymentDeclinedError);

    const reloadedBooking = await bookingRepo.findById(
      new BookingId(BOOKING_ID),
    );
    expect(reloadedBooking!.status.value).toBe(
      BookingStatusEnum.PENDING_PAYMENT,
    );
    expect(reloadedBooking!.paidAt).toBeNull();

    const tickets = await ticketRepo.findByBookingId(new BookingId(BOOKING_ID));
    expect(tickets).toHaveLength(0);
    expect(publisher.events).toHaveLength(0);
  });
});
