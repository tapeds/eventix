import { ApplicationError } from '../../../common/application/errors/application.error';

export class RefundPayoutFailedError extends ApplicationError {
  constructor(reason: string) {
    super('REFUND_PAYOUT_FAILED', `Refund payout failed: ${reason}`);
  }
}
