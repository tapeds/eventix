import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Refund } from '../../../domain/refund/entities/refund.entity';
import { IRefundRepository } from '../../../domain/refund/repositories/refund.repository.interface';
import { RefundId } from '../../../domain/refund/value-objects/refund-id.vo';
import { RefundStatus } from '../../../domain/refund/value-objects/refund-status.vo';
import { RefundMapper } from '../mappers/refund.mapper';
import { RefundOrmEntity } from './refund.orm-entity';

@Injectable()
export class RefundRepository implements IRefundRepository {
  constructor(
    @InjectRepository(RefundOrmEntity)
    private readonly repo: Repository<RefundOrmEntity>,
  ) {}

  async save(refund: Refund): Promise<void> {
    await this.repo.save(RefundMapper.toOrm(refund));
  }

  async findById(id: RefundId): Promise<Refund | null> {
    const orm = await this.repo.findOne({ where: { id: id.value } });
    return orm ? RefundMapper.toDomain(orm) : null;
  }

  async findByBookingId(bookingId: string): Promise<Refund | null> {
    const orm = await this.repo.findOne({ where: { bookingId } });
    return orm ? RefundMapper.toDomain(orm) : null;
  }

  async listByStatus(status: RefundStatus): Promise<Refund[]> {
    const rows = await this.repo.find({ where: { status: status.value } });
    return rows.map((r) => RefundMapper.toDomain(r));
  }
}
