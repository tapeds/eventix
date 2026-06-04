import { TicketStatusEnum } from '../../../domain/booking/value-objects/ticket-status.vo';

export interface TicketDto {
  ticketId: string;
  ticketCode: string;
  bookingId: string;
  eventId: string;
  status: TicketStatusEnum;
  issuedAt: Date;
  checkedInAt: Date | null;
}
