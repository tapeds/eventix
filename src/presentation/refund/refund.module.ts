import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../infrastructure/database/database.module';
import {
  BOOKING_REPOSITORY,
  DOMAIN_EVENT_PUBLISHER,
  EVENT_REPOSITORY,
  REFUND_REPOSITORY,
  TICKET_REPOSITORY,
} from '../../infrastructure/database/tokens';
import { InMemoryDomainEventPublisher } from '../../infrastructure/events/in-memory-domain-event-publisher';
import { IDomainEventPublisher } from '../../common/application/domain-event-publisher.interface';
import { IBookingRepository } from '../../domain/booking/repositories/booking.repository.interface';
import { ITicketRepository } from '../../domain/booking/repositories/ticket.repository.interface';
import { EventRepository } from '../../domain/event/repositories/event.repository.interface';
import { IRefundRepository } from '../../domain/refund/repositories/refund.repository.interface';
import { RequestRefundHandler } from '../../application/refund/commands/request-refund/request-refund.handler';
import { RejectRefundHandler } from '../../application/refund/commands/reject-refund/reject-refund.handler';
import { ApproveRefundHandler } from '../../application/refund/commands/approve-refund/approve-refund.handler';
import { RefundController } from './refund.controller';

@Module({
  imports: [DatabaseModule],
  controllers: [RefundController],
  providers: [
    {
      provide: DOMAIN_EVENT_PUBLISHER,
      useClass: InMemoryDomainEventPublisher,
    },
    {
      provide: RequestRefundHandler,
      useFactory: (
        bookingRepo: IBookingRepository,
        ticketRepo: ITicketRepository,
        eventRepo: EventRepository,
        refundRepo: IRefundRepository,
        publisher: IDomainEventPublisher,
      ) =>
        new RequestRefundHandler(
          bookingRepo,
          ticketRepo,
          eventRepo,
          refundRepo,
          publisher,
        ),
      inject: [
        BOOKING_REPOSITORY,
        TICKET_REPOSITORY,
        EVENT_REPOSITORY,
        REFUND_REPOSITORY,
        DOMAIN_EVENT_PUBLISHER,
      ],
    },
    {
      provide: RejectRefundHandler,
      useFactory: (
        refundRepo: IRefundRepository,
        publisher: IDomainEventPublisher,
      ) => new RejectRefundHandler(refundRepo, publisher),
      inject: [REFUND_REPOSITORY, DOMAIN_EVENT_PUBLISHER],
    },
    {
      provide: ApproveRefundHandler,
      useFactory: (
        refundRepo: IRefundRepository,
        bookingRepo: IBookingRepository,
        ticketRepo: ITicketRepository,
        publisher: IDomainEventPublisher,
      ) =>
        new ApproveRefundHandler(
          refundRepo,
          bookingRepo,
          ticketRepo,
          publisher,
        ),
      inject: [
        REFUND_REPOSITORY,
        BOOKING_REPOSITORY,
        TICKET_REPOSITORY,
        DOMAIN_EVENT_PUBLISHER,
      ],
    },
  ],
})
export class RefundModule {}
