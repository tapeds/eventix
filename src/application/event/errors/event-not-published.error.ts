import { ApplicationError } from '../../../common/application/errors/application.error';

export class EventNotPublishedError extends ApplicationError {
  constructor(eventId: string) {
    super('EVENT_NOT_PUBLISHED', `Event is not published: ${eventId}`);
  }
}
