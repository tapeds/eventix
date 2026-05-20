import { ApplicationError } from '../../../common/application/errors/application.error';

export class RefundNotFoundError extends ApplicationError {
  constructor(refundId: string) {
    super('REFUND_NOT_FOUND', `Refund not found: ${refundId}`);
  }
}
