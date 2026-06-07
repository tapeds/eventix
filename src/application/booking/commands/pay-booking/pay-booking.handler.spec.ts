/* eslint-disable @typescript-eslint/unbound-method -- jest.Mocked<T> mock references trigger a false positive */
import { PayBookingHandler } from './pay-booking.handler';
import { PayBookingCommand } from './pay-booking.command';
import { Booking } from '../../../../domain/booking/entities/booking.entity';
import {
  BookingStatus,
  BookingStatusEnum,
} from '../../../../domain/booking/value-objects/booking-status.vo';
import { Money } from '../../../../common/domain/money.vo';
import { BookingPaidEvent } from '../../../../domain/booking/events/booking-paid.event';
import { IBookingRepository } from '../../../../domain/booking/repositories/booking.repository.interface';
import { ITicketRepository } from '../../../../domain/booking/repositories/ticket.repository.interface';
import { IPaymentGateway } from '../../services/payment-gateway.interface';
import { IDomainEventPublisher } from '../../../../common/application/domain-event-publisher.interface';
import { BookingNotFoundError } from '../../errors/booking-not-found.error';
import { NotBookingOwnerError } from '../../errors/not-booking-owner.error';
import { BookingNotPayableError } from '../../errors/booking-not-payable.error';
import { PaymentDeadlinePassedError } from '../../errors/payment-deadline-passed.error';
import { IncorrectPaymentAmountError } from '../../errors/incorrect-payment-amount.error';
import { PaymentDeclinedError } from '../../errors/payment-declined.error';

const BOOKING_ID = '11111111-1111-1111-1111-111111111111';
const CUSTOMER_ID = 'customer-1';
const DAY = 24 * 60 * 60 * 1000;

const buildBooking = (
  overrides: {
    customerId?: string;
    status?: BookingStatus;
    paymentDeadline?: Date;
    totalPrice?: Money;
  } = {},
): Booking =>
  Booking.reconstitute(BOOKING_ID, {
    customerId: overrides.customerId ?? CUSTOMER_ID,
    eventId: 'event-1',
    ticketCategoryId: 'category-1',
    quantity: 2,
    unitPrice: new Money(50_000),
    serviceFee: Money.zero(),
    totalPrice: overrides.totalPrice ?? new Money(100_000),
    status: overrides.status ?? BookingStatus.pendingPayment(),
    createdAt: new Date(Date.now() - 60_000),
    paymentDeadline:
      overrides.paymentDeadline ?? new Date(Date.now() + 15 * 60_000),
    paidAt: null,
  });

const makeBookingRepo = (
  booking: Booking | null,
): jest.Mocked<IBookingRepository> => ({
  findById: jest.fn().mockResolvedValue(booking),
  save: jest.fn().mockResolvedValue(undefined),
  findActiveByCustomerAndEvent: jest.fn(),
  findByEventId: jest.fn(),
  delete: jest.fn(),
});

const makeTicketRepo = (): jest.Mocked<ITicketRepository> => ({
  save: jest.fn().mockResolvedValue(undefined),
  saveMany: jest.fn().mockResolvedValue(undefined),
  findById: jest.fn(),
  findByCode: jest.fn(),
  findByBookingId: jest.fn(),
  findByCustomerId: jest.fn(),
  findByEventId: jest.fn(),
});

const makeGateway = (
  outcome: 'success' | 'decline' = 'success',
): jest.Mocked<IPaymentGateway> => ({
  charge: jest.fn().mockImplementation(() =>
    outcome === 'success'
      ? Promise.resolve({
          paymentReference: 'MOCK-12345',
          chargedAt: new Date(),
        })
      : Promise.reject(new PaymentDeclinedError('insufficient funds')),
  ),
});

const makePublisher = (): jest.Mocked<IDomainEventPublisher> => ({
  publish: jest.fn().mockResolvedValue(undefined),
  publishAll: jest.fn().mockResolvedValue(undefined),
});

const sampleCommand = () =>
  new PayBookingCommand(BOOKING_ID, CUSTOMER_ID, 100_000, 'IDR');

describe('PayBookingHandler', () => {
  it('charges the gateway, marks Paid, issues tickets, and publishes BookingPaid', async () => {
    const booking = buildBooking();
    const bookingRepo = makeBookingRepo(booking);
    const ticketRepo = makeTicketRepo();
    const gateway = makeGateway('success');
    const publisher = makePublisher();
    const handler = new PayBookingHandler(
      bookingRepo,
      ticketRepo,
      gateway,
      publisher,
    );

    await handler.execute(sampleCommand());

    expect(gateway.charge).toHaveBeenCalledTimes(1);
    expect(gateway.charge).toHaveBeenCalledWith({
      bookingId: BOOKING_ID,
      customerId: CUSTOMER_ID,
      amount: 100_000,
      currency: 'IDR',
      idempotencyKey: BOOKING_ID,
    });

    expect(booking.status.value).toBe(BookingStatusEnum.PAID);
    expect(bookingRepo.save).toHaveBeenCalledTimes(1);
    expect(bookingRepo.save).toHaveBeenCalledWith(booking);
    expect(ticketRepo.saveMany).toHaveBeenCalledTimes(1);
    const savedTickets = ticketRepo.saveMany.mock.calls[0][0];
    expect(savedTickets).toHaveLength(2);

    expect(publisher.publishAll).toHaveBeenCalledTimes(1);
    const events = publisher.publishAll.mock.calls[0][0];
    expect(events).toHaveLength(1);
    expect(events[0]).toBeInstanceOf(BookingPaidEvent);
    expect(booking.domainEvents).toHaveLength(0);
  });

  it('throws BookingNotFoundError without calling the gateway', async () => {
    const bookingRepo = makeBookingRepo(null);
    const ticketRepo = makeTicketRepo();
    const gateway = makeGateway('success');
    const publisher = makePublisher();
    const handler = new PayBookingHandler(
      bookingRepo,
      ticketRepo,
      gateway,
      publisher,
    );

    await expect(handler.execute(sampleCommand())).rejects.toBeInstanceOf(
      BookingNotFoundError,
    );

    expect(gateway.charge).not.toHaveBeenCalled();
    expect(bookingRepo.save).not.toHaveBeenCalled();
    expect(ticketRepo.saveMany).not.toHaveBeenCalled();
    expect(publisher.publishAll).not.toHaveBeenCalled();
  });

  it('throws NotBookingOwnerError without calling the gateway', async () => {
    const booking = buildBooking({ customerId: 'someone-else' });
    const bookingRepo = makeBookingRepo(booking);
    const ticketRepo = makeTicketRepo();
    const gateway = makeGateway('success');
    const publisher = makePublisher();
    const handler = new PayBookingHandler(
      bookingRepo,
      ticketRepo,
      gateway,
      publisher,
    );

    await expect(handler.execute(sampleCommand())).rejects.toBeInstanceOf(
      NotBookingOwnerError,
    );

    expect(gateway.charge).not.toHaveBeenCalled();
  });

  it('throws BookingNotPayableError when the booking is already Paid', async () => {
    const booking = buildBooking({ status: BookingStatus.paid() });
    const bookingRepo = makeBookingRepo(booking);
    const ticketRepo = makeTicketRepo();
    const gateway = makeGateway('success');
    const publisher = makePublisher();
    const handler = new PayBookingHandler(
      bookingRepo,
      ticketRepo,
      gateway,
      publisher,
    );

    await expect(handler.execute(sampleCommand())).rejects.toBeInstanceOf(
      BookingNotPayableError,
    );

    expect(gateway.charge).not.toHaveBeenCalled();
  });

  it('throws PaymentDeadlinePassedError when the deadline has passed', async () => {
    const booking = buildBooking({
      paymentDeadline: new Date(Date.now() - DAY),
    });
    const bookingRepo = makeBookingRepo(booking);
    const ticketRepo = makeTicketRepo();
    const gateway = makeGateway('success');
    const publisher = makePublisher();
    const handler = new PayBookingHandler(
      bookingRepo,
      ticketRepo,
      gateway,
      publisher,
    );

    await expect(handler.execute(sampleCommand())).rejects.toBeInstanceOf(
      PaymentDeadlinePassedError,
    );

    expect(gateway.charge).not.toHaveBeenCalled();
  });

  it('throws IncorrectPaymentAmountError when the amount does not match the total', async () => {
    const booking = buildBooking();
    const bookingRepo = makeBookingRepo(booking);
    const ticketRepo = makeTicketRepo();
    const gateway = makeGateway('success');
    const publisher = makePublisher();
    const handler = new PayBookingHandler(
      bookingRepo,
      ticketRepo,
      gateway,
      publisher,
    );

    await expect(
      handler.execute(
        new PayBookingCommand(BOOKING_ID, CUSTOMER_ID, 99_999, 'IDR'),
      ),
    ).rejects.toBeInstanceOf(IncorrectPaymentAmountError);

    expect(gateway.charge).not.toHaveBeenCalled();
  });

  it('propagates PaymentDeclinedError and does not save or publish', async () => {
    const booking = buildBooking();
    const bookingRepo = makeBookingRepo(booking);
    const ticketRepo = makeTicketRepo();
    const gateway = makeGateway('decline');
    const publisher = makePublisher();
    const handler = new PayBookingHandler(
      bookingRepo,
      ticketRepo,
      gateway,
      publisher,
    );

    await expect(handler.execute(sampleCommand())).rejects.toBeInstanceOf(
      PaymentDeclinedError,
    );

    expect(booking.status.value).toBe(BookingStatusEnum.PENDING_PAYMENT);
    expect(bookingRepo.save).not.toHaveBeenCalled();
    expect(ticketRepo.saveMany).not.toHaveBeenCalled();
    expect(publisher.publishAll).not.toHaveBeenCalled();
  });
});
