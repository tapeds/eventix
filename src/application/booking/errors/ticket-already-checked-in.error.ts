import { ApplicationError } from '../../../common/application/errors/application.error';

export class TicketAlreadyCheckedInError extends ApplicationError {
  constructor(ticketCode: string) {
    super(
      'TICKET_ALREADY_CHECKED_IN',
      `Ticket ${ticketCode} has already been checked in`,
    );
  }
}
