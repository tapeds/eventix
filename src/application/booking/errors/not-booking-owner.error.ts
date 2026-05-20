import { ApplicationError } from '../../../common/application/errors/application.error';

export class NotBookingOwnerError extends ApplicationError {
  constructor(bookingId: string, customerId: string) {
    super(
      'NOT_BOOKING_OWNER',
      `Customer ${customerId} does not own booking ${bookingId}`,
    );
  }
}
