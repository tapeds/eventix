import { IUseCase } from '../../../../common/application/use-case.interface';
import { IDomainEventPublisher } from '../../../../common/application/domain-event-publisher.interface';
import { EventRepository } from '../../../../domain/event/repositories/event.repository.interface';
import { IBookingRepository } from '../../../../domain/booking/repositories/booking.repository.interface';
import { ITicketRepository } from '../../../../domain/booking/repositories/ticket.repository.interface';
import { Ticket } from '../../../../domain/booking/entities/ticket.entity';
import { EventNotFoundError } from '../../errors/event-not-found.error';
import { CancelEventCommand } from './cancel-event.command';

export class CancelEventHandler implements IUseCase<CancelEventCommand, void> {
  constructor(
    private readonly eventRepository: EventRepository,
    private readonly bookingRepository: IBookingRepository,
    private readonly ticketRepository: ITicketRepository,
    private readonly eventPublisher: IDomainEventPublisher,
  ) {}

  async execute(command: CancelEventCommand): Promise<void> {
    const event = await this.eventRepository.findById(command.eventId);
    if (!event) {
      throw new EventNotFoundError(command.eventId);
    }

    event.cancel(command.reason);

    await this.eventRepository.save(event);

    const bookings = await this.bookingRepository.findByEventId(
      command.eventId,
    );
    const paidBookings = bookings.filter((b) => b.status.isPaid());

    const affectedTickets: Ticket[] = [];
    for (const booking of paidBookings) {
      const tickets = await this.ticketRepository.findByBookingId(
        booking.bookingId,
      );
      for (const ticket of tickets) {
        if (ticket.status.isCancelled() || ticket.status.isRefundRequired()) {
          continue;
        }
        ticket.markRefundRequired();
        affectedTickets.push(ticket);
      }
    }
    if (affectedTickets.length > 0) {
      await this.ticketRepository.saveMany(affectedTickets);
    }

    await this.eventPublisher.publishAll(event.domainEvents);
    event.clearDomainEvents();
  }
}
