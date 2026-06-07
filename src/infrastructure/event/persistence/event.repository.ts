import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Event } from '../../../domain/event/entities/event.entity';
import { EventRepository as IEventRepository } from '../../../domain/event/repositories/event.repository.interface';
import { EventStatusEnum } from '../../../domain/event/value-objects/event-status.vo';
import { EventMapper } from '../mappers/event.mapper';
import { EventOrmEntity } from './event.orm-entity';
import { TicketCategoryOrmEntity } from './ticket-category.orm-entity';

@Injectable()
export class EventRepository implements IEventRepository {
  constructor(
    @InjectRepository(EventOrmEntity)
    private readonly repo: Repository<EventOrmEntity>,
    @InjectRepository(TicketCategoryOrmEntity)
    private readonly categoryRepo: Repository<TicketCategoryOrmEntity>,
  ) {}

  async save(event: Event): Promise<void> {
    const orm = EventMapper.toOrm(event);
    // Replace the category set; cascade re-inserts the current ones.
    await this.categoryRepo.delete({ eventId: event.id });
    await this.repo.save(orm);
  }

  async findById(id: string): Promise<Event | null> {
    const orm = await this.repo.findOne({
      where: { id },
      relations: { ticketCategories: true },
    });
    return orm ? EventMapper.toDomain(orm) : null;
  }

  async findPublished(): Promise<Event[]> {
    const rows = await this.repo.find({
      where: { status: EventStatusEnum.Published },
      relations: { ticketCategories: true },
    });
    return rows.map((r) => EventMapper.toDomain(r));
  }
}
