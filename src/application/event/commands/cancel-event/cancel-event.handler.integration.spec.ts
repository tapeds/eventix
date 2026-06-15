import { AppDataSource } from '../../../../infrastructure/database/data-source';
import { BookingOrmEntity } from '../../../../infrastructure/booking/persistence/booking.orm-entity';
import { BookingRepository } from '../../../../infrastructure/booking/persistence/booking.repository';
import { TicketOrmEntity } from '../../../../infrastructure/booking/persistence/ticket.orm-entity';
import { TicketRepository } from '../../../../infrastructure/booking/persistence/ticket.repository';
import { EventOrmEntity } from '../../../../infrastructure/event/persistence/event.orm-entity';
import { TicketCategoryOrmEntity } from '../../../../infrastructure/event/persistence/ticket-category.orm-entity';
import { EventRepository } from '../../../../infrastructure/event/persistence/event.repository';
import { CancelEventHandler } from './cancel-event.handler';
import { CancelEventCommand } from './cancel-event.command';
import { Booking } from '../../../../domain/booking/entities/booking.entity';
import { BookingStatus } from '../../../../domain/booking/value-objects/booking-status.vo';
import { BookingId } from '../../../../domain/booking/value-objects/booking-id.vo';
import { Money } from '../../../../common/domain/money.vo';
import { Ticket } from '../../../../domain/booking/entities/ticket.entity';
import { TicketCode } from '../../../../domain/booking/value-objects/ticket-code.vo';
import {
  TicketStatus,
  TicketStatusEnum,
} from '../../../../domain/booking/value-objects/ticket-status.vo';
import { Event } from '../../../../domain/event/entities/event.entity';
import {
  EventStatus,
  EventStatusEnum,
} from '../../../../domain/event/value-objects/event-status.vo';
import { TicketCategory } from '../../../../domain/event/entities/ticket-category.entity';
import { IDomainEvent } from '../../../../common/domain/domain-event.interface';
import { IDomainEventPublisher } from '../../../../common/application/domain-event-publisher.interface';

const EVENT_ID = '11111111-1111-1111-1111-111111111111';
const CATEGORY_ID = '22222222-2222-2222-2222-222222222222';
const PAID_BOOKING = 'a1111111-1111-1111-1111-111111111111';
const PENDING_BOOKING = 'a2222222-2222-2222-2222-222222222222';
const PAID_CUSTOMER = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const PENDING_CUSTOMER = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
const TICKET_1 = 'f1111111-1111-1111-1111-111111111111';
const TICKET_2 = 'f2222222-2222-2222-2222-222222222222';
const DAY = 24 * 60 * 60_000;

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

const buildPublishedEvent = (): Event =>
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
        quota: 10,
        salesStartDate: new Date(Date.now() - DAY),
        salesEndDate: new Date(Date.now() + 20 * DAY),
      }),
    ],
  );

const buildBooking = (
  id: string,
  customerId: string,
  status: BookingStatus,
): Booking =>
  Booking.reconstitute(id, {
    customerId,
    eventId: EVENT_ID,
    ticketCategoryId: CATEGORY_ID,
    quantity: 1,
    unitPrice: new Money(50_000),
    serviceFee: Money.zero(),
    totalPrice: new Money(50_000),
    status,
    createdAt: new Date(Date.now() - DAY),
    paymentDeadline: new Date(Date.now() - DAY + 15 * 60_000),
    paidAt: status.isPaid() ? new Date(Date.now() - DAY + 5 * 60_000) : null,
  });

const buildActiveTicket = (
  id: string,
  bookingId: string,
  code: string,
): Ticket =>
  Ticket.reconstitute(id, {
    ticketCode: new TicketCode(code),
    bookingId,
    eventId: EVENT_ID,
    status: TicketStatus.active(),
    issuedAt: new Date(Date.now() - DAY + 5 * 60_000),
    checkedInAt: null,
  });

describe('CancelEventHandler (integration) — US3/US12 cascade', () => {
  let bookingRepo: BookingRepository;
  let ticketRepo: TicketRepository;
  let eventRepo: EventRepository;
  let publisher: FakePublisher;
  let handler: CancelEventHandler;

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
    publisher = new FakePublisher();
    handler = new CancelEventHandler(
      eventRepo,
      bookingRepo,
      ticketRepo,
      publisher,
    );
  });

  it('flips event to Cancelled and marks tickets from paid bookings as RefundRequired', async () => {
    await eventRepo.save(buildPublishedEvent());
    await bookingRepo.save(
      buildBooking(PAID_BOOKING, PAID_CUSTOMER, BookingStatus.paid()),
    );
    await bookingRepo.save(
      buildBooking(
        PENDING_BOOKING,
        PENDING_CUSTOMER,
        BookingStatus.pendingPayment(),
      ),
    );
    await ticketRepo.saveMany([
      buildActiveTicket(TICKET_1, PAID_BOOKING, 'TKT-PAID00000001'),
      buildActiveTicket(TICKET_2, PENDING_BOOKING, 'TKT-PEND00000001'),
    ]);

    await handler.execute(new CancelEventCommand(EVENT_ID, 'venue closed'));

    const paidTickets = await ticketRepo.findByBookingId(
      new BookingId(PAID_BOOKING),
    );
    expect(paidTickets[0].status.value).toBe(TicketStatusEnum.REFUND_REQUIRED);

    const pendingTickets = await ticketRepo.findByBookingId(
      new BookingId(PENDING_BOOKING),
    );
    expect(pendingTickets[0].status.value).toBe(TicketStatusEnum.ACTIVE);

    expect(publisher.events.map((e) => e.eventName)).toContain(
      'EventCancelled',
    );
  });
});
