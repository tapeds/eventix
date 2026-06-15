import { ApplicationError } from '../../../common/application/errors/application.error';

export class EventCancelledError extends ApplicationError {
  constructor(eventId: string) {
    super('EVENT_CANCELLED', `Event has been cancelled: ${eventId}`);
  }
}
