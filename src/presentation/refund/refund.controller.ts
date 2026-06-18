import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  Param,
  Post,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RequestRefundHandler } from '../../application/refund/commands/request-refund/request-refund.handler';
import { RequestRefundCommand } from '../../application/refund/commands/request-refund/request-refund.command';
import { RejectRefundHandler } from '../../application/refund/commands/reject-refund/reject-refund.handler';
import { RejectRefundCommand } from '../../application/refund/commands/reject-refund/reject-refund.command';
import { ApproveRefundHandler } from '../../application/refund/commands/approve-refund/approve-refund.handler';
import { ApproveRefundCommand } from '../../application/refund/commands/approve-refund/approve-refund.command';
import { MarkRefundPaidOutHandler } from '../../application/refund/commands/mark-refund-paid-out/mark-refund-paid-out.handler';
import { MarkRefundPaidOutCommand } from '../../application/refund/commands/mark-refund-paid-out/mark-refund-paid-out.command';

export class RequestRefundBody {
  bookingId?: string;
  customerId?: string;
}

export class RejectRefundBody {
  reason?: string;
}

@ApiTags('Refunds')
@Controller('refunds')
export class RefundController {
  constructor(
    private readonly requestRefund: RequestRefundHandler,
    private readonly rejectRefund: RejectRefundHandler,
    private readonly approveRefund: ApproveRefundHandler,
    private readonly markRefundPaidOut: MarkRefundPaidOutHandler,
  ) {}

  @Post()
  @HttpCode(204)
  async request(@Body() body: RequestRefundBody): Promise<void> {
    if (!body.bookingId) {
      throw new BadRequestException('bookingId is required');
    }
    if (!body.customerId) {
      throw new BadRequestException('customerId is required');
    }
    await this.requestRefund.execute(
      new RequestRefundCommand(body.bookingId, body.customerId),
    );
  }

  @Post(':id/reject')
  @HttpCode(204)
  async reject(
    @Param('id') id: string,
    @Body() body: RejectRefundBody,
  ): Promise<void> {
    if (!body.reason) {
      throw new BadRequestException('reason is required');
    }
    await this.rejectRefund.execute(new RejectRefundCommand(id, body.reason));
  }

  @Post(':id/approve')
  @HttpCode(204)
  async approve(@Param('id') id: string): Promise<void> {
    await this.approveRefund.execute(new ApproveRefundCommand(id));
  }

  @Post(':id/pay-out')
  @HttpCode(204)
  async payOut(@Param('id') id: string): Promise<void> {
    await this.markRefundPaidOut.execute(new MarkRefundPaidOutCommand(id));
  }
}
