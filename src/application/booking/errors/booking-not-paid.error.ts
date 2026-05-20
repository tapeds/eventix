import { ApplicationError } from '../../../common/application/errors/application.error';

export class BookingNotPaidError extends ApplicationError {
  constructor(bookingId: string) {
    super('BOOKING_NOT_PAID', `Booking is not paid: ${bookingId}`);
  }
}
