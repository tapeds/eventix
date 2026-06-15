import { Money } from '../../../common/domain/money.vo';
import { Refund } from '../../../domain/refund/entities/refund.entity';
import {
  RefundStatus,
  RefundStatusEnum,
} from '../../../domain/refund/value-objects/refund-status.vo';
import { RefundOrmEntity } from '../persistence/refund.orm-entity';

export class RefundMapper {
  static toDomain(orm: RefundOrmEntity): Refund {
    return Refund.reconstitute(orm.id, {
      bookingId: orm.bookingId,
      customerId: orm.customerId,
      amount: new Money(Number(orm.amountAmount), orm.amountCurrency),
      status: new RefundStatus(orm.status as RefundStatusEnum),
      requestedAt: orm.requestedAt,
      decidedAt: orm.decidedAt,
      paidOutAt: orm.paidOutAt,
      rejectionReason: orm.rejectionReason,
      paymentReference: orm.paymentReference,
    });
  }

  static toOrm(refund: Refund): RefundOrmEntity {
    const orm = new RefundOrmEntity();
    orm.id = refund.refundId.value;
    orm.bookingId = refund.bookingId;
    orm.customerId = refund.customerId;
    orm.amountAmount = refund.amount.amount.toFixed(2);
    orm.amountCurrency = refund.amount.currency;
    orm.status = refund.status.value;
    orm.requestedAt = refund.requestedAt;
    orm.decidedAt = refund.decidedAt;
    orm.paidOutAt = refund.paidOutAt;
    orm.rejectionReason = refund.rejectionReason;
    orm.paymentReference = refund.paymentReference;
    return orm;
  }
}
