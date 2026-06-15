import { AppDataSource } from '../../../../infrastructure/database/data-source';
import { BookingOrmEntity } from '../../../../infrastructure/booking/persistence/booking.orm-entity';
import { BookingRepository } from '../../../../infrastructure/booking/persistence/booking.repository';
import { TicketOrmEntity } from '../../../../infrastructure/booking/persistence/ticket.orm-entity';
import { TicketRepository } from '../../../../infrastructure/booking/persistence/ticket.repository';
import { EventOrmEntity } from '../../../../infrastructure/event/persistence/event.orm-entity';
import { TicketCategoryOrmEntity } from '../../../../infrastructure/event/persistence/ticket-category.orm-entity';
import { EventRepository } from '../../../../infrastructure/event/persistence/event.repository';
import { RefundOrmEntity } from '../../../../infrastructure/refund/persistence/refund.orm-entity';
import { RefundRepository } from '../../../../infrastructure/refund/persistence/refund.repository';
import { RequestRefundHandler } from './request-refund.handler';
import { RequestRefundCommand } from './request-refund.command';
import { Booking } from '../../../../domain/booking/entities/booking.entity';
import { BookingStatus } from '../../../../domain/booking/value-objects/booking-status.vo';
import { Money } from '../../../../common/domain/money.vo';
import { Event } from '../../../../domain/event/entities/event.entity';
import {
  EventStatus,
  EventStatusEnum,
} from '../../../../domain/event/value-objects/event-status.vo';
import { Refund } from '../../../../domain/refund/entities/refund.entity';
import {
  RefundStatus,
  RefundStatusEnum,
} from '../../../../domain/refund/value-objects/refund-status.vo';
import { RefundRequestedEvent } from '../../../../domain/refund/events/refund-requested.event';
import { RefundAlreadyExistsError } from '../../errors/refund-already-exists.error';
import { IDomainEvent } from '../../../../common/domain/domain-event.interface';
import { IDomainEventPublisher } from '../../../../common/application/domain-event-publisher.interface';

const CUSTOMER_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const BOOKING_ID = 'a1111111-1111-1111-1111-111111111111';
const EVENT_ID = '11111111-1111-1111-1111-111111111111';
const CATEGORY_ID = '22222222-2222-2222-2222-222222222222';
const DAY = 24 * 60 * 60 * 1000;

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
    createdAt: new Date(Date.now() - DAY),
    paymentDeadline: new Date(Date.now() - DAY + 15 * 60_000),
    paidAt: new Date(Date.now() - DAY + 5 * 60_000),
  });

const buildPublishedFutureEvent = (): Event =>
  Event.reconstitute(
    {
      id: EVENT_ID,
      name: 'Concert',
      startDate: new Date(Date.now() + 7 * DAY),
      endDate: new Date(Date.now() + 7 * DAY + 3 * 60 * 60_000),
      maxCapacity: 100,
    },
    new EventStatus(EventStatusEnum.Published),
    [],
  );

const buildExistingRefund = (): Refund =>
  Refund.reconstitute('cccccccc-cccc-cccc-cccc-cccccccccccc', {
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

describe('RequestRefundHandler (integration)', () => {
  let bookingRepo: BookingRepository;
  let ticketRepo: TicketRepository;
  let eventRepo: EventRepository;
  let refundRepo: RefundRepository;
  let publisher: FakePublisher;
  let handler: RequestRefundHandler;

  beforeAll(async () => {
    await AppDataSource.initialize();
  });

  afterAll(async () => {
    await AppDataSource.destroy();
  });

  beforeEach(async () => {
    await AppDataSource.query(
      'TRUNCATE TABLE refunds, tickets, bookings, ticket_categories, events CASCADE',
    );
    bookingRepo = new BookingRepository(
      AppDataSource.getRepository(BookingOrmEntity),
    );
    ticketRepo = new TicketRepository(
      AppDataSource.getRepository(TicketOrmEntity),
    );
    eventRepo = new EventRepository(
      AppDataSource.getRepository(EventOrmEntity),
      AppDataSource.getRepository(TicketCategoryOrmEntity),
    );
    refundRepo = new RefundRepository(
      AppDataSource.getRepository(RefundOrmEntity),
    );
    publisher = new FakePublisher();
    handler = new RequestRefundHandler(
      bookingRepo,
      ticketRepo,
      eventRepo,
      refundRepo,
      publisher,
    );
  });

  it('persists a Requested refund for a paid booking on a future event', async () => {
    await eventRepo.save(buildPublishedFutureEvent());
    await bookingRepo.save(buildPaidBooking());

    await handler.execute(new RequestRefundCommand(BOOKING_ID, CUSTOMER_ID));

    const stored = await refundRepo.findByBookingId(BOOKING_ID);
    expect(stored).not.toBeNull();
    expect(stored!.status.value).toBe(RefundStatusEnum.REQUESTED);
    expect(stored!.amount.amount).toBe(100_000);
    expect(stored!.customerId).toBe(CUSTOMER_ID);

    expect(publisher.events).toHaveLength(1);
    expect(publisher.events[0]).toBeInstanceOf(RefundRequestedEvent);
  });

  it('refuses to create a duplicate refund when one already exists', async () => {
    await eventRepo.save(buildPublishedFutureEvent());
    await bookingRepo.save(buildPaidBooking());
    await refundRepo.save(buildExistingRefund());

    await expect(
      handler.execute(new RequestRefundCommand(BOOKING_ID, CUSTOMER_ID)),
    ).rejects.toBeInstanceOf(RefundAlreadyExistsError);

    const stored = await refundRepo.findByBookingId(BOOKING_ID);
    expect(stored).not.toBeNull();
    expect(stored!.refundId.value).toBe('cccccccc-cccc-cccc-cccc-cccccccccccc');
    expect(publisher.events).toHaveLength(0);
  });
});
