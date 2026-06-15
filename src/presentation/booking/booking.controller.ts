import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  Param,
  Post,
} from '@nestjs/common';
import { ExpireBookingHandler } from '../../application/booking/commands/expire-booking/expire-booking.handler';
import { ExpireBookingCommand } from '../../application/booking/commands/expire-booking/expire-booking.command';
import { PayBookingHandler } from '../../application/booking/commands/pay-booking/pay-booking.handler';
import { PayBookingCommand } from '../../application/booking/commands/pay-booking/pay-booking.command';

interface PayBookingBody {
  customerId?: string;
  amount?: number;
  currency?: string;
}

@Controller('bookings')
export class BookingController {
  constructor(
    private readonly payBooking: PayBookingHandler,
    private readonly expireBooking: ExpireBookingHandler,
  ) {}

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
