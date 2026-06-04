import { MockPaymentGateway } from './payment-gateway.service';
import { PaymentDeclinedError } from '../../../application/booking/errors/payment-declined.error';

const sampleRequest = () => ({
  bookingId: 'booking-1',
  customerId: 'customer-1',
  amount: 100_000,
  currency: 'IDR',
  idempotencyKey: 'booking-1',
});

describe('MockPaymentGateway', () => {
  it('returns a MOCK-prefixed paymentReference and a Date by default', async () => {
    const gateway = new MockPaymentGateway();

    const result = await gateway.charge(sampleRequest());

    expect(result.paymentReference).toMatch(/^MOCK-/);
    expect(result.chargedAt).toBeInstanceOf(Date);
  });

  it('rejects with PaymentDeclinedError when alwaysFail is enabled', async () => {
    const gateway = new MockPaymentGateway({ alwaysFail: true });

    await expect(gateway.charge(sampleRequest())).rejects.toBeInstanceOf(
      PaymentDeclinedError,
    );
  });
});
