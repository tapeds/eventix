import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../infrastructure/database/database.module';
import {
  BOOKING_REPOSITORY,
  DOMAIN_EVENT_PUBLISHER,
  EVENT_REPOSITORY,
  PAYMENT_GATEWAY,
  TICKET_READ_MODEL,
  TICKET_REPOSITORY,
} from '../../infrastructure/database/tokens';
import { InMemoryDomainEventPublisher } from '../../infrastructure/events/in-memory-domain-event-publisher';
import { MockPaymentGateway } from '../../infrastructure/booking/services/payment-gateway.service';
import { IDomainEventPublisher } from '../../common/application/domain-event-publisher.interface';
import { IBookingRepository } from '../../domain/booking/repositories/booking.repository.interface';
import { ITicketRepository } from '../../domain/booking/repositories/ticket.repository.interface';
import { IPaymentGateway } from '../../application/booking/services/payment-gateway.interface';
import { ITicketReadModel } from '../../application/booking/read-models/ticket.read-model';
import { EventRepository } from '../../domain/event/repositories/event.repository.interface';
import { CreateBookingHandler } from '../../application/booking/commands/create-booking/create-booking.handler';
import { ExpireBookingHandler } from '../../application/booking/commands/expire-booking/expire-booking.handler';
import { PayBookingHandler } from '../../application/booking/commands/pay-booking/pay-booking.handler';
import { CheckInTicketHandler } from '../../application/booking/commands/check-in-ticket/check-in-ticket.handler';
import { GetCustomerTicketsHandler } from '../../application/booking/queries/get-customer-tickets/get-customer-tickets.handler';
import { BookingController } from './booking.controller';
import { TicketController } from './ticket.controller';

@Module({
  imports: [DatabaseModule],
  controllers: [BookingController, TicketController],
  providers: [
    {
      provide: DOMAIN_EVENT_PUBLISHER,
      useClass: InMemoryDomainEventPublisher,
    },
    {
      provide: PAYMENT_GATEWAY,
      useClass: MockPaymentGateway,
    },
    {
      provide: CreateBookingHandler,
      useFactory: (
        bookingRepo: IBookingRepository,
        eventRepo: EventRepository,
        publisher: IDomainEventPublisher,
      ) => new CreateBookingHandler(bookingRepo, eventRepo, publisher),
      inject: [BOOKING_REPOSITORY, EVENT_REPOSITORY, DOMAIN_EVENT_PUBLISHER],
    },
    {
      provide: ExpireBookingHandler,
      useFactory: (
        bookingRepo: IBookingRepository,
        publisher: IDomainEventPublisher,
      ) => new ExpireBookingHandler(bookingRepo, publisher),
      inject: [BOOKING_REPOSITORY, DOMAIN_EVENT_PUBLISHER],
    },
    {
      provide: PayBookingHandler,
      useFactory: (
        bookingRepo: IBookingRepository,
        ticketRepo: ITicketRepository,
        paymentGateway: IPaymentGateway,
        publisher: IDomainEventPublisher,
      ) =>
        new PayBookingHandler(
          bookingRepo,
          ticketRepo,
          paymentGateway,
          publisher,
        ),
      inject: [
        BOOKING_REPOSITORY,
        TICKET_REPOSITORY,
        PAYMENT_GATEWAY,
        DOMAIN_EVENT_PUBLISHER,
      ],
    },
    {
      provide: GetCustomerTicketsHandler,
      useFactory: (readModel: ITicketReadModel) =>
        new GetCustomerTicketsHandler(readModel),
      inject: [TICKET_READ_MODEL],
    },
    {
      provide: CheckInTicketHandler,
      useFactory: (
        ticketRepo: ITicketRepository,
        eventRepo: EventRepository,
        publisher: IDomainEventPublisher,
      ) => new CheckInTicketHandler(ticketRepo, eventRepo, publisher),
      inject: [TICKET_REPOSITORY, EVENT_REPOSITORY, DOMAIN_EVENT_PUBLISHER],
    },
  ],
})
export class BookingModule {}
