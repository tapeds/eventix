import { IUseCase } from '../../../../common/application/use-case.interface';
import { EventRepository } from '../../../../domain/event/repositories/event.repository.interface';
import { TicketCategory } from '../../../../domain/event/entities/ticket-category.entity';
import { EventNotFoundError } from '../../errors/event-not-found.error';
import {
  EventDetailsDto,
  TicketCategoryDto,
  TicketCategoryPurchaseStatus,
} from '../../dtos/event.dto';
import { GetEventDetailsQuery } from './get-event-details.query';

export class GetEventDetailsHandler implements IUseCase<
  GetEventDetailsQuery,
  EventDetailsDto
> {
  constructor(private readonly eventRepository: EventRepository) {}

  async execute(query: GetEventDetailsQuery): Promise<EventDetailsDto> {
    const event = await this.eventRepository.findById(query.eventId);
    if (!event) {
      throw new EventNotFoundError(query.eventId);
    }

    const now = new Date();

    return {
      id: event.id,
      name: event.name,
      description: event.description,
      startDate: event.startDate,
      endDate: event.endDate,
      location: event.location,
      status: event.status.value,
      maxCapacity: event.maxCapacity,
      ticketCategories: event.ticketCategories.map((c) =>
        this.toCategoryDto(c, now),
      ),
    };
  }

  private toCategoryDto(
    category: TicketCategory,
    now: Date,
  ): TicketCategoryDto {
    return {
      id: category.id,
      name: category.name,
      price: category.price.amount,
      currency: category.price.currency,
      quota: category.quota,
      salesStartDate: category.salesStartDate,
      salesEndDate: category.salesEndDate,
      status: category.status.value,
      purchaseStatus: this.purchaseStatus(category, now),
    };
  }

  private purchaseStatus(
    category: TicketCategory,
    now: Date,
  ): TicketCategoryPurchaseStatus {
    if (!category.status.isActive()) {
      return 'SalesClosed';
    }
    if (now < category.salesStartDate) {
      return 'ComingSoon';
    }
    if (now > category.salesEndDate) {
      return 'SalesClosed';
    }
    // NOTE: 'SoldOut' requires remaining-quota counts from issued tickets, which
    // is out of scope for this read path; sales-window state is derived here only.
    return 'OnSale';
  }
}
