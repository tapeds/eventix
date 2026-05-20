import { ApplicationError } from '../../../common/application/errors/application.error';

export class BookingNotFoundError extends ApplicationError {
  constructor(bookingId: string) {
    super('BOOKING_NOT_FOUND', `Booking not found: ${bookingId}`);
  }
}
