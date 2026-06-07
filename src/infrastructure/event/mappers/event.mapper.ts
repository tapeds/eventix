import { Money } from '../../../common/domain/money.vo';
import { Event } from '../../../domain/event/entities/event.entity';
import { TicketCategory } from '../../../domain/event/entities/ticket-category.entity';
import {
  EventStatus,
  EventStatusEnum,
} from '../../../domain/event/value-objects/event-status.vo';
import {
  TicketCategoryStatus,
  TicketCategoryStatusEnum,
} from '../../../domain/event/value-objects/ticket-category-status.vo';
import { EventOrmEntity } from '../persistence/event.orm-entity';
import { TicketCategoryOrmEntity } from '../persistence/ticket-category.orm-entity';

export class EventMapper {
  static toDomain(orm: EventOrmEntity): Event {
    const categories = (orm.ticketCategories ?? []).map((c) =>
      EventMapper.categoryToDomain(c),
    );

    return Event.reconstitute(
      {
        id: orm.id,
        name: orm.name,
        description: orm.description ?? undefined,
        startDate: orm.startDate,
        endDate: orm.endDate,
        location: orm.location ?? undefined,
        maxCapacity: orm.maxCapacity,
      },
      new EventStatus(orm.status as EventStatusEnum),
      categories,
    );
  }

  static toOrm(event: Event): EventOrmEntity {
    const orm = new EventOrmEntity();
    orm.id = event.id;
    orm.name = event.name;
    orm.description = event.description ?? null;
    orm.startDate = event.startDate;
    orm.endDate = event.endDate;
    orm.location = event.location ?? null;
    orm.maxCapacity = event.maxCapacity;
    orm.status = event.status.value;
    orm.ticketCategories = event.ticketCategories.map((c) =>
      EventMapper.categoryToOrm(event.id, c),
    );
    return orm;
  }

  private static categoryToDomain(
    orm: TicketCategoryOrmEntity,
  ): TicketCategory {
    return new TicketCategory({
      id: orm.id,
      name: orm.name,
      price: new Money(Number(orm.priceAmount), orm.priceCurrency),
      quota: orm.quota,
      salesStartDate: orm.salesStartDate,
      salesEndDate: orm.salesEndDate,
      status: new TicketCategoryStatus(orm.status as TicketCategoryStatusEnum),
    });
  }

  private static categoryToOrm(
    eventId: string,
    category: TicketCategory,
  ): TicketCategoryOrmEntity {
    const orm = new TicketCategoryOrmEntity();
    orm.id = category.id;
    orm.eventId = eventId;
    orm.name = category.name;
    orm.priceAmount = category.price.amount.toFixed(2);
    orm.priceCurrency = category.price.currency;
    orm.quota = category.quota;
    orm.salesStartDate = category.salesStartDate;
    orm.salesEndDate = category.salesEndDate;
    orm.status = category.status.value;
    return orm;
  }
}
