import { AppDataSource } from '../../../../infrastructure/database/data-source';
import { BookingOrmEntity } from '../../../../infrastructure/booking/persistence/booking.orm-entity';
import { BookingRepository } from '../../../../infrastructure/booking/persistence/booking.repository';
import { EventOrmEntity } from '../../../../infrastructure/event/persistence/event.orm-entity';
import { TicketCategoryOrmEntity } from '../../../../infrastructure/event/persistence/ticket-category.orm-entity';
import { EventRepository } from '../../../../infrastructure/event/persistence/event.repository';
import { CreateBookingHandler } from './create-booking.handler';
import { CreateBookingCommand } from './create-booking.command';
import { ExpireBookingHandler } from '../expire-booking/expire-booking.handler';
import { ExpireBookingCommand } from '../expire-booking/expire-booking.command';
import { Booking } from '../../../../domain/booking/entities/booking.entity';
import {
  BookingStatus,
  BookingStatusEnum,
} from '../../../../domain/booking/value-objects/booking-status.vo';
import { BookingId } from '../../../../domain/booking/value-objects/booking-id.vo';
import { Money } from '../../../../common/domain/money.vo';
import { Event } from '../../../../domain/event/entities/event.entity';
import {
  EventStatus,
  EventStatusEnum,
} from '../../../../domain/event/value-objects/event-status.vo';
import { TicketCategory } from '../../../../domain/event/entities/ticket-category.entity';
import { TicketReservedEvent } from '../../../../domain/booking/events/ticket-reserved.event';
import { ActiveBookingAlreadyExistsError } from '../../errors/active-booking-already-exists.error';
import { InsufficientQuotaError } from '../../errors/insufficient-quota.error';
import { IDomainEvent } from '../../../../common/domain/domain-event.interface';
import { IDomainEventPublisher } from '../../../../common/application/domain-event-publisher.interface';

const EVENT_ID = '11111111-1111-1111-1111-111111111111';
const CATEGORY_ID = '22222222-2222-2222-2222-222222222222';
const CUSTOMER_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
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

const buildPublishedEvent = (quota = 10): Event =>
  Event.reconstitute(
    {
      id: EVENT_ID,
      name: 'Concert',
      startDate: new Date(Date.now() + 30 * DAY),
      endDate: new Date(Date.now() + 30 * DAY + 3 * 60 * 60_000),
      maxCapacity: 100,
    },
    new EventStatus(EventStatusEnum.Published),
    [
      new TicketCategory({
        id: CATEGORY_ID,
        name: 'Regular',
        price: new Money(50_000),
        quota,
        salesStartDate: new Date(Date.now() - DAY),
        salesEndDate: new Date(Date.now() + 20 * DAY),
      }),
    ],
  );

const buildPaidBookingFor = (
  customerId: string,
  bookingId: string,
  quantity: number,
): Booking =>
  Booking.reconstitute(bookingId, {
    customerId,
    eventId: EVENT_ID,
    ticketCategoryId: CATEGORY_ID,
    quantity,
    unitPrice: new Money(50_000),
    serviceFee: Money.zero(),
    totalPrice: new Money(50_000 * quantity),
    status: BookingStatus.paid(),
    createdAt: new Date(Date.now() - DAY),
    paymentDeadline: new Date(Date.now() - DAY + 15 * 60_000),
    paidAt: new Date(Date.now() - DAY + 5 * 60_000),
  });

const buildPendingPastDeadlineBookingFor = (
  customerId: string,
  bookingId: string,
  quantity: number,
): Booking =>
  Booking.reconstitute(bookingId, {
    customerId,
    eventId: EVENT_ID,
    ticketCategoryId: CATEGORY_ID,
    quantity,
    unitPrice: new Money(50_000),
    serviceFee: Money.zero(),
    totalPrice: new Money(50_000 * quantity),
    status: BookingStatus.pendingPayment(),
    createdAt: new Date(Date.now() - DAY),
    paymentDeadline: new Date(Date.now() - 60_000),
    paidAt: null,
  });

describe('CreateBookingHandler (integration)', () => {
  let bookingRepo: BookingRepository;
  let eventRepo: EventRepository;
  let publisher: FakePublisher;
  let handler: CreateBookingHandler;

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
    eventRepo = new EventRepository(
      AppDataSource.getRepository(EventOrmEntity),
      AppDataSource.getRepository(TicketCategoryOrmEntity),
    );
    publisher = new FakePublisher();
    handler = new CreateBookingHandler(bookingRepo, eventRepo, publisher);
  });

  it('persists a PendingPayment booking and dispatches TicketReserved', async () => {
    await eventRepo.save(buildPublishedEvent());

    const result = await handler.execute(
      new CreateBookingCommand(CUSTOMER_ID, EVENT_ID, CATEGORY_ID, 2),
    );

    expect(result.totalPrice).toBe(100_000);
    expect(result.currency).toBe('IDR');

    const stored = await bookingRepo.findById(new BookingId(result.bookingId));
    expect(stored).not.toBeNull();
    expect(stored!.status.value).toBe(BookingStatusEnum.PENDING_PAYMENT);
    expect(stored!.customerId).toBe(CUSTOMER_ID);
    expect(stored!.quantity).toBe(2);

    expect(publisher.events).toHaveLength(1);
    expect(publisher.events[0]).toBeInstanceOf(TicketReservedEvent);
  });

  it('refuses when the customer already has an active booking for the event', async () => {
    await eventRepo.save(buildPublishedEvent());
    await bookingRepo.save(
      buildPaidBookingFor(
        CUSTOMER_ID,
        'a1111111-1111-1111-1111-111111111111',
        1,
      ),
    );

    await expect(
      handler.execute(
        new CreateBookingCommand(CUSTOMER_ID, EVENT_ID, CATEGORY_ID, 1),
      ),
    ).rejects.toBeInstanceOf(ActiveBookingAlreadyExistsError);

    expect(publisher.events).toHaveLength(0);
  });

  it('refuses when the requested quantity would exceed the category quota', async () => {
    await eventRepo.save(buildPublishedEvent(5));
    await bookingRepo.save(
      buildPaidBookingFor(
        'cccccccc-cccc-cccc-cccc-cccccccccccc',
        'b1111111-1111-1111-1111-111111111111',
        4,
      ),
    );

    await expect(
      handler.execute(
        new CreateBookingCommand(CUSTOMER_ID, EVENT_ID, CATEGORY_ID, 2),
      ),
    ).rejects.toBeInstanceOf(InsufficientQuotaError);

    expect(publisher.events).toHaveLength(0);
  });

  it('releases reserved seats when a previous booking expires (US11)', async () => {
    await eventRepo.save(buildPublishedEvent(1));
    const occupyingBookingId = 'b1111111-1111-1111-1111-111111111111';
    const occupyingCustomerId = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
    await bookingRepo.save(
      buildPendingPastDeadlineBookingFor(
        occupyingCustomerId,
        occupyingBookingId,
        1,
      ),
    );

    // Quota is already fully reserved by the pending booking
    await expect(
      handler.execute(
        new CreateBookingCommand(CUSTOMER_ID, EVENT_ID, CATEGORY_ID, 1),
      ),
    ).rejects.toBeInstanceOf(InsufficientQuotaError);

    // Expire the occupying booking — its seat should be released
    const expireHandler = new ExpireBookingHandler(bookingRepo, publisher);
    await expireHandler.execute(new ExpireBookingCommand(occupyingBookingId));

    const expired = await bookingRepo.findById(
      new BookingId(occupyingBookingId),
    );
    expect(expired!.status.value).toBe(BookingStatusEnum.EXPIRED);

    // Same request now succeeds because the expired booking no longer counts
    const result = await handler.execute(
      new CreateBookingCommand(CUSTOMER_ID, EVENT_ID, CATEGORY_ID, 1),
    );
    const stored = await bookingRepo.findById(new BookingId(result.bookingId));
    expect(stored!.status.value).toBe(BookingStatusEnum.PENDING_PAYMENT);
    expect(stored!.customerId).toBe(CUSTOMER_ID);
  });
});
