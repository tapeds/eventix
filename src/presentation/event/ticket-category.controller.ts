import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  Param,
  Post,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CreateTicketCategoryHandler } from '../../application/event/commands/create-ticket-category/create-ticket-category.handler';
import { CreateTicketCategoryCommand } from '../../application/event/commands/create-ticket-category/create-ticket-category.command';
import { DisableTicketCategoryHandler } from '../../application/event/commands/disable-ticket-category/disable-ticket-category.handler';
import { DisableTicketCategoryCommand } from '../../application/event/commands/disable-ticket-category/disable-ticket-category.command';

export class CreateTicketCategoryBody {
  name?: string;
  price?: number;
  quota?: number;
  salesStartDate?: string;
  salesEndDate?: string;
  currency?: string;
}

@ApiTags('Ticket Categories')
@Controller('events/:eventId/ticket-categories')
export class TicketCategoryController {
  constructor(
    private readonly createCategory: CreateTicketCategoryHandler,
    private readonly disableCategory: DisableTicketCategoryHandler,
  ) {}

  @Post()
  async create(
    @Param('eventId') eventId: string,
    @Body() body: CreateTicketCategoryBody,
  ): Promise<{ categoryId: string }> {
    if (
      !body.name ||
      typeof body.price !== 'number' ||
      typeof body.quota !== 'number' ||
      !body.salesStartDate ||
      !body.salesEndDate
    ) {
      throw new BadRequestException(
        'name, price, quota, salesStartDate and salesEndDate are required',
      );
    }
    return this.createCategory.execute(
      new CreateTicketCategoryCommand(
        eventId,
        body.name,
        body.price,
        body.quota,
        new Date(body.salesStartDate),
        new Date(body.salesEndDate),
        body.currency,
      ),
    );
  }

  @Post(':categoryId/disable')
  @HttpCode(204)
  async disable(
    @Param('eventId') eventId: string,
    @Param('categoryId') categoryId: string,
  ): Promise<void> {
    await this.disableCategory.execute(
      new DisableTicketCategoryCommand(eventId, categoryId),
    );
  }
}
