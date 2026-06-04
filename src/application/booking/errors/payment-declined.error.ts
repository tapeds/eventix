import { ApplicationError } from '../../../common/application/errors/application.error';

export class PaymentDeclinedError extends ApplicationError {
  constructor(reason: string) {
    super('PAYMENT_DECLINED', `Payment declined: ${reason}`);
  }
}
