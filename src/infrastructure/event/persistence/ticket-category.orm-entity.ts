import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import { EventOrmEntity } from './event.orm-entity';

@Entity('ticket_categories')
export class TicketCategoryOrmEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Index()
  @Column({ name: 'event_id', type: 'uuid' })
  eventId!: string;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ name: 'price_amount', type: 'numeric', precision: 12, scale: 2 })
  priceAmount!: string;

  @Column({ name: 'price_currency', type: 'varchar', length: 3 })
  priceCurrency!: string;

  @Column('int')
  quota!: number;

  @Column({ name: 'sales_start_date', type: 'timestamptz' })
  salesStartDate!: Date;

  @Column({ name: 'sales_end_date', type: 'timestamptz' })
  salesEndDate!: Date;

  @Column({ type: 'varchar', length: 32 })
  status!: string;

  @ManyToOne(() => EventOrmEntity, (event) => event.ticketCategories, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'event_id' })
  event?: EventOrmEntity;
}
