import { Event } from '../../event/entities/event.entity';

export interface EventRepository {
  save(event: Event): Promise<void>;
  findById(id: string): Promise<Event | null>;
  findPublished(): Promise<Event[]>;
}
