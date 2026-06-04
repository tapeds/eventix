import { ApplicationError } from '../../../common/application/errors/application.error';

export class IncorrectPaymentAmountError extends ApplicationError {
  constructor(bookingId: string) {
    super(
      'INCORRECT_PAYMENT_AMOUNT',
      `Payment amount does not match the total for booking ${bookingId}`,
    );
  }
}
