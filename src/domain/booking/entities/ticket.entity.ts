import { AggregateRoot } from '../../../common/domain/aggregate-root';
import { TicketId } from '../value-objects/ticket-id.vo';
import { TicketCode } from '../value-objects/ticket-code.vo';
import {
  TicketStatus,
  TicketStatusEnum,
} from '../value-objects/ticket-status.vo';
import { TicketCheckedInEvent } from '../events/ticket-checked-in.event';

export interface TicketProps {
  ticketCode: TicketCode;
  bookingId: string;
  eventId: string;
  status: TicketStatus;
  issuedAt: Date;
  checkedInAt: Date | null;
}

export class Ticket extends AggregateRoot<TicketId> {
  private _ticketCode: TicketCode;
  private _bookingId: string;
  private _eventId: string;
  private _status: TicketStatus;
  private _issuedAt: Date;
  private _checkedInAt: Date | null;

  private constructor(id: TicketId, props: TicketProps) {
    super(id);
    this._ticketCode = props.ticketCode;
    this._bookingId = props.bookingId;
    this._eventId = props.eventId;
    this._status = props.status;
    this._issuedAt = props.issuedAt;
    this._checkedInAt = props.checkedInAt;
  }

  get ticketId(): TicketId {
    return this._id;
  }

  get ticketCode(): TicketCode {
    return this._ticketCode;
  }

  get bookingId(): string {
    return this._bookingId;
  }

  get eventId(): string {
    return this._eventId;
  }

  get status(): TicketStatus {
    return this._status;
  }

  get issuedAt(): Date {
    return this._issuedAt;
  }

  get checkedInAt(): Date | null {
    return this._checkedInAt;
  }

  static issue(bookingId: string, eventId: string): Ticket {
    return new Ticket(TicketId.generate(), {
      ticketCode: TicketCode.generate(),
      bookingId,
      eventId,
      status: TicketStatus.active(),
      issuedAt: new Date(),
      checkedInAt: null,
    });
  }

  static reconstitute(id: string, props: TicketProps): Ticket {
    return new Ticket(new TicketId(id), props);
  }

  checkIn(eventId: string, now: Date = new Date()): void {
    if (this._eventId !== eventId) {
      throw new Error('Ticket does not match the event');
    }
    if (this._status.isCheckedIn()) {
      throw new Error('Ticket has already been used');
    }
    if (!this._status.isActive()) {
      throw new Error('Only an active ticket can be checked in');
    }

    this._status = TicketStatus.checkedIn();
    this._checkedInAt = now;

    this.addDomainEvent(
      new TicketCheckedInEvent(
        this._id.value,
        this._ticketCode.value,
        this._eventId,
        now,
      ),
    );
  }

  cancel(): void {
    if (this._status.isCheckedIn()) {
      throw new Error('A checked-in ticket cannot be cancelled');
    }
    this._status = TicketStatus.cancelled();
  }

  markRefundRequired(): void {
    if (this._status.value === TicketStatusEnum.CANCELLED) {
      throw new Error('A cancelled ticket cannot require a refund');
    }
    this._status = TicketStatus.refundRequired();
  }
}
