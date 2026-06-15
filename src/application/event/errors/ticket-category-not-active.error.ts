import { ApplicationError } from '../../../common/application/errors/application.error';

export class TicketCategoryNotActiveError extends ApplicationError {
  constructor(categoryId: string) {
    super(
      'TICKET_CATEGORY_NOT_ACTIVE',
      `Ticket category is not active: ${categoryId}`,
    );
  }
}
