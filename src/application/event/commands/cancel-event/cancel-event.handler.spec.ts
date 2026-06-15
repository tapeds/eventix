/* eslint-disable @typescript-eslint/unbound-method -- jest.Mocked<T> mock references trigger a false positive */
import { CancelEventHandler } from './cancel-event.handler';
import { CancelEventCommand } from './cancel-event.command';
import { EventRepository } from '../../../../domain/event/repositories/event.repository.interface';
import { IBookingRepository } from '../../../../domain/booking/repositories/booking.repository.interface';
import { ITicketRepository } from '../../../../domain/booking/repositories/ticket.repository.interface';
import { IDomainEventPublisher } from '../../../../common/application/domain-event-publisher.interface';
import { Event } from '../../../../domain/event/entities/event.entity';
import { Booking } from '../../../../domain/booking/entities/booking.entity';
import { BookingStatus } from '../../../../domain/booking/value-objects/booking-status.vo';
import { Ticket } from '../../../../domain/booking/entities/ticket.entity';
import { TicketCode } from '../../../../domain/booking/value-objects/ticket-code.vo';
import {
  TicketStatus,
  TicketStatusEnum,
} from '../../../../domain/booking/value-objects/ticket-status.vo';
import { Money } from '../../../../common/domain/money.vo';
import { EventNotFoundError } from '../../errors/event-not-found.error';

const EVENT_ID = '11111111-1111-1111-1111-111111111111';
const BOOKING_ID = 'a1111111-1111-1111-1111-111111111111';
const NOW = Date.now();
const START = new Date(NOW + 1000 * 60 * 60 * 24);
const END = new Date(NOW + 1000 * 60 * 60 * 25);

const buildEvent = (): Event => {
  const event = Event.create({
    id: EVENT_ID,
    name: 'Concert',
    startDate: START,
    endDate: END,
    maxCapacity: 100,
  });
  event.clearDomainEvents();
  return event;
};

const buildPaidBooking = (id: string = BOOKING_ID): Booking =>
  Booking.reconstitute(id, {
    customerId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    eventId: EVENT_ID,
    ticketCategoryId: '22222222-2222-2222-2222-222222222222',
    quantity: 2,
    unitPrice: new Money(50_000),
    serviceFee: Money.zero(),
    totalPrice: new Money(100_000),
    status: BookingStatus.paid(),
    createdAt: new Date(NOW - 60_000),
    paymentDeadline: new Date(NOW - 60_000 + 15 * 60_000),
    paidAt: new Date(NOW - 60_000 + 5 * 60_000),
  });

const buildTicket = (
  id: string,
  bookingId: string,
  status: TicketStatus = TicketStatus.active(),
): Ticket =>
  Ticket.reconstitute(id, {
    ticketCode: new TicketCode(`TKT-${id.slice(0, 8).toUpperCase()}`),
    bookingId,
    eventId: EVENT_ID,
    status,
    issuedAt: new Date(NOW - 60_000),
    checkedInAt: null,
  });

const makeEventRepo = (event: Event | null): jest.Mocked<EventRepository> => ({
  save: jest.fn().mockResolvedValue(undefined),
  findById: jest.fn().mockResolvedValue(event),
  findPublished: jest.fn(),
});

const makeBookingRepo = (
  bookings: Booking[] = [],
): jest.Mocked<IBookingRepository> => ({
  save: jest.fn().mockResolvedValue(undefined),
  findById: jest.fn(),
  findActiveByCustomerAndEvent: jest.fn(),
  findByEventId: jest.fn().mockResolvedValue(bookings),
  delete: jest.fn(),
});

const makeTicketRepo = (
  perBooking: Record<string, Ticket[]> = {},
): jest.Mocked<ITicketRepository> => ({
  save: jest.fn().mockResolvedValue(undefined),
  saveMany: jest.fn().mockResolvedValue(undefined),
  findById: jest.fn(),
  findByCode: jest.fn(),
  findByBookingId: jest
    .fn()
    .mockImplementation((bookingId: { value: string }) =>
      Promise.resolve(perBooking[bookingId.value] ?? []),
    ),
  findByCustomerId: jest.fn(),
  findByEventId: jest.fn(),
});

const makePublisher = (): jest.Mocked<IDomainEventPublisher> => ({
  publish: jest.fn().mockResolvedValue(undefined),
  publishAll: jest.fn().mockResolvedValue(undefined),
});

describe('CancelEventHandler', () => {
  it('cancels the event and publishes EventCancelled', async () => {
    const event = buildEvent();
    const eventRepo = makeEventRepo(event);
    const publisher = makePublisher();
    const handler = new CancelEventHandler(
      eventRepo,
      makeBookingRepo(),
      makeTicketRepo(),
      publisher,
    );

    await handler.execute(new CancelEventCommand(EVENT_ID, 'venue closed'));

    expect(event.status.isCancelled()).toBe(true);
    const events = publisher.publishAll.mock.calls[0][0];
    expect(events.map((e) => e.eventName)).toContain('EventCancelled');
    expect(event.domainEvents).toHaveLength(0);
  });

  it('throws EventNotFoundError when the event does not exist', async () => {
    const handler = new CancelEventHandler(
      makeEventRepo(null),
      makeBookingRepo(),
      makeTicketRepo(),
      makePublisher(),
    );

    await expect(
      handler.execute(
        new CancelEventCommand('00000000-0000-0000-0000-000000000000'),
      ),
    ).rejects.toBeInstanceOf(EventNotFoundError);
  });

  it('rejects cancelling an already cancelled event', async () => {
    const event = buildEvent();
    event.cancel();
    event.clearDomainEvents();

    const handler = new CancelEventHandler(
      makeEventRepo(event),
      makeBookingRepo(),
      makeTicketRepo(),
      makePublisher(),
    );

    await expect(
      handler.execute(new CancelEventCommand(EVENT_ID)),
    ).rejects.toThrow(/already cancelled/i);
  });

  it('marks tickets from paid bookings as RefundRequired (US3 / US12)', async () => {
    const event = buildEvent();
    const paid = buildPaidBooking();
    const ticket1 = buildTicket(
      'f1111111-1111-1111-1111-111111111111',
      BOOKING_ID,
    );
    const ticket2 = buildTicket(
      'f2222222-2222-2222-2222-222222222222',
      BOOKING_ID,
      TicketStatus.checkedIn(),
    );
    const bookingRepo = makeBookingRepo([paid]);
    const ticketRepo = makeTicketRepo({ [BOOKING_ID]: [ticket1, ticket2] });
    const handler = new CancelEventHandler(
      makeEventRepo(event),
      bookingRepo,
      ticketRepo,
      makePublisher(),
    );

    await handler.execute(new CancelEventCommand(EVENT_ID));

    expect(ticket1.status.value).toBe(TicketStatusEnum.REFUND_REQUIRED);
    expect(ticket2.status.value).toBe(TicketStatusEnum.REFUND_REQUIRED);
    expect(ticketRepo.saveMany).toHaveBeenCalledTimes(1);
    expect(ticketRepo.saveMany).toHaveBeenCalledWith([ticket1, ticket2]);
  });

  it('skips tickets that are already Cancelled or RefundRequired', async () => {
    const event = buildEvent();
    const paid = buildPaidBooking();
    const stillActive = buildTicket(
      'f1111111-1111-1111-1111-111111111111',
      BOOKING_ID,
    );
    const alreadyCancelled = buildTicket(
      'f2222222-2222-2222-2222-222222222222',
      BOOKING_ID,
      TicketStatus.cancelled(),
    );
    const alreadyRefundRequired = buildTicket(
      'f3333333-3333-3333-3333-333333333333',
      BOOKING_ID,
      TicketStatus.refundRequired(),
    );
    const bookingRepo = makeBookingRepo([paid]);
    const ticketRepo = makeTicketRepo({
      [BOOKING_ID]: [stillActive, alreadyCancelled, alreadyRefundRequired],
    });
    const handler = new CancelEventHandler(
      makeEventRepo(event),
      bookingRepo,
      ticketRepo,
      makePublisher(),
    );

    await handler.execute(new CancelEventCommand(EVENT_ID));

    expect(stillActive.status.value).toBe(TicketStatusEnum.REFUND_REQUIRED);
    expect(alreadyCancelled.status.value).toBe(TicketStatusEnum.CANCELLED);
    expect(alreadyRefundRequired.status.value).toBe(
      TicketStatusEnum.REFUND_REQUIRED,
    );
    expect(ticketRepo.saveMany).toHaveBeenCalledWith([stillActive]);
  });

  it('ignores tickets from non-paid bookings', async () => {
    const event = buildEvent();
    const pending = Booking.reconstitute(BOOKING_ID, {
      customerId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      eventId: EVENT_ID,
      ticketCategoryId: '22222222-2222-2222-2222-222222222222',
      quantity: 1,
      unitPrice: new Money(50_000),
      serviceFee: Money.zero(),
      totalPrice: new Money(50_000),
      status: BookingStatus.pendingPayment(),
      createdAt: new Date(),
      paymentDeadline: new Date(NOW + 15 * 60_000),
      paidAt: null,
    });
    const ticketRepo = makeTicketRepo();
    const handler = new CancelEventHandler(
      makeEventRepo(event),
      makeBookingRepo([pending]),
      ticketRepo,
      makePublisher(),
    );

    await handler.execute(new CancelEventCommand(EVENT_ID));

    expect(ticketRepo.findByBookingId).not.toHaveBeenCalled();
    expect(ticketRepo.saveMany).not.toHaveBeenCalled();
  });

  it('skips saveMany when no tickets need updating', async () => {
    const event = buildEvent();
    const ticketRepo = makeTicketRepo();
    const handler = new CancelEventHandler(
      makeEventRepo(event),
      makeBookingRepo([]),
      ticketRepo,
      makePublisher(),
    );

    await handler.execute(new CancelEventCommand(EVENT_ID));

    expect(ticketRepo.saveMany).not.toHaveBeenCalled();
  });
});
