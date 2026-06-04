import { IUseCase } from '../../../../common/application/use-case.interface';
import { EventRepository } from '../../../../domain/event/repositories/event.repository.interface';
import { IBookingRepository } from '../../../../domain/booking/repositories/booking.repository.interface';
import { ITicketRepository } from '../../../../domain/booking/repositories/ticket.repository.interface';
import { IUserRepository } from '../../../../domain/user/repositories/user.repository.interface';
import { UserId } from '../../../../domain/user/value-objects/user-id.vo';
import { EventNotFoundError } from '../../errors/event-not-found.error';
import { ParticipantDto, ParticipantListDto } from '../../dtos/event.dto';
import { GetParticipantsQuery } from './get-participants.query';

export class GetParticipantsHandler implements IUseCase<
  GetParticipantsQuery,
  ParticipantListDto
> {
  constructor(
    private readonly eventRepository: EventRepository,
    private readonly bookingRepository: IBookingRepository,
    private readonly ticketRepository: ITicketRepository,
    private readonly userRepository: IUserRepository,
  ) {}

  async execute(query: GetParticipantsQuery): Promise<ParticipantListDto> {
    const event = await this.eventRepository.findById(query.eventId);
    if (!event) {
      throw new EventNotFoundError(query.eventId);
    }

    const categoryNames = new Map(
      event.ticketCategories.map((c) => [c.id, c.name]),
    );

    const bookings = await this.bookingRepository.findByEventId(query.eventId);
    // Only paid bookings yield active participants; refunded/expired are excluded (US20).
    const paidBookings = bookings.filter((b) => b.status.isPaid());
    const bookingById = new Map(
      paidBookings.map((b) => [b.bookingId.value, b]),
    );

    const tickets = await this.ticketRepository.findByEventId(query.eventId);

    const participants: ParticipantDto[] = [];
    for (const ticket of tickets) {
      const booking = bookingById.get(ticket.bookingId);
      if (!booking) {
        continue;
      }

      const user = await this.userRepository.findById(
        new UserId(booking.customerId),
      );

      participants.push({
        customerId: booking.customerId,
        customerName: user ? user.name.value : booking.customerId,
        ticketCategory:
          categoryNames.get(booking.ticketCategoryId) ??
          booking.ticketCategoryId,
        ticketCode: ticket.ticketCode.value,
        checkInStatus: ticket.status.value,
      });
    }

    return participants;
  }
}
