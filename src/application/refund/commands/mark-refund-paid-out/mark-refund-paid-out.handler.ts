import { IUseCase } from '../../../../common/application/use-case.interface';
import { IDomainEventPublisher } from '../../../../common/application/domain-event-publisher.interface';
import { IRefundRepository } from '../../../../domain/refund/repositories/refund.repository.interface';
import { RefundId } from '../../../../domain/refund/value-objects/refund-id.vo';
import { IRefundPaymentService } from '../../services/refund-payment.interface';
import { RefundNotFoundError } from '../../errors/refund-not-found.error';
import { MarkRefundPaidOutCommand } from './mark-refund-paid-out.command';

export class MarkRefundPaidOutHandler implements IUseCase<
  MarkRefundPaidOutCommand,
  void
> {
  constructor(
    private readonly refundRepository: IRefundRepository,
    private readonly paymentService: IRefundPaymentService,
    private readonly eventPublisher: IDomainEventPublisher,
  ) {}

  async execute(command: MarkRefundPaidOutCommand): Promise<void> {
    const refund = await this.refundRepository.findById(
      new RefundId(command.refundId),
    );
    if (!refund) {
      throw new RefundNotFoundError(command.refundId);
    }

    if (!refund.status.isApproved()) {
      throw new Error('Only an approved refund can be marked as paid out');
    }

    const result = await this.paymentService.payout({
      refundId: refund.refundId.value,
      bookingId: refund.bookingId,
      customerId: refund.customerId,
      amount: refund.amount.amount,
      currency: refund.amount.currency,
      idempotencyKey: refund.refundId.value,
    });

    refund.markAsPaidOut(result.paymentReference);

    await this.refundRepository.save(refund);
    await this.eventPublisher.publishAll(refund.domainEvents);
    refund.clearDomainEvents();
  }
}
