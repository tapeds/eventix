import { AppDataSource } from '../../../../infrastructure/database/data-source';
import { BookingOrmEntity } from '../../../../infrastructure/booking/persistence/booking.orm-entity';
import { BookingRepository } from '../../../../infrastructure/booking/persistence/booking.repository';
import { ExpireBookingHandler } from './expire-booking.handler';
import { ExpireBookingCommand } from './expire-booking.command';
import { Booking } from '../../../../domain/booking/entities/booking.entity';
import {
  BookingStatus,
  BookingStatusEnum,
} from '../../../../domain/booking/value-objects/booking-status.vo';
import { Money } from '../../../../common/domain/money.vo';
import { BookingExpiredEvent } from '../../../../domain/booking/events/booking-expired.event';
import { IDomainEvent } from '../../../../common/domain/domain-event.interface';
import { IDomainEventPublisher } from '../../../../common/application/domain-event-publisher.interface';

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

const buildPendingPastDeadlineBooking = (): Booking =>
  Booking.reconstitute('a1111111-1111-1111-1111-111111111111', {
    customerId: CUSTOMER_ID,
    eventId: EVENT_ID,
    ticketCategoryId: CATEGORY_ID,
    quantity: 2,
    unitPrice: new Money(50_000),
    serviceFee: Money.zero(),
    totalPrice: new Money(100_000),
    status: BookingStatus.pendingPayment(),
    createdAt: new Date('2026-01-01T00:00:00Z'),
    paymentDeadline: new Date('2026-01-01T00:15:00Z'),
    paidAt: null,
  });

const buildPaidBooking = (): Booking =>
  Booking.reconstitute('a2222222-2222-2222-2222-222222222222', {
    customerId: CUSTOMER_ID,
    eventId: EVENT_ID,
    ticketCategoryId: CATEGORY_ID,
    quantity: 2,
    unitPrice: new Money(50_000),
    serviceFee: Money.zero(),
    totalPrice: new Money(100_000),
    status: BookingStatus.paid(),
    createdAt: new Date('2026-01-01T00:00:00Z'),
    paymentDeadline: new Date('2026-01-01T00:15:00Z'),
    paidAt: new Date('2026-01-01T00:10:00Z'),
  });

describe('ExpireBookingHandler (integration)', () => {
  let bookingRepo: BookingRepository;
  let publisher: FakePublisher;
  let handler: ExpireBookingHandler;

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
    publisher = new FakePublisher();
    handler = new ExpireBookingHandler(bookingRepo, publisher);
  });

  it('expires a pending booking past its deadline and persists EXPIRED', async () => {
    const booking = buildPendingPastDeadlineBooking();
    await bookingRepo.save(booking);

    await handler.execute(new ExpireBookingCommand(booking.bookingId.value));

    const reloaded = await bookingRepo.findById(booking.bookingId);
    expect(reloaded).not.toBeNull();
    expect(reloaded!.status.value).toBe(BookingStatusEnum.EXPIRED);

    expect(publisher.events).toHaveLength(1);
    expect(publisher.events[0]).toBeInstanceOf(BookingExpiredEvent);
  });

  it('refuses to expire a paid booking and leaves the row untouched', async () => {
    const booking = buildPaidBooking();
    await bookingRepo.save(booking);

    await expect(
      handler.execute(new ExpireBookingCommand(booking.bookingId.value)),
    ).rejects.toThrow('A paid booking cannot be expired');

    const reloaded = await bookingRepo.findById(booking.bookingId);
    expect(reloaded!.status.value).toBe(BookingStatusEnum.PAID);
    expect(publisher.events).toHaveLength(0);
  });
});
