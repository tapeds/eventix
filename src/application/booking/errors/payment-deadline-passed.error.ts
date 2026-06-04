import { ApplicationError } from '../../../common/application/errors/application.error';

export class PaymentDeadlinePassedError extends ApplicationError {
  constructor(bookingId: string) {
    super(
      'PAYMENT_DEADLINE_PASSED',
      `Payment deadline has passed for booking ${bookingId}`,
    );
  }
}
