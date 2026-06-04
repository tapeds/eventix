import 'dotenv/config';
import { DataSource } from 'typeorm';
import { BookingOrmEntity } from '../booking/persistence/booking.orm-entity';
import { TicketOrmEntity } from '../booking/persistence/ticket.orm-entity';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DATABASE_HOST ?? 'localhost',
  port: Number(process.env.DATABASE_PORT ?? 5432),
  username: process.env.DATABASE_USER ?? 'eventix',
  password: process.env.DATABASE_PASSWORD ?? 'eventix',
  database: process.env.DATABASE_NAME ?? 'eventix',
  entities: [BookingOrmEntity, TicketOrmEntity],
  migrations: ['src/infrastructure/database/migrations/*.ts'],
  synchronize: false,
  logging: ['error', 'warn'],
});
