import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BookingOrmEntity } from '../booking/persistence/booking.orm-entity';
import { BookingRepository } from '../booking/persistence/booking.repository';
import { TicketOrmEntity } from '../booking/persistence/ticket.orm-entity';
import { TicketRepository } from '../booking/persistence/ticket.repository';
import { TicketReadModelTypeorm } from '../booking/read-models/ticket.read-model';
import { EventOrmEntity } from '../event/persistence/event.orm-entity';
import { EventRepository } from '../event/persistence/event.repository';
import { TicketCategoryOrmEntity } from '../event/persistence/ticket-category.orm-entity';
import { UserOrmEntity } from '../user/persistence/user.orm-entity';
import { UserRepository } from '../user/persistence/user.repository';
import {
  BOOKING_REPOSITORY,
  EVENT_REPOSITORY,
  TICKET_READ_MODEL,
  TICKET_REPOSITORY,
  USER_REPOSITORY,
} from './tokens';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        type: 'postgres',
        host: cfg.get<string>('DATABASE_HOST'),
        port: cfg.get<number>('DATABASE_PORT'),
        username: cfg.get<string>('DATABASE_USER'),
        password: cfg.get<string>('DATABASE_PASSWORD'),
        database: cfg.get<string>('DATABASE_NAME'),
        entities: [
          BookingOrmEntity,
          TicketOrmEntity,
          EventOrmEntity,
          TicketCategoryOrmEntity,
          UserOrmEntity,
        ],
        synchronize: false,
      }),
    }),
    TypeOrmModule.forFeature([
      BookingOrmEntity,
      TicketOrmEntity,
      EventOrmEntity,
      TicketCategoryOrmEntity,
      UserOrmEntity,
    ]),
  ],
  providers: [
    { provide: BOOKING_REPOSITORY, useClass: BookingRepository },
    { provide: TICKET_REPOSITORY, useClass: TicketRepository },
    { provide: TICKET_READ_MODEL, useClass: TicketReadModelTypeorm },
    { provide: EVENT_REPOSITORY, useClass: EventRepository },
    { provide: USER_REPOSITORY, useClass: UserRepository },
  ],
  exports: [
    BOOKING_REPOSITORY,
    TICKET_REPOSITORY,
    TICKET_READ_MODEL,
    EVENT_REPOSITORY,
    USER_REPOSITORY,
    TypeOrmModule,
  ],
})
export class DatabaseModule {}
