import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Ticket } from '../../../domain/booking/entities/ticket.entity';
import { ITicketRepository } from '../../../domain/booking/repositories/ticket.repository.interface';
import { BookingId } from '../../../domain/booking/value-objects/booking-id.vo';
import { TicketCode } from '../../../domain/booking/value-objects/ticket-code.vo';
import { TicketId } from '../../../domain/booking/value-objects/ticket-id.vo';
import { TicketMapper } from '../mappers/ticket.mapper';
import { TicketOrmEntity } from './ticket.orm-entity';

@Injectable()
export class TicketRepository implements ITicketRepository {
  constructor(
    @InjectRepository(TicketOrmEntity)
    private readonly repo: Repository<TicketOrmEntity>,
  ) {}

  async save(ticket: Ticket): Promise<void> {
    await this.repo.save(TicketMapper.toOrm(ticket));
  }

  async saveMany(tickets: Ticket[]): Promise<void> {
    await this.repo.save(tickets.map((t) => TicketMapper.toOrm(t)));
  }

  async findById(id: TicketId): Promise<Ticket | null> {
    const orm = await this.repo.findOne({ where: { id: id.value } });
    return orm ? TicketMapper.toDomain(orm) : null;
  }

  async findByCode(code: TicketCode): Promise<Ticket | null> {
    const orm = await this.repo.findOne({
      where: { ticketCode: code.value },
    });
    return orm ? TicketMapper.toDomain(orm) : null;
  }

  async findByBookingId(bookingId: BookingId): Promise<Ticket[]> {
    const rows = await this.repo.find({
      where: { bookingId: bookingId.value },
    });
    return rows.map((r) => TicketMapper.toDomain(r));
  }

  async findByCustomerId(customerId: string): Promise<Ticket[]> {
    const rows = await this.repo
      .createQueryBuilder('t')
      .innerJoin('bookings', 'b', 'b.id = t.booking_id')
      .where('b.customer_id = :customerId', { customerId })
      .getMany();
    return rows.map((r) => TicketMapper.toDomain(r));
  }
}
