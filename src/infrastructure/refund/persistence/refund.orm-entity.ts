import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

@Entity('refunds')
export class RefundOrmEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Index()
  @Column({ name: 'booking_id', type: 'uuid' })
  bookingId!: string;

  @Index()
  @Column({ name: 'customer_id', type: 'uuid' })
  customerId!: string;

  @Column({
    name: 'amount_amount',
    type: 'numeric',
    precision: 12,
    scale: 2,
  })
  amountAmount!: string;

  @Column({ name: 'amount_currency', type: 'varchar', length: 3 })
  amountCurrency!: string;

  @Index()
  @Column({ type: 'varchar', length: 32 })
  status!: string;

  @Column({ name: 'requested_at', type: 'timestamptz' })
  requestedAt!: Date;

  @Column({ name: 'decided_at', type: 'timestamptz', nullable: true })
  decidedAt!: Date | null;

  @Column({ name: 'paid_out_at', type: 'timestamptz', nullable: true })
  paidOutAt!: Date | null;

  @Column({ name: 'rejection_reason', type: 'text', nullable: true })
  rejectionReason!: string | null;

  @Column({
    name: 'payment_reference',
    type: 'varchar',
    length: 128,
    nullable: true,
  })
  paymentReference!: string | null;
}
