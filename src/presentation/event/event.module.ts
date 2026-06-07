import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../infrastructure/database/database.module';
import {
  BOOKING_REPOSITORY,
  DOMAIN_EVENT_PUBLISHER,
  EVENT_REPOSITORY,
  TICKET_REPOSITORY,
  USER_REPOSITORY,
} from '../../infrastructure/database/tokens';
import { InMemoryDomainEventPublisher } from '../../infrastructure/events/in-memory-domain-event-publisher';
import { IDomainEventPublisher } from '../../common/application/domain-event-publisher.interface';
import { EventRepository } from '../../domain/event/repositories/event.repository.interface';
import { IBookingRepository } from '../../domain/booking/repositories/booking.repository.interface';
import { ITicketRepository } from '../../domain/booking/repositories/ticket.repository.interface';
import { IUserRepository } from '../../domain/user/repositories/user.repository.interface';
import { CreateEventHandler } from '../../application/event/commands/create-event/create-event.handler';
import { PublishEventHandler } from '../../application/event/commands/publish-event/publish-event.handler';
import { CancelEventHandler } from '../../application/event/commands/cancel-event/cancel-event.handler';
import { CreateTicketCategoryHandler } from '../../application/event/commands/create-ticket-category/create-ticket-category.handler';
import { DisableTicketCategoryHandler } from '../../application/event/commands/disable-ticket-category/disable-ticket-category.handler';
import { GetAvailableEventsHandler } from '../../application/event/queries/get-available-events/get-available-events.handler';
import { GetEventDetailsHandler } from '../../application/event/queries/get-event-details/get-event-details.handler';
import { GetParticipantsHandler } from '../../application/event/queries/get-participants/get-participants.handler';
import { GetSalesReportHandler } from '../../application/event/queries/get-sales-report/get-sales-report.handler';
import { EventController } from './event.controller';
import { TicketCategoryController } from './ticket-category.controller';

@Module({
  imports: [DatabaseModule],
  controllers: [EventController, TicketCategoryController],
  providers: [
    {
      provide: DOMAIN_EVENT_PUBLISHER,
      useClass: InMemoryDomainEventPublisher,
    },
    {
      provide: CreateEventHandler,
      useFactory: (repo: EventRepository, publisher: IDomainEventPublisher) =>
        new CreateEventHandler(repo, publisher),
      inject: [EVENT_REPOSITORY, DOMAIN_EVENT_PUBLISHER],
    },
    {
      provide: PublishEventHandler,
      useFactory: (repo: EventRepository, publisher: IDomainEventPublisher) =>
        new PublishEventHandler(repo, publisher),
      inject: [EVENT_REPOSITORY, DOMAIN_EVENT_PUBLISHER],
    },
    {
      provide: CancelEventHandler,
      useFactory: (repo: EventRepository, publisher: IDomainEventPublisher) =>
        new CancelEventHandler(repo, publisher),
      inject: [EVENT_REPOSITORY, DOMAIN_EVENT_PUBLISHER],
    },
    {
      provide: CreateTicketCategoryHandler,
      useFactory: (repo: EventRepository, publisher: IDomainEventPublisher) =>
        new CreateTicketCategoryHandler(repo, publisher),
      inject: [EVENT_REPOSITORY, DOMAIN_EVENT_PUBLISHER],
    },
    {
      provide: DisableTicketCategoryHandler,
      useFactory: (repo: EventRepository, publisher: IDomainEventPublisher) =>
        new DisableTicketCategoryHandler(repo, publisher),
      inject: [EVENT_REPOSITORY, DOMAIN_EVENT_PUBLISHER],
    },
    {
      provide: GetAvailableEventsHandler,
      useFactory: (repo: EventRepository) =>
        new GetAvailableEventsHandler(repo),
      inject: [EVENT_REPOSITORY],
    },
    {
      provide: GetEventDetailsHandler,
      useFactory: (repo: EventRepository) => new GetEventDetailsHandler(repo),
      inject: [EVENT_REPOSITORY],
    },
    {
      provide: GetParticipantsHandler,
      useFactory: (
        eventRepo: EventRepository,
        bookingRepo: IBookingRepository,
        ticketRepo: ITicketRepository,
        userRepo: IUserRepository,
      ) =>
        new GetParticipantsHandler(
          eventRepo,
          bookingRepo,
          ticketRepo,
          userRepo,
        ),
      inject: [
        EVENT_REPOSITORY,
        BOOKING_REPOSITORY,
        TICKET_REPOSITORY,
        USER_REPOSITORY,
      ],
    },
    {
      provide: GetSalesReportHandler,
      useFactory: (
        eventRepo: EventRepository,
        bookingRepo: IBookingRepository,
        ticketRepo: ITicketRepository,
      ) => new GetSalesReportHandler(eventRepo, bookingRepo, ticketRepo),
      inject: [EVENT_REPOSITORY, BOOKING_REPOSITORY, TICKET_REPOSITORY],
    },
  ],
})
export class EventModule {}
