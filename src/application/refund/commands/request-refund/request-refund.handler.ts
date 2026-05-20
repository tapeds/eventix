import { IUseCase } from '../../../../common/application/use-case.interface';
import { IDomainEventPublisher } from '../../../../common/application/domain-event-publisher.interface';
import { IBookingRepository } from '../../../../domain/booking/repositories/booking.repository.interface';
import { ITicketRepository } from '../../../../domain/booking/repositories/ticket.repository.interface';
import { EventRepository } from '../../../../domain/event/repositories/event.repository.interface';
import { IRefundRepository } from '../../../../domain/refund/repositories/refund.repository.interface';
import { BookingId } from '../../../../domain/booking/value-objects/booking-id.vo';
import { Refund } from '../../../../domain/refund/entities/refund.entity';
import { BookingNotFoundError } from '../../../booking/errors/booking-not-found.error';
import { NotBookingOwnerError } from '../../../booking/errors/not-booking-owner.error';
import { BookingNotPaidError } from '../../../booking/errors/booking-not-paid.error';
import { TicketAlreadyCheckedInError } from '../../../booking/errors/ticket-already-checked-in.error';
import { EventNotFoundError } from '../../../event/errors/event-not-found.error';
import { RefundAlreadyExistsError } from '../../errors/refund-already-exists.error';
import { RefundDeadlinePassedError } from '../../errors/refund-deadline-passed.error';
import { RequestRefundCommand } from './request-refund.command';

export class RequestRefundHandler implements IUseCase<
  RequestRefundCommand,
  void
> {
  constructor(
    private readonly bookingRepository: IBookingRepository,
    private readonly ticketRepository: ITicketRepository,
    private readonly eventRepository: EventRepository,
    private readonly refundRepository: IRefundRepository,
    private readonly eventPublisher: IDomainEventPublisher,
  ) {}

  async execute(command: RequestRefundCommand): Promise<void> {
    const booking = await this.bookingRepository.findById(
      new BookingId(command.bookingId),
    );
    if (!booking) {
      throw new BookingNotFoundError(command.bookingId);
    }

    if (booking.customerId !== command.customerId) {
      throw new NotBookingOwnerError(command.bookingId, command.customerId);
    }

    const existingRefund = await this.refundRepository.findByBookingId(
      command.bookingId,
    );
    if (existingRefund) {
      throw new RefundAlreadyExistsError(command.bookingId);
    }

    const event = await this.eventRepository.findById(booking.eventId);
    if (!event) {
      throw new EventNotFoundError(booking.eventId);
    }

    if (!event.status.isCancelled()) {
      if (!booking.status.isPaid()) {
        throw new BookingNotPaidError(command.bookingId);
      }

      const tickets = await this.ticketRepository.findByBookingId(
        booking.bookingId,
      );
      const checkedIn = tickets.find((t) => t.status.isCheckedIn());
      if (checkedIn) {
        throw new TicketAlreadyCheckedInError(checkedIn.ticketCode.value);
      }

      if (Date.now() >= event.startDate.getTime()) {
        throw new RefundDeadlinePassedError(command.bookingId);
      }
    }

    const refund = Refund.request({
      bookingId: command.bookingId,
      customerId: command.customerId,
      amount: booking.totalPrice,
    });

    await this.refundRepository.save(refund);
    await this.eventPublisher.publishAll(refund.domainEvents);
    refund.clearDomainEvents();
  }
}
