import { IUseCase } from '../../../../common/application/use-case.interface';
import { IDomainEventPublisher } from '../../../../common/application/domain-event-publisher.interface';
import { ITicketRepository } from '../../../../domain/booking/repositories/ticket.repository.interface';
import { TicketCode } from '../../../../domain/booking/value-objects/ticket-code.vo';
import { EventRepository } from '../../../../domain/event/repositories/event.repository.interface';
import { TicketNotFoundByCodeError } from '../../errors/ticket-not-found-by-code.error';
import { CheckInOutsideWindowError } from '../../errors/check-in-outside-window.error';
import { EventNotFoundError } from '../../../event/errors/event-not-found.error';
import { EventCancelledError } from '../../../event/errors/event-cancelled.error';
import {
  CheckInTicketCommand,
  CheckInTicketResult,
} from './check-in-ticket.command';

const CHECK_IN_OPENS_BEFORE_MS = 4 * 60 * 60_000;
const CHECK_IN_CLOSES_AFTER_MS = 60 * 60_000;

export class CheckInTicketHandler implements IUseCase<
  CheckInTicketCommand,
  CheckInTicketResult
> {
  constructor(
    private readonly ticketRepository: ITicketRepository,
    private readonly eventRepository: EventRepository,
    private readonly eventPublisher: IDomainEventPublisher,
  ) {}

  async execute(command: CheckInTicketCommand): Promise<CheckInTicketResult> {
    const ticket = await this.ticketRepository.findByCode(
      new TicketCode(command.ticketCode),
    );
    if (!ticket) {
      throw new TicketNotFoundByCodeError(command.ticketCode);
    }

    const event = await this.eventRepository.findById(command.eventId);
    if (!event) {
      throw new EventNotFoundError(command.eventId);
    }
    if (event.status.isCancelled()) {
      throw new EventCancelledError(command.eventId);
    }

    const now = new Date();
    const windowStart = event.startDate.getTime() - CHECK_IN_OPENS_BEFORE_MS;
    const windowEnd = event.endDate.getTime() + CHECK_IN_CLOSES_AFTER_MS;
    if (now.getTime() < windowStart || now.getTime() > windowEnd) {
      throw new CheckInOutsideWindowError(command.ticketCode);
    }

    ticket.checkIn(command.eventId, now);

    await this.ticketRepository.save(ticket);
    await this.eventPublisher.publishAll(ticket.domainEvents);
    ticket.clearDomainEvents();

    return {
      ticketId: ticket.ticketId.value,
      ticketCode: ticket.ticketCode.value,
      status: ticket.status.value,
      checkedInAt: ticket.checkedInAt!,
    };
  }
}
