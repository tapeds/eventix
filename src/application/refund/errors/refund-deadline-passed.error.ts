import { ApplicationError } from '../../../common/application/errors/application.error';

export class RefundDeadlinePassedError extends ApplicationError {
  constructor(bookingId: string) {
    super(
      'REFUND_DEADLINE_PASSED',
      `Refund deadline has passed for booking ${bookingId}`,
    );
  }
}
