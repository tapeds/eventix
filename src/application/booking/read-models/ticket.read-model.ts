import { TicketDto } from '../dtos/ticket.dto';

export interface ITicketReadModel {
  findPaidCustomerTickets(customerId: string): Promise<TicketDto[]>;
}
