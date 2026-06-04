import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BookingOrmEntity } from '../booking/persistence/booking.orm-entity';
import { TicketOrmEntity } from '../booking/persistence/ticket.orm-entity';
import { TicketRepository } from '../booking/persistence/ticket.repository';
import { TicketReadModelTypeorm } from '../booking/read-models/ticket.read-model';
import { TICKET_READ_MODEL, TICKET_REPOSITORY } from './tokens';

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
        entities: [BookingOrmEntity, TicketOrmEntity],
        synchronize: false,
      }),
    }),
    TypeOrmModule.forFeature([BookingOrmEntity, TicketOrmEntity]),
  ],
  providers: [
    { provide: TICKET_REPOSITORY, useClass: TicketRepository },
    { provide: TICKET_READ_MODEL, useClass: TicketReadModelTypeorm },
  ],
  exports: [TICKET_REPOSITORY, TICKET_READ_MODEL, TypeOrmModule],
})
export class DatabaseModule {}
