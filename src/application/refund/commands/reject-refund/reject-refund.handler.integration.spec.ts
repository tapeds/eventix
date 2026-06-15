import { AppDataSource } from '../../../../infrastructure/database/data-source';
import { RefundOrmEntity } from '../../../../infrastructure/refund/persistence/refund.orm-entity';
import { RefundRepository } from '../../../../infrastructure/refund/persistence/refund.repository';
import { RejectRefundHandler } from './reject-refund.handler';
import { RejectRefundCommand } from './reject-refund.command';
import { Refund } from '../../../../domain/refund/entities/refund.entity';
import {
  RefundStatus,
  RefundStatusEnum,
} from '../../../../domain/refund/value-objects/refund-status.vo';
import { RefundId } from '../../../../domain/refund/value-objects/refund-id.vo';
import { RefundRejectedEvent } from '../../../../domain/refund/events/refund-rejected.event';
import { Money } from '../../../../common/domain/money.vo';
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
    decidedAt: null,
    paidOutAt: null,
    rejectionReason: null,
    paymentReference: null,
  });

describe('RejectRefundHandler (integration)', () => {
  let refundRepo: RefundRepository;
  let publisher: FakePublisher;
  let handler: RejectRefundHandler;

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
    handler = new RejectRefundHandler(refundRepo, publisher);
  });

  it('flips a requested refund to Rejected and persists the trimmed reason', async () => {
    await refundRepo.save(buildRefund(RefundStatus.requested()));

    await handler.execute(
      new RejectRefundCommand(REFUND_ID, '  customer changed mind  '),
    );

    const reloaded = await refundRepo.findById(new RefundId(REFUND_ID));
    expect(reloaded).not.toBeNull();
    expect(reloaded!.status.value).toBe(RefundStatusEnum.REJECTED);
    expect(reloaded!.rejectionReason).toBe('customer changed mind');
    expect(reloaded!.decidedAt).toBeInstanceOf(Date);

    expect(publisher.events).toHaveLength(1);
    expect(publisher.events[0]).toBeInstanceOf(RefundRejectedEvent);
  });

  it('refuses to reject a non-Requested refund and leaves the row unchanged', async () => {
    await refundRepo.save(buildRefund(RefundStatus.approved()));

    await expect(
      handler.execute(new RejectRefundCommand(REFUND_ID, 'too late')),
    ).rejects.toThrow('Only a requested refund can be rejected');

    const reloaded = await refundRepo.findById(new RefundId(REFUND_ID));
    expect(reloaded!.status.value).toBe(RefundStatusEnum.APPROVED);
    expect(reloaded!.rejectionReason).toBeNull();
    expect(publisher.events).toHaveLength(0);
  });
});
