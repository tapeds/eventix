import { ApplicationError } from '../../../common/application/errors/application.error';

export class RefundAlreadyExistsError extends ApplicationError {
  constructor(bookingId: string) {
    super(
      'REFUND_ALREADY_EXISTS',
      `A refund already exists for booking ${bookingId}`,
    );
  }
}
