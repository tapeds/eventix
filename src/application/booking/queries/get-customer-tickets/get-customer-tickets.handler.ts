import { IQueryHandler } from '../../../../common/application/query-handler.interface';
import { ITicketReadModel } from '../../read-models/ticket.read-model';
import { TicketDto } from '../../dtos/ticket.dto';
import { GetCustomerTicketsQuery } from './get-customer-tickets.query';

export class GetCustomerTicketsHandler implements IQueryHandler<
  GetCustomerTicketsQuery,
  TicketDto[]
> {
  constructor(private readonly ticketReadModel: ITicketReadModel) {}

  async execute(query: GetCustomerTicketsQuery): Promise<TicketDto[]> {
    return this.ticketReadModel.findPaidCustomerTickets(query.customerId);
  }
}
