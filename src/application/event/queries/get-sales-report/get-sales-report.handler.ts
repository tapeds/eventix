import { IUseCase } from '../../../../common/application/use-case.interface';
import { EventRepository } from '../../../../domain/event/repositories/event.repository.interface';
import { IBookingRepository } from '../../../../domain/booking/repositories/booking.repository.interface';
import { ITicketRepository } from '../../../../domain/booking/repositories/ticket.repository.interface';
import { Money } from '../../../../common/domain/money.vo';
import { EventNotFoundError } from '../../errors/event-not-found.error';
import { SalesReportDto } from '../../dtos/event.dto';
import { GetSalesReportQuery } from './get-sales-report.query';

export class GetSalesReportHandler implements IUseCase<
  GetSalesReportQuery,
  SalesReportDto
> {
  constructor(
    private readonly eventRepository: EventRepository,
    private readonly bookingRepository: IBookingRepository,
    private readonly ticketRepository: ITicketRepository,
  ) {}

  async execute(query: GetSalesReportQuery): Promise<SalesReportDto> {
    const event = await this.eventRepository.findById(query.eventId);
    if (!event) {
      throw new EventNotFoundError(query.eventId);
    }

    const bookings = await this.bookingRepository.findByEventId(query.eventId);
    const tickets = await this.ticketRepository.findByEventId(query.eventId);

    // Tickets carry no category directly; resolve it through the parent booking.
    const categoryByBooking = new Map(
      bookings.map((b) => [b.bookingId.value, b.ticketCategoryId]),
    );

    const soldByCategory = new Map<string, number>();
    for (const ticket of tickets) {
      if (ticket.status.isCancelled() || ticket.status.isRefundRequired()) {
        continue;
      }
      const categoryId = categoryByBooking.get(ticket.bookingId);
      if (!categoryId) {
        continue;
      }
      soldByCategory.set(categoryId, (soldByCategory.get(categoryId) ?? 0) + 1);
    }

    const ticketsSoldPerCategory = event.ticketCategories.map((c) => ({
      categoryId: c.id,
      categoryName: c.name,
      ticketsSold: soldByCategory.get(c.id) ?? 0,
    }));

    const bookingCountsByStatus = {
      pendingPayment: bookings.filter((b) => b.status.isPendingPayment())
        .length,
      paid: bookings.filter((b) => b.status.isPaid()).length,
      expired: bookings.filter((b) => b.status.isExpired()).length,
      refunded: bookings.filter((b) => b.status.isRefunded()).length,
    };

    const currency = event.ticketCategories[0]?.price.currency ?? 'IDR';
    const totalRevenue = bookings
      .filter((b) => b.status.isPaid())
      .reduce((sum, b) => sum.add(b.totalPrice), Money.zero(currency));

    return {
      eventId: query.eventId,
      ticketsSoldPerCategory,
      bookingCountsByStatus,
      totalRevenue: totalRevenue.amount,
      currency: totalRevenue.currency,
    };
  }
}
