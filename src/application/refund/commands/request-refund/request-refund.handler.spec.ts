/* eslint-disable @typescript-eslint/unbound-method -- jest.Mocked<T> mock references trigger a false positive */
import { RequestRefundHandler } from './request-refund.handler';
import { RequestRefundCommand } from './request-refund.command';
import { Booking } from '../../../../domain/booking/entities/booking.entity';
import { BookingStatus } from '../../../../domain/booking/value-objects/booking-status.vo';
import { Money } from '../../../../common/domain/money.vo';
import { Ticket } from '../../../../domain/booking/entities/ticket.entity';
import { TicketCode } from '../../../../domain/booking/value-objects/ticket-code.vo';
import { TicketStatus } from '../../../../domain/booking/value-objects/ticket-status.vo';
import { Event } from '../../../../domain/event/entities/event.entity';
import { TicketCategory } from '../../../../domain/event/entities/ticket-category.entity';
import { Refund } from '../../../../domain/refund/entities/refund.entity';
import {
  RefundStatus,
  RefundStatusEnum,
} from '../../../../domain/refund/value-objects/refund-status.vo';
import { RefundRequestedEvent } from '../../../../domain/refund/events/refund-requested.event';
import { IBookingRepository } from '../../../../domain/booking/repositories/booking.repository.interface';
import { ITicketRepository } from '../../../../domain/booking/repositories/ticket.repository.interface';
import { EventRepository } from '../../../../domain/event/repositories/event.repository.interface';
import { IRefundRepository } from '../../../../domain/refund/repositories/refund.repository.interface';
import { IDomainEventPublisher } from '../../../../common/application/domain-event-publisher.interface';
import { BookingNotFoundError } from '../../../booking/errors/booking-not-found.error';
import { NotBookingOwnerError } from '../../../booking/errors/not-booking-owner.error';
import { BookingNotPaidError } from '../../../booking/errors/booking-not-paid.error';
import { TicketAlreadyCheckedInError } from '../../../booking/errors/ticket-already-checked-in.error';
import { EventNotFoundError } from '../../../event/errors/event-not-found.error';
import { RefundAlreadyExistsError } from '../../errors/refund-already-exists.error';
import { RefundDeadlinePassedError } from '../../errors/refund-deadline-passed.error';

const BOOKING_ID = '11111111-1111-1111-1111-111111111111';
const CUSTOMER_ID = 'customer-1';
const EVENT_ID = 'event-1';

const DAY = 24 * 60 * 60 * 1000;

const buildBooking = (
  overrides: {
    customerId?: string;
    status?: BookingStatus;
  } = {},
): Booking =>
  Booking.reconstitute(BOOKING_ID, {
    customerId: overrides.customerId ?? CUSTOMER_ID,
    eventId: EVENT_ID,
    ticketCategoryId: 'category-1',
    quantity: 2,
    unitPrice: new Money(50_000),
    serviceFee: Money.zero(),
    totalPrice: new Money(100_000),
    status: overrides.status ?? BookingStatus.paid(),
    createdAt: new Date(Date.now() - DAY),
    paymentDeadline: new Date(Date.now() - DAY + 15 * 60_000),
    paidAt: new Date(Date.now() - DAY + 5 * 60_000),
  });

const buildPublishedEvent = (startOffsetMs: number = 7 * DAY): Event => {
  const startDate = new Date(Date.now() + startOffsetMs);
  const endDate = new Date(startDate.getTime() + 3 * 60 * 60_000);
  const event = Event.create({
    id: EVENT_ID,
    name: 'Concert',
    startDate,
    endDate,
    maxCapacity: 100,
  });
  event.addTicketCategory(
    new TicketCategory({
      id: 'category-1',
      name: 'Regular',
      price: new Money(50_000),
      quota: 10,
      salesStartDate: new Date(startDate.getTime() - 30 * DAY),
      salesEndDate: new Date(startDate.getTime() - DAY),
    }),
  );
  event.publish();
  return event;
};

const buildCancelledEvent = (): Event => {
  const event = Event.create({
    id: EVENT_ID,
    name: 'Concert',
    startDate: new Date(Date.now() + 7 * DAY),
    endDate: new Date(Date.now() + 7 * DAY + 3 * 60 * 60_000),
    maxCapacity: 100,
  });
  event.cancel('organizer pulled out');
  return event;
};

const buildTicket = (status: TicketStatus): Ticket =>
  Ticket.reconstitute('ticket-1', {
    ticketCode: new TicketCode('TKT-AAAAAAAAAAAA'),
    bookingId: BOOKING_ID,
    eventId: EVENT_ID,
    status,
    issuedAt: new Date(Date.now() - DAY),
    checkedInAt: status.isCheckedIn() ? new Date() : null,
  });

const buildExistingRefund = (): Refund =>
  Refund.reconstitute('refund-existing', {
    bookingId: BOOKING_ID,
    customerId: CUSTOMER_ID,
    amount: new Money(100_000),
    status: RefundStatus.requested(),
    requestedAt: new Date(Date.now() - DAY),
    decidedAt: null,
    paidOutAt: null,
    rejectionReason: null,
    paymentReference: null,
  });

const makeBookingRepo = (
  booking: Booking | null,
): jest.Mocked<IBookingRepository> => ({
  findById: jest.fn().mockResolvedValue(booking),
  save: jest.fn().mockResolvedValue(undefined),
  findActiveByCustomerAndEvent: jest.fn(),
  delete: jest.fn(),
});

const makeTicketRepo = (tickets: Ticket[]): jest.Mocked<ITicketRepository> => ({
  save: jest.fn().mockResolvedValue(undefined),
  saveMany: jest.fn().mockResolvedValue(undefined),
  findById: jest.fn(),
  findByCode: jest.fn(),
  findByBookingId: jest.fn().mockResolvedValue(tickets),
  findByCustomerId: jest.fn(),
});

const makeEventRepo = (event: Event | null): jest.Mocked<EventRepository> => ({
  save: jest.fn().mockResolvedValue(undefined),
  findById: jest.fn().mockResolvedValue(event),
  findPublished: jest.fn(),
});

const makeRefundRepo = (
  existing: Refund | null,
): jest.Mocked<IRefundRepository> => ({
  save: jest.fn().mockResolvedValue(undefined),
  findById: jest.fn(),
  findByBookingId: jest.fn().mockResolvedValue(existing),
  listByStatus: jest.fn(),
});

const makePublisher = (): jest.Mocked<IDomainEventPublisher> => ({
  publish: jest.fn().mockResolvedValue(undefined),
  publishAll: jest.fn().mockResolvedValue(undefined),
});

describe('RequestRefundHandler', () => {
  it('creates a refund for a paid booking with a future, published event', async () => {
    const booking = buildBooking();
    const event = buildPublishedEvent();
    const bookingRepo = makeBookingRepo(booking);
    const ticketRepo = makeTicketRepo([buildTicket(TicketStatus.active())]);
    const eventRepo = makeEventRepo(event);
    const refundRepo = makeRefundRepo(null);
    const publisher = makePublisher();
    const handler = new RequestRefundHandler(
      bookingRepo,
      ticketRepo,
      eventRepo,
      refundRepo,
      publisher,
    );

    await handler.execute(new RequestRefundCommand(BOOKING_ID, CUSTOMER_ID));

    expect(refundRepo.save).toHaveBeenCalledTimes(1);
    const saved = refundRepo.save.mock.calls[0][0];
    expect(saved.status.value).toBe(RefundStatusEnum.REQUESTED);
    expect(saved.bookingId).toBe(BOOKING_ID);
    expect(saved.customerId).toBe(CUSTOMER_ID);
    expect(saved.amount.amount).toBe(booking.totalPrice.amount);
    expect(publisher.publishAll).toHaveBeenCalledTimes(1);
    const events = publisher.publishAll.mock.calls[0][0];
    expect(events).toHaveLength(1);
    expect(events[0]).toBeInstanceOf(RefundRequestedEvent);
    expect(saved.domainEvents).toHaveLength(0);
  });

  it('auto-allows when the event is cancelled, even with a pending booking and a checked-in ticket', async () => {
    const booking = buildBooking({ status: BookingStatus.pendingPayment() });
    const event = buildCancelledEvent();
    const bookingRepo = makeBookingRepo(booking);
    const ticketRepo = makeTicketRepo([buildTicket(TicketStatus.checkedIn())]);
    const eventRepo = makeEventRepo(event);
    const refundRepo = makeRefundRepo(null);
    const publisher = makePublisher();
    const handler = new RequestRefundHandler(
      bookingRepo,
      ticketRepo,
      eventRepo,
      refundRepo,
      publisher,
    );

    await handler.execute(new RequestRefundCommand(BOOKING_ID, CUSTOMER_ID));

    expect(refundRepo.save).toHaveBeenCalledTimes(1);
    expect(publisher.publishAll).toHaveBeenCalledTimes(1);
    // ticket repo not needed when event is cancelled (short-circuit)
    expect(ticketRepo.findByBookingId).not.toHaveBeenCalled();
  });

  it('throws BookingNotFoundError when the booking does not exist', async () => {
    const bookingRepo = makeBookingRepo(null);
    const ticketRepo = makeTicketRepo([]);
    const eventRepo = makeEventRepo(buildPublishedEvent());
    const refundRepo = makeRefundRepo(null);
    const publisher = makePublisher();
    const handler = new RequestRefundHandler(
      bookingRepo,
      ticketRepo,
      eventRepo,
      refundRepo,
      publisher,
    );

    await expect(
      handler.execute(new RequestRefundCommand(BOOKING_ID, CUSTOMER_ID)),
    ).rejects.toBeInstanceOf(BookingNotFoundError);

    expect(refundRepo.save).not.toHaveBeenCalled();
    expect(publisher.publishAll).not.toHaveBeenCalled();
  });

  it('throws NotBookingOwnerError when the customer does not own the booking', async () => {
    const booking = buildBooking({ customerId: 'someone-else' });
    const bookingRepo = makeBookingRepo(booking);
    const ticketRepo = makeTicketRepo([]);
    const eventRepo = makeEventRepo(buildPublishedEvent());
    const refundRepo = makeRefundRepo(null);
    const publisher = makePublisher();
    const handler = new RequestRefundHandler(
      bookingRepo,
      ticketRepo,
      eventRepo,
      refundRepo,
      publisher,
    );

    await expect(
      handler.execute(new RequestRefundCommand(BOOKING_ID, CUSTOMER_ID)),
    ).rejects.toBeInstanceOf(NotBookingOwnerError);

    expect(refundRepo.save).not.toHaveBeenCalled();
    expect(publisher.publishAll).not.toHaveBeenCalled();
  });

  it('throws RefundAlreadyExistsError when a refund for this booking already exists', async () => {
    const booking = buildBooking();
    const bookingRepo = makeBookingRepo(booking);
    const ticketRepo = makeTicketRepo([]);
    const eventRepo = makeEventRepo(buildCancelledEvent());
    const refundRepo = makeRefundRepo(buildExistingRefund());
    const publisher = makePublisher();
    const handler = new RequestRefundHandler(
      bookingRepo,
      ticketRepo,
      eventRepo,
      refundRepo,
      publisher,
    );

    await expect(
      handler.execute(new RequestRefundCommand(BOOKING_ID, CUSTOMER_ID)),
    ).rejects.toBeInstanceOf(RefundAlreadyExistsError);

    expect(refundRepo.save).not.toHaveBeenCalled();
    expect(publisher.publishAll).not.toHaveBeenCalled();
  });

  it('throws EventNotFoundError when the booking references a missing event', async () => {
    const booking = buildBooking();
    const bookingRepo = makeBookingRepo(booking);
    const ticketRepo = makeTicketRepo([]);
    const eventRepo = makeEventRepo(null);
    const refundRepo = makeRefundRepo(null);
    const publisher = makePublisher();
    const handler = new RequestRefundHandler(
      bookingRepo,
      ticketRepo,
      eventRepo,
      refundRepo,
      publisher,
    );

    await expect(
      handler.execute(new RequestRefundCommand(BOOKING_ID, CUSTOMER_ID)),
    ).rejects.toBeInstanceOf(EventNotFoundError);

    expect(refundRepo.save).not.toHaveBeenCalled();
    expect(publisher.publishAll).not.toHaveBeenCalled();
  });

  it('throws BookingNotPaidError when the event is published and the booking is not Paid', async () => {
    const booking = buildBooking({ status: BookingStatus.pendingPayment() });
    const bookingRepo = makeBookingRepo(booking);
    const ticketRepo = makeTicketRepo([]);
    const eventRepo = makeEventRepo(buildPublishedEvent());
    const refundRepo = makeRefundRepo(null);
    const publisher = makePublisher();
    const handler = new RequestRefundHandler(
      bookingRepo,
      ticketRepo,
      eventRepo,
      refundRepo,
      publisher,
    );

    await expect(
      handler.execute(new RequestRefundCommand(BOOKING_ID, CUSTOMER_ID)),
    ).rejects.toBeInstanceOf(BookingNotPaidError);

    expect(refundRepo.save).not.toHaveBeenCalled();
    expect(publisher.publishAll).not.toHaveBeenCalled();
  });

  it('throws TicketAlreadyCheckedInError when any ticket has been checked in', async () => {
    const booking = buildBooking();
    const checkedInTicket = Ticket.reconstitute('ticket-2', {
      ticketCode: new TicketCode('TKT-BBBBBBBBBBBB'),
      bookingId: BOOKING_ID,
      eventId: EVENT_ID,
      status: TicketStatus.checkedIn(),
      issuedAt: new Date(Date.now() - DAY),
      checkedInAt: new Date(),
    });
    const bookingRepo = makeBookingRepo(booking);
    const ticketRepo = makeTicketRepo([
      buildTicket(TicketStatus.active()),
      checkedInTicket,
    ]);
    const eventRepo = makeEventRepo(buildPublishedEvent());
    const refundRepo = makeRefundRepo(null);
    const publisher = makePublisher();
    const handler = new RequestRefundHandler(
      bookingRepo,
      ticketRepo,
      eventRepo,
      refundRepo,
      publisher,
    );

    const promise = handler.execute(
      new RequestRefundCommand(BOOKING_ID, CUSTOMER_ID),
    );
    await expect(promise).rejects.toBeInstanceOf(TicketAlreadyCheckedInError);
    await expect(promise).rejects.toThrow(/TKT-BBBBBBBBBBBB/);

    expect(refundRepo.save).not.toHaveBeenCalled();
    expect(publisher.publishAll).not.toHaveBeenCalled();
  });

  it('throws RefundDeadlinePassedError when the event has already started', async () => {
    const booking = buildBooking();
    const bookingRepo = makeBookingRepo(booking);
    const ticketRepo = makeTicketRepo([buildTicket(TicketStatus.active())]);
    const eventRepo = makeEventRepo(buildPublishedEvent(-DAY));
    const refundRepo = makeRefundRepo(null);
    const publisher = makePublisher();
    const handler = new RequestRefundHandler(
      bookingRepo,
      ticketRepo,
      eventRepo,
      refundRepo,
      publisher,
    );

    await expect(
      handler.execute(new RequestRefundCommand(BOOKING_ID, CUSTOMER_ID)),
    ).rejects.toBeInstanceOf(RefundDeadlinePassedError);

    expect(refundRepo.save).not.toHaveBeenCalled();
    expect(publisher.publishAll).not.toHaveBeenCalled();
  });
});
