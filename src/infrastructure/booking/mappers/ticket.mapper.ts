import { Ticket } from '../../../domain/booking/entities/ticket.entity';
import { TicketCode } from '../../../domain/booking/value-objects/ticket-code.vo';
import {
  TicketStatus,
  TicketStatusEnum,
} from '../../../domain/booking/value-objects/ticket-status.vo';
import { TicketOrmEntity } from '../persistence/ticket.orm-entity';

export class TicketMapper {
  static toDomain(orm: TicketOrmEntity): Ticket {
    return Ticket.reconstitute(orm.id, {
      ticketCode: new TicketCode(orm.ticketCode),
      bookingId: orm.bookingId,
      eventId: orm.eventId,
      status: new TicketStatus(orm.status as TicketStatusEnum),
      issuedAt: orm.issuedAt,
      checkedInAt: orm.checkedInAt,
    });
  }

  static toOrm(ticket: Ticket): TicketOrmEntity {
    const orm = new TicketOrmEntity();
    orm.id = ticket.ticketId.value;
    orm.ticketCode = ticket.ticketCode.value;
    orm.bookingId = ticket.bookingId;
    orm.eventId = ticket.eventId;
    orm.status = ticket.status.value;
    orm.issuedAt = ticket.issuedAt;
    orm.checkedInAt = ticket.checkedInAt;
    return orm;
  }
}
