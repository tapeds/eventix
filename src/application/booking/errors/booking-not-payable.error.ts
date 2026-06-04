import { ApplicationError } from '../../../common/application/errors/application.error';

export class BookingNotPayableError extends ApplicationError {
  constructor(bookingId: string) {
    super(
      'BOOKING_NOT_PAYABLE',
      `Booking is not in a payable state: ${bookingId}`,
    );
  }
}
