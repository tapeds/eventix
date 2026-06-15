import { ApplicationError } from '../../../common/application/errors/application.error';

export class TicketNotFoundByCodeError extends ApplicationError {
  constructor(ticketCode: string) {
    super('TICKET_NOT_FOUND', `Ticket not found: ${ticketCode}`);
  }
}
