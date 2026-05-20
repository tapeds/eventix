import { Refund } from '../entities/refund.entity';
import { RefundId } from '../value-objects/refund-id.vo';
import { RefundStatus } from '../value-objects/refund-status.vo';

export interface IRefundRepository {
  save(refund: Refund): Promise<void>;

  findById(id: RefundId): Promise<Refund | null>;

  /**
   * One refund per booking is enforced by the application layer (a PaidOut
   * refund is terminal — see Refund aggregate); this query backs that check.
   */
  findByBookingId(bookingId: string): Promise<Refund | null>;

  /** Backs the System/Admin payout queue (US18). */
  listByStatus(status: RefundStatus): Promise<Refund[]>;
}
