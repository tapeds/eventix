import { Column, Entity, Index, OneToMany, PrimaryColumn } from 'typeorm';
import { TicketCategoryOrmEntity } from './ticket-category.orm-entity';

@Entity('events')
export class EventOrmEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ name: 'start_date', type: 'timestamptz' })
  startDate!: Date;

  @Column({ name: 'end_date', type: 'timestamptz' })
  endDate!: Date;

  @Column({ type: 'varchar', length: 255, nullable: true })
  location!: string | null;

  @Column({ name: 'max_capacity', type: 'int' })
  maxCapacity!: number;

  @Index()
  @Column({ type: 'varchar', length: 32 })
  status!: string;

  @OneToMany(() => TicketCategoryOrmEntity, (category) => category.event, {
    cascade: true,
    eager: true,
  })
  ticketCategories!: TicketCategoryOrmEntity[];
}
