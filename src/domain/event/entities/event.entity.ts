import { AggregateRoot } from '../../../common/domain/aggregate-root';
import { EventId } from '../value-objects/event-id.vo';
import { EventStatus, EventStatusEnum } from '../value-objects/event-status.vo';
import { TicketCategory } from './ticket-category.entity';
import { EventCreated } from '../events/event-created.event';
import { TicketCategoryCreated } from '../events/ticket-category-created.event';
import { EventPublished } from '../events/event-published.event';
import { EventCancelled } from '../events/event-cancelled.event';
import { TicketCategoryDisabled } from '../events/ticket-category-disabled.event';

export interface EventProps {
  id: EventId | string;
  name: string;
  description?: string;
  startDate: Date;
  endDate: Date;
  location?: string;
  maxCapacity: number;
}

export class Event extends AggregateRoot<string> {
  private _name: string;
  private _description?: string;
  private _startDate: Date;
  private _endDate: Date;
  private _location?: string;
  private _maxCapacity: number;
  private _status: EventStatus;
  private _ticketCategories: TicketCategory[] = [];

  private constructor(id: string, props: EventProps) {
    super(id);
    this._name = props.name;
    this._description = props.description;
    this._startDate = props.startDate;
    this._endDate = props.endDate;
    this._location = props.location;
    this._maxCapacity = props.maxCapacity;
    this._status = new EventStatus(EventStatusEnum.Draft);
  }

  public static create(props: EventProps): Event {
    const id = typeof props.id === 'string' ? props.id : props.id.value;
    if (props.endDate.getTime() < props.startDate.getTime())
      throw new Error('Event end date must be after start date');
    if (!Number.isInteger(props.maxCapacity) || props.maxCapacity <= 0)
      throw new Error('Event max capacity must be greater than zero');

    const event = new Event(id, props);
    event.addDomainEvent(new EventCreated({ eventId: id, name: props.name }));
    return event;
  }

  public static reconstitute(
    props: EventProps,
    status: EventStatus,
    categories: TicketCategory[],
  ): Event {
    const id = typeof props.id === 'string' ? props.id : props.id.value;
    const event = new Event(id, props);
    event._status = status;
    event._ticketCategories = categories;
    return event;
  }

  get name(): string {
    return this._name;
  }

  get description(): string | undefined {
    return this._description;
  }

  get location(): string | undefined {
    return this._location;
  }

  get startDate(): Date {
    return this._startDate;
  }

  get endDate(): Date {
    return this._endDate;
  }

  get maxCapacity(): number {
    return this._maxCapacity;
  }

  get status(): EventStatus {
    return this._status;
  }

  get ticketCategories(): TicketCategory[] {
    return [...this._ticketCategories];
  }

  public addTicketCategory(category: TicketCategory): void {
    // sales period must end before or at event start
    if (category.salesEndDate.getTime() > this._startDate.getTime()) {
      throw new Error('Ticket sales end must be before or at event start date');
    }

    const totalQuota =
      this._ticketCategories.reduce((s, c) => s + c.quota, 0) + category.quota;
    if (totalQuota > this._maxCapacity)
      throw new Error('Total ticket quota cannot exceed event max capacity');

    this._ticketCategories.push(category);
    this.addDomainEvent(
      new TicketCategoryCreated({
        eventId: this.id,
        categoryId: category.id,
      }),
    );
  }

  public publish(): void {
    if (!this._status.isDraft())
      throw new Error('Only draft events can be published');

    const hasActive = this._ticketCategories.some((c) => c.status.isActive());
    if (!hasActive)
      throw new Error(
        'Event must have at least one active ticket category to be published',
      );

    const totalQuota = this._ticketCategories.reduce((s, c) => s + c.quota, 0);
    if (totalQuota > this._maxCapacity)
      throw new Error('Total ticket quota cannot exceed event max capacity');

    this._status = new EventStatus(EventStatusEnum.Published);
    this.addDomainEvent(new EventPublished({ eventId: this.id }));
  }

  public cancel(reason?: string): void {
    if (this._status.isCancelled())
      throw new Error('Event is already cancelled');
    if (this._status.value === EventStatusEnum.Completed)
      throw new Error('Completed event cannot be cancelled');

    this._status = new EventStatus(EventStatusEnum.Cancelled);
    this.addDomainEvent(new EventCancelled({ eventId: this.id, reason }));
  }

  public disableTicketCategory(categoryId: string): void {
    const category = this._ticketCategories.find((c) => c.id === categoryId);
    if (!category) throw new Error('Ticket category not found');
    category.disable();
    this.addDomainEvent(
      new TicketCategoryDisabled({
        eventId: this.id,
        categoryId,
      }),
    );
  }
}
