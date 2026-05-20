import { IUseCase } from '../../../../common/application/use-case.interface';
import { IDomainEventPublisher } from '../../../../common/application/domain-event-publisher.interface';
import { IBookingRepository } from '../../../../domain/booking/repositories/booking.repository.interface';
import { BookingId } from '../../../../domain/booking/value-objects/booking-id.vo';
import { BookingNotFoundError } from '../../errors/booking-not-found.error';
import { ExpireBookingCommand } from './expire-booking.command';

export class ExpireBookingHandler implements IUseCase<
  ExpireBookingCommand,
  void
> {
  constructor(
    private readonly bookingRepository: IBookingRepository,
    private readonly eventPublisher: IDomainEventPublisher,
  ) {}

  async execute(command: ExpireBookingCommand): Promise<void> {
    const booking = await this.bookingRepository.findById(
      new BookingId(command.bookingId),
    );
    if (!booking) {
      throw new BookingNotFoundError(command.bookingId);
    }

    booking.expire();

    await this.bookingRepository.save(booking);
    await this.eventPublisher.publishAll(booking.domainEvents);
    booking.clearDomainEvents();
  }
}
