/* eslint-disable @typescript-eslint/unbound-method -- jest.Mocked<T> mock references trigger a false positive */
import { RejectRefundHandler } from './reject-refund.handler';
import { RejectRefundCommand } from './reject-refund.command';
import { Refund } from '../../../../domain/refund/entities/refund.entity';
import {
  RefundStatus,
  RefundStatusEnum,
} from '../../../../domain/refund/value-objects/refund-status.vo';
import { Money } from '../../../../common/domain/money.vo';
import { RefundNotFoundError } from '../../errors/refund-not-found.error';
import { IRefundRepository } from '../../../../domain/refund/repositories/refund.repository.interface';
import { IDomainEventPublisher } from '../../../../common/application/domain-event-publisher.interface';
import { RefundRejectedEvent } from '../../../../domain/refund/events/refund-rejected.event';

const REFUND_ID = '22222222-2222-2222-2222-222222222222';

const buildRequestedRefund = (): Refund =>
  Refund.reconstitute(REFUND_ID, {
    bookingId: 'booking-1',
    customerId: 'customer-1',
    amount: new Money(100_000),
    status: RefundStatus.requested(),
    requestedAt: new Date('2026-05-01T00:00:00Z'),
    decidedAt: null,
    paidOutAt: null,
    rejectionReason: null,
    paymentReference: null,
  });

const buildApprovedRefund = (): Refund =>
  Refund.reconstitute(REFUND_ID, {
    bookingId: 'booking-1',
    customerId: 'customer-1',
    amount: new Money(100_000),
    status: RefundStatus.approved(),
    requestedAt: new Date('2026-05-01T00:00:00Z'),
    decidedAt: new Date('2026-05-02T00:00:00Z'),
    paidOutAt: null,
    rejectionReason: null,
    paymentReference: null,
  });

const makeRepo = (
  findResult: Refund | null,
): jest.Mocked<IRefundRepository> => ({
  findById: jest.fn().mockResolvedValue(findResult),
  save: jest.fn().mockResolvedValue(undefined),
  findByBookingId: jest.fn(),
  listByStatus: jest.fn(),
});

const makePublisher = (): jest.Mocked<IDomainEventPublisher> => ({
  publish: jest.fn().mockResolvedValue(undefined),
  publishAll: jest.fn().mockResolvedValue(undefined),
});

describe('RejectRefundHandler', () => {
  it('rejects a requested refund and publishes the event', async () => {
    const refund = buildRequestedRefund();
    const repo = makeRepo(refund);
    const publisher = makePublisher();
    const handler = new RejectRefundHandler(repo, publisher);

    await handler.execute(
      new RejectRefundCommand(REFUND_ID, '  duplicate request  '),
    );

    expect(refund.status.value).toBe(RefundStatusEnum.REJECTED);
    expect(refund.rejectionReason).toBe('duplicate request');
    expect(repo.save).toHaveBeenCalledTimes(1);
    expect(repo.save).toHaveBeenCalledWith(refund);
    expect(publisher.publishAll).toHaveBeenCalledTimes(1);
    const events = publisher.publishAll.mock.calls[0][0];
    expect(events).toHaveLength(1);
    expect(events[0]).toBeInstanceOf(RefundRejectedEvent);
    expect((events[0] as RefundRejectedEvent).reason).toBe('duplicate request');
    expect(refund.domainEvents).toHaveLength(0);
  });

  it('throws RefundNotFoundError when the refund does not exist', async () => {
    const repo = makeRepo(null);
    const publisher = makePublisher();
    const handler = new RejectRefundHandler(repo, publisher);

    await expect(
      handler.execute(new RejectRefundCommand(REFUND_ID, 'any reason')),
    ).rejects.toBeInstanceOf(RefundNotFoundError);

    expect(repo.save).not.toHaveBeenCalled();
    expect(publisher.publishAll).not.toHaveBeenCalled();
  });

  it('propagates the domain error when the reason is empty', async () => {
    const refund = buildRequestedRefund();
    const repo = makeRepo(refund);
    const publisher = makePublisher();
    const handler = new RejectRefundHandler(repo, publisher);

    await expect(
      handler.execute(new RejectRefundCommand(REFUND_ID, '   ')),
    ).rejects.toThrow('Rejection reason is required');

    expect(refund.status.value).toBe(RefundStatusEnum.REQUESTED);
    expect(repo.save).not.toHaveBeenCalled();
    expect(publisher.publishAll).not.toHaveBeenCalled();
  });

  it('propagates the domain error when the refund is not in Requested status', async () => {
    const refund = buildApprovedRefund();
    const repo = makeRepo(refund);
    const publisher = makePublisher();
    const handler = new RejectRefundHandler(repo, publisher);

    await expect(
      handler.execute(new RejectRefundCommand(REFUND_ID, 'too late')),
    ).rejects.toThrow('Only a requested refund can be rejected');

    expect(refund.status.value).toBe(RefundStatusEnum.APPROVED);
    expect(repo.save).not.toHaveBeenCalled();
    expect(publisher.publishAll).not.toHaveBeenCalled();
  });
});
