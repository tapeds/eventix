import { ApplicationError } from '../../../common/application/errors/application.error';

export class EventNotFoundError extends ApplicationError {
  constructor(eventId: string) {
    super('EVENT_NOT_FOUND', `Event not found: ${eventId}`);
  }
}
