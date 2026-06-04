import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { TicketDto } from '../../../application/booking/dtos/ticket.dto';
import { ITicketReadModel } from '../../../application/booking/read-models/ticket.read-model';
import { TicketStatusEnum } from '../../../domain/booking/value-objects/ticket-status.vo';

interface RawTicketRow {
  ticketId: string;
  ticketCode: string;
  bookingId: string;
  eventId: string;
  status: string;
  issuedAt: Date;
  checkedInAt: Date | null;
}

@Injectable()
export class TicketReadModelTypeorm implements ITicketReadModel {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async findPaidCustomerTickets(customerId: string): Promise<TicketDto[]> {
    const rows = await this.dataSource
      .createQueryBuilder()
      .select([
        't.id AS "ticketId"',
        't.ticket_code AS "ticketCode"',
        't.booking_id AS "bookingId"',
        't.event_id AS "eventId"',
        't.status AS "status"',
        't.issued_at AS "issuedAt"',
        't.checked_in_at AS "checkedInAt"',
      ])
      .from('tickets', 't')
      .innerJoin('bookings', 'b', 'b.id = t.booking_id')
      .where('b.customer_id = :customerId', { customerId })
      .andWhere('b.status = :paid', { paid: 'PAID' })
      .orderBy('t.issued_at', 'DESC')
      .getRawMany<RawTicketRow>();

    return rows.map((r) => ({
      ticketId: r.ticketId,
      ticketCode: r.ticketCode,
      bookingId: r.bookingId,
      eventId: r.eventId,
      status: r.status as TicketStatusEnum,
      issuedAt: r.issuedAt,
      checkedInAt: r.checkedInAt,
    }));
  }
}
