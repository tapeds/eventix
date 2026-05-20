import { IUseCase } from '../../../../common/application/use-case.interface';
import { IDomainEventPublisher } from '../../../../common/application/domain-event-publisher.interface';
import { IRefundRepository } from '../../../../domain/refund/repositories/refund.repository.interface';
import { RefundId } from '../../../../domain/refund/value-objects/refund-id.vo';
import { RefundNotFoundError } from '../../errors/refund-not-found.error';
import { RejectRefundCommand } from './reject-refund.command';

export class RejectRefundHandler implements IUseCase<
  RejectRefundCommand,
  void
> {
  constructor(
    private readonly refundRepository: IRefundRepository,
    private readonly eventPublisher: IDomainEventPublisher,
  ) {}

  async execute(command: RejectRefundCommand): Promise<void> {
    const refund = await this.refundRepository.findById(
      new RefundId(command.refundId),
    );
    if (!refund) {
      throw new RefundNotFoundError(command.refundId);
    }

    refund.reject(command.reason);

    await this.refundRepository.save(refund);
    await this.eventPublisher.publishAll(refund.domainEvents);
    refund.clearDomainEvents();
  }
}
