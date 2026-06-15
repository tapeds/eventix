import { randomUUID } from 'crypto';
import {
  IRefundPaymentService,
  PayoutRequest,
  PayoutResult,
} from '../../../application/refund/services/refund-payment.interface';
import { RefundPayoutFailedError } from '../../../application/refund/errors/refund-payout-failed.error';

export interface MockRefundPaymentServiceOptions {
  alwaysFail?: boolean;
}

export class MockRefundPaymentService implements IRefundPaymentService {
  constructor(private readonly options: MockRefundPaymentServiceOptions = {}) {}

  payout(request: PayoutRequest): Promise<PayoutResult> {
    if (this.options.alwaysFail) {
      return Promise.reject(
        new RefundPayoutFailedError('mock payout forced failure'),
      );
    }
    return Promise.resolve({
      paymentReference: `MOCK-PAYOUT-${request.refundId}-${randomUUID().slice(0, 8)}`,
      paidOutAt: new Date(),
    });
  }
}
