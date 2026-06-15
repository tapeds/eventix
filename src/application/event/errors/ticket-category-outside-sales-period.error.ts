import { ApplicationError } from '../../../common/application/errors/application.error';

export class TicketCategoryOutsideSalesPeriodError extends ApplicationError {
  constructor(categoryId: string) {
    super(
      'TICKET_CATEGORY_OUTSIDE_SALES_PERIOD',
      `Ticket category is outside its sales period: ${categoryId}`,
    );
  }
}
