import { Ticket } from '../entities/ticket.entity';
import { TicketId } from '../value-objects/ticket-id.vo';
import { TicketCode } from '../value-objects/ticket-code.vo';
import { BookingId } from '../value-objects/booking-id.vo';

export interface ITicketRepository {
  save(ticket: Ticket): Promise<void>;

  saveMany(tickets: Ticket[]): Promise<void>;

  findById(id: TicketId): Promise<Ticket | null>;

  findByCode(code: TicketCode): Promise<Ticket | null>;

  findByBookingId(bookingId: BookingId): Promise<Ticket[]>;

  findByCustomerId(customerId: string): Promise<Ticket[]>;
}
