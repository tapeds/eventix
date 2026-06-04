import { IUseCase } from '../../../../common/application/use-case.interface';
import { IDomainEventPublisher } from '../../../../common/application/domain-event-publisher.interface';
import { Money } from '../../../../common/domain/money.vo';
import { IBookingRepository } from '../../../../domain/booking/repositories/booking.repository.interface';
import { ITicketRepository } from '../../../../domain/booking/repositories/ticket.repository.interface';
import { BookingId } from '../../../../domain/booking/value-objects/booking-id.vo';
import { IPaymentGateway } from '../../services/payment-gateway.interface';
import { BookingNotFoundError } from '../../errors/booking-not-found.error';
import { NotBookingOwnerError } from '../../errors/not-booking-owner.error';
import { BookingNotPayableError } from '../../errors/booking-not-payable.error';
import { PaymentDeadlinePassedError } from '../../errors/payment-deadline-passed.error';
import { IncorrectPaymentAmountError } from '../../errors/incorrect-payment-amount.error';
import { PayBookingCommand } from './pay-booking.command';

export class PayBookingHandler implements IUseCase<PayBookingCommand, void> {
  constructor(
    private readonly bookingRepository: IBookingRepository,
    private readonly ticketRepository: ITicketRepository,
    private readonly paymentGateway: IPaymentGateway,
    private readonly eventPublisher: IDomainEventPublisher,
  ) {}

  async execute(command: PayBookingCommand): Promise<void> {
    const booking = await this.bookingRepository.findById(
      new BookingId(command.bookingId),
    );
    if (!booking) {
      throw new BookingNotFoundError(command.bookingId);
    }

    if (booking.customerId !== command.customerId) {
      throw new NotBookingOwnerError(command.bookingId, command.customerId);
    }

    if (!booking.status.isPendingPayment()) {
      throw new BookingNotPayableError(command.bookingId);
    }

    if (Date.now() > booking.paymentDeadline.getTime()) {
      throw new PaymentDeadlinePassedError(command.bookingId);
    }

    const amount = new Money(command.amount, command.currency);
    if (!amount.equals(booking.totalPrice)) {
      throw new IncorrectPaymentAmountError(command.bookingId);
    }

    await this.paymentGateway.charge({
      bookingId: command.bookingId,
      customerId: command.customerId,
      amount: command.amount,
      currency: command.currency,
      idempotencyKey: command.bookingId,
    });

    const tickets = booking.pay(amount);

    await this.bookingRepository.save(booking);
    await this.ticketRepository.saveMany(tickets);
    await this.eventPublisher.publishAll(booking.domainEvents);
    booking.clearDomainEvents();
  }
}
