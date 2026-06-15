/* eslint-disable @typescript-eslint/unbound-method -- jest.Mocked<T> mock references trigger a false positive */
import { MarkRefundPaidOutHandler } from './mark-refund-paid-out.handler';
import { MarkRefundPaidOutCommand } from './mark-refund-paid-out.command';
import { Refund } from '../../../../domain/refund/entities/refund.entity';
import {
  RefundStatus,
  RefundStatusEnum,
} from '../../../../domain/refund/value-objects/refund-status.vo';
import { Money } from '../../../../common/domain/money.vo';
import { RefundPaidOutEvent } from '../../../../domain/refund/events/refund-paid-out.event';
import { IRefundRepository } from '../../../../domain/refund/repositories/refund.repository.interface';
import { IRefundPaymentService } from '../../services/refund-payment.interface';
import { IDomainEventPublisher } from '../../../../common/application/domain-event-publisher.interface';
import { RefundNotFoundError } from '../../errors/refund-not-found.error';
import { RefundPayoutFailedError } from '../../errors/refund-payout-failed.error';

const REFUND_ID = 'dddddddd-dddd-dddd-dddd-dddddddddddd';
const BOOKING_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const CUSTOMER_ID = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
const PAYOUT_REF = 'MOCK-PAYOUT-12345';

const buildRefund = (status: RefundStatus): Refund =>
  Refund.reconstitute(REFUND_ID, {
    bookingId: BOOKING_ID,
    customerId: CUSTOMER_ID,
    amount: new Money(100_000),
    status,
    requestedAt: new Date(),
    decidedAt: status.isApproved() ? new Date() : null,
    paidOutAt: null,
    rejectionReason: null,
    paymentReference: null,
  });

const makeRepo = (refund: Refund | null): jest.Mocked<IRefundRepository> => ({
  findById: jest.fn().mockResolvedValue(refund),
  save: jest.fn().mockResolvedValue(undefined),
  findByBookingId: jest.fn(),
  listByStatus: jest.fn(),
});

const makeService = (
  outcome: 'success' | 'fail' = 'success',
): jest.Mocked<IRefundPaymentService> => ({
  payout: jest.fn().mockImplementation(() =>
    outcome === 'success'
      ? Promise.resolve({
          paymentReference: PAYOUT_REF,
          paidOutAt: new Date(),
        })
      : Promise.reject(
          new RefundPayoutFailedError('insufficient bank balance'),
        ),
  ),
});

const makePublisher = (): jest.Mocked<IDomainEventPublisher> => ({
  publish: jest.fn().mockResolvedValue(undefined),
  publishAll: jest.fn().mockResolvedValue(undefined),
});

describe('MarkRefundPaidOutHandler', () => {
  it('triggers payout, stores the reference, and publishes RefundPaidOut', async () => {
    const refund = buildRefund(RefundStatus.approved());
    const repo = makeRepo(refund);
    const service = makeService('success');
    const publisher = makePublisher();
    const handler = new MarkRefundPaidOutHandler(repo, service, publisher);

    await handler.execute(new MarkRefundPaidOutCommand(REFUND_ID));

    expect(service.payout).toHaveBeenCalledTimes(1);
    expect(service.payout).toHaveBeenCalledWith({
      refundId: REFUND_ID,
      bookingId: BOOKING_ID,
      customerId: CUSTOMER_ID,
      amount: 100_000,
      currency: 'IDR',
      idempotencyKey: REFUND_ID,
    });
    expect(refund.status.value).toBe(RefundStatusEnum.PAID_OUT);
    expect(refund.paymentReference).toBe(PAYOUT_REF);
    expect(refund.paidOutAt).toBeInstanceOf(Date);

    expect(repo.save).toHaveBeenCalledWith(refund);
    expect(publisher.publishAll).toHaveBeenCalledTimes(1);
    const published = publisher.publishAll.mock.calls[0][0];
    expect(published).toHaveLength(1);
    expect(published[0]).toBeInstanceOf(RefundPaidOutEvent);
    expect(refund.domainEvents).toHaveLength(0);
  });

  it('throws RefundNotFoundError without calling the payment service', async () => {
    const repo = makeRepo(null);
    const service = makeService('success');
    const publisher = makePublisher();
    const handler = new MarkRefundPaidOutHandler(repo, service, publisher);

    await expect(
      handler.execute(new MarkRefundPaidOutCommand(REFUND_ID)),
    ).rejects.toBeInstanceOf(RefundNotFoundError);

    expect(service.payout).not.toHaveBeenCalled();
    expect(repo.save).not.toHaveBeenCalled();
    expect(publisher.publishAll).not.toHaveBeenCalled();
  });

  it('throws when the refund is not in Approved status, without calling the payment service', async () => {
    const refund = buildRefund(RefundStatus.requested());
    const repo = makeRepo(refund);
    const service = makeService('success');
    const publisher = makePublisher();
    const handler = new MarkRefundPaidOutHandler(repo, service, publisher);

    await expect(
      handler.execute(new MarkRefundPaidOutCommand(REFUND_ID)),
    ).rejects.toThrow('Only an approved refund can be marked as paid out');

    expect(service.payout).not.toHaveBeenCalled();
    expect(refund.status.value).toBe(RefundStatusEnum.REQUESTED);
    expect(repo.save).not.toHaveBeenCalled();
    expect(publisher.publishAll).not.toHaveBeenCalled();
  });

  it('propagates RefundPayoutFailedError and does not save or publish', async () => {
    const refund = buildRefund(RefundStatus.approved());
    const repo = makeRepo(refund);
    const service = makeService('fail');
    const publisher = makePublisher();
    const handler = new MarkRefundPaidOutHandler(repo, service, publisher);

    await expect(
      handler.execute(new MarkRefundPaidOutCommand(REFUND_ID)),
    ).rejects.toBeInstanceOf(RefundPayoutFailedError);

    expect(refund.status.value).toBe(RefundStatusEnum.APPROVED);
    expect(refund.paymentReference).toBeNull();
    expect(repo.save).not.toHaveBeenCalled();
    expect(publisher.publishAll).not.toHaveBeenCalled();
  });
});
