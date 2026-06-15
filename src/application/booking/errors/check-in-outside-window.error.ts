import { ApplicationError } from '../../../common/application/errors/application.error';

export class CheckInOutsideWindowError extends ApplicationError {
  constructor(ticketCode: string) {
    super(
      'CHECK_IN_OUTSIDE_WINDOW',
      `Check-in is not allowed outside the event window: ${ticketCode}`,
    );
  }
}
