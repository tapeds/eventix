import { AppDataSource } from '../../../../infrastructure/database/data-source';
import { RefundOrmEntity } from '../../../../infrastructure/refund/persistence/refund.orm-entity';
import { RefundRepository } from '../../../../infrastructure/refund/persistence/refund.repository';
import { MockRefundPaymentService } from '../../../../infrastructure/refund/services/refund-payment.service';
import { MarkRefundPaidOutHandler } from './mark-refund-paid-out.handler';
import { MarkRefundPaidOutCommand } from './mark-refund-paid-out.command';
import { Refund } from '../../../../domain/refund/entities/refund.entity';
import {
  RefundStatus,
  RefundStatusEnum,
} from '../../../../domain/refund/value-objects/refund-status.vo';
import { RefundId } from '../../../../domain/refund/value-objects/refund-id.vo';
import { RefundPaidOutEvent } from '../../../../domain/refund/events/refund-paid-out.event';
import { Money } from '../../../../common/domain/money.vo';
import { RefundPayoutFailedError } from '../../errors/refund-payout-failed.error';
import { IDomainEvent } from '../../../../common/domain/domain-event.interface';
import { IDomainEventPublisher } from '../../../../common/application/domain-event-publisher.interface';

const REFUND_ID = 'dddddddd-dddd-dddd-dddd-dddddddddddd';
const BOOKING_ID = 'a1111111-1111-1111-1111-111111111111';
const CUSTOMER_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

class FakePublisher implements IDomainEventPublisher {
  events: IDomainEvent[] = [];
  publish(event: IDomainEvent): Promise<void> {
    this.events.push(event);
    return Promise.resolve();
  }
  publishAll(events: IDomainEvent[]): Promise<void> {
    this.events.push(...events);
    return Promise.resolve();
  }
}

const buildRefund = (status: RefundStatus): Refund =>
  Refund.reconstitute(REFUND_ID, {
    bookingId: BOOKING_ID,
    customerId: CUSTOMER_ID,
    amount: new Money(100_000),
    status,
    requestedAt: new Date('2026-05-01T00:00:00Z'),
    decidedAt: status.isApproved() ? new Date('2026-05-02T00:00:00Z') : null,
    paidOutAt: null,
    rejectionReason: null,
    paymentReference: null,
  });

describe('MarkRefundPaidOutHandler (integration)', () => {
  let refundRepo: RefundRepository;
  let publisher: FakePublisher;

  beforeAll(async () => {
    await AppDataSource.initialize();
  });

  afterAll(async () => {
    await AppDataSource.destroy();
  });

  beforeEach(async () => {
    await AppDataSource.query('TRUNCATE TABLE refunds CASCADE');
    refundRepo = new RefundRepository(
      AppDataSource.getRepository(RefundOrmEntity),
    );
    publisher = new FakePublisher();
  });

  it('persists PaidOut status with the gateway reference and publishes RefundPaidOut', async () => {
    await refundRepo.save(buildRefund(RefundStatus.approved()));
    const handler = new MarkRefundPaidOutHandler(
      refundRepo,
      new MockRefundPaymentService(),
      publisher,
    );

    await handler.execute(new MarkRefundPaidOutCommand(REFUND_ID));

    const reloaded = await refundRepo.findById(new RefundId(REFUND_ID));
    expect(reloaded!.status.value).toBe(RefundStatusEnum.PAID_OUT);
    expect(reloaded!.paymentReference).toMatch(/^MOCK-PAYOUT-/);
    expect(reloaded!.paidOutAt).toBeInstanceOf(Date);

    expect(publisher.events).toHaveLength(1);
    expect(publisher.events[0]).toBeInstanceOf(RefundPaidOutEvent);
  });

  it('rolls back nothing when the gateway fails: row stays Approved and no events', async () => {
    await refundRepo.save(buildRefund(RefundStatus.approved()));
    const handler = new MarkRefundPaidOutHandler(
      refundRepo,
      new MockRefundPaymentService({ alwaysFail: true }),
      publisher,
    );

    await expect(
      handler.execute(new MarkRefundPaidOutCommand(REFUND_ID)),
    ).rejects.toBeInstanceOf(RefundPayoutFailedError);

    const reloaded = await refundRepo.findById(new RefundId(REFUND_ID));
    expect(reloaded!.status.value).toBe(RefundStatusEnum.APPROVED);
    expect(reloaded!.paymentReference).toBeNull();
    expect(reloaded!.paidOutAt).toBeNull();
    expect(publisher.events).toHaveLength(0);
  });

  it('refuses to mark a non-Approved refund as paid out', async () => {
    await refundRepo.save(buildRefund(RefundStatus.requested()));
    const handler = new MarkRefundPaidOutHandler(
      refundRepo,
      new MockRefundPaymentService(),
      publisher,
    );

    await expect(
      handler.execute(new MarkRefundPaidOutCommand(REFUND_ID)),
    ).rejects.toThrow('Only an approved refund can be marked as paid out');

    const reloaded = await refundRepo.findById(new RefundId(REFUND_ID));
    expect(reloaded!.status.value).toBe(RefundStatusEnum.REQUESTED);
    expect(reloaded!.paymentReference).toBeNull();
    expect(publisher.events).toHaveLength(0);
  });
});
