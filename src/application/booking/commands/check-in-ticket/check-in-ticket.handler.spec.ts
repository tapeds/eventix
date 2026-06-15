/* eslint-disable @typescript-eslint/unbound-method -- jest.Mocked<T> mock references trigger a false positive */
import { CheckInTicketHandler } from './check-in-ticket.handler';
import { CheckInTicketCommand } from './check-in-ticket.command';
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
import { ITicketRepository } from '../../../../domain/booking/repositories/ticket.repository.interface';
import { EventRepository } from '../../../../domain/event/repositories/event.repository.interface';
import { IDomainEventPublisher } from '../../../../common/application/domain-event-publisher.interface';
import { TicketNotFoundByCodeError } from '../../errors/ticket-not-found-by-code.error';
import { CheckInOutsideWindowError } from '../../errors/check-in-outside-window.error';
import { EventNotFoundError } from '../../../event/errors/event-not-found.error';
import { EventCancelledError } from '../../../event/errors/event-cancelled.error';

const TICKET_ID = 'f1111111-1111-1111-1111-111111111111';
const TICKET_CODE = 'TKT-AAA000000001';
const BOOKING_ID = 'a1111111-1111-1111-1111-111111111111';
const EVENT_ID = '11111111-1111-1111-1111-111111111111';
const HOUR = 60 * 60_000;
const DAY = 24 * HOUR;

const buildTicket = (
  status: TicketStatus = TicketStatus.active(),
  eventId: string = EVENT_ID,
): Ticket =>
  Ticket.reconstitute(TICKET_ID, {
    ticketCode: new TicketCode(TICKET_CODE),
    bookingId: BOOKING_ID,
    eventId,
    status,
    issuedAt: new Date(Date.now() - DAY),
    checkedInAt: status.isCheckedIn() ? new Date(Date.now() - HOUR) : null,
  });

const buildEvent = (
  status: EventStatusEnum,
  startOffsetMs: number = 0,
  durationMs: number = 3 * HOUR,
): Event =>
  Event.reconstitute(
    {
      id: EVENT_ID,
      name: 'Concert',
      startDate: new Date(Date.now() + startOffsetMs),
      endDate: new Date(Date.now() + startOffsetMs + durationMs),
      maxCapacity: 100,
    },
    new EventStatus(status),
    [],
  );

const makeTicketRepo = (
  ticket: Ticket | null,
): jest.Mocked<ITicketRepository> => ({
  save: jest.fn().mockResolvedValue(undefined),
  saveMany: jest.fn().mockResolvedValue(undefined),
  findById: jest.fn(),
  findByCode: jest.fn().mockResolvedValue(ticket),
  findByBookingId: jest.fn(),
  findByCustomerId: jest.fn(),
  findByEventId: jest.fn(),
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

const sampleCommand = () => new CheckInTicketCommand(TICKET_CODE, EVENT_ID);

describe('CheckInTicketHandler', () => {
  it('checks the ticket in, saves it, and publishes TicketCheckedIn', async () => {
    const ticket = buildTicket();
    const ticketRepo = makeTicketRepo(ticket);
    const eventRepo = makeEventRepo(buildEvent(EventStatusEnum.Published));
    const publisher = makePublisher();
    const handler = new CheckInTicketHandler(ticketRepo, eventRepo, publisher);

    const result = await handler.execute(sampleCommand());

    expect(ticket.status.value).toBe(TicketStatusEnum.CHECKED_IN);
    expect(result.ticketId).toBe(TICKET_ID);
    expect(result.ticketCode).toBe(TICKET_CODE);
    expect(result.status).toBe(TicketStatusEnum.CHECKED_IN);
    expect(result.checkedInAt).toBeInstanceOf(Date);

    expect(ticketRepo.save).toHaveBeenCalledWith(ticket);
    expect(publisher.publishAll).toHaveBeenCalledTimes(1);
    const events = publisher.publishAll.mock.calls[0][0];
    expect(events).toHaveLength(1);
    expect(events[0]).toBeInstanceOf(TicketCheckedInEvent);
    expect(ticket.domainEvents).toHaveLength(0);
  });

  it('throws TicketNotFoundByCodeError when the code is unknown', async () => {
    const handler = new CheckInTicketHandler(
      makeTicketRepo(null),
      makeEventRepo(buildEvent(EventStatusEnum.Published)),
      makePublisher(),
    );

    await expect(handler.execute(sampleCommand())).rejects.toBeInstanceOf(
      TicketNotFoundByCodeError,
    );
  });

  it('throws EventNotFoundError when the event is missing', async () => {
    const handler = new CheckInTicketHandler(
      makeTicketRepo(buildTicket()),
      makeEventRepo(null),
      makePublisher(),
    );

    await expect(handler.execute(sampleCommand())).rejects.toBeInstanceOf(
      EventNotFoundError,
    );
  });

  it('throws EventCancelledError when the event is cancelled', async () => {
    const ticketRepo = makeTicketRepo(buildTicket());
    const handler = new CheckInTicketHandler(
      ticketRepo,
      makeEventRepo(buildEvent(EventStatusEnum.Cancelled)),
      makePublisher(),
    );

    await expect(handler.execute(sampleCommand())).rejects.toBeInstanceOf(
      EventCancelledError,
    );
    expect(ticketRepo.save).not.toHaveBeenCalled();
  });

  it('throws CheckInOutsideWindowError when the event is still days away', async () => {
    const handler = new CheckInTicketHandler(
      makeTicketRepo(buildTicket()),
      makeEventRepo(buildEvent(EventStatusEnum.Published, 7 * DAY)),
      makePublisher(),
    );

    await expect(handler.execute(sampleCommand())).rejects.toBeInstanceOf(
      CheckInOutsideWindowError,
    );
  });

  it('throws CheckInOutsideWindowError when the event ended long ago', async () => {
    const handler = new CheckInTicketHandler(
      makeTicketRepo(buildTicket()),
      makeEventRepo(buildEvent(EventStatusEnum.Published, -7 * DAY)),
      makePublisher(),
    );

    await expect(handler.execute(sampleCommand())).rejects.toBeInstanceOf(
      CheckInOutsideWindowError,
    );
  });

  it('propagates the domain error when the ticket belongs to a different event (US14)', async () => {
    const ticket = buildTicket(
      TicketStatus.active(),
      'ffffffff-ffff-ffff-ffff-ffffffffffff',
    );
    const ticketRepo = makeTicketRepo(ticket);
    const handler = new CheckInTicketHandler(
      ticketRepo,
      makeEventRepo(buildEvent(EventStatusEnum.Published)),
      makePublisher(),
    );

    await expect(handler.execute(sampleCommand())).rejects.toThrow(
      'Ticket does not match the event',
    );
    expect(ticket.status.value).toBe(TicketStatusEnum.ACTIVE);
    expect(ticketRepo.save).not.toHaveBeenCalled();
  });

  it('propagates the domain error when the ticket has already been checked in (US14)', async () => {
    const ticket = buildTicket(TicketStatus.checkedIn());
    const ticketRepo = makeTicketRepo(ticket);
    const handler = new CheckInTicketHandler(
      ticketRepo,
      makeEventRepo(buildEvent(EventStatusEnum.Published)),
      makePublisher(),
    );

    await expect(handler.execute(sampleCommand())).rejects.toThrow(
      'Ticket has already been used',
    );
    expect(ticket.status.value).toBe(TicketStatusEnum.CHECKED_IN);
    expect(ticketRepo.save).not.toHaveBeenCalled();
  });

  it('propagates the domain error when the ticket is cancelled', async () => {
    const ticket = buildTicket(TicketStatus.cancelled());
    const ticketRepo = makeTicketRepo(ticket);
    const handler = new CheckInTicketHandler(
      ticketRepo,
      makeEventRepo(buildEvent(EventStatusEnum.Published)),
      makePublisher(),
    );

    await expect(handler.execute(sampleCommand())).rejects.toThrow(
      'Only an active ticket can be checked in',
    );
    expect(ticket.status.value).toBe(TicketStatusEnum.CANCELLED);
    expect(ticketRepo.save).not.toHaveBeenCalled();
  });
});
