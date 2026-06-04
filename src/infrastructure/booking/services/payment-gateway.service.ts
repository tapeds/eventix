import { randomUUID } from 'crypto';
import {
  ChargeRequest,
  ChargeResult,
  IPaymentGateway,
} from '../../../application/booking/services/payment-gateway.interface';
import { PaymentDeclinedError } from '../../../application/booking/errors/payment-declined.error';

export interface MockPaymentGatewayOptions {
  alwaysFail?: boolean;
}

export class MockPaymentGateway implements IPaymentGateway {
  constructor(private readonly options: MockPaymentGatewayOptions = {}) {}

  charge(request: ChargeRequest): Promise<ChargeResult> {
    if (this.options.alwaysFail) {
      return Promise.reject(
        new PaymentDeclinedError('mock gateway forced failure'),
      );
    }
    return Promise.resolve({
      paymentReference: `MOCK-${request.bookingId}-${randomUUID().slice(0, 8)}`,
      chargedAt: new Date(),
    });
  }
}
