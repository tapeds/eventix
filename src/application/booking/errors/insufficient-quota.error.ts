import { ApplicationError } from '../../../common/application/errors/application.error';

export class InsufficientQuotaError extends ApplicationError {
  constructor(categoryId: string, requested: number, remaining: number) {
    super(
      'INSUFFICIENT_QUOTA',
      `Ticket category ${categoryId} has ${remaining} seats remaining, but ${requested} were requested`,
    );
  }
}
