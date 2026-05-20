/* eslint-disable @typescript-eslint/unbound-method -- jest.Mocked<T> mock references trigger a false positive */
import { ExpireBookingHandler } from './expire-booking.handler';
import { ExpireBookingCommand } from './expire-booking.command';
import { Booking } from '../../../../domain/booking/entities/booking.entity';
import {
  BookingStatus,
  BookingStatusEnum,
} from '../../../../domain/booking/value-objects/booking-status.vo';
import { Money } from '../../../../common/domain/money.vo';
import { BookingNotFoundError } from '../../errors/booking-not-found.error';
import { IBookingRepository } from '../../../../domain/booking/repositories/booking.repository.interface';
import { IDomainEventPublisher } from '../../../../common/application/domain-event-publisher.interface';
import { BookingExpiredEvent } from '../../../../domain/booking/events/booking-expired.event';

const BOOKING_ID = '11111111-1111-1111-1111-111111111111';

const buildPendingPastDeadlineBooking = (): Booking =>
  Booking.reconstitute(BOOKING_ID, {
    customerId: 'customer-1',
    eventId: 'event-1',
    ticketCategoryId: 'category-1',
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
  Booking.reconstitute(BOOKING_ID, {
    customerId: 'customer-1',
    eventId: 'event-1',
    ticketCategoryId: 'category-1',
    quantity: 2,
    unitPrice: new Money(50_000),
    serviceFee: Money.zero(),
    totalPrice: new Money(100_000),
    status: BookingStatus.paid(),
    createdAt: new Date('2026-01-01T00:00:00Z'),
    paymentDeadline: new Date('2026-01-01T00:15:00Z'),
    paidAt: new Date('2026-01-01T00:14:00Z'),
  });

const buildPendingBeforeDeadlineBooking = (): Booking =>
  Booking.reconstitute(BOOKING_ID, {
    customerId: 'customer-1',
    eventId: 'event-1',
    ticketCategoryId: 'category-1',
    quantity: 2,
    unitPrice: new Money(50_000),
    serviceFee: Money.zero(),
    totalPrice: new Money(100_000),
    status: BookingStatus.pendingPayment(),
    createdAt: new Date(),
    paymentDeadline: new Date(Date.now() + 60 * 60_000),
    paidAt: null,
  });

const makeRepo = (
  findResult: Booking | null,
): jest.Mocked<IBookingRepository> => ({
  findById: jest.fn().mockResolvedValue(findResult),
  save: jest.fn().mockResolvedValue(undefined),
  findActiveByCustomerAndEvent: jest.fn(),
  delete: jest.fn(),
});

const makePublisher = (): jest.Mocked<IDomainEventPublisher> => ({
  publish: jest.fn().mockResolvedValue(undefined),
  publishAll: jest.fn().mockResolvedValue(undefined),
});

describe('ExpireBookingHandler', () => {
  it('expires a pending booking past its deadline and publishes the event', async () => {
    const booking = buildPendingPastDeadlineBooking();
    const repo = makeRepo(booking);
    const publisher = makePublisher();
    const handler = new ExpireBookingHandler(repo, publisher);

    await handler.execute(new ExpireBookingCommand(BOOKING_ID));

    expect(booking.status.value).toBe(BookingStatusEnum.EXPIRED);
    expect(repo.save).toHaveBeenCalledTimes(1);
    expect(repo.save).toHaveBeenCalledWith(booking);
    expect(publisher.publishAll).toHaveBeenCalledTimes(1);
    const events = publisher.publishAll.mock.calls[0][0];
    expect(events).toHaveLength(1);
    expect(events[0]).toBeInstanceOf(BookingExpiredEvent);
    expect((events[0] as BookingExpiredEvent).bookingId).toBe(BOOKING_ID);
    // events are cleared from the aggregate after dispatch
    expect(booking.domainEvents).toHaveLength(0);
  });

  it('throws BookingNotFoundError when the booking does not exist', async () => {
    const repo = makeRepo(null);
    const publisher = makePublisher();
    const handler = new ExpireBookingHandler(repo, publisher);

    await expect(
      handler.execute(new ExpireBookingCommand(BOOKING_ID)),
    ).rejects.toBeInstanceOf(BookingNotFoundError);

    expect(repo.save).not.toHaveBeenCalled();
    expect(publisher.publishAll).not.toHaveBeenCalled();
  });

  it('propagates the domain error when the booking is paid and does not save/publish', async () => {
    const booking = buildPaidBooking();
    const repo = makeRepo(booking);
    const publisher = makePublisher();
    const handler = new ExpireBookingHandler(repo, publisher);

    await expect(
      handler.execute(new ExpireBookingCommand(BOOKING_ID)),
    ).rejects.toThrow('A paid booking cannot be expired');

    expect(booking.status.value).toBe(BookingStatusEnum.PAID);
    expect(repo.save).not.toHaveBeenCalled();
    expect(publisher.publishAll).not.toHaveBeenCalled();
  });

  it('propagates the domain error when the booking is still within its deadline', async () => {
    const booking = buildPendingBeforeDeadlineBooking();
    const repo = makeRepo(booking);
    const publisher = makePublisher();
    const handler = new ExpireBookingHandler(repo, publisher);

    await expect(
      handler.execute(new ExpireBookingCommand(BOOKING_ID)),
    ).rejects.toThrow('Booking cannot expire before its payment deadline');

    expect(booking.status.value).toBe(BookingStatusEnum.PENDING_PAYMENT);
    expect(repo.save).not.toHaveBeenCalled();
    expect(publisher.publishAll).not.toHaveBeenCalled();
  });
});
