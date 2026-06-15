import { AppDataSource } from '../../../../infrastructure/database/data-source';
import { BookingOrmEntity } from '../../../../infrastructure/booking/persistence/booking.orm-entity';
import { BookingRepository } from '../../../../infrastructure/booking/persistence/booking.repository';
import { TicketOrmEntity } from '../../../../infrastructure/booking/persistence/ticket.orm-entity';
import { TicketRepository } from '../../../../infrastructure/booking/persistence/ticket.repository';
import { RefundOrmEntity } from '../../../../infrastructure/refund/persistence/refund.orm-entity';
import { RefundRepository } from '../../../../infrastructure/refund/persistence/refund.repository';
import { ApproveRefundHandler } from './approve-refund.handler';
import { ApproveRefundCommand } from './approve-refund.command';
import { Booking } from '../../../../domain/booking/entities/booking.entity';
import {
  BookingStatus,
  BookingStatusEnum,
} from '../../../../domain/booking/value-objects/booking-status.vo';
import { BookingId } from '../../../../domain/booking/value-objects/booking-id.vo';
import { Money } from '../../../../common/domain/money.vo';
import { Ticket } from '../../../../domain/booking/entities/ticket.entity';
import { TicketCode } from '../../../../domain/booking/value-objects/ticket-code.vo';
import {
  TicketStatus,
  TicketStatusEnum,
} from '../../../../domain/booking/value-objects/ticket-status.vo';
import { Refund } from '../../../../domain/refund/entities/refund.entity';
import {
  RefundStatus,
  RefundStatusEnum,
} from '../../../../domain/refund/value-objects/refund-status.vo';
import { RefundId } from '../../../../domain/refund/value-objects/refund-id.vo';
import { RefundApprovedEvent } from '../../../../domain/refund/events/refund-approved.event';
import { IDomainEvent } from '../../../../common/domain/domain-event.interface';
import { IDomainEventPublisher } from '../../../../common/application/domain-event-publisher.interface';

const REFUND_ID = 'dddddddd-dddd-dddd-dddd-dddddddddddd';
const BOOKING_ID = 'a1111111-1111-1111-1111-111111111111';
const CUSTOMER_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const EVENT_ID = '11111111-1111-1111-1111-111111111111';
const CATEGORY_ID = '22222222-2222-2222-2222-222222222222';
const TICKET_1 = 'f1111111-1111-1111-1111-111111111111';
const TICKET_2 = 'f2222222-2222-2222-2222-222222222222';

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

const buildPaidBooking = (): Booking =>
  Booking.reconstitute(BOOKING_ID, {
    customerId: CUSTOMER_ID,
    eventId: EVENT_ID,
    ticketCategoryId: CATEGORY_ID,
    quantity: 2,
    unitPrice: new Money(50_000),
    serviceFee: Money.zero(),
    totalPrice: new Money(100_000),
    status: BookingStatus.paid(),
    createdAt: new Date('2026-05-01T00:00:00Z'),
    paymentDeadline: new Date('2026-05-01T00:15:00Z'),
    paidAt: new Date('2026-05-01T00:10:00Z'),
  });

const buildActiveTicket = (id: string, code: string): Ticket =>
  Ticket.reconstitute(id, {
    ticketCode: new TicketCode(code),
    bookingId: BOOKING_ID,
    eventId: EVENT_ID,
    status: TicketStatus.active(),
    issuedAt: new Date('2026-05-01T00:10:00Z'),
    checkedInAt: null,
  });

const buildRefund = (status: RefundStatus): Refund =>
  Refund.reconstitute(REFUND_ID, {
    bookingId: BOOKING_ID,
    customerId: CUSTOMER_ID,
    amount: new Money(100_000),
    status,
    requestedAt: new Date('2026-05-02T00:00:00Z'),
    decidedAt: null,
    paidOutAt: null,
    rejectionReason: null,
    paymentReference: null,
  });

describe('ApproveRefundHandler (integration)', () => {
  let bookingRepo: BookingRepository;
  let ticketRepo: TicketRepository;
  let refundRepo: RefundRepository;
  let publisher: FakePublisher;
  let handler: ApproveRefundHandler;

  beforeAll(async () => {
    await AppDataSource.initialize();
  });

  afterAll(async () => {
    await AppDataSource.destroy();
  });

  beforeEach(async () => {
    await AppDataSource.query(
      'TRUNCATE TABLE refunds, tickets, bookings CASCADE',
    );
    bookingRepo = new BookingRepository(
      AppDataSource.getRepository(BookingOrmEntity),
    );
    ticketRepo = new TicketRepository(
      AppDataSource.getRepository(TicketOrmEntity),
    );
    refundRepo = new RefundRepository(
      AppDataSource.getRepository(RefundOrmEntity),
    );
    publisher = new FakePublisher();
    handler = new ApproveRefundHandler(
      refundRepo,
      bookingRepo,
      ticketRepo,
      publisher,
    );
  });

  it('flips refund to Approved, booking to Refunded, and all tickets to Cancelled', async () => {
    await bookingRepo.save(buildPaidBooking());
    await ticketRepo.saveMany([
      buildActiveTicket(TICKET_1, 'TKT-IIA001'),
      buildActiveTicket(TICKET_2, 'TKT-IIA002'),
    ]);
    await refundRepo.save(buildRefund(RefundStatus.requested()));

    await handler.execute(new ApproveRefundCommand(REFUND_ID));

    const reloadedRefund = await refundRepo.findById(new RefundId(REFUND_ID));
    expect(reloadedRefund!.status.value).toBe(RefundStatusEnum.APPROVED);
    expect(reloadedRefund!.decidedAt).toBeInstanceOf(Date);

    const reloadedBooking = await bookingRepo.findById(
      new BookingId(BOOKING_ID),
    );
    expect(reloadedBooking!.status.value).toBe(BookingStatusEnum.REFUNDED);

    const reloadedTickets = await ticketRepo.findByBookingId(
      new BookingId(BOOKING_ID),
    );
    expect(reloadedTickets).toHaveLength(2);
    reloadedTickets.forEach((t) =>
      expect(t.status.value).toBe(TicketStatusEnum.CANCELLED),
    );

    expect(publisher.events).toHaveLength(1);
    expect(publisher.events[0]).toBeInstanceOf(RefundApprovedEvent);
  });

  it('refuses to approve a non-Requested refund and leaves every row unchanged', async () => {
    await bookingRepo.save(buildPaidBooking());
    await ticketRepo.saveMany([buildActiveTicket(TICKET_1, 'TKT-IIA101')]);
    await refundRepo.save(buildRefund(RefundStatus.approved()));

    await expect(
      handler.execute(new ApproveRefundCommand(REFUND_ID)),
    ).rejects.toThrow('Only a requested refund can be approved');

    const reloadedRefund = await refundRepo.findById(new RefundId(REFUND_ID));
    expect(reloadedRefund!.status.value).toBe(RefundStatusEnum.APPROVED);
    expect(reloadedRefund!.decidedAt).toBeNull();

    const reloadedBooking = await bookingRepo.findById(
      new BookingId(BOOKING_ID),
    );
    expect(reloadedBooking!.status.value).toBe(BookingStatusEnum.PAID);

    const reloadedTickets = await ticketRepo.findByBookingId(
      new BookingId(BOOKING_ID),
    );
    expect(reloadedTickets[0].status.value).toBe(TicketStatusEnum.ACTIVE);

    expect(publisher.events).toHaveLength(0);
  });
});
