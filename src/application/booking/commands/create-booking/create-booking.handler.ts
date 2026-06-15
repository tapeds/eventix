import { IUseCase } from '../../../../common/application/use-case.interface';
import { IDomainEventPublisher } from '../../../../common/application/domain-event-publisher.interface';
import { IBookingRepository } from '../../../../domain/booking/repositories/booking.repository.interface';
import { Booking } from '../../../../domain/booking/entities/booking.entity';
import { EventRepository } from '../../../../domain/event/repositories/event.repository.interface';
import { EventNotFoundError } from '../../../event/errors/event-not-found.error';
import { EventNotPublishedError } from '../../../event/errors/event-not-published.error';
import { TicketCategoryNotFoundError } from '../../../event/errors/ticket-category-not-found.error';
import { TicketCategoryNotActiveError } from '../../../event/errors/ticket-category-not-active.error';
import { TicketCategoryOutsideSalesPeriodError } from '../../../event/errors/ticket-category-outside-sales-period.error';
import { ActiveBookingAlreadyExistsError } from '../../errors/active-booking-already-exists.error';
import { InsufficientQuotaError } from '../../errors/insufficient-quota.error';
import {
  CreateBookingCommand,
  CreateBookingResult,
} from './create-booking.command';

export class CreateBookingHandler implements IUseCase<
  CreateBookingCommand,
  CreateBookingResult
> {
  constructor(
    private readonly bookingRepository: IBookingRepository,
    private readonly eventRepository: EventRepository,
    private readonly eventPublisher: IDomainEventPublisher,
  ) {}

  async execute(command: CreateBookingCommand): Promise<CreateBookingResult> {
    const event = await this.eventRepository.findById(command.eventId);
    if (!event) {
      throw new EventNotFoundError(command.eventId);
    }
    if (!event.status.isPublished()) {
      throw new EventNotPublishedError(command.eventId);
    }

    const category = event.ticketCategories.find(
      (c) => c.id === command.ticketCategoryId,
    );
    if (!category) {
      throw new TicketCategoryNotFoundError(command.ticketCategoryId);
    }
    if (!category.status.isActive()) {
      throw new TicketCategoryNotActiveError(command.ticketCategoryId);
    }

    const now = new Date();
    if (now < category.salesStartDate || now > category.salesEndDate) {
      throw new TicketCategoryOutsideSalesPeriodError(command.ticketCategoryId);
    }

    const existing = await this.bookingRepository.findActiveByCustomerAndEvent(
      command.customerId,
      command.eventId,
    );
    if (existing) {
      throw new ActiveBookingAlreadyExistsError(
        command.customerId,
        command.eventId,
      );
    }

    const allBookings = await this.bookingRepository.findByEventId(
      command.eventId,
    );
    const reservedSeats = allBookings
      .filter((b) => b.ticketCategoryId === command.ticketCategoryId)
      .filter((b) => b.status.isPendingPayment() || b.status.isPaid())
      .reduce((sum, b) => sum + b.quantity, 0);
    const remaining = category.quota - reservedSeats;
    if (command.quantity > remaining) {
      throw new InsufficientQuotaError(
        command.ticketCategoryId,
        command.quantity,
        remaining,
      );
    }

    const booking = Booking.create({
      customerId: command.customerId,
      eventId: command.eventId,
      ticketCategoryId: command.ticketCategoryId,
      quantity: command.quantity,
      unitPrice: category.price,
    });

    await this.bookingRepository.save(booking);
    await this.eventPublisher.publishAll(booking.domainEvents);
    booking.clearDomainEvents();

    return {
      bookingId: booking.bookingId.value,
      paymentDeadline: booking.paymentDeadline,
      totalPrice: booking.totalPrice.amount,
      currency: booking.totalPrice.currency,
    };
  }
}
