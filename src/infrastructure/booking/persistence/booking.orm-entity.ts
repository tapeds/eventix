import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

@Entity('bookings')
export class BookingOrmEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Index()
  @Column({ name: 'customer_id', type: 'uuid' })
  customerId!: string;

  @Column({ name: 'event_id', type: 'uuid' })
  eventId!: string;

  @Column({ name: 'ticket_category_id', type: 'uuid' })
  ticketCategoryId!: string;

  @Column('int')
  quantity!: number;

  @Column({
    name: 'unit_price_amount',
    type: 'numeric',
    precision: 12,
    scale: 2,
  })
  unitPriceAmount!: string;

  @Column({ name: 'unit_price_currency', type: 'varchar', length: 3 })
  unitPriceCurrency!: string;

  @Column({
    name: 'service_fee_amount',
    type: 'numeric',
    precision: 12,
    scale: 2,
  })
  serviceFeeAmount!: string;

  @Column({ name: 'service_fee_currency', type: 'varchar', length: 3 })
  serviceFeeCurrency!: string;

  @Column({
    name: 'total_price_amount',
    type: 'numeric',
    precision: 12,
    scale: 2,
  })
  totalPriceAmount!: string;

  @Column({ name: 'total_price_currency', type: 'varchar', length: 3 })
  totalPriceCurrency!: string;

  @Column({ type: 'varchar', length: 32 })
  status!: string;

  @Column({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @Column({ name: 'payment_deadline', type: 'timestamptz' })
  paymentDeadline!: Date;

  @Column({ name: 'paid_at', type: 'timestamptz', nullable: true })
  paidAt!: Date | null;
}
