import { ApplicationError } from '../../../common/application/errors/application.error';

export class TicketCategoryNotFoundError extends ApplicationError {
  constructor(categoryId: string) {
    super(
      'TICKET_CATEGORY_NOT_FOUND',
      `Ticket category not found: ${categoryId}`,
    );
  }
}
