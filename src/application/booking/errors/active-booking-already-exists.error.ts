import { ApplicationError } from '../../../common/application/errors/application.error';

export class ActiveBookingAlreadyExistsError extends ApplicationError {
  constructor(customerId: string, eventId: string) {
    super(
      'ACTIVE_BOOKING_ALREADY_EXISTS',
      `Customer ${customerId} already has an active booking for event ${eventId}`,
    );
  }
}
