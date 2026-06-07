import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { CreateEventHandler } from '../../application/event/commands/create-event/create-event.handler';
import { CreateEventCommand } from '../../application/event/commands/create-event/create-event.command';
import { PublishEventHandler } from '../../application/event/commands/publish-event/publish-event.handler';
import { PublishEventCommand } from '../../application/event/commands/publish-event/publish-event.command';
import { CancelEventHandler } from '../../application/event/commands/cancel-event/cancel-event.handler';
import { CancelEventCommand } from '../../application/event/commands/cancel-event/cancel-event.command';
import { GetAvailableEventsHandler } from '../../application/event/queries/get-available-events/get-available-events.handler';
import { GetAvailableEventsQuery } from '../../application/event/queries/get-available-events/get-available-events.query';
import { GetEventDetailsHandler } from '../../application/event/queries/get-event-details/get-event-details.handler';
import { GetEventDetailsQuery } from '../../application/event/queries/get-event-details/get-event-details.query';
import { GetParticipantsHandler } from '../../application/event/queries/get-participants/get-participants.handler';
import { GetParticipantsQuery } from '../../application/event/queries/get-participants/get-participants.query';
import { GetSalesReportHandler } from '../../application/event/queries/get-sales-report/get-sales-report.handler';
import { GetSalesReportQuery } from '../../application/event/queries/get-sales-report/get-sales-report.query';
import {
  EventDetailsDto,
  EventSummaryDto,
  ParticipantListDto,
  SalesReportDto,
} from '../../application/event/dtos/event.dto';

interface CreateEventBody {
  name?: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  location?: string;
  maxCapacity?: number;
}

interface CancelEventBody {
  reason?: string;
}

@Controller('events')
export class EventController {
  constructor(
    private readonly createEvent: CreateEventHandler,
    private readonly publishEvent: PublishEventHandler,
    private readonly cancelEvent: CancelEventHandler,
    private readonly getAvailableEvents: GetAvailableEventsHandler,
    private readonly getEventDetails: GetEventDetailsHandler,
    private readonly getParticipants: GetParticipantsHandler,
    private readonly getSalesReport: GetSalesReportHandler,
  ) {}

  @Post()
  async create(@Body() body: CreateEventBody): Promise<{ eventId: string }> {
    if (!body.name || !body.startDate || !body.endDate) {
      throw new BadRequestException('name, startDate and endDate are required');
    }
    if (typeof body.maxCapacity !== 'number') {
      throw new BadRequestException('maxCapacity must be a number');
    }
    return this.createEvent.execute(
      new CreateEventCommand(
        body.name,
        new Date(body.startDate),
        new Date(body.endDate),
        body.maxCapacity,
        body.description,
        body.location,
      ),
    );
  }

  @Post(':id/publish')
  @HttpCode(204)
  async publish(@Param('id') id: string): Promise<void> {
    await this.publishEvent.execute(new PublishEventCommand(id));
  }

  @Post(':id/cancel')
  @HttpCode(204)
  async cancel(
    @Param('id') id: string,
    @Body() body: CancelEventBody,
  ): Promise<void> {
    await this.cancelEvent.execute(new CancelEventCommand(id, body.reason));
  }

  @Get()
  async list(
    @Query('date') date?: string,
    @Query('location') location?: string,
  ): Promise<EventSummaryDto[]> {
    return this.getAvailableEvents.execute(
      new GetAvailableEventsQuery({
        date: date ? new Date(date) : undefined,
        location,
      }),
    );
  }

  @Get(':id')
  async details(@Param('id') id: string): Promise<EventDetailsDto> {
    return this.getEventDetails.execute(new GetEventDetailsQuery(id));
  }

  @Get(':id/participants')
  async participants(@Param('id') id: string): Promise<ParticipantListDto> {
    return this.getParticipants.execute(new GetParticipantsQuery(id));
  }

  @Get(':id/sales-report')
  async salesReport(@Param('id') id: string): Promise<SalesReportDto> {
    return this.getSalesReport.execute(new GetSalesReportQuery(id));
  }
}
