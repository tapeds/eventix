/* eslint-disable @typescript-eslint/unbound-method -- jest.Mocked<T> mock references trigger a false positive */
import { CreateBookingHandler } from './create-booking.handler';
import { CreateBookingCommand } from './create-booking.command';
import { Event } from '../../../../domain/event/entities/event.entity';
import {
  EventStatus,
  EventStatusEnum,
} from '../../../../domain/event/value-objects/event-status.vo';
import { TicketCategory } from '../../../../domain/event/entities/ticket-category.entity';
import {
  TicketCategoryStatus,
  TicketCategoryStatusEnum,
} from '../../../../domain/event/value-objects/ticket-category-status.vo';
import { Booking } from '../../../../domain/booking/entities/booking.entity';
import { BookingStatus } from '../../../../domain/booking/value-objects/booking-status.vo';
import { Money } from '../../../../common/domain/money.vo';
import { TicketReservedEvent } from '../../../../domain/booking/events/ticket-reserved.event';
import { IBookingRepository } from '../../../../domain/booking/repositories/booking.repository.interface';
import { EventRepository } from '../../../../domain/event/repositories/event.repository.interface';
import { IDomainEventPublisher } from '../../../../common/application/domain-event-publisher.interface';
import { EventNotFoundError } from '../../../event/errors/event-not-found.error';
import { EventNotPublishedError } from '../../../event/errors/event-not-published.error';
import { TicketCategoryNotFoundError } from '../../../event/errors/ticket-category-not-found.error';
import { TicketCategoryNotActiveError } from '../../../event/errors/ticket-category-not-active.error';
import { TicketCategoryOutsideSalesPeriodError } from '../../../event/errors/ticket-category-outside-sales-period.error';
import { ActiveBookingAlreadyExistsError } from '../../errors/active-booking-already-exists.error';
import { InsufficientQuotaError } from '../../errors/insufficient-quota.error';

const EVENT_ID = '11111111-1111-1111-1111-111111111111';
const CATEGORY_ID = '22222222-2222-2222-2222-222222222222';
const CUSTOMER_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const DAY = 24 * 60 * 60 * 1000;

const buildCategory = (
  overrides: {
    status?: TicketCategoryStatus;
    salesStartDate?: Date;
    salesEndDate?: Date;
    quota?: number;
  } = {},
): TicketCategory =>
  new TicketCategory({
    id: CATEGORY_ID,
    name: 'Regular',
    price: new Money(50_000),
    quota: overrides.quota ?? 10,
    salesStartDate: overrides.salesStartDate ?? new Date(Date.now() - DAY),
    salesEndDate: overrides.salesEndDate ?? new Date(Date.now() + DAY),
    status: overrides.status,
  });

const buildEvent = (
  status: EventStatusEnum,
  categories: TicketCategory[],
): Event =>
  Event.reconstitute(
    {
      id: EVENT_ID,
      name: 'Concert',
      startDate: new Date(Date.now() + 7 * DAY),
      endDate: new Date(Date.now() + 7 * DAY + 3 * 60 * 60_000),
      maxCapacity: 100,
    },
    new EventStatus(status),
    categories,
  );

const buildExistingPaidBooking = (quantity: number): Booking =>
  Booking.reconstitute('b1111111-1111-1111-1111-111111111111', {
    customerId: 'somebody-else',
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

const makeBookingRepo = (
  config: {
    active?: Booking | null;
    byEvent?: Booking[];
  } = {},
): jest.Mocked<IBookingRepository> => ({
  save: jest.fn().mockResolvedValue(undefined),
  findById: jest.fn(),
  findActiveByCustomerAndEvent: jest
    .fn()
    .mockResolvedValue(config.active ?? null),
  findByEventId: jest.fn().mockResolvedValue(config.byEvent ?? []),
  delete: jest.fn(),
});

const makeEventRepo = (event: Event | null): jest.Mocked<EventRepository> => ({
  save: jest.fn().mockResolvedValue(undefined),
  findById: jest.fn().mockResolvedValue(event),
  findPublished: jest.fn(),
});

const makePublisher = (): jest.Mocked<IDomainEventPublisher> => ({
  publish: jest.fn().mockResolvedValue(undefined),
  publishAll: jest.fn().mockResolvedValue(undefined),
});

const sampleCommand = (quantity = 2) =>
  new CreateBookingCommand(CUSTOMER_ID, EVENT_ID, CATEGORY_ID, quantity);

describe('CreateBookingHandler', () => {
  it('creates a PendingPayment booking and publishes TicketReserved', async () => {
    const event = buildEvent(EventStatusEnum.Published, [buildCategory()]);
    const bookingRepo = makeBookingRepo();
    const eventRepo = makeEventRepo(event);
    const publisher = makePublisher();
    const handler = new CreateBookingHandler(bookingRepo, eventRepo, publisher);

    const result = await handler.execute(sampleCommand(2));

    expect(result.bookingId).toBeDefined();
    expect(result.totalPrice).toBe(100_000);
    expect(result.currency).toBe('IDR');
    expect(result.paymentDeadline).toBeInstanceOf(Date);

    expect(bookingRepo.save).toHaveBeenCalledTimes(1);
    expect(publisher.publishAll).toHaveBeenCalledTimes(1);
    const events = publisher.publishAll.mock.calls[0][0];
    expect(events).toHaveLength(1);
    expect(events[0]).toBeInstanceOf(TicketReservedEvent);
  });

  it('throws EventNotFoundError', async () => {
    const handler = new CreateBookingHandler(
      makeBookingRepo(),
      makeEventRepo(null),
      makePublisher(),
    );

    await expect(handler.execute(sampleCommand())).rejects.toBeInstanceOf(
      EventNotFoundError,
    );
  });

  it('throws EventNotPublishedError when the event is Draft', async () => {
    const event = buildEvent(EventStatusEnum.Draft, [buildCategory()]);
    const bookingRepo = makeBookingRepo();
    const handler = new CreateBookingHandler(
      bookingRepo,
      makeEventRepo(event),
      makePublisher(),
    );

    await expect(handler.execute(sampleCommand())).rejects.toBeInstanceOf(
      EventNotPublishedError,
    );
    expect(bookingRepo.save).not.toHaveBeenCalled();
  });

  it('throws EventNotPublishedError when the event is Cancelled', async () => {
    const event = buildEvent(EventStatusEnum.Cancelled, [buildCategory()]);
    const handler = new CreateBookingHandler(
      makeBookingRepo(),
      makeEventRepo(event),
      makePublisher(),
    );

    await expect(handler.execute(sampleCommand())).rejects.toBeInstanceOf(
      EventNotPublishedError,
    );
  });

  it('throws TicketCategoryNotFoundError when the category id is unknown', async () => {
    const event = buildEvent(EventStatusEnum.Published, []);
    const handler = new CreateBookingHandler(
      makeBookingRepo(),
      makeEventRepo(event),
      makePublisher(),
    );

    await expect(handler.execute(sampleCommand())).rejects.toBeInstanceOf(
      TicketCategoryNotFoundError,
    );
  });

  it('throws TicketCategoryNotActiveError when the category is disabled', async () => {
    const event = buildEvent(EventStatusEnum.Published, [
      buildCategory({
        status: new TicketCategoryStatus(TicketCategoryStatusEnum.Disabled),
      }),
    ]);
    const handler = new CreateBookingHandler(
      makeBookingRepo(),
      makeEventRepo(event),
      makePublisher(),
    );

    await expect(handler.execute(sampleCommand())).rejects.toBeInstanceOf(
      TicketCategoryNotActiveError,
    );
  });

  it('throws TicketCategoryOutsideSalesPeriodError before the sales start', async () => {
    const event = buildEvent(EventStatusEnum.Published, [
      buildCategory({
        salesStartDate: new Date(Date.now() + DAY),
        salesEndDate: new Date(Date.now() + 2 * DAY),
      }),
    ]);
    const handler = new CreateBookingHandler(
      makeBookingRepo(),
      makeEventRepo(event),
      makePublisher(),
    );

    await expect(handler.execute(sampleCommand())).rejects.toBeInstanceOf(
      TicketCategoryOutsideSalesPeriodError,
    );
  });

  it('throws TicketCategoryOutsideSalesPeriodError after the sales end', async () => {
    const event = buildEvent(EventStatusEnum.Published, [
      buildCategory({
        salesStartDate: new Date(Date.now() - 2 * DAY),
        salesEndDate: new Date(Date.now() - DAY),
      }),
    ]);
    const handler = new CreateBookingHandler(
      makeBookingRepo(),
      makeEventRepo(event),
      makePublisher(),
    );

    await expect(handler.execute(sampleCommand())).rejects.toBeInstanceOf(
      TicketCategoryOutsideSalesPeriodError,
    );
  });

  it('throws ActiveBookingAlreadyExistsError when the customer already has an active booking for the event', async () => {
    const event = buildEvent(EventStatusEnum.Published, [buildCategory()]);
    const existing = buildExistingPaidBooking(1);
    const handler = new CreateBookingHandler(
      makeBookingRepo({ active: existing }),
      makeEventRepo(event),
      makePublisher(),
    );

    await expect(handler.execute(sampleCommand())).rejects.toBeInstanceOf(
      ActiveBookingAlreadyExistsError,
    );
  });

  it('throws InsufficientQuotaError when requested quantity exceeds remaining seats', async () => {
    const event = buildEvent(EventStatusEnum.Published, [
      buildCategory({ quota: 5 }),
    ]);
    const handler = new CreateBookingHandler(
      makeBookingRepo({ byEvent: [buildExistingPaidBooking(4)] }),
      makeEventRepo(event),
      makePublisher(),
    );

    await expect(handler.execute(sampleCommand(2))).rejects.toBeInstanceOf(
      InsufficientQuotaError,
    );
  });

  it('propagates the domain quantity check (zero quantity)', async () => {
    const event = buildEvent(EventStatusEnum.Published, [buildCategory()]);
    const handler = new CreateBookingHandler(
      makeBookingRepo(),
      makeEventRepo(event),
      makePublisher(),
    );

    await expect(handler.execute(sampleCommand(0))).rejects.toThrow(
      'Ticket quantity must be greater than zero',
    );
  });
});
