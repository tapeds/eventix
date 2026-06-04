import { IUseCase } from '../../../../common/application/use-case.interface';
import { EventRepository } from '../../../../domain/event/repositories/event.repository.interface';
import { Event } from '../../../../domain/event/entities/event.entity';
import { EventSummaryDto } from '../../dtos/event.dto';
import { GetAvailableEventsQuery } from './get-available-events.query';

export class GetAvailableEventsHandler implements IUseCase<
  GetAvailableEventsQuery,
  EventSummaryDto[]
> {
  constructor(private readonly eventRepository: EventRepository) {}

  async execute(query: GetAvailableEventsQuery): Promise<EventSummaryDto[]> {
    const events = await this.eventRepository.findPublished();

    return events
      .filter((event) => this.matchesFilter(event, query))
      .map((event) => this.toSummary(event));
  }

  private matchesFilter(event: Event, query: GetAvailableEventsQuery): boolean {
    const { date, location } = query.filter;

    if (date) {
      const start = event.startDate.getTime();
      const end = event.endDate.getTime();
      const target = date.getTime();
      if (target < start || target > end) {
        return false;
      }
    }

    if (location) {
      if (
        !event.location ||
        !event.location.toLowerCase().includes(location.toLowerCase())
      ) {
        return false;
      }
    }

    return true;
  }

  private toSummary(event: Event): EventSummaryDto {
    const activePrices = event.ticketCategories
      .filter((c) => c.status.isActive())
      .map((c) => c.price.amount);

    return {
      id: event.id,
      name: event.name,
      startDate: event.startDate,
      endDate: event.endDate,
      location: event.location,
      lowestPrice: activePrices.length > 0 ? Math.min(...activePrices) : null,
    };
  }
}
