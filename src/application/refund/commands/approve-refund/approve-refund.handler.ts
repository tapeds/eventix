import { IUseCase } from '../../../../common/application/use-case.interface';
import { IDomainEventPublisher } from '../../../../common/application/domain-event-publisher.interface';
import { IBookingRepository } from '../../../../domain/booking/repositories/booking.repository.interface';
import { ITicketRepository } from '../../../../domain/booking/repositories/ticket.repository.interface';
import { BookingId } from '../../../../domain/booking/value-objects/booking-id.vo';
import { IRefundRepository } from '../../../../domain/refund/repositories/refund.repository.interface';
import { RefundId } from '../../../../domain/refund/value-objects/refund-id.vo';
import { BookingNotFoundError } from '../../../booking/errors/booking-not-found.error';
import { RefundNotFoundError } from '../../errors/refund-not-found.error';
import { ApproveRefundCommand } from './approve-refund.command';

export class ApproveRefundHandler implements IUseCase<
  ApproveRefundCommand,
  void
> {
  constructor(
    private readonly refundRepository: IRefundRepository,
    private readonly bookingRepository: IBookingRepository,
    private readonly ticketRepository: ITicketRepository,
    private readonly eventPublisher: IDomainEventPublisher,
  ) {}

  async execute(command: ApproveRefundCommand): Promise<void> {
    const refund = await this.refundRepository.findById(
      new RefundId(command.refundId),
    );
    if (!refund) {
      throw new RefundNotFoundError(command.refundId);
    }

    refund.approve();

    const booking = await this.bookingRepository.findById(
      new BookingId(refund.bookingId),
    );
    if (!booking) {
      throw new BookingNotFoundError(refund.bookingId);
    }
    booking.markAsRefunded();

    const tickets = await this.ticketRepository.findByBookingId(
      booking.bookingId,
    );
    tickets.forEach((ticket) => ticket.cancel());

    await this.refundRepository.save(refund);
    await this.bookingRepository.save(booking);
    if (tickets.length > 0) {
      await this.ticketRepository.saveMany(tickets);
    }

    await this.eventPublisher.publishAll(refund.domainEvents);
    refund.clearDomainEvents();
  }
}
