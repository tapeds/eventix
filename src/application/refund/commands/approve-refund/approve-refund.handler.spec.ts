/* eslint-disable @typescript-eslint/unbound-method -- jest.Mocked<T> mock references trigger a false positive */
import { ApproveRefundHandler } from './approve-refund.handler';
import { ApproveRefundCommand } from './approve-refund.command';
import { Refund } from '../../../../domain/refund/entities/refund.entity';
import {
  RefundStatus,
  RefundStatusEnum,
} from '../../../../domain/refund/value-objects/refund-status.vo';
import { Booking } from '../../../../domain/booking/entities/booking.entity';
import {
  BookingStatus,
  BookingStatusEnum,
} from '../../../../domain/booking/value-objects/booking-status.vo';
import { Money } from '../../../../common/domain/money.vo';
import { Ticket } from '../../../../domain/booking/entities/ticket.entity';
import { TicketCode } from '../../../../domain/booking/value-objects/ticket-code.vo';
import {
  TicketStatus,
  TicketStatusEnum,
} from '../../../../domain/booking/value-objects/ticket-status.vo';
import { RefundApprovedEvent } from '../../../../domain/refund/events/refund-approved.event';
import { IRefundRepository } from '../../../../domain/refund/repositories/refund.repository.interface';
import { IBookingRepository } from '../../../../domain/booking/repositories/booking.repository.interface';
import { ITicketRepository } from '../../../../domain/booking/repositories/ticket.repository.interface';
import { IDomainEventPublisher } from '../../../../common/application/domain-event-publisher.interface';
import { RefundNotFoundError } from '../../errors/refund-not-found.error';
import { BookingNotFoundError } from '../../../booking/errors/booking-not-found.error';

const REFUND_ID = 'rrrrrrrr-rrrr-rrrr-rrrr-rrrrrrrrrrrr';
const BOOKING_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const CUSTOMER_ID = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
const EVENT_ID = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';

const buildRefund = (status: RefundStatus): Refund =>
  Refund.reconstitute(REFUND_ID, {
    bookingId: BOOKING_ID,
    customerId: CUSTOMER_ID,
    amount: new Money(100_000),
    status,
    requestedAt: new Date(),
    decidedAt: null,
    paidOutAt: null,
    rejectionReason: null,
    paymentReference: null,
  });

const buildPaidBooking = (): Booking =>
  Booking.reconstitute(BOOKING_ID, {
    customerId: CUSTOMER_ID,
    eventId: EVENT_ID,
    ticketCategoryId: 'category-1',
    quantity: 2,
    unitPrice: new Money(50_000),
    serviceFee: Money.zero(),
    totalPrice: new Money(100_000),
    status: BookingStatus.paid(),
    createdAt: new Date(),
    paymentDeadline: new Date(),
    paidAt: new Date(),
  });

const buildActiveTicket = (id: string, code: string): Ticket =>
  Ticket.reconstitute(id, {
    ticketCode: new TicketCode(code),
    bookingId: BOOKING_ID,
    eventId: EVENT_ID,
    status: TicketStatus.active(),
    issuedAt: new Date(),
    checkedInAt: null,
  });

const makeRefundRepo = (
  refund: Refund | null,
): jest.Mocked<IRefundRepository> => ({
  findById: jest.fn().mockResolvedValue(refund),
  save: jest.fn().mockResolvedValue(undefined),
  findByBookingId: jest.fn(),
  listByStatus: jest.fn(),
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

const makeTicketRepo = (tickets: Ticket[]): jest.Mocked<ITicketRepository> => ({
  save: jest.fn().mockResolvedValue(undefined),
  saveMany: jest.fn().mockResolvedValue(undefined),
  findById: jest.fn(),
  findByCode: jest.fn(),
  findByBookingId: jest.fn().mockResolvedValue(tickets),
  findByCustomerId: jest.fn(),
  findByEventId: jest.fn(),
});

const makePublisher = (): jest.Mocked<IDomainEventPublisher> => ({
  publish: jest.fn().mockResolvedValue(undefined),
  publishAll: jest.fn().mockResolvedValue(undefined),
});

describe('ApproveRefundHandler', () => {
  it('approves refund, marks booking refunded, cancels tickets, and publishes RefundApproved', async () => {
    const refund = buildRefund(RefundStatus.requested());
    const booking = buildPaidBooking();
    const tickets = [
      buildActiveTicket('t1111111-1111-1111-1111-111111111111', 'TKT-AAA001'),
      buildActiveTicket('t2222222-2222-2222-2222-222222222222', 'TKT-AAA002'),
    ];
    const refundRepo = makeRefundRepo(refund);
    const bookingRepo = makeBookingRepo(booking);
    const ticketRepo = makeTicketRepo(tickets);
    const publisher = makePublisher();
    const handler = new ApproveRefundHandler(
      refundRepo,
      bookingRepo,
      ticketRepo,
      publisher,
    );

    await handler.execute(new ApproveRefundCommand(REFUND_ID));

    expect(refund.status.value).toBe(RefundStatusEnum.APPROVED);
    expect(booking.status.value).toBe(BookingStatusEnum.REFUNDED);
    tickets.forEach((t) =>
      expect(t.status.value).toBe(TicketStatusEnum.CANCELLED),
    );

    expect(refundRepo.save).toHaveBeenCalledWith(refund);
    expect(bookingRepo.save).toHaveBeenCalledWith(booking);
    expect(ticketRepo.saveMany).toHaveBeenCalledWith(tickets);

    expect(publisher.publishAll).toHaveBeenCalledTimes(1);
    const published = publisher.publishAll.mock.calls[0][0];
    expect(published).toHaveLength(1);
    expect(published[0]).toBeInstanceOf(RefundApprovedEvent);
    expect(refund.domainEvents).toHaveLength(0);
  });

  it('skips saveMany when the booking has no tickets', async () => {
    const refundRepo = makeRefundRepo(buildRefund(RefundStatus.requested()));
    const bookingRepo = makeBookingRepo(buildPaidBooking());
    const ticketRepo = makeTicketRepo([]);
    const publisher = makePublisher();
    const handler = new ApproveRefundHandler(
      refundRepo,
      bookingRepo,
      ticketRepo,
      publisher,
    );

    await handler.execute(new ApproveRefundCommand(REFUND_ID));

    expect(refundRepo.save).toHaveBeenCalledTimes(1);
    expect(bookingRepo.save).toHaveBeenCalledTimes(1);
    expect(ticketRepo.saveMany).not.toHaveBeenCalled();
  });

  it('throws RefundNotFoundError without mutating anything', async () => {
    const refundRepo = makeRefundRepo(null);
    const bookingRepo = makeBookingRepo(buildPaidBooking());
    const ticketRepo = makeTicketRepo([]);
    const publisher = makePublisher();
    const handler = new ApproveRefundHandler(
      refundRepo,
      bookingRepo,
      ticketRepo,
      publisher,
    );

    await expect(
      handler.execute(new ApproveRefundCommand(REFUND_ID)),
    ).rejects.toBeInstanceOf(RefundNotFoundError);

    expect(refundRepo.save).not.toHaveBeenCalled();
    expect(bookingRepo.save).not.toHaveBeenCalled();
    expect(ticketRepo.saveMany).not.toHaveBeenCalled();
    expect(publisher.publishAll).not.toHaveBeenCalled();
  });

  it('propagates the domain error when the refund is not Requested', async () => {
    const refund = buildRefund(RefundStatus.approved());
    const refundRepo = makeRefundRepo(refund);
    const bookingRepo = makeBookingRepo(buildPaidBooking());
    const ticketRepo = makeTicketRepo([]);
    const publisher = makePublisher();
    const handler = new ApproveRefundHandler(
      refundRepo,
      bookingRepo,
      ticketRepo,
      publisher,
    );

    await expect(
      handler.execute(new ApproveRefundCommand(REFUND_ID)),
    ).rejects.toThrow('Only a requested refund can be approved');

    expect(refund.status.value).toBe(RefundStatusEnum.APPROVED);
    expect(refundRepo.save).not.toHaveBeenCalled();
    expect(bookingRepo.findById).not.toHaveBeenCalled();
    expect(publisher.publishAll).not.toHaveBeenCalled();
  });

  it('throws BookingNotFoundError when the referenced booking is missing', async () => {
    const refundRepo = makeRefundRepo(buildRefund(RefundStatus.requested()));
    const bookingRepo = makeBookingRepo(null);
    const ticketRepo = makeTicketRepo([]);
    const publisher = makePublisher();
    const handler = new ApproveRefundHandler(
      refundRepo,
      bookingRepo,
      ticketRepo,
      publisher,
    );

    await expect(
      handler.execute(new ApproveRefundCommand(REFUND_ID)),
    ).rejects.toBeInstanceOf(BookingNotFoundError);

    expect(refundRepo.save).not.toHaveBeenCalled();
    expect(ticketRepo.findByBookingId).not.toHaveBeenCalled();
    expect(publisher.publishAll).not.toHaveBeenCalled();
  });
});
