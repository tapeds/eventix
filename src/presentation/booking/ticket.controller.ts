import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import { GetCustomerTicketsHandler } from '../../application/booking/queries/get-customer-tickets/get-customer-tickets.handler';
import { GetCustomerTicketsQuery } from '../../application/booking/queries/get-customer-tickets/get-customer-tickets.query';
import { TicketDto } from '../../application/booking/dtos/ticket.dto';

@Controller('tickets')
export class TicketController {
  constructor(private readonly getCustomerTickets: GetCustomerTicketsHandler) {}

  @Get()
  async list(@Query('customerId') customerId?: string): Promise<TicketDto[]> {
    if (!customerId) {
      throw new BadRequestException('customerId is required');
    }
    return this.getCustomerTickets.execute(
      new GetCustomerTicketsQuery(customerId),
    );
  }
}
