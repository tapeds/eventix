import { IUseCase } from '../../../../common/application/use-case.interface';
import { IDomainEventPublisher } from '../../../../common/application/domain-event-publisher.interface';
import { IUserRepository } from '../../../../domain/user/repositories/user.repository.interface';
import { Email } from '../../../../domain/user/value-objects/email.vo';
import { User } from '../../../../domain/user/entities/user.entity';
import { IPasswordHasher } from '../../services/password-hasher.interface';
import { EmailAlreadyExistsError } from '../../errors/email-already-exists.error';
import { RegisterUserCommand } from './register-user.command';

export class RegisterUserHandler implements IUseCase<
  RegisterUserCommand,
  { userId: string }
> {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly passwordHasher: IPasswordHasher,
    private readonly eventPublisher: IDomainEventPublisher,
  ) {}

  async execute(command: RegisterUserCommand): Promise<{ userId: string }> {
    const email = new Email(command.email);

    if (await this.userRepository.existsByEmail(email)) {
      throw new EmailAlreadyExistsError(email.value);
    }

    const passwordHash = await this.passwordHasher.hash(command.password);

    const user = User.register({
      name: command.name,
      email: command.email,
      role: command.role,
      passwordHash,
    });

    await this.userRepository.save(user);
    await this.eventPublisher.publishAll(user.domainEvents);
    user.clearDomainEvents();

    return { userId: user.userId.value };
  }
}
