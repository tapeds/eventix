import { Refund } from '../entities/refund.entity';
import { RefundId } from '../value-objects/refund-id.vo';
import { RefundStatus } from '../value-objects/refund-status.vo';

export interface IRefundRepository {
  save(refund: Refund): Promise<void>;

  findById(id: RefundId): Promise<Refund | null>;

  findByBookingId(bookingId: string): Promise<Refund | null>;

  listByStatus(status: RefundStatus): Promise<Refund[]>;
}
