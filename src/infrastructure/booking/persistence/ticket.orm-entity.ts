import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import { BookingOrmEntity } from './booking.orm-entity';

@Entity('tickets')
export class TicketOrmEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Index({ unique: true })
  @Column({ name: 'ticket_code', type: 'varchar', length: 64 })
  ticketCode!: string;

  @Index()
  @Column({ name: 'booking_id', type: 'uuid' })
  bookingId!: string;

  @Index()
  @Column({ name: 'event_id', type: 'uuid' })
  eventId!: string;

  @Column({ type: 'varchar', length: 32 })
  status!: string;

  @Column({ name: 'issued_at', type: 'timestamptz' })
  issuedAt!: Date;

  @Column({ name: 'checked_in_at', type: 'timestamptz', nullable: true })
  checkedInAt!: Date | null;

  @ManyToOne(() => BookingOrmEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'booking_id' })
  booking?: BookingOrmEntity;
}
