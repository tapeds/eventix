import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  Param,
  Post,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CreateBookingHandler } from '../../application/booking/commands/create-booking/create-booking.handler';
import {
  CreateBookingCommand,
  CreateBookingResult,
} from '../../application/booking/commands/create-booking/create-booking.command';
import { ExpireBookingHandler } from '../../application/booking/commands/expire-booking/expire-booking.handler';
import { ExpireBookingCommand } from '../../application/booking/commands/expire-booking/expire-booking.command';
import { PayBookingHandler } from '../../application/booking/commands/pay-booking/pay-booking.handler';
import { PayBookingCommand } from '../../application/booking/commands/pay-booking/pay-booking.command';

export class CreateBookingBody {
  customerId?: string;
  eventId?: string;
  ticketCategoryId?: string;
  quantity?: number;
}

export class PayBookingBody {
  customerId?: string;
  amount?: number;
  currency?: string;
}

@ApiTags('Bookings')
@Controller('bookings')
export class BookingController {
  constructor(
    private readonly createBooking: CreateBookingHandler,
    private readonly payBooking: PayBookingHandler,
    private readonly expireBooking: ExpireBookingHandler,
  ) {}

  @Post()
  async create(@Body() body: CreateBookingBody): Promise<CreateBookingResult> {
    if (!body.customerId) {
      throw new BadRequestException('customerId is required');
    }
    if (!body.eventId) {
      throw new BadRequestException('eventId is required');
    }
    if (!body.ticketCategoryId) {
      throw new BadRequestException('ticketCategoryId is required');
    }
    if (typeof body.quantity !== 'number') {
      throw new BadRequestException('quantity must be a number');
    }
    return this.createBooking.execute(
      new CreateBookingCommand(
        body.customerId,
        body.eventId,
        body.ticketCategoryId,
        body.quantity,
      ),
    );
  }

  @Post(':id/pay')
  @HttpCode(204)
  async pay(
    @Param('id') id: string,
    @Body() body: PayBookingBody,
  ): Promise<void> {
    if (!body.customerId) {
      throw new BadRequestException('customerId is required');
    }
    if (typeof body.amount !== 'number') {
      throw new BadRequestException('amount must be a number');
    }
    if (!body.currency) {
      throw new BadRequestException('currency is required');
    }
    await this.payBooking.execute(
      new PayBookingCommand(id, body.customerId, body.amount, body.currency),
    );
  }

  @Post(':id/expire')
  @HttpCode(204)
  async expire(@Param('id') id: string): Promise<void> {
    await this.expireBooking.execute(new ExpireBookingCommand(id));
  }
}
