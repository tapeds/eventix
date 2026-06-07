import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Booking } from '../../../domain/booking/entities/booking.entity';
import { IBookingRepository } from '../../../domain/booking/repositories/booking.repository.interface';
import { BookingId } from '../../../domain/booking/value-objects/booking-id.vo';
import { BookingStatusEnum } from '../../../domain/booking/value-objects/booking-status.vo';
import { BookingMapper } from '../mappers/booking.mapper';
import { BookingOrmEntity } from './booking.orm-entity';

@Injectable()
export class BookingRepository implements IBookingRepository {
  constructor(
    @InjectRepository(BookingOrmEntity)
    private readonly repo: Repository<BookingOrmEntity>,
  ) {}

  async save(booking: Booking): Promise<void> {
    await this.repo.save(BookingMapper.toOrm(booking));
  }

  async findById(id: BookingId): Promise<Booking | null> {
    const orm = await this.repo.findOne({ where: { id: id.value } });
    return orm ? BookingMapper.toDomain(orm) : null;
  }

  async findActiveByCustomerAndEvent(
    customerId: string,
    eventId: string,
  ): Promise<Booking | null> {
    const orm = await this.repo.findOne({
      where: {
        customerId,
        eventId,
        status: In([BookingStatusEnum.PENDING_PAYMENT, BookingStatusEnum.PAID]),
      },
    });
    return orm ? BookingMapper.toDomain(orm) : null;
  }

  async findByEventId(eventId: string): Promise<Booking[]> {
    const rows = await this.repo.find({ where: { eventId } });
    return rows.map((r) => BookingMapper.toDomain(r));
  }

  async delete(id: BookingId): Promise<void> {
    await this.repo.delete({ id: id.value });
  }
}
