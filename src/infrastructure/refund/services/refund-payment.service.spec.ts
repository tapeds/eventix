import { MockRefundPaymentService } from './refund-payment.service';
import { RefundPayoutFailedError } from '../../../application/refund/errors/refund-payout-failed.error';

const sampleRequest = () => ({
  refundId: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
  bookingId: 'a1111111-1111-1111-1111-111111111111',
  customerId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  amount: 100_000,
  currency: 'IDR',
  idempotencyKey: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
});

describe('MockRefundPaymentService', () => {
  it('returns a MOCK-PAYOUT-prefixed reference and a Date by default', async () => {
    const service = new MockRefundPaymentService();

    const result = await service.payout(sampleRequest());

    expect(result.paymentReference).toMatch(/^MOCK-PAYOUT-/);
    expect(result.paidOutAt).toBeInstanceOf(Date);
  });

  it('rejects with RefundPayoutFailedError when alwaysFail is enabled', async () => {
    const service = new MockRefundPaymentService({ alwaysFail: true });

    await expect(service.payout(sampleRequest())).rejects.toBeInstanceOf(
      RefundPayoutFailedError,
    );
  });
});
