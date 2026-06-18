import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { GetCustomerTicketsHandler } from '../../application/booking/queries/get-customer-tickets/get-customer-tickets.handler';
import { GetCustomerTicketsQuery } from '../../application/booking/queries/get-customer-tickets/get-customer-tickets.query';
import { CheckInTicketHandler } from '../../application/booking/commands/check-in-ticket/check-in-ticket.handler';
import {
  CheckInTicketCommand,
  CheckInTicketResult,
} from '../../application/booking/commands/check-in-ticket/check-in-ticket.command';
import { TicketDto } from '../../application/booking/dtos/ticket.dto';

export class CheckInTicketBody {
  ticketCode?: string;
  eventId?: string;
}

@ApiTags('Tickets')
@Controller('tickets')
export class TicketController {
  constructor(
    private readonly getCustomerTickets: GetCustomerTicketsHandler,
    private readonly checkInTicket: CheckInTicketHandler,
  ) {}

  @Get()
  async list(@Query('customerId') customerId?: string): Promise<TicketDto[]> {
    if (!customerId) {
      throw new BadRequestException('customerId is required');
    }
    return this.getCustomerTickets.execute(
      new GetCustomerTicketsQuery(customerId),
    );
  }

  @Post('check-in')
  async checkIn(@Body() body: CheckInTicketBody): Promise<CheckInTicketResult> {
    if (!body.ticketCode) {
      throw new BadRequestException('ticketCode is required');
    }
    if (!body.eventId) {
      throw new BadRequestException('eventId is required');
    }
    return this.checkInTicket.execute(
      new CheckInTicketCommand(body.ticketCode, body.eventId),
    );
  }
}
