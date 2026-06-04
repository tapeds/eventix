import { IUseCase } from '../../../../common/application/use-case.interface';
import { IDomainEventPublisher } from '../../../../common/application/domain-event-publisher.interface';
import { IUserRepository } from '../../../../domain/user/repositories/user.repository.interface';
import { UserId } from '../../../../domain/user/value-objects/user-id.vo';
import { UserNotFoundError } from '../../errors/user-not-found.error';
import { ChangeUserRoleCommand } from './change-user-role.command';

export class ChangeUserRoleHandler implements IUseCase<
  ChangeUserRoleCommand,
  void
> {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly eventPublisher: IDomainEventPublisher,
  ) {}

  async execute(command: ChangeUserRoleCommand): Promise<void> {
    const user = await this.userRepository.findById(new UserId(command.userId));
    if (!user) {
      throw new UserNotFoundError(command.userId);
    }

    user.changeRole(command.newRole);

    await this.userRepository.save(user);
    await this.eventPublisher.publishAll(user.domainEvents);
    user.clearDomainEvents();
  }
}
