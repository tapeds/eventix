import { AppDataSource } from '../../../../infrastructure/database/data-source';
import { BookingOrmEntity } from '../../../../infrastructure/booking/persistence/booking.orm-entity';
import { BookingRepository } from '../../../../infrastructure/booking/persistence/booking.repository';
import { TicketOrmEntity } from '../../../../infrastructure/booking/persistence/ticket.orm-entity';
import { TicketRepository } from '../../../../infrastructure/booking/persistence/ticket.repository';
import { EventOrmEntity } from '../../../../infrastructure/event/persistence/event.orm-entity';
import { TicketCategoryOrmEntity } from '../../../../infrastructure/event/persistence/ticket-category.orm-entity';
import { EventRepository } from '../../../../infrastructure/event/persistence/event.repository';
import { CheckInTicketHandler } from './check-in-ticket.handler';
import { CheckInTicketCommand } from './check-in-ticket.command';
import { Booking } from '../../../../domain/booking/entities/booking.entity';
import { BookingStatus } from '../../../../domain/booking/value-objects/booking-status.vo';
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
import { TicketCheckedInEvent } from '../../../../domain/booking/events/ticket-checked-in.event';
import { EventCancelledError } from '../../../event/errors/event-cancelled.error';
import { IDomainEvent } from '../../../../common/domain/domain-event.interface';
import { IDomainEventPublisher } from '../../../../common/application/domain-event-publisher.interface';

const TICKET_ID = 'f1111111-1111-1111-1111-111111111111';
const TICKET_CODE = 'TKT-INT0000000001';
const BOOKING_ID = 'a1111111-1111-1111-1111-111111111111';
const CUSTOMER_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const EVENT_ID = '11111111-1111-1111-1111-111111111111';
const CATEGORY_ID = '22222222-2222-2222-2222-222222222222';
const HOUR = 60 * 60_000;
const DAY = 24 * HOUR;

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

const buildEvent = (status: EventStatusEnum): Event =>
  Event.reconstitute(
    {
      id: EVENT_ID,
      name: 'Concert',
      startDate: new Date(Date.now() - HOUR),
      endDate: new Date(Date.now() + 2 * HOUR),
      maxCapacity: 100,
    },
    new EventStatus(status),
    [],
  );

const buildPaidBooking = (): Booking =>
  Booking.reconstitute(BOOKING_ID, {
    customerId: CUSTOMER_ID,
    eventId: EVENT_ID,
    ticketCategoryId: CATEGORY_ID,
    quantity: 1,
    unitPrice: new Money(50_000),
    serviceFee: Money.zero(),
    totalPrice: new Money(50_000),
    status: BookingStatus.paid(),
    createdAt: new Date(Date.now() - DAY),
    paymentDeadline: new Date(Date.now() - DAY + 15 * 60_000),
    paidAt: new Date(Date.now() - DAY + 5 * 60_000),
  });

const buildTicket = (status: TicketStatus = TicketStatus.active()): Ticket =>
  Ticket.reconstitute(TICKET_ID, {
    ticketCode: new TicketCode(TICKET_CODE),
    bookingId: BOOKING_ID,
    eventId: EVENT_ID,
    status,
    issuedAt: new Date(Date.now() - HOUR),
    checkedInAt: null,
  });

describe('CheckInTicketHandler (integration)', () => {
  let bookingRepo: BookingRepository;
  let ticketRepo: TicketRepository;
  let eventRepo: EventRepository;
  let publisher: FakePublisher;
  let handler: CheckInTicketHandler;

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
    handler = new CheckInTicketHandler(ticketRepo, eventRepo, publisher);
  });

  it('flips ticket to CheckedIn and persists checkedInAt', async () => {
    await eventRepo.save(buildEvent(EventStatusEnum.Published));
    await bookingRepo.save(buildPaidBooking());
    await ticketRepo.save(buildTicket());

    const result = await handler.execute(
      new CheckInTicketCommand(TICKET_CODE, EVENT_ID),
    );

    expect(result.status).toBe(TicketStatusEnum.CHECKED_IN);

    const reloaded = await ticketRepo.findByCode(new TicketCode(TICKET_CODE));
    expect(reloaded!.status.value).toBe(TicketStatusEnum.CHECKED_IN);
    expect(reloaded!.checkedInAt).toBeInstanceOf(Date);

    expect(publisher.events).toHaveLength(1);
    expect(publisher.events[0]).toBeInstanceOf(TicketCheckedInEvent);
  });

  it('refuses to check in an already-checked-in ticket and leaves the row unchanged', async () => {
    await eventRepo.save(buildEvent(EventStatusEnum.Published));
    await bookingRepo.save(buildPaidBooking());
    await ticketRepo.save(buildTicket(TicketStatus.checkedIn()));

    await expect(
      handler.execute(new CheckInTicketCommand(TICKET_CODE, EVENT_ID)),
    ).rejects.toThrow('Ticket has already been used');

    const reloaded = await ticketRepo.findByCode(new TicketCode(TICKET_CODE));
    expect(reloaded!.status.value).toBe(TicketStatusEnum.CHECKED_IN);
    expect(publisher.events).toHaveLength(0);
  });

  it('refuses to check in when the event is cancelled', async () => {
    await eventRepo.save(buildEvent(EventStatusEnum.Cancelled));
    await bookingRepo.save(buildPaidBooking());
    await ticketRepo.save(buildTicket());

    await expect(
      handler.execute(new CheckInTicketCommand(TICKET_CODE, EVENT_ID)),
    ).rejects.toBeInstanceOf(EventCancelledError);

    const reloaded = await ticketRepo.findByCode(new TicketCode(TICKET_CODE));
    expect(reloaded!.status.value).toBe(TicketStatusEnum.ACTIVE);
    expect(publisher.events).toHaveLength(0);
  });
});
